import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const C = 'pkm-base-028' // Pikachu, a common: stacks
const H = 'pkm-base-090' // Glurak, a grail: single copies
const B = 'booster-pkm-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string
let aid: string
let bid: string

const cash = async (id: string) => Number((await t.sql<{ c: string }>(`select cash_cents as c from game.players where id = $1`, [id]))[0]!.c)
const stack = async (id: string, card: string) =>
  Number((await t.sql<{ q: string }>(`select coalesce(sum(qty), 0) as q from game.card_stacks where player_id = $1 and card_id = $2`, [id, card]))[0]!.q)
const value = async (item: string) => Number((await t.sql<{ v: string }>(`select private.card_or_product_value($1) as v`, [item]))[0]!.v)
const copy = async (owner: string) =>
  (await t.sql<{ id: string }>(
    `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
     values ($1, $2, 7, 7, 7, 7, private.now()) returning id`,
    [owner, H],
  ))[0]!.id
const owner = async (copyId: string) => (await t.sql<{ o: string }>(`select owner_id as o from game.card_copies where id = $1`, [copyId]))[0]!.o
const allowance = async (browser: string) => (await t.rpc(browser, 'players_get')).trades.allowance_left_cents
const money = (cents: number) => ({ money_cents: cents, items: [] })

beforeEach(async () => {
  t = await createTestDb()
  // this file is not about the fair-play limits (fair_play.test.ts is): prices and gifts as the tests need them
  await t.setConfig({ 'gift.receive_cap_minutes': 1_000_000, 'market.player_min_pct': 0, 'market.player_max_pct': 1_000_000 })
  a = await t.player('Anna')
  b = await t.player('Bert')
  aid = await t.playerId(a)
  bid = await t.playerId(b)
  await t.sql(`update game.players set level = 10 where true`)
  await t.sql(`select private.money_add(id, 500000, 'test') from game.players`)
  await t.advance('61 minutes') // past the lock for fresh accounts
})

describe('gifts', () => {
  it('moves money, cards and hits; free within the allowance, taxed above it', async () => {
    await t.sql(`select private.stack_add($1, $2, 3)`, [aid, C])
    const hit = await copy(aid)
    const left = await allowance(a)
    expect(left).toBe(500_00 * 10 / 10) // 50 € Basis per level, level 10, P = 1

    const goods = { money_cents: 100_00, items: [{ kind: 'card', item_id: C, qty: 2 }, { kind: 'copy', item_id: H, copy_id: hit, qty: 1 }] }
    const quote = await t.rpc(a, 'trade_quote', { p_to: bid, p_give: goods, p_take: {} })
    const giftValue = 100_00 + 2 * (await value(C)) + (await value(H))
    expect(quote.give_cents).toBe(giftValue)
    expect(quote.my_tax_cents).toBe(Math.round(Math.max(0, giftValue - left) * 0.2))

    const before = { a: await cash(aid), b: await cash(bid) }
    const req = rid()
    const sent = await t.rpc(a, 'gift_send', { p_request_id: req, p_to: bid, p_goods: goods })
    expect(sent).toMatchObject({ value_cents: giftValue, tax_cents: quote.my_tax_cents })
    expect((await t.rpc(a, 'gift_send', { p_request_id: req, p_to: bid, p_goods: goods })).tax_cents).toBe(quote.my_tax_cents) // replay
    expect(await cash(aid)).toBe(before.a - 100_00 - quote.my_tax_cents)
    expect(await cash(bid)).toBe(before.b + 100_00)
    expect(await stack(bid, C)).toBe(2)
    expect(await owner(hit)).toBe(bid)
    expect((await t.rpc(b, 'binder_get', { p_set: 'pokemon-base' })).cards.find((c) => c.card_id === H)!.discovered).toBe(true)
    expect(await allowance(a)).toBe(Math.max(0, left - giftValue))

    // Above the allowance every euro is taxed.
    const second = await t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: money(1000_00) })
    expect(second.tax_cents).toBe(200_00)
    const kinds = (await t.sql<{ kind: string }>(`select kind from game.notifications where player_id = $1 and kind = 'gift_received'`, [bid]))
    expect(kinds).toHaveLength(2)
    await t.assertLedgerMatches()
  })

  it('refuses fresh accounts, foreign items and nonsense', async () => {
    const c = await t.player('Cleo')
    const cid = await t.playerId(c)
    await t.sql(`update game.players set level = 10 where id = $1`, [cid])
    await t.sql(`select private.money_add($1, 10000, 'test')`, [cid])
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: cid, p_goods: money(100) })).rejects.toThrow('partner_locked')
    await expect(t.rpc(c, 'gift_send', { p_request_id: rid(), p_to: aid, p_goods: money(100) })).rejects.toThrow('trade_locked')

    // Receiving needs no level, giving does.
    await t.advance('61 minutes')
    await t.sql(`update game.players set level = 3 where id = $1`, [cid])
    await t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: cid, p_goods: money(100) })
    await expect(t.rpc(c, 'gift_send', { p_request_id: rid(), p_to: aid, p_goods: money(100) })).rejects.toThrow('locked')

    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: { money_cents: 0, items: [{ kind: 'card', item_id: C, qty: 1 }] } })).rejects.toThrow('not_owned')
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: money(0) })).rejects.toThrow('invalid_request')
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: money(-5) })).rejects.toThrow('invalid_request')
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: aid, p_goods: money(100) })).rejects.toThrow('invalid_request')
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: { money_cents: 0, items: [{ kind: 'card', item_id: H, qty: 1 }] } })).rejects.toThrow('invalid_request')
    const hit = await copy(bid)
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: { money_cents: 0, items: [{ kind: 'copy', item_id: H, copy_id: hit, qty: 1 }] } })).rejects.toThrow('not_owned')
    await expect(t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: money(99_999_999_99) })).rejects.toThrow('not_owned')
    await t.assertLedgerMatches()
  })
})

describe('Direkthandel', () => {
  it('swaps both sides on acceptance and taxes the side that gives more', async () => {
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('gift.allowance_base_cents_per_level', '0'::jsonb, now())`)
    await t.sql(`select private.stack_add($1, $2, 5)`, [aid, C])
    await t.sql(`select private.sealed_add($1, $2, 1)`, [aid, B])
    const hit = await copy(bid)
    const give = { money_cents: 20_00, items: [{ kind: 'card', item_id: C, qty: 5 }, { kind: 'sealed', item_id: B, qty: 1 }] }
    const take = { money_cents: 0, items: [{ kind: 'copy', item_id: H, copy_id: hit, qty: 1 }] }
    const offered = await t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: bid, p_give: give, p_take: take })
    const trade = offered.trades.open[0]!
    expect(trade).toMatchObject({ mine: true, to: { name: 'Bert' } })
    expect(await stack(aid, C)).toBe(5) // nothing reserved

    const incoming = (await t.rpc(b, 'players_get')).trades.open[0]!
    expect(incoming.mine).toBe(false)
    const vGive = 20_00 + 5 * (await value(C)) + (await value(B))
    const vHit = await value(H)
    expect(incoming.give.value_cents).toBe(vGive)
    expect(incoming.take.value_cents).toBe(vHit)
    expect(incoming.my_tax_cents).toBe(Math.round(Math.max(0, vHit - vGive) * 0.2))

    const before = { a: await cash(aid), b: await cash(bid) }
    const done = await t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: trade.id, p_accept: true })
    expect(done.trades.open).toHaveLength(0)
    expect(await owner(hit)).toBe(aid)
    expect(await stack(bid, C)).toBe(5)
    expect(await stack(aid, C)).toBe(0)
    const taxA = Math.round(Math.max(0, vGive - vHit) * 0.2)
    const taxB = Math.round(Math.max(0, vHit - vGive) * 0.2)
    expect(await cash(aid)).toBe(before.a - 20_00 - taxA)
    expect(await cash(bid)).toBe(before.b + 20_00 - taxB)
    expect(done.tax_cents).toBe(taxB)
    const note = await t.sql<{ kind: string }>(`select kind from game.notifications where player_id = $1 and kind like 'trade_%' order by id`, [aid])
    expect(note.map((n) => n.kind)).toEqual(['trade_accepted'])
    await t.assertLedgerMatches()
  })

  it('fails cleanly when the goods are gone, and handles decline, cancel, expiry and reset', async () => {
    await t.sql(`select private.stack_add($1, $2, 2)`, [aid, C])
    const offer = () => t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: bid, p_give: { money_cents: 0, items: [{ kind: 'card', item_id: C, qty: 2 }] }, p_take: money(1_00) })
    const first = (await offer()).trades.open[0]!.id
    await t.rpc(a, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 500 })
    await expect(t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: first, p_accept: true })).rejects.toThrow('trade_invalid')
    await expect(t.rpc(a, 'trade_answer', { p_request_id: rid(), p_trade: first, p_accept: true })).rejects.toThrow('not_found')
    const declined = await t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: first, p_accept: false })
    expect(declined.trades.open).toHaveLength(0)
    expect((await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'trade_declined'`, [aid]))).toHaveLength(1)

    await t.rpc(a, 'listing_cancel', { p_request_id: rid(), p_listing: (await t.rpc(a, 'cardmarket_get')).mine.listings[0]!.id })
    const second = (await offer()).trades.open[0]!.id
    expect((await t.rpc(a, 'trade_answer', { p_request_id: rid(), p_trade: second, p_accept: false })).trades.open).toHaveLength(0)

    const third = (await offer()).trades.open[0]!.id
    await t.advance('49 hours')
    await expect(t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: third, p_accept: true })).rejects.toThrow('not_found')

    await offer()
    await expect(t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: bid, p_give: money(0), p_take: money(0) })).rejects.toThrow('invalid_request')
    await expect(t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: bid, p_give: money(0), p_take: { money_cents: 0, items: [{ kind: 'card', item_id: C, qty: 1 }] } })).rejects.toThrow('trade_invalid')
    await t.sql(`update game.players set level = 9 where id = $1`, [bid])
    await expect(offer()).rejects.toThrow('partner_locked')
    await t.sql(`update game.players set level = 10 where id = $1`, [bid])

    await t.rpc(b, 'account_reset', { p_request_id: rid(), p_confirm: 'Bert' })
    expect((await t.rpc(a, 'players_get')).trades.open).toHaveLength(0)
    await expect(offer()).rejects.toThrow('partner_locked') // the fresh account waits an hour
    await t.assertLedgerMatches()
  })

  it('lists players with presence and shows what they could trade', async () => {
    await t.sql(`select private.stack_add($1, $2, 3)`, [bid, C])
    await copy(bid)
    const list = await t.rpc(a, 'players_get')
    expect(list.players.map((p) => p.name).sort()).toEqual(['Anna', 'Bert'])
    expect(list.players.find((p) => p.me)!.name).toBe('Anna')
    const inv = await t.rpc(a, 'trade_inventory', { p_player: bid })
    expect(inv.cash_cents).toBeNull()
    expect(inv.items.map((i) => i.kind).sort()).toEqual(['card', 'copy'])
    expect((await t.rpc(b, 'trade_inventory', { p_player: bid })).cash_cents).toBe(await cash(bid))
  })
})
