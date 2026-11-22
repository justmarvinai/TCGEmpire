// Shared shapes of the game content. Content is data: it reaches the database through the generated seed
// (pnpm seed) and the client imports it for names and texts.

export type Tier = 'common' | 'uncommon' | 'rare' | 'holo' | 'alternative' | 'ultra' | 'grail'
export const TIERS: readonly Tier[] = ['common', 'uncommon', 'rare', 'holo', 'alternative', 'ultra', 'grail']
/** Tiers that are stored as individual copies (with hidden quality values) instead of stacks. */
export const COPY_TIERS: readonly Tier[] = ['holo', 'alternative', 'ultra', 'grail']

export type CardKind = 'pokemon' | 'trainer' | 'energy' | 'monster' | 'spell' | 'trap' | 'leader' | 'character' | 'event' | 'unit' | 'gear' | 'rune'

export interface CardData {
  /** Stable id, also the atlas key, e.g. 'pkm-base-090'. */
  id: string
  /** Number inside the set. */
  no: number
  /** Name shown in the game (German where a German print exists). */
  name: string
  en: string
  tier: Tier
  kind: CardKind
  element?: string
  /** Desirability 1-10: real-world popularity; sets the value inside the tier. */
  d: number
}

export interface SetData {
  /** Set id, also the atlas name, e.g. 'pokemon-base'. */
  id: string
  game: 'pokemon' | 'yugioh' | 'onepiece' | 'riftbound'
  name: string
  /** Printed set size. */
  size: number
  cards: readonly CardData[]
}

/** A slot group of a booster: `n` different cards from a pool. */
export interface SlotGroup {
  pool: 'energy' | 'common' | 'uncommon' | 'rare' | 'hit'
  n: number
}

export interface ProductData {
  id: string
  set: string
  kind: 'booster'
  name: string
  /** List price in Basis-€ cents. */
  priceBaseCents: number
  slots: readonly SlotGroup[]
  /** Wrapper artworks (products atlas ids); purely cosmetic. */
  wrappers: readonly string[]
}
