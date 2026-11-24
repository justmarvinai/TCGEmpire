import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Monkey.D.Garp (Leader, Alt-Art, Ultra). Brief: the vice admiral punching straight at the viewer,
 * fist huge in the foreground, white coat flaring, wide grin, grey beard; the punch bends a spiral
 * galaxy around the fist, a broken warship far below. Full art, 80×112.
 *
 * Composition: Garp lunges at the viewer; his left fist fills the middle of the card, knuckles first,
 * his grinning bearded head above it on the left, the right fist cocked back at his hip. The Marine
 * coat flares out behind both shoulders. The night behind him is split along the seam of the frame's
 * dual colours, red on the left and black on the right, and the galaxy's violet arms spiral round the
 * fist. A broken warship sinks far below on the left. The frame covers the outer 4 pixels and its
 * plates rows 1–13 and 90–108.
 */
const RED = colors('3c0a14', '6a1220', '9a1e26')
const NIGHT = colors('07070c', '12121c', '1e1e2c')
const GALAXY = colors('2e2468', '4a3aa8', '7a6ae0', 'c4bcff')
const COAT = colors('5a5a6e', '9c9cae', 'd8d8e2', 'f8f8fc')
const SKIN = colors('5a2a22', 'a05a3c', 'd8905e', 'f4c08c')
const SUIT = colors('141a30', '24304e', '3a4a72')
const OUTLINE = hex('0a0610')

/** Centre of the fist and of the galaxy that bends round it. */
const FIST = { x: 46, y: 64 }

/**
 * Garp grinning: short grey hair, thick brows, the scar over his left eye, a big nose and a toothy
 * grin in his grey beard.
 */
const HEAD = [
  '.......hh.ii.hh.......',
  '....hhiiiiiiiiiihh....',
  '...hiiWiiiiiiiiiiih...',
  '..hiiWWiiiiiiiiiiiih..',
  '..hhiifFFFfffffffihh..',
  '..hfFFFfffffffffffsh..',
  '.hsfFfffffffffffffssh.',
  '.hsKKKKffffffffKKcKsh.',
  '.hsfKeKffffffffKeKcsh.',
  '.hsffffffsffsfffffcsh.',
  '.hhsffffffsffsfffffsh.',
  '.hhsfffffsSffSsffffhh.',
  '.hiisffffsSSSSsfffiih.',
  '.hiiiKKKKKKKKKKKKKiih.',
  '.hiiiKttttttttttttKih.',
  '.hiiiiKttttttttttKiih.',
  '..hiiiiKKKKKKKKKKiih..',
  '..hhiiiiiiiiiiiiiihh..',
  '...hhiiiiiiiiiiiihh...',
  '.....hhiiiiiiiihh.....',
  '.......hhhhhhhh.......',
]
const HEAD_KEY = {
  h: COAT[0],
  i: COAT[1],
  W: COAT[2],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  F: SKIN[3],
  K: OUTLINE,
  e: COAT[3],
  c: SKIN[0],
  t: COAT[3],
}
const HX = 22
const HY = 13

/** Left of the seam is red, right of it black; the seam runs like the frame's dual-colour split. */
function redSide(x: number, y: number): boolean {
  return x + 0.5 - 40 + (y + 0.5 - 56) * 0.5 < 0
}

function night(p: Painter): void {
  p.register(RED).register(NIGHT).register(GALAXY)
  const red = p.m()
  for (let y = 0; y < 112; y++) for (let x = 0; x < 80; x++) if (redSide(x, y)) red.add(x, y)
  const black = red.clone().invert()
  p.dither(red, RED, (x, y) => 0.25 + y / 150 + noise(x, y, 4, 8) * 0.3, 0.8)
  p.dither(black, NIGHT, (x, y) => 0.35 + y / 180 + noise(x, y, 6, 8) * 0.3, 0.8)
  // the galaxy: two violet arms winding round the fist, brightest close to it
  p.shine(true)
  for (let y = 4; y < 92; y++) {
    for (let x = 0; x < 80; x++) {
      const v = galaxyAt(x, y) + noise(x, y, 9, 3) * 0.25 - 0.2
      if (v > 0.12 + bayer(x, y) * 0.35) p.set(x, y, GALAXY[Math.min(3, Math.floor(v * 3.2))] ?? GALAXY[0])
    }
  }
  // stars, and a few bright ones caught in the arms
  const rand = rng(31)
  for (let i = 0; i < 36; i++) {
    const x = 4 + Math.floor(rand() * 72)
    const y = 14 + Math.floor(rand() * 74)
    p.px(x, y, rand() < 0.5 ? COAT[3] : GALAXY[3])
  }
  for (const [x, y] of [
    [12, 22],
    [66, 30],
    [70, 80],
  ] as const)
    p.stamp(['.w.', 'www', '.w.'], x, y, { w: COAT[3] })
  p.shine(false)
}

/** Far below on the left: a warship broken in two, sinking. */
function warship(p: Painter): void {
  const m = (): Mask => p.m()
  const wreck = m()
    .poly([5, 82, 15, 79, 17, 85, 7, 87])
    .poly([19, 84, 28, 77, 31, 80, 22, 87])
    .line(10, 81, 8, 70)
    .line(25, 80, 29, 69)
    .poly([8, 72, 13, 74, 8, 76])
    .poly([28, 71, 32, 74, 27, 75])
  p.fill(wreck, NIGHT[0])
  p.fill(m().rect(0, 87, 36, 3), NIGHT[0])
  p.fill(m().path([2, 86, 34, 86]), RED[2])
}

function garp(d: Painter): void {
  const m = (): Mask => d.m()
  // the Marine coat flaring out behind him to the left, its dark lining showing at the hem
  const coat = m().poly([
    30, 36, 18, 33, 9, 36, 3, 44, 1, 56, 4, 53, 4, 62, 8, 58, 9, 68, 13, 62, 15, 72, 19, 64, 22, 74, 24, 52,
    46, 40, 52, 37, 58, 42, 54, 60,
  ])
  d.part(coat, COAT, { bevel: 5 })
  d.part(m().poly([3, 52, 5, 50, 5, 58, 8, 55, 9, 64, 13, 59, 15, 68, 19, 61, 18, 50]), SUIT, { bevel: 2, line: 'none' })
  // the body in a dark suit, turned so the punching shoulder comes forward; a white shirt at the collar
  d.part(m().poly([22, 38, 48, 38, 52, 50, 50, 92, 26, 92, 20, 56]), SUIT, { bevel: 6 })
  d.part(m().poly([28, 35, 41, 35, 35, 46]), COAT, { bevel: 2 })
  d.fill(m().path([35, 37, 35, 45]), COAT[1])
  // the right arm cocked back, elbow out, the fist at his hip
  d.part(m().limb([23, 42, 13, 49, 8, 58], [5, 4.6, 4.2]), SUIT)
  d.part(m().limb([8, 58, 15, 64], 4.2), SUIT, { bias: -1 })
  d.part(m().ellipse(18, 65, 4.6, 4.2), SKIN, { bevel: 2 })
  d.fill(m().path([15, 64, 21, 64]), SKIN[1])
  // the punching arm comes straight at the viewer, growing towards the fist
  d.part(m().limb([47, 42, 51, 47, 50, 53], [5.5, 7, 8.5]), SUIT, { bevel: 5 })
  d.part(m().ellipse(48, 55, 9.5, 4), COAT, { bevel: 2 })
  // neck and head
  d.part(m().rect(28, 31, 12, 6), SKIN, { bevel: 3 })
  d.tone(m().rect(28, 32, 12, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

/** Spiral value of the galaxy at a pixel: above zero on its two arms, highest close to the fist. */
function galaxyAt(x: number, y: number): number {
  const dx = x + 0.5 - FIST.x
  const dy = (y + 0.5 - FIST.y) * 1.15
  const r = Math.hypot(dx, dy)
  const arm = Math.cos(2 * (Math.atan2(dy, dx) - 2.1 * Math.log(Math.max(1, r))))
  return Math.pow(arm * 0.5 + 0.5, 2.2) * Math.max(0, 1 - r / 58) * 2.1 + Math.max(0, 1 - r / 22) * 0.5
}

/** The inner arms of the galaxy bend round the fist, in front of his body. */
function swirl(p: Painter): void {
  p.shine(true)
  for (let y = FIST.y - 26; y < FIST.y + 26; y++) {
    for (let x = FIST.x - 28; x < FIST.x + 28; x++) {
      const r = Math.hypot(x + 0.5 - FIST.x, (y + 0.5 - FIST.y) * 1.15)
      if (r < 15 || r > 25 || y >= 90) continue
      const v = galaxyAt(x, y) * Math.min(1, (25 - r) / 4) + noise(x, y, 9, 3) * 0.25 - 0.2
      if (v > 0.2 + bayer(x, y) * 0.35) p.px(x, y, GALAXY[Math.min(3, Math.floor(v * 3.2))] ?? GALAXY[0])
    }
  }
  p.shine(false)
}

/** The fist, knuckles first: four fingers curled, the thumb folded across them. */
function fist(d: Painter): void {
  const m = (): Mask => d.m()
  const { x, y } = FIST
  const body = m().poly([x - 10, y - 12, x + 10, y - 12, x + 14, y - 8, x + 14, y + 8, x + 10, y + 12, x - 10, y + 12, x - 14, y + 8, x - 14, y - 8])
  d.part(body, SKIN, { bevel: 7 })
  // knuckles along the top, the fingers' middle joints below them
  for (const k of [-10, -3.5, 3.5, 10]) {
    d.part(m().ellipse(x + k, y - 9, 3.6, 3), SKIN, { bevel: 2, line: 'none' })
    d.fill(m().path([x + k - 2, y + 1, x + k + 2, y + 1]), SKIN[1])
  }
  for (const k of [-7, 0, 7]) d.fill(m().path([x + k, y - 9, x + k, y + 4]), SKIN[0])
  // the thumb across the two front fingers
  const thumb = m().limb([x - 14, y + 6, x - 6, y + 6, x + 3, y + 4], [3.6, 3.4, 3])
  d.part(thumb, SKIN, { bevel: 2, bias: 1 })
  d.fill(m().rect(x + 1, y + 3, 3, 2), SKIN[3])
}

export const garpLeader: CardDef = {
  id: 'op02-085',
  number: 85,
  name: 'Monkey.D.Garp (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Rot/Schwarz',
  print: { life: 4, power: 5000, type: 'Marine' },
  // the galaxy, its arms round the fist and the stars shine; Garp, his fist and the wreck stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    warship(p)
    const d = p.layer()
    garp(d)
    p.subject(d, OUTLINE)
    swirl(p)
    const f = p.layer()
    fist(f)
    p.subject(f, OUTLINE)
  },
}
