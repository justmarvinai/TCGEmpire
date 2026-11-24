import type { EmpiremonBooster } from '../../products/booster-empiremon.ts'
import { colors } from '../../toolkit/index.ts'
import { goldflaschengeist } from './goldflaschengeist.ts'

/**
 * Booster wrapper of Pfandland (painter: art/products/booster-empiremon.ts): bottle-green foil; Goldflaschengeist bursts out.
 * Retune `at` (where the card artwork's top left corner lands on the 84×132 pack) and `burst` when the
 * hero's artwork changes.
 */
export const BOOSTER: EmpiremonBooster = {
  id: 'booster-emp4',
  set: 'empiremon-4',
  hero: goldflaschengeist,
  at: [4, 32],
  foil: colors('041006', '082010', '0c3018', '124422', '1a5a2c', '26763a', '44a050', 'b8eca8'),
  burst: [42, 76],
}
