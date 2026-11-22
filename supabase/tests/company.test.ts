import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'
import type { CompanyDoc } from '../../src/lib/schemas.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'rot', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = () => num(`select cash_cents as v from game.players where id = $1`, [id])
const companyCash = () => num(`select cash_cents as v from game.companies where owner_id = $1 and closed_at is null`, [id])
const get = () => t.rpc(me, 'company_get')
const act = <N extends Parameters<TestDb['rpc']>[1]>(fn: N, args: Record<string, unknown> = {}) => t.rpc(me, fn, { p_request_id: rid(), ...args })

/** Gewerbeanmeldung, Passierschein A38 and the founding. */
async function found(name = 'Gradinator') {
  await act('company_found_step', { p_step: 'antrag' })
  await t.advance('11 minutes')
  await act('company_found_step', { p_step: 'a38' })
  return act('company_found', { p_name: name, p_slogan: 'Wir graden alles. Fast.', p_label: LABEL })
}

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Chef')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 30 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
})

describe('Gewerbeanmeldung and founding', () => {
  it('needs level 30, the fee, the waiting time and the Passierschein before the company exists', async () => {
    await t.sql(`update game.players set level = 29 where id = $1`, [id])
    await expect(act('company_found_step', { p_step: 'antrag' })).rejects.toThrow('locked')
    await t.sql(`update game.players set level = 30 where id = $1`, [id])
    const before = await cash()
    const doc = await act('company_found_step', { p_step: 'antrag' })
    expect(doc.founding).toMatchObject({ step: 1 })
    expect(before - (await cash())).toBe(doc.found_fee_cents)
    await expect(act('company_found_step', { p_step: 'a38' })).rejects.toThrow('not_ready')
    await expect(act('company_found', { p_name: 'Zu früh', p_slogan: '', p_label: LABEL })).rejects.toThrow('not_ready')
    await t.advance('11 minutes')
    expect((await act('company_found_step', { p_step: 'a38' })).founding).toMatchObject({ step: 2 })

    await expect(act('company_found', { p_name: 'X', p_slogan: '', p_label: LABEL })).rejects.toThrow('invalid_request')
    await expect(act('company_found', { p_name: 'Gradinator', p_slogan: '', p_label: { ...LABEL, bg: 'neon' } })).rejects.toThrow('invalid_request')
    const mid = await cash()
    const founded = await act('company_found', { p_name: 'Gradinator', p_slogan: 'Wir graden alles. Fast.', p_label: LABEL })
    expect(mid - (await cash())).toBe(founded.found_cost_cents)
    expect(founded.company).toMatchObject({ name: 'Gradinator', stage: 1, cash_cents: 0, staff_cap: 2, services: ['economy'] })
    expect(founded.company!.applicants).toHaveLength(4)
    expect(founded.company!.prices.economy).toBeGreaterThan(0)
    await expect(act('company_found_step', { p_step: 'antrag' })).rejects.toThrow('already_owned')
    expect(await t.sql(`select 1 from game.feed where kind = 'company_founded'`)).toHaveLength(1)
    await t.assertLedgerMatches()
  })

  it('company names are unique among open companies', async () => {
    await found()
    const other = await t.player('Konkurrenz')
    const otherId = await t.playerId(other)
    await t.sql(`update game.players set level = 30 where id = $1`, [otherId])
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [otherId])
    await t.rpc(other, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
    await t.advance('11 minutes')
    await t.rpc(other, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
    await expect(t.rpc(other, 'company_found', { p_request_id: rid(), p_name: 'gradinator', p_slogan: '', p_label: LABEL })).rejects.toThrow('name_taken')
  })
})

describe('Running the company', () => {
  it('money goes in for free and comes out with Kapitalertragsteuer', async () => {
    await found()
    const before = await cash()
    await act('company_money', { p_cents: 1_000_000, p_payout: false })
    expect(before - (await cash())).toBe(1_000_000)
    expect(await companyCash()).toBe(1_000_000)
    await act('company_money', { p_cents: 400_000, p_payout: true })
    expect((await cash()) - (before - 1_000_000)).toBe(300_000)
    expect(await companyCash()).toBe(600_000)
    await expect(act('company_money', { p_cents: 700_000, p_payout: true })).rejects.toThrow('company_broke')
    await t.assertLedgerMatches()
  })

  it('hires from the applicants, staffs the stations, earns money in cycles and gets reviews', async () => {
    let doc: CompanyDoc = await found()
    await act('company_money', { p_cents: 5_000_000, p_payout: false })
    const [a, b, c] = doc.company!.applicants
    await act('company_hire', { p_applicant: a!.id, p_station: 'pruefung' })
    doc = await act('company_hire', { p_applicant: b!.id, p_station: 'slabbing' })
    await expect(act('company_hire', { p_applicant: c!.id, p_station: 'versand' })).rejects.toThrow('no_slots')
    expect(doc.company!.staff).toHaveLength(2)
    expect(doc.company!.applicants).toHaveLength(2)
    expect(doc.company!.caps.pruefung).toBeGreaterThan(doc.company!.caps.annahme / 5)

    const startCash = await companyCash()
    await t.advance('2 hours')
    await t.tick()
    doc = await get()
    const co = doc.company!
    expect(co.orders_total).toBeGreaterThan(10)
    expect(co.days[0]!.revenue_cents).toBeGreaterThan(0)
    expect(co.days[0]!.costs_cents).toBeGreaterThan(0)
    expect(co.cash_cents).not.toBe(startCash)
    // what the company did: never more than the slowest station allows
    expect(co.orders_total).toBeLessThanOrEqual(Math.ceil(co.capacity * 2.05))
    await t.advance('20 hours')
    await t.tick()
    expect((await get()).company!.reviews.length).toBeGreaterThan(0)
  })

  it('equipment, prices, staff actions and the next stage', async () => {
    let doc: CompanyDoc = await found()
    await act('company_money', { p_cents: 90_000_000, p_payout: false })
    const capBefore = doc.company!.caps.slabbing
    doc = await act('company_equipment_buy', { p_station: 'slabbing' })
    expect(doc.company!.caps.slabbing).toBeGreaterThan(capBefore)
    doc = await act('company_equipment_buy', { p_station: 'slabbing' })
    await expect(act('company_equipment_buy', { p_station: 'slabbing' })).rejects.toThrow('upgrade_max') // stage 1: level 2 at most

    const fair = doc.company!.demand.services.economy!.fair_cents
    doc = await act('company_prices_set', { p_prices: { economy: fair * 3 } })
    expect(doc.company!.demand.services.economy!.price_factor).toBeLessThan(0.5)
    expect(doc.company!.hakt.some((h) => h.key === 'preis')).toBe(true)
    await expect(act('company_prices_set', { p_prices: { gold: 100 } })).rejects.toThrow('invalid_request')

    const person = doc.company!.applicants[0]!
    doc = await act('company_hire', { p_applicant: person.id, p_station: 'annahme' })
    const staff = doc.company!.staff[0]!
    doc = await act('company_staff_act', { p_staff: staff.id, p_action: 'train', p_arg: 'accuracy' })
    expect(doc.company!.staff[0]!.accuracy).toBe(Math.min(100, staff.accuracy + 8))
    doc = await act('company_staff_act', { p_staff: staff.id, p_action: 'raise', p_arg: null })
    expect(doc.company!.staff[0]!.wage_cents).toBeGreaterThan(staff.wage_cents)
    doc = await act('company_staff_act', { p_staff: staff.id, p_action: 'move', p_arg: 'versand' })
    expect(doc.company!.staff[0]!.station).toBe('versand')
    doc = await act('company_staff_act', { p_staff: staff.id, p_action: 'fire', p_arg: null })
    expect(doc.company!.staff).toHaveLength(0)

    doc = await act('company_stage_up')
    expect(doc.company).toMatchObject({ stage: 1, stage_pending: 2 })
    await t.advance('31 minutes')
    doc = await get()
    expect(doc.company).toMatchObject({ stage: 2, stage_pending: null, staff_cap: 4, services: ['economy', 'standard'] })
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'company_stage'`, [id])).toHaveLength(1)
  })

  it('without money the staff stay at home, and the company counts in the net worth', async () => {
    const doc = await found()
    const hired = (await act('company_hire', { p_applicant: doc.company!.applicants[0]!.id, p_station: 'pruefung' })).company!.staff[0]!
    expect((await get()).company!.hakt[0]!.key).toBe('kasse')
    await t.advance('3 hours')
    await t.tick()
    // the owner worked alone, the unpaid one lost loyalty
    expect((await get()).company!.staff[0]!.loyalty).toBeLessThan(hired.loyalty)
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'company_broke'`, [id])).toHaveLength(1)
    const worth = await num(`select private.net_worth($1) as v`, [id])
    await act('company_money', { p_cents: 1_000_000, p_payout: false })
    expect(await num(`select private.net_worth($1) as v`, [id])).toBe(worth)
  })

  it('a reset closes the company', async () => {
    await found()
    await t.sql(`update game.players set reset_at = now() where id = $1`, [id])
    expect((await get()).company).toBeNull()
  })
})
