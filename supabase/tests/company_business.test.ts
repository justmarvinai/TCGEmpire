import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'rot', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let me: string
let id: string
let company: number

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const ruf = () => num(`select ruf as v from game.players where id = $1`, [id])
const companyCash = () => num(`select cash_cents as v from game.companies where id = $1`, [company])
const act = <N extends Parameters<TestDb['rpc']>[1]>(fn: N, args: Record<string, unknown> = {}) => t.rpc(me, fn, { p_request_id: rid(), ...args })
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value`, [
    key,
    JSON.stringify(value),
  ])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Unternehmer')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 30 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 500000000, 'admin_grant')`, [id])
  await act('company_found_step', { p_step: 'antrag' })
  await t.advance('11 minutes')
  await act('company_found_step', { p_step: 'a38' })
  company = (await act('company_found', { p_name: 'Grauzone GmbH', p_slogan: '', p_label: LABEL })).company!.id
  await act('company_money', { p_cents: 10_000_000, p_payout: false })
})

describe('Decisions and marketing', () => {
  it('a decision card applies the chosen effect; ignored ones apply their ignore choice', async () => {
    await t.sql(`insert into game.company_decisions (company_id, key, created_at, expires_at) values ($1, 'reklamation', private.now(), private.now() + interval '12 hours')`, [company])
    const doc = await t.rpc(me, 'company_get')
    expect(doc.company!.decision).toMatchObject({ key: 'reklamation' })
    const [cash, r] = [await companyCash(), await ruf()]
    const res = await act('company_decide', { p_decision: doc.company!.decision!.id, p_choice: 0 })
    expect(res.decided).toEqual({ key: 'reklamation', choice: 0 })
    expect(cash - (await companyCash())).toBe(300_00)
    expect(await ruf()).toBe(r + 4)
    await expect(act('company_decide', { p_decision: doc.company!.decision!.id, p_choice: 0 })).rejects.toThrow('not_found')

    await t.sql(`insert into game.company_decisions (company_id, key, created_at, expires_at) values ($1, 'schweissgeraet', private.now(), private.now() + interval '1 minute')`, [company])
    await act('company_equipment_buy', { p_station: 'slabbing' })
    await t.advance('15 minutes')
    await t.tick()
    const after = (await t.rpc(me, 'company_get')).company!
    expect(after.equipment.slabbing).toBe(0) // "Wird schon gehen" happened
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'company_decision_ignored'`, [id])).toHaveLength(1)
  })

  it('a campaign costs money and brings customers for a while; only one at a time', async () => {
    const before = (await t.rpc(me, 'company_get')).company!
    await expect(act('company_marketing', { p_key: 'youtuber' })).rejects.toThrow('invalid_request') // from the GbR on
    const doc = await act('company_marketing', { p_key: 'flyer' })
    expect(doc.company!.marketing).toMatchObject({ key: 'flyer', boost: 0.2 })
    expect(doc.company!.demand.marketing).toBe(1.2)
    expect(doc.company!.demand.total).toBeGreaterThan(before.demand.total)
    await expect(act('company_marketing', { p_key: 'flyer' })).rejects.toThrow('already_owned')
    await t.advance('25 hours')
    expect((await t.rpc(me, 'company_get')).company!.marketing).toBeNull()
  })
})

describe('Taxes', () => {
  it('the Voranmeldung: the honest number files it, a missed date costs a late fee, the Steuerberater files for a fee', async () => {
    await t.sql(`insert into game.company_days (company_id, day, orders, revenue_cents, costs_cents) values ($1, private.today() - 1, 100, 1000000, 0)`, [company])
    const doc = (await t.rpc(me, 'company_get')).company!
    expect(doc.tax.options).toHaveLength(3)
    expect(doc.tax.options).toContain(1_000_000)
    expect((await act('company_tax_file', { p_amount: 800_000 })).filed).toBe(false)
    const filed = await act('company_tax_file', { p_amount: 1_000_000 })
    expect(filed.filed).toBe(true)
    expect(Date.parse(filed.company!.tax.due_at) - Date.parse(doc.tax.due_at)).toBe(7 * 86400_000)

    // two weeks later without filing: late fee
    await t.advance('15 days')
    await t.sql(`insert into game.company_days (company_id, day, orders, revenue_cents, costs_cents) values ($1, private.today() - 1, 100, 2000000, 0)
                 on conflict (company_id, day) do update set revenue_cents = 2000000`, [company])
    await t.tick()
    expect(await t.sql(`select (data ->> 'cents')::int as c from game.notifications where player_id = $1 and kind = 'company_tax_late'`, [id]))
      .toEqual([{ c: 200_000 }])
    await act('company_tax_advisor')
    await expect(act('company_tax_advisor')).rejects.toThrow('already_owned')
  })
})

describe('Shady business', () => {
  it('a payout past the Finanzamt keeps the tax until the Steuerprüfung comes', async () => {
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    await act('company_shady', { p_action: 'payout', p_arg: '1000000' })
    expect((await num(`select cash_cents as v from game.players where id = $1`, [id])) - cash).toBe(1_000_000)
    expect((await t.rpc(me, 'company_get')).company!.shady.evaded_cents).toBe(250_000)
    await override('company.audit_per_hour', 100)
    const r = await ruf()
    await t.advance('20 minutes')
    await t.tick()
    expect(await t.sql(`select (data ->> 'cents')::int as c from game.notifications where player_id = $1 and kind = 'company_audit'`, [id])).toEqual([{ c: 375_000 }])
    expect((await t.rpc(me, 'company_get')).company!.shady.evaded_cents).toBe(0)
    expect(await ruf()).toBeLessThan(r)
    await t.assertLedgerMatches()
  })

  it('Schwarzarbeit lowers wages until the Zoll comes', async () => {
    const doc = (await t.rpc(me, 'company_get')).company!
    await act('company_hire', { p_applicant: doc.applicants[0]!.id, p_station: 'pruefung' })
    const wages = (await t.rpc(me, 'company_get')).company!.costs.wages
    const black = await act('company_shady', { p_action: 'schwarzarbeit', p_arg: 'on' })
    expect(black.company!.costs.wages).toBe(Math.round(wages * 0.7))
    await override('company.schwarz_check_per_hour', 100)
    await t.advance('20 minutes')
    await t.tick()
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'company_zoll'`, [id])).toHaveLength(1)
    expect((await t.rpc(me, 'company_get')).company!.shady.schwarzarbeit).toBe(false)
    expect(await t.sql(`select 1 from game.feed where kind = 'zoll'`)).toHaveLength(1)
  })

  it('a bumped friend order: the slab is one grade better, and cracking it causes a scandal', async () => {
    const fan = await t.player('Freund')
    const fanId = await t.playerId(fan)
    await t.sql(`update game.players set level = 30 where id = $1`, [fanId])
    await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [fanId])
    const copy = (
      await t.sql<{ id: string }>(
        `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
         values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), 6, 6, 6, 6, private.now()) returning id`,
        [fanId],
      )
    )[0]!.id
    const order = (await t.rpc(fan, 'company_order_submit', { p_request_id: rid(), p_copies: [copy], p_company: company, p_service: 'economy' })).grading.orders[0]!
    const doc = await act('company_shady', { p_action: 'bump', p_arg: String(order.id) })
    expect(doc.company!.player_orders[0]!.bumped).toBe(true)
    expect(doc.company!.shady.bumped).toBe(1)
    await expect(act('company_shady', { p_action: 'bump', p_arg: String(order.id) })).rejects.toThrow('not_found')
    await t.advance('7 hours')
    await t.rpc(fan, 'grading_reveal', { p_request_id: rid(), p_orders: [order.id] })
    expect(await t.sql(`select bumped from game.card_copies where id = $1`, [copy])).toEqual([{ bumped: true }])

    const brand = (await t.rpc(me, 'company_get')).company!.brand_bps
    await t.rpc(fan, 'slab_crack', { p_request_id: rid(), p_copy: copy })
    const after = (await t.rpc(me, 'company_get')).company!
    expect(after.shady.scandal_until).not.toBeNull()
    expect(after.shady.bumped).toBe(0)
    expect(after.brand_bps).toBeLessThan(brand)
    expect(await t.sql(`select data ->> 'reason' as r from game.feed where kind = 'scandal'`)).toEqual([{ r: 'crack' }])
  })

  it('Mystery-Boxen turn bulk into money at a premium, and the reviews turn sour', async () => {
    const commons = await t.sql<{ id: string }>(`select id from game.card_defs where tier = 'common' order by id limit 3`)
    for (const c of commons) await t.sql(`select private.stack_add($1, $2, 10)`, [id, c.id])
    const value = await num(`select sum(private.card_value(card_id) * qty) as v from game.card_stacks where player_id = $1`, [id])
    const cash = await companyCash()
    await act('company_shady', { p_action: 'mystery', p_arg: '30' })
    expect((await companyCash()) - cash).toBe(Math.round(value * 1.5))
    expect(await num(`select coalesce(sum(qty), 0) as v from game.card_stacks where player_id = $1`, [id])).toBe(0)
    await expect(act('company_shady', { p_action: 'mystery', p_arg: '5' })).rejects.toThrow('not_enough_cards')
    await t.advance('2 hours')
    await t.tick()
    const doc = (await t.rpc(me, 'company_get')).company!
    expect(doc.shady.mystery_sour).toBeLessThan(30)
    expect(doc.reviews.some((r) => r.stars === 1)).toBe(true)
    await t.assertLedgerMatches()
  })
})

describe('Awards and Ruf', () => {
  it('an honest company with enough orders gets the TÜV seal and Ruf', async () => {
    await t.sql(`update game.companies set orders_total = 600, equipment = '{"annahme": 2, "pruefung": 2, "slabbing": 2, "versand": 2}' where id = $1`, [company])
    // accuracy: an excellent tester at the Prüfung
    await t.sql(`insert into game.company_staff (company_id, archetype, first_idx, last_idx, station, tempo, accuracy, loyalty, wage_base_cents, hired_at)
                 values ($1, 'profi', 0, 0, 'pruefung', 90, 100, 80, 100, private.now()), ($1, 'profi', 1, 1, 'pruefung', 90, 100, 80, 100, private.now())`, [company])
    const r = await ruf()
    await t.advance('20 minutes')
    await t.tick()
    expect((await t.rpc(me, 'company_get')).company!.awards.map((a) => a.key)).toContain('tuev')
    expect(await ruf()).toBeGreaterThanOrEqual(r + 20)
    expect(await t.sql(`select data ->> 'key' as k from game.feed where kind = 'award'`)).toEqual([{ k: 'tuev' }])
  })
})
