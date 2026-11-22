import type { CardDef } from '../types.ts'
import { feuerEnergie } from './feuer-energie.ts'
import { glurak } from './glurak.ts'
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
  turtok,
  glurak,
]
