import type { CardDef } from '../types.ts'
import { derLetzteDoener } from './der-letzte-doener.ts'
import { kebabkrake } from './kebabkrake.ts'
import { neonphoenix } from './neonphoenix.ts'
import { neonyx } from './neonyx.ts'
import { spaetikoenig } from './spaetikoenig.ts'

/** Ultra and Grail cards of this set, hand-made, one file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [spaetikoenig, neonphoenix, kebabkrake, derLetzteDoener, neonyx]
