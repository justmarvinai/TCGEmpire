import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const B = 'booster-pkm-base'
const SET = 'pokemon-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string

type Price = { item_id: string; value_cents: string; day_open_cents: string; pressure: string }
const prices = () => t.sql<Price>(`select item_id, value_cents, day_open_cents, pressure from game.prices order by item_id`)
const marketTicks = async (n: number) => {
  for (let i = 0; i < n; i++) {
    await t.advance('5 minutes')
    await t.sql(`select private.tick_market()`)
  }
}

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.17)`)
  me = await t.player('Händler')
})

describe('market values', () => {
  it('prices every card and sealed product and keeps each move inside the daily band', async () => {
    await t.sql(`select private.tick_market()`)
    const n = (await t.sql<{ n: string }>(`select (select count(*) from game.card_defs) + (select count(*) from game.product_defs) as n`))[0]!.n
    expect(await prices()).toHaveLength(Number(n))

    await marketTicks(60)
    for (const p of await prices()) {
      const open = Number(p.day_open_cents)
      expect(Number(p.value_cents)).toBeGreaterThanOrEqual(Math.floor(open * 0.78))
      expect(Number(p.value_cents)).toBeLessThanOrEqual(Math.ceil(open * 1.18))
    }
    const points = (await t.sql<{ points: string }>(`select count(*) as points from game.price_history where item_id = 'pkm-base-090'`))[0]!.points
    expect(Number(points)).toBe(61)

    // Card values everywhere follow the Marktwert.
    const glurak = (await t.sql<{ value_cents: string }>(`select value_cents from game.prices where item_id = 'pkm-base-090'`))[0]!
    const binder = await t.rpc(me, 'binder_get', { p_set: SET })
    expect(binder.cards.find((c) => c.card_id === 'pkm-base-090')!.value_cents).toBe(Number(glurak.value_cents))
  })

  it('lets trades near the Marktwert push it a little, far away ones not at all', async () => {
    await t.sql(`select private.tick_market()`)
    const value = Number((await t.sql<{ v: string }>(`select value_cents as v from game.prices where item_id = 'pkm-base-090'`))[0]!.v)
    await t.sql(`select private.price_push('pkm-base-090', $1)`, [value * 3])
    expect(Number((await prices()).find((p) => p.item_id === 'pkm-base-090')!.pressure)).toBe(1)
    await t.sql(`select private.price_push('pkm-base-090', $1)`, [Math.round(value * 1.1)])
    expect(Number((await prices()).find((p) => p.item_id === 'pkm-base-090')!.pressure)).toBeCloseTo(1.004, 6)
    for (let i = 0; i < 200; i++) await t.sql(`select private.price_push('pkm-base-090', $1)`, [Math.round(value * 1.1)])
    expect(Number((await prices()).find((p) => p.item_id === 'pkm-base-090')!.pressure)).toBe(1.2) // capped
  })

  it('counts opened packs per set and makes out-of-print sets scarce', async () => {
    const id = await t.playerId(me)
    await t.sql(`select private.sealed_add($1, $2, 3)`, [id, B])
    await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 3 })
    expect(Number((await t.sql<{ n: string }>(`select packs_opened as n from game.set_defs where id = $1`, [SET]))[0]!.n)).toBe(3)

    const factor = async (kind: string) =>
      Number((await t.sql<{ f: string }>(`select private.set_factor($1, $2) as f`, [SET, kind]))[0]!.f)
    expect(await factor('card')).toBeLessThan(1) // in print: falls slowly towards the floor
    expect(await factor('sealed')).toBe(1)
    // Out of print with every sealed booster of the print gone: 1 + a; sealed rises steeper.
    await t.sql(`update game.set_defs set phase = 'oop', oop_at = private.now(), sealed_at_oop = 10 where id = $1`, [SET])
    expect(await factor('card')).toBeCloseTo(5, 6)
    expect(await factor('sealed')).toBeCloseTo(7, 6)
  })

  it('thins the history to hourly and daily points', async () => {
    await t.sql(`select private.tick_market()`)
    await t.sql(`delete from game.price_history where true`)
    await t.sql(
      `insert into game.price_history (item_id, at, value_cents)
       select 'pkm-base-090', private.now() - make_interval(mins => 5 * g), 100 from generate_series(1, 12 * 24 * 20) g`,
    )
    await t.sql(`select private.tick_history()`)
    const rows = await t.sql<{ fine: string; hourly: string; daily: string }>(
      `select count(*) filter (where at >= private.now() - interval '48 hours') as fine,
              count(*) filter (where at < private.now() - interval '48 hours' and at >= private.now() - interval '14 days') as hourly,
              count(*) filter (where at < private.now() - interval '14 days') as daily
       from game.price_history`,
    )
    expect(Number(rows[0]!.fine)).toBeGreaterThanOrEqual(12 * 48 - 1) // the 48-hour edge moves between statements
    expect(Number(rows[0]!.hourly)).toBeLessThanOrEqual(24 * 12 + 1)
    expect(Number(rows[0]!.daily)).toBeLessThanOrEqual(7)
  })

  it('answers the item page and the overview', async () => {
    await expect(t.rpc(me, 'market_item', { p_item: 'gibts-nicht', p_range: 'day' })).rejects.toThrow('not_found')
    await t.sql(`select private.tick_market()`)
    await marketTicks(3)
    const item = await t.rpc(me, 'market_item', { p_item: 'pkm-base-090', p_range: 'day' })
    expect(item).toMatchObject({ item_id: 'pkm-base-090', kind: 'card', set_id: SET, phase: 'print' })
    expect(item.history).toHaveLength(4)
    const overview = await t.rpc(me, 'market_overview')
    expect(overview.games.map((g) => g.game)).toContain('pokemon')
    expect(overview.sets.find((s) => s.set_id === SET)).toMatchObject({ set_id: SET, phase: 'print' })
  })
})
