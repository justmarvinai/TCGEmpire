// Sets, products and card values. Values are computed here once at build time and seeded; at runtime the
// server multiplies them with the Preisniveau and (later) the market factors.
import type { CardData, ProductData, SetData, Tier } from './types.ts'
import { onepieceOp01 } from './sets/onepiece-op01.ts'
import { pokemonBase } from './sets/pokemon-base.ts'
import { riftboundOrigins } from './sets/riftbound-origins.ts'
import { yugiohLob } from './sets/yugioh-lob.ts'
import { EMPIREMON } from './sets/empiremon.ts'
import { config } from './config.ts'

export const SETS: readonly SetData[] = [pokemonBase, yugiohLob, onepieceOp01, riftboundOrigins, ...EMPIREMON]

export const PRODUCTS: readonly ProductData[] = [
  {
    id: 'booster-pkm-base',
    set: 'pokemon-base',
    kind: 'booster',
    name: 'Basis-Set Booster',
    priceBaseCents: 100_00,
    // Like the real pack: 2 basic energies, 5 commons, 3 uncommons, 1 rare-or-better.
    slots: [
      { pool: 'energy', n: 2 },
      { pool: 'common', n: 5 },
      { pool: 'uncommon', n: 3 },
      { pool: 'hit', n: 1 },
    ],
    wrappers: ['booster-pkm-base-glurak', 'booster-pkm-base-turtok', 'booster-pkm-base-bisaflor'],
  },
  {
    id: 'display-pkm-base',
    set: 'pokemon-base',
    kind: 'display',
    name: 'Basis-Set Display',
    // 36 boosters for 3.200 € instead of 3.600 € (docs/ECONOMY.md §5.4)
    priceBaseCents: 3_200_00,
    slots: [],
    contains: { product: 'booster-pkm-base', qty: 36 },
    wrappers: ['booster-pkm-base-glurak', 'booster-pkm-base-turtok', 'booster-pkm-base-bisaflor'],
  },
  // Structures and prices: docs/SETS.md §3 and §5; displays hold 24 boosters at about 11 % off.
  {
    id: 'booster-ygo-lob',
    set: 'yugioh-lob',
    kind: 'booster',
    name: 'Yu-Gi-Oh! LOB Booster',
    priceBaseCents: 80_00,
    slots: [
      { pool: 'common', n: 5 },
      { pool: 'uncommon', n: 3 },
      { pool: 'hit', n: 1 },
    ],
    wrappers: ['booster-ygo-lob-blue-eyes', 'booster-ygo-lob-dark-magician', 'booster-ygo-lob-red-eyes'],
  },
  {
    id: 'display-ygo-lob',
    set: 'yugioh-lob',
    kind: 'display',
    name: 'Yu-Gi-Oh! LOB Display',
    priceBaseCents: 1_700_00,
    slots: [],
    contains: { product: 'booster-ygo-lob', qty: 24 },
    wrappers: ['booster-ygo-lob-blue-eyes', 'booster-ygo-lob-dark-magician', 'booster-ygo-lob-red-eyes'],
  },
  {
    id: 'booster-op01',
    set: 'onepiece-op01',
    kind: 'booster',
    name: 'One Piece OP-01 Booster',
    priceBaseCents: 100_00,
    slots: [
      { pool: 'common', n: 7 },
      { pool: 'uncommon', n: 3 },
      { pool: 'rare', n: 1 },
      { pool: 'hit', n: 1 },
    ],
    wrappers: ['booster-op01-luffy', 'booster-op01-shanks', 'booster-op01-zoro'],
  },
  {
    id: 'display-op01',
    set: 'onepiece-op01',
    kind: 'display',
    name: 'One Piece OP-01 Display',
    priceBaseCents: 2_100_00,
    slots: [],
    contains: { product: 'booster-op01', qty: 24 },
    wrappers: ['booster-op01-luffy', 'booster-op01-shanks', 'booster-op01-zoro'],
  },
  {
    id: 'booster-rb-ogn',
    set: 'riftbound-origins',
    kind: 'booster',
    name: 'Riftbound Origins Booster',
    priceBaseCents: 100_00,
    // 14 cards; the rune is one of the commons (the "another rune" gag).
    slots: [
      { pool: 'energy', n: 1 },
      { pool: 'common', n: 7 },
      { pool: 'uncommon', n: 4 },
      { pool: 'rare', n: 1 },
      { pool: 'hit', n: 1 },
    ],
    wrappers: ['booster-rb-ogn-ahri', 'booster-rb-ogn-jinx', 'booster-rb-ogn-kaisa'],
  },
  {
    id: 'display-rb-ogn',
    set: 'riftbound-origins',
    kind: 'display',
    name: 'Riftbound Origins Display',
    priceBaseCents: 2_100_00,
    slots: [],
    contains: { product: 'booster-rb-ogn', qty: 24 },
    wrappers: ['booster-rb-ogn-ahri', 'booster-rb-ogn-jinx', 'booster-rb-ogn-kaisa'],
  },
  // Empiremon (0.0.5): one booster per set, only at the kiosk, no displays. 5 cards: 4 Commons and the hit slot, which
  // is a Common unless the house odds give an Ultra or a Grail. Twice the price of a normal booster.
  ...EMPIREMON.map(
    (s): ProductData => ({
      id: `booster-${s.cards[0]!.id.split('-')[0]}`,
      set: s.id,
      kind: 'booster',
      name: `Empiremon ${s.name} Booster`,
      priceBaseCents: 200_00,
      slots: [
        { pool: 'common', n: 4 },
        { pool: 'hit', n: 1 },
      ],
      wrappers: [`booster-${s.cards[0]!.id.split('-')[0]}`],
    }),
  ),
]

/** In-print, ungraded value range per tier in Basis-€ cents (docs/ECONOMY.md §5.1). */
export const TIER_VALUE: Record<Tier, [lo: number, hi: number]> = {
  common: [20, 240],
  uncommon: [80, 700],
  rare: [300, 2_400],
  holo: [2_400, 16_000],
  // A rarer tier is worth more by the same factor, so its share of the pack value (and every other card's value)
  // stays: 0.0.3 Ultra and Grail ×2,78; 0.0.4 Alternative ×2,08, Ultra ×5, Grail ×1,75.
  alternative: [25_000, 125_000],
  ultra: [695_000, 2_220_000],
  grail: [2_917_000, 4_862_000],
}

/**
 * Empiremon (house sets): cheap Commons and Ultras and Grails worth far more, because the house odds make them far
 * rarer (docs/ECONOMY.md §5.1). Only these three tiers exist there.
 */
export const HOUSE_TIER_VALUE: Partial<Record<Tier, [lo: number, hi: number]>> = {
  common: [5, 200],
  // 0.0.8: 2.5 times as likely as in 0.0.5, so worth 2.5 times less (were 400.000-800.000 € and 2,5-5 Mio. €)
  ultra: [16_000_000, 32_000_000],
  grail: [100_000_000, 200_000_000],
}

/** Target: an average booster is worth this share of its list price. */
export const PACK_EV_SHARE = 0.72

const rawValue = (c: CardData, set: SetData) => {
  const [lo, hi] = (set.house ? HOUSE_TIER_VALUE : TIER_VALUE)[c.tier]!
  return lo * Math.pow(hi / lo, (c.d - 1) / 9)
}

/** Basic resource cards fill the energy slot: Pokémon energies and Riftbound runes. */
export const isEnergy = (c: Pick<CardData, 'kind'>) => c.kind === 'energy' || c.kind === 'rune'

function poolOf(c: CardData): string {
  if (c.tier === 'common') return isEnergy(c) ? 'energy' : 'common'
  return c.tier
}

/** The odds of a set's hit slot in ppm per tier; the rest is the base tier (Rare, or Common in a house set). */
export function hitOdds(set: SetData): { base: Tier; odds: Partial<Record<Tier, number>> } {
  return set.house ? { base: 'common', odds: config['pack.house_hit_odds_ppm'] } : { base: 'rare', odds: config['pack.hit_odds_ppm'] }
}

/** Expected value of one booster for the given card values (pity, double hits and god packs ignored). */
export function packEv(product: ProductData, set: SetData, value: (c: CardData) => number): number {
  const avg = (pool: string) => {
    const cards = set.cards.filter((c) => poolOf(c) === pool)
    return cards.reduce((s, c) => s + value(c), 0) / cards.length
  }
  const { base, odds } = hitOdds(set)
  const tiers = Object.entries(odds) as [Tier, number][]
  const pBase = 1 - tiers.reduce((s, [, ppm]) => s + ppm / 1e6, 0)
  const hit = pBase * avg(base) + tiers.reduce((s, [t, ppm]) => s + (ppm / 1e6) * avg(t), 0)
  return product.slots.reduce((s, g) => s + g.n * (g.pool === 'hit' ? hit : avg(g.pool)), 0)
}

/** Final Basis-€ cent value of every card: tier range by desirability, scaled so the pack EV hits the target. */
export function cardValues(set: SetData): Map<string, number> {
  const product = PRODUCTS.find((p) => p.set === set.id && p.kind === 'booster')
  const raw = (c: CardData) => rawValue(c, set)
  const factor = product ? (PACK_EV_SHARE * product.priceBaseCents) / packEv(product, set, raw) : 1
  return new Map(set.cards.map((c) => [c.id, Math.max(1, Math.round(raw(c) * factor))]))
}

export const cardById = new Map(SETS.flatMap((s) => s.cards.map((c) => [c.id, c] as const)))
export const productById = new Map(PRODUCTS.map((p) => [p.id, p] as const))
