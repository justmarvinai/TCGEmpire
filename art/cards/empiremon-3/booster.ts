import type { EmpiremonBooster } from '../../products/booster-empiremon.ts'
import { colors } from '../../toolkit/index.ts'
import { derEwigeAntrag } from './der-ewige-antrag.ts'

/**
 * Booster wrapper of Amt & Elend (painter: art/products/booster-empiremon.ts): office steel-blue foil; Der Ewige Antrag bursts out.
 * Retune `at` (where the card artwork's top left corner lands on the 84×132 pack) and `burst` when the
 * hero's artwork changes.
 */
export const BOOSTER: EmpiremonBooster = {
  id: 'booster-emp3',
  set: 'empiremon-3',
  hero: derEwigeAntrag,
  at: [-4, 34],
  foil: colors('060a14', '0c1426', '142038', '1c2e4e', '284066', '3a5884', '5a7ca8', 'c0d4ec'),
  burst: [42, 66],
}
