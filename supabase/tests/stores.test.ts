import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const B = 'booster-pkm-base'
const D = 'display-pkm-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string

const num = async (query: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(query, params))[0]!.v)
/** Puts the server clock at a Berlin wall-clock time. */
const at = (berlin: string) => t.sql(`update game.server set clock_offset = ($1::timestamp at time zone 'Europe/Berlin') - now() where id`, [berlin])
const buy = (browser: string, store: string, qty: number, product = B) =>
  t.rpc(browser, 'retail_buy', { p_request_id: rid(), p_store: store, p_product: product, p_qty: qty })
const sealed = async (browser: string) =>
  t.sql<{ product_id: string; qty: number }>(`select product_id, qty from game.sealed where player_id = $1 and qty > 0 order by product_id`, [await t.playerId(browser)])

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.33)`)
  a = await t.player('Frühaufsteher')
  b = await t.player('Langschläfer')
  await t.sql(`update game.players set level = 12 where true`)
  await t.sql(`select private.money_add(id, 10000000, 'test') from game.players`)
  await t.sql(`update game.npcs set activity = 0 where true`)
  await at('2026-11-24 10:05') // a Tuesday
  await t.sql(`select private.tick_npcs()`) // budgets
})

describe('retail stores', () => {
  it('restocks Müller at 10:00 with shared stock; Sven grabs his share; limits per wave; sold out', async () => {
    await t.sql(`select private.tick_stores()`)
    const total = 4 * 2 // stock per player x active players (at least two)
    expect(await num(`select qty_total as v from game.store_waves where store = 'mueller'`)).toBe(total)
    expect(await num(`select qty_left as v from game.store_waves where store = 'mueller'`)).toBe(total - 3) // 30 % for Sven
    expect(await num(`select qty as v from game.npc_stock where npc_id = 'sven' and item_id = $1`, [B])).toBe(3)
    expect(await num(`select count(*) as v from game.store_waves where store = 'smyths'`)).toBe(0) // 14:00 not yet

    await buy(a, 'mueller', 2)
    await expect(buy(a, 'mueller', 1)).rejects.toThrow('store_limit')
    await buy(b, 'mueller', 2)
    expect(await num(`select qty_left as v from game.store_waves where store = 'mueller'`)).toBe(1)
    await expect(buy(b, 'mueller', 1)).rejects.toThrow('store_limit')
    await t.sql(`update game.players set level = 12 where true`)
    const c = await t.player('Nachzügler')
    await t.sql(`update game.players set level = 12 where true`)
    await t.sql(`select private.money_add(id, 10000000, 'test') from game.players where username = 'Nachzügler'`)
    await expect(buy(c, 'mueller', 2)).rejects.toThrow('sold_out')

    // 16:00: a new wave, a fresh limit.
    await at('2026-11-24 16:01')
    await t.sql(`select private.tick_stores()`)
    await buy(a, 'mueller', 2)
    // Sunday: closed, no restock.
    await at('2026-11-29 10:30')
    await expect(buy(a, 'mueller', 1)).rejects.toThrow('store_closed')
    await t.assertLedgerMatches()
  })

  it('keeps a weekly allocation at the Würfelbude that grows with Ruf; displays from level 18', async () => {
    const shop = await t.rpc(a, 'shop_get')
    const wb = shop.stores.find((s) => s.key === 'wuerfelbude')!
    expect(wb.offers.find((o) => o.product_id === B)).toMatchObject({ limit: 6 + 5, bought: 0, left: null })
    await buy(a, 'wuerfelbude', 11)
    await expect(buy(a, 'wuerfelbude', 1)).rejects.toThrow('store_limit')
    await expect(buy(a, 'wuerfelbude', 1, D)).rejects.toThrow('locked')
    await at('2026-12-01 10:00') // next week
    await buy(a, 'wuerfelbude', 1)
  })

  it('respects the Lager, unboxes displays and never opens them as packs', async () => {
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('lager.base_units', '40'::jsonb, now())`)
    await t.sql(`update game.players set level = 18 where true`)
    await buy(a, 'wuerfelbude', 1, D)
    const res = await t.rpc(a, 'display_unbox', { p_request_id: rid(), p_product: D })
    expect(res.boosters).toBe(36)
    expect(await sealed(a)).toEqual([{ product_id: B, qty: 36 }])
    await expect(t.rpc(a, 'display_unbox', { p_request_id: rid(), p_product: D })).rejects.toThrow('not_enough_sealed')

    await expect(t.rpc(a, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 5 })).rejects.toThrow('lager_full') // 41 > 40
    await t.rpc(a, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 }) // 37
    await buy(a, 'wuerfelbude', 3) // 40
    await expect(buy(a, 'wuerfelbude', 1)).rejects.toThrow('lager_full')

    await t.sql(`select private.sealed_add($1, $2, 1)`, [await t.playerId(a), D])
    await expect(t.rpc(a, 'pack_open', { p_request_id: rid(), p_product: D, p_qty: 1 })).rejects.toThrow('invalid_request')
    const shop = await t.rpc(a, 'shop_get')
    expect(shop.lager).toMatchObject({ used: 41, cap: 40, unlock_level: 18 })
    expect(shop.kiosk.map((k) => k.product_id)).toEqual([B]) // the Kiosk sells boosters only
  })
})
