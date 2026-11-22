import { onepieceOp01 } from './cards/onepiece-op01/index.ts'
import { pokemonBase } from './cards/pokemon-base/index.ts'
import { riftboundOrigins } from './cards/riftbound-origins/index.ts'
import type { CardDef, RenderedCard } from './cards/types.ts'
import { yugiohLob } from './cards/yugioh-lob/index.ts'
import * as OnePiece from './frames/onepiece.ts'
import { ART, CARD, layoutOf, renderPokemonCard } from './frames/pokemon.ts'
import * as Riftbound from './frames/riftbound.ts'
import * as YuGiOh from './frames/yugioh.ts'

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
  {
    id: 'yugioh-lob',
    size: 86,
    cards: yugiohLob,
    cardSize: YuGiOh.CARD,
    artSize: (def) => YuGiOh.artArea(def),
    render: (def) => YuGiOh.renderCard(def, 86),
  },
  {
    id: 'onepiece-op01',
    size: 89,
    cards: onepieceOp01,
    cardSize: OnePiece.CARD,
    artSize: (def) => OnePiece.artArea(def),
    render: (def) => OnePiece.renderCard(def, 89),
  },
  {
    id: 'riftbound-origins',
    size: 89,
    cards: riftboundOrigins,
    cardSize: Riftbound.CARD,
    artSize: (def) => Riftbound.artArea(def),
    render: (def) => Riftbound.renderCard(def, 89),
  },
]
