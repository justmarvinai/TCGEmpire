import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (pid: string) => num(`select cash_cents as v from game.players where id = $1`, [pid])

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Bonze')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 70 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 100000000000, 'admin_grant')`, [id])
})

describe('Luxus', () => {
  it('buys an item once for a tiny permanent bonus; the level of the item counts; it has its own toplist', async () => {
    const doc = await t.rpc(me, 'luxury_get', { p_player: null })
    const price = doc.prices!.golf!
    const before = await cash(id)
    const res = await t.rpc(me, 'luxury_buy', { p_request_id: rid(), p_key: 'golf' })
    expect(res.owned.map((o) => o.key)).toEqual(['golf'])
    expect(await cash(id)).toBe(before - price)
    expect(await num(`select private.stat($1, 'wage_pct', 0) as v`, [id])).toBe(1)
    await expect(t.rpc(me, 'luxury_buy', { p_request_id: rid(), p_key: 'golf' })).rejects.toThrow('already_owned')
    await expect(t.rpc(me, 'luxury_buy', { p_request_id: rid(), p_key: 'lambo' })).rejects.toThrow('locked') // level 80
    const other = await t.player('Neider')
    const seen = await t.rpc(other, 'luxury_get', { p_player: id })
    expect(seen).toMatchObject({ owned: [{ key: 'golf' }], paid_cents: price, prices: null })
    const top = await t.rpc(me, 'toplist_get', { p_list: 'luxus', p_npcs: false })
    expect(top.rows[0]).toMatchObject({ name: 'Bonze', value: price })
    await t.assertLedgerMatches()
  })
})

describe('Megaprojekte', () => {
  it('donations fill one project after another; reaching the goal gives everyone the bonus', async () => {
    const doc = await t.rpc(me, 'megaprojects_get')
    expect(doc.active).toBe('ber')
    const goal = doc.projects[0]!.goal_cents
    await expect(t.rpc(me, 'megaproject_donate', { p_request_id: rid(), p_cents: doc.min_cents - 1 })).rejects.toThrow('invalid_request')
    let res = await t.rpc(me, 'megaproject_donate', { p_request_id: rid(), p_cents: goal - 100 })
    expect(res.projects[0]).toMatchObject({ donated_cents: goal - 100, mine_cents: goal - 100, done_at: null, donors: [{ name: 'Bonze' }] })
    const other = await t.playerId(await t.player('Mitläufer'))
    expect(await num(`select private.stat($1, 'wage_pct', 0) as v`, [other])).toBe(0)
    res = await t.rpc(me, 'megaproject_donate', { p_request_id: rid(), p_cents: doc.min_cents })
    expect(res.projects[0]!.done_at).not.toBeNull()
    expect(res.active).toBe('s21')
    expect(await num(`select private.stat($1, 'wage_pct', 0) as v`, [other])).toBe(2)
    expect(await t.sql(`select data ->> 'key' as k from game.feed where kind = 'megaproject_done'`)).toEqual([{ k: 'ber' }])
    await t.sql(`update game.players set level = 60 where id = $1`, [id])
    await expect(t.rpc(me, 'megaproject_donate', { p_request_id: rid(), p_cents: doc.min_cents })).rejects.toThrow('locked')
    await t.assertLedgerMatches()
  })
})

describe('Museum', () => {
  it('the admin starts an auction; bids are held, the outbid get their money back, late bids extend; the winner gets the trophy', async () => {
    await t.sql(`update game.players set is_admin = true where id = $1`, [id])
    const rival = await t.player('Rivale')
    const rid2 = await t.playerId(rival)
    await t.sql(`update game.players set level = 65 where id = $1`, [rid2])
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [rid2])
    await t.rpc(me, 'admin_museum_start', { p_request_id: rid(), p_key: 'illustrator', p_start_cents: 1000000, p_hours: 2 })
    await expect(t.rpc(me, 'admin_museum_start', { p_request_id: rid(), p_key: 'illustrator', p_start_cents: 1000000, p_hours: 2 })).rejects.toThrow(
      'invalid_request',
    )
    const doc = await t.rpc(me, 'megaprojects_get')
    const auction = doc.auctions[0]!
    expect(doc.trophies_left).not.toContain('illustrator')
    await expect(t.rpc(rival, 'museum_bid', { p_request_id: rid(), p_auction: auction.id, p_cents: 999999 })).rejects.toThrow('bid_too_low')
    const before = await cash(rid2)
    await t.rpc(rival, 'museum_bid', { p_request_id: rid(), p_auction: auction.id, p_cents: 1000000 })
    expect(await cash(rid2)).toBe(before - 1000000)
    await expect(t.rpc(rival, 'museum_bid', { p_request_id: rid(), p_auction: auction.id, p_cents: 2000000 })).rejects.toThrow('already_done')
    await expect(t.rpc(me, 'museum_bid', { p_request_id: rid(), p_auction: auction.id, p_cents: 1040000 })).rejects.toThrow('bid_too_low')
    await t.advance('118 minutes') // a bid in the last minutes extends the end
    await t.rpc(me, 'museum_bid', { p_request_id: rid(), p_auction: auction.id, p_cents: 1050000 })
    expect(await cash(rid2)).toBe(before) // refunded
    await t.advance('3 minutes')
    await t.tick()
    expect(await num(`select count(*) as v from game.trophies`)).toBe(0) // extended by 5 minutes
    await t.advance('3 minutes')
    await t.tick()
    const hall = (await t.rpc(me, 'megaprojects_get')).hall
    expect(hall).toEqual([expect.objectContaining({ key: 'illustrator', owner: 'Bonze', paid_cents: 1050000 })])
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'museum_outbid'`, [rid2])).toHaveLength(1)
    await t.assertLedgerMatches()
  })
})
