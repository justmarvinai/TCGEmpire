import type { CardDef } from '../types.ts'
import { HEROES } from './heroes.ts'
import { KIT_CARDS } from './kit-cards.ts'

/** Cards of this set with art, in set order: hand-made Ultra and Grail heroes plus kit cards for the rest. */
export const yugiohMrd: readonly CardDef[] = [...HEROES, ...KIT_CARDS].sort((a, b) => a.number - b.number)
