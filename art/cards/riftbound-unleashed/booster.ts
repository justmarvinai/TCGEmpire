import { boosterPack } from '../../products/booster-rb-ogn.ts'
import type { ProductDef } from '../../products/index.ts'
import type { Mask, Painter, Ramp } from '../../toolkit/index.ts'
import { colors, hex } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'
import { baronNashorUltimate } from './baron-nashor-ultimate.ts'
import { leblancSignature } from './leblanc-signature.ts'
import { viSignature } from './vi-signature.ts'

/**
 * Unleashed wrappers, painted like Origins (art/products/booster-rb-ogn.ts) with the set's plate. Each
 * shows a hero cut out of its Grail or Signature artwork (docs/sets/riftbound-unleashed.md), on a foil
 * that sets the hero's own colours off: the violet serpent Baron Nashor on acid lime, Vi's steel
 * gauntlets on gold, LeBlanc's violet gown on mirror-glass turquoise.
 */

/** Pixels of the artwork in the colours of `palette`, single pixels included (sparks). */
function inColors(art: Painter, palette: Ramp): Mask {
  const m = art.m()
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (palette.includes(art.get(x, y))) m.add(x, y)
  return m
}

/**
 * Baron Nashor as the wrapper shows him: the body is cut where the near lip of his pit covers it (row 86)
 * and its lowest segment repeats below, so the serpent rises from under the crimp instead of out of a
 * rock ledge.
 */
const baron: CardDef = {
  ...baronNashorUltimate,
  draw(p) {
    baronNashorUltimate.draw(p)
    p.subjectMask.minus(p.m().rect(0, 86, 80, 26))
    for (let y = 86; y < 92; y++)
      for (let x = 0; x < 80; x++)
        if (p.subjectMask.has(x, y - 7)) {
          p.set(x, y, p.get(x, y - 7))
          p.subjectMask.add(x, y)
        }
  },
}

/** Baron Nashor (Grail): jaws open, horns spread and both clawed tentacles raised. */
const boosterBaron = boosterPack({
  id: 'booster-rb-unl-baron',
  set: 'Unleashed',
  hero: baron,
  at: [-4, 31],
  foil: colors('060a02', '0f1a04', '1a2e06', '28460a', '3a640e', '529016', '84c42a', 'e0ff88'),
  burst: [36, 59],
})

/** Brick colours and outline of the Vi Signature artwork. */
const BRICK = colors('5a2028', '8a3a34', 'b85a44')
const VI_OUTLINE = hex('070812')

/**
 * Vi as the wrapper shows her: without the two flying bricks of the artwork that touch her silhouette.
 * The one on the tip of her upper left hair strand goes with that tip; the one on the edge of the
 * raised gauntlet becomes outline again.
 */
const vi: CardDef = {
  ...viSignature,
  draw(p) {
    viSignature.draw(p)
    p.subjectMask.minus(p.m().rect(24, 13, 8, 6))
    p.fill(inColors(p, BRICK).and(p.subjectMask), VI_OUTLINE)
  },
}

/** Cyan of Vi's gauntlet cores, her shock ring and the sparks. */
const CYAN = colors('1a8cb0', '4ae0f0', 'd2fcff')

/** Vi: the punch out of the picture, with its shock ring and sparks. */
const boosterVi = boosterPack({
  id: 'booster-rb-unl-vi',
  set: 'Unleashed',
  hero: vi,
  effects: (art) => inColors(art, CYAN),
  at: [-9, 32],
  foil: colors('100c02', '201804', '342806', '4c3c08', '6a560a', '92780e', 'c8a81c', 'fff49a'),
  burst: [30, 63],
})

/** Colours of the violet smoke round LeBlanc's feet. */
const SMOKE = colors('2a0e3e', '461868', '6a2a94', '4a4290')

/** LeBlanc: the sorceress with her staff, stepping out of violet smoke. */
const boosterLeblanc = boosterPack({
  id: 'booster-rb-unl-leblanc',
  set: 'Unleashed',
  hero: leblancSignature,
  effects: (art) => inColors(art, SMOKE).and(art.m().rect(0, 76, 80, 36)),
  at: [8, 30],
  foil: colors('020a0e', '04161a', '062226', '0a3238', '0e464e', '16626a', '2a929a', '9ceef0'),
  burst: [40, 58],
})

/** The booster wrappers of this set (content/catalog.ts lists their ids). */
export const BOOSTERS: readonly ProductDef[] = [boosterBaron, boosterVi, boosterLeblanc]
