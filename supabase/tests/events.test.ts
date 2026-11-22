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
const start = (key: string, player: string | null = null) =>
  t.sql(`select private.event_start(private.event_create($1, 'admin', $2, private.now(), null))`, [key, player])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Glückspilz')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 20, is_admin = true where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
})

describe('Event engine', () => {
  it('a Tagesereignis for the whole day and this week’s highlights, announced in the feed', async () => {
    await override('events.enabled', true)
    await override('events.random_per_hour', 0)
    await override('events.personal_per_hour', 0)
    await t.tick()
    const doc = await t.rpc(me, 'events_get')
    expect(doc.today).not.toBeNull()
    expect(doc.today!.slot).toBe('daily')
    expect(Date.parse(doc.today!.ends_at) - Date.parse(doc.today!.starts_at)).toBeGreaterThanOrEqual(23 * 3600_000)
    // the remaining highlights of the week (one per configured time still ahead), each different
    const keys = doc.upcoming.filter((e) => e.slot === 'highlight').map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(await num(`select count(*) as v from game.feed where kind = 'event_announce'`)).toBe(keys.length)
    // a second tick does not plan anything twice (it may plan next week's if the clock crosses into it)
    await t.advance('2 minutes')
    await t.tick()
    expect(await num(`select count(*) - count(distinct starts_at) as v from game.events where slot in ('highlight', 'daily')`)).toBe(0)
  })

  it('a global stat event counts for everyone and ends with its time', async () => {
    const other = await t.playerId(await t.player('Mitläufer'))
    const kiosk = await num(`select private.kiosk_price('booster-pkm-base') as v`)
    await start('kiosk_rabatt')
    expect(await num(`select private.kiosk_price('booster-pkm-base') as v`)).toBe(Math.round(kiosk * 0.8))
    await start('gluecksrausch')
    expect(await num(`select private.stat($1, 'pack_luck', 0) as v`, [other])).toBe(10)
    expect(await t.sql(`select data ->> 'key' as k from game.feed where kind = 'event' order by id`)).toEqual([{ k: 'kiosk_rabatt' }, { k: 'gluecksrausch' }])
    await t.advance('25 hours')
    expect(await num(`select private.stat($1, 'pack_luck', 0) as v`, [other])).toBe(0)
    expect(await num(`select private.kiosk_price('booster-pkm-base') as v`)).toBe(kiosk)
  })

  it('market events move hype and pressure; a restock fills the stores', async () => {
    await t.tick() // the market rows exist after the first market tick
    const hype = await t.sql<{ game: string; hype: string }>(`select game, hype from game.market order by game`)
    await start('hype_welle')
    const ev = (await t.sql<{ data: { game: string } }>(`select data from game.events order by id desc limit 1`))[0]!.data
    const before = Number(hype.find((h) => h.game === ev.game)!.hype)
    expect(await num(`select hype as v from game.market where game = $1`, [ev.game])).toBeCloseTo(Math.min(2.2, before * 1.3))
    await start('influencer')
    const card = (await t.sql<{ data: { card_id: string } }>(`select data from game.events order by id desc limit 1`))[0]!.data.card_id
    expect(await num(`select pressure as v from game.prices where item_id = $1`, [card])).toBeCloseTo(1.5)
    await t.sql(`delete from game.store_waves`)
    await start('mega_restock')
    const open = await num(`select count(*) as v from game.store_defs where jsonb_array_length(restocks) > 0 and private.store_open(key)`)
    expect(await num(`select count(distinct store) as v from game.store_waves`)).toBe(open)
  })

  it('personal events: money, cards, Pfandbons; a cost never takes more than there is', async () => {
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    await start('oma', id)
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBeGreaterThan(cash)
    const cards = await num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [id])
    await start('opas_ordner', id)
    expect(await num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [id]))
      .toBe(cards + 5)
    await start('pfandfund', id)
    expect(await num(`select pfandbons as v from game.players where id = $1`, [id])).toBe(3)
    await t.sql(`select private.money_add($1, -(select cash_cents from game.players where id = $1), 'test')`, [id])
    await start('gez', id)
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBe(0)
    expect((await t.rpc(me, 'events_get')).mine.map((e) => e.key)).toEqual(expect.arrayContaining(['oma', 'opas_ordner', 'pfandfund', 'gez']))
    expect(await num(`select count(*) as v from game.notifications where player_id = $1 and kind = 'event'`, [id])).toBe(4)
    await t.assertLedgerMatches()
  })

  it('random and personal events happen at their rate; the admin can start any event', async () => {
    await override('events.enabled', true)
    await override('events.random_per_hour', 100)
    await override('events.personal_per_hour', 100)
    await t.tick()
    await t.advance('30 minutes')
    await t.tick()
    expect(await num(`select count(*) as v from game.events where slot = 'random'`)).toBeGreaterThan(0)
    expect(await num(`select count(*) as v from game.events where slot = 'personal' and player_id = $1`, [id])).toBeGreaterThan(0)
    await t.rpc(me, 'admin_event_start', { p_request_id: rid(), p_key: 'doppel_ep', p_player: null })
    // a random personal event may add to the EP as well, so look at the global modifier itself
    expect(await num(`select value as v from game.modifiers where player_id is null and stat = 'ep' and source like 'event:%'`)).toBe(100)
    await expect(t.rpc(me, 'admin_event_start', { p_request_id: rid(), p_key: 'oma', p_player: null })).rejects.toThrow('invalid_request')
    await expect(t.rpc(me, 'admin_event_start', { p_request_id: rid(), p_key: 'gibtsnicht', p_player: null })).rejects.toThrow('invalid_request')
  })
})
