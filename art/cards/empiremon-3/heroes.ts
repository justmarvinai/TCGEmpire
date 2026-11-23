import type { CardDef } from '../types.ts'
import { aktenhydra } from './aktenhydra.ts'
import { buerokrator } from './buerokrator.ts'
import { derEwigeAntrag } from './der-ewige-antrag.ts'
import { faxdrache } from './faxdrache.ts'
import { stempelgott } from './stempelgott.ts'

/** Ultra and Grail cards of this set, hand-made, one file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [buerokrator, aktenhydra, faxdrache, derEwigeAntrag, stempelgott]
