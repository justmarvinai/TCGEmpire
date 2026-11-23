import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const C = 'pkm-base-028' // Pikachu, a common: bulk stack
const H = 'pkm-base-090' // Glurak, a grail: single copies
const SET = 'pokemon-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let seller: string
let buyer: string
let sid: string
let bid: string

const cash = async (browser: string) => (await t.rpc(browser, 'me_get')).player!.cash_cents
const stack = async (id: string, card: string) =>
  Number((await t.sql<{ q: string }>(`select coalesce(sum(qty), 0) as q from game.card_stacks where player_id = $1 and card_id = $2`, [id, card]))[0]!.q)
const copy = async (owner: string, quality: number) =>
  (await t.sql<{ id: string }>(
    `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
     values ($1, $2, $3, $3, $3, $3, private.now()) returning id`,
    [owner, H, quality],
  ))[0]!.id
const deliver = async () => {
  await t.advance('30 minutes')
  await t.sql(`select private.tick_shipments()`)
}

beforeEach(async () => {
  t = await createTestDb()
  // this file is not about the fair-play limits (fair_play.test.ts is): prices and gifts as the tests need them
  await t.setConfig({ 'market.player_min_pct': 0, 'market.player_max_pct': 1_000_000 })
  await t.sql(`select setseed(0.5)`)
  seller = await t.player('Verkäufer')
  buyer = await t.player('Käufer')
  sid = await t.playerId(seller)
  bid = await t.playerId(buyer)
  await t.sql(`update game.players set level = 10 where true`)
  await t.sql(`select private.money_add($1, 100000, 'test')`, [bid])
})

describe('Cardmarket', () => {
  it('sells bulk: listing, purchase, parcel, payout minus fee', async () => {
    await t.sql(`select private.stack_add($1, $2, 5)`, [sid, C])
    const listed = await t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 3, p_price: 500 })
    expect(await stack(sid, C)).toBe(2)
    const listing = listed.item.listings[0]!
    expect(listing).toMatchObject({ qty: 3, price_cents: 500, mine: true })

    const before = { seller: await cash(seller), buyer: await cash(buyer) }
    const req = rid()
    const bought = await t.rpc(buyer, 'listing_buy', { p_request_id: req, p_listing: listing.id, p_qty: 2 })
    expect(bought.player.cash_cents).toBe(before.buyer - 1000)
    expect(bought.item.listings[0]!.qty).toBe(1)
    expect(bought.mine.parcels).toEqual([expect.objectContaining({ item_id: C, qty: 2, incoming: true })])
    // Replaying the request changes nothing.
    expect((await t.rpc(buyer, 'listing_buy', { p_request_id: req, p_listing: listing.id, p_qty: 2 })).player.cash_cents).toBe(before.buyer - 1000)
    expect(await stack(bid, C)).toBe(0) // still on its way

    await deliver()
    expect(await stack(bid, C)).toBe(2)
    expect(await cash(seller)).toBeGreaterThanOrEqual(before.seller + 950) // 5 % fee is gone (EP may add a level reward)
    const kinds = (await t.sql<{ kind: string }>(`select kind from game.notifications where kind in ('parcel_arrived', 'sale_paid') order by kind`)).map((r) => r.kind)
    expect(kinds).toEqual(['parcel_arrived', 'sale_paid'])
    await t.assertLedgerMatches()
  })

  it('keeps listed and travelling hits out of the binder and the Ankauf', async () => {
    const id = await copy(sid, 7)
    await t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: H, p_copy: id, p_qty: 1, p_price: 99_00 })
    const binder = await t.rpc(seller, 'binder_get', { p_set: SET })
    expect(binder.cards.find((c) => c.card_id === H)!.qty).toBe(0)
    await expect(t.rpc(seller, 'ankauf_sell', { p_request_id: rid(), p_stacks: [], p_copies: [id] })).rejects.toThrow('not_owned')

    const item = await t.rpc(buyer, 'cardmarket_item', { p_item: H })
    await t.rpc(buyer, 'listing_buy', { p_request_id: rid(), p_listing: item.listings[0]!.id, p_qty: 1 })
    const travelling = (await t.sql<{ owner_id: string; location: string }>(`select owner_id, location from game.card_copies where id = $1`, [id]))[0]!
    expect(travelling).toEqual({ owner_id: bid, location: 'shipping' })
    await deliver()
    expect((await t.rpc(buyer, 'binder_get', { p_set: SET })).cards.find((c) => c.card_id === H)).toMatchObject({ qty: 1, copies: [id], discovered: true })
  })

  it('holds money in buy orders, fills them with the worst copies first and refunds the rest', async () => {
    const before = await cash(buyer)
    const ordered = await t.rpc(buyer, 'order_create', { p_request_id: rid(), p_item: H, p_qty: 3, p_price: 120_00 })
    expect(ordered.player.cash_cents).toBe(before - 360_00)
    const good = await copy(sid, 10)
    const bad = await copy(sid, 3)
    const order = ordered.item.orders[0]!
    await expect(t.rpc(seller, 'order_fill', { p_request_id: rid(), p_order: order.id, p_qty: 3 })).rejects.toThrow('not_owned')
    await t.rpc(seller, 'order_fill', { p_request_id: rid(), p_order: order.id, p_qty: 1 })
    expect((await t.sql<{ owner_id: string }>(`select owner_id from game.card_copies where id = $1`, [bad]))[0]!.owner_id).toBe(bid)
    expect((await t.sql<{ owner_id: string }>(`select owner_id from game.card_copies where id = $1`, [good]))[0]!.owner_id).toBe(sid)

    const cancelled = await t.rpc(buyer, 'order_cancel', { p_request_id: rid(), p_order: order.id })
    expect(cancelled.player.cash_cents).toBe(before - 120_00)
    await deliver()
    await t.assertLedgerMatches()
  })

  it('refuses what is not allowed', async () => {
    await t.sql(`select private.stack_add($1, $2, 5)`, [sid, C])
    await t.sql(`update game.players set level = 9 where id = $1`, [bid])
    await expect(t.rpc(buyer, 'order_create', { p_request_id: rid(), p_item: C, p_qty: 1, p_price: 100 })).rejects.toThrow('locked')
    await t.sql(`update game.players set level = 10 where id = $1`, [bid])

    await expect(t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 9, p_price: 100 })).rejects.toThrow('not_owned')
    await expect(t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: H, p_copy: null, p_qty: 1, p_price: 100 })).rejects.toThrow('invalid_request')
    await expect(t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: 0 })).rejects.toThrow('invalid_request')
    const listed = await t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 100 })
    const l = listed.item.listings[0]!.id
    await expect(t.rpc(seller, 'listing_buy', { p_request_id: rid(), p_listing: l, p_qty: 1 })).rejects.toThrow('own_listing')
    await expect(t.rpc(buyer, 'listing_buy', { p_request_id: rid(), p_listing: l, p_qty: 3 })).rejects.toThrow('invalid_request')
    await expect(t.rpc(buyer, 'listing_buy', { p_request_id: rid(), p_listing: 999999, p_qty: 1 })).rejects.toThrow('not_found')
    await expect(t.rpc(buyer, 'cardmarket_item', { p_item: 'gibts-nicht' })).rejects.toThrow('not_found')

    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('market.slots', '1'::jsonb, now())`)
    await expect(t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: 100 })).rejects.toThrow('no_slots')

    const cancelled = await t.rpc(seller, 'listing_cancel', { p_request_id: rid(), p_listing: l })
    expect(cancelled.mine.listings).toHaveLength(0)
    expect(await stack(sid, C)).toBe(5)
    await expect(t.rpc(seller, 'listing_cancel', { p_request_id: rid(), p_listing: l })).rejects.toThrow('not_found')
  })

  it('ends market business on an account reset without giving anything back', async () => {
    await t.sql(`select private.stack_add($1, $2, 5)`, [sid, C])
    await t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 100 })
    await t.rpc(seller, 'order_create', { p_request_id: rid(), p_item: H, p_qty: 1, p_price: 50 })
    const l = (await t.rpc(buyer, 'cardmarket_item', { p_item: C })).listings[0]!.id
    await t.rpc(buyer, 'listing_buy', { p_request_id: rid(), p_listing: l, p_qty: 1 })
    const stock = await t.rpc(seller, 'cardmarket_get')
    expect(stock.mine.parcels).toHaveLength(1)

    await t.rpc(seller, 'account_reset', { p_request_id: rid(), p_confirm: 'Verkäufer' })
    const after = await t.rpc(seller, 'cardmarket_get')
    expect(after.mine).toMatchObject({ listings: [], orders: [], parcels: [] })
    await deliver()
    expect(await stack(bid, C)).toBe(1) // the buyer still gets the card; nobody gets paid
    await t.assertLedgerMatches()
  })
})
