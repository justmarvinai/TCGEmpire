import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Piltover Enforcer (Signature), Ultra. Our own street brawler: a pink crop whipping in the wind, a
 * wine-dark coat with a gold badge, and two huge steel-blue mechanical gauntlets with cyan cores. She bursts
 * through a brick wall straight at the viewer, one gauntlet punching out of the picture, the other
 * cocked back by her head, while the bricks fly apart round her. Full art, 80×112.
 *
 * Composition: square to the viewer; the punching fist fills the lower middle, foreshortened and
 * huge, the cocked gauntlet the upper right; her face sits between them, the hair streams to the
 * left. The hole in the wall frames her. The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('080a16', '12182c', '1e2844')
const BRICK = colors('2a1018', '5a2028', '8a3a34', 'b85a44')
const DUST = colors('3a3040', '6a6070', 'a8a0b0')
const STEEL = colors('141a2c', '26324e', '41567e', '6c88b4', 'b4cce8')
const CYAN = colors('1a8cb0', '4ae0f0', 'd2fcff')
const PINK = colors('7a1a4a', 'd0407a', 'ff8ab8')
const SKIN = colors('6a2e28', 'b0644e', 'e8a07c', 'ffd4b4')
const COAT = colors('1e0a18', '3a1228', '5c1c3c', '86305a')
const GOLD = colors('a8701e', 'ffd860')
const OUTLINE = hex('070812')

/** The hole she smashed through the wall: a jagged outline round her upper body. */
function holeShape(p: Painter): Mask {
  const rand = rng(21)
  const pts: number[] = []
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2
    const r = 1 + (rand() - 0.5) * 0.28 + (i % 2 === 0 ? 0.08 : -0.06)
    pts.push(40 + Math.cos(a) * 27 * r, 52 + Math.sin(a) * 34 * r)
  }
  return p.m().poly(pts)
}

function wall(p: Painter, hole: Mask): void {
  // brickwork: staggered courses, each brick shaded a little differently
  p.register(BRICK)
  const rand = rng(5)
  for (let row = 0; row < 28; row++) {
    const y = row * 4
    const shift = row % 2 === 0 ? 0 : 4
    for (let x = -shift; x < 80; x += 8) {
      const brick = p.m().rect(x, y, 7, 3)
      const tone = rand()
      p.fill(brick, tone < 0.3 ? BRICK[1] : BRICK[2])
      p.fill(brick.facing([0, -1]).and(p.m().rect(x + 1, y, 5, 1)), tone < 0.7 ? BRICK[2] : BRICK[3])
      p.fill(p.m().rect(x + 7, y, 1, 4).rect(x, y + 3, 8, 1), BRICK[0])
    }
  }
  // the room behind the hole: darkness with a cyan glow from her gauntlets
  p.shine(true)
  p.dither(hole, NIGHT, (x, y) => 0.15 + Math.max(0, 1 - Math.hypot(x - 40, y - 60) / 30) * 0.8 + noise(x, y, 3, 5) * 0.15, 0.7)
  p.shine(false)
  // broken brick ends round the rim, and the rim in shadow
  p.fill(hole.outerEdge(), BRICK[0])
  hole
    .grown(3)
    .minus(hole.grown(1))
    .each((x, y) => {
      if (noise(x, y, 8, 2) > 0.55) p.set(x, y, BRICK[0])
    })
}

/** Dust bursting out of the hole along its rim. */
function dust(p: Painter, hole: Mask): void {
  const cloud = p.m()
  for (const [x, y, rx, ry, seed] of [
    [12, 30, 7, 5, 1],
    [66, 22, 8, 5, 2],
    [10, 70, 8, 6, 3],
    [70, 66, 8, 6, 4],
    [20, 86, 10, 4, 5],
    [62, 86, 10, 4, 6],
  ] as const) {
    cloud.blob(x, y, rx, ry, seed, 0.35)
  }
  cloud.minus(hole.shrunk(3))
  p.dither(cloud, DUST, (x, y) => 0.3 + noise(x, y, 6, 3) * 0.7, 0.7)
}

function brawler(d: Painter): void {
  const m = (): Mask => d.m()

  // coat on the shoulders and chest, the collar turned up
  const coat = m().poly([17, 52, 24, 45, 33, 43, 44, 43, 54, 45, 61, 52, 60, 70, 58, 90, 20, 90, 18, 70])
  d.part(coat, COAT, { bevel: 7 })
  const shirt = m().poly([33, 44, 44, 44, 42, 55, 38.5, 58, 35, 55])
  d.part(shirt, [NIGHT[1], NIGHT[2], DUST[1]], { bevel: 2 })
  d.fill(m().path([33, 44, 38.5, 57]).path([44, 44, 38.5, 57]).and(coat), COAT[3])
  d.part(m().poly([28, 43, 33, 41, 35, 46, 30, 48]).poly([49, 43, 44, 41, 42, 46, 47, 48]), COAT.slice(1), { bevel: 1.5 })
  // the badge on the chest
  d.part(m().poly([47.5, 50, 52.5, 50, 52.5, 54, 50, 56.5, 47.5, 54]), GOLD, { bevel: 1.5 })
  d.px(50, 52, COAT[0])

  // neck and head, chin down, square to the viewer
  d.part(m().rect(35.5, 38, 6, 5), SKIN, { bias: -1, bevel: 2 })
  const head = m().ellipse(38.5, 31, 7.4, 8).poly([31.5, 33, 34, 40, 38.5, 42, 43, 40, 45.5, 33])
  d.part(head, SKIN, { bevel: 4 })
  // the pink crop: a short fringe and long strands streaming to the left
  const hair = m()
    .ellipse(38.5, 25.5, 7.8, 4.6)
    .poly([31, 24, 18, 20, 23, 25, 15, 27, 24, 29.5, 19, 34, 31.5, 30])
    .poly([34, 22, 26, 15.5, 36, 20])
    .poly([42, 21, 46, 15.5, 45, 23])
    .poly([44.5, 24, 47.5, 29, 46, 31])
  d.part(hair, PINK, { bevel: 3 })
  for (const lock of [
    [30, 26, 20, 22],
    [30, 29, 21, 31],
    [33, 23, 28, 18],
  ]) {
    d.fill(m().path(lock).and(hair.shrunk(1)), PINK[2])
  }
  // angry brows, eyes on the viewer, gritted teeth, a plaster on the cheek
  d.stamp(
    [
      'kkk....kkk',
      '..k...k...',
      '.kwk..kwk.',
      '.kkk..kkk.',
      '..........',
      '..........',
      '..kwwwwk..',
      '...kkkk...',
    ],
    33.5,
    28,
    { k: OUTLINE, w: CYAN[2] },
  )
  d.fill(m().rect(42.5, 34, 2, 2), DUST[2])

  // the cocked gauntlet: the forearm drawn back, the armoured fist up by her head, knuckles forward
  d.part(m().limb([54, 48, 64, 50, 66, 40], [5.5, 5, 4.6]), STEEL, { bevel: 4 })
  const cocked = m().ellipse(63.5, 31, 8, 9, 15)
  d.part(cocked, STEEL, { bevel: 5 })
  for (const [x, y] of [
    [56.5, 26],
    [56, 31],
    [57, 36],
  ] as const) {
    d.part(m().ellipse(x, y, 3, 2.5), STEEL, { bevel: 2 })
  }
  d.part(m().ellipse(57.5, 41, 3.5, 2.6, -20), STEEL.slice(0, 4), { bevel: 2 })
  d.shine(true)
  d.part(m().disc(65.5, 31, 2.4), CYAN, { bevel: 2 })
  d.shine(false)
  d.part(m().limb([57, 51, 63, 51.5], 1.2), STEEL.slice(2), { bevel: 1 })

  // the punching gauntlet, foreshortened towards the viewer: a wide cuff behind a huge fist
  const cuff = m().ellipse(31, 60, 11, 9.5, -20)
  d.part(cuff, STEEL.slice(0, 4), { bevel: 4 })
  d.shine(true)
  d.fill(m().ellipse(31, 60, 7.5, 6, -20).minus(m().ellipse(31, 60, 5.5, 4.2, -20)).and(cuff), CYAN[0])
  d.shine(false)
  const fist = m().poly([24, 63, 29, 56, 51, 56, 57, 62, 57, 74, 53, 82, 31, 82, 25, 76])
  d.part(fist, STEEL.slice(0, 4), { bevel: 6, bias: -1 })
  // the back of the hand on top, with its core
  d.part(m().poly([27, 60, 31, 55.5, 50, 55.5, 55, 60]), STEEL, { bevel: 2 })
  d.shine(true)
  d.part(m().ellipse(41, 57.8, 3.6, 1.6), CYAN, { bevel: 1.5 })
  d.shine(false)
  // curled fingers tucked under, in shadow, then the four knuckles closest to the viewer
  for (let i = 0; i < 4; i++) {
    const x = 29.5 + i * 6.8
    d.part(m().poly([x, 67, x + 5.6, 67, x + 5.4, 72.5, x + 2.8, 74, x + 0.2, 72.5]), STEEL.slice(0, 4), { bevel: 2, bias: -1 })
  }
  for (let i = 0; i < 4; i++) {
    d.part(m().ellipse(32.3 + i * 6.8, 63.5, 3.9, 3.5), STEEL, { bevel: 3 })
  }
  // the thumb wrapped across the fingers
  d.part(m().poly([25, 75, 33, 72, 46, 73, 48, 76.5, 45, 80.5, 28, 80.5]), STEEL, { bevel: 3 })
  d.fill(m().path([33, 76, 44, 76.5]), STEEL[1])
}

/** Bricks flying apart, the shock ring of the punch, sparks off the knuckles. */
function impact(p: Painter): void {
  const rand = rng(17)
  for (const [x, y, w, h] of [
    [3, 18, 6, 3],
    [70, 34, 7, 4],
    [5, 52, 5, 3],
    [72, 76, 6, 3],
    [8, 82, 5, 4],
    [64, 14, 5, 3],
    [27, 15, 4, 3],
  ] as const) {
    const brick = p.m().rect(x, y, w, h)
    if (rand() < 0.5) brick.rect(x + 1, y - 1, w - 2, 1)
    p.fill(brick.outerEdge(), OUTLINE)
    p.fill(brick, BRICK[2])
    p.fill(brick.facing([0, -1]), BRICK[3])
    p.fill(brick.facing([0, 1]), BRICK[1])
  }
  p.shine(true)
  const ring = p.m().ellipse(41, 70, 27, 16).minus(p.m().ellipse(41, 70, 25.5, 14.8)).minus(p.subjectMask)
  ring.each((x, y) => {
    if ((x + y) % 3 !== 0) p.set(x, y, CYAN[0])
  })
  for (const [x, y] of [
    [22, 58],
    [59, 60],
    [21, 77],
    [60, 79],
    [40, 54],
  ] as const) {
    p.px(x, y, CYAN[2])
  }
  p.shine(false)
}

export const viSignature: CardDef = {
  id: 'rb-unl-082',
  number: 82,
  name: 'Vi, Piltover Enforcer (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { domain2: 'Order' },
  // the room's glow, the gauntlets' cyan cores, the shock ring and the sparks shine; the rest stays matt
  foil: 'painted',
  draw(p) {
    const hole = holeShape(p)
    wall(p, hole)
    dust(p, hole)
    const d = p.layer()
    brawler(d)
    p.subject(d, OUTLINE)
    impact(p)
  },
}
