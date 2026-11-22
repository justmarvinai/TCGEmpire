import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

/** Owning a card for the first time, the way pulls and purchases record it. */
const own = (card: string) =>
  t.sql(`insert into game.collection (player_id, card_id, first_at) values ($1, $2, private.now()) on conflict do nothing`, [id, card])
const goal = async (key: string) => (await t.rpc(me, 'goals_get')).goals.find((g) => g.key === key)!
const stat = async (s: string) => Number((await t.sql<{ v: string }>(`select private.stat($1, $2, 0) as v`, [id, s]))[0]!.v)

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Sammler')
  id = await t.playerId(me)
})

describe('Sammelziele', () => {
  it('counts groups, pays the bonus once and makes the news', async () => {
    for (const c of ['ygo-lob-037', 'ygo-lob-038', 'ygo-lob-039']) await own(c)
    expect(await goal('exodia')).toMatchObject({ total: 5, have: 3, done_at: null, stat: 'pack_luck', op: 'flat', value: 5 })
    await own('ygo-lob-040')
    await own('ygo-lob-079') // the alt-art head counts too
    expect((await goal('exodia')).done_at).not.toBeNull()
    expect(await stat('pack_luck')).toBe(5)
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'goal_done'`, [id])).toHaveLength(1)
    expect(await t.sql(`select data from game.feed where kind = 'goal'`)).toEqual([{ data: { name: 'Sammler', goal: 'exodia' } }])

    // Selling or owning the other head later changes nothing.
    await own('ygo-lob-084')
    await t.sql(`delete from game.collection where player_id = $1 and card_id = 'ygo-lob-037'`, [id])
    expect(await stat('pack_luck')).toBe(5)
  })

  it('derives set goals from the set lists and starts over on a reset', async () => {
    const holos = await goal('holos-riftbound-origins')
    expect(holos.total).toBe(12)
    expect((await goal('set-pokemon-base')).total).toBe(90)
    for (const c of ['rb-ogn-018', 'rb-ogn-035', 'rb-ogn-047', 'rb-ogn-058', 'rb-ogn-067', 'rb-ogn-075']) await own(c)
    expect((await goal('runes')).done_at).not.toBeNull()
    expect(await stat('lager_units')).toBe(4)

    // A real pull records the card through the same table.
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 1)`, [id])
    await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 1 })
    expect((await goal('set-pokemon-base')).have).toBeGreaterThanOrEqual(8)

    await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'Sammler' })
    expect((await goal('runes'))).toMatchObject({ have: 0, done_at: null })
    expect(await stat('lager_units')).toBe(0)
  })
})
