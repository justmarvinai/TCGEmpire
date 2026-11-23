import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

// Fair play (decision 111): second accounts are allowed, so value must not flow freely between accounts.
const rid = () => crypto.randomUUID()
const LABEL = { bg: 'gruen', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let a: string
let b: string
let idA: string
let idB: string
const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const holo = async (owner: string) =>
  (
    await t.sql<{ id: string; card: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), 9, 9, 9, 9, private.now())
       returning id, card_id as card`,
      [owner],
    )
  )[0]!

beforeEach(async () => {
  t = await createTestDb()
  a = await t.player('Hauptkonto')
  b = await t.player('Zweitkonto')
  idA = await t.playerId(a)
  idB = await t.playerId(b)
  await t.sql(`update game.players set level = 30, is_admin = (username = 'Hauptkonto')`)
  for (const id of [idA, idB]) await t.sql(`select private.money_add($1, 500000000, 'admin_grant')`, [id])
  await t.advance('2 hours') // past the trade lock of fresh accounts
})

describe('A: Cardmarket price band', () => {
  it('lets players list and bid only within 50–200 % of the Marktwert', async () => {
    const h = await holo(idB)
    const value = await num(`select private.copy_value($1) as v`, [h.id])
    const list = (price: number) =>
      t.rpc(b, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: h.card, p_copy: h.id, p_qty: 1, p_price: price })
    await expect(list(1)).rejects.toThrow('price_band') // the 1-cent gift to a second account
    await expect(list(value * 2 + 2)).rejects.toThrow('price_band')
    await list(value * 2)
    const order = (price: number) => t.rpc(a, 'order_create', { p_request_id: rid(), p_item: h.card, p_qty: 1, p_price: price })
    await expect(order(Math.floor(value / 2) - 1)).rejects.toThrow('price_band')
    await order(Math.ceil(value / 2))
    const limits = await t.rpc(a, 'limits_get', { p_target: null })
    expect(limits).toMatchObject({ market_min_pct: 50, market_max_pct: 200, target: null })
  })
})

describe('B: company prices', () => {
  it('stay within 50–300 % of the fair price, and an order never pays more than that', async () => {
    await t.rpc(a, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
    await t.advance('11 minutes')
    await t.rpc(a, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
    const company = (await t.rpc(a, 'company_found', { p_request_id: rid(), p_name: 'Wäscherei', p_slogan: '', p_label: LABEL })).company!.id
    const fair = (await t.rpc(a, 'company_get')).company!.demand.services.economy!.fair_cents
    const set = (price: number) => t.rpc(a, 'company_prices_set', { p_request_id: rid(), p_prices: { economy: price } })
    await expect(set(1_000_000_000)).rejects.toThrow('price_band') // 10 Mio. per card from a second account
    await expect(set(Math.floor(fair * 0.4))).rejects.toThrow('price_band')
    await set(fair * 3)
    // the owner's Ruf falls, so the fair price falls: the old price is clamped at the order
    await t.sql(`update game.players set ruf = 0 where id = $1`, [idA])
    const lower = (await t.rpc(a, 'company_get')).company!.demand.services.economy!.fair_cents
    expect(lower).toBeLessThan(fair)
    const h = await holo(idB)
    const sent = await t.rpc(b, 'company_order_submit', { p_request_id: rid(), p_copies: [h.id], p_company: company, p_service: 'economy' })
    expect(sent.fee_cents).toBeLessThanOrEqual(lower * 3 + 1)
    const flows = await t.rpc(a, 'admin_flows', { p_days: 7 })
    expect(flows.pairs[0]).toMatchObject({ from: { name: 'Zweitkonto' }, to: { name: 'Hauptkonto' }, kinds: { company: sent.fee_cents } })
  })
})

describe('C: Privatkredit', () => {
  it('lends at most a day of the borrower’s income, one running loan at a time', async () => {
    const max = (await t.rpc(a, 'limits_get', { p_target: idB })).target!.loan_max_cents
    const offer = (cents: number) => t.rpc(a, 'loan_offer', { p_request_id: rid(), p_to: idB, p_cents: cents, p_interest_pct: 0, p_days: 3 })
    await expect(offer(max + 1)).rejects.toThrow('loan_too_big')
    await offer(max)
    await offer(Math.floor(max / 2))
    const open = (await t.rpc(b, 'loans_get')).loans.filter((l) => l.state === 'offered')
    expect(open).toHaveLength(2)
    await t.rpc(b, 'loan_respond', { p_request_id: rid(), p_loan: open[0]!.id, p_accept: true })
    await expect(t.rpc(b, 'loan_respond', { p_request_id: rid(), p_loan: open[1]!.id, p_accept: true })).rejects.toThrow('loan_active')
    await expect(offer(100_00)).rejects.toThrow('loan_active')
    expect((await t.rpc(a, 'limits_get', { p_target: idB })).target!.loan_active).toBe(true)
  })
})

describe('D: what a player may receive', () => {
  it('caps gifts and trade surpluses per day; fair trades never count', async () => {
    const left = (await t.rpc(a, 'limits_get', { p_target: idB })).target!.receive_left_cents
    expect(left).toBeGreaterThan(0)
    const gift = (cents: number) => t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: idB, p_goods: { money_cents: cents, items: [] } })
    await expect(gift(left + 1)).rejects.toThrow('receive_cap')
    await gift(Math.floor(left / 2))
    const quote = await t.rpc(a, 'trade_quote', { p_to: idB, p_give: { money_cents: left, items: [] }, p_take: { money_cents: 0, items: [] } })
    expect(quote.their_receive_left_cents).toBe(left - Math.floor(left / 2))
    // a trade where b gets more than it gives is a gift of the difference
    await t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: idB, p_give: { money_cents: left, items: [] }, p_take: { money_cents: 0, items: [] } })
    const offer = (await t.rpc(b, 'players_get')).trades.open[0]!
    await expect(t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: offer.id, p_accept: true })).rejects.toThrow('receive_cap')
    // money for money of the same value: no gift at all
    await t.rpc(a, 'trade_offer', { p_request_id: rid(), p_to: idB, p_give: { money_cents: left * 10, items: [] }, p_take: { money_cents: left * 10, items: [] } })
    const fair = (await t.rpc(b, 'players_get')).trades.open.find((x) => x.id !== offer.id)!
    await t.rpc(b, 'trade_answer', { p_request_id: rid(), p_trade: fair.id, p_accept: true })
    await t.advance('1 day')
    expect((await t.rpc(a, 'limits_get', { p_target: idB })).target!.receive_left_cents).toBe(left)
  })
})

describe('E: EP from packs', () => {
  it('counts only up to the daily cap; new cards and the next day still count', async () => {
    await t.setConfig({ 'ep.pack_daily_cap': 2 })
    const product = (await t.sql<{ id: string }>(`select id from game.product_defs where kind = 'booster' order by id limit 1`))[0]!.id
    await t.sql(`select private.sealed_add($1, $2, 5)`, [idA, product])
    const open = (n: number) => t.rpc(a, 'pack_open', { p_request_id: rid(), p_product: product, p_qty: n })
    expect((await open(2)).ep_capped).toBe(false)
    expect((await open(2)).ep_capped).toBe(true)
    expect((await t.rpc(a, 'limits_get', { p_target: null })).packs_today).toBe(4)
    await t.advance('1 day')
    expect((await open(1)).ep_capped).toBe(false)
  })
})

describe('F: Aushelfen', () => {
  it('lets one player receive at most three helps a day', async () => {
    const helpers = [b, await t.player('Helfer3'), await t.player('Helfer4'), await t.player('Helfer5')]
    await t.sql(`update game.players set level = 30`)
    for (const h of helpers.slice(0, 3)) await t.rpc(h, 'friend_act', { p_request_id: rid(), p_target: idA, p_kind: 'aushelfen' })
    await expect(t.rpc(helpers[3]!, 'friend_act', { p_request_id: rid(), p_target: idA, p_kind: 'aushelfen' })).rejects.toThrow('help_cap')
    // coffee is not capped, and the same pair is still "already done", not "full"
    await t.rpc(helpers[3]!, 'friend_act', { p_request_id: rid(), p_target: idA, p_kind: 'kaffee' })
    await expect(t.rpc(b, 'friend_act', { p_request_id: rid(), p_target: idA, p_kind: 'aushelfen' })).rejects.toThrow('already_done')
    expect((await t.rpc(b, 'limits_get', { p_target: idA })).target!.helps_left).toBe(0)
  })
})

describe('G: Box Breaks', () => {
  it('sell spots at most at 120 % of the booster', async () => {
    const display = (await t.sql<{ id: string }>(`select id from game.product_defs where kind = 'display' order by id limit 1`))[0]!.id
    await t.sql(`select private.sealed_add($1, $2, 1)`, [idA, display])
    const d = (await t.rpc(a, 'breaks_get')).displays[0]!
    expect(d.max_cents).toBe(Math.floor((d.booster_cents * 12_000) / 10_000))
  })
})

describe('H: one-way flows for the admin', () => {
  it('logs gifts and market prices away from the Marktwert, and only admins see them', async () => {
    await t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: idB, p_goods: { money_cents: 1000_00, items: [] } })
    const h = await holo(idA)
    const value = await num(`select private.copy_value($1) as v`, [h.id])
    await t.rpc(a, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: h.card, p_copy: h.id, p_qty: 1, p_price: Math.ceil(value / 2) })
    const l = (await t.rpc(b, 'cardmarket_item', { p_item: h.card })).listings.find((x) => x.mine === false && x.price_cents === Math.ceil(value / 2))!
    await t.rpc(b, 'listing_buy', { p_request_id: rid(), p_listing: l.id, p_qty: 1 })
    const flows = await t.rpc(a, 'admin_flows', { p_days: 7 })
    const pair = flows.pairs.find((p) => p.from.name === 'Hauptkonto' && p.to.name === 'Zweitkonto')!
    expect(pair.kinds).toEqual({ gift: 1000_00, market: value - Math.ceil(value / 2) })
    expect(flows.receivers[0]).toMatchObject({ player: { name: 'Zweitkonto' }, givers: 1 })
    await expect(t.rpc(b, 'admin_flows', { p_days: 7 })).rejects.toThrow('forbidden')
  })
})
