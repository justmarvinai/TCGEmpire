import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'
import { cardValues, packEv, PRODUCTS, SETS } from '../../content/catalog.ts'

// 0.0.5 Empiremon: house sets (kiosk only, no licence, always in print, the house odds).
const E = 'booster-emp1'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(value)])
const open = async (product: string, qty = 10) => {
  await t.sql(`select private.sealed_add($1, $2, $3)`, [id, product, qty])
  const res = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: product, p_qty: qty })
  return res.packs.map((p) => p.cards)
}

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.17)`)
  me = await t.player('Sammler')
  id = await t.playerId(me)
  await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
})

describe('Empiremon catalog', () => {
  it('has five house sets of 15-30 cards: 2 Grail, 3 Ultra, the rest Common', async () => {
    const rows = await t.sql<{ id: string; house: boolean; phase: string; n: number; grail: number; ultra: number; common: number }>(
      `select s.id, s.house, s.phase, count(*)::int as n,
              count(*) filter (where c.tier = 'grail')::int as grail, count(*) filter (where c.tier = 'ultra')::int as ultra,
              count(*) filter (where c.tier = 'common')::int as common
       from game.set_defs s join game.card_defs c on c.set_id = s.id where s.game = 'empiremon' group by s.id order by s.id`)
    expect(rows).toHaveLength(5)
    for (const r of rows) {
      expect(r).toMatchObject({ house: true, phase: 'print', grail: 2, ultra: 3, common: r.n - 5 })
      expect(r.n).toBeGreaterThanOrEqual(15)
      expect(r.n).toBeLessThanOrEqual(30)
    }
  })

  it('calibrates every booster of every set to 72 % of its price; Empiremon hits are worth far more', () => {
    for (const set of SETS) {
      const product = PRODUCTS.find((p) => p.set === set.id && p.kind === 'booster')!
      const values = cardValues(set)
      const ev = packEv(product, set, (c) => values.get(c.id)!) / product.priceBaseCents
      expect(ev).toBeGreaterThan(0.69)
      expect(ev).toBeLessThan(0.75)
    }
    const top = (setId: string, tier: string) =>
      Math.max(...SETS.find((s) => s.id === setId)!.cards.filter((c) => c.tier === tier).map((c) => cardValues(SETS.find((s) => s.id === setId)!).get(c.id)!))
    expect(top('empiremon-1', 'grail')).toBeGreaterThan(20 * top('pokemon-base', 'grail'))
    expect(top('empiremon-1', 'common')).toBeLessThan(top('pokemon-base', 'common'))
  })
})

describe('Empiremon at the kiosk', () => {
  it('sells without a licence, at twice the price of a normal booster', async () => {
    const shop = await t.rpc(me, 'shop_get')
    const k = shop.kiosk.find((x) => x.product_id === E)!
    expect(k.price_cents).toBe(2 * shop.kiosk.find((x) => x.product_id === 'booster-pkm-base')!.price_cents)
    const res = await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: E, p_qty: 5 })
    expect(res.bought).toBe(5)
    await t.assertLedgerMatches()
  })

  it('is no licence and no starter game', async () => {
    await expect(t.rpc(me, 'license_buy', { p_request_id: rid(), p_game: 'empiremon' })).rejects.toThrow('invalid_request')
    const fresh = await t.player('Neuling', 'geheim123', null)
    await expect(t.rpc(fresh, 'starter_pick', { p_request_id: rid(), p_game: 'empiremon' })).rejects.toThrow('invalid_request')
    expect((await t.rpc(fresh, 'starter_pick', { p_request_id: rid(), p_game: 'yugioh' })).licenses.owned).toEqual(['yugioh'])
  })

  it('never leaves print', async () => {
    const admin = (await t.sql<{ username: string }>(`select username from game.players order by created_at limit 1`))[0]!.username
    expect(admin).toBe('Sammler') // the first account is the admin
    await expect(t.rpc(me, 'admin_set_phase', { p_request_id: rid(), p_set: 'empiremon-1', p_phase: 'oop' })).rejects.toThrow('invalid_request')
    await expect(t.sql(`update game.set_defs set phase = 'last_wave' where id = 'empiremon-2'`)).rejects.toThrow('invalid_request')
    expect((await t.rpc(me, 'admin_set_phase', { p_request_id: rid(), p_set: 'pokemon-base', p_phase: 'last_wave' })).sets).toBeDefined()
  })

  it('is not sold anywhere else: no Pack Battles, no NPC classifieds', async () => {
    await t.sql(`update game.players set level = 30 where id = $1`, [id])
    const lobby = await t.rpc(me, 'battles_get')
    expect(lobby.boosters.some((b) => b.product_id.startsWith('booster-emp'))).toBe(false)
    await expect(
      t.rpc(me, 'battle_create', { p_request_id: rid(), p_mode: 'klassisch', p_product: E, p_packs: 1, p_seats: 2 }),
    ).rejects.toThrow('invalid_request')
    await override('ads.sealed_pct', 100)
    for (let i = 0; i < 40; i++) await t.sql(`select private.ad_create_npc()`)
    const [ads] = await t.sql<{ house: number; all: number }>(
      `select count(*) filter (where item_id like 'booster-emp%')::int as house, count(*)::int as "all" from game.ads where item_kind = 'sealed'`)
    expect(ads).toEqual({ house: 0, all: 40 })
  })
})

describe('Empiremon boosters', () => {
  it('hold 4 Commons and a hit slot that is a Common, Ultra or Grail, all different', async () => {
    for (const cards of await open(E)) {
      expect(cards).toHaveLength(5)
      expect(new Set(cards.map((c) => c.card_id)).size).toBe(5)
      expect(cards.slice(0, 4).every((c) => c.tier === 'common')).toBe(true)
      expect(['common', 'ultra', 'grail']).toContain(cards[4]!.tier)
    }
  })

  it('roll the house odds, not the normal ones, and have no God Pack or Doppel-Hit', async () => {
    await override('pack.god_pack_ppm', 1_000_000)
    await override('pack.double_hit_ppm', 1_000_000)
    for (const cards of await open(E)) expect(cards.map((c) => c.tier)).toEqual(['common', 'common', 'common', 'common', 'common'])
    await override('pack.house_hit_odds_ppm', { ultra: 0, grail: 1_000_000 })
    for (const cards of await open(E, 3)) expect(cards[4]!.tier).toBe('grail')
    // the normal odds still roll for the licensed games (God Pack forced above: only hits)
    for (const cards of await open('booster-pkm-base', 2)) expect(cards.every((c) => ['holo', 'alternative', 'ultra', 'grail'].includes(c.tier))).toBe(true)
  })

  it('do not count towards Pechvogel', async () => {
    await t.sql(`insert into game.pity (player_id, set_id, dry) values ($1, 'empiremon-1', 20), ($1, 'pokemon-base', 20)`, [id])
    const [row] = await t.sql<{ n: number }>(`select coalesce(sum(total), 0)::int as n from game.counters where player_id = $1 and event = 'pechvogel'`, [id])
    expect(row!.n).toBe(1)
  })
})
