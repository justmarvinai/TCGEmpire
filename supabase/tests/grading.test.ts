import { beforeEach, describe, expect, it } from 'vitest'
import { config } from '../../content/config.ts'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const HOLO = 'pkm-base-010' // Nidoking
const RARE = 'pkm-base-007' // Bibor
let t: TestDb
let me: string
let id: string

/** A hit with known quality values (centering, corners, edges, surface). */
const copy = async (card: string, q: [number, number, number, number], owner = id) =>
  (
    await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, $2, $3, $4, $5, $6, private.now()) returning id`,
      [owner, card, ...q],
    )
  )[0]!.id
const cash = async (player = id) => Number((await t.sql<{ c: string }>(`select cash_cents as c from game.players where id = $1`, [player]))[0]!.c)
const value = async (fn: string, ...args: unknown[]) =>
  Number((await t.sql<{ v: string }>(`select ${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) as v`, args))[0]!.v)
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(value)])
/** Graders that never slip: PSA and CGC give the worst value, BGS sub-grades equal the values. */
const exact = () => {
  const g = structuredClone(config['grading.graders']) as Record<string, Record<string, unknown>>
  Object.assign(g.psa!, { down_pct: 0, up_pct: 0 })
  Object.assign(g.cgc!, { down_pct: 0, up_pct: 0 })
  Object.assign(g.bgs!, { half_down_pct: 0, half_up_pct: 0 })
  return override('grading.graders', g)
}
const submit = (copies: string[], grader = 'psa', service = 'economy') =>
  t.rpc(me, 'grading_submit', { p_request_id: rid(), p_copies: copies, p_grader: grader, p_service: service })
const revealAll = async () => {
  const doc = await t.rpc(me, 'grading_get')
  return t.rpc(me, 'grading_reveal', { p_request_id: rid(), p_orders: doc.orders.map((o) => o.id) })
}

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Grader')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 13 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
})

describe('Vorprüfung', () => {
  it('shows stable ranges around the hidden values, narrowed by tools; bulk cards become copies', async () => {
    const c = await copy(HOLO, [10, 9, 6, 10])
    const a = await t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: c, p_card: null })
    expect(a.ranges!.width).toBe(3)
    const inRange = (r: [number, number], q: number) => r[1] - r[0] === a.ranges!.width && r[0] <= q && q <= r[1] && r[0] >= 1 && r[1] <= 10
    expect(inRange(a.ranges!.centering, 10) && inRange(a.ranges!.corners, 9) && inRange(a.ranges!.edges, 6) && inRange(a.ranges!.surface, 10)).toBe(true)
    const again = await t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: c, p_card: null })
    expect(again.ranges).toEqual(a.ranges)

    // Mikroskop (two tool levels): width 1.
    await t.sql(`insert into game.modifiers (player_id, source, stat, op, value) values ($1, 'upgrade:pruefwerkzeug', 'pregrade_skill', 'flat', 2)`, [id])
    const sharp = await t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: c, p_card: null })
    expect(sharp.ranges!.width).toBe(1)
    expect(sharp.ranges!.edges[0] <= 6 && 6 <= sharp.ranges!.edges[1]).toBe(true)

    // One card of a bulk stack becomes a copy with quality values of its own.
    await t.sql(`select private.stack_add($1, $2, 3)`, [id, RARE])
    const bulk = await t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: null, p_card: RARE })
    expect(bulk.card_id).toBe(RARE)
    expect(await t.sql(`select qty from game.card_stacks where player_id = $1 and card_id = $2`, [id, RARE])).toEqual([{ qty: 2 }])
    expect((await t.rpc(me, 'grading_get')).copies.map((x) => x.copy_id)).toContain(bulk.copy_id)
    await expect(t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: null, p_card: HOLO })).rejects.toThrow('invalid_request')

    await t.sql(`update game.players set level = 12 where id = $1`, [id])
    await expect(t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: c, p_card: null })).rejects.toThrow('locked')
  })
})

describe('Einsenden and Ergebnis', () => {
  it('charges per card, keeps the slots, waits, then turns the copies into slabs in the Pop Report', async () => {
    await exact()
    const copies = [await copy(HOLO, [10, 10, 10, 10]), await copy(HOLO, [9, 10, 10, 10]), await copy(HOLO, [10, 10, 7, 10]), await copy(HOLO, [8, 8, 8, 8])]
    await expect(submit(copies)).rejects.toThrow('no_slots')
    await expect(submit([copies[0]!], 'psa', 'overnight')).rejects.toThrow('invalid_request')

    const before = await cash()
    const res = await submit(copies.slice(0, 3))
    expect(res.fee_cents).toBe(3 * 360_00)
    expect(before - (await cash())).toBe(3 * 360_00)
    expect(res.grading.used).toBe(3)
    expect(res.grading.copies.map((c) => c.copy_id)).toEqual([copies[3]])
    // At the grader the cards cannot be sold or traded.
    await expect(t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: HOLO, p_copy: copies[0], p_qty: 1, p_price: 100 })).rejects.toThrow()

    const orders = res.grading.orders.map((o) => o.id)
    await expect(t.rpc(me, 'grading_reveal', { p_request_id: rid(), p_orders: orders })).rejects.toThrow('not_ready')
    await t.advance('361 minutes')
    await t.tick()
    expect(await t.sql(`select data from game.notifications where player_id = $1 and kind = 'grading_back'`, [id])).toEqual([{ data: { n: 3 } }])

    const req = rid()
    const out = await t.rpc(me, 'grading_reveal', { p_request_id: req, p_orders: orders })
    expect(out.results.map((r) => r.slab.grade).sort()).toEqual([10, 7, 9].sort())
    expect(out.results.every((r) => r.slab.grader === 'psa' && /^\d{8}$/.test(r.slab.cert_no))).toBe(true)
    expect(new Set(out.results.map((r) => r.slab.cert_no)).size).toBe(3)
    expect(out.grading.used).toBe(0)
    expect(out.grading.slabs).toHaveLength(3)
    // Replaying the same request returns the same answer and rolls nothing new.
    const replay = await t.rpc(me, 'grading_reveal', { p_request_id: req, p_orders: orders })
    expect(replay.results).toEqual(out.results)

    const pop = await t.rpc(me, 'pop_report_get', { p_card: HOLO })
    expect(pop.rows.map((r) => [r.grader, r.grade, r.n])).toEqual([['psa', 10, 1], ['psa', 9, 1], ['psa', 7, 1]])
    expect(pop.mine).toBe(3)
    const ten = out.results.find((r) => r.slab.grade === 10)!
    expect(ten.slab).toMatchObject({ pop: 1, pop_higher: 0 })
    expect(out.results.find((r) => r.slab.grade === 9)!.slab).toMatchObject({ pop: 1, pop_higher: 1 })
    expect(await t.sql(`select data ->> 'grade' as g from game.feed where kind = 'slab'`)).toEqual([{ g: '10.0' }])
    await t.assertLedgerMatches()
  })

  it('values slabs by grade, population and brand; BGS gives sub-grades and the Black Label', async () => {
    await exact()
    const raw = await value('private.card_value', HOLO)
    const [bl, gem, cgc] = [await copy(HOLO, [10, 10, 10, 10]), await copy(HOLO, [10, 10, 10, 9]), await copy(HOLO, [10, 9, 10, 10])]
    await submit([bl, gem], 'bgs', 'express')
    await submit([cgc], 'cgc', 'express')
    await t.advance('16 minutes')
    const out = await revealAll()
    const by = (c: string) => out.results.find((r) => r.copy_id === c)!

    expect(by(bl).slab).toMatchObject({ grader: 'bgs', grade: 10, black_label: true, subgrades: [10, 10, 10, 10] })
    expect(by(bl).slab.cert_no).toMatch(/^0\d{9}$/)
    // Black Label ×20, the first 10 of this card at BGS: pop factor 1 + 1.5 × 5 / (5 + 1), BGS brand 0.95.
    expect(by(bl).value_cents).toBe(Math.round(raw * 20 * (1 + (1.5 * 5) / 6) * 0.95))
    expect(by(gem).slab).toMatchObject({ grade: 9.5, black_label: false, subgrades: [10, 10, 10, 9] })
    expect(by(gem).value_cents).toBe(Math.round(raw * 4 * 0.95))
    expect(by(cgc).slab).toMatchObject({ grader: 'cgc', grade: 9, subgrades: null })
    expect(by(cgc).slab.cert_no).toMatch(/^3\d{9}$/)
    expect(by(cgc).value_cents).toBe(Math.round(raw * 2.2 * 0.85))

    // A second 10 at BGS lowers what every BGS 10 of the card is worth.
    const second = await copy(HOLO, [10, 10, 10, 10])
    await submit([second], 'bgs', 'express')
    await t.advance('16 minutes')
    await revealAll()
    expect(await value('private.copy_value', bl)).toBe(Math.round(raw * 20 * (1 + (1.5 * 5) / 7) * 0.95))
    expect((await t.rpc(me, 'grading_get')).slabs.find((s) => s.copy_id === bl)!.slab).toMatchObject({ pop: 2, pop_higher: 0 })
  })

  it('adds the upcharge above the threshold and cannot be paid without the money', async () => {
    await t.sql(`delete from game.prices where item_id = $1`, [HOLO])
    await t.sql(`update game.card_defs set value_base_cents = 2000000 where id = $1`, [HOLO]) // 20.000 €
    const c = await copy(HOLO, [10, 10, 10, 10])
    const doc = await t.rpc(me, 'grading_get')
    expect(doc.copies[0]!.upcharge_cents).toEqual({ psa: 30000, bgs: 20000, cgc: 10000 }) // 3/2/1 % of 10.000 € above
    const res = await submit([c], 'psa', 'standard')
    expect(res.fee_cents).toBe(700_00 + 300_00)

    const poor = await t.player('Pleite')
    const pid = await t.playerId(poor)
    await t.sql(`update game.players set level = 13 where id = $1`, [pid])
    const p = await copy(HOLO, [9, 9, 9, 9], pid)
    await expect(t.rpc(poor, 'grading_submit', { p_request_id: rid(), p_copies: [p], p_grader: 'psa', p_service: 'express' })).rejects.toThrow('insufficient_funds')
    expect(await t.sql(`select location from game.card_copies where id = $1`, [p])).toEqual([{ location: 'inventory' }])
    await expect(submit([p])).rejects.toThrow('not_owned') // someone else's card
    await t.assertLedgerMatches()
  })
})

describe('Slabs afterwards', () => {
  it('cracks back to raw (sometimes with a nicked corner) and can be graded again', async () => {
    await exact()
    await override('grading.crack_damage_pct', 100)
    const c = await copy(HOLO, [10, 10, 10, 10])
    await submit([c], 'cgc', 'express')
    await t.advance('11 minutes')
    await revealAll()
    await t.rpc(me, 'grading_inspect', { p_request_id: rid(), p_copy: c, p_card: null }).catch((e: Error) => expect(e.message).toContain('not_owned'))

    const cracked = await t.rpc(me, 'slab_crack', { p_request_id: rid(), p_copy: c })
    expect(cracked.damaged).toBe(true)
    expect(await t.sql(`select grader, grade, cert_no, q_corners from game.card_copies where id = $1`, [c])).toEqual([
      { grader: null, grade: null, cert_no: null, q_corners: 9 },
    ])
    expect((await t.rpc(me, 'pop_report_get', { p_card: HOLO })).rows).toHaveLength(1) // cracked slabs stay in the Pop Report
    await expect(t.rpc(me, 'slab_crack', { p_request_id: rid(), p_copy: c })).rejects.toThrow('not_owned')

    await submit([c], 'psa', 'express')
    await t.advance('21 minutes')
    expect((await revealAll()).results[0]!.slab).toMatchObject({ grader: 'psa', grade: 9 })
  })

  it('counts slabs at their value in net worth, binder, trades and the market', async () => {
    await exact()
    const c = await copy(HOLO, [10, 10, 10, 10])
    const raw = await value('private.card_value', HOLO)
    const worthBefore = await value('private.net_worth', id)
    await submit([c], 'psa', 'express')
    await t.advance('21 minutes')
    const slab = (await revealAll()).results[0]!
    expect(await value('private.net_worth', id)).toBe(worthBefore - 1600_00 + slab.value_cents - raw)

    const binder = await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })
    const card = binder.cards.find((x) => x.card_id === HOLO)!
    expect(card.copies).toEqual([])
    expect(card.slabs).toEqual([expect.objectContaining({ copy_id: c, value_cents: slab.value_cents })])

    const other = await t.player('Kumpel')
    const oid = await t.playerId(other)
    await t.sql(`update game.players set level = 13 where id = $1`, [oid])
    const quote = await t.rpc(me, 'trade_quote', {
      p_to: oid,
      p_give: { money_cents: 0, items: [{ kind: 'copy', item_id: HOLO, copy_id: c, qty: 1 }] },
      p_take: { money_cents: 0, items: [] },
    })
    expect(quote.give_cents).toBe(slab.value_cents)
    const inv = await t.rpc(other, 'trade_inventory', { p_player: id })
    expect(inv.items.find((i) => i.copy_id === c)).toMatchObject({ value_cents: slab.value_cents, slab: { grade: 10 } })

    // A raw buy order (Gesuch) never takes the slab.
    await t.sql(`update game.players set level = 13 where true`)
    const order = (await t.sql<{ id: number }>(
      `insert into game.buy_orders (buyer_id, item_kind, item_id, qty, price_cents, created_at)
       values ($1, 'card', $2, 1, 100, private.now()) returning id`, [oid, HOLO],
    ))[0]!.id
    await expect(t.rpc(me, 'order_fill', { p_request_id: rid(), p_order: order, p_qty: 1 })).rejects.toThrow('not_owned')

    // A collector NPC buys a slab listed well below its slab value, not below its raw value.
    const price = Math.round(slab.value_cents * 0.5)
    const market = await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: HOLO, p_copy: c, p_qty: 1, p_price: price })
    expect(market.mine.listings[0]).toMatchObject({ slab: { grade: 10 }, value_cents: slab.value_cents })
    const npc = (await t.sql<{ id: string }>(`select id from game.npcs where archetype = 'collector' limit 1`))[0]!.id
    await t.sql(`update game.npcs set budget_cents = 100000000000 where id = $1`, [npc])
    await t.sql(`select private.npc_buy_cheap($1, array['card', 'copy'], 85, 5)`, [npc])
    expect(await t.sql(`select slab from game.sales_log where item_id = $1`, [HOLO])).toEqual([{ slab: 'PSA 10' }])
    expect(await t.sql(`select 1 from game.card_copies where id = $1`, [c])).toHaveLength(0) // NPCs keep what they buy
    await t.assertLedgerMatches()
  })
})

describe('Vitrine and Master Set', () => {
  it('shows chosen hits and slabs on the profile, keeps them out of trade and limits the places', async () => {
    const [a, b, c, d] = [await copy(HOLO, [9, 9, 9, 9]), await copy(HOLO, [8, 9, 9, 9]), await copy(HOLO, [7, 9, 9, 9]), await copy(HOLO, [6, 9, 9, 9])]
    await expect(t.rpc(me, 'vitrine_set', { p_request_id: rid(), p_copies: [a, b, c, d] })).rejects.toThrow('no_slots')
    const set = await t.rpc(me, 'vitrine_set', { p_request_id: rid(), p_copies: [c, a] })
    expect(set.vitrine.map((v) => v.copy_id)).toEqual([c, a])

    const friend = await t.player('Besuch')
    const seen = await t.rpc(friend, 'profile_get', { p_player: id })
    expect(seen).toMatchObject({ name: 'Grader', me: false, slots: 3, unlocked: true })
    expect(seen.vitrine.map((v) => v.copy_id)).toEqual([c, a])
    await expect(t.rpc(me, 'grading_submit', { p_request_id: rid(), p_copies: [a], p_grader: 'psa', p_service: 'economy' })).rejects.toThrow('not_owned')

    await t.rpc(me, 'vitrine_set', { p_request_id: rid(), p_copies: [] })
    expect((await t.rpc(me, 'profile_get', { p_player: null })).vitrine).toEqual([])
    expect(await t.sql(`select count(*)::int as n from game.card_copies where owner_id = $1 and location = 'inventory'`, [id])).toEqual([{ n: 4 }])
  })

  it('completes the Master Set with slabs of 9 or better, however they came', async () => {
    const hits = (await t.sql<{ id: string }>(
      `select id from game.card_defs where set_id = 'riftbound-origins' and tier in ('holo', 'alternative', 'ultra', 'grail') order by id`,
    )).map((r) => r.id)
    const goal = async () => (await t.rpc(me, 'goals_get')).goals.find((g) => g.key === 'master-riftbound-origins')!
    const slab = (card: string, grade: number) =>
      t.sql(`insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at, grader, grade, cert_no)
             values ($1, $2, 9, 9, 9, 9, private.now(), 'psa', $3, private.cert_next('psa'))`, [id, card, grade])
    for (const h of hits.slice(1)) await slab(h, 9)
    await slab(hits[0]!, 8)
    expect(await goal()).toMatchObject({ total: hits.length, have: hits.length - 1, done_at: null })
    expect((await t.rpc(me, 'grading_get')).slots).toBe(3)

    // A 10 bought from a friend counts as well.
    const friend = await t.player('Verkäufer')
    const fid = await t.playerId(friend)
    const ten = (await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at, grader, grade, cert_no)
       values ($1, $2, 10, 10, 10, 10, private.now(), 'psa', 10, private.cert_next('psa')) returning id`, [fid, hits[0]],
    ))[0]!.id
    await t.sql(`select private.item_give($1, 'copy', $2, $3, 1)`, [id, hits[0], ten])
    expect((await goal()).done_at).not.toBeNull()
    expect((await t.rpc(me, 'grading_get')).slots).toBe(5)
  })
})

describe('Grading minijobs', () => {
  it('a good Praktikum round sharpens the Lupe for a while; a good Echt-oder-Fake round flags fake ads', async () => {
    await t.sql(`update game.players set level = 24 where id = $1`, [id])
    const play = async (game: string, score: number) => {
      const run = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: game })
      await t.advance('45 seconds')
      return t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: run.run_id, p_score: score, p_bottles: 0 })
    }
    // A great round above the cap is paid the cap.
    expect((await play('fake', 1_200_00)).payout_cents).toBe(1_100_00)
    expect((await play('praktikum', 500_00)).buff).toBe(false)
    expect((await t.rpc(me, 'grading_get')).width).toBe(3)
    expect((await play('praktikum', 800_00)).buff).toBe(true)
    expect((await t.rpc(me, 'grading_get')).width).toBe(2)
    expect((await t.rpc(me, 'me_get')).player!.buffs.map((b) => b.key)).toContain('mj_praktikum')
    await t.advance('181 minutes')
    expect((await t.rpc(me, 'grading_get')).width).toBe(3)

    const npc = (await t.sql<{ id: string }>(`select id from game.npcs limit 1`))[0]!.id
    await t.sql(`insert into game.ads (npc_id, seller_idx, style, item_kind, item_id, qty, ask_cents, min_cents, risk, created_at, expires_at)
                 values ($1, 0, 'attic', 'card', $2, 1, 1000, 500, 'fake', private.now(), private.now() + interval '1 day')`, [npc, HOLO])
    const fake = async () => (await t.rpc(me, 'ads_get')).board.find((a) => a.item_id === HOLO)!.suspicious
    await t.advance('181 minutes') // the buff from the great round above is over
    expect(await fake()).toBe(false)
    await play('fake', 700_00)
    expect(await fake()).toBe(true)
  })
})
