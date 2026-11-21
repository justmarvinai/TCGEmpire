import { pokemonBase } from './cards/pokemon-base/index.ts'
import type { CardDef, RenderedCard } from './cards/types.ts'
import { ART, CARD, layoutOf, renderPokemonCard } from './frames/pokemon.ts'

export interface CardSet {
  /** Atlas name, e.g. 'pokemon-base'. */
  id: string
  /** Printed set size (the NNN in 028/NNN). */
  size: number
  cards: readonly CardDef[]
  /** Size of a finished card. */
  cardSize: { w: number; h: number }
  /** Size of the artwork a card's `draw` has to fill. */
  artSize(def: CardDef): { w: number; h: number }
  render(def: CardDef): RenderedCard
}

/** Every set that has art. The build, the contact sheets and the quality gates read this list. */
export const SETS: readonly CardSet[] = [
  {
    id: 'pokemon-base',
    size: 90,
    cards: pokemonBase,
    cardSize: CARD,
    artSize: (def) => ART[layoutOf(def)],
    render: (def) => renderPokemonCard(def, 90),
  },
]
