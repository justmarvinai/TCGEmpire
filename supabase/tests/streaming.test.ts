import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const emit = (event: string, n = 1) => t.sql(`select private.emit($1, $2, $3)`, [id, event, n])
const live = (on: boolean) => t.rpc(me, 'stream_set', { p_request_id: rid(), p_live: on })
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value`, [
    key,
    JSON.stringify(value),
  ])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Streamerin')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 45 where id = $1`, [id])
})

describe('Streaming', () => {
  it('only a live stream reacts: packs bring viewers, hits bring donations and Followers', async () => {
    await emit('pack_opened', 10)
    expect((await t.rpc(me, 'stream_get')).viewers).toBe(0)
    let doc = await live(true)
    expect(doc).toMatchObject({ live: true, viewers: 5, followers: 0 })
    expect(doc.sponsor).not.toBeNull()
    await emit('pack_opened', 10)
    doc = await t.rpc(me, 'stream_get')
    expect(doc.viewers).toBe(Math.floor(5 * 0.97 ** 10 + 20))
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    await emit('pulled_ultra')
    doc = await t.rpc(me, 'stream_get')
    expect(doc.today_cents).toBeGreaterThan(0)
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBe(cash + doc.today_cents)
    expect(doc.followers).toBeGreaterThan(0)
    expect(doc.viewers).toBeGreaterThan(30)
    await live(false)
    await emit('pulled_grail')
    expect((await t.rpc(me, 'stream_get')).today_cents).toBe(doc.today_cents)
    await t.assertLedgerMatches()
  })

  it('donations stop at the daily cap; an idle stream loses its audience; level 45 needed', async () => {
    await override('stream.daily_cap_minutes', 1)
    await live(true)
    await emit('pack_opened', 30)
    await emit('pulled_grail', 3)
    const doc = await t.rpc(me, 'stream_get')
    expect(doc.today_cents).toBe(doc.cap_cents)
    await t.advance('31 minutes')
    await emit('pack_opened', 1)
    expect((await t.rpc(me, 'stream_get')).viewers).toBeLessThan(doc.viewers)
    await t.sql(`update game.players set level = 44 where id = $1`, [id])
    await expect(live(true)).rejects.toThrow('locked')
  })

  it('a sponsor pays for boosters opened live; an exit keeps half the Followers', async () => {
    await override('stream.sponsors', { test: { packs: 3, rewardMinutes: 10 } })
    const doc = await live(true)
    expect(doc.sponsor).toMatchObject({ key: 'test', need: 3, done: 0 })
    await emit('pack_opened', 2)
    expect((await t.rpc(me, 'stream_get')).sponsor).toMatchObject({ done: 2 })
    await emit('pack_opened', 1)
    expect((await t.rpc(me, 'stream_get')).sponsor).toBeNull()
    expect(await num(`select coalesce(sum(delta_cents), 0) as v from game.ledger where player_id = $1 and reason = 'stream_sponsor'`, [id])).toBe(doc.sponsor!.reward_cents)
    // no new sponsor before the day's window is over, even after going live again
    await live(false)
    expect((await live(true)).sponsor).toBeNull()
    await t.advance('25 hours')
    expect((await live(true)).sponsor).toMatchObject({ key: 'test', done: 0 })
    await t.sql(`update game.streams set followers = 1001 where player_id = $1`, [id])
    await t.sql(`insert into game.prestiges (player_id, n, stars, value_cents, started_at, at) values ($1, 1, 10, 0, now(), now())`, [id])
    expect(await t.rpc(me, 'stream_get')).toMatchObject({ followers: 500, live: false })
  })
})
