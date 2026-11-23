import { describe, expect, it } from 'vitest'
import { createTestDb } from './harness.ts'

describe('Admin health', () => {
  it('reports database size against the limit, the largest tables and the players; admins only', async () => {
    const t = await createTestDb()
    const admin = await t.player('Chefin')
    const other = await t.player('Gast')
    await t.sql(`update game.players set is_admin = true where id = $1`, [await t.playerId(admin)])
    const h = await t.rpc(admin, 'admin_health')
    expect(h.db_bytes).toBeGreaterThan(0)
    expect(h.limit_bytes).toBe(500 * 1024 * 1024)
    expect(h.tables.length).toBeGreaterThan(0)
    expect(h).toMatchObject({ players: 2, warn_pct: 60 })
    await expect(t.rpc(other, 'admin_health')).rejects.toThrow('forbidden')
  })

  it('shows each player\'s pace in the current run (an exit starts a new one)', async () => {
    const t = await createTestDb()
    const admin = await t.player('Chefin')
    const id = await t.playerId(admin)
    await t.sql(`update game.players set is_admin = true, level = 40 where id = $1`, [id])
    await t.advance('3 days')
    let pace = (await t.rpc(admin, 'admin_health')).pace
    expect(pace).toEqual([expect.objectContaining({ username: 'Chefin', level: 40, prestige: 0, days: 3 })])
    await t.sql(
      `insert into game.prestiges (player_id, n, stars, value_cents, started_at, at)
       values ($1, 1, 12, 0, private.now() - interval '3 days', private.now() - interval '1 day')`,
      [id],
    )
    pace = (await t.rpc(admin, 'admin_health')).pace
    expect(pace[0]!.days).toBe(1)
  })
})
