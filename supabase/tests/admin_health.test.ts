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
})
