import { describe, expect, it } from 'vitest'
import { createTestDb } from './harness.ts'

const priceLevel = async (t: Awaited<ReturnType<typeof createTestDb>>) =>
  Number((await t.sql<{ price_level: string }>(`select price_level from game.server`))[0]!.price_level)

describe('tick', () => {
  it('runs due systems once per interval and survives a broken system', async () => {
    const t = await createTestDb()
    await t.sql(`insert into game.tick_systems (name, every_seconds) values ('broken', 60)`)
    const first = await t.tick()
    expect(first).toEqual({ ran: 12, failed: 1 }) // ads, broken, cleanup, daily, grading, headlines, history, market, npcs, shipments, snapshots, stores
    expect((await t.tick()).ran).toBe(0)
    await t.advance('61 seconds')
    expect(await t.tick()).toEqual({ ran: 5, failed: 1 }) // daily, broken, grading, shipments, stores; the rest run less often
    const errors = await t.sql<{ name: string; error: string }>(`select name, error from game.job_runs where not ok`)
    expect(errors).toHaveLength(2)
    expect(errors[0]!.name).toBe('broken')
  })

  it('raises the Preisniveau with the median career level, limited per day, never down', async () => {
    const t = await createTestDb()
    const a = await t.player('Alpha')
    await t.player('Beta')
    await t.tick()
    expect(await priceLevel(t)).toBe(1) // both level 1: no inflation below the free levels

    // Median career level 60 -> target 1.018^40 = 2.04, but only +10 % per day.
    await t.sql(`update game.players set level = 60 where true`)
    await t.advance('61 seconds')
    await t.tick()
    expect(await priceLevel(t)).toBe(1) // same day: already processed

    await t.advance('1 day')
    await t.tick()
    expect(await priceLevel(t)).toBe(1.1)
    await t.advance('1 day')
    await t.tick()
    expect(await priceLevel(t)).toBe(1.21)

    // Start capital of a new player follows the Preisniveau.
    const c = await t.player('Gamma')
    expect((await t.rpc(c, 'me_get')).player?.cash_cents).toBe(Math.round(400_00 * 1.21))

    // Players dropping back (e.g. after a reset) never lower prices.
    await t.sql(`update game.players set level = 1 where true`)
    await t.advance('1 day')
    await t.tick()
    expect(await priceLevel(t)).toBe(1.21)

    const feed = (await t.rpc(a, 'sync')).feed.filter((f) => f.kind === 'inflation')
    expect(feed).toHaveLength(2)
  })

  it('prunes old rows', async () => {
    const t = await createTestDb()
    const p = await t.playerId(await t.player('Alt'))
    await t.sql(`select private.notify($1, 'test')`, [p])
    await t.advance('31 days')
    await t.tick()
    expect(await t.sql(`select 1 from game.notifications`)).toHaveLength(0)
    expect(await t.sql(`select 1 from game.ledger`)).toHaveLength(0)
    expect(await t.sql(`select 1 from game.ledger_daily`)).toHaveLength(1) // daily totals stay
  })
})
