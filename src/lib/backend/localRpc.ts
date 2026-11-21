// Runs our RPC functions inside a PGlite database exactly like PostgREST would on Supabase:
// set the caller's user id, then `select public.fn(named args)`. Shared by the browser's local mode
// and the SQL tests, so both exercise the real server logic.
import type { PGlite } from '@electric-sql/pglite'

export class RpcError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/

export async function localRpc(db: PGlite, userId: string | null, fn: string, args: Record<string, unknown> = {}) {
  const keys = Object.keys(args)
  if (!IDENT.test(fn) || keys.some((k) => !IDENT.test(k))) throw new RpcError('invalid_request')
  const call = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as result`
  try {
    return await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
      const res = await tx.query<{ result: unknown }>(call, keys.map((k) => args[k]))
      return res.rows[0]?.result ?? null
    })
  } catch (e) {
    // Game errors are raised with the error code as message (private.fail).
    const message = e instanceof Error ? e.message : String(e)
    throw new RpcError(/^[a-z_]+$/.test(message) ? message : 'server_error')
  }
}
