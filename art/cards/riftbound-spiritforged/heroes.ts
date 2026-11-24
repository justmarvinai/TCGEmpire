import type { CardDef } from '../types.ts'
import { ahriSignature } from './ahri-signature.ts'
import { bardSignature } from './bard-signature.ts'
import { ireliaSignature } from './irelia-signature.ts'
import { sorakaSignature } from './soraka-signature.ts'
import { teemoSignature } from './teemo-signature.ts'
import { vayneSignature } from './vayne-signature.ts'
import { yasuoSignature } from './yasuo-signature.ts'
import { yoneSignature } from './yone-signature.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [
  vayneSignature,
  bardSignature,
  teemoSignature,
  yoneSignature,
  yasuoSignature,
  sorakaSignature,
  ireliaSignature,
  ahriSignature,
]
