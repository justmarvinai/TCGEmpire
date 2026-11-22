import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const cash = async () => (await t.rpc(me, 'me_get')).player!.cash_cents
const buyKiosk = (product: string) => t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: product, p_qty: 1 })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Neuling', 'geheim123', null)
  id = await t.playerId(me)
  await t.sql(`select private.money_add($1, 500000, 'test')`, [id])
})

describe('starter choice and Händlerlizenzen', () => {
  it('picks the favourite game once and sells only licensed games', async () => {
    await expect(buyKiosk('booster-pkm-base')).rejects.toThrow('no_license')
    await expect(t.rpc(me, 'starter_pick', { p_request_id: rid(), p_game: 'magic' })).rejects.toThrow('invalid_request')

    const req = rid()
    const picked = await t.rpc(me, 'starter_pick', { p_request_id: req, p_game: 'onepiece' })
    expect(picked.licenses).toMatchObject({ fav_game: 'onepiece', owned: ['onepiece'], allowed: 1, levels: [10, 20, 28] })
    expect((await t.rpc(me, 'starter_pick', { p_request_id: req, p_game: 'onepiece' })).licenses.owned).toEqual(['onepiece']) // replay
    await expect(t.rpc(me, 'starter_pick', { p_request_id: rid(), p_game: 'pokemon' })).rejects.toThrow('invalid_request')

    await buyKiosk('booster-op01')
    await expect(buyKiosk('booster-pkm-base')).rejects.toThrow('no_license')
    await t.sql(`update game.players set level = 12 where id = $1`, [id])
    await expect(
      t.rpc(me, 'retail_buy', { p_request_id: rid(), p_store: 'wuerfelbude', p_product: 'booster-ygo-lob', p_qty: 1 }),
    ).rejects.toThrow(/no_license|store_closed/)

    // Reward boosters come from the favourite game.
    await t.sql(`select private.sealed_add($1, 'reward-booster', 2)`, [id])
    const sealed = await t.sql<{ product_id: string; qty: number }>(`select product_id, qty from game.sealed where player_id = $1 order by product_id`, [id])
    expect(sealed).toEqual([{ product_id: 'booster-op01', qty: 4 }]) // Opa's, the Kiosk's and the two rewards
    await t.assertLedgerMatches()
  })

  it('opens more licences at the licence levels for a fee', async () => {
    await t.rpc(me, 'starter_pick', { p_request_id: rid(), p_game: 'pokemon' })
    await expect(t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'yugioh' })).rejects.toThrow('locked')

    await t.sql(`update game.players set level = 10 where id = $1`, [id])
    const before = await cash()
    expect((await t.rpc(me, 'licenses_get')).next_fee_cents).toBe(200_00)
    const bought = await t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'yugioh' })
    expect(bought.licenses).toMatchObject({ owned: ['pokemon', 'yugioh'], allowed: 2, next_fee_cents: 600_00 })
    expect(await cash()).toBe(before - 200_00)
    await buyKiosk('booster-ygo-lob')
    await expect(t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'riftbound' })).rejects.toThrow('locked')
    await expect(t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'yugioh' })).rejects.toThrow('invalid_request')
    expect((await t.sql(`select 1 from game.feed where kind = 'license'`))).toHaveLength(1)

    await t.sql(`update game.players set level = 28 where id = $1`, [id])
    await t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'riftbound' })
    const all = await t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'onepiece' })
    expect(all.licenses).toMatchObject({ allowed: 4, next_fee_cents: null })
    const kiosk = Number((await t.sql<{ c: string }>(`select sum(-delta_cents) as c from game.ledger where player_id = $1 and reason = 'store_buy'`, [id]))[0]!.c)
    expect(await cash()).toBe(before - 200_00 - 600_00 - 1_500_00 - kiosk)

    // A reset starts over with a new pick.
    await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'Neuling' })
    expect(await t.rpc(me, 'licenses_get')).toMatchObject({ fav_game: null, owned: [] })
    await t.assertLedgerMatches()
  })
})
