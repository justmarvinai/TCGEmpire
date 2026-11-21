// Test harness: a fresh in-memory Postgres with the Supabase shim, all migrations and the seed.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { localRpc } from '../../src/lib/backend/localRpc.ts'
import { RPC_SCHEMAS, type RpcName } from '../../src/lib/schemas.ts'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

export async function createTestDb() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(read('shim/supabase_shim.sql'))
  for (const file of readdirSync(new URL('migrations/', root)).sort()) {
    await db.exec(read(`migrations/${file}`))
  }
  await db.exec(read('seed/config.sql'))
  // Cheap password hashing keeps the tests fast.
  await db.exec(`insert into game.config_overrides (key, value, updated_at) values ('auth.bcrypt_cost', '4', now())`)

  const sql = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) =>
    (await db.query<T>(query, params)).rows

  return {
    db,
    sql,
    /** A browser: an anonymous auth user that is not signed in as any player yet. */
    browser() {
      return randomUUID()
    },
    /** Registers a player from a fresh browser and returns that browser's id (use it for rpc calls). */
    async player(username: string, inviteCode = 'geheim123') {
      const browser = this.browser()
      await this.rpc(browser, 'join', { p_username: username, p_password: 'passwort1', p_invite_code: inviteCode })
      return browser
    },
    /** The player id behind a signed-in browser (for direct SQL in tests). */
    async playerId(browser: string) {
      return (await sql<{ player_id: string }>(`select player_id from game.sessions where auth_uid = $1`, [browser]))[0]!
        .player_id
    },
    /** Calls an RPC as that user and checks the answer against the client's contract. */
    async rpc<N extends RpcName>(
      userId: string | null,
      fn: N,
      args: Record<string, unknown> = {},
    ): Promise<z.infer<(typeof RPC_SCHEMAS)[N]>> {
      const raw = await localRpc(db, userId, fn, args)
      return RPC_SCHEMAS[fn].parse(raw) as z.infer<(typeof RPC_SCHEMAS)[N]>
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
