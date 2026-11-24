import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Pridestalker (Signature), Ultra. Our own lion-man hunter: tawny fur, a shaggy dark mane, a leather
 * harness hung with a necklace of trophy teeth, and a long steel blade. He crouches on the skull of a
 * giant horned beast at the edge of a cliff, one eye burning amber, the blade drawn back, while the
 * jungle canopy sinks into the dusk below. Full art, 80×112.
 *
 * Composition: he faces left over the drop, coiled to pounce; the skull fills the foot of the picture,
 * its horn sweeping up to the right; the blade crosses the amber glow of the horizon behind his head.
 * The frame's plates cover rows 0–14 and 90–112.
 */
const SKY = colors('0a1616', '16261e', '3c2e1c', '8a4a1c', 'd47a26', 'fcc050')
const CANOPY = colors('061210', '0e2418', '1a3a20', '2e5628')
const ROCK = colors('120e10', '2a2220', '4a3c30')
const BONE = colors('5a4a3a', '9a8a6c', 'd4c8a4', 'f6f0dc')
const FUR = colors('5a2c12', '9c5a24', 'd8963c', 'f6cc78')
const MANE = colors('26100c', '50220f', '80381a', 'b05a26')
const STEEL = colors('2a3038', '6a7484', 'c8d0dc')
const EMBER = hex('fff4c0')
const OUTLINE = hex('080606')

function dusk(p: Painter): void {
  // sky: night green at the top, an amber glow along the horizon behind the hunter
  p.shine(true)
  p.dither(
    p.m().rect(0, 0, 80, 72),
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot((x - 40) * 0.6, (y - 74) * 1.5) / 36) * 0.3
      return Math.pow(Math.min(1, y / 72), 2.6) + glow + noise(x, y, 3, 8) * 0.06
    },
    0.8,
  )
  stars(p, rng(4), 10, [SKY[4], BONE[2]], { x: 26, y: 2, w: 50, h: 18 })
  p.shine(false)

  // the canopy below the cliff: a far layer lit by the glow, a near layer in shadow, mist between
  const far = p.m().rect(0, 70, 80, 42)
  for (let x = -4; x < 84; x += 7) far.blob(x, 69 + ((x * 7) % 5), 5.5, 4, x + 40, 0.3)
  p.fill(far, CANOPY[2])
  p.fill(far.facing([0, -1]), SKY[3])
  const near = p.m().rect(0, 82, 80, 30)
  for (let x = -2; x < 84; x += 9) near.blob(x, 81 + ((x * 3) % 4), 7, 5, x + 90, 0.3)
  p.dither(near, CANOPY.slice(0, 3), (x, y) => 0.55 - (y - 76) / 30 + noise(x, y, 5, 4) * 0.3, 0.6)
  p.fill(near.facing([0, -1]), CANOPY[3])
  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [6, 77, 12, 1],
    [30, 79, 10, 2],
    [62, 76, 14, 3],
  ] as const) {
    mist.blob(x, y, rx, 2.2, seed, 0.3)
  }
  p.dither(mist.minus(near), [CANOPY[3], SKY[2], SKY[3]], (x, y) => 0.4 + noise(x, y, 7, 3) * 0.6, 0.6)

  // the cliff top the skull rests on, falling away to the left
  const cliff = p.m().poly([14, 112, 18, 90, 24, 86, 40, 85, 62, 84, 80, 83, 80, 112])
  p.register(ROCK)
  p.shade(cliff, ROCK, { bevel: 3 })
  p.fill(cliff.facing([0, -1]), BONE[0])
}

/** The skull of a giant horned beast, its snout to the left, one great horn curling up behind. */
function skull(d: Painter): void {
  const m = (): Mask => d.m()
  // the horn on the far side, then the near horn sweeping back and up
  d.part(m().limb([53, 70, 62, 64, 69, 55, 70, 46], [3.6, 3.2, 2.4, 1]), BONE, { bias: -1, bevel: 3 })
  const head = m()
    .poly([17, 76, 22, 71, 32, 67.5, 44, 66, 54, 67, 60, 72, 61, 80, 55, 86.5, 40, 87, 30, 85, 22, 84, 16.5, 81])
    .ellipse(50, 74, 10, 9)
  d.part(head, BONE, { bevel: 6 })
  // brow ridge, eye socket, nose holes, the row of fangs along the upper jaw
  d.fill(m().ellipse(38, 74.5, 5, 4).and(head.shrunk(1)), MANE[0])
  d.fill(m().ellipse(38.5, 75.5, 3, 2.4).and(head.shrunk(1)), ROCK[0])
  d.fill(m().path([31, 70, 37, 69, 44, 70.5]).and(head), BONE[3])
  d.fill(m().ellipse(21.5, 78.5, 1.6, 1.4), MANE[0])
  d.fill(m().path([17, 83, 50, 86]).and(head.grown(1)), BONE[0])
  for (const x of [20, 25, 30, 35, 41]) {
    const fang = m().poly([x, 84, x + 3, 84.5, x + 1.2, 88.5])
    d.part(fang, BONE, { bevel: 1.5 })
  }
  for (const crack of [
    [48, 68, 50, 73, 49, 77],
    [55, 78, 58, 82],
  ]) {
    d.fill(m().path(crack).and(head.shrunk(1)), BONE[0])
  }
  d.part(m().limb([56, 68, 64, 63, 71, 57, 74, 48, 72, 40], [3.8, 3.4, 2.8, 1.8, 0.6]), BONE, { bevel: 3 })
  for (const t of [[62, 63], [68, 58.5], [71.5, 52]] as const) {
    d.fill(m().path([t[0] - 2, t[1] - 2, t[0] + 2, t[1] + 2]).and(d.mask()), BONE[1])
  }
}

function hunter(d: Painter): void {
  const m = (): Mask => d.m()

  // tail lashing up behind, a dark tuft at its end
  d.part(m().limb([51, 53, 59, 52, 64, 46, 63, 38], [2.2, 1.9, 1.6, 1.3]), FUR, { bias: -1, bevel: 2 })
  d.part(m().ellipse(62.5, 36.5, 2.3, 3.2, 20), MANE, { bevel: 2 })

  // far arm drawn back over the shoulders, the blade raised behind the mane
  d.part(m().limb([43, 38, 50, 32.5, 55, 27.5], [3.6, 3.1, 2.7]), FUR, { bias: -1 })
  d.part(m().limb([51.5, 31, 53.5, 29], 3), MANE.slice(0, 3), { bevel: 1.5 })
  const blade = m().poly([54, 25.5, 59, 20, 66, 16, 73, 15.5, 69, 18.5, 62.5, 23.5, 57.5, 29])
  d.part(blade, STEEL, { bevel: 2 })
  d.fill(m().path([57, 25, 62, 20.5, 71, 16]).and(blade), STEEL[2])
  d.part(m().limb([52.5, 30, 56, 26], 1.6), MANE, { bevel: 1 })
  d.part(m().disc(56.5, 25.5, 2.1), BONE, { bevel: 1.5 })
  d.part(m().ellipse(54, 28.5, 2.8, 2.5), FUR, { bevel: 2 })

  // far leg folded high behind, the foot gripping the skull
  d.part(m().limb([48, 52, 56, 57, 53, 65.5], [4.4, 3.6, 2.6]), FUR, { bias: -1, bevel: 3 })
  d.part(m().poly([48, 63.5, 56, 63.5, 57, 68, 47, 68]), FUR, { bias: -1, bevel: 2 })

  // the body coiled low and forward: shoulders high, a deep chest, the belly tucked
  const torso = m().poly([30, 42, 37, 35, 46, 35.5, 52, 42, 52, 51, 47, 56, 39, 55, 33, 50])
  d.part(torso, FUR, { bevel: 7 })

  // a hide kilt on the hips
  const kilt = m().poly([41, 50, 50, 47.5, 54, 52, 52, 59, 48, 56.5, 44, 59])
  d.part(kilt, CANOPY.slice(1), { bevel: 2 })
  d.fill(m().path([42, 51, 53, 48.5]).and(kilt), MANE[1])

  // near leg: the knee drawn up under the chest, the clawed foot on the brow of the skull
  d.part(m().limb([45, 53, 36, 56, 31.5, 61, 31, 65.5], [4.6, 3.8, 3, 2.4]), FUR, { bevel: 4 })
  d.part(m().poly([25, 63.5, 33, 63, 34, 67.5, 24, 68]), FUR, { bevel: 2 })
  for (const x of [24, 26.5, 29]) d.px(x, 68, BONE[3])

  // near arm reaching down the brow of the skull, a leather bracer, claws out
  d.part(m().limb([33, 42, 26, 50, 21, 57, 19, 64], [3.7, 3.2, 2.7, 2.3]), FUR)
  d.part(m().limb([21.5, 56, 20.5, 59.5], 2.9), MANE.slice(0, 3), { bevel: 1.5 })
  d.part(m().ellipse(18.5, 64.5, 3, 2.4), FUR, { bevel: 2 })
  for (const x of [15.5, 17.5, 19.5]) d.px(x, 67, BONE[3])

  // the mane: a great shaggy ruff behind the face, down the neck and over the chest
  const mane = m()
    .ellipse(32, 33, 10.5, 11.5)
    .poly([28, 22, 40, 22, 47, 29, 45, 38, 36, 44])
    .poly([35, 24, 41, 16.5, 41.5, 24])
    .poly([39, 25, 47, 21, 45, 28])
    .poly([42, 28, 51, 27.5, 45, 33])
    .poly([43, 33, 51, 37, 43, 38.5])
    .poly([40, 38, 46, 44, 38, 42])
    .poly([28, 23, 30.5, 16, 34, 22.5])
    .poly([31.5, 22.5, 35.5, 15.5, 37, 23])
    .poly([21, 39, 22.5, 46, 26, 40])
    .poly([25, 42, 27.5, 49.5, 30.5, 42])
    .poly([30, 43, 33.5, 49, 36, 42])
  d.part(mane, MANE, { bevel: 6 })
  for (const lock of [
    [33, 27, 39, 19],
    [36, 29, 45, 23],
    [37, 32, 48, 29.5],
    [38, 36, 48, 36.5],
    [37, 40, 43, 43],
    [29, 26, 30, 19],
    [24, 41, 25, 45],
    [28, 43, 29, 48],
    [32, 43, 33, 47],
  ]) {
    d.fill(m().path(lock).and(mane.shrunk(1)), MANE[3])
  }

  // the head in profile: a long flat muzzle, heavy brow, broad nose, the jaw set
  const face = m().poly([27, 25, 22, 25.5, 17, 28, 12.5, 30.5, 12, 34, 14, 36.5, 19, 37, 21, 39.5, 26, 40, 29.5, 36, 30, 29])
  d.part(face, FUR, { bevel: 4, bias: 1 })
  d.part(m().ellipse(28.5, 23.5, 2.2, 2.4), FUR, { bevel: 2 })
  d.fill(m().ellipse(28.5, 23.8, 1, 1.2), MANE[1])
  d.stamp(
    [
      '.......bbbbb',
      '........ggb.',
      'nn..........',
      'nn..........',
      '............',
      '..mmmm......',
      '...w........',
    ],
    12,
    29,
    { b: FUR[0], g: EMBER, n: MANE[0], m: FUR[0], w: BONE[3] },
  )
  d.fill(m().path([20, 39.5, 26, 40]).and(face), FUR[1])

  // the necklace of trophy teeth under the chin
  d.fill(m().path([26, 41.5, 30, 45, 35, 46.5, 40, 45]), BONE[0])
  for (const [x, y] of [
    [27, 42],
    [29.5, 44.5],
    [32.5, 46],
    [35.5, 46.5],
    [38.5, 45.5],
  ] as const) {
    d.stamp(['w', 'w', 'k'], x, y + 1, { w: BONE[3], k: BONE[1] })
  }

  // the horizon glow lights his underside
  d.tone(d.mask().facing([0, 1]).minus(mane), 1)
}

/** The burning eye and its glow. */
function eye(p: Painter): void {
  p.shine(true)
  for (const [x, y, c] of [
    [19, 30, SKY[5]],
    [18, 31, SKY[4]],
    [23, 30, SKY[4]],
  ] as const) {
    p.px(x, y, c)
  }
  p.shine(false)
}

export const rengarSignature: CardDef = {
  id: 'rb-unl-080',
  number: 80,
  name: 'Rengar, Pridestalker (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { domain2: 'Body' },
  // the dusk sky, its stars and the burning eye shine; hunter, skull, canopy and cliff stay matt
  foil: 'painted',
  draw(p) {
    dusk(p)
    const d = p.layer()
    skull(d)
    hunter(d)
    p.subject(d, OUTLINE)
    eye(p)
  },
}
