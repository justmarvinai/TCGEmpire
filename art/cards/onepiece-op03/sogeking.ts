import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Sogeking (Alt-Art, Ultra, Blue). Brief: the masked sniper hero singing his own song on a rooftop at
 * sunset. Full art, 80×112.
 *
 * Composition: on the ridge of a tiled roof stands Sogeking, one boot up on a chimney, a hand on his
 * chest, the other arm flung up high with his big slingshot, singing his anthem to the sky. The golden
 * mask with its ring of sun rays hides his face down to the long nose, his black curls bush out behind
 * it; a red cape streams out to the right. Behind him the sun sets into the sea, a small island stands
 * on the horizon, and music notes drift up out of the picture. The frame covers the outer 4 pixels
 * and its plates rows 1–13 and 90–108.
 */
const SKY = colors('1a3488', '2c58b4', '5a86d0', 'c07a96', 'f0a050', 'ffd27a')
const SUN = hex('fff0b0')
const ISLE = hex('2a2048')
const ROOF = colors('4a1812', '8a3222', 'c05a3a')
const GOLD = colors('9a6a1c', 'e8b83a', 'fff0b0')
const SKIN = colors('6a2e2a', 'b8684a', 'eda478', 'ffd6a8')
const HAIR = colors('1c1622', '3a3044', '5a4a60')
const CAPE = colors('4a0a1a', '8e1426', 'c8283a')
const TUNIC = colors('0e3a44', '1a6a70', '2ea0a0')
const LEATHER = colors('3a2014', '6e4428')
const OUTLINE = hex('0e0a1a')
/** Colours of the music notes in the sky, for the booster wrapper's cut-out. */
export const NOTE_INK = [OUTLINE, SUN]

const HORIZON = 60

/**
 * His head, tipped up in song: the golden mask over his face with two round eye holes, his mouth wide
 * open below it. The long nose and the ring of rays are painted on top.
 */
const FACE = [
  '.GGgggggggggggg.',
  'GggKKwgggggKKwgo',
  'GgKKKKgggggKKKgo',
  'GggKKggggggKKggo',
  '.oggggggggggggo.',
  '.FfffffffffffSs.',
  '.ffffffffffffss.',
  '..fffKKKKKffss..',
  '..ffKmmmmmKfss..',
  '..ffKmmrrmKss...',
  '...ffKKKKKss....',
  '....ffffsss.....',
]
const FACE_KEY = {
  G: GOLD[2],
  g: GOLD[1],
  o: GOLD[0],
  K: OUTLINE,
  w: SUN,
  F: SKIN[3],
  f: SKIN[2],
  s: SKIN[1],
  S: SKIN[0],
  m: CAPE[0],
  r: CAPE[2],
}
const FX = 31
const FY = 26

/** An eighth note and a pair of beamed notes. */
const NOTE = ['..kk', '..k.', '..k.', 'kkk.', 'kkk.']
const NOTES = ['.kkkkk', '.k...k', '.k...k', 'kk..kk', 'kk..kk']

function sky(p: Painter): void {
  p.register(SKY)
  p.shine(true)
  p.dither(p.m().rect(0, 0, 80, HORIZON), SKY, (x, y) => Math.pow(y / HORIZON, 1.4) + Math.max(0, 0.25 - Math.hypot(x - 64, y - HORIZON) / 120), 0.7)
  // the sun setting into the sea on the right
  const above = p.m().rect(0, 0, 80, HORIZON)
  const sun = p.m().disc(64, HORIZON, 9).and(above)
  p.fill(sun.grown(1).and(above), SKY[5])
  p.fill(sun, SUN)
  p.shine(false)
  // a small island on the horizon
  p.fill(p.m().ellipse(14, HORIZON, 11, 4).rect(10, HORIZON - 7, 1, 4).ellipse(10.5, HORIZON - 7, 3, 1), ISLE)
  // the sea, darker towards us, the sun's road glittering on it
  p.dither(p.m().rect(0, HORIZON, 80, 52), [SKY[2], SKY[1], SKY[0]], (_x, y) => (y - HORIZON) / 14, 0.6)
  p.shine(true)
  const rand = rng(6)
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + 1 + Math.floor(rand() * 12)
    const x = Math.round(64 + (rand() - 0.5) * (4 + (y - HORIZON) * 1.6))
    p.fill(p.m().rect(x, y, 2 + Math.floor(rand() * 3), 1), y < HORIZON + 4 ? SUN : SKY[4])
  }
  p.shine(false)
}

/** The tiled roof below: rows of terracotta tiles, the ridge, and the chimney he puts his boot on. */
function roof(p: Painter): void {
  const m = (): Mask => p.m()
  const tiles = m().poly([0, 74, 80, 70, 80, 112, 0, 112])
  p.dither(tiles, ROOF, (_x, y) => 0.75 - (y - 70) / 50, 0.3)
  for (let y = 78; y < 112; y += 5) p.fill(m().path([0, y + 2, 80, y - 2]), ROOF[0])
  for (let y = 75; y < 112; y += 5)
    for (let x = (y % 10) * 0.6; x < 80; x += 6) p.fill(m().rect(x, y - x * 0.05, 1, 4), ROOF[0])
  p.fill(m().path([0, 74, 80, 70]).grown(1).and(m().rect(0, 68, 80, 8)), ROOF[2])
}

function chimney(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().rect(10, 62, 13, 14), ROOF, { bevel: 2 })
  for (const y of [66, 70]) d.fill(m().rect(11, y, 11, 1), ROOF[0])
  d.fill(m().rect(16, 62, 1, 4).rect(13, 66, 1, 4).rect(19, 70, 1, 4), ROOF[0])
  d.part(m().rect(8, 59, 17, 4), ROOF, { bevel: 1 })
}

function hero(d: Painter): void {
  const m = (): Mask => d.m()
  // the cape streaming out to the right behind him
  const cape = m().poly([34, 37, 46, 36, 56, 40, 68, 46, 76, 54, 74, 64, 66, 70, 58, 74, 50, 70, 44, 60])
  d.part(cape, CAPE, { bevel: 6 })
  d.fill(m().path([48, 42, 60, 56, 62, 70]).path([54, 41, 68, 52, 70, 62]).and(cape.shrunk(1)), CAPE[0])
  // legs: the right one straight on the ridge, the left one up on the chimney
  d.part(m().limb([41, 58, 43, 66, 44, 73], [3, 2.8, 2.6]), TUNIC, { bias: -1 })
  d.part(m().limb([35, 58, 27, 58, 20, 60], [3, 2.8, 2.6]), TUNIC, { bias: -1 })
  d.part(m().ellipse(45.5, 74, 3.6, 2.2).ellipse(18, 58, 3.6, 2.4), LEATHER, { bevel: 1.5 })
  d.part(m().rect(42, 68, 5, 4).rect(19, 55, 3, 5), LEATHER, { bevel: 1 })
  // the tunic, belted, its skirt over the hips
  const tunic = m().poly([33, 38, 45, 38, 47, 48, 46, 60, 32, 60, 32, 48])
  d.part(tunic, TUNIC, { bevel: 5 })
  d.part(m().rect(32, 50, 15, 3), LEATHER, { bevel: 1 })
  d.fill(m().rect(38, 50, 3, 3), GOLD[1])
  // the left arm flung up high, his big slingshot in the fist: a long grip, a broad fork, the band
  d.part(m().limb([44, 40, 51, 34, 57, 27], [2.6, 2.3, 2]), TUNIC)
  const sling = m()
    .limb([58, 32, 59, 24], [1.6, 1.8])
    .limb([59, 24, 55, 20, 54, 16], [1.6, 1.4, 1.2])
    .limb([59, 24, 64, 20, 66, 16], [1.6, 1.4, 1.2])
  d.part(sling, LEATHER, { bevel: 1 })
  d.fill(m().path([54, 15, 60, 20, 66, 15]), CAPE[2])
  d.part(m().rect(57, 23, 4, 2), GOLD, { bevel: 1 })
  d.part(m().ellipse(58.5, 25.5, 2.6, 2.4), SKIN, { bevel: 1.5 })
  // the right hand on his heart
  d.part(m().limb([33, 40, 30, 46, 37, 46], [2.6, 2.3, 2]), TUNIC, { bias: -1 })
  d.part(m().ellipse(38.5, 45, 2.4, 2), SKIN, { bevel: 1.5 })
  // cape clasp
  d.part(m().disc(35, 39, 1.8).disc(45, 39, 1.8), GOLD, { bevel: 1 })
  // neck, hair, face with the sun mask and its rays
  d.part(m().rect(36, 34, 7, 5), SKIN, { bevel: 2 })
  d.tone(m().rect(36, 35, 7, 2), -1)
  // black curls bushing out behind the mask
  const hair = m().ellipse(39, 25, 9, 6.5)
  for (const [x, y, r] of [
    [31, 27, 3.4],
    [30, 32, 3],
    [32, 36, 2.6],
    [47, 27, 3.4],
    [48, 32, 3],
    [46, 36, 2.6],
    [35, 19, 3.2],
    [41, 18, 3.4],
    [46, 21, 3],
  ] as const)
    hair.disc(x, y, r)
  d.part(hair, HAIR, { bevel: 3 })
  for (const [x, y] of [
    [30, 30],
    [48, 30],
    [33, 35],
    [45, 35],
    [38, 18],
    [44, 19],
  ] as const)
    d.fill(m().path([x - 1, y, x, y - 1, x + 1, y]), HAIR[0])
  // the mask's ring of sun rays
  for (const [x0, y0, x1, y1] of [
    [33, 25, 28, 21],
    [36, 25, 34, 18],
    [39, 25, 39, 17],
    [42, 25, 44, 18],
    [45, 26, 50, 21],
    [46, 29, 52, 29],
    [32, 30, 27, 33],
  ] as const)
    d.part(m().limb([x0, y0, x1, y1], [1.7, 0.6]), GOLD, { bevel: 1 })
  d.stamp(FACE, FX, FY, FACE_KEY)
  // the long nose of the mask, pointing up and away to his right
  d.part(m().limb([37, 29, 32, 28, 27, 26], [1.6, 1.2, 0.7]), GOLD, { bevel: 1 })
}

export const sogekingAlt: CardDef = {
  id: 'op03-089',
  number: 89,
  name: 'Sogeking (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Blau',
  print: { cost: 7, power: 6000, counter: 1000, type: 'Sniper Island' },
  // the sunset sky, the sun and its road on the sea, and the music notes shine; Sogeking stays matt
  foil: 'painted',
  draw(p) {
    sky(p)
    roof(p)
    const d = p.layer()
    chimney(d)
    hero(d)
    p.subject(d, OUTLINE)
    // music notes rising out of the picture
    p.shine(true)
    for (const [x, y, two] of [
      [18, 30, true],
      [10, 42, false],
      [22, 17, false],
      [62, 34, false],
      [66, 16, true],
    ] as const) {
      p.stamp(two ? NOTES : NOTE, x, y, { k: OUTLINE })
      p.px(x + (two ? 1 : 2), y, SUN)
    }
    p.shine(false)
  },
}
