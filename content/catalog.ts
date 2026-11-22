// Sets, products and card values. Values are computed here once at build time and seeded; at runtime the
// server multiplies them with the Preisniveau and (later) the market factors.
import type { CardData, ProductData, SetData, Tier } from './types.ts'
import { pokemonBase } from './sets/pokemon-base.ts'
import { config } from './config.ts'

export const SETS: readonly SetData[] = [pokemonBase]

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
]

/** In-print, ungraded value range per tier in Basis-€ cents (docs/ECONOMY.md §5.1). */
export const TIER_VALUE: Record<Tier, [lo: number, hi: number]> = {
  common: [20, 240],
  uncommon: [80, 700],
  rare: [300, 2_400],
  holo: [2_400, 16_000],
  alternative: [12_000, 60_000],
  ultra: [50_000, 160_000],
  grail: [600_000, 1_000_000],
}

/** Target: an average booster is worth this share of its list price. */
export const PACK_EV_SHARE = 0.72

const rawValue = (c: CardData) => {
  const [lo, hi] = TIER_VALUE[c.tier]
  return lo * Math.pow(hi / lo, (c.d - 1) / 9)
}

function poolOf(c: CardData): string {
  if (c.tier === 'common') return c.kind === 'energy' ? 'energy' : 'common'
  return c.tier
}

/** Expected value of one booster for the given card values (pity, double hits and god packs ignored). */
export function packEv(product: ProductData, set: SetData, value: (c: CardData) => number): number {
  const avg = (pool: string) => {
    const cards = set.cards.filter((c) => poolOf(c) === pool)
    return cards.reduce((s, c) => s + value(c), 0) / cards.length
  }
  const odds = config['pack.hit_odds_ppm']
  const hitTiers = ['holo', 'alternative', 'ultra', 'grail'] as const
  const pRare = 1 - hitTiers.reduce((s, t) => s + odds[t] / 1e6, 0)
  const hit = pRare * avg('rare') + hitTiers.reduce((s, t) => s + (odds[t] / 1e6) * avg(t), 0)
  return product.slots.reduce((s, g) => s + g.n * (g.pool === 'hit' ? hit : avg(g.pool)), 0)
}

/** Final Basis-€ cent value of every card: tier range by desirability, scaled so the pack EV hits the target. */
export function cardValues(set: SetData): Map<string, number> {
  const product = PRODUCTS.find((p) => p.set === set.id)
  const factor = product ? (PACK_EV_SHARE * product.priceBaseCents) / packEv(product, set, rawValue) : 1
  return new Map(set.cards.map((c) => [c.id, Math.max(1, Math.round(rawValue(c) * factor))]))
}

export const cardById = new Map(SETS.flatMap((s) => s.cards.map((c) => [c.id, c] as const)))
export const productById = new Map(PRODUCTS.map((p) => [p.id, p] as const))
