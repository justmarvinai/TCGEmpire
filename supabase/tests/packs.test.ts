import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'
import { cardValues, packEv, PRODUCTS, SETS } from '../../content/catalog.ts'

const B = 'booster-pkm-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string

const cash = async (browser: string) => (await t.rpc(browser, 'me_get')).player!.cash_cents
const override = (key: string, value: unknown) =>
  t.sql(`insert into game.config_overrides (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value`, [key, JSON.stringify(value)])

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.42)`)
  me = await t.player('Sammler')
})

describe('catalog', () => {
  it('seeds every card with a calibrated value: an average booster is worth 72 % of its price', async () => {
    const [row] = await t.sql<{ n: number }>(`select count(*)::int as n from game.card_defs where set_id = 'pokemon-base'`)
    expect(row!.n).toBe(90)
    const set = SETS[0]!, product = PRODUCTS[0]!, values = cardValues(set)
    const ev = packEv(product, set, (c) => values.get(c.id)!) / product.priceBaseCents
    expect(ev).toBeGreaterThan(0.69)
    expect(ev).toBeLessThan(0.75)
  })
})

describe('kiosk', () => {
  it('sells boosters with the kiosk markup into the sealed inventory', async () => {
    const before = await cash(me)
    const res = await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 })
    expect(res.paid_cents).toBe(110_00)
    expect(res.player.cash_cents).toBe(before - 110_00)
    expect(res.player.sealed_total).toBe(1)
    const shop = await t.rpc(me, 'shop_get')
    expect(shop.kiosk.find((k) => k.product_id === B)).toMatchObject({ product_id: B, price_cents: 110_00, bought_today: 1 })
    expect(shop.sealed).toEqual([{ product_id: B, qty: 1 }])
    await t.assertLedgerMatches()
  })

  it('refuses without money, with bad quantities, above the daily limit and for sets out of print', async () => {
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 10 })).rejects.toThrow('insufficient_funds')
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 3 })).rejects.toThrow('invalid_request')
    await override('kiosk.daily_limit', 1)
    await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 })
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 })).rejects.toThrow('store_limit')
    await t.sql(`update game.set_defs set phase = 'oop' where true`)
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 1 })).rejects.toThrow('product_unavailable')
  })

  it('sells as many boosters as you can pay for (no daily limit by default)', async () => {
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [await t.playerId(me)])
    for (let i = 0; i < 6; i++) await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: B, p_qty: 10 })
    const kiosk = (await t.rpc(me, 'shop_get')).kiosk.find((k) => k.product_id === B)!
    expect(kiosk).toMatchObject({ bought_today: 60, daily_limit: null })
  })

  it('charges only once for a repeated request', async () => {
    const id = rid()
    await t.rpc(me, 'store_buy', { p_request_id: id, p_product: B, p_qty: 1 })
    await t.rpc(me, 'store_buy', { p_request_id: id, p_product: B, p_qty: 1 })
    expect((await t.rpc(me, 'shop_get')).sealed[0]!.qty).toBe(1)
  })
})

describe('pack opening', () => {
  it('follows the booster structure and books every card', async () => {
    const id = await t.playerId(me)
    await t.sql(`select private.sealed_add($1, $2, 1)`, [id, B])
    const res = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 1 })
    const cards = res.packs[0]!.cards
    expect(cards).toHaveLength(11)
    expect(new Set(cards.map((c) => c.card_id)).size).toBe(11)
    expect(cards.filter((c) => c.kind === 'energy').length).toBeGreaterThanOrEqual(2)
    expect(['rare', 'holo', 'alternative', 'ultra', 'grail']).toContain(cards[10]!.tier)
    expect(cards.every((c) => c.new)).toBe(true)
    expect(res.player.sealed_total).toBe(0)
    expect(res.total_value_cents).toBe(cards.reduce((s, c) => s + c.value_cents, 0))

    const binder = await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })
    expect(binder.cards).toHaveLength(90)
    expect(binder.cards.reduce((s, c) => s + c.qty, 0)).toBe(11)
    expect(binder.cards.filter((c) => c.discovered)).toHaveLength(11)
    await expect(t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 1 })).rejects.toThrow('not_enough_sealed')
  })

  it('stores hits as copies with quality values, bulk as stacks; a replay returns the same packs', async () => {
    await override('pack.hit_odds_ppm', { holo: 0, alternative: 0, ultra: 0, grail: 1_000_000 })
    const id = await t.playerId(me)
    await t.sql(`select private.sealed_add($1, $2, 2)`, [id, B])
    const req = rid()
    const res = await t.rpc(me, 'pack_open', { p_request_id: req, p_product: B, p_qty: 2 })
    expect(res.packs[0]!.cards[10]).toMatchObject({ card_id: 'pkm-base-090', tier: 'grail' })
    const copies = await t.sql<{ q: number }>(`select least(q_centering, q_corners, q_edges, q_surface) as q from game.card_copies`)
    expect(copies.length).toBeGreaterThanOrEqual(2)
    expect(copies.every((c) => c.q >= 1 && c.q <= 10)).toBe(true)
    expect((await t.rpc(me, 'pack_open', { p_request_id: req, p_product: B, p_qty: 2 })).packs).toEqual(res.packs)
    const feed = (await t.rpc(me, 'sync')).feed.filter((f) => f.kind === 'pull_grail')
    expect(feed[0]!.data).toMatchObject({ name: 'Sammler', card_id: 'pkm-base-090' })
  })

  it('opens a god pack and protects against long dry streaks', async () => {
    const id = await t.playerId(me)
    await override('pack.god_pack_ppm', 1_000_000)
    await t.sql(`select private.sealed_add($1, $2, 1)`, [id, B])
    const god = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 1 })
    expect(god.packs[0]!.cards.every((c) => ['holo', 'alternative', 'ultra', 'grail'].includes(c.tier))).toBe(true)

    await override('pack.god_pack_ppm', 0)
    await override('pack.double_hit_ppm', 0)
    await override('pack.hit_odds_ppm', { holo: 0, alternative: 0, ultra: 0, grail: 0 })
    await override('pack.pity_step_ppm', 1_000_000)
    await t.sql(`select private.sealed_add($1, $2, 13)`, [id, B])
    const res = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 10 })
    expect(res.packs.every((p) => p.cards[10]!.tier === 'rare')).toBe(true)
    const more = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 3 })
    // after 12 dry packs the pity step (here 100 %) forces a holo
    expect(more.packs.map((p) => p.cards[10]!.tier)).toEqual(['rare', 'rare', 'holo'])
  })

  it('gives EP, counts quest events and has roughly the right hit rate', async () => {
    const id = await t.playerId(me)
    await t.sql(`select private.sealed_add($1, $2, 200)`, [id, B])
    let hits = 0
    for (let i = 0; i < 20; i++) {
      const res = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 10 })
      hits += res.packs.filter((p) => p.cards.some((c) => c.tier !== 'rare' && ['holo', 'alternative', 'ultra', 'grail'].includes(c.tier))).length
    }
    // ~25 % of packs have Holo or better (incl. double hits and pity)
    expect(hits / 200).toBeGreaterThan(0.15)
    expect(hits / 200).toBeLessThan(0.4)
    const me2 = (await t.rpc(me, 'me_get')).player!
    expect(me2.level).toBeGreaterThan(5)
    const [c] = await t.sql<{ total: string }>(`select total from game.counters where player_id = $1 and event = 'pack_opened'`, [id])
    expect(Number(c!.total)).toBe(200)
    await t.assertLedgerMatches()
  })

})

describe('kartenladen', () => {
  it('buys stacks and copies at 60 % and refuses what you do not own', async () => {
    const id = await t.playerId(me)
    await override('pack.hit_odds_ppm', { holo: 1_000_000, alternative: 0, ultra: 0, grail: 0 })
    await t.sql(`select private.sealed_add($1, $2, 1)`, [id, B])
    const pack = (await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 1 })).packs[0]!
    const energy = pack.cards.find((c) => c.kind === 'energy')!
    const holo = pack.cards.find((c) => c.copy_id)!
    const before = await cash(me)
    const res = await t.rpc(me, 'ankauf_sell', {
      p_request_id: rid(),
      p_stacks: [{ card_id: energy.card_id, qty: 1 }],
      p_copies: [holo.copy_id],
    })
    expect(res.sold).toBe(2)
    expect(res.payout_cents).toBe(Math.round((energy.value_cents + holo.value_cents) * 0.6))
    expect(res.player.cash_cents).toBe(before + res.payout_cents)
    const binder = await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })
    expect(binder.cards.find((c) => c.card_id === holo.card_id)!.qty).toBe(0)
    expect(binder.cards.find((c) => c.card_id === holo.card_id)!.discovered).toBe(true)

    await expect(
      t.rpc(me, 'ankauf_sell', { p_request_id: rid(), p_stacks: [{ card_id: energy.card_id, qty: 5 }], p_copies: [] }),
    ).rejects.toThrow('not_owned')
    await expect(t.rpc(me, 'ankauf_sell', { p_request_id: rid(), p_stacks: [], p_copies: [holo.copy_id] })).rejects.toThrow('not_owned')
    // another player cannot sell my cards
    const other = await t.player('Dieb')
    const mine = pack.cards.find((c) => c.kind !== 'energy' && !c.copy_id)!
    await expect(
      t.rpc(other, 'ankauf_sell', { p_request_id: rid(), p_stacks: [{ card_id: mine.card_id, qty: 1 }], p_copies: [] }),
    ).rejects.toThrow('not_owned')
    await t.assertLedgerMatches()
  })
})

describe('home', () => {
  it('shows the latest Holo-or-better pull with its current value', async () => {
    expect((await t.rpc(me, 'home_get')).last_hit).toBeNull()
    const id = await t.playerId(me)
    await t.sql(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, 'pkm-base-088', 8, 8, 8, 8, private.now()), ($1, 'pkm-base-090', 9, 9, 9, 9, private.now() + interval '1 minute')`,
      [id],
    )
    const hit = (await t.rpc(me, 'home_get')).last_hit!
    expect(hit).toMatchObject({ card_id: 'pkm-base-090', tier: 'grail' })
    expect(hit.value_cents).toBeGreaterThan(0)
    // Another player's pulls never show up.
    const other = await t.player('Neidhammel')
    expect((await t.rpc(other, 'home_get')).last_hit).toBeNull()
  })
})
