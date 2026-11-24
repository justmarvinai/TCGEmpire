import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Vayne, Hunter (Signature), Ultra. Our own night huntress at a spirit festival: red-lensed shades,
 * a black ponytail, a long crimson coat over a black suit, a bandolier of silver bolts. She crouches
 * on the ridge of a temple roof and aims a small crossbow straight down at the viewer, a bolt of
 * spirit light glowing on its tip. Full art, 80×112.
 *
 * Composition: a huge moon sits right behind her head and shoulders, so her shades and hair read as a
 * dark silhouette on pale light; the coat tails flare out to both sides like the wings of a bird of
 * prey. The crossbow and the glowing bolt sit in the middle of the picture. White petals blow in
 * from the left. The frame's plates cover rows 0–14 and 90–112.
 */
const SKY = colors('060818', '0c1230', '17204a', '25346a')
const MOON = colors('7c98c8', 'b4c8e6', 'e6eefa')
const ROOF = colors('04050c', '0d1122', '1a2038', '2c3654')
const COAT = colors('2c0410', '5c0a1c', '98142a', 'd02c40')
const SUIT = colors('0a0914', '1c1a2e', '322f4c', '4c4a70')
const SKIN = colors('8a4a48', 'd8968a', 'f6cab4')
const STEEL = colors('3c4460', '7c88a8', 'c8d4e8')
const SPIRIT = colors('e0406a', 'ff9ab4', 'fff4f6')
const GOLD = colors('a87a30', 'f0c868')
const OUTLINE = ROOF[0]

/** The moon: centre and radius. */
const MX = 42
const MY = 36
const MR = 24

function night(p: Painter): void {
  // sky, brightening into a wide halo round the moon
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const d = Math.hypot(x - MX, y - MY)
      const halo = Math.max(0, 1 - (d - MR) / 26)
      return 0.08 + halo * 0.9 + noise(x, y, 3, 9) * 0.1
    },
    0.7,
  )
  stars(p, rng(4), 16, [MOON[1], MOON[2], SPIRIT[1]], { x: 2, y: 2, w: 76, h: 46 })

  // the moon: a pale disc, brightest towards the top left, with a few soft grey seas
  const moon = p.m().disc(MX, MY, MR)
  p.fill(moon, MOON[1])
  p.fill(p.m().disc(MX - 5, MY - 5, MR - 3).and(moon), MOON[2])
  const seas = p.m().blob(53, 44, 7, 5, 2, 0.3).blob(58, 30, 4, 5, 5, 0.3).blob(30, 49, 5, 3.5, 6, 0.3).and(moon)
  seas.each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, MOON[0])
    else if (p.get(x, y) === MOON[2]) p.set(x, y, MOON[1])
  })
  p.fill(moon.outerEdge(), MOON[0])
  // a thin cloud drifting across the lower moon
  const cloud = p.m().blob(26, 57, 15, 1.5, 3, 0.3).blob(60, 54, 12, 1.3, 4, 0.3)
  p.fill(cloud, SKY[3])
  p.fill(cloud.facing([0, -1]), MOON[0])
  p.shine(false)

  // far pagodas on both sides, lanterns glowing in their eaves
  for (const [cx, base] of [
    [5, 80],
    [75, 79],
  ] as const) {
    const tower = p.m()
    for (let k = 0; k < 4; k++) {
      const y = base - k * 8.5
      const w = 12 - k * 2.2
      tower.poly([cx - w, y, cx - w * 0.5, y - 3, cx + w * 0.5, y - 3, cx + w, y, cx + w * 0.6, y + 1.5, cx - w * 0.6, y + 1.5])
      tower.rect(cx - w * 0.45, y + 1, w * 0.9, 6)
    }
    tower.rect(cx - 0.5, base - 40, 1, 7)
    p.fill(tower, ROOF[1])
    p.fill(tower.facing([0, -1]), SKY[3])
    for (let k = 0; k < 4; k++) {
      const y = base - k * 8.5 + 2
      const w = (12 - k * 2.2) * 0.6
      for (const x of [cx - w, cx + w]) p.px(Math.round(x), Math.round(y), GOLD[1]).px(Math.round(x), Math.round(y) + 1, COAT[2])
    }
  }
}

/** The temple roof she crouches on: a ridge beam with curled end tiles, rows of round tiles below. */
function roof(p: Painter): void {
  p.register(ROOF)
  const slope = p.m().rect(0, 77, 80, 35)
  p.fill(slope, ROOF[1])
  for (let x = 1; x < 80; x += 5) {
    const row = p.m().rect(x, 79, 3, 33)
    p.fill(row, ROOF[2])
    p.fill(row.facing([-1, 0]), ROOF[3])
  }
  for (let y = 84; y < 112; y += 5) p.fill(p.m().rect(0, y, 80, 1), ROOF[0])
  // the ridge beam, rising at both ends into curled end tiles
  const ridge = p.m().poly([0, 70, 6, 73, 14, 74.5, 40, 75, 66, 74.5, 74, 73, 80, 70, 80, 79.5, 0, 79.5])
  p.shade(ridge, ROOF, { bevel: 2 })
  for (const s of [1, -1]) {
    const x = (v: number): number => 40 + (v - 40) * s
    const end = p.m().poly([x(1), 72, x(2), 64, x(6), 62, x(9), 64.5, x(7.5), 67, x(5), 66, x(5.5), 72])
    p.shade(end, ROOF, { bevel: 2 })
  }
  // moonlight along the top of the ridge
  p.fill(ridge.facing([0, -1]), MOON[0])
}

/** Shades over the eyes: a dark frame, red lenses darkening downwards. */
const SHADES = ['kkkkkkkkkkk', 'krrrk.krrrk', '.kddk.kddk.']

function huntress(d: Painter): void {
  const m = (): Mask => d.m()

  // coat tails flaring out to both sides like wings, the black lining showing underneath
  const tails = m()
    .poly([36, 48, 31, 52, 24, 55, 16, 57, 9, 58, 3.5, 60, 8, 62, 5.5, 65, 11.5, 65, 10.5, 68.5, 17, 67.5, 19, 71.5, 24, 67, 30, 64.5, 35, 61, 38.5, 56])
    .poly([44, 48, 50, 51, 58, 53, 66, 53, 72, 51, 77, 49.5, 73, 55, 76.5, 58, 70, 59, 71, 62.5, 65, 62.5, 63, 66.5, 58, 64.5, 51, 62.5, 45.5, 58.5, 41.5, 55])
  d.part(tails, COAT, { bias: -1, bevel: 4 })
  d.fill(tails.clone().minus(tails.moved(0, -2)), SUIT[1])
  for (const fold of [
    [35, 55, 26, 60, 14, 62],
    [45, 55, 56, 59, 68, 57],
  ]) {
    d.fill(m().path(fold).and(tails.shrunk(1)), COAT[0])
  }

  // the back of the coat hanging down between the legs to the ridge
  const back = m().poly([34.5, 52, 46, 52, 48.5, 74.5, 31.5, 74.5])
  d.part(back, COAT, { bias: -1, bevel: 3 })
  d.fill(m().path([37, 56, 36, 74]).path([43, 56, 44.5, 74]).and(back.shrunk(1)), COAT[0])

  // kneeling leg: the thigh down to the knee on the ridge, the boot tucked behind
  d.part(m().limb([44.5, 55, 47.5, 63, 50, 70.5], [3.6, 3.3, 3]), SUIT, { bevel: 3 })
  const heel = m().poly([51, 70, 56, 71, 59, 75.5, 50.5, 75.5])
  d.part(heel, SUIT, { bevel: 2 })
  d.fill(m().path([52, 71, 56, 72]).and(heel), COAT[2])
  d.part(m().ellipse(50.5, 72, 3, 2.6), SUIT, { bevel: 2 })

  // raised leg: the knee pulled up towards the viewer, the shin dropping to the boot on the ridge
  d.part(m().limb([36.5, 55, 32.5, 58.5], 3.6), SUIT, { bevel: 3 })
  d.part(m().limb([31, 61, 30.5, 67, 31, 72.5], [3.2, 2.9, 2.7]), SUIT, { bevel: 3 })
  const boot = m().poly([27.5, 66, 34, 66, 34.5, 72, 37, 73.5, 37, 75.5, 26.5, 75.5, 27, 71])
  d.part(boot, SUIT, { bevel: 2 })
  d.fill(m().rect(27, 66, 8, 2).and(boot.grown(1)), COAT[2])
  d.fill(m().rect(27, 66, 8, 1).and(boot.grown(1)), COAT[3])
  d.px(33, 70, GOLD[1])
  d.part(m().ellipse(31.5, 59.5, 3.6, 3.2), SUIT, { bevel: 2.5 })

  // body in the black suit with a bandolier of bolts, the open coat over it
  const torso = m().poly([33, 38, 47, 38, 46.5, 46, 45, 54, 35, 54, 33.5, 46])
  d.part(torso, SUIT, { bevel: 4 })
  const strap = m().path([35, 39, 45.5, 50]).path([36, 39, 46, 49.5])
  d.fill(strap.and(torso), SUIT[0])
  for (const [x, y] of [
    [38, 42],
    [41, 45],
  ] as const) {
    d.px(x, y, STEEL[2])
  }
  const coat = m()
    .poly([31.5, 37.5, 37, 37, 36.5, 46, 35.5, 54, 32, 55, 31, 46])
    .poly([43, 37, 48.5, 37.5, 49, 46, 48, 55, 44.5, 54, 43.5, 46])
  d.part(coat, COAT, { bevel: 3 })

  // arms reaching forward and down to the crossbow, black cuffs at the wrists
  d.part(m().limb([33.5, 39.5, 30, 45, 35, 50.5], [3, 2.7, 2.5]), COAT)
  d.part(m().limb([46.5, 39.5, 50, 45, 45, 50.5], [3, 2.7, 2.5]), COAT)
  d.part(m().ellipse(34.5, 49.5, 2.6, 2.2).ellipse(45.5, 49.5, 2.6, 2.2), SUIT, { bevel: 1.5 })

  // high flared collar framing the jaw
  const collar = m().poly([32.5, 39, 33.8, 33, 36.5, 35, 37.5, 36.5, 42.5, 36.5, 43.5, 35, 46.2, 33, 47.5, 39])
  d.part(collar, COAT, { bevel: 2 })
  d.fill(m().poly([36.5, 34.5, 43.5, 34.5, 42.5, 37, 37.5, 37]).and(collar), SUIT[1])

  // the crossbow: a recurve bow across the stock, foreshortened, its bolt pointing at the viewer
  const limbs = m()
    .limb([40, 51, 32.5, 50, 26.5, 47.5, 23, 44.5, 21.5, 46.5], [1.6, 1.3, 1.1, 0.9, 0.7])
    .limb([40, 51, 47.5, 50, 53.5, 47.5, 57, 44.5, 58.5, 46.5], [1.6, 1.3, 1.1, 0.9, 0.7])
  d.part(limbs, STEEL, { bevel: 1.5 })
  d.fill(m().path([23, 45, 40, 46, 57, 45]).minus(limbs), MOON[2])
  const stock = m().poly([38.5, 45.5, 41.5, 45.5, 42.5, 56.5, 37.5, 56.5])
  d.part(stock, STEEL, { bevel: 1.5 })
  d.fill(m().rect(37, 54, 6, 1).and(stock), COAT[2])
  d.part(m().disc(37, 52, 2.1).disc(43, 52, 2.1), COAT.slice(1), { bevel: 1.5 })

  // neck, head, hair
  d.part(m().limb([40, 32.5, 40, 36], 2), SKIN, { bias: -1 })
  const head = m().ellipse(40, 27.5, 5, 5.6).poly([35.2, 28, 36, 31.5, 38.5, 33.6, 41.5, 33.6, 44, 31.5, 44.8, 28])
  d.part(head, SKIN, { bevel: 3, bias: 1 })
  // hair: a swept fringe, thin locks down the cheeks, a high ponytail streaming to the right
  const hair = m()
    .ellipse(40, 24, 5.8, 4)
    .poly([34.5, 24, 35, 28.5, 36.5, 26.5, 37.5, 27.5, 39, 25.5, 41, 26, 43, 25, 45.5, 24.5])
    .limb([35, 25, 34.3, 28, 34.6, 31.5], [1.4, 1.2, 0.6])
    .limb([45, 25, 45.6, 28, 45.3, 30.5], [1.3, 1.1, 0.5])
    .limb([44, 20.5, 49, 19.5, 54, 22, 58.5, 26.5, 61, 31.5, 64, 35], [2.2, 2.6, 2.6, 2.2, 1.5, 0.6])
  d.part(hair, SUIT, { bevel: 2.5 })
  d.fill(m().path([46, 20, 50.5, 20, 55, 23.5, 59, 28.5]).path([38.5, 21, 36.5, 24]).path([41.5, 21.5, 43.5, 23.5]).and(hair.shrunk(1)), SUIT[0])
  d.part(m().rect(44, 19.5, 2, 3), GOLD, { bevel: 1 })
  d.stamp(SHADES, 35, 27, { k: OUTLINE, r: COAT[3], d: COAT[2] })
  d.px(36, 28, MOON[2]).px(42, 28, MOON[2])
  d.stamp(['s..', '...', 'mmm'], 39, 30, { s: SKIN[1], m: SKIN[0] })

  // the moon behind her lights the rims: silver on the coat, a cold blue on hair, suit and boots
  const body = d.mask()
  const rim = body
    .facing([0, -1, -1, 0, 1, 0])
    .minus(body.facing([0, 1]))
    .minus(m().rect(0, 47, 80, 65))
  rim.each((x, y) => {
    const c = d.get(x, y)
    if (COAT.includes(c)) d.set(x, y, MOON[0])
    else if (SUIT.includes(c)) d.set(x, y, SUIT[3])
  })
  body
    .facing([-1, 0])
    .and(m().rect(0, 55, 80, 21))
    .each((x, y) => {
      if (SUIT.includes(d.get(x, y))) d.set(x, y, SUIT[3])
    })
}

/** Petal shapes, white with a pink edge. */
const PETALS = [['ww.', '.wp'], ['.w', 'wp'], ['w.', 'wp', '.p']] as const

/** The bolt of spirit light on the crossbow, and petals blowing past. */
function light(p: Painter): void {
  p.shine(true)
  const [x, y] = [40, 57]
  for (let k = 2; k <= 7; k++) {
    const c = k < 4 ? SPIRIT[1] : SPIRIT[0]
    p.px(x - k, y, c).px(x + k, y, c)
  }
  for (let k = 2; k <= 5; k++) {
    const c = k < 4 ? SPIRIT[1] : SPIRIT[0]
    p.px(x, y - k, c).px(x, y + k, c)
  }
  p.stamp(['.p.', 'pwp', '.p.'], x - 1, y - 1, { p: SPIRIT[1], w: SPIRIT[2] })
  for (const [dx, dy] of [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ] as const) {
    p.px(x + dx, y + dy, SPIRIT[0])
  }

  const near = p.subjectMask.grown(1)
  const rand = rng(23)
  let placed = 0
  for (let i = 0; i < 60 && placed < 11; i++) {
    const px = 2 + Math.floor(rand() * 74)
    const py = 15 + Math.floor(rand() * 72)
    const petal = PETALS[Math.floor(rand() * PETALS.length)] ?? PETALS[0]
    let free = true
    petal.forEach((row, j) => {
      for (let k = 0; k < row.length; k++) if (row[k] !== '.' && near.has(px + k, py + j)) free = false
    })
    if (!free) continue
    p.stamp(petal, px, py, { w: MOON[2], p: SPIRIT[1] })
    placed++
  }
  p.shine(false)
}

export const vayneSignature: CardDef = {
  id: 'rb-sfd-081',
  number: 81,
  name: 'Vayne, Hunter (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Fury',
  // the sky, the moon, the stars, the spirit bolt and the petals shine; huntress and roof stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    roof(p)
    const d = p.layer()
    huntress(d)
    p.subject(d, OUTLINE)
    light(p)
  },
}
