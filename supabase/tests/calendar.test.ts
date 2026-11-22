import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value`, [
    key,
    JSON.stringify(value),
  ])
/** Sets the game clock to a Berlin wall-clock time (SQL expression of type timestamp). */
const clock = (local: string) => t.sql(`update game.server set clock_offset = ((${local}) at time zone 'Europe/Berlin') - now() where id`)
const cards = () =>
  num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [id])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Weihnachtself')
  id = await t.playerId(me)
  await override('events.enabled', true)
  await override('events.random_per_hour', 0)
  await override('events.personal_per_hour', 0)
})

describe('Calendar events', () => {
  it('the Adventskalender runs from 1 to 24 December: today’s door once a day', async () => {
    await clock(`make_timestamp(extract(year from now())::int, 11, 30, 10, 0, 0)`)
    await t.tick()
    expect((await t.rpc(me, 'events_get')).advent).toBeNull()
    await expect(t.rpc(me, 'advent_open', { p_request_id: rid() })).rejects.toThrow('not_found')

    await clock(`make_timestamp(extract(year from now())::int, 12, 3, 10, 0, 0)`)
    await t.tick()
    const doc = await t.rpc(me, 'events_get')
    expect(doc.advent).toEqual({ day: 3, opened: [] })
    expect(doc.active.map((e) => e.key)).toContain('advent')
    const before = await cards()
    const res = await t.rpc(me, 'advent_open', { p_request_id: rid() })
    expect(res.advent).toEqual({ day: 3, opened: [3] })
    expect(await cards()).toBe(before + 3) // door 3: three cards
    await expect(t.rpc(me, 'advent_open', { p_request_id: rid() })).rejects.toThrow('already_done')

    await t.advance('1 day')
    await t.tick()
    const pfand = await num(`select pfandbons as v from game.players where id = $1`, [id])
    await t.sql(`update game.players set energy = 0, energy_at = private.now() where id = $1`, [id])
    await t.rpc(me, 'advent_open', { p_request_id: rid() })
    expect((await t.rpc(me, 'events_get')).advent).toEqual({ day: 4, opened: [3, 4] })
    expect(await num(`select pfandbons as v from game.players where id = $1`, [id])).toBe(pfand) // door 4 is energy
    // the season event is created once
    await t.advance('2 minutes')
    await t.tick()
    expect(await num(`select count(*) as v from game.events where key = 'advent' and player_id is null`)).toBe(1)
    await t.assertLedgerMatches()
  })

  it('every Sunday Flohmarkt-Horst puts cheap ads into the Kleinanzeigen until midnight', async () => {
    await clock(`date_trunc('week', now() at time zone 'Europe/Berlin') + interval '5 days 10 hours'`) // Saturday
    await t.tick()
    expect(await num(`select count(*) as v from game.ads where npc_id = 'horst'`)).toBe(0)
    await t.advance('1 day') // Sunday
    await t.tick()
    const ads = await t.sql<{ ask: string; value: string; until: string }>(
      `select ask_cents as ask, private.card_or_product_value(item_id) * qty as value,
              to_char(expires_at at time zone 'Europe/Berlin', 'HH24:MI') as until
       from game.ads where npc_id = 'horst'`,
    )
    expect(ads).toHaveLength(6)
    for (const a of ads) {
      expect(Number(a.ask)).toBeLessThanOrEqual(Math.max(1, Math.ceil(Number(a.value) * 0.7)))
      expect(a.until).toBe('00:00')
    }
    expect((await t.rpc(me, 'events_get')).active.map((e) => e.key)).toContain('flohmarkt')
    await t.advance('2 minutes')
    await t.tick()
    expect(await num(`select count(*) as v from game.ads where npc_id = 'horst'`)).toBe(6)
  })
})

describe('Bares für Rares', () => {
  beforeEach(async () => {
    await t.sql(`update game.players set level = 28 where id = $1`, [id])
    await t.tick() // market prices
    await t.sql(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       select $1, id, 8, 8, 8, 8, private.now() from game.card_defs where tier = 'ultra' order by id limit 2`,
      [id],
    )
  })

  it('once a day: the appraisal, three dealer bids and the 80-€ man; a deal sells the card', async () => {
    const doc = await t.rpc(me, 'bares_get')
    expect(doc.today).toBeNull()
    const copy = doc.copies[0]!
    const shown = await t.rpc(me, 'bares_appraise', { p_request_id: rid(), p_copy: copy.copy_id })
    const today = shown.today!
    expect(today.offers).toHaveLength(4)
    expect(today.offers[3]).toEqual({ dealer: null, cents: await num(`select private.eur(8000) as v`) })
    expect(today.estimate_cents).toBeGreaterThanOrEqual(Math.floor(copy.value_cents * 0.85))
    expect(today.estimate_cents).toBeLessThanOrEqual(Math.ceil(copy.value_cents * 1.25))
    for (const o of today.offers.slice(0, 3)) expect(o.cents).toBeLessThanOrEqual(copy.value_cents)
    await expect(t.rpc(me, 'bares_appraise', { p_request_id: rid(), p_copy: doc.copies[1]!.copy_id })).rejects.toThrow('already_done')

    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    const best = today.offers.reduce((b, o, i) => (o.cents > today.offers[b]!.cents ? i : b), 0)
    const deal = await t.rpc(me, 'bares_deal', { p_request_id: rid(), p_offer: best })
    expect(deal.today!.sold).toBe(best)
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBe(cash + today.offers[best]!.cents)
    expect(await num(`select count(*) as v from game.card_copies where id = $1`, [copy.copy_id])).toBe(0)
    await expect(t.rpc(me, 'bares_deal', { p_request_id: rid(), p_offer: 0 })).rejects.toThrow('not_found')
    await t.assertLedgerMatches()
  })

  it('no deal keeps the card; the next day is a new show; locked below level 28', async () => {
    const copy = (await t.rpc(me, 'bares_get')).copies[0]!
    await t.rpc(me, 'bares_appraise', { p_request_id: rid(), p_copy: copy.copy_id })
    const res = await t.rpc(me, 'bares_deal', { p_request_id: rid(), p_offer: null })
    expect(res.today!.sold).toBe(-1)
    expect(await num(`select count(*) as v from game.card_copies where id = $1`, [copy.copy_id])).toBe(1)
    await t.advance('1 day')
    expect((await t.rpc(me, 'bares_get')).today).toBeNull()
    await t.sql(`update game.players set level = 27 where id = $1`, [id])
    await expect(t.rpc(me, 'bares_appraise', { p_request_id: rid(), p_copy: copy.copy_id })).rejects.toThrow('locked')
  })
})
