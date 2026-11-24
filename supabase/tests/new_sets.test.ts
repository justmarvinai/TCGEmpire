import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

// 0.0.9: sets 2 and 3 of the four licensed games. They start "Angekündigt" and stay out of the game until the admin
// releases them (decision 124).
const NEW = ['onepiece-op02', 'onepiece-op03', 'pokemon-fossil', 'pokemon-jungle', 'riftbound-spiritforged', 'riftbound-unleashed', 'yugioh-mrd', 'yugioh-mrl']
const rid = () => crypto.randomUUID()
let t: TestDb
let admin: string
let me: string

/** Everything of an unreleased set that NPCs, stores or classifieds offer or ask for. */
const leaked = () =>
  t.sql<{ item_id: string }>(
    `with unreleased as (
       select c.id from game.card_defs c join game.set_defs s on s.id = c.set_id where s.phase in ('announced', 'preorder')
       union all
       select d.id from game.product_defs d join game.set_defs s on s.id = d.set_id where s.phase in ('announced', 'preorder'))
     select item_id from game.listings where item_id in (select id from unreleased)
     union all select item_id from game.buy_orders where item_id in (select id from unreleased)
     union all select item_id from game.ads where item_id in (select id from unreleased)
     union all select product_id from game.store_waves where product_id in (select id from unreleased)`,
  )

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.33)`)
  admin = await t.player('Chefin') // the first account is the admin
  me = await t.player('Sammler')
  await t.sql(`update game.players set level = 40 where true`)
  await t.sql(`select private.money_add(id, 100000000, 'admin_grant') from game.players`)
  await t.sql(`select private.tick_market()`)
})

describe('sets 2 and 3', () => {
  it('are eight announced sets of 60-90 cards with 1-2 Grails, 5-6 Ultras and at least 10 Alternatives', async () => {
    const rows = await t.sql<{ id: string; phase: string; n: number; grail: number; ultra: number; alt: number }>(
      `select s.id, s.phase, count(*)::int as n, count(*) filter (where c.tier = 'grail')::int as grail,
              count(*) filter (where c.tier = 'ultra')::int as ultra, count(*) filter (where c.tier = 'alternative')::int as alt
       from game.set_defs s join game.card_defs c on c.set_id = s.id where s.id = any($1) group by s.id order by s.id`,
      [NEW],
    )
    expect(rows.map((r) => r.id)).toEqual(NEW)
    for (const r of rows) {
      expect(r.phase).toBe('announced')
      expect(r.n).toBeGreaterThanOrEqual(60)
      expect(r.n).toBeLessThanOrEqual(90)
      expect(r.grail).toBeGreaterThanOrEqual(1)
      expect(r.grail).toBeLessThanOrEqual(2)
      expect(r.ultra).toBeGreaterThanOrEqual(5)
      expect(r.ultra).toBeLessThanOrEqual(6)
      expect(r.alt).toBeGreaterThanOrEqual(10)
    }
    expect((await t.rpc(me, 'me_get')).server.unreleased).toEqual(NEW)
  })

  it('stay out of stores, kiosk, NPC traders and classifieds until the admin releases one', async () => {
    await t.sql(`update game.npcs set activity = 100 where true`)
    for (let i = 0; i < 4; i++) {
      await t.sql(`select private.tick_npcs()`)
      await t.sql(`select private.tick_ads()`)
      await t.sql(`select private.tick_stores()`)
      await t.sql(`delete from game.ads where true`) // a fresh board every round: many draws
    }
    expect(await leaked()).toEqual([])
    expect((await t.rpc(me, 'shop_get')).kiosk.map((k) => k.product_id)).not.toContain('booster-pkm-jungle')
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: 'booster-pkm-jungle', p_qty: 1 })).rejects.toThrow('product_unavailable')
    expect(await t.sql(`select private.reward_booster(id) as b from game.players`)).toEqual([{ b: 'booster-pkm-base' }, { b: 'booster-pkm-base' }])

    await t.rpc(admin, 'admin_set_phase', { p_request_id: rid(), p_set: 'pokemon-jungle', p_phase: 'print' })
    expect((await t.rpc(me, 'me_get')).server.unreleased).toEqual(NEW.filter((s) => s !== 'pokemon-jungle'))
    expect((await t.rpc(me, 'shop_get')).kiosk.map((k) => k.product_id)).toContain('booster-pkm-jungle')
    const bought = await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: 'booster-pkm-jungle', p_qty: 1 })
    expect(bought.bought).toBe(1)
    const opened = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: 'booster-pkm-jungle', p_qty: 1 })
    expect(opened.packs[0]!.cards).toHaveLength(11)
    expect(opened.packs[0]!.cards.every((c) => c.card_id.startsWith('pkm-jungle-'))).toBe(true)
    const restock = await t.rpc(admin, 'admin_restock', { p_request_id: rid(), p_store: 'mueller' })
    expect(restock.stores.find((s) => s.key === 'mueller')!.waves.map((w) => w.product_id)).toContain('booster-pkm-jungle')
    expect(await leaked()).toEqual([])
    await t.assertLedgerMatches()
  })
})
