import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Kuzan (Alt-Art, Ultra). Brief: the ex-admiral lounging on the crest of a frozen wave, one knee up,
 * sleep mask pushed onto his forehead, half-lidded eyes, frost trailing from his fingers; moonlit
 * frozen sea, his bicycle parked on the ice, ice crystals in the air. Full art, 80×112.
 *
 * Composition: a wave frozen in mid-curl fills the lower right; Kuzan lounges on its crest, leaning
 * back on one elbow, his long legs one bent and one stretched down the ice, his free arm draped over
 * his knee so the frost drifts from his fingers. The moon hangs on the right, the frozen sea runs off
 * to the left where his bicycle stands on the ice. Crystals glitter in the cold air. The frame covers
 * the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('040814', '0a1428', '142448', '1e3666')
const ICE = colors('1a3a6a', '3a6aa8', '7ab0e0', 'c4e4fa', 'f4fcff')
const CLOTH = colors('0e1018', '1c2030', '2e3448', '485068')
const SKIN = colors('3a2018', '6a3c28', '9a6040', 'c08860')
const OUTLINE = hex('02040a')

/**
 * Kuzan's head: black curls, the sleep mask with its painted eyes pushed up on his forehead,
 * half-lidded eyes, a lazy mouth.
 */
const HEAD = [
  '...hh..hhh..hh....',
  '..hHHhhHHHhhHHh...',
  '.hHHHHHHHHHHHHHh..',
  '.hHHHhHHHHHhHHHHh.',
  'hHHHHHHHHHHHHHHHHh',
  'hHHbbbbbbbbbbbbbHh',
  'hHbbKKbbbbbbbKKbbh',
  'hHbbKwbbbbbbbKwbbh',
  'hHHcbbbbbbbbbbbcHh',
  'hHHsffffffffffffHh',
  'hHsfSSSSffffSSSSfh',
  'hHsfKKefffffeKKffh',
  '.Hsffffffsfffffffh',
  '.hsfffffsSffffffs.',
  '..sffffffffffffs..',
  '..sffffSSSSSfffs..',
  '...sfffffffffffs..',
  '....ssfffffffss...',
  '......sssssss.....',
]
const HEAD_KEY = {
  H: CLOTH[0],
  h: CLOTH[2],
  b: ICE[2],
  c: ICE[1],
  K: OUTLINE,
  w: ICE[4],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  e: ICE[3],
}
const HX = 22
const HY = 19

function night(p: Painter): void {
  p.register(SKY).register(ICE)
  p.dither(null, SKY, (x, y) => Math.min(1, y / 74) * 1.1 + noise(x, y, 3, 10) * 0.15 - 0.08, 0.8)
  p.shine(true)
  // the moon, its halo, and its light on the ice
  const halo = p.m().disc(62, 27, 14)
  p.dither(halo, [SKY[2], SKY[3], ICE[0]], (x, y) => 1.2 - Math.hypot(x - 62, y - 27) / 14, 0.6)
  const moon = p.m().disc(62, 27, 9)
  p.fill(moon, ICE[4])
  p.fill(moon.clone().minus(moon.moved(-2, -1)), ICE[3])
  p.shine(false)
  // the frozen sea: flat ice running off to the horizon, cracked, the moon's road glinting on it
  const sea = p.m().rect(0, 70, 80, 42)
  p.dither(sea, [ICE[2], ICE[1], ICE[0]], (_x, y) => (y - 70) / 26, 0.6)
  p.fill(p.m().rect(0, 70, 80, 1), ICE[3])
  const cracks = p.m().path([2, 80, 10, 78, 18, 82, 26, 79]).path([10, 78, 12, 74]).path([4, 88, 14, 86, 20, 90])
  p.fill(cracks, ICE[0])
  p.shine(true)
  const rand = rng(61)
  for (let i = 0; i < 16; i++) p.fill(p.m().rect(56 + Math.floor((rand() - 0.5) * 16), 71 + Math.floor(rand() * 10), 2, 1), ICE[4])
  p.shine(false)
}

/** The wave, frozen in mid-curl: a crest of solid ice, a curling lip with icicles. */
function wave(p: Painter): void {
  const d = p.layer()
  const m = (): Mask => d.m()
  const body = m().poly([80, 112, 30, 112, 28, 84, 22, 74, 16, 68, 14, 62, 20, 58, 32, 54, 46, 52, 60, 54, 72, 58, 80, 62])
  d.part(body, ICE, { bevel: 10 })
  // ridges of the frozen water running down the face of the wave
  for (const ridge of [
    [24, 66, 34, 74, 40, 90],
    [34, 60, 46, 70, 52, 92],
    [50, 58, 60, 70, 66, 94],
    [64, 60, 72, 70, 76, 90],
  ])
    d.fill(m().path(ridge).and(body.shrunk(1)), ICE[1])
  d.fill(m().path([20, 59, 32, 55, 46, 53, 60, 55, 72, 59]).and(body), ICE[4])
  // the lip curling over on the left, the hollow of the barrel dark beneath it, icicles hanging down
  d.fill(m().ellipse(19, 66, 6, 4.5).and(body), ICE[0])
  d.fill(m().ellipse(20, 67, 3.5, 2.5).and(body), SKY[2])
  const lip = m().limb([26, 59, 16, 59, 10, 62, 9, 68], [3, 3, 2.6, 1.8])
  d.part(lip, ICE, { bevel: 2, bias: 1 })
  for (const [x, len] of [
    [11, 5],
    [14, 4],
    [17, 6],
    [20, 3],
  ] as const)
    d.fill(m().poly([x - 1, 63, x + 1, 63, x, 63 + len]), ICE[3])
  d.silhouette(ICE[0])
  p.shine(true)
  p.blit(d)
  p.shine(false)
}

/** His bicycle, parked on the ice. */
function bicycle(p: Painter): void {
  const m = (): Mask => p.m()
  const wheels = m().disc(11, 82, 6).minus(m().disc(11, 82, 4.6)).or(m().disc(28, 82, 6).minus(m().disc(28, 82, 4.6)))
  p.fill(wheels, CLOTH[0])
  p.fill(wheels.facing([-1, 0, 0, -1]), ICE[3])
  const frame = m()
    .path([11, 82, 17, 75, 25, 75, 19, 82, 11, 82])
    .path([17, 75, 16, 72])
    .path([25, 75, 28, 82])
    .path([25, 75, 24, 70, 27, 70])
  p.fill(frame, CLOTH[3])
  p.fill(m().rect(14, 71, 4, 1), CLOTH[0])
  p.px(19, 82, ICE[4])
}

function kuzan(d: Painter): void {
  const m = (): Mask => d.m()
  // the stretched leg, down the slope of the wave
  d.part(m().limb([40, 58, 50, 64, 60, 72, 66, 78], [3.4, 3, 2.8, 2.6]), CLOTH, { bias: -1 })
  d.part(m().ellipse(68, 79, 3.2, 2), CLOTH, { bevel: 1, bias: -1 })
  // the arm he leans on, elbow on the ice behind him
  d.part(m().limb([30, 44, 23, 52, 21, 58], [3, 2.8, 2.6]), CLOTH, { bias: -1 })
  d.part(m().limb([21, 58, 14, 58], 2.4), SKIN, { bias: -1 })
  // the long body leaning back, a pale blue shirt open at the neck
  const torso = m().poly([27, 40, 39, 40, 44, 52, 45, 60, 34, 61, 28, 52])
  d.part(torso, CLOTH, { bevel: 5 })
  d.part(m().poly([31, 40, 36, 40, 34, 47]), ICE, { bevel: 1 })
  d.fill(m().path([33, 48, 37, 58]), CLOTH[0])
  // the bent leg, knee up, the foot planted on the crest
  d.part(m().limb([42, 58, 48, 52, 52, 47], [3.6, 3.4, 3.2]), CLOTH, { bias: -1 })
  d.part(m().limb([52, 47, 55, 53, 57, 57], [3.1, 2.9, 2.6]), CLOTH, { bias: -1 })
  d.part(m().ellipse(59, 58, 3.4, 1.8), CLOTH, { bevel: 1, bias: -1 })
  // the free arm draped over his knee, the hand hanging loose beyond it
  d.part(m().limb([38, 43, 45, 42, 51, 42], [3, 2.8, 2.6]), CLOTH, { bias: 1 })
  d.part(m().limb([51, 42, 55, 44, 57, 47], [2.3, 2.1, 1.9]), SKIN)
  d.part(m().ellipse(58.5, 48.5, 2.2, 1.8), SKIN, { bevel: 1 })
  d.fill(m().path([59, 50, 61, 52]).path([58, 50, 59, 52]), SKIN[1])
  // neck and head
  d.part(m().rect(29, 36, 6, 5), SKIN, { bevel: 2 })
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

/** Frost drifting from his fingers in a glittering stream, crystals in the cold air. */
function frost(p: Painter): void {
  p.shine(true)
  const rand = rng(67)
  for (let i = 0; i < 40; i++) {
    const t = rand()
    const x = Math.round(61 + t * 14 + (rand() - 0.5) * 2)
    const y = Math.round(52 + t * 9 + (rand() - 0.5) * (2 + t * 7))
    p.px(x, y, t < 0.4 || rand() < 0.4 ? ICE[4] : ICE[3])
  }
  for (const [x, y] of [
    [64, 55],
    [70, 58],
  ] as const)
    p.stamp(['.w.', 'wcw', '.w.'], x - 1, y - 1, { w: ICE[3], c: ICE[4] })
  for (let i = 0; i < 16; i++) {
    const x = 6 + Math.floor(rand() * 68)
    const y = 16 + Math.floor(rand() * 40)
    if (p.subjectMask.grown(2).has(x, y)) continue
    if (rand() < 0.3) p.stamp(['.w.', 'wcw', '.w.'], x - 1, y - 1, { w: ICE[3], c: ICE[4] })
    else p.px(x, y, rand() < 0.5 ? ICE[4] : ICE[3])
  }
  p.shine(false)
}

export const kuzanAlt: CardDef = {
  id: 'op02-088',
  number: 88,
  name: 'Kuzan (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Schwarz',
  print: { cost: 10, power: 10000, type: 'Ex-Marine' },
  // the moon, the frozen wave, the glints on the ice and the frost shine; Kuzan and his bike stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    wave(p)
    bicycle(p)
    const d = p.layer()
    kuzan(d)
    p.subject(d, OUTLINE)
    frost(p)
  },
}
