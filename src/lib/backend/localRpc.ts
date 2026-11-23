// Runs our RPC functions inside a PGlite database the way PostgREST does on Supabase: the arguments travel as one
// JSON document (what supabase-js sends) and become typed values through json_to_record with the function's
// parameter types, so JSON text sent for a jsonb parameter stays a string there too. Then the caller's user id is
// set and `select public.fn(named args)` runs. Shared by the browser's local mode and the SQL tests, so both
// exercise the real server logic with production's argument handling.
import type { PGlite } from '@electric-sql/pglite'

export class RpcError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/
const paramTypes = new WeakMap<PGlite, Map<string, Map<string, string>>>()

/** Parameter name → SQL type of the API function `fn` (our API has one function per name). */
async function paramsOf(db: PGlite, fn: string) {
  let byFn = paramTypes.get(db)
  if (!byFn) paramTypes.set(db, (byFn = new Map()))
  let params = byFn.get(fn)
  if (!params) {
    const res = await db.query<{ name: string; type: string }>(
      `select a.name, format_type(a.type, null) as type
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
              unnest(p.proargnames, p.proargtypes::oid[]) as a(name, type)
        where n.nspname = 'public' and p.proname = $1`,
      [fn],
    )
    params = new Map(res.rows.map((r) => [r.name, r.type]))
    byFn.set(fn, params)
  }
  return params
}

export async function localRpc(db: PGlite, userId: string | null, fn: string, args: Record<string, unknown> = {}) {
  const body = JSON.parse(JSON.stringify(args)) as Record<string, unknown> // exactly what goes over the wire
  const keys = Object.keys(body)
  if (!IDENT.test(fn) || keys.some((k) => !IDENT.test(k))) throw new RpcError('invalid_request')
  const params = await paramsOf(db, fn)
  // PostgREST answers an unknown function or argument with 404, which the Supabase backend turns into server_error.
  if (keys.some((k) => !params.has(k))) throw new RpcError('server_error')
  const call = keys.length
    ? `select public.${fn}(${keys.map((k) => `${k} => a.${k}`).join(', ')}) as result
         from json_to_record($1::json) as a(${keys.map((k) => `${k} ${params.get(k)}`).join(', ')})`
    : `select public.${fn}() as result`
  try {
    return await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
      const res = await tx.query<{ result: unknown }>(call, keys.length ? [JSON.stringify(body)] : [])
      return res.rows[0]?.result ?? null
    })
  } catch (e) {
    // Game errors are raised with the error code as message (private.fail).
    const message = e instanceof Error ? e.message : String(e)
    throw new RpcError(/^[a-z_]+$/.test(message) ? message : 'server_error')
  }
}
