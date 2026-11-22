import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = () => num(`select cash_cents as v from game.players where id = $1`, [id])
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(value)])
const sign = (kind: string, on = true) => t.rpc(me, 'insurance_set', { p_request_id: rid(), p_kind: kind, p_on: on })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Vorsicht')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 25 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
})

describe('Versicherungen', () => {
  it('charges the first day at once, then every day, and ends without money', async () => {
    const before = await cash()
    const doc = await sign('versand')
    expect(doc.policies.find((p) => p.kind === 'versand')).toMatchObject({ active: true, premium_cents: 20_00 })
    expect(before - (await cash())).toBe(20_00)
    await expect(sign('versand')).rejects.toThrow('already_owned')
    await expect(sign('hausrat')).rejects.toThrow('locked') // no home yet

    await t.advance('1 day')
    await t.tick()
    expect(before - (await cash())).toBeGreaterThanOrEqual(40_00) // the Preisniveau may have moved
    await t.sql(`select private.money_add($1, -(select cash_cents from game.players where id = $1), 'test')`, [id])
    await t.advance('1 day')
    await t.tick()
    expect((await t.rpc(me, 'insurance_get')).policies.find((p) => p.kind === 'versand')!.active).toBe(false)
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'insurance_ended'`, [id])).toHaveLength(1)
    await t.assertLedgerMatches()
  })

  it('a lost parcel is gone for the uninsured buyer and paid back to an insured one', async () => {
    await override('insurance.lost_parcel_bps', 10000)
    const seller = await t.playerId(await t.player('Verkäufer'))
    const ship = () => t.sql(`select private.sale_ship($1, null, $2, null, 'sealed', 'booster-pkm-base', null, 1, 5000)`, [seller, id])
    await ship()
    await t.advance('1 hour')
    await t.tick()
    expect(await t.sql(`select 1 from game.sealed where player_id = $1 and qty > 0`, [id])).toHaveLength(0)
    expect(await t.sql(`select data ->> 'insured' as i from game.notifications where player_id = $1 and kind = 'parcel_lost'`, [id])).toEqual([{ i: 'false' }])
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'sale_paid'`, [seller])).toHaveLength(1) // the seller is paid anyway

    await sign('versand')
    await ship()
    await t.advance('1 hour')
    await t.tick()
    // the claim pays the price back (a new premium day may be charged in the same hour)
    expect(await t.sql(`select delta_cents::int as d from game.ledger where player_id = $1 and reason = 'insurance_claim'`, [id])).toEqual([{ d: 5000 }])
    await t.assertLedgerMatches()
  })

  it('Wasserschaden ruins a share of the bulk; Hausrat pays its value', async () => {
    await override('insurance.water_damage_pct', 100)
    await t.sql(`select private.stack_add($1, 'pkm-base-007', 10)`, [id])
    await t.rpc(me, 'home_buy', { p_request_id: rid(), p_tier: 1 })
    const value = await num(`select private.card_value('pkm-base-007') as v`)
    await sign('hausrat')
    const before = await cash()
    await t.advance('1 day')
    await t.tick()
    expect(await t.sql(`select qty from game.card_stacks where player_id = $1 and card_id = 'pkm-base-007'`, [id])).toEqual([{ qty: 9 }])
    const note = (await t.sql<{ data: { cards: number; cents: number; insured: boolean } }>(
      `select data from game.notifications where player_id = $1 and kind = 'water_damage'`, [id]))[0]!.data
    expect(note).toMatchObject({ cards: 1, insured: true })
    expect(note.cents).toBeGreaterThan(value / 2) // one card at its Marktwert of that moment
    expect(note.cents).toBeLessThan(value * 2)
    // Paid back the damage, paid the day's premiums (insurance and Nebenkosten).
    const claims = await num(`select coalesce(sum(sum_cents), 0) as v from game.ledger_daily where player_id = $1 and reason = 'insurance_claim'`, [id])
    expect(claims).toBe(note.cents)
    expect(await cash()).toBeLessThanOrEqual(before + note.cents)
    // Once per day only.
    await t.tick()
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'water_damage'`, [id])).toHaveLength(1)
    await t.assertLedgerMatches()
  })
})
