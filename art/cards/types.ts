import type { Mask } from '../toolkit/index.ts'
import { Painter } from '../toolkit/index.ts'

export type Tier = 'common' | 'uncommon' | 'rare' | 'holo' | 'alternative' | 'ultra' | 'grail'

export const TIERS: readonly Tier[] = ['common', 'uncommon', 'rare', 'holo', 'alternative', 'ultra', 'grail']

export type CardKind = 'pokemon' | 'trainer' | 'energy'

/** German type names as printed in the set lists. */
export type PokemonType = 'Feuer' | 'Wasser' | 'Pflanze' | 'Elektro' | 'Psycho' | 'Kampf' | 'Farblos'

export interface Attack {
  name: string
  /** One energy symbol per entry. */
  cost: readonly PokemonType[]
  /** Printed damage, e.g. '30' or '20+'. */
  damage?: string
}

/**
 * Which pixels of the artwork shine:
 * - 'none': nothing (the frame may still add foil for its tier),
 * - 'art': the whole artwork,
 * - 'painted': exactly the pixels painted while `p.shine(true)` was active in `draw`.
 */
export type FoilDef = 'none' | 'art' | 'painted'

export interface CardDef {
  /** Stable id, e.g. 'pkm-base-090'. */
  id: string
  /** Number inside the set, printed as NNN/total. */
  number: number
  /** German card name. */
  name: string
  tier: Tier
  kind: CardKind
  /** Element of a Pokémon or energy card; trainers have none. */
  type?: PokemonType
  /** KP of a Pokémon. */
  hp?: number
  attacks?: readonly Attack[]
  /** Rules text of a trainer card. */
  text?: string
  /** Paints the artwork. The painter has the size of the art area of the card's layout. */
  draw(p: Painter): void
  foil: FoilDef
}

export interface RenderedCard {
  /** The complete card. */
  card: Painter
  /** Foil mask of the complete card. */
  foil: Mask
  /** The artwork alone, as painted by `draw`. */
  art: Painter
}

/**
 * Run a card's `draw` on a fresh painter of the given size. Afterwards the cleanup pass runs once
 * more over the subject, because effects painted in front of it can leave stray pixels behind.
 * Every frame family paints its artworks through this function.
 */
export function paintArtwork(def: CardDef, w: number, h: number): Painter {
  const art = new Painter(w, h)
  def.draw(art)
  return art.cleanup(art.subjectMask)
}
