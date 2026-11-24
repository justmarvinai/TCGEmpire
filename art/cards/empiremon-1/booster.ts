import type { EmpiremonBooster } from '../../products/booster-empiremon.ts'
import { colors } from '../../toolkit/index.ts'
import { imperadon } from './imperadon.ts'

/**
 * Booster wrapper of Grundauflage (painter: art/products/booster-empiremon.ts): crimson foil; Imperadon bursts out.
 * Retune `at` (where the card artwork's top left corner lands on the 84×132 pack) and `burst` when the
 * hero's artwork changes.
 */
export const BOOSTER: EmpiremonBooster = {
  id: 'booster-emp1',
  set: 'empiremon-1',
  hero: imperadon,
  at: [2, 32],
  foil: colors('12040a', '2a0812', '480c18', '701420', '9c2028', 'c83a30', 'ee6e3a', 'ffc890'),
  burst: [42, 70],
}
