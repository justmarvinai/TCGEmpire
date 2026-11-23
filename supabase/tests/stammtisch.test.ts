import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const H = 'pkm-base-090' // Glurak
const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string
let aid: string
let bid: string

const say = (browser: string, body: string, item: string | null = null) =>
  t.rpc(browser, 'chat_send', { p_request_id: rid(), p_body: body, p_item: item })
const feed = async (kind: string) => (await t.sql<{ data: Record<string, unknown> }>(`select data from game.feed where kind = $1 order by id`, [kind])).map((r) => r.data)

beforeEach(async () => {
  t = await createTestDb()
  // this file is not about the fair-play limits (fair_play.test.ts is): prices and gifts as the tests need them
  await t.setConfig({ 'market.player_min_pct': 0, 'market.player_max_pct': 1_000_000 })
  a = await t.player('Anna')
  b = await t.player('Bert')
  aid = await t.playerId(a)
  bid = await t.playerId(b)
})

describe('Stammtisch', () => {
  it('posts messages with optional links and counts unread ones in sync', async () => {
    const first = await say(a, '  Moin zusammen  ')
    expect(first.messages.at(-1)).toMatchObject({ name: 'Anna', me: true, body: 'Moin zusammen', item_id: null })
    expect(first.online.map((o) => o.name)).toContain('Anna')
    const seen = first.messages.at(-1)!.id

    await say(b, 'Guck mal', H)
    await say(b, 'Na?')
    await say(a, 'Ja doch') // own messages are never unread
    const list = await t.rpc(a, 'chat_get')
    expect(list.messages.map((m) => m.body)).toEqual(['Moin zusammen', 'Guck mal', 'Na?', 'Ja doch'])
    expect(list.messages[1]).toMatchObject({ name: 'Bert', me: false, item_id: H })

    const sync = await t.rpc(a, 'sync', { p_after_notification: 0, p_after_feed: 0, p_after_chat: seen })
    expect(sync.chat_unread).toBe(2)
    expect(sync.chat_last_id).toBe(list.messages.at(-1)!.id)
    expect((await t.rpc(a, 'sync', { p_after_notification: 0, p_after_feed: 0, p_after_chat: 0 })).chat_unread).toBe(0)

    // An item alone is fine; nothing at all, too long or an unknown item is not.
    await say(a, '', H)
    await expect(say(a, '   ')).rejects.toThrow('invalid_request')
    await expect(say(a, 'x'.repeat(281))).rejects.toThrow('invalid_request')
    await expect(say(a, 'Hä', 'gibts-nicht')).rejects.toThrow('invalid_request')

    // Deleted accounts keep their words, not their name.
    await t.rpc(b, 'account_delete', { p_request_id: rid(), p_confirm: 'Bert' })
    expect((await t.rpc(a, 'chat_get')).messages[1]).toMatchObject({ name: null, me: false, body: 'Guck mal' })
  })

  it('keeps only the newest messages', async () => {
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('chat.keep', '3'::jsonb, now())`)
    for (const m of ['1', '2', '3', '4', '5']) await say(a, m)
    expect((await t.rpc(a, 'chat_get')).messages.map((m) => m.body)).toEqual(['3', '4', '5'])
  })
})

describe('KARTEN-BILD market headlines', () => {
  it('reports big Cardmarket deals with a player on one side', async () => {
    await t.sql(`update game.players set level = 10 where true`)
    await t.sql(`select private.money_add($1, 1000000, 'test')`, [bid])
    const copy = (await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, $2, 7, 7, 7, 7, private.now()) returning id`, [aid, H]))[0]!.id
    await t.rpc(a, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: H, p_copy: copy, p_qty: 1, p_price: 150_00 })
    const cheap = (await t.rpc(b, 'cardmarket_item', { p_item: H })).listings.find((l) => l.price_cents === 150_00)!
    await t.rpc(b, 'listing_buy', { p_request_id: rid(), p_listing: cheap.id, p_qty: 1 })
    expect(await feed('big_deal')).toEqual([])

    const copy2 = (await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, $2, 7, 7, 7, 7, private.now()) returning id`, [aid, H]))[0]!.id
    await t.rpc(a, 'listing_create', { p_request_id: rid(), p_kind: 'copy', p_item: H, p_copy: copy2, p_qty: 1, p_price: 4000_00 })
    const big = (await t.rpc(b, 'cardmarket_item', { p_item: H })).listings.find((l) => l.price_cents === 4000_00)!
    await t.rpc(b, 'listing_buy', { p_request_id: rid(), p_listing: big.id, p_qty: 1 })
    expect(await feed('big_deal')).toEqual([{ buyer: 'Bert', seller: 'Anna', item_id: H, qty: 1, cents: 4000_00 }])
  })

  it('names the day’s biggest mover once per direction', async () => {
    await t.sql(`select private.tick_market()`)
    await t.sql(`update game.prices set day = private.today(), day_open_cents = value_cents where true`)
    await t.sql(`select private.tick_headlines()`)
    expect(await feed('price_move')).toEqual([]) // nothing moved

    const other = (await t.sql<{ item_id: string }>(
      `select item_id from game.prices where item_id <> $1 and value_cents >= 500 order by value_cents desc limit 1`, [H]))[0]!.item_id
    await t.sql(`update game.prices set value_cents = round(day_open_cents * 1.16) where item_id = $1`, [H])
    await t.sql(`update game.prices set value_cents = round(day_open_cents * 0.80) where item_id = $1`, [other])
    await t.sql(`select private.tick_headlines()`)
    await t.sql(`select private.tick_headlines()`)
    expect(await feed('price_move')).toEqual([
      { dir: 'up', item_id: H, pct: 16 },
      { dir: 'down', item_id: other, pct: -20 },
    ])
  })
})
