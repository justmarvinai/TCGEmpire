import type { CardDef } from '../types.ts'
import { aceLeader } from './ace-leader.ts'
import { katakuriLeader } from './katakuri-leader.ts'
import { katakuriAlt } from './katakuri.ts'
import { luffyWanted } from './luffy-wanted.ts'
import { namiLeader } from './nami-leader.ts'
import { sogekingManga } from './sogeking-manga.ts'
import { sogekingAlt } from './sogeking.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [aceLeader, namiLeader, katakuriLeader, luffyWanted, katakuriAlt, sogekingAlt, sogekingManga]
