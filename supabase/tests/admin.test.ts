import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const SET = 'pokemon-base'
const B = 'booster-pkm-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let admin: string
let user: string
let uid: string

const feed = async (kind: string) => (await t.sql<{ data: Record<string, unknown> }>(`select data from game.feed where kind = $1 order by id`, [kind])).map((r) => r.data)

beforeEach(async () => {
  t = await createTestDb()
  admin = await t.player('Chefin') // the first account is the admin
  user = await t.player('Normalo')
  uid = await t.playerId(user)
})

describe('admin console', () => {
  it('is for the admin only', async () => {
    await expect(t.rpc(user, 'admin_get')).rejects.toThrow('forbidden')
    await expect(t.rpc(user, 'admin_announce', { p_request_id: rid(), p_text: 'Ich bin der Chef' })).rejects.toThrow('forbidden')
    await expect(t.rpc(user, 'admin_grant', { p_request_id: rid(), p_player: uid, p_cents: 100 })).rejects.toThrow('forbidden')
    const doc = await t.rpc(admin, 'admin_get')
    expect(doc.sets.map((s) => s.id)).toContain(SET)
    expect(doc.players.map((p) => p.name).sort()).toEqual(['Chefin', 'Normalo'])
    expect(doc.systems.map((s) => s.name)).toContain('market')
  })

  it('moves a set out of print with a supply snapshot and back with a reprint', async () => {
    await t.sql(`select private.sealed_add($1, $2, 7)`, [uid, B])
    const oop = await t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: SET, p_phase: 'oop' })
    const set = oop.sets.find((s) => s.id === SET)!
    expect(set).toMatchObject({ phase: 'oop', sealed_at_oop: 7 })
    expect(set.oop_at).not.toBeNull()
    await expect(t.rpc(user, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 })).rejects.toThrow('product_unavailable')

    await expect(t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: SET, p_phase: 'oop' })).rejects.toThrow('invalid_request')
    await expect(t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: SET, p_phase: 'kaputt' })).rejects.toThrow('invalid_request')
    await expect(t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: 'gibts-nicht', p_phase: 'print' })).rejects.toThrow('invalid_request')

    const reprint = await t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: SET, p_phase: 'print' })
    expect(reprint.sets.find((s) => s.id === SET)).toMatchObject({ phase: 'print', sealed_at_oop: null, oop_at: null })
    expect(await feed('set_phase')).toEqual([
      { set_id: SET, phase: 'oop', reprint: false },
      { set_id: SET, phase: 'print', reprint: true },
    ])
  })

  it('restocks a store at once, changes the invite code, tunes config, grants and announces', async () => {
    const stocked = await t.rpc(admin, 'admin_restock', { p_request_id: rid(), p_store: 'mueller' })
    expect(stocked.stores.find((s) => s.key === 'mueller')!.waves[0]).toMatchObject({ product_id: B })
    expect(await feed('restock')).toEqual([{ store: 'mueller' }])
    await expect(t.rpc(admin, 'admin_restock', { p_request_id: rid(), p_store: 'kiosk' })).rejects.toThrow('invalid_request')

    await t.rpc(admin, 'admin_invite_set', { p_request_id: rid(), p_code: 'neuercode' })
    await expect(t.player('Spaet', 'geheim123')).rejects.toThrow('invite_wrong')
    await t.player('Puenktlich', 'neuercode')
    await expect(t.rpc(admin, 'admin_invite_set', { p_request_id: rid(), p_code: 'abc' })).rejects.toThrow('invite_invalid')

    await t.rpc(admin, 'admin_config_set', { p_request_id: rid(), p_key: 'market.fee_bps', p_value: 300 })
    expect(Number((await t.sql<{ v: string }>(`select private.cfg_num('market.fee_bps') as v`))[0]!.v)).toBe(300)
    await expect(t.rpc(admin, 'admin_config_set', { p_request_id: rid(), p_key: 'market.fee_bps', p_value: '"viel"' })).rejects.toThrow('invalid_request')
    await expect(t.rpc(admin, 'admin_config_set', { p_request_id: rid(), p_key: 'gibts.nicht', p_value: 1 })).rejects.toThrow('invalid_request')
    const cleared = await t.rpc(admin, 'admin_config_set', { p_request_id: rid(), p_key: 'market.fee_bps', p_value: null })
    expect(cleared.config.find((c) => c.key === 'market.fee_bps')!.override).toBeNull()

    const before = (await t.rpc(user, 'me_get')).player!.cash_cents
    const granted = await t.rpc(admin, 'admin_grant', { p_request_id: rid(), p_player: uid, p_cents: 25_00 })
    expect((await t.rpc(user, 'me_get')).player!.cash_cents).toBe(before + 25_00)
    expect(granted.economy.find((e) => e.reason === 'admin_grant')).toMatchObject({ cents: 25_00, n: 1 })
    await expect(t.rpc(admin, 'admin_grant', { p_request_id: rid(), p_player: uid, p_cents: 0 })).rejects.toThrow('invalid_request')

    await t.rpc(admin, 'admin_announce', { p_request_id: rid(), p_text: '  Freibier am Stammtisch!  ' })
    expect(await feed('announcement')).toEqual([{ text: 'Freibier am Stammtisch!' }])
    await expect(t.rpc(admin, 'admin_announce', { p_request_id: rid(), p_text: ' ' })).rejects.toThrow('invalid_request')
    await t.assertLedgerMatches()
  })
})
