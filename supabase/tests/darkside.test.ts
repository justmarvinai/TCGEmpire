import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'rot', fg: 'weiss', emblem: '183c7effff7e3c18' }
const BOOSTER = 'booster-pkm-base'
let t: TestDb
let a: string
let b: string
let aid: string
let bid: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (pid: string) => num(`select cash_cents as v from game.players where id = $1`, [pid])
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value`, [
    key,
    JSON.stringify(value),
  ])
/** Every roll succeeds (true) or is blocked (false). */
const force = async (win: boolean) => {
  await override('darkside.chance_min', win ? 100 : 0)
  await override('darkside.chance_max', win ? 100 : 0)
}
const attack = (who: string, kind: string, target: string | null, extra: Record<string, unknown> = {}) =>
  t.rpc(who, 'attack', { p_request_id: rid(), p_kind: kind, p_target: target, p_card: null, p_up: null, ...extra })
const found = async (who: string, name: string) => {
  await t.rpc(who, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
  await t.advance('11 minutes')
  await t.rpc(who, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
  return (await t.rpc(who, 'company_found', { p_request_id: rid(), p_name: name, p_slogan: '', p_label: LABEL })).company!.id
}
/** An Abwehr upgrade as the purchase leaves it: a modifier. */
const defend = (pid: string, key: string, stat: string, value: number) =>
  t.sql(`insert into game.modifiers (player_id, source, stat, op, value) values ($1, 'upgrade:' || $2, $3, 'flat', $4)`, [pid, key, stat, value])
const cards = (pid: string) =>
  num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [pid])

beforeEach(async () => {
  t = await createTestDb()
  // 10:00 in Berlin, so that the daily limits do not reset in the middle of a test
  await t.sql(
    `update game.server set clock_offset = ((date_trunc('day', now() at time zone 'Europe/Berlin') + interval '1 day 10 hours') at time zone 'Europe/Berlin') - now() where id`,
  )
  a = await t.player('Schlitzohr')
  b = await t.player('Opfer')
  aid = await t.playerId(a)
  bid = await t.playerId(b)
  await t.sql(`update game.players set level = 35 where id in ($1, $2)`, [aid, bid])
  await t.sql(`select private.money_add($1, 100000000, 'admin_grant'), private.money_add($2, 100000000, 'admin_grant')`, [aid, bid])
})

describe('Attack roll', () => {
  it('chance = base + Angriff − Abwehr within 5–85 %; Angriff from Schlitzohr skills, Abwehr from upgrades', async () => {
    const doc = await t.rpc(a, 'darkside_get')
    expect(doc.targets.map((x) => x.name)).toEqual(['Opfer'])
    expect(doc.targets[0]!.attacks.bunker).toMatchObject({ ok: false, reason: 'bunker_empty', chance: 45 })
    expect(doc.targets[0]!.attacks.finanzamt).toMatchObject({ ok: false, reason: 'no_company', chance: 50 })
    await t.sql(`insert into game.skills_owned (player_id, key, at) values ($1, 'x_str1', now()), ($1, 'x_deck1', now())`, [aid])
    await defend(bid, 'bunker_sicherheit', 'def_bunker', 50)
    const after = await t.rpc(a, 'darkside_get')
    expect(after.angriff).toBe(10)
    expect((await t.rpc(b, 'darkside_get')).abwehr.bunker).toBe(50)
    expect(after.targets[0]!.attacks.bunker.chance).toBe(5) // 45 + 10 − 50
    // newcomers below the unlock level are protected and not listed
    await t.sql(`update game.players set level = 34 where id = $1`, [bid])
    expect((await t.rpc(a, 'darkside_get')).targets).toEqual([])
    await expect(attack(a, 'bunker', bid)).rejects.toThrow('target_protected')
    await expect(attack(b, 'bunker', aid)).rejects.toThrow('locked')
  })
})

describe('Bunker knacken', () => {
  it('takes a quarter of the uncollected bunker; cooldown, two successes a day, loss cap', async () => {
    await t.rpc(b, 'bunker_get')
    await t.advance('3 hours')
    const content = (await t.rpc(b, 'bunker_get')).content_cents!
    await force(true)
    const before = await cash(aid)
    const res = await attack(a, 'bunker', bid)
    expect(res.result).toMatchObject({ kind: 'bunker', success: true, other: 'Opfer' })
    const loot = res.result.cents!
    expect(loot).toBe(Math.round(content * 0.25))
    expect(await cash(aid)).toBe(before - res.result.cost_cents + loot)
    expect(Math.abs((await t.rpc(b, 'bunker_get')).content_cents! - (content - loot))).toBeLessThanOrEqual(1)
    expect(await t.sql(`select kind from game.notifications where player_id = $1 and kind = 'attacked'`, [bid])).toHaveLength(1)
    expect(await t.sql(`select data ->> 'kind' as k from game.feed where kind = 'attack'`)).toEqual([{ k: 'bunker' }])

    await expect(attack(a, 'bunker', bid)).rejects.toThrow('attack_cooldown')
    await t.advance('61 minutes')
    await attack(a, 'bunker', bid)
    await t.advance('61 minutes')
    await expect(attack(a, 'bunker', bid)).rejects.toThrow('attack_limit')

    // the daily loss cap: attacks may take at most 10 % of the net worth without the collection
    await t.sql(`delete from game.attacks`)
    await t.advance('61 minutes')
    const left = (await t.rpc(b, 'darkside_get')).cap_left_cents
    await override('darkside.loss_cap_bps', 0)
    expect((await t.rpc(a, 'darkside_get')).targets[0]!.attacks.bunker.reason).toBe('attack_cap')
    await expect(attack(a, 'bunker', bid)).rejects.toThrow('attack_cap')
    expect(left).toBeGreaterThan(0)
    await t.assertLedgerMatches()
  })

  it('a blocked attack costs a fine, the defender gets Schadenfreude and a cheaper, better Rache', async () => {
    await t.rpc(b, 'bunker_get')
    await t.advance('3 hours')
    await force(false)
    const [ca, cb] = [await cash(aid), await cash(bid)]
    const res = await attack(a, 'bunker', bid)
    expect(res.result).toMatchObject({ success: false, fine_cents: res.result.cost_cents, joy_cents: Math.round(res.result.cost_cents / 2) })
    expect(await cash(aid)).toBe(ca - 2 * res.result.cost_cents)
    expect(await cash(bid)).toBe(cb + res.result.joy_cents!)
    expect(await t.sql(`select 1 from game.feed where kind = 'attack_blocked'`)).toHaveLength(1)
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'attack_blocked'`, [bid])).toHaveLength(1)

    await override('darkside.chance_min', 5)
    await override('darkside.chance_max', 85)
    await t.rpc(a, 'bunker_get')
    await t.advance('2 hours')
    const rache = (await t.rpc(b, 'darkside_get')).targets[0]!
    const normal = (await t.rpc(a, 'darkside_get')).targets[0]!
    expect(rache.revenge_until).not.toBeNull()
    expect(normal.revenge_until).toBeNull()
    expect(rache.attacks.bunker.chance).toBe(normal.attacks.bunker.chance + 10)
    expect(rache.attacks.bunker.cost_cents).toBe(Math.round(normal.attacks.bunker.cost_cents / 2))
    await t.advance('23 hours')
    expect((await t.rpc(b, 'darkside_get')).targets[0]!.revenge_until).toBeNull()
    await t.assertLedgerMatches()
  })
})

describe('Company attacks', () => {
  it('Finanzamt: a clean company means falsche Verdächtigung; a dirty one pays and the tipster gets 10 %', async () => {
    const company = await found(b, 'Saubermann GmbH')
    await force(true)
    const clean = await attack(a, 'finanzamt', bid)
    expect(clean.result).toMatchObject({ success: false, clean: true, company: 'Saubermann GmbH' })
    expect(clean.result.fine_cents).toBe(clean.result.cost_cents)

    await t.sql(`update game.companies set tax_evaded_cents = 100000, cash_cents = 10000000 where id = $1`, [company])
    await t.advance('61 minutes')
    const before = await cash(aid)
    const res = await attack(a, 'finanzamt', bid)
    expect(res.result.success).toBe(true)
    expect(res.result.fee_cents).toBeGreaterThanOrEqual(100000)
    expect(res.result.cents).toBe(Math.round(res.result.fee_cents! / 10))
    expect(await cash(aid)).toBe(before - res.result.cost_cents + res.result.cents!)
    expect(await num(`select tax_evaded_cents as v from game.companies where id = $1`, [company])).toBe(0)
    expect(await num(`select cash_cents as v from game.companies where id = $1`, [company])).toBe(10000000 - res.result.fee_cents!)
  })

  it('1-Stern costs Ruf and leaves a review; Abwerben takes the best employee into one’s own company', async () => {
    const company = await found(b, 'Opfer & Söhne')
    await force(true)
    const ruf = await num(`select ruf as v from game.players where id = $1`, [bid])
    await attack(a, 'bewertung', bid)
    expect(await num(`select ruf as v from game.players where id = $1`, [bid])).toBe(Math.max(0, ruf - 25))
    expect(await num(`select count(*) as v from game.company_reviews where company_id = $1 and stars = 1`, [company])).toBe(1)

    await t.advance('61 minutes')
    expect((await t.rpc(a, 'darkside_get')).targets[0]!.attacks.abwerben.reason).toBe('no_staff')
    await t.sql(
      `insert into game.company_staff (company_id, archetype, first_idx, last_idx, station, tempo, accuracy, loyalty, wage_base_cents, hired_at)
       values ($1, 'rentner', 0, 0, 'pruefung', 30, 80, 90, 1000, now()), ($1, 'praktikant', 1, 1, 'annahme', 40, 30, 50, 500, now())`,
      [company],
    )
    expect((await t.rpc(a, 'darkside_get')).targets[0]!.attacks.abwerben.reason).toBe('no_own_company')
    const mine = await found(a, 'Abwerbe AG')
    const doc = await t.rpc(a, 'darkside_get')
    expect(doc.targets[0]!.attacks.abwerben).toMatchObject({ ok: true }) // loyalty 90 adds 18 Abwehr
    await force(true)
    await attack(a, 'abwerben', bid)
    expect(await t.sql(`select company_id, loyalty, wage_base_cents from game.company_staff where archetype = 'rentner'`)).toEqual([
      { company_id: mine, loyalty: 60, wage_base_cents: 1200 },
    ])
  })
})

describe('Gerücht', () => {
  it('moves one card’s price pressure; one rumour per card; the best Faktencheck exposes it', async () => {
    await t.tick() // market rows
    const doc = await t.rpc(a, 'darkside_get')
    const card = doc.rumour.cards[0]!.card_id
    const pressure = () => num(`select pressure as v from game.prices where item_id = $1`, [card])
    const p0 = await pressure()
    await force(true)
    const res = await attack(a, 'geruecht', null, { p_card: card, p_up: true })
    expect(res.result).toMatchObject({ success: true, card_id: card, up: true })
    expect(await pressure()).toBeCloseTo(p0 * 1.15)
    expect(res.rumour.cards.find((c) => c.card_id === card)!.busy).toBe(true)
    await expect(attack(b, 'geruecht', null, { p_card: card, p_up: false })).rejects.toThrow('attack_cooldown')

    await defend(bid, 'faktencheck', 'def_geruecht', 10)
    await t.advance('61 minutes')
    const other = doc.rumour.cards[1]!.card_id
    expect((await t.rpc(a, 'darkside_get')).rumour.defender).toBe(bid)
    await force(false)
    const cb = await cash(bid)
    const blocked = await attack(a, 'geruecht', null, { p_card: other, p_up: false })
    expect(blocked.result).toMatchObject({ success: false, other: 'Opfer' })
    expect(await cash(bid)).toBe(cb + blocked.result.joy_cents!)
    await t.assertLedgerMatches()
  })
})

describe('Präparierte Booster', () => {
  it('preparing opens the packs for the preparer; in Direkthandel they pass on, the opener gets bulk or the Prüfgerät catches it', async () => {
    await t.sql(`select private.sealed_add($1, $2, 5)`, [aid, BOOSTER])
    const c0 = await cards(aid)
    const res = await t.rpc(a, 'reseal', { p_request_id: rid(), p_product: BOOSTER, p_qty: 3 })
    expect(res.prepared).toMatchObject({ qty: 3 })
    expect(await cards(aid)).toBeGreaterThan(c0)
    expect(res.resealed.stock).toEqual([expect.objectContaining({ product_id: BOOSTER, qty: 5, prepared: 3 })])
    await expect(t.rpc(a, 'reseal', { p_request_id: rid(), p_product: BOOSTER, p_qty: 3 })).rejects.toThrow('not_enough_sealed')

    // a gift of two: the prepared ones go first
    await t.advance('2 hours')
    await t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: { money_cents: 0, items: [{ kind: 'sealed', item_id: BOOSTER, qty: 2 }] } })
    expect(await t.sql(`select player_id, by_id, qty from game.sealed_marks order by player_id = $1`, [aid])).toEqual([
      { player_id: bid, by_id: aid, qty: 2 },
      { player_id: aid, by_id: aid, qty: 1 },
    ])

    // the victim opens one: bulk only, a broken deal for the preparer, a headline
    await force(true)
    const open1 = await t.rpc(b, 'pack_open', { p_request_id: rid(), p_product: BOOSTER, p_qty: 1 })
    expect(open1.packs[0]!.cards.every((c) => c.tier === 'common')).toBe(true)
    expect(await num(`select honor_broken as v from game.players where id = $1`, [aid])).toBe(1)
    expect(await t.sql(`select kind, success from game.attacks where kind = 'resealed'`)).toEqual([{ kind: 'resealed', success: true }])

    // the Prüfgerät catches the second: a real pack, the preparer pays its value
    await force(false)
    const ca = await cash(aid)
    await t.rpc(b, 'pack_open', { p_request_id: rid(), p_product: BOOSTER, p_qty: 1 })
    const value = await num(`select private.product_value($1) as v`, [BOOSTER])
    expect(await cash(aid)).toBe(ca - value)
    expect(await num(`select count(*) as v from game.sealed_marks where player_id = $1`, [bid])).toBe(0)

    // the preparer opening his own: bulk for the prepared one, normal packs for the rest
    const open3 = await t.rpc(a, 'pack_open', { p_request_id: rid(), p_product: BOOSTER, p_qty: 3 })
    expect(open3.packs.filter((p) => p.cards.every((c) => c.tier === 'common'))).toHaveLength(1)
    expect(await num(`select count(*) as v from game.sealed_marks`)).toBe(0)
    await t.assertLedgerMatches()
  })

  it('prepared boosters that leave any other way are refunded by the preparer (Käuferschutz)', async () => {
    await t.sql(`select private.sealed_add($1, $2, 3)`, [aid, BOOSTER])
    await t.rpc(a, 'reseal', { p_request_id: rid(), p_product: BOOSTER, p_qty: 2 })
    const ca = await cash(aid)
    await t.sql(`update game.sealed set qty = 1 where player_id = $1 and product_id = $2`, [aid, BOOSTER])
    const value = await num(`select private.product_value($1) as v`, [BOOSTER])
    expect(await cash(aid)).toBe(ca - value)
    expect(await t.sql(`select qty from game.sealed_marks where player_id = $1`, [aid])).toEqual([{ qty: 1 }])
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'resealed_caught'`, [aid])).toHaveLength(1)
    await t.assertLedgerMatches()
  })
})

describe('Kredit platzen lassen', () => {
  it('the borrower keeps the money at once; the lender gets Rache', async () => {
    const offer = await t.rpc(a, 'loan_offer', { p_request_id: rid(), p_to: bid, p_cents: 100000, p_interest_pct: 10, p_days: 3 })
    const loan = offer.loans.loans[0]!.id
    await t.rpc(b, 'loan_respond', { p_request_id: rid(), p_loan: loan, p_accept: true })
    await t.sql(`update game.players set level = 34 where id = $1`, [bid])
    await expect(t.rpc(b, 'loan_burst', { p_request_id: rid(), p_loan: loan })).rejects.toThrow('locked')
    await t.sql(`update game.players set level = 35 where id = $1`, [bid])
    const res = await t.rpc(b, 'loan_burst', { p_request_id: rid(), p_loan: loan })
    expect(res.loans.loans[0]).toMatchObject({ id: loan, state: 'defaulted' })
    expect(res.loans.honor.broken).toBe(1)
    await expect(t.rpc(b, 'loan_burst', { p_request_id: rid(), p_loan: loan })).rejects.toThrow('not_found')
    expect((await t.rpc(a, 'darkside_get')).targets[0]!.revenge_until).not.toBeNull()
    await t.assertLedgerMatches()
  })

  it('every write is idempotent', async () => {
    await t.tick()
    const card = (await t.rpc(a, 'darkside_get')).rumour.cards[0]!.card_id
    const id = rid()
    const first = await t.rpc(a, 'attack', { p_request_id: id, p_kind: 'geruecht', p_target: null, p_card: card, p_up: false })
    const again = await t.rpc(a, 'attack', { p_request_id: id, p_kind: 'geruecht', p_target: null, p_card: card, p_up: false })
    expect(again.result).toEqual(first.result)
    expect(await num(`select count(*) as v from game.attacks`)).toBe(1)
  })
})
