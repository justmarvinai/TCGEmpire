import { boosterPack } from '../../products/booster-op01.ts'
import { pick } from '../../products/booster-pokemon-base.ts'
import type { ProductDef } from '../../products/index.ts'
import type { Mask, Painter, Ramp } from '../../toolkit/index.ts'
import { colors } from '../../toolkit/index.ts'
import { aceAlt } from './ace.ts'
import { kuzanAlt } from './kuzan.ts'
import { newgateLeader } from './newgate-leader.ts'

/**
 * The booster wrappers of this set (content/catalog.ts lists their ids), painted with the One Piece
 * pack (art/products/booster-op01.ts). Each hero is cut out of his card's artwork, together with the
 * effects that belong to him: Ace's crown of fire, the sky Newgate shatters, the wave Kuzan froze.
 */
const TITLE = 'Paramount War'

/** Ace's flames (art/cards/onepiece-op02/ace.ts). */
const FIRE = colors('8a1c10', 'e04018', 'f88a24', 'ffd04a', 'fff6c8')
/** The cracks in Newgate's sky (newgate-leader.ts). */
const CRACK = colors('9ee8f4', 'eefcff')
/** Kuzan's ice (kuzan.ts). */
const ICE = colors('1a3a6a', '3a6aa8', '7ab0e0', 'c4e4fa', 'f4fcff')

/** Pixels of the artwork in the palette where `keep` holds; unlike `pick`, thin lines survive. */
function lines(art: Painter, palette: Ramp, keep: (x: number, y: number) => boolean): Mask {
  const m = art.m()
  for (let y = 0; y < art.h; y++)
    for (let x = 0; x < art.w; x++) if (keep(x, y) && palette.includes(art.get(x, y))) m.add(x, y)
  return m
}

/** Ace wrapper: deep blue foil that burns through violet into an orange fire behind him. */
const boosterAce = boosterPack({
  id: 'booster-op02-ace',
  title: TITLE,
  hero: aceAlt,
  effects: (art) => pick(art, FIRE, [{ x: 8, y: 0, w: 64, h: 52 }]),
  at: [4, 38],
  foil: colors('060818', '0c1236', '161e56', '2a2a74', '5a2a7a', 'a03a5a', 'e8603a', 'ffb84a'),
  burst: [42, 66],
})

/** Whitebeard wrapper: a blood-red war sky that cracks open behind the old captain. */
const boosterWhitebeard = boosterPack({
  id: 'booster-op02-whitebeard',
  title: TITLE,
  hero: newgateLeader,
  effects: (art) => lines(art, CRACK, (_x, y) => y < 64),
  at: [2, 30],
  foil: colors('12060a', '2a0a10', '4c0e16', '761620', 'a42a26', 'd0503a', 'eca070', 'fbe8d0'),
  burst: [42, 56],
})

/** Kuzan wrapper: black foil freezing to ice blue and white around the ex-admiral on his wave. */
const boosterKuzan = boosterPack({
  id: 'booster-op02-kuzan',
  title: TITLE,
  hero: kuzanAlt,
  effects: (art) => lines(art, ICE, (x, y) => y >= 50 && (x >= 30 || y < 72)),
  at: [6, 26],
  foil: colors('04060c', '0a0e1a', '121a2c', '1c2a44', '2a4466', '3e6a92', '7ab0d4', 'e0f4ff'),
  burst: [36, 58],
})

export const BOOSTERS: readonly ProductDef[] = [boosterAce, boosterWhitebeard, boosterKuzan]
