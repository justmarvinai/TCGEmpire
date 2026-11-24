import type { CardDef } from '../types.ts'
import { aceManga } from './ace-manga.ts'
import { aceAlt } from './ace.ts'
import { garpLeader } from './garp-leader.ts'
import { kuzanAlt } from './kuzan.ts'
import { newgateLeader } from './newgate-leader.ts'
import { smokerLeader } from './smoker-leader.ts'
import { utaAlt } from './uta.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [newgateLeader, garpLeader, smokerLeader, utaAlt, kuzanAlt, aceAlt, aceManga]
