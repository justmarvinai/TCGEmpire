import type { EmpiremonBooster } from '../../products/booster-empiremon.ts'
import { colors } from '../../toolkit/index.ts'
import { derLetzteDoener } from './der-letzte-doener.ts'

/**
 * Booster wrapper of Spätschicht (painter: art/products/booster-empiremon.ts): night-violet foil with a neon heart; Der Letzte Döner bursts out.
 * Retune `at` (where the card artwork's top left corner lands on the 84×132 pack) and `burst` when the
 * hero's artwork changes.
 */
export const BOOSTER: EmpiremonBooster = {
  id: 'booster-emp2',
  set: 'empiremon-2',
  hero: derLetzteDoener,
  at: [-3, 34],
  foil: colors('060418', '0e0a30', '18124c', '24186a', '362488', '5034a8', '8050d0', 'e8a8f4'),
  burst: [44, 70],
}
