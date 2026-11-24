import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Uta (Alt-Art, Ultra). Brief: the diva floating, eyes closed, singing, one hand on her headset
 * microphone, the other reaching out, her two-tone hair loops flowing upward; above a sea of glow
 * sticks and crowd silhouettes, music notes forming wings behind her, a huge round stage light like a
 * moon. Full art, 80×112.
 *
 * Composition: Uta floats in the middle in front of the round stage light, eyes shut, singing; her
 * right hand at the microphone of her golden headset, her left arm reaching out over the crowd. Her
 * hair is white on one side and red on the other, and its two loops rise above her head. Two wings of
 * music notes spread from her back. Far below, the dark crowd raises a sea of pink and cyan glow
 * sticks. The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const VIOLET = colors('1a0c2e', '2c1448', '44206a', '622e8c')
const LIGHT = colors('a898d8', 'e6dcff', 'fffaff')
const RED = colors('6a1020', 'b0222e', 'e8504a')
const SKIN = colors('6a3a46', 'c07a78', 'f0b8a4', 'ffe0d0')
const TRIM = colors('4a4aa8', '7a7ae0')
const GOLD = colors('8a5a1a', 'e0a838', 'ffe080')
const PINK = colors('ff5ab4', 'ffc0e8')
const CYAN = colors('3ad8f0', 'b8f8ff')
const OUTLINE = hex('0c0614')

/** Uta's face: eyes closed with long lashes, a little blush, her mouth open in song. */
const FACE = [
  '..............',
  '..............',
  '.KKK......KKK.',
  'K...K....K...K',
  '..............',
  '.ss........ss.',
  '..............',
  '......mm......',
  '......mt......',
]
const FACE_KEY = { K: OUTLINE, s: SKIN[1], m: RED[0], t: RED[2] }

function stage(p: Painter): void {
  p.register(VIOLET).register(LIGHT)
  p.dither(null, VIOLET, (x, y) => 0.95 - Math.hypot(x - 40, y - 30) / 60 + Math.max(0, (y - 62) / 30) + noise(x, y, 7, 9) * 0.2, 0.8)
  // the stage light, huge and round like a moon, with a soft halo
  p.shine(true)
  const halo = p.m().disc(40, 30, 33)
  p.dither(halo, [VIOLET[3], LIGHT[0]], (x, y) => 1.5 - Math.hypot(x - 40, y - 30) / 30, 0.5)
  const moon = p.m().disc(40, 30, 28)
  p.fill(moon, LIGHT[1])
  p.fill(p.m().disc(36, 26, 22).and(moon), LIGHT[2])
  p.fill(moon.clone().minus(moon.moved(-2, -2)), LIGHT[0])
  p.shine(false)
}

/** The crowd far below: dark heads and raised arms, a sea of pink and cyan glow sticks. */
function crowd(p: Painter): void {
  const rand = rng(53)
  const dark = p.m().rect(0, 86, 80, 26)
  for (let row = 0; row < 3; row++) {
    const y = 76 + row * 5
    for (let x = -2 + row * 3; x < 84; x += 7) dark.disc(x + rand() * 2, y + rand() * 2, 2.6).rect(x - 3, y + 2, 7, 12)
  }
  p.fill(dark, VIOLET[0])
  p.fill(dark.facing([0, -1]).minus(p.m().rect(0, 88, 80, 24)), VIOLET[2])
  p.shine(true)
  for (let i = 0; i < 26; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = 68 + Math.floor(rand() * 18)
    const glow = rand() < 0.5 ? PINK : CYAN
    const lean = rand() < 0.5 ? -1 : 1
    p.fill(p.m().line(x, y, x + lean, y - 3), glow[0])
    p.px(x + lean, y - 4, glow[1])
  }
  p.shine(false)
}

/** An eighth note or a pair of beamed notes. */
const NOTE = ['..w.', '..ww', '..w.', '..w.', 'ww..', 'ww..']
const PAIR = ['.wwwww', '.w...w', '.w...w', 'ww..ww', 'ww..ww']

/** Two wings of music notes spreading from her back: a pale wing shape, notes along three feathers. */
function wings(p: Painter): void {
  p.shine(true)
  const colours = [LIGHT[2], PINK[1], CYAN[1]]
  let k = 0
  for (const side of [-1, 1]) {
    const x = (v: number) => 40 + side * v
    const wing = p
      .m()
      .poly([x(4), 46, x(14), 34, x(26), 22, x(34), 15, x(36), 22, x(33), 30, x(35), 38, x(31), 44, x(32), 51, x(26), 55, x(25), 62, x(16), 58, x(6), 54])
    p.dither(wing, [VIOLET[3], LIGHT[0]], (px, py) => 0.3 + Math.abs(px - 40) / 50 - (py - 15) / 90, 0.5)
    p.fill(wing.facing().minus(wing.facing([0, 1])), LIGHT[0])
    for (const [fx, fy, tx, ty] of [
      [12, 36, 34, 17],
      [12, 44, 33, 33],
      [12, 50, 30, 50],
    ] as const) {
      for (let j = 0; j < 3; j++) {
        const t = (j + 0.6) / 3
        const nx = x(fx + (tx - fx) * t)
        const ny = fy + (ty - fy) * t
        const c = colours[k++ % colours.length] ?? LIGHT[2]
        p.stamp(j % 2 === 0 ? NOTE : PAIR, Math.round(nx) - 3, Math.round(ny) - 3, { w: c }, side < 0)
      }
    }
  }
  p.shine(false)
}

function uta(d: Painter): void {
  const m = (): Mask => d.m()
  const left = (mask: Mask): Mask => mask.clone().and(m().rect(0, 0, 40, 112))
  const right = (mask: Mask): Mask => mask.clone().minus(m().rect(0, 0, 40, 112))
  const hair = (mask: Mask, o = {}): void => {
    d.part(left(mask), LIGHT, o)
    d.part(right(mask), RED, o)
  }
  // the two hair loops rising above her head, and the long hair behind her shoulders
  d.part(m().limb([35, 21, 29, 19, 25, 15, 26, 10, 31, 9, 34, 13, 35, 19], [2.2, 2.3, 2.3, 2.1, 2, 1.8, 1.7]), LIGHT, { bevel: 2 })
  d.part(m().limb([45, 22, 51, 22, 56, 21, 59, 18, 57, 15, 52, 16, 47, 20], [2.2, 2.3, 2.3, 2.1, 2, 1.8, 1.7]), RED, { bevel: 2 })
  hair(m().ellipse(40, 29, 11, 11).limb([31, 30, 28, 40, 27, 50], [5, 5, 3]).limb([49, 30, 52, 40, 53, 50], [5, 5, 3]), { bevel: 4 })
  // legs together, toes pointed, floating
  d.part(m().limb([42, 64, 45, 71, 41, 78, 39, 80], [2.4, 2.1, 1.7, 1.3]), SKIN, { bias: -1 })
  d.part(m().limb([37, 64, 36, 73, 35, 82], [2.4, 2, 1.4]), SKIN)
  // the white dress: puffed shoulders, a short flared skirt with violet trim
  const skirt = m().poly([34, 54, 46, 54, 54, 66, 26, 66])
  d.part(skirt, LIGHT, { bevel: 4 })
  d.fill(m().rect(26, 65, 29, 2).and(skirt.grown(1)), TRIM[1])
  d.part(m().poly([34, 41, 46, 41, 47, 50, 45, 56, 35, 56, 33, 50]), LIGHT, { bevel: 4 })
  d.part(m().rect(34, 52, 12, 3), TRIM, { bevel: 1 })
  // left arm reaching out over the crowd
  d.part(m().limb([46, 44, 54, 44, 62, 40], [2.4, 2.1, 1.9]), SKIN)
  d.part(m().ellipse(64, 39.5, 2.6, 2), SKIN, { bevel: 1 })
  d.fill(m().path([65, 38, 67, 36]).path([66, 40, 68, 39]), SKIN[2])
  // right arm raised to the microphone at her ear
  d.part(m().limb([34, 44, 29, 42, 29, 37], [2.4, 2.1, 1.9]), SKIN)
  for (const x of [34, 46]) d.part(m().ellipse(x, 43, 3.4, 2.8), LIGHT, { bevel: 2 })
  // neck and face, bangs parted over the forehead
  d.part(m().rect(38, 37, 4, 5), SKIN, { bevel: 1 })
  d.part(m().ellipse(40, 31, 7.5, 8.2), SKIN, { bevel: 5 })
  hair(m().poly([31, 22, 40, 19, 49, 22, 48, 28, 44, 26, 40, 27, 36, 26, 32, 28]), { bevel: 2 })
  d.stamp(FACE, 33, 27, FACE_KEY)
  // the golden headset: cones over the ears with pale blue bands, the microphone arm to her mouth
  for (const x of [31.5, 48.5]) {
    d.part(m().ellipse(x, 31, 2.6, 3.6), GOLD, { bevel: 2 })
    d.fill(m().rect(Math.floor(x) - 1, 32, 3, 1), CYAN[1])
  }
  d.fill(m().path([31, 34, 32, 37, 36, 38]), GOLD[0])
  d.part(m().ellipse(29.5, 36.5, 2.2, 1.8), SKIN, { bevel: 1 })
  d.px(36, 38, GOLD[2]).px(37, 38, GOLD[1])
}

export const utaAlt: CardDef = {
  id: 'op02-087',
  number: 87,
  name: 'Uta (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Lila',
  print: { cost: 8, power: 8000, type: 'FILM' },
  // the stage light, the wings of notes and the glow sticks shine; Uta and the crowd stay matt
  foil: 'painted',
  draw(p) {
    stage(p)
    crowd(p)
    wings(p)
    const d = p.layer()
    uta(d)
    p.subject(d, OUTLINE)
  },
}
