import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, fire, hex, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Portgas.D.Ace (Alt-Art, Ultra). Brief: sitting on a ship's rail, one knee up, grinning with his
 * eyes closed, his orange hat with its two little faces tipped back; flames rise off his shoulders and
 * twist into a crown above his head. Sunset sea, two gulls, a thin trail of fire on the water.
 * Full art, 80×112.
 *
 * Composition: Ace sits on the rail in the middle, his right hand on the rail, his left arm slung over
 * his raised knee, laughing with his eyes shut; the hat hangs tipped back behind his head. Two flames
 * climb from his shoulders up beside his head and twist together above it into a crown of fire. The
 * sun sinks into a deep blue sea behind him, a thin trail of fire burns across the water, two gulls
 * wheel in the pink-violet sky. The frame covers the outer 4 pixels and its plates rows 1–13 and
 * 90–108.
 */
const SKY = colors('2a1648', '4a2266', '8a3a80', 'd05a7a', 'f88a6a', 'ffc070')
const SEA = colors('0a1238', '14205a', '24387e')
const FIRE = colors('8a1c10', 'e04018', 'f88a24', 'ffd04a', 'fff6c8')
const SKIN = colors('6a2e22', 'b8683e', 'e8a070', 'ffd0a0')
const BLACK = colors('120c14', '2a2030', '423a4a')
const HAT = [FIRE[0], hex('c8601a'), FIRE[2], FIRE[3]] as const
const WOOD = colors('3a1e14', '6a3a20', '9a5a30')
const BADGE = hex('6a9ae8')
const OUTLINE = hex('120608')

const HORIZON = 64

/** Ace laughing: black hair, eyes squeezed shut, freckles, a wide open grin. */
const HEAD = [
  '....hhHHHHHHHHhh....',
  '..hhHHHHHHHHHHHHhh..',
  '.hHHHHhHHHHHHhHHHHh.',
  'hHHHHHHHHHHHHHHHHHHh',
  'hHHHfHHHffHHHfHHHHHh',
  'hHHfffHffffffHfffHHh',
  'hHHFFfffffffffffffHh',
  'hHfFffffffffffffffHh',
  'hHfffKKKffffKKKfffHh',
  'hHffKfffKffKfffKffHh',
  'hHfffSfSfssfSfSfffHh',
  'hHfffffffffffffffsHh',
  '.hfffKKKKKKKKKKffsh.',
  '.hffKttttttttttKfsh.',
  '.hfffKmmmmmmmmKffsh.',
  '..sfffKKKKKKKKfffs..',
  '..ssffffffffffffss..',
  '...ssffffffffffss...',
  '.....ssssssssss.....',
]
const HEAD_KEY = {
  h: BLACK[1],
  H: BLACK[0],
  f: SKIN[2],
  F: SKIN[3],
  s: SKIN[1],
  S: SKIN[0],
  K: OUTLINE,
  t: FIRE[4],
  m: FIRE[1],
}
const HX = 28
const HY = 24

function sunset(p: Painter): void {
  p.register(SKY).register(SEA).register(FIRE)
  p.shine(true)
  p.dither(null, SKY, (x, y) => Math.pow(Math.min(1, y / HORIZON), 1.2) + noise(x, y, 8, 10) * 0.12 - 0.06, 0.7)
  // the sun sinking behind him on the right
  const sun = p.m().disc(62, HORIZON, 9).and(p.m().rect(0, 0, 80, HORIZON))
  p.fill(sun.grown(1).and(p.m().rect(0, 0, 80, HORIZON)), SKY[5])
  p.fill(sun, FIRE[4])
  p.shine(false)
  // two gulls
  const gull = ['k...k', '.k.k.', '..k..']
  for (const [x, y] of pts([9, 24, 15, 31])) p.stamp(gull, x, y, { k: SKY[0] })
  // deep blue sea, the sun's glitter on it
  const sea = p.m().rect(0, HORIZON, 80, 48)
  p.dither(sea, [SEA[2], SEA[1], SEA[0]], (_x, y) => (y - HORIZON) / 10, 0.6)
  p.shine(true)
  p.fill(p.m().rect(0, HORIZON, 80, 1), SKY[4])
  const rand = rng(83)
  for (let i = 0; i < 14; i++) {
    const y = HORIZON + 1 + Math.floor(rand() * 7)
    p.fill(p.m().rect(62 + Math.floor((rand() - 0.5) * (6 + (y - HORIZON) * 2)), y, 2, 1), rand() < 0.5 ? SKY[5] : FIRE[4])
  }
  // a thin trail of fire burning across the water
  for (let x = 4; x < 60; x++) {
    const y = Math.round(HORIZON + 7 - (x - 4) * 0.09 + Math.sin(x * 0.7) * 0.6)
    p.px(x, y, x % 3 === 0 ? FIRE[3] : FIRE[2])
    if (x % 4 === 1) p.px(x, y - 1, FIRE[1])
  }
  p.shine(false)
}

/** Two flames climbing from his shoulders beside his head and twisting into a crown above it. */
function crown(p: Painter): void {
  const m = (): Mask => p.m()
  const flame = m()
    .limb([25, 50, 20, 42, 19, 34, 22, 25, 27, 17], [4.2, 3.8, 3.2, 2.8, 2.4])
    .limb([51, 50, 56, 42, 57, 34, 54, 25, 49, 17], [4.2, 3.8, 3.2, 2.8, 2.4])
    .limb([27, 17, 32, 15, 38, 14, 44, 15, 49, 17], 2.6)
  // tongues licking outwards off the climbing flames
  for (const [x0, y0, x1, y1] of [
    [20, 40, 14, 34],
    [20, 30, 15, 22],
    [56, 40, 62, 34],
    [56, 30, 61, 22],
  ] as const)
    flame.limb([x0, y0, x1, y1], [2.2, 0.6])
  // the crown: five points of fire
  for (const [x, top] of [
    [27, 9],
    [32, 6],
    [38, 4],
    [44, 6],
    [49, 9],
  ] as const)
    flame.limb([x, 16, x + (x < 38 ? -1 : x > 38 ? 1 : 0), top], [2.4, 0.7])
  p.shine(true)
  fire(p, flame, FIRE, { dy: 1, step: 1 })
  p.shine(false)
}

/** The ship's rail he sits on: a wooden beam on posts, the deck dark below it. */
function rail(p: Painter): void {
  const m = (): Mask => p.m()
  p.fill(m().rect(0, 76, 80, 36), WOOD[0])
  for (const x of [6, 22, 58, 74]) p.fill(m().rect(x, 74, 3, 14), WOOD[1])
  const beam = m().rect(0, 71, 80, 4)
  p.fill(beam, WOOD[1])
  p.fill(m().rect(0, 71, 80, 1), WOOD[2])
  p.fill(m().rect(0, 74, 80, 1), WOOD[0])
}

function ace(d: Painter): void {
  const m = (): Mask => d.m()
  // the leg hanging down in front of the rail, black boot
  d.part(m().limb([32, 70, 31, 80, 30, 88], [3.6, 3.2, 3]), SKIN)
  d.part(m().limb([30, 84, 30, 94], 3.4), BLACK, { bevel: 2 })
  // the raised knee, his foot on the rail
  d.part(m().limb([44, 68, 50, 60, 53, 56], [4, 3.6, 3.4]), BLACK, { bias: 1 })
  d.part(m().limb([53, 56, 55, 63, 56, 69], [3.2, 3, 3]), SKIN, { bias: -1 })
  d.part(m().ellipse(57, 70, 3.6, 2.2), BLACK, { bevel: 1 })
  // black shorts, the belt
  d.part(m().poly([28, 64, 46, 64, 48, 72, 26, 72]), BLACK, { bevel: 3, bias: 1 })
  d.part(m().rect(28, 62, 18, 3), WOOD, { bevel: 1 })
  d.part(m().rect(35, 62, 4, 3), HAT, { bevel: 1 })
  // bare torso
  const torso = m().poly([27, 45, 49, 45, 48, 56, 46, 63, 30, 63, 28, 56])
  d.part(torso, SKIN, { bevel: 6 })
  d.part(m().ellipse(33, 50, 5, 3.6), SKIN, { bevel: 3, line: 'shadow' })
  d.part(m().ellipse(43, 50, 5, 3.6), SKIN, { bevel: 3, line: 'shadow' })
  d.fill(m().path([38, 48, 38, 60]), SKIN[1])
  // right arm down to the rail, the hand gripping it
  d.part(m().limb([27, 47, 22, 56, 21, 66], [3.4, 3, 2.8]), SKIN)
  d.part(m().ellipse(21, 69, 2.8, 2.4), SKIN, { bevel: 1 })
  // left arm slung over the raised knee
  d.part(m().limb([49, 47, 53, 52, 55, 56], [3.4, 3, 2.8]), SKIN)
  d.part(m().limb([55, 56, 60, 58, 62, 61], [2.8, 2.6, 2.4]), SKIN, { bias: -1 })
  d.part(m().ellipse(63, 62.5, 2.6, 2.2), SKIN, { bevel: 1 })
  // the red bead necklace
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.12 + (i / 8) * 0.76)
    d.part(m().disc(38 + Math.cos(a) * 8, 41 + Math.sin(a) * 5, 1.4), [FIRE[0], FIRE[1], FIRE[2]], { bevel: 1, line: 'none' })
  }
  // the hat, tipped back: its brim a tilted disc behind his head, the crown above with its band and
  // the two little faces
  const brim = m().ellipse(38, 25, 15, 7.5, -8)
  d.part(brim, HAT, { bevel: 3, bias: -1 })
  d.fill(brim.facing([0, -1]), HAT[2])
  d.part(m().ellipse(38, 21, 8, 5.5), HAT, { bevel: 4 })
  d.fill(m().path([33, 17, 38, 18, 43, 17]), HAT[0])
  d.part(m().rect(30, 23, 16, 2), [FIRE[0], FIRE[1]], { bevel: 1 })
  d.stamp(['www', 'kwk', 'wkw'], 32, 19, { w: BADGE, k: OUTLINE })
  d.stamp(['www', 'kwk', 'kwk'], 41, 19, { w: BADGE, k: OUTLINE })
  // neck and head
  d.part(m().rect(34, 40, 8, 6), SKIN, { bevel: 2 })
  d.tone(m().rect(34, 41, 8, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

export const aceAlt: CardDef = {
  id: 'op02-089',
  number: 89,
  name: 'Portgas.D.Ace (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Rot',
  print: { cost: 7, power: 7000, type: 'Whitebeard-Bande' },
  // the sunset, the sun and its glitter, the fire trail and the crown of flames shine; Ace stays matt
  foil: 'painted',
  draw(p) {
    sunset(p)
    crown(p)
    rail(p)
    const d = p.layer()
    ace(d)
    p.subject(d, OUTLINE)
  },
}
