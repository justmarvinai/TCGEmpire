import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const C = 'pkm-base-028'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (query: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(query, params))[0]!.v)
const budget = (npc: string) => num(`select budget_cents as v from game.npcs where id = $1`, [npc])
const value = (item: string) => num(`select value_cents as v from game.prices where item_id = $1`, [item])
const cash = async () => (await t.rpc(me, 'me_get')).player!.cash_cents
const npcTick = () => t.sql(`select private.tick_npcs()`)
const deliver = async () => {
  await t.advance('30 minutes')
  await t.sql(`select private.tick_shipments()`)
}

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.21)`)
  me = await t.player('Kunde')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 10 where true`)
  await t.sql(`select private.money_add($1, 1000000, 'test')`, [id])
  await t.sql(`update game.npcs set activity = 0 where true`) // tests switch on one NPC at a time
  await t.sql(`select private.tick_market()`)
})

describe('NPC traders', () => {
  it('Kalle keeps a shop of singles above the Marktwert; a bought hit arrives as a fresh copy', async () => {
    await t.sql(`update game.npcs set activity = 100 where id = 'kalle'`)
    await npcTick()
    const listings = await t.sql<{ item_id: string; price_cents: string }>(`select item_id, price_cents from game.listings where npc_id = 'kalle'`)
    expect(listings).toHaveLength(14)
    for (const l of listings) expect(Number(l.price_cents)).toBeGreaterThanOrEqual(Math.floor((await value(l.item_id)) * 1.1))

    await t.sql(`select private.npc_list('kalle', 'pkm-base-090', 1, 100)`)
    const item = await t.rpc(me, 'cardmarket_item', { p_item: 'pkm-base-090' })
    const offer = item.listings.find((l) => l.price_cents === 100)!
    expect(offer.seller).toMatchObject({ kind: 'npc', name: 'Kartenhändler Kalle' })
    await t.rpc(me, 'listing_buy', { p_request_id: rid(), p_listing: offer.id, p_qty: 1 })
    await deliver()
    const copies = await t.sql<{ q_centering: number }>(`select q_centering from game.card_copies where owner_id = $1 and card_id = 'pkm-base-090'`, [id])
    expect(copies).toHaveLength(1)
    expect(await budget('kalle')).toBe(95) // the price minus the 5 % fee
  })

  it('Sabine buys cheap offers (0.0.11: through the timed buyer), ignores expensive ones and pays on arrival', async () => {
    await t.sql(`update game.npcs set activity = 100 where id = 'sabine'`)
    await t.sql(`select private.stack_add($1, $2, 2)`, [id, C])
    const v = await value(C)
    await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: Math.max(1, Math.round(v * 0.5)) })
    await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: v * 2 })
    await npcTick()
    expect(await num(`select count(*) as v from game.listings where seller_id = $1`, [id])).toBe(2) // she no longer snipes on her own
    await t.advance('2 minutes')
    await t.sql(`select private.tick_npc_buyers()`)
    expect(await num(`select count(*) as v from game.listings where seller_id = $1`, [id])).toBe(1) // the expensive one stays
    expect(await num(`select count(*) as v from game.buy_orders where npc_id = 'sabine'`)).toBe(3)
    expect(await budget('sabine')).toBeGreaterThanOrEqual(0)

    const before = await cash()
    await deliver()
    expect(await cash()).toBeGreaterThanOrEqual(before + Math.round(Math.max(1, Math.round(v * 0.5)) * 0.95) - 1)
    expect(await num(`select qty as v from game.npc_stock where npc_id = 'sabine' and item_id = $1`, [C])).toBe(1)
    await t.assertLedgerMatches()
  })

  it('Bernd holds his budget in bulk orders and pays players who fill them', async () => {
    await t.sql(`update game.npcs set activity = 100 where id = 'bernd'`)
    await npcTick()
    const daily = await num(`select private.eur(budget_base_cents) as v from game.npcs where id = 'bernd'`)
    const held = await num(`select coalesce(sum(qty * price_cents), 0) as v from game.buy_orders where npc_id = 'bernd'`)
    expect(await num(`select count(*) as v from game.buy_orders where npc_id = 'bernd'`)).toBe(4)
    expect((await budget('bernd')) + held).toBe(daily)

    const order = (await t.sql<{ id: string; item_id: string; price_cents: string }>(`select id, item_id, price_cents from game.buy_orders where npc_id = 'bernd' limit 1`))[0]!
    await t.sql(`select private.stack_add($1, $2, 3)`, [id, order.item_id])
    await t.rpc(me, 'order_fill', { p_request_id: rid(), p_order: Number(order.id), p_qty: 3 })
    const before = await cash()
    await deliver()
    expect(await cash()).toBeGreaterThanOrEqual(before + Math.round(Number(order.price_cents) * 3 * 0.95) - 1)
    await t.assertLedgerMatches()
  })

  it('refills budgets once a day, never above two days', async () => {
    await npcTick()
    const daily = await num(`select private.eur(budget_base_cents) as v from game.npcs where id = 'ingo'`)
    expect(await budget('ingo')).toBe(daily)
    await npcTick()
    expect(await budget('ingo')).toBe(daily) // same day
    await t.advance('1 day')
    await npcTick()
    expect(await budget('ingo')).toBe(2 * daily)
    await t.advance('1 day')
    await npcTick()
    expect(await budget('ingo')).toBe(2 * daily)
  })
})
