// Test harness: a fresh in-memory Postgres with the Supabase shim, all migrations and the seed.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { localRpc } from '../../src/lib/backend/localRpc.ts'
import { RPC_SCHEMAS, type RpcName } from '../../src/lib/schemas.ts'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

export async function createTestDb() {
  const db = new PGlite()
  await db.exec(read('shim/supabase_shim.sql'))
  for (const file of readdirSync(new URL('migrations/', root)).sort()) {
    await db.exec(read(`migrations/${file}`))
  }
  await db.exec(read('seed/config.sql'))

  const sql = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) =>
    (await db.query<T>(query, params)).rows

  return {
    db,
    sql,
    /** A signed-up auth user without a player. */
    async authUser() {
      const id = randomUUID()
      await sql(`insert into auth.users (id, email, encrypted_password) values ($1, $2, 'x')`, [id, `${id}@test`])
      return id
    },
    /** A joined player. The first one sets the invite code and becomes admin. */
    async player(username: string, inviteCode = 'geheim123') {
      const id = await this.authUser()
      await this.rpc(id, 'join', { p_username: username, p_invite_code: inviteCode })
      return id
    },
    /** Calls an RPC as that user and checks the answer against the client's contract. */
    async rpc<N extends RpcName>(userId: string | null, fn: N, args: Record<string, unknown> = {}) {
      const raw = await localRpc(db, userId, fn, args)
      return RPC_SCHEMAS[fn].parse(raw)
    },
    async advance(interval: string) {
      await sql(`update game.server set clock_offset = clock_offset + $1::interval where id`, [interval])
    },
    async tick() {
      return (await sql<{ r: { ran: number; failed: number } }>(`select private.tick() as r`))[0]!.r
    },
    /** Invariant: every balance equals the sum of its ledger rows. */
    async assertLedgerMatches() {
      const bad = await sql(
        `select p.username from game.players p
         where p.cash_cents <> coalesce((select sum(delta_cents) from game.ledger l where l.player_id = p.id), 0)`,
      )
      if (bad.length) throw new Error(`ledger mismatch for ${JSON.stringify(bad)}`)
    },
  }
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>
