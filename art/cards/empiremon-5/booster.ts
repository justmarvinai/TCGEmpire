import type { EmpiremonBooster } from '../../products/booster-empiremon.ts'
import { colors } from '../../toolkit/index.ts'
import { signalstoerung } from './signalstoerung.ts'

/**
 * Booster wrapper of Abstellgleis (painter: art/products/booster-empiremon.ts): signal-orange foil; Signalstörung bursts out.
 * Retune `at` (where the card artwork's top left corner lands on the 84×132 pack) and `burst` when the
 * hero's artwork changes.
 */
export const BOOSTER: EmpiremonBooster = {
  id: 'booster-emp5',
  set: 'empiremon-5',
  hero: signalstoerung,
  at: [2, 32],
  foil: colors('180802', '301004', '4c1a06', '6c280a', '903a10', 'b85418', 'e07c28', 'ffd488'),
  burst: [42, 79],
}
