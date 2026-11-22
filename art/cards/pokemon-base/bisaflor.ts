import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, quad, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Bisaflor (Ultra). Brief: massive flower-backed beast planting its feet, petals wide, sunbeams
 * through rainforest canopy. Full art, 80×112.
 *
 * Composition: the beast stands square to the viewer on the forest floor, head low and turned a
 * little to the left, three legs planted wide. The flower opens over the whole width under the
 * name plate, its leaves droop down both flanks. Sunbeams fall from the top left through a gap in
 * the canopy and catch the petals. The name plate covers rows 5–15, the attack plate 88–106.
 */
const JUNGLE = colors('061410', '0d2418', '163821', '22502a', '3a6c30', '62903a')
const SUN = colors('a2bf58', 'dbe79a', 'fffbe0')
/** Jungle and sunlight as one ramp, so a beam can lift the jungle step by step. */
const WOOD = [...JUNGLE, ...SUN]
const TEAL = colors('123545', '1e5c66', '338984', '58b5a0', 'a2dfc2')
const LEAF = colors('0e3020', '1d5a2e', '35883a', '5cb846', 'a8e070')
const PINK = colors('5c1440', '9c2c60', 'd5507c', 'f48aa8', 'ffd0dc')
const RED = hex('e0303e')
const MOUTH = hex('5a1428')
const CLAW = hex('f6f4e4')
const OUTLINE = hex('061210')

const P = (x: number, y: number): Pt => [x, y]

/** The sun stands far above the top left. Beams: [angle from the sun in degrees, half width]. */
const SUN_AT = P(-40, -90)
const BEAMS = [
  [45, 1.3],
  [51.5, 2.1],
  [58, 1.2],
  [64, 1.9],
  [71, 1.3],
] as const

/** Strength of the sunlight at a pixel: 1 in the heart of a beam, 0 outside; it fades downwards. */
function sunlight(x: number, y: number): number {
  const a = (Math.atan2(y + 0.5 - SUN_AT[1], x + 0.5 - SUN_AT[0]) * 180) / Math.PI
  let s = 0
  for (const [at, half] of BEAMS) s = Math.max(s, 1 - Math.abs(a - at) / half)
  return s * (1 - y / 200)
}

function forest(p: Painter): void {
  p.register(WOOD)
  // depth: a hazy opening in the canopy at the top left, dense dark growth below and to the right
  p.dither(
    null,
    WOOD,
    (x, y) => {
      const haze = Math.max(0, 1 - Math.hypot(x - 16, y - 4) / 72) * 0.4
      const growth = noise(x, y * 0.7, 3, 7) * 0.18 + noise(x, y, 9, 3) * 0.06
      return 0.08 + haze + growth - Math.max(0, y - 56) / 240
    },
    0.5,
  )

  // two far trunks in the haze, lit on their left; a close one at the right edge
  for (const [x, w] of [
    [8, 4],
    [58, 5],
  ] as const) {
    const trunk = p.m().poly([x, 0, x + w, 0, x + w + 1, 86, x - 1, 86])
    p.tone(trunk, -1)
    p.tone(trunk.facing([-1, 0]), 1)
  }
  const near = p.m().poly([72, 0, 80, 0, 80, 88, 69, 88, 73.5, 80])
  p.fill(near, JUNGLE[1])
  p.fill(near.facing([-1, 0]), JUNGLE[2])

  // a liana hanging out of the canopy on the left, leaves in pairs
  const liana = quad(P(5, 0), P(11, 30), P(4, 60), 24)
  p.fill(p.m().path(liana), JUNGLE[1])
  liana.forEach(([x, y], i) => {
    if (i % 4 === 2)
      p.fill(p.m().ellipse(x + (i % 8 === 2 ? 2 : -1.5), y + 1, 1.8, 1, i % 8 === 2 ? 30 : -30), JUNGLE[2])
  })

  // forest floor: dark moss with a lighter lip
  const ground = p.m().poly([0, 86, 20, 84.5, 42, 86, 62, 84.5, 80, 85.5, 80, 112, 0, 112])
  p.dither(ground, JUNGLE.slice(0, 4), (x, y) => 0.45 + noise(x, y * 2, 5, 4) * 0.5 - (y - 85) / 12, 0.6)
  p.edge(ground, JUNGLE[3], [0, -1])

  // sunbeams lift whatever they cross by up to three steps, with dithered edges; dust in the light
  const lift = [p.m(), p.m(), p.m()]
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const s = sunlight(x, y) * 3 + bayer(x, y) - 0.5
      lift.forEach((m, k) => {
        if (s >= k + 1) m.add(x, y)
      })
    }
  }
  p.shine(true)
  for (const m of lift) p.tone(m, 1)
  const rand = rng(14)
  for (let i = 0; i < 60; i++) {
    const x = 4 + Math.floor(rand() * 72)
    const y = 16 + Math.floor(rand() * 70)
    if (sunlight(x, y) > 0.3) p.px(x, y, SUN[2])
  }
  p.shine(false)
}

/** A petal: a broad rounded blade with a few pale spots. */
function petal(d: Painter, at: readonly number[], spots: readonly number[], bias = 0): void {
  const [cx = 0, cy = 0, rx = 0, ry = 0, rot = 0] = at
  const blade = d.m().ellipse(cx, cy, rx, ry, rot)
  d.part(blade, PINK, { bevel: 4, bias })
  for (const [x, y] of pts(spots)) d.fill(d.m().ellipse(x, y, 1.6, 1.1, rot).and(blade.shrunk(1)), PINK[4])
}

/** A big drooping leaf along a spine, with a lighter midrib. */
function leaf(d: Painter, spine: readonly number[], widths: readonly number[]): void {
  const blade = d.m().limb(spine, widths)
  d.part(blade, LEAF, { bevel: 3 })
  d.fill(d.m().path(spline(spine, 6)).and(blade.shrunk(1)), LEAF[3])
}

/** A pillar of a leg on a broad foot with three white nails at the front. */
function leg(d: Painter, joints: readonly number[], radii: readonly number[], foot: Pt, width: number): void {
  d.part(d.m().limb(joints, radii), TEAL)
  d.part(d.m().ellipse(foot[0], foot[1], width, 3.3), TEAL, { bevel: 3 })
  for (const dx of [-0.62, 0, 0.62])
    d.stamp(['ww', 'w.'], Math.round(foot[0] + dx * width - 1), Math.round(foot[1] + 1), { w: CLAW })
}

/** Outline of the head: broad and flat, the cheeks wide around the mouth. */
const HEAD = [
  17, 60, 18.5, 55, 23, 52, 29, 51, 35, 51, 40.5, 52.5, 44.5, 55.5, 46, 60, 45, 65, 41, 68.5, 35, 70.5, 28,
  70.5, 22, 68.5, 18.5, 65, 17, 60,
]
/** Eyes under a heavy brow, red with a glint: k = brow and lid, r = iris, w = glint. */
const EYE_L = ['kk...', '.kkkk', '.wrrk', '..rr.']
const EYE_R = ['...kk', 'kkkk.', 'kwrr.', '.rr..']

function venusaur(d: Painter): void {
  const m = (): Mask => d.m()

  // back petal, then the body with the hind leg
  petal(d, [47, 24, 8, 7.5, 0], [44, 21, 50, 25], -1)
  d.part(m().ellipse(50, 66, 24, 17), TEAL, { bevel: 10 })
  leg(d, [64, 70, 66, 78, 66, 83], [8, 7.4, 7], P(66.5, 85), 9)

  // leaves fanning out from under the flower and drooping down both flanks
  leaf(d, [44, 42, 30, 45, 18, 49, 9, 56, 4, 66], [2.5, 6, 7, 5, 1.5])
  leaf(d, [47, 44.5, 63, 45.5, 74, 50, 80, 57, 83, 67], [3, 6, 7, 5, 1.5])

  // the flower: side petals, then the two petals hanging towards the viewer, meeting in the middle
  petal(d, [27, 28, 15.5, 7, -8], [20, 27, 30, 30])
  petal(d, [66, 28, 15, 7, 10], [63, 26, 72, 30])
  petal(d, [35, 39.5, 13, 7.5, -28], [30, 41, 38, 37])
  petal(d, [58, 39.5, 13, 7.5, 28], [55, 37, 63, 41])

  // front legs, then the head low between them
  leg(d, [44, 71, 44.5, 79, 44, 83], [7, 6.5, 6.5], P(43.5, 85), 8.5)
  leg(d, [25, 68, 20.5, 77, 19, 83], [8.5, 8, 7.5], P(18, 85), 10)
  for (const ear of [m().poly([19, 56, 16.5, 45.5, 26, 52]), m().poly([36.5, 51.5, 45, 45, 44.5, 56])]) {
    d.part(ear, TEAL, { bevel: 2 })
    d.fill(ear.shrunk(1).and(ear.moved(1, 1)), TEAL[1])
  }
  d.part(m().poly(spline(HEAD, 5)), TEAL)
  // jaws open in a growl, the corners pulled down
  const mouth = m().poly([23, 64.5, 26, 62.5, 35, 62.5, 38, 64.5, 36, 67.5, 33, 69, 28, 69, 25, 67.5])
  d.contact(mouth).fill(mouth, MOUTH)
  d.fill(m().ellipse(30.5, 68, 3.5, 1.4).and(mouth), PINK[2])
  const face = { k: TEAL[0], r: RED, w: CLAW }
  d.stamp(EYE_L, 22, 55, face)
  d.stamp(EYE_R, 35, 55, face)
  d.px(28, 60, TEAL[0]).px(33, 60, TEAL[0])

  // darker patches on the hide
  const hide = m()
  d.mask().each((x, y) => {
    if ((TEAL as readonly number[]).includes(d.get(x, y))) hide.add(x, y)
  })
  const patches = m()
  for (const [x, y, rx, ry] of [
    [60, 60, 3.5, 2.5],
    [69, 69, 2.5, 3],
    [56, 75, 3, 2],
    [31, 53.5, 4, 1.6],
    [21.5, 76, 2.5, 2],
    [67, 77, 2, 2.5],
    [45, 78, 2, 1.5],
  ] as const)
    patches.ellipse(x, y, rx, ry)
  d.tone(patches.and(hide), -1)

  // the beams catch the flower and the tops of the leaves
  const lit = m()
  for (let y = 0; y < 50; y++) for (let x = 0; x < d.w; x++) if (sunlight(x, y) > 0.45) lit.add(x, y)
  d.tone(d.mask().and(lit), 1)
}

export const bisaflor: CardDef = {
  id: 'pkm-base-087',
  number: 87,
  name: 'Bisaflor',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Pflanze',
  hp: 100,
  attacks: [{ name: 'Solarstrahl', cost: ['Pflanze', 'Pflanze', 'Pflanze', 'Pflanze'], damage: '60' }],
  // the sunbeams and the dust in them shine; beast and forest stay matt
  foil: 'painted',
  draw(p) {
    forest(p)
    const d = p.layer()
    venusaur(d)
    p.subject(d, OUTLINE)
  },
}
