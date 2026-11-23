import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../../content/achievements.ts'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const dir = join(import.meta.dirname, '../migrations')
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n')

describe('Achievements', () => {
  it('about 200 tiers, and the server counts every event they need', () => {
    expect(ACHIEVEMENTS.reduce((n, a) => n + a.tiers.length, 0)).toBeGreaterThanOrEqual(190)
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length)
    const dynamic = ['pulled_', 'collect_', 'graded_']
    for (const a of ACHIEVEMENTS) {
      const counted = sql.includes(`'${a.event}'`) || dynamic.some((p) => a.event.startsWith(p) && sql.includes(`'${p}'`))
      expect(counted, a.event).toBe(true)
    }
  })

  describe('counters from logs', () => {
    let t: TestDb
    beforeEach(async () => {
      t = await createTestDb()
    })

    it('an attack that bounces off counts for the defender; a burst loan for the borrower', async () => {
      const a = await t.player('Angreifer')
      const b = await t.player('Verteidiger')
      const [aid, bid] = [await t.playerId(a), await t.playerId(b)]
      await t.sql(`update game.players set level = 35 where id in ($1, $2)`, [aid, bid])
      await t.sql(`select private.money_add($1, 10000000, 'admin_grant'), private.money_add($2, 10000000, 'admin_grant')`, [aid, bid])
      await t.rpc(b, 'bunker_get')
      await t.advance('3 hours')
      await t.sql(
        `insert into game.config_overrides (key, value, updated_at) values ('darkside.chance_min', '0', now()), ('darkside.chance_max', '0', now())`,
      )
      await t.rpc(a, 'attack', { p_request_id: rid(), p_kind: 'bunker', p_target: bid, p_card: null, p_up: null })
      expect(await t.sql(`select key, tier from game.achievements where player_id = $1 and key = 'defended'`, [bid])).toEqual([{ key: 'defended', tier: 1 }])

      const offer = await t.rpc(a, 'loan_offer', { p_request_id: rid(), p_to: bid, p_cents: 100000, p_interest_pct: 5, p_days: 2 })
      await t.rpc(b, 'loan_respond', { p_request_id: rid(), p_loan: offer.loans.loans[0]!.id, p_accept: true })
      await t.rpc(b, 'loan_burst', { p_request_id: rid(), p_loan: offer.loans.loans[0]!.id })
      expect(await t.sql(`select key from game.achievements where player_id = $1 and key = 'bursts'`, [bid])).toEqual([{ key: 'bursts' }])
    })
  })
})
