import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = () => num(`select cash_cents as v from game.players where id = $1`, [id])
const stat = (s: string) => num(`select private.stat($1, $2, 0) as v`, [id, s])
const buyHome = (tier: number) => t.rpc(me, 'home_buy', { p_request_id: rid(), p_tier: tier })
const buyItem = (key: string) => t.rpc(me, 'furniture_buy', { p_request_id: rid(), p_key: key })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Mieter')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 30 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
})

describe('Wohnen', () => {
  it('moves up the ladder, sells the old home for half and applies the home bonuses', async () => {
    expect((await t.rpc(me, 'housing_get')).tier).toBe(0)
    const before = await cash()
    const wg = await buyHome(1)
    expect(wg).toMatchObject({ tier: 1, paid_cents: 5_000_00, wohnwert: 10 })
    expect(before - (await cash())).toBe(5_000_00)
    expect(await stat('lager_units')).toBe(10)
    expect(await stat('vitrine_slots')).toBe(1)

    // Altbau: 80.000 € minus half of the WG.
    const mid = await cash()
    await buyHome(3)
    expect(mid - (await cash())).toBe(80_000_00 - 2_500_00)
    expect(await stat('lager_units')).toBe(50)
    await expect(buyHome(2)).rejects.toThrow('invalid_request') // no way down
    await expect(buyHome(5)).rejects.toThrow('locked') // level 38
    await t.assertLedgerMatches()
  })

  it('furnishes only the slots the home has, one item per slot, with its bonus and Wohnwert', async () => {
    await t.sql(`update game.players set level = 20 where id = $1`, [id])
    await buyItem('schreibtisch_1') // the Kinderzimmer has two slots: Schreibtisch and Sofa
    expect(await stat('wage_pct')).toBe(1)
    await expect(buyItem('wand_1')).rejects.toThrow('no_slots')
    await expect(buyItem('schreibtisch_1')).rejects.toThrow('already_owned')
    await expect(buyItem('schreibtisch_3')).rejects.toThrow('locked')
    await t.sql(`update game.players set level = 32 where id = $1`, [id])
    const doc = await buyItem('schreibtisch_3')
    expect(doc.furnishings).toEqual({ schreibtisch: 'schreibtisch_3' })
    expect(await stat('wage_pct')).toBe(4) // replaced, not added
    expect(doc.wohnwert).toBe(100)

    // Net worth counts half of what home and furniture cost.
    const worth = await num(`select private.net_worth($1) as v`, [id])
    await buyHome(1)
    expect(await num(`select private.net_worth($1) as v`, [id])).toBe(worth - 5_000_00 / 2)
  })

  it('charges Nebenkosten once per day, never more than the cash', async () => {
    await buyHome(2) // 20.000 €: 100 € a day at Preisniveau 1
    expect((await t.rpc(me, 'housing_get')).nebenkosten_cents).toBe(100_00)
    await t.advance('1 day')
    await t.tick()
    await t.tick()
    const due = (await t.rpc(me, 'housing_get')).nebenkosten_cents // the Preisniveau moved overnight
    expect(await t.sql(`select sum_cents from game.ledger_daily where player_id = $1 and reason = 'nebenkosten'`, [id])).toEqual([{ sum_cents: -due }])
    expect(await t.sql(`select data from game.notifications where player_id = $1 and kind = 'nebenkosten'`, [id])).toEqual([{ data: { cents: due } }])
    await t.sql(`select private.money_add($1, -(select cash_cents from game.players where id = $1) + 30, 'test')`, [id])
    await t.advance('1 day')
    await t.tick()
    expect(await cash()).toBe(0)
    await t.assertLedgerMatches()
  })

  it('a reset moves back to Mutti', async () => {
    await buyHome(1)
    await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'Mieter' })
    expect((await t.rpc(me, 'housing_get')).tier).toBe(0)
    expect(await stat('lager_units')).toBe(0)
  })
})

describe('Besuch und Gästebuch', () => {
  it('shows the home on the profile, takes one entry per visitor and day, and lets the host delete', async () => {
    await buyHome(1)
    await buyItem('sofa_2')
    const guest = await t.player('Gast')
    const page = await t.rpc(guest, 'profile_get', { p_player: id })
    expect(page.home).toEqual({ tier: 1, wohnwert: 35, furnishings: { sofa: 'sofa_2' } })
    expect(page.signed_today).toBe(false)

    const signed = await t.rpc(guest, 'guestbook_sign', { p_request_id: rid(), p_host: id, p_body: '  Schöne Bude, schlechte Karten.  ' })
    expect(signed.guestbook).toMatchObject([{ name: 'Gast', body: 'Schöne Bude, schlechte Karten.' }])
    await expect(t.rpc(guest, 'guestbook_sign', { p_request_id: rid(), p_host: id, p_body: 'Nochmal!' })).rejects.toThrow('rate_limited')
    await expect(t.rpc(me, 'guestbook_sign', { p_request_id: rid(), p_host: id, p_body: 'Ich selbst' })).rejects.toThrow('invalid_request')
    await expect(t.rpc(guest, 'guestbook_sign', { p_request_id: rid(), p_host: id, p_body: 'x'.repeat(201) })).rejects.toThrow('invalid_request')
    expect((await t.rpc(guest, 'profile_get', { p_player: id })).signed_today).toBe(true)
    expect(await t.sql(`select data from game.notifications where player_id = $1 and kind = 'guestbook'`, [id])).toEqual([{ data: { name: 'Gast' } }])

    const entry = signed.guestbook[0]!.id
    await expect(t.rpc(guest, 'guestbook_delete', { p_request_id: rid(), p_entry: entry })).rejects.toThrow('not_found')
    expect((await t.rpc(me, 'guestbook_delete', { p_request_id: rid(), p_entry: entry })).guestbook).toEqual([])
    await t.advance('1 day')
    await t.rpc(guest, 'guestbook_sign', { p_request_id: rid(), p_host: id, p_body: 'Neuer Tag, neues Glück.' })
  })
})
