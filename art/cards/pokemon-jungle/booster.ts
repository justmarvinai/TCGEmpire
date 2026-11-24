import { boosterPack, heroFromCard, pick } from '../../products/booster-pokemon-base.ts'
import type { ProductDef } from '../../products/index.ts'
import { colors } from '../../toolkit/index.ts'
import { flamara } from './flamara.ts'
import { knuddeluff } from './knuddeluff.ts'
import { sichlor } from './sichlor.ts'

/**
 * Booster wrappers of Dschungel (content/catalog.ts lists their ids), painted with the Basis-Set wrapper
 * (art/products/booster-pokemon-base.ts). Each hero is cut out of its card artwork and moved by
 * (dx, dy), where the artwork's top left corner lands on the 84×132 pack, so its feet stand on the
 * ground line; `burst` sits behind its head.
 */

/** Flamara's fire spiral in the top left of its artwork (flamara.ts), without the glow round it. */
const FIRE = colors('e85a1a', 'fca42c', 'ffe45e', 'fffbd8')
const SPIRAL = [{ x: 0, y: 14, w: 34, h: 34 }]
/** Sichlor's blurred wings beside its shoulders (sichlor.ts). */
const WING = colors('6fa894', 'c4ecd8')
const WINGS = [
  { x: 4, y: 34, w: 30, h: 24 },
  { x: 48, y: 34, w: 30, h: 24 },
]

export const BOOSTERS: readonly ProductDef[] = [
  // dusk-crimson foil with a golden burst behind the fire fox, which keeps its spiral of fire
  boosterPack({
    id: 'booster-pkm-jungle-flamara',
    set: 'Dschungel',
    hero: heroFromCard(flamara, 0, 33, (art) => pick(art, FIRE, SPIRAL)),
    foil: colors('140812', '2c0c1e', '501428', '7c1e26', 'b03a1e', 'e07a28', 'f8c060', 'fff2c0'),
    burst: [38, 78],
  }),
  // deep bamboo-teal foil behind the mantis, its wings still a blur
  boosterPack({
    id: 'booster-pkm-jungle-sichlor',
    set: 'Dschungel',
    hero: heroFromCard(sichlor, 1, 34, (art) => pick(art, WING, WINGS)),
    foil: colors('04101a', '08202c', '0c343e', '124c50', '1c6c64', '3a9486', '9cd4b4', 'f0fae0'),
    burst: [41, 80],
  }),
  // sunny meadow-lime foil behind the balloon rabbit
  boosterPack({
    id: 'booster-pkm-jungle-knuddeluff',
    set: 'Dschungel',
    hero: heroFromCard(knuddeluff, 1, 36),
    foil: colors('0e1a08', '1e3410', '34521a', '4e7424', '76982e', 'a8c040', 'e0e878', 'fffde0'),
    burst: [41, 86],
  }),
]
