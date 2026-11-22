import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const C = 'pkm-base-028'
const H = 'pkm-base-090'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (query: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(query, params))[0]!.v)
const cash = async () => (await t.rpc(me, 'me_get')).player!.cash_cents
const stack = () => num(`select coalesce(sum(qty), 0) as v from game.card_stacks where player_id = $1 and card_id = $2`, [id, C])
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(value)])
/** An NPC ad with known numbers: ask 1.000, hidden minimum 800. */
const ad = async (o: { item?: string; qty?: number; patience?: number; risk?: string | null } = {}) =>
  num(
    `insert into game.ads (style, seller_idx, title_idx, item_kind, item_id, qty, ask_cents, min_cents, patience, risk, created_at, expires_at)
     values ('normal', 0, 0, 'card', $1, $2, 1000, 800, $3, $4, private.now(), private.now() + interval '1 day') returning id as v`,
    [o.item ?? C, o.qty ?? 2, o.patience ?? 3, o.risk ?? null],
  )
const offer = (ad: number, price: number) => t.rpc(me, 'ad_offer', { p_request_id: rid(), p_ad: ad, p_price: price })

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.61)`)
  me = await t.player('Feilscher')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 4 where true`)
  await t.sql(`select private.money_add($1, 100000, 'test')`, [id])
  await t.sql(`update game.npcs set activity = 0 where true`)
  await t.sql(`select private.tick_market()`)
  await t.sql(`select private.tick_npcs()`)
})

describe('Kleinanzeigen', () => {
  it('fills the board with NPC ads', async () => {
    await t.sql(`select private.tick_ads()`)
    const board = (await t.rpc(me, 'ads_get')).board
    expect(board).toHaveLength(10)
    expect(await num(`select count(*) as v from game.ads where min_cents > ask_cents`)).toBe(0)
  })

  it('haggles: a counter offer, a deal at the offered price, a block for insults or lost patience', async () => {
    const a1 = await ad()
    const countered = await offer(a1, 600)
    expect(countered.result).toMatchObject({ state: 'countered', counter_cents: 800 })
    const before = await cash()
    const deal = await offer(a1, 850)
    expect(deal.result).toMatchObject({ state: 'accepted', outcome: 'ok', price_cents: 850 })
    expect(deal.player.cash_cents).toBe(before - 850)
    expect(await stack()).toBe(2)
    expect(deal.ads.board.find((b) => b.id === a1)).toBeUndefined()

    const a2 = await ad()
    expect((await offer(a2, 300)).result.state).toBe('blocked')
    await expect(offer(a2, 900)).rejects.toThrow('blocked')
    const a3 = await ad({ patience: 1 })
    expect((await offer(a3, 600)).result.state).toBe('blocked')
    await t.assertLedgerMatches()
  })

  it('hides risks: ghost and fake take the money, a hit with a Knick arrives damaged', async () => {
    const before = await cash()
    expect((await offer(await ad({ risk: 'ghost' }), 1000)).result.outcome).toBe('ghost')
    expect((await offer(await ad({ risk: 'fake' }), 1000)).result.outcome).toBe('fake')
    expect(await cash()).toBe(before - 2000)
    expect(await stack()).toBe(0)
    expect((await offer(await ad({ item: H, qty: 1, risk: 'knick' }), 1000)).result.outcome).toBe('knick')
    const copy = (await t.sql<{ q_corners: number; q_surface: number }>(`select q_corners, q_surface from game.card_copies where owner_id = $1`, [id]))[0]!
    expect(copy.q_corners).toBeLessThanOrEqual(6)
    expect(copy.q_surface).toBeLessThanOrEqual(7)
  })

  it('own ads: NPCs answer, accepting pays at once, Kevin may book it back', async () => {
    await t.sql(`select private.stack_add($1, $2, 3)`, [id, C])
    const posted = await t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 3, p_price: 500 })
    expect(await stack()).toBe(0)
    const adId = posted.ads.mine[0]!.id
    await override('ads.offer_chance_pct', 100)
    await t.sql(`select private.tick_ads()`)
    expect((await t.rpc(me, 'ads_get')).mine[0]!.offers.length).toBeGreaterThanOrEqual(1)

    await override('ads.chargeback_pct', 100)
    const kevin = await num(
      `insert into game.ad_offers (ad_id, npc_id, price_cents, state, reply_kind, reply_idx, created_at)
       values ($1, 'kevin', 900, 'open', 'kid', 0, private.now()) returning id as v`, [adId])
    const before = await cash()
    const sold = await t.rpc(me, 'ad_answer', { p_request_id: rid(), p_offer: kevin, p_accept: true })
    expect(sold.player.cash_cents).toBeGreaterThanOrEqual(before + 900)
    expect(sold.ads.mine).toHaveLength(0)
    const paid = await cash()
    await t.advance('3 hours')
    await t.sql(`select private.tick_ads()`)
    expect(await cash()).toBe(paid - 900)
    expect(await num(`select count(*) as v from game.notifications where player_id = $1 and kind = 'chargeback'`, [id])).toBe(1)
    await t.assertLedgerMatches()
  })

  it('gives the goods back when an own ad is removed or expires; needs level 4', async () => {
    await t.sql(`select private.stack_add($1, $2, 2)`, [id, C])
    const posted = await t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 500 })
    await t.rpc(me, 'ad_remove', { p_request_id: rid(), p_ad: posted.ads.mine[0]!.id })
    expect(await stack()).toBe(2)
    await t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 2, p_price: 500 })
    await t.advance('4 days')
    await t.sql(`select private.tick_ads()`)
    expect(await stack()).toBe(2)
    expect(await num(`select count(*) as v from game.notifications where player_id = $1 and kind = 'ad_expired'`, [id])).toBe(1)

    await t.sql(`update game.players set level = 3 where true`)
    await expect(t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'card', p_item: C, p_copy: null, p_qty: 1, p_price: 500 })).rejects.toThrow('locked')
  })
})
