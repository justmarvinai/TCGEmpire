import { pick } from '../../products/booster-pokemon-base.ts'
import { boosterPack } from '../../products/booster-op01.ts'
import type { ProductDef } from '../../products/index.ts'
import { colors } from '../../toolkit/index.ts'
import { CREAM, katakuriAlt } from './katakuri.ts'
import { RAINCLOUD, namiLeader } from './nami-leader.ts'
import { NOTE_INK, sogekingAlt } from './sogeking.ts'

/**
 * The booster wrappers of this set (content/catalog.ts lists their ids), painted with the One Piece
 * pack (art/products/booster-op01.ts). Each hero is cut out of his card's artwork, the sunburst sits
 * behind his head, and a piece of his card's scene comes along behind the set name.
 */
const TITLE = 'Pillars of Strength'

/** Sogeking wrapper: royal-blue night foil, so the golden mask and the crimson cape stand out; his song's notes drift up. */
const boosterSogeking = boosterPack({
  id: 'booster-op03-sogeking',
  title: TITLE,
  hero: sogekingAlt,
  effects: (art) => pick(art, NOTE_INK, [{ x: 4, y: 12, w: 72, h: 37 }]),
  at: [1, 30],
  foil: colors('060a1e', '0c1438', '142054', '1c2e72', '2a4290', '3e5cae', '6a8ad0', 'c8d8f8'),
  burst: [41, 60],
})

/** Katakuri wrapper: amber-gold foil, like his card's sky, that sets off his maroon hair and scarf; the mochi tower rises at his hand. */
const boosterKatakuri = boosterPack({
  id: 'booster-op03-katakuri',
  title: TITLE,
  hero: katakuriAlt,
  effects: (art) => pick(art, CREAM, [{ x: 44, y: 14, w: 36, h: 72 }]),
  // the trident's prongs stay just under the set name
  at: [2, 40],
  foil: colors('1c0a04', '3a1606', '5e2a0a', '8a4410', 'b86a18', 'e09a28', 'f8c848', 'fff0a0'),
  burst: [39, 70],
})

/** Nami wrapper: turquoise sea-and-sky foil behind her orange hair and the chart; the rain cloud floats over her Clima-Tact. */
const boosterNami = boosterPack({
  id: 'booster-op03-nami',
  title: TITLE,
  hero: namiLeader,
  effects: (art) => pick(art, RAINCLOUD, [{ x: 52, y: 12, w: 28, h: 24 }]),
  at: [3, 28],
  foil: colors('0a2a3a', '0e3e52', '146070', '1a7e8a', '2a9ea0', '4abcb4', '8adcd0', 'e0fff4'),
  burst: [37, 62],
})

export const BOOSTERS: readonly ProductDef[] = [boosterSogeking, boosterKatakuri, boosterNami]
