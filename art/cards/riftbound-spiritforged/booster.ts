import { boosterPack } from '../../products/booster-rb-ogn.ts'
import type { ProductDef } from '../../products/index.ts'
import type { Mask, Painter, Ramp } from '../../toolkit/index.ts'
import { colors, hex } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'
import { ireliaSignature } from './irelia-signature.ts'
import { vayneSignature } from './vayne-signature.ts'
import { yoneSignature } from './yone-signature.ts'

/**
 * Spiritforged wrappers, painted like Origins (art/products/booster-rb-ogn.ts) with the set's plate. Each
 * shows the champion of a Signature card cut out of its artwork (docs/sets/riftbound-spiritforged.md),
 * on a foil that sets the champion's own colours off: Irelia's teal robe on orchid, Yone's black and red
 * on amber, Vayne's crimson coat on moonlit silver.
 */

/** Pixels of the artwork in the colours of `palette`, single pixels included (petals). */
function inColors(art: Painter, palette: Ramp): Mask {
  const m = art.m()
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (palette.includes(art.get(x, y))) m.add(x, y)
  return m
}

/** Petal colours of the Irelia Signature artwork. */
const PETALS = colors('8a2856', 'e0729a', 'ffc6d8')

/** Irelia (Grail): the dancer with her fan of blades and the sword under her feet; the petal spiral stays round her. */
const boosterIrelia = boosterPack({
  id: 'booster-rb-sfd-irelia',
  set: 'Spiritforged',
  hero: ireliaSignature,
  effects: (art) => inColors(art, PETALS),
  at: [-7, 32],
  foil: colors('0c0616', '180a28', '26103c', '361652', '4a1e6a', '682c8c', '9a4cbc', 'eebcf4'),
  burst: [33, 58],
})

/** Yone: the masked swordsman with both blades crossed, standing on the ground like on his bridge. */
const boosterYone = boosterPack({
  id: 'booster-rb-sfd-yone',
  set: 'Spiritforged',
  hero: yoneSignature,
  at: [-3, 38],
  foil: colors('0e0804', '1e1006', '30180a', '48240c', '66340e', '8c4c12', 'c0781e', 'ffd070'),
  burst: [37, 64],
})

/** The moon of the Vayne Signature artwork, and the outline and coat lining of the huntress. */
const MOON = { x: 42, y: 36, r: 24 }
const VAYNE_OUTLINE = hex('04050c')
const VAYNE_LINING = hex('1c1a2e')

/**
 * Vayne as the wrapper shows her: her right coat tail ends in a straight hem that rises towards its tip,
 * so the whole tail stays clear of the "14 Karten" medallion. The new hem gets the coat's dark lining
 * and the outline, like the rest of the coat.
 */
const vayne: CardDef = {
  ...vayneSignature,
  draw(p) {
    vayneSignature.draw(p)
    const cut = p.m().poly([56, 64, 71, 57.5, 80, 57.5, 80, 69.5, 56, 69.5])
    p.subjectMask.minus(cut)
    const hem = p.subjectMask.clone().and(cut.moved(0, -1)).and(p.m().rect(55, 0, 25, 112))
    p.fill(hem, VAYNE_OUTLINE)
    p.fill(p.subjectMask.clone().and(hem.moved(0, -1).or(hem.moved(0, -2))).minus(hem), VAYNE_LINING)
  },
}

/** Vayne: the huntress crouches in front of her full moon, which rises behind the plate. */
const boosterVayne = boosterPack({
  id: 'booster-rb-sfd-vayne',
  set: 'Spiritforged',
  hero: vayne,
  effects: (art) => art.m().disc(MOON.x, MOON.y, MOON.r).grown(1),
  at: [-3, 27],
  foil: colors('05070e', '0b0f1a', '131a2a', '1d263c', '2a3652', '3e4e70', '66789c', 'c2cee6'),
  burst: [39, 63],
})

/** The booster wrappers of this set (content/catalog.ts lists their ids). */
export const BOOSTERS: readonly ProductDef[] = [boosterIrelia, boosterYone, boosterVayne]
