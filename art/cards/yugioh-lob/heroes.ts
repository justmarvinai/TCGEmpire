import type { CardDef } from '../types.ts'
import { blauaeugigerDrache } from './blauaeugiger-drache.ts'
import { dunklerMagier } from './dunkler-magier.ts'
import { exodia } from './exodia.ts'
import { rotaeugigerDrache } from './rotaeugiger-drache.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [rotaeugigerDrache, exodia, dunklerMagier, blauaeugigerDrache]
