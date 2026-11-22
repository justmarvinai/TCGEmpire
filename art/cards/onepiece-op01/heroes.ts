import type { CardDef } from '../types.ts'
import { luffyLeader } from './luffy-leader.ts'
import { shanksManga } from './shanks-manga.ts'
import { shanks } from './shanks.ts'
import { yamatoAlt } from './yamato.ts'
import { zoroAlt } from './zoro.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [luffyLeader, zoroAlt, yamatoAlt, shanks, shanksManga]
