import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

// 0.0.11 (owner request): an NPC collector buys a player's card after a wait that depends on its price against the
// Marktwert (market.npc_buy_steps): up to 100 % after 1-2 minutes, up to 115 % after 10-20 minutes, up to 130 % after
// 12-24 hours, dearer cards wait for players. In the Kleinanzeigen the same wait brings a full-price offer.
const C = 'pkm-base-028'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (query: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(query, params))[0]!.v)
const cash = () => num(`select cash_cents as v from game.players where id = $1`, [id])
const buyers = () => t.sql(`select private.tick_npc_buyers()`)
const prices = async () =>
  (await t.sql<{ p: string }>(`select price_cents as p from game.listings where seller_id = $1 order by price_cents`, [id])).map((r) => Number(r.p))
const list = (price: number, qty = 1) =>
  t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: qty, p_price: price })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Verkaeufer')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 20 where id = $1`, [id])
  await t.sql(`select private.tick_market()`)
  await t.sql(`select private.stack_add($1, $2, 10)`, [id, C])
})

describe('NPC buyers (0.0.11)', () => {
  it('buy a card by its price: Marktwert in 1-2 minutes, +15 % in 10-20 minutes, +30 % in 12-24 hours, dearer never', async () => {
    const v = await num(`select private.card_or_product_value($1) as v`, [C])
    const [p100, p110, p130, p140] = [v, Math.floor(v * 1.1), Math.floor(v * 1.3), Math.ceil(v * 1.4)]
    await list(p100, 2)
    await list(p110)
    await list(p130)
    await list(p140)
    const start = await cash()
    await buyers()
    expect(await prices()).toEqual([p100, p110, p130, p140]) // nobody comes at once
    await t.advance('2 minutes')
    await buyers()
    expect(await prices()).toEqual([p110, p130, p140])
    await t.advance('18 minutes')
    await buyers()
    expect(await prices()).toEqual([p130, p140])
    await t.advance('24 hours')
    await buyers()
    expect(await prices()).toEqual([p140])
    await t.advance('3 days')
    await buyers()
    expect(await prices()).toEqual([p140]) // above +30 % only players buy

    // the seller is paid when the parcels arrive, minus the 5 % fee, and hears about each sale at once
    await t.sql(`select private.tick_shipments()`)
    const payout = (total: number) => total - Math.round(total * 0.05)
    expect((await cash()) - start).toBe(payout(2 * p100) + payout(p110) + payout(p130))
    expect(await num(`select count(*) as v from game.notifications where player_id = $1 and kind = 'npc_bought'`, [id])).toBe(3)
    await t.assertLedgerMatches()
  })

  it('take a hit at its own value and show the wait on the own listing', async () => {
    const holo = (await t.sql<{ id: string }>(`select id from game.card_defs where tier = 'holo' and set_id = 'pokemon-base' order by id limit 1`))[0]!.id
    const copy = (
      await t.sql<{ id: string }>(
        `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
         values ($1, $2, 9, 8, 9, 9, private.now()) returning id`,
        [id, holo],
      )
    )[0]!.id
    const worth = await num(`select private.copy_value($1) as v`, [copy])
    const res = await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: holo, p_copy: copy, p_qty: 1, p_price: worth })
    const mine = res.mine.listings.find((l) => l.item_id === holo)!
    const wait = (new Date(mine.npc_buy_at!).getTime() - new Date((await t.sql<{ n: string }>(`select private.now() as n`))[0]!.n).getTime()) / 1000
    expect(wait).toBeGreaterThanOrEqual(59)
    expect(wait).toBeLessThanOrEqual(121)
    await t.advance('2 minutes')
    await buyers()
    expect(await t.sql(`select 1 from game.card_copies where id = $1`, [copy])).toEqual([]) // the NPC keeps it
  })

  it('Stammkunden halves the waits, in the game and in the sell form', async () => {
    await t.sql(`insert into game.modifiers (player_id, source, stat, op, value) values ($1, 'skill:h_stamm', 'npc_trust', 'flat', 1)`, [id])
    expect((await t.rpc(me, 'limits_get', { p_target: null })).npc_buy_steps[0]).toEqual({ max_pct: 100, min_s: 30, max_s: 60 })
    await list(await num(`select private.card_or_product_value($1) as v`, [C]))
    await t.advance('61 seconds')
    await buyers()
    expect(await prices()).toEqual([])
  })

  it('in the Kleinanzeigen a fair card gets a full-price offer that needs no NPC budget', async () => {
    const v = await num(`select private.card_or_product_value($1) as v`, [C])
    const post = (ask: number) => t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: ask })
    await post(2 * v) // the asking price is for the whole lot
    await post(3 * v) // +50 %: no collector comes
    await t.advance('2 minutes')
    await buyers()
    const offers = await t.sql<{ id: string; price_cents: string; npc_id: string }>(
      `select o.id, o.price_cents, o.npc_id from game.ad_offers o join game.ads a on a.id = o.ad_id where a.seller_id = $1 and o.reply_kind = 'full'`,
      [id],
    )
    expect(offers.map((o) => Number(o.price_cents))).toEqual([2 * v])
    await t.sql(`update game.npcs set budget_cents = 0 where id = $1`, [offers[0]!.npc_id])
    const before = await cash()
    const res = await t.rpc(me, 'ad_answer', { p_request_id: rid(), p_offer: Number(offers[0]!.id), p_accept: true })
    expect(res.broke).toBeUndefined()
    expect((await cash()) - before).toBe(2 * v)
    await t.advance('1 day')
    await buyers()
    // the sold ad is gone with its offers; the one at +50 % never gets a full-price offer
    expect(await num(`select count(*) as v from game.ads where seller_id = $1`, [id])).toBe(1)
    expect(await num(`select count(*) as v from game.ad_offers where reply_kind = 'full'`)).toBe(0)
    await t.assertLedgerMatches()
  })

  it('sealed listings keep the scalpers and investors; no timed buyer', async () => {
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 1)`, [id])
    const v = await num(`select private.card_or_product_value('booster-pkm-base') as v`)
    await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'sealed', p_item: 'booster-pkm-base', p_copy: null, p_qty: 1, p_price: v })
    expect(await num(`select count(*) as v from game.listings where seller_id = $1 and npc_buy_at is null`, [id])).toBe(1)
  })
})

// The deploy applies new migrations before the seed writes new config keys, onto a database with players' listings.
describe('deploying 0.0.11 onto live data', () => {
  it('gives listings and ads that are already up their NPC buyer', async () => {
    const file = '20261124000500_npc_buyers.sql'
    const live = await createTestDb({ holdBack: [file] })
    await live.sql(`delete from game.config where key = 'market.npc_buy_steps'`) // the seed of 0.0.10 did not have it
    const seller = await live.player('Altkunde')
    const sid = await live.playerId(seller)
    await live.sql(`update game.players set level = 20 where id = $1`, [sid])
    await live.sql(`select private.tick_market()`)
    const v = Number((await live.sql<{ v: string }>(`select private.card_or_product_value($1) as v`, [C]))[0]!.v)
    // made by 0.0.10 (its answers lack the new fields, so plain SQL instead of the RPCs)
    await live.sql(`insert into game.listings (seller_id, item_kind, item_id, qty, price_cents, created_at) values ($1, 'card', $2, 1, $3, private.now())`, [sid, C, v])
    await live.sql(
      `insert into game.ads (seller_id, style, item_kind, item_id, qty, ask_cents, created_at, expires_at)
       values ($1, 'player', 'card', $2, 1, $3, private.now(), private.now() + interval '3 days')`,
      [sid, C, v],
    )
    await live.migrate(file)
    expect(await live.sql(`select 1 from game.listings where seller_id = $1 and npc_buy_at is not null`, [sid])).toHaveLength(1)
    expect(await live.sql(`select 1 from game.ads where seller_id = $1 and npc_offer_at is not null`, [sid])).toHaveLength(1)
  })
})
