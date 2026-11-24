import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Kebabkrake, an Ultra of Spätschicht (docs/sets/empiremon.md). Brief: a red octopus juggling döner skewers and
 * a long knife, steam, warm shop light. Full art, 80×112.
 *
 * Composition: behind the counter of a döner shop at night. Tiled wall in a warm pool of lamp light, the
 * glowing grill with its meat cone on the left, a pink neon chili on the right. The octopus sits on the counter
 * in the middle; two arms throw the skewers and the knife in an arc over its head, the others sprawl over the
 * counter and the salad trays. Steam curls up between the arms. The plates cover rows 4–14 and 91–106.
 */
const WALL = colors('1e0c0c', '3a1a14', '5e2c1a', '8a4824', 'b46e34')
const RED = colors('4a0a1c', '8a1626', 'c42c2e', 'ee5a3a', 'ffa070')
const STEEL = colors('343446', '6e7486', 'b4bccc', 'f0f4fc')
const MEAT = colors('3c1a0c', '6e3414', 'a85c24', 'dc9450')
const HEAT = colors('ff7a24', 'ffd05a')
const GREEN = colors('2e6a24', '7cc23a')
const CREAM = hex('f8dcb4')
const EYE = hex('fff4e0')
const PINK = colors('a0287a', 'ff5ab4', 'ffc0e4')
const OUTLINE = hex('1a0608')

const P = (x: number, y: number): Pt => [x, y]

// ── the shop ────────────────────────────────────────────────────────────────

function shop(p: Painter): void {
  // tiled wall: a pool of warm lamp light behind the octopus, darker towards the corners
  p.shine(true)
  p.dither(
    null,
    WALL,
    (x, y) => {
      const pool = Math.max(0, 1 - Math.hypot(x - 42, (y - 44) * 0.75) / 46)
      return pool * 1.05 - 0.05 + (noise(x, y, 9, 8) - 0.5) * 0.1
    },
    0.6,
  )
  p.shine(false)
  p.register(WALL)
  const grout = p.m()
  for (let y = 3; y < 112; y += 7) grout.rect(0, y, 80, 1)
  for (let x = 2; x < 80; x += 7) grout.rect(x, 0, 1, 112)
  p.tone(grout, -1)

  // the vertical grill on the left: a dark panel, glowing bars, the meat cone turning in front of it
  const panel = p.m().rect(2, 20, 21, 64)
  p.fill(panel, STEEL[0])
  p.fill(panel.facing([0, -1, -1, 0]), STEEL[1])
  p.shine(true)
  for (let y = 23; y < 82; y += 4) {
    p.fill(p.m().rect(4, y, 17, 2), HEAT[0])
    p.fill(p.m().rect(6, y, 13, 1), HEAT[1])
  }
  p.shine(false)
  p.fill(p.m().rect(12, 21, 1, 65), STEEL[2])
  const cone = p.m().poly([3, 28, 22, 28, 20, 44, 17.5, 62, 15.5, 77, 9.5, 77, 7.5, 62, 5, 44])
  p.register(MEAT)
  p.shade(cone, MEAT, { bevel: 6 })
  // crispy rings round the cone, the fresh cut down its front, the grill glowing round its edges
  cone.each((x, y) => {
    if (y % 4 === 1 && p.get(x, y) !== MEAT[3]) p.set(x, y, MEAT[0])
  })
  const cut = p.m().poly([10, 30, 16, 30, 14.5, 56, 12.5, 74, 11, 56]).and(cone)
  p.fill(cut, MEAT[3])
  cut.each((x, y) => {
    if (y % 4 === 1) p.set(x, y, MEAT[2])
  })
  p.shine(true)
  p.fill(cone.facing([1, 0]).or(cone.facing([-1, 0])).minus(p.m().rect(0, 0, 80, 30)), HEAT[0])
  p.shine(false)
  p.fill(p.m().rect(2, 26, 21, 2), STEEL[2])
  p.fill(p.m().rect(2, 26, 21, 1), STEEL[3])
  p.fill(p.m().rect(7, 77, 11, 2), STEEL[2])

  // a pink neon chili on the right of the wall, glowing on the tiles
  const chili = p.m().path([67, 45, 69, 44, 72, 45, 74, 48, 75, 52, 74.5, 57]).path([68, 46, 71, 47, 73, 50, 74, 54, 74.5, 57])
  chili.path([67, 45, 66, 43, 67, 41]).path([65, 42, 67, 41, 69, 42])
  p.shine(true)
  chili
    .grown(2)
    .minus(chili)
    .each((x, y) => {
      if ((x + y) % 2 === 0) p.set(x, y, PINK[0])
    })
  p.fill(chili, PINK[1])
  p.fill(chili.clone().and(p.m().rect(64, 40, 6, 6)), PINK[2])
  p.shine(false)

  // counter: a steel edge, trays of salad, onion and tomato sunk into it, the steel front behind the plate
  const top = p.m().rect(0, 79, 80, 33)
  p.register(STEEL)
  p.fill(top, STEEL[1])
  p.fill(p.m().rect(0, 79, 80, 1), STEEL[3])
  p.fill(p.m().rect(0, 80, 80, 1), STEEL[2])
  p.fill(p.m().rect(0, 89, 80, 1), STEEL[2])
  p.fill(p.m().rect(0, 90, 80, 22), STEEL[0])
  for (const [x, dark, light] of [
    [3, GREEN[0], GREEN[1]],
    [19, RED[1], RED[2]],
    [35, STEEL[2], CREAM],
    [51, GREEN[0], GREEN[1]],
    [67, RED[1], RED[3]],
  ] as const) {
    const tray = p.m().rect(x, 82, 13, 6)
    p.fill(tray, dark)
    tray.each((tx, ty) => {
      if ((tx * 3 + ty * 5) % 7 < 3) p.set(tx, ty, light)
    })
    p.fill(tray.outerEdge().and(p.m().rect(0, 81, 80, 8)), STEEL[0])
  }
}

/** Steam: soft curling wisps, every other pixel, rising from the counter. */
function steam(p: Painter): void {
  p.shine(true)
  for (const [x, top, phase] of [
    [27, 36, 0],
    [55, 32, 2.5],
  ] as const) {
    const puff = p.m()
    for (let y = 80; y > top; y -= 2) {
      const k = (80 - y) / (80 - top)
      puff.disc(x + Math.sin(y / 5 + phase) * (1 + k * 3), y, 2.6 - k * 1.4)
    }
    puff.each((px, py) => {
      if ((px + py) % 2 === 0) p.set(px, py, CREAM)
    })
  }
  p.shine(false)
}

// ── what flies ──────────────────────────────────────────────────────────────

/** A döner skewer: a thin steel rod with meat, onion, pepper and tomato pushed onto it. */
function skewer(d: Painter, a: Pt, b: Pt): void {
  const rod = d.m().line(a[0], a[1], b[0], b[1])
  d.fill(rod, STEEL[2])
  const pieces = [MEAT, [GREEN[0], GREEN[1], GREEN[1]], MEAT, [STEEL[1], CREAM, CREAM], MEAT, [RED[1], RED[3], RED[3]]] as const
  pieces.forEach((ramp, i) => {
    const t = 0.2 + (i / (pieces.length - 1)) * 0.62
    const chunk = d.m().disc(a[0] + (b[0] - a[0]) * t + 0.5, a[1] + (b[1] - a[1]) * t + 0.5, 1.6)
    d.part(chunk, ramp, { bevel: 1.5, line: 'none' })
  })
}

/** The long döner knife: a broad steel blade with a bright edge and a black handle. */
function knife(d: Painter, a: Pt, b: Pt): void {
  const [ax, ay] = a
  const [bx, by] = b
  const len = Math.hypot(bx - ax, by - ay)
  const [ux, uy] = [(bx - ax) / len, (by - ay) / len]
  const at = (k: number, s: number): Pt => [ax + ux * k - uy * s, ay + uy * k + ux * s]
  const handle = d.m().capsule(...at(0, 0), ...at(4.5, 0), 1.2)
  const blade = d.m().poly([...at(5, -1.4), ...at(len - 3, -1.6), ...at(len, 0.6), ...at(len - 2, 1.4), ...at(5, 1.4)])
  d.part(blade, STEEL, { bevel: 2, line: 'none' })
  d.fill(blade.facing([Math.round(-uy), Math.round(ux)]), STEEL[3])
  d.fill(handle, OUTLINE)
  d.fill(d.m().rect(...at(4.8, -1.8), 1, 1), STEEL[2])
}

// ── the octopus ─────────────────────────────────────────────────────────────

interface Arm {
  path: readonly number[]
  radii: readonly number[]
  /** −1 for arms behind the body. */
  bias: number
}

const ARMS: readonly Arm[] = [
  // behind: two arms curling on the counter
  { path: [34, 60, 26, 66, 18, 72, 12, 76, 8, 73, 10, 70], radii: [4, 3.4, 2.8, 2, 1.3, 1], bias: -1 },
  { path: [46, 60, 54, 66, 62, 72, 68, 76, 72, 73, 70, 70], radii: [4, 3.4, 2.8, 2, 1.3, 1], bias: -1 },
  // raised: throwing on the left, catching on the right
  { path: [31, 55, 23, 52, 17, 45, 15, 36, 17, 30], radii: [4.2, 3.4, 2.6, 2, 1.6], bias: 0 },
  { path: [49, 55, 57, 52, 63, 45, 65, 36, 62, 31], radii: [4.2, 3.4, 2.6, 2, 1.6], bias: 0 },
  // in front: four sprawling down over the edge of the counter
  { path: [36, 61, 33, 68, 28, 74, 22, 80, 18, 78], radii: [4, 3.4, 2.6, 1.8, 1.2], bias: 0 },
  { path: [44, 61, 47, 68, 52, 74, 58, 80, 62, 78], radii: [4, 3.4, 2.6, 1.8, 1.2], bias: 0 },
  { path: [41, 62, 42, 70, 39, 77, 34, 81, 31, 78], radii: [3.8, 3.2, 2.4, 1.6, 1.1], bias: 0 },
  { path: [39, 62, 38, 70, 40, 77, 45, 81, 48, 78], radii: [3.8, 3.2, 2.4, 1.6, 1.1], bias: 0 },
]

/** One arm: shaded red, pale suckers along its lower edge. */
function arm(d: Painter, a: Arm): void {
  const m = d.m().limb(a.path, a.radii)
  d.part(m, RED, { bevel: 3, bias: a.bias })
  const start = d.m().disc(a.path[0] ?? 0, a.path[1] ?? 0, 6)
  m.facing([0, 1])
    .minus(start)
    .each((x, y) => {
      if (x % 3 === 0) d.px(x, y, a.bias < 0 ? RED[3] : CREAM)
    })
}

function octopus(d: Painter): void {
  const m = (): Mask => d.m()
  for (const a of ARMS.slice(0, 2)) arm(d, a)

  // the mantle: a big round dome leaning back a little
  const mantle = m().ellipse(40, 41, 13, 13.5, -8).ellipse(40, 52, 11, 8)
  d.part(mantle, RED, { bevel: 9 })
  // pale spots on the dome
  for (const [x, y, r] of [
    [35, 34, 1.6],
    [44, 31, 1.2],
    [47, 39, 1.4],
    [31, 42, 1.1],
  ] as const) {
    d.fill(m().disc(x, y, r).and(mantle), RED[3])
  }

  for (const a of ARMS.slice(2)) arm(d, a)

  // face: big eyes looking up at what flies, a cheeky open grin
  const FACE = [
    '.kkk.....kkk.',
    'kwwwk...kwwwk',
    'kwppk...kppwk',
    'kwppk...kppwk',
    'kwwwk...kwwwk',
    '.kkk.....kkk.',
    '.............',
    '..kkkkkkkkk..',
    '...kwwttwk...',
    '....kkkkk....',
  ]
  d.stamp(FACE, 33.5, 42, { k: OUTLINE, w: EYE, p: OUTLINE, t: RED[3] })

  // what it holds: a skewer in the throwing arm, the knife caught by its handle on the right
  skewer(d, P(13, 34), P(24, 23))
  knife(d, P(63, 33), P(70, 17))

  // warm light of the grill on the left flank of the dome and the arms
  const body = d.mask()
  d.fill(body.facing([-1, 0]).and(d.m().rect(0, 28, 40, 30)).minus(body.facing([1, 0])), RED[4])
}

/** Motion: a dotted arc from the throwing arm over the head to the catching arm. */
function juggle(p: Painter): void {
  const arc = p.m()
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const x = 17 + 46 * t
    const y = 30 - Math.sin(t * Math.PI) * 12
    if (i % 2 === 0) arc.add(Math.round(x), Math.round(y))
  }
  p.shine(true)
  arc.minus(p.subjectMask.grown(1)).each((x, y) => p.px(x, y, CREAM))
  p.shine(false)
}

export const kebabkrake: CardDef = {
  id: 'emp2-016',
  number: 16,
  name: 'Kebabkrake',
  tier: 'ultra',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    shop(p)
    steam(p)
    const d = p.layer()
    octopus(d)
    p.subject(d, OUTLINE)
    juggle(p)
    // the second skewer at the top of the arc
    const air = p.layer()
    skewer(air, P(33, 21), P(47, 15))
    p.subject(air, OUTLINE)
  },
}
