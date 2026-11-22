import type { CardDef } from '../types.ts'
import { ahriSignature } from './ahri-signature.ts'
import { jinxSignature } from './jinx-signature.ts'
import { kaisaSignature } from './kaisa-signature.ts'
import { leeSinSignature } from './lee-sin-signature.ts'
import { missFortuneSignature } from './miss-fortune-signature.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [
  leeSinSignature,
  jinxSignature,
  missFortuneSignature,
  kaisaSignature,
  ahriSignature,
]
