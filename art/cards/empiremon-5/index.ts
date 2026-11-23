import type { CardDef } from '../types.ts'
import { HEROES } from './heroes.ts'
import { KIT_CARDS } from './kit-cards.ts'

/** Cards of Empiremon Abstellgleis with art, in set order: kit Commons, then the Ultra and Grail heroes. */
export const empiremonAbstellgleis: readonly CardDef[] = [...KIT_CARDS, ...HEROES].sort((a, b) => a.number - b.number)
