import type { CardDef } from '../types.ts'
import { HEROES } from './heroes.ts'
import { KIT_CARDS } from './kit-cards.ts'

/** Cards of Empiremon Spätschicht with art, in set order: kit Commons, then the Ultra and Grail heroes. */
export const empiremonSpaetschicht: readonly CardDef[] = [...KIT_CARDS, ...HEROES].sort((a, b) => a.number - b.number)
