import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const C = 'pkm-base-028' // Pikachu, a common
const H = 'pkm-base-090' // Glurak, a grail
const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string
let aid: string
let bid: string

const worth = async (id: string) =>
  Number((await t.sql<{ w: string }>(`select private.net_worth($1) as w`, [id]))[0]!.w)
const value = async (item: string) =>
  Number((await t.sql<{ v: string }>(`select private.card_or_product_value($1) as v`, [item]))[0]!.v)
const feed = async () => (await t.sql<{ data: { name: string; other: string; rank: number } }>(`select data from game.feed where kind = 'overtake' order by id`)).map((r) => r.data)

beforeEach(async () => {
  t = await createTestDb()
  a = await t.player('Anna')
  b = await t.player('Bert')
  aid = await t.playerId(a)
  bid = await t.playerId(b)
  await t.sql(`update game.players set level = 10 where true`)
})

describe('net worth', () => {
  it('counts cards wherever they are: binder, listed, on the way, in ads, and money in buy orders', async () => {
    await t.sql(`select private.money_add($1, 100000, 'test')`, [bid])
    await t.sql(`select private.stack_add($1, $2, 4)`, [aid, C])
    const start = { a: await worth(aid), b: await worth(bid) }
    expect(start.b).toBe(Number((await t.rpc(b, 'me_get')).player!.net_worth_cents))

    // Listing moves cards out of the binder but not out of the net worth.
    await t.rpc(a, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 500 })
    expect(await worth(aid)).toBe(start.a)

    // A buy order holds cash in escrow: still the buyer's.
    await t.rpc(b, 'order_create', { p_request_id: rid(), p_item: H, p_qty: 1, p_price: 100_00 })
    expect(await worth(bid)).toBe(start.b)

    // While a parcel travels the buyer owns the cards and the seller is owed the money minus the fee.
    const l = (await t.rpc(b, 'cardmarket_item', { p_item: C })).listings[0]!.id
    await t.rpc(b, 'listing_buy', { p_request_id: rid(), p_listing: l, p_qty: 2 })
    const v = await value(C)
    expect(await worth(bid)).toBe(start.b - 1000 + 2 * v)
    expect(await worth(aid)).toBe(start.a - 2 * v + 950)

    // Own Kleinanzeigen ad: the card is still counted.
    await t.rpc(a, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: 300 })
    expect(await worth(aid)).toBe(start.a - 2 * v + 950)
  })
})

describe('toplists', () => {
  it('ranks players and NPC rivals, shows the caller and who is just ahead', async () => {
    await t.sql(`select private.money_add($1, 50000, 'test')`, [bid])
    const all = await t.rpc(a, 'toplist_get', { p_list: 'worth', p_npcs: true })
    expect(all.rows.length).toBe(42) // 40 rivals + 2 players, all within the top 50
    expect(all.rows.filter((r) => r.kind === 'npc')).toHaveLength(40)
    expect(all.rows.map((r) => r.rank)).toEqual(all.rows.map((_, i) => i + 1))
    expect(all.rows.find((r) => r.me)!.name).toBe('Anna')
    expect(all.rows.findIndex((r) => r.name === 'Bert')).toBeLessThan(all.rows.findIndex((r) => r.name === 'Anna'))

    const players = await t.rpc(a, 'toplist_get', { p_list: 'cash', p_npcs: false })
    expect(players.rows.map((r) => [r.rank, r.name])).toEqual([[1, 'Bert'], [2, 'Anna']])

    // Only the top rows, the caller and the one ahead of them.
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('toplist.size', '3'::jsonb, now())`)
    const short = await t.rpc(a, 'toplist_get', { p_list: 'worth', p_npcs: true })
    const me = short.rows.find((r) => r.me)!
    expect(short.rows.map((r) => r.rank)).toEqual([1, 2, 3, me.rank - 1, me.rank])

    await expect(t.rpc(a, 'toplist_get', { p_list: 'gibtsnicht', p_npcs: true })).rejects.toThrow('invalid_request')
  })

  it('lets the rivals grow with the days since the world started', async () => {
    const top = async (list: 'worth' | 'level' | 'collection') =>
      (await t.rpc(a, 'toplist_get', { p_list: list, p_npcs: true })).rows.find((r) => r.id === 'rival-40')!
    const day0 = { worth: (await top('worth')).value, level: (await top('level')).value, coll: (await top('collection')).value }
    await t.advance('10 days')
    expect((await top('worth')).value).toBeGreaterThan(day0.worth * 1.2)
    expect((await top('level')).value).toBeGreaterThan(day0.level)
    expect((await top('collection')).value).toBeGreaterThan(day0.coll)
    await t.advance('3000 days')
    expect((await top('level')).value).toBe(100)
    expect((await top('worth')).value).toBeLessThanOrEqual(day0.worth * 1000)
  })

  it('counts distinct owned cards for the Sammlung list', async () => {
    await t.sql(`select private.stack_add($1, $2, 3)`, [aid, C])
    await t.sql(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, $2, 5, 5, 5, 5, private.now()), ($1, $2, 6, 6, 6, 6, private.now())`,
      [aid, H],
    )
    const list = await t.rpc(a, 'toplist_get', { p_list: 'collection', p_npcs: false })
    expect(list.rows.find((r) => r.me)!.value).toBe(2)
    expect(list.cards_total).toBeGreaterThanOrEqual(90)
  })
})

describe('net worth history', () => {
  it('snapshots hourly, thins to one a day after a week and writes overtakes into the feed', async () => {
    await t.sql(`select private.money_add($1, 1000, 'test')`, [aid])
    await t.sql(`select private.tick_snapshots()`)
    expect(await feed()).toEqual([])

    await t.sql(`select private.money_add($1, 5000, 'test')`, [bid])
    await t.advance('1 hour')
    await t.sql(`select private.tick_snapshots()`)
    expect(await feed()).toEqual([{ name: 'Bert', other: 'Anna', rank: 1 }])

    for (let h = 0; h < 24 * 9; h++) {
      await t.advance('1 hour')
      await t.sql(`select private.tick_snapshots()`)
    }
    expect(await feed()).toHaveLength(1) // no change, no news
    const rows = await t.sql<{ old: string; recent: string }>(
      `select count(*) filter (where at < private.now() - interval '7 days') as old,
              count(*) filter (where at >= private.now() - interval '7 days') as recent
       from game.worth_snapshots where player_id = $1`,
      [aid],
    )
    expect(Number(rows[0]!.recent)).toBeGreaterThanOrEqual(24 * 7 - 1)
    expect(Number(rows[0]!.old)).toBeLessThanOrEqual(4) // one per Berlin day

    const home = await t.rpc(a, 'home_get')
    expect(home.worth.history.length).toBeGreaterThanOrEqual(24 * 7)
    expect(home.worth.history.at(-1)![1]).toBe(home.worth.now_cents)
    expect(home.worth.day_open_cents).toBe(home.worth.now_cents)

    await t.rpc(a, 'account_reset', { p_request_id: rid(), p_confirm: 'Anna' })
    expect((await t.rpc(a, 'home_get')).worth.history).toHaveLength(1)
  })
})
