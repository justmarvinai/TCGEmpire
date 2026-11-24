import { pick } from '../../products/booster-pokemon-base.ts'
import { boosterPack } from '../../products/booster-ygo-lob.ts'
import type { ProductDef } from '../../products/index.ts'
import { colors } from '../../toolkit/index.ts'
import { blackSkullDragon } from './black-skull-dragon.ts'
import { gateGuardian } from './gate-guardian.ts'
import { summonedSkull } from './summoned-skull.ts'

/** The set name on the ribbon of every Metal Raiders wrapper. */
const TITLE = ['Metal', 'Raiders'] as const

/** Colours of the card artworks that the wrappers take along as effects. */
const FIRE = colors('8a1a06', 'cc420c', 'f47c1a', 'ffbe3c', 'fff09a')
const BOLT = colors('9a86e0', 'fff08a', 'ffffff')
const WIND = colors('185a3e', '50b682', '94e2b2')
const SPARK = colors('deae2a', 'fff07a', 'f4fbff')

/** The booster wrappers of this set (content/catalog.ts lists their ids). Each hero is cut out of its card art. */
export const BOOSTERS: readonly ProductDef[] = [
  // Schw. Totenkopfdrache, the real cover card: the black dragon breathes its fire stream down the
  // left side of the pack, on molten amber foil
  boosterPack({
    id: 'booster-ygo-mrd-black-skull',
    hero: blackSkullDragon,
    title: TITLE,
    effects: (art) => pick(art, FIRE, [{ x: 0, y: 30, w: 44, h: 82 }]),
    at: [0, 36],
    foil: colors('0c0402', '1e0a04', '361206', '561e08', '7e300c', 'b04e12', 'e8861e', 'ffd870'),
    burst: [37, 65],
  }),
  // Herbeigerufener Totenkopf: the bone-white fiend between two forked bolts, on toxic green storm foil
  boosterPack({
    id: 'booster-ygo-mrd-summoned-skull',
    hero: summonedSkull,
    title: TITLE,
    effects: (art) => pick(art, BOLT, [{ x: 0, y: 0, w: 80, h: 40 }]),
    at: [-3, 36],
    foil: colors('020604', '04100a', '081c12', '0e2a1a', '163c24', '225630', '3e8a3e', 'c8f08a'),
    burst: [37, 65],
  }),
  // Torwächter: the three-part titan rising out of the ground in Kazejin's jade whirlwind, lightning
  // off its shoulders, on platinum foil (the one pack without a hue, so gold, jade and blue all show)
  boosterPack({
    id: 'booster-ygo-mrd-gate-guardian',
    hero: gateGuardian,
    title: TITLE,
    effects: (art) =>
      pick(art, WIND, [{ x: 12, y: 0, w: 56, h: 46 }]).or(pick(art, SPARK, [{ x: 0, y: 8, w: 80, h: 22 }])),
    at: [-3, 40],
    foil: colors('05060a', '0c0e14', '161a22', '222832', '323a46', '48525f', '7c8898', 'eef2f8'),
    burst: [37, 64],
  }),
]
