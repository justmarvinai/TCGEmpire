import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const HOLO = 'pkm-base-010'
const GRAIL = 'pkm-base-090'
let t: TestDb
let me: string
let id: string

const learn = (key: string) => t.rpc(me, 'skill_learn', { p_request_id: rid(), p_key: key })
const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
/** Owns a skill without spending points (for hook tests). */
const grant = (stat: string, value: number) =>
  t.sql(`insert into game.modifiers (player_id, source, stat, op, value) values ($1, 'skill:test-' || $2, $2, 'flat', $3)`, [id, stat, value])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Skiller')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 30, skill_points = 40 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
})

describe('Skillbaum', () => {
  it('learns along the lines, spends points, books the modifier and refunds on a respec', async () => {
    const res = await learn('s_glueck1')
    expect(res).toMatchObject({ points: 38, spent: 2, owned: ['s_glueck1'] })
    expect(await num(`select private.stat($1, 'pack_luck', 0) as v`, [id])).toBe(3)
    await expect(learn('s_glueck1')).rejects.toThrow('already_owned')
    await expect(learn('s_glueck3')).rejects.toThrow('skill_locked')
    await expect(learn('s_god')).rejects.toThrow('skill_locked')
    await learn('s_glueck2')
    expect(await num(`select private.stat($1, 'pack_luck', 0) as v`, [id])).toBe(8)

    await t.sql(`update game.players set skill_points = 1 where id = $1`, [id])
    await expect(learn('s_glueck3')).rejects.toThrow('no_points')

    // Respec: 500 € per level, every point back, no skill modifiers left.
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    const back = await t.rpc(me, 'skills_respec', { p_request_id: rid() })
    expect(back).toMatchObject({ points: 6, spent: 0, owned: [] })
    expect(cash - (await num(`select cash_cents as v from game.players where id = $1`, [id]))).toBe(30 * 500_00)
    expect(await num(`select private.stat($1, 'pack_luck', 0) as v`, [id])).toBe(0)
    await expect(t.rpc(me, 'skills_respec', { p_request_id: rid() })).rejects.toThrow('invalid_request')

    await t.sql(`update game.players set level = 4 where id = $1`, [id])
    await expect(learn('s_auge1')).rejects.toThrow('locked')
    await t.assertLedgerMatches()
  })

  it('a reset forgets the tree', async () => {
    await learn('u_fleiss1')
    await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'Skiller' })
    expect(await t.sql(`select 1 from game.skills_owned where player_id = $1`, [id])).toHaveLength(0)
    expect((await t.rpc(me, 'skills_get')).points).toBe(0)
  })
})

describe('Skill hooks', () => {
  it('Händler: Ankauf rate, Cardmarket fee and NPC collectors paying full value', async () => {
    await t.sql(`select private.stack_add($1, 'pkm-base-007', 10)`, [id])
    const value = await num(`select private.card_value('pkm-base-007') as v`)
    await learn('h_feil1')
    const binder = await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })
    expect(binder.cards.find((c) => c.card_id === 'pkm-base-007')!.ankauf_cents).toBe(Math.round((value * 6500) / 10000))
    const sold = await t.rpc(me, 'ankauf_sell', { p_request_id: rid(), p_stacks: [{ card_id: 'pkm-base-007', qty: 10 }], p_copies: [] })
    expect(sold.payout_cents).toBe(Math.round((value * 10 * 6500) / 10000))

    await learn('h_feil2')
    const buyer = await t.playerId(await t.player('Kunde'))
    await t.sql(`select private.sale_ship($1, null, $2, null, 'sealed', 'booster-pkm-base', null, 1, 10000)`, [id, buyer])
    expect(await t.sql(`select fee_cents from game.shipments where seller_id = $1`, [id])).toEqual([{ fee_cents: 400 }])

    // A listing at 95 % of its value: collectors only take it from a trusted seller.
    await t.sql(`update game.players set level = 30 where true`)
    const c = (await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, $2, 9, 9, 9, 9, private.now()) returning id`, [id, HOLO]))[0]!.id
    const price = Math.round((await num(`select private.card_value($1) as v`, [HOLO])) * 0.95)
    await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: HOLO, p_copy: c, p_qty: 1, p_price: price })
    const npc = (await t.sql<{ id: string }>(`select id from game.npcs where archetype = 'collector' limit 1`))[0]!.id
    await t.sql(`update game.npcs set budget_cents = 100000000000 where id = $1`, [npc])
    await t.sql(`select private.npc_buy_cheap($1, array['card', 'copy'], 85, 5)`, [npc])
    expect(await t.sql(`select 1 from game.listings where seller_id = $1`, [id])).toHaveLength(1)
    await grant('npc_trust', 1)
    await t.sql(`select private.npc_buy_cheap($1, array['card', 'copy'], 85, 5)`, [npc])
    expect(await t.sql(`select 1 from game.listings where seller_id = $1`, [id])).toHaveLength(0)
    await t.assertLedgerMatches()
  })

  it('Unternehmer and Schlitzohr: bunker yield, chargebacks, gift tax, Kleinanzeigen insight', async () => {
    const base = await num(`select private.bunker_rate_base($1) as v`, [id])
    await grant('bunker_rate_pct', 15)
    expect(await num(`select private.bunker_rate_base($1) as v`, [id])).toBeCloseTo(base * 1.15, 6)

    await grant('no_chargeback', 1)
    await t.sql(`insert into game.chargebacks (player_id, cents, due_at) values ($1, 100, private.now())`, [id])
    expect(await t.sql(`select 1 from game.chargebacks where player_id = $1`, [id])).toHaveLength(0)

    const gift = 10_000_000
    const tax = await num(`select private.gift_tax($1, $2) as v`, [id, gift])
    await grant('gift_tax_cut_pct', 50)
    expect(await num(`select private.gift_tax($1, $2) as v`, [id, gift])).toBe(Math.round(tax / 2))

    const npc = (await t.sql<{ id: string }>(`select id from game.npcs limit 1`))[0]!.id
    await t.sql(`insert into game.ads (npc_id, seller_idx, style, item_kind, item_id, qty, ask_cents, min_cents, risk, created_at, expires_at)
                 values ($1, 0, 'normal', 'card', $2, 1, 5000, 3000, 'knick', private.now(), private.now() + interval '1 day')`, [npc, HOLO])
    const ad = async () => (await t.rpc(me, 'ads_get')).board.find((a) => a.item_id === HOLO)!
    expect(await ad()).toMatchObject({ suspicious: false, min_cents: null })
    await grant('risk_sense', 1)
    await grant('pate', 1)
    expect(await ad()).toMatchObject({ suspicious: true, min_cents: 3000 })
  })

  it('God-Pack-Magnet triples the god pack chance', async () => {
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('pack.god_pack_ppm', '340000', now())`)
    await grant('god_pack_mult', 2) // 3 × 34 % > 100 %: every pack is a god pack
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 2)`, [id])
    const res = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 2 })
    const tiers = await t.sql<{ tier: string }>(`select tier from game.card_defs where id = any ($1)`, [res.packs.flatMap((p) => p.cards.map((c) => c.card_id))])
    expect(tiers.every((x) => ['holo', 'alternative', 'ultra', 'grail'].includes(x.tier))).toBe(true)
  })

  it('Too Big To Fail pays a quarter of the net worth once, when the cash is nearly gone', async () => {
    await t.sql(`insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
                 values ($1, $2, 9, 9, 9, 9, private.now())`, [id, GRAIL])
    await expect(t.rpc(me, 'bailout_claim', { p_request_id: rid() })).rejects.toThrow('not_ready') // no keystone yet
    await grant('bailout', 1)
    expect((await t.rpc(me, 'skills_get')).bailout).toMatchObject({ owned: true, used: false, ready: false })
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    await t.sql(`select private.money_add($1, $2, 'test')`, [id, -(cash - 100)])
    const doc = await t.rpc(me, 'skills_get')
    expect(doc.bailout.ready).toBe(true)
    const paid = await t.rpc(me, 'bailout_claim', { p_request_id: rid() })
    expect(paid.paid_cents).toBe(doc.bailout.cents)
    expect(paid.bailout).toMatchObject({ used: true, ready: false })
    expect(await t.sql(`select 1 from game.feed where kind = 'bailout'`)).toHaveLength(1)
    await t.sql(`select private.money_add($1, $2, 'test')`, [id, -(paid.paid_cents)])
    await expect(t.rpc(me, 'bailout_claim', { p_request_id: rid() })).rejects.toThrow('not_ready')
    await t.assertLedgerMatches()
  })
})
