import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const buy = (key: string) => t.rpc(me, 'cosmetic_buy', { p_request_id: rid(), p_key: key })
const equip = (kind: string, key: string | null) => t.rpc(me, 'cosmetic_equip', { p_request_id: rid(), p_kind: kind, p_key: key })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Schnösel')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 20 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
})

describe('Stil', () => {
  it('buys once, equips per kind, and friends see name colour, frame and picture', async () => {
    const cash = Number((await t.sql<{ c: string }>(`select cash_cents as c from game.players where id = $1`, [id]))[0]!.c)
    const doc = await buy('nc-gold')
    expect(doc.owned).toEqual(['nc-gold'])
    expect(cash - doc.player!.cash_cents).toBe(10_000_00)
    await expect(buy('nc-gold')).rejects.toThrow('already_owned')
    await expect(buy('nc-holo')).rejects.toThrow('locked') // level 35
    await expect(equip('name_color', 'nc-pink')).rejects.toThrow('not_owned')
    await expect(equip('frame', 'nc-gold')).rejects.toThrow('not_owned') // wrong kind
    await expect(equip('title', 'nc-gold')).rejects.toThrow('invalid_request')
    expect((await equip('name_color', 'nc-gold')).style).toEqual({ name_color: 'nc-gold' })
    await buy('fr-double')
    await equip('frame', 'fr-double')

    // The picture: only a card the player owns.
    await expect(t.rpc(me, 'avatar_set', { p_request_id: rid(), p_card: 'pkm-base-090' })).rejects.toThrow('not_owned')
    await t.sql(`select private.stack_add($1, 'pkm-base-058', 1)`, [id])
    expect((await t.rpc(me, 'avatar_set', { p_request_id: rid(), p_card: 'pkm-base-058' })).avatar_card).toBe('pkm-base-058')

    const friend = await t.player('Kumpel')
    const look = { name_color: 'nc-gold', frame: 'fr-double', avatar_card: 'pkm-base-058' }
    expect((await t.rpc(friend, 'players_get')).players.find((p) => p.name === 'Schnösel')!.look).toEqual(look)
    expect((await t.rpc(friend, 'profile_get', { p_player: id })).look).toEqual(look)
    await t.rpc(me, 'chat_send', { p_request_id: rid(), p_body: 'Glänzt, oder?', p_item: null })
    expect((await t.rpc(friend, 'chat_get')).messages.at(-1)!.look).toEqual(look)

    expect((await equip('name_color', null)).style).toEqual({ frame: 'fr-double' })
    await t.assertLedgerMatches()
  })

  it('bought titles join the selectable titles; a reset takes everything', async () => {
    await buy('ti-neureich')
    expect((await t.rpc(me, 'stats_get')).titles).toContain('Neureich')
    await t.rpc(me, 'title_set', { p_request_id: rid(), p_title: 'Neureich' })
    await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'Schnösel' })
    const doc = await t.rpc(me, 'cosmetics_get')
    expect(doc).toMatchObject({ owned: [], style: {}, avatar_card: null })
    expect((await t.rpc(me, 'stats_get')).titles).not.toContain('Neureich')
  })

  it('is locked below level 5', async () => {
    await t.sql(`update game.players set level = 4 where id = $1`, [id])
    await expect(buy('nc-mint')).rejects.toThrow('locked')
  })
})
