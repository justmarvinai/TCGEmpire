import type { CardDef } from '../types.ts'
import { feuerEnergie } from './feuer-energie.ts'
import { glurak } from './glurak.ts'
import { pikachu } from './pikachu.ts'
import { professorEich } from './professor-eich.ts'

/** Pokémon Basis-Set: one file per card, registered here in set order. */
export const pokemonBase: readonly CardDef[] = [pikachu, professorEich, feuerEnergie, glurak]
