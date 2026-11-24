import { boosterPack, heroFromCard, pick } from '../../products/booster-pokemon-base.ts'
import type { ProductDef } from '../../products/index.ts'
import { colors } from '../../toolkit/index.ts'
import { aerodactyl } from './aerodactyl.ts'
import { lapras } from './lapras.ts'
import { zapdos } from './zapdos.ts'

/**
 * Booster wrappers of Fossil (content/catalog.ts lists their ids), painted with the Basis-Set wrapper
 * (art/products/booster-pokemon-base.ts). Each hero is cut out of its card artwork and moved so that
 * its top clears the set ribbon; a few effects come along from the card (colours as in the card files).
 */
/** Amber chunks flying around Aerodactyl. */
const AMBER = colors('a4500e', 'e8942a', 'ffd470', 'fff6dc')
/** Lapras's song: the palest colour of the dawn sky, picked right of the head only. */
const SONG = colors('fff1c9')
/** Zapdos's radio mast, and the bolts and glow that crackle round it. */
const MAST = colors('1e1830', '3e3658', '6e6690', '5f8fe8', 'a8d4ff', 'f4fbff')

export const BOOSTERS: readonly ProductDef[] = [
  // amber foil behind the fossil flier; its wings span the pack under the ribbon, chunks of amber fly
  boosterPack({
    id: 'booster-pkm-fossil-aerodactyl',
    set: 'Fossil',
    hero: heroFromCard(aerodactyl, 2, 24, (art) => pick(art, AMBER, [{ x: 0, y: 16, w: 80, h: 72 }])),
    foil: colors('140c06', '2a1a0e', '4a2c14', '6e421a', '9a5e20', 'c88a30', 'ecc060', 'fff0c0'),
    burst: [42, 74],
  }),
  // dawn-sea foil, blue below and peach in the burst; Lapras swims on the dark band at the bottom and
  // its song rises beside the head
  boosterPack({
    id: 'booster-pkm-fossil-lapras',
    set: 'Fossil',
    hero: heroFromCard(lapras, -4, 46, (art) => pick(art, SONG, [{ x: 58, y: 14, w: 22, h: 22 }])),
    foil: colors('0a1028', '142050', '1e3a78', '2c5a9a', '5a80b8', 'a8a8c8', 'f0c8a8', 'fff0dc'),
    burst: [46, 78],
  }),
  // storm-violet foil; the thunder bird keeps the mast it perches on and the bolts that strike it
  boosterPack({
    id: 'booster-pkm-fossil-zapdos',
    set: 'Fossil',
    hero: heroFromCard(zapdos, 2, 30, (art) => pick(art, MAST, [{ x: 0, y: 16, w: 80, h: 72 }])),
    foil: colors('0e0818', '1c1030', '2e1850', '46227a', '6a34a0', '9a58c8', 'd8a8f0', 'fff8d8'),
    burst: [42, 80],
  }),
]
