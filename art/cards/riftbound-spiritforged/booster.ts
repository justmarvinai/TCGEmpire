import { boosterPack } from '../../products/booster-rb-ogn.ts'
import type { ProductDef } from '../../products/index.ts'
import type { Mask, Painter, Ramp } from '../../toolkit/index.ts'
import { colors } from '../../toolkit/index.ts'
import { ireliaSignature } from './irelia-signature.ts'
import { vayneSignature } from './vayne-signature.ts'
import { yoneSignature } from './yone-signature.ts'

/**
 * Spiritforged wrappers, painted like Origins (art/products/booster-rb-ogn.ts) with the set's plate. Each
 * shows the champion of a Signature card cut out of its artwork (docs/sets/riftbound-spiritforged.md), on
 * a foil that sets the champion's own colours off: Irelia's teal robe on orchid, Yone's black and red on
 * amber, Vayne's crimson coat on moonlit silver. The burst sits behind the champion's head; Irelia and
 * Vayne stand left of the middle so their sword and coat tails stay clear of the "14 Karten" medallion.
 */

/** Pixels of the artwork in the colours of `palette`, single pixels included (petals). */
function inColors(art: Painter, palette: Ramp): Mask {
  const m = art.m()
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (palette.includes(art.get(x, y))) m.add(x, y)
  return m
}

/** Petal colours of the Irelia Signature artwork. */
const PETALS = colors('8a2856', 'e0729a', 'ffc6d8')

/** Irelia (Grail): the dancer, her fan of blades and the sword under her feet; the petal spiral stays round her. */
const boosterIrelia = boosterPack({
  id: 'booster-rb-sfd-irelia',
  set: 'Spiritforged',
  hero: ireliaSignature,
  effects: (art) => inColors(art, PETALS),
  at: [-8, 33],
  foil: colors('0c0616', '180a28', '26103c', '361652', '4a1e6a', '682c8c', '9a4cbc', 'eebcf4'),
  burst: [32, 59],
})

/** Yone: the masked swordsman with both blades crossed, standing on the ground as on his bridge. */
const boosterYone = boosterPack({
  id: 'booster-rb-sfd-yone',
  set: 'Spiritforged',
  hero: yoneSignature,
  at: [-4, 38],
  foil: colors('0e0804', '1e1006', '30180a', '48240c', '66340e', '8c4c12', 'c0781e', 'ffd070'),
  burst: [36, 65],
})

/** The full moon of the Vayne Signature artwork (centre and radius in artwork pixels). */
const MOON = { x: 42, y: 36, r: 24 }

/**
 * Vayne: the huntress crouches in front of her full moon, which rises from behind the plate and is the
 * glow behind her head; her ponytail bursts over the plate's lower rim.
 */
const boosterVayne = boosterPack({
  id: 'booster-rb-sfd-vayne',
  set: 'Spiritforged',
  hero: vayneSignature,
  effects: (art) => art.m().disc(MOON.x, MOON.y, MOON.r).grown(1),
  at: [-7, 24],
  foil: colors('0a0b0f', '181b21', '282c35', '3a404c', '545d6e', '78849a', 'a8b4c8', 'eef2fa'),
  // the centre of the moon on the pack
  burst: [35, 60],
})

/** The booster wrappers of this set (content/catalog.ts lists their ids). */
export const BOOSTERS: readonly ProductDef[] = [boosterIrelia, boosterYone, boosterVayne]
