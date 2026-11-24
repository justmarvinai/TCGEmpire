import type { CardDef } from '../types.ts'
import { glasdrache } from './glasdrache.ts'
import { goldflaschengeist } from './goldflaschengeist.ts'
import { pfandautomatenTitan } from './pfandautomaten-titan.ts'
import { pfandkoenig } from './pfandkoenig.ts'
import { recyclingphoenix } from './recyclingphoenix.ts'

/** Ultra and Grail cards of this set, one hand-made full-art file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [
  pfandautomatenTitan,
  glasdrache,
  recyclingphoenix,
  goldflaschengeist,
  pfandkoenig,
]
