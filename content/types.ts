// Shared shapes of the game content. Content is data: it reaches the database through the generated seed
// (pnpm seed) and the client imports it for names and texts.

export type Tier = 'common' | 'uncommon' | 'rare' | 'holo' | 'alternative' | 'ultra' | 'grail'
export const TIERS: readonly Tier[] = ['common', 'uncommon', 'rare', 'holo', 'alternative', 'ultra', 'grail']
/** Tiers that are stored as individual copies (with hidden quality values) instead of stacks. */
export const COPY_TIERS: readonly Tier[] = ['holo', 'alternative', 'ultra', 'grail']

export type CardKind =
  | 'pokemon' | 'trainer' | 'energy'
  | 'monster' | 'spell' | 'trap'
  | 'leader' | 'character' | 'event'
  | 'legend' | 'unit' | 'gear' | 'rune' | 'battlefield'

/** The four licensed games (one set each) and Empiremon, the game's own TCG (0.0.5: five house sets). */
export type LicensedGame = 'pokemon' | 'yugioh' | 'onepiece' | 'riftbound'
export type Game = LicensedGame | 'empiremon'
/** The games a Händlerlizenz is needed for: the starter choice and the licences. Empiremon needs none. */
export const GAMES: readonly LicensedGame[] = ['pokemon', 'yugioh', 'onepiece', 'riftbound']

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
  /** Pokémon type, Yu-Gi-Oh! attribute, One Piece colour or Riftbound domain. */
  element?: string
  /**
   * Yu-Gi-Oh! subtype for the frame colour: normal, effect, fusion, ritual (monsters), normal, equip, field, quickplay, ritual
   * (spells), normal, continuous, counter (traps).
   */
  sub?: string
  /** Desirability 1-10: real-world popularity; sets the value inside the tier. */
  d: number
}

export interface SetData {
  /** Set id, also the atlas name, e.g. 'pokemon-base'. */
  id: string
  game: Game
  name: string
  /** Printed set size. */
  size: number
  /** A house set (Empiremon): always in print, only at the kiosk, no licence, the house odds (pack.house_hit_odds_ppm). */
  house?: true
  /**
   * Phase of a new set when it is first seeded (default 'print'). Sets added after release start 'announced' and the
   * owner releases them in the admin console (decision 124); the seed never changes the phase of an existing set.
   */
  launch?: 'announced'
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
  kind: 'booster' | 'display'
  name: string
  /** List price in Basis-€ cents. */
  priceBaseCents: number
  /** pack structure (boosters only) */
  slots: readonly SlotGroup[]
  /** what a display holds (displays only) */
  contains?: { product: string; qty: number }
  /** Wrapper artworks (products atlas ids); purely cosmetic. */
  wrappers: readonly string[]
}
