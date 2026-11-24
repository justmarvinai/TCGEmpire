import type { CardDef } from '../types.ts'
import { aquana } from './aquana.ts'
import { blitza } from './blitza.ts'
import { flamara } from './flamara.ts'
import { knuddeluff } from './knuddeluff.ts'
import { relaxo } from './relaxo.ts'
import { sichlor } from './sichlor.ts'
import { tauboss } from './tauboss.ts'

/** Ultra and Grail cards of this set, hand-made, one file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [sichlor, flamara, blitza, tauboss, knuddeluff, aquana, relaxo]
