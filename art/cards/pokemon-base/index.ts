import type { CardDef } from '../types.ts'
import { bisaflor } from './bisaflor.ts'
import { feuerEnergie } from './feuer-energie.ts'
import { glurak } from './glurak.ts'
import { KIT_CARDS } from './kit-cards.ts'
import { mewtu } from './mewtu.ts'
import { pikachuRoteWangen } from './pikachu-rote-wangen.ts'
import { pikachu } from './pikachu.ts'
import { professorEich } from './professor-eich.ts'
import { turtok } from './turtok.ts'

/** Pokémon Basis-Set: one file per card, registered here in set order. */
export const pokemonBase: readonly CardDef[] = [
  pikachu,
  professorEich,
  feuerEnergie,
  pikachuRoteWangen,
  bisaflor,
  turtok,
  mewtu,
  glurak,
  ...KIT_CARDS,
]
