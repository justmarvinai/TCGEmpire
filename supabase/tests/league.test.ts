import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string
let aid: string
let bid: string

const grant = (player: string, cents: number) => t.sql(`select private.money_add($1, $2, 'admin_grant')`, [player, cents])
const list = (who: string, l: string, npcs = false) => t.rpc(who, 'toplist_get', { p_list: l, p_npcs: npcs })

beforeEach(async () => {
  t = await createTestDb()
  a = await t.player('Anna')
  b = await t.player('Bernd')
  aid = await t.playerId(a)
  bid = await t.playerId(b)
  await t.sql(`update game.players set level = 20 where true`)
})

describe('Toplisten', () => {
  it('remembers the best pull and lists Ruf, Bester Pull and Pechvogel', async () => {
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 3)`, [aid])
    await t.rpc(a, 'pack_open', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 3 })
    const best = (await t.sql<{ card: string; cents: string }>(`select best_pull_card as card, best_pull_cents as cents from game.players where id = $1`, [aid]))[0]!
    const max = Number((await t.sql<{ v: string }>(
      `select max(private.card_value(c)) as v from unnest((select array_agg(card_id) from (
         select card_id from game.card_stacks where player_id = $1 union all select card_id from game.card_copies where owner_id = $1) x)) c`, [aid]))[0]!.v)
    expect(Number(best.cents)).toBe(max)
    const pulls = await list(b, 'best_pull')
    expect(pulls.rows[0]).toMatchObject({ name: 'Anna', card_id: best.card, value: max })
    expect(pulls.npcs).toBe(false) // players only

    const ruf = await list(a, 'ruf', true)
    expect(ruf.rows.some((r) => r.kind === 'npc')).toBe(true)
    await t.sql(`insert into game.counters (player_id, event, total) values ($1, 'pechvogel', 2)`, [bid])
    expect((await list(a, 'pechvogel')).rows[0]).toMatchObject({ name: 'Bernd', value: 2 })
    await expect(list(a, 'gibtsnicht')).rejects.toThrow('invalid_request')
  })
})

describe('Wochenwertung', () => {
  it('measures growth since Monday, ignores gifts between players and rewards the podium', async () => {
    await t.tick() // opens the week for both
    expect(await t.sql(`select count(*)::int as n from game.league where week = private.week_start()`)).toEqual([{ n: 2 }])

    // Anna earns 1.000 €; Bernd only gets a gift from Anna. Neither the gift nor its tax moves the ranking.
    await grant(aid, 1_000_00)
    await t.sql(`update game.players set level = 20 where true`)
    await t.sql(`update game.players set created_at = created_at - interval '2 hours'`)
    await t.rpc(a, 'gift_send', { p_request_id: rid(), p_to: bid, p_goods: { money_cents: 300_00, items: [] } })
    const live = await list(a, 'league')
    const anna = live.rows.find((r) => r.name === 'Anna')!
    const bernd = live.rows.find((r) => r.name === 'Bernd')!
    expect(bernd.value).toBe(0)
    expect(anna.value).toBeGreaterThan(0)
    expect(anna.rank).toBe(1)

    // Next Monday: closed, ranked, rewarded.
    await t.advance('8 days')
    await t.tick()
    const rows = await t.sql<{ name: string; rank: number }>(
      `select p.username as name, l.rank from game.league l join game.players p on p.id = l.player_id where l.final_bps is not null order by l.rank`)
    expect(rows).toEqual([{ name: 'Anna', rank: 1 }, { name: 'Bernd', rank: 2 }])
    expect(await t.sql(`select data ->> 'boosters' as n from game.notifications where player_id = $1 and kind = 'league_done'`, [aid])).toEqual([{ n: '3' }])
    expect(await t.sql(`select qty from game.sealed where player_id = $1`, [aid])).toEqual([{ qty: 3 }])
    expect(await t.sql(`select 1 from game.feed where kind = 'league'`)).toHaveLength(1)
    expect((await t.rpc(b, 'profile_get', { p_player: aid })).trophies).toMatchObject({ gold: 1, silver: 0, bronze: 0 })
    expect((await t.rpc(a, 'profile_get', { p_player: bid })).trophies).toMatchObject({ gold: 0, silver: 1 })
    // The new week is open, and a second tick pays nothing twice.
    await t.tick()
    expect(await t.sql(`select qty from game.sealed where player_id = $1`, [aid])).toEqual([{ qty: 3 }])
    expect(await t.sql(`select count(*)::int as n from game.league where week = private.week_start()`)).toEqual([{ n: 2 }])
    await t.assertLedgerMatches()
  })
})
