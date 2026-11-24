import type { CardDef } from '../types.ts'
import { baronNashorUltimate } from './baron-nashor-ultimate.ts'
import { dianaSignature } from './diana-signature.ts'
import { jhinSignature } from './jhin-signature.ts'
import { leblancSignature } from './leblanc-signature.ts'
import { pykeSignature } from './pyke-signature.ts'
import { rengarSignature } from './rengar-signature.ts'
import { vexSignature } from './vex-signature.ts'
import { viSignature } from './vi-signature.ts'

/** Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [
  jhinSignature,
  rengarSignature,
  pykeSignature,
  viSignature,
  vexSignature,
  leblancSignature,
  dianaSignature,
  baronNashorUltimate,
]
