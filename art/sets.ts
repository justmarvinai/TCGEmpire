import { empiremonGrundauflage } from './cards/empiremon-1/index.ts'
import { empiremonSpaetschicht } from './cards/empiremon-2/index.ts'
import { empiremonAmt } from './cards/empiremon-3/index.ts'
import { empiremonPfandland } from './cards/empiremon-4/index.ts'
import { empiremonAbstellgleis } from './cards/empiremon-5/index.ts'
import { onepieceOp01 } from './cards/onepiece-op01/index.ts'
import { pokemonBase } from './cards/pokemon-base/index.ts'
import { riftboundOrigins } from './cards/riftbound-origins/index.ts'
import type { CardDef, RenderedCard } from './cards/types.ts'
import { yugiohLob } from './cards/yugioh-lob/index.ts'
import { pokemonJungle } from './cards/pokemon-jungle/index.ts'
import { pokemonFossil } from './cards/pokemon-fossil/index.ts'
import { yugiohMrd } from './cards/yugioh-mrd/index.ts'
import { yugiohMrl } from './cards/yugioh-mrl/index.ts'
import { onepieceOp02 } from './cards/onepiece-op02/index.ts'
import { onepieceOp03 } from './cards/onepiece-op03/index.ts'
import { riftboundSpiritforged } from './cards/riftbound-spiritforged/index.ts'
import { riftboundUnleashed } from './cards/riftbound-unleashed/index.ts'
import * as Empiremon from './frames/empiremon.ts'
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

/** An Empiremon set: all five share the house frame. */
function empiremon(id: string, size: number, cards: readonly CardDef[]): CardSet {
  return {
    id,
    size,
    cards,
    cardSize: Empiremon.CARD,
    artSize: (def) => Empiremon.artArea(def),
    render: (def) => Empiremon.renderCard(def, size),
  }
}

/** Sets 2 and 3 of a licensed game reuse the game's frame (decision 124). */
const pokemon = (id: string, size: number, cards: readonly CardDef[]): CardSet => ({
  id,
  size,
  cards,
  cardSize: CARD,
  artSize: (def) => ART[layoutOf(def)],
  render: (def) => renderPokemonCard(def, size),
})
const yugioh = (id: string, size: number, cards: readonly CardDef[]): CardSet => ({
  id,
  size,
  cards,
  cardSize: YuGiOh.CARD,
  artSize: (def) => YuGiOh.artArea(def),
  render: (def) => YuGiOh.renderCard(def, size),
})
const onepiece = (id: string, size: number, cards: readonly CardDef[]): CardSet => ({
  id,
  size,
  cards,
  cardSize: OnePiece.CARD,
  artSize: (def) => OnePiece.artArea(def),
  render: (def) => OnePiece.renderCard(def, size),
})
const riftbound = (id: string, size: number, cards: readonly CardDef[]): CardSet => ({
  id,
  size,
  cards,
  cardSize: Riftbound.CARD,
  artSize: (def) => Riftbound.artArea(def),
  render: (def) => Riftbound.renderCard(def, size),
})

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
  empiremon('empiremon-1', 20, empiremonGrundauflage),
  empiremon('empiremon-2', 18, empiremonSpaetschicht),
  empiremon('empiremon-3', 15, empiremonAmt),
  empiremon('empiremon-4', 24, empiremonPfandland),
  empiremon('empiremon-5', 30, empiremonAbstellgleis),
  pokemon('pokemon-jungle', 78, pokemonJungle),
  pokemon('pokemon-fossil', 75, pokemonFossil),
  yugioh('yugioh-mrd', 88, yugiohMrd),
  yugioh('yugioh-mrl', 80, yugiohMrl),
  onepiece('onepiece-op02', 90, onepieceOp02),
  onepiece('onepiece-op03', 90, onepieceOp03),
  riftbound('riftbound-spiritforged', 88, riftboundSpiritforged),
  riftbound('riftbound-unleashed', 86, riftboundUnleashed),
]
