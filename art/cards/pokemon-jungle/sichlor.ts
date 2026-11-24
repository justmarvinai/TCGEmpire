import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, quad, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Sichlor (Ultra). Brief: green mantis airborne in an X-slash, both scythes crossed in front of the
 * chest, wings a blur, eyes narrowed; a bamboo thicket cut clean along one diagonal, segments and
 * leaves falling, shafts of light through the canopy. Full art, 80×112.
 *
 * Composition: the mantis hangs in the air in the middle, turned a little to the left, forearms
 * crossed over the chest so the two pale blades fan out to the upper corners and frame the head.
 * Behind it the canopy opens: a pale haze with shafts of light, so the head and blades read against
 * light and the body against the dark depth below. The slash has left a glowing line in the air;
 * along it the bamboo is cut and the upper stalks slide off. The name plate covers rows 5–15, the
 * attack plate 88–106.
 */
const AIR = colors('03100c', '08201a', '0f3124', '1a4630', '2c6040', '4c8452', '9cb676', 'd8dca4', 'f8f4d4')
const GREEN = colors('0e3014', '1c5a20', '35892c', '5fba3c', 'a8e46c')
const CREAM = colors('7c6a3a', 'c4ae6c', 'f0e0a4')
const BLADE = colors('44585a', '92a8a4', 'd6e6dc', 'ffffff')
const WING = colors('6fa894', 'c4ecd8')
const RED = hex('ee3428')
const OUTLINE = hex('030a06')

const P = (x: number, y: number): Pt => [x, y]

/** Where the slash cut the thicket: the stalks above this line slid off along it. */
const cutAt = (x: number): number => 68 - 0.44 * x
const SLIDE = P(-3, 1)
/** The canopy opens above the head; shafts fan out from a point high above it. */
const GAP_AT = P(40, 24)
const SUN_AT = P(46, -60)
const SHAFTS = [
  [-12, 1.2],
  [-4.5, 1.8],
  [3, 1.1],
  [10, 1.6],
] as const

/** Brightness of the haze in the canopy gap, 0–1. */
function haze(x: number, y: number): number {
  return Math.pow(Math.max(0, 1 - Math.hypot((x - GAP_AT[0]) * 0.85, y - GAP_AT[1]) / 48), 1.4)
}

/** Strength of a light shaft at a pixel: 1 in its heart, 0 outside, fading downwards. */
function shaftLight(x: number, y: number): number {
  const a = (Math.atan2(x + 0.5 - SUN_AT[0], y + 0.5 - SUN_AT[1]) * 180) / Math.PI
  let s = 0
  for (const [at, half] of SHAFTS) s = Math.max(s, 1 - Math.abs(a - at) / half)
  return s * Math.max(0, 1 - y / 120)
}

/** A near bamboo stalk in the shade: dark, ringed by nodes, its rim lit from the gap. */
function cane(p: Painter, m: Mask, nodes: readonly number[], lit: number): void {
  p.fill(m, AIR[1])
  p.fill(m.facing([lit, 0]), AIR[3])
  p.fill(m.facing([-lit, 0]), AIR[0])
  for (const y of nodes) {
    p.fill(m.clone().and(p.m().rect(0, y, 80, 1)), AIR[0])
    p.fill(
      m
        .clone()
        .and(p.m().rect(0, y + 1, 80, 1))
        .minus(m.facing([-lit, 0])),
      AIR[3],
    )
  }
}

/** A near stalk at x with width w, cut along the slash: the top part slid down the cut. */
function cutCane(p: Painter, x: number, w: number, nodes: readonly number[]): void {
  const lit = x < 40 ? 1 : -1
  const below = p.m()
  const above = p.m()
  for (let yy = 0; yy < p.h; yy++)
    for (let xx = x; xx < x + w; xx++) (yy + 0.5 >= cutAt(xx + 0.5) ? below : above).add(xx, yy)
  cane(p, below, nodes, lit)
  const slid = above.moved(SLIDE[0], SLIDE[1])
  cane(
    p,
    slid,
    nodes.map((n) => n + SLIDE[1]),
    lit,
  )
  // the fresh cut: a pale face on the stump, a dark lip under the part that slid off
  const face = below.clone().minus(below.moved(0, 2))
  p.fill(face, AIR[8])
  p.fill(face.and(below.moved(0, 1)), AIR[7])
  p.fill(slid.clone().minus(slid.moved(0, -1)), AIR[0])
}

/** A short bamboo segment tumbling through the air, its cut end pale. */
function segment(p: Painter, cx: number, cy: number, len: number, r: number, deg: number): void {
  const a = (deg * Math.PI) / 180
  const [dx, dy] = [(Math.cos(a) * len) / 2, (Math.sin(a) * len) / 2]
  const piece = p.m().capsule(cx - dx, cy - dy, cx + dx, cy + dy, r)
  const end = p
    .m()
    .ellipse(cx + dx, cy + dy, r * 0.8, r * 0.8)
    .and(piece)
  p.fill(piece, AIR[1])
  p.fill(piece.facing([-1, 0, 0, -1]), AIR[3])
  p.fill(end, AIR[8])
  p.fill(end.facing([1, 0, 0, 1]), AIR[7])
}

/** A falling bamboo leaf: a dark blade against the haze, pale where it hangs in a shaft. */
function leaf(p: Painter, x: number, y: number, deg: number): void {
  const blade = p.m().ellipse(x, y, 3.6, 1.1, deg)
  const lit = shaftLight(x, y) > 0.1 || haze(x, y) < 0.2
  p.fill(blade, lit ? AIR[7] : AIR[2])
  p.fill(blade.facing([1, 0, 0, 1]), lit ? AIR[6] : AIR[1])
}

function thicket(p: Painter): void {
  p.register(AIR)
  // the canopy opens above the mantis: pale haze in the gap, dark green depth all round it
  p.dither(
    null,
    AIR,
    (x, y) => {
      const depth = 0.1 + noise(x, y * 0.4, 3, 7) * 0.12 - Math.max(0, y - 62) / 140
      return Math.max(depth, Math.min(0.92, depth + haze(x, y) * 0.95))
    },
    0.6,
  )

  // stalks in the haze: darker bands with their nodes
  for (const [x, w, n] of [
    [8, 2, 22],
    [19, 3, 9],
    [28, 2, 15],
    [51, 2, 4],
    [58, 3, 12],
    [70, 2, 30],
  ] as const) {
    const far = p.m().rect(x, 0, w, 112)
    p.tone(far, -2)
    for (let y = n; y < 112; y += 17) p.tone(far.clone().and(p.m().rect(0, y, 80, 1)), -1)
  }

  // shafts of light fan out of the gap and lift whatever they cross
  const lift = [p.m(), p.m()]
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const s = shaftLight(x, y) * 2 + bayer(x, y) - 0.5
      lift.forEach((m, k) => {
        if (s >= k + 1) m.add(x, y)
      })
    }
  p.shine(true)
  for (const m of lift) p.tone(m, 1)
  p.shine(false)

  // the slash, then the near stalks at both edges, cut through along it
  slash(p)
  cutCane(p, 4, 8, [24, 50, 79])
  cutCane(p, 15, 4, [16, 44, 74])
  cutCane(p, 62, 5, [22, 54, 81])
  cutCane(p, 69, 8, [17, 46, 72])

  // segments and leaves falling out of the cut
  segment(p, 24, 76, 8, 2.4, 60)
  segment(p, 58, 27, 7, 2.2, 75)
  segment(p, 8, 84, 6, 2, -20)
  for (const [x, y, deg] of [
    [27, 84, -40],
    [66, 26, 20],
    [70, 62, -60],
    [12, 34, 75],
    [20, 66, 30],
    [62, 76, -15],
  ] as const)
    leaf(p, x, y, deg)
}

/** The glowing line the blades left in the air, right along the cut. */
function slash(p: Painter): void {
  p.shine(true)
  const stops = [-2, 20, 40, 60, 82].map((x, i) => P(x, cutAt(x) - ([0.5, 1.5, 2, 1.5, 0.5][i] ?? 0)))
  p.fill(p.m().limb(stops, [0.4, 2, 2.8, 2, 0.4]), AIR[6])
  p.fill(p.m().limb(stops, [0, 1.1, 1.8, 1.1, 0]), AIR[7])
  p.fill(p.m().limb(stops, [0, 0.4, 0.9, 0.4, 0]), AIR[8])
  p.shine(false)
}

/**
 * Two pairs of wings beating too fast to see, behind the shoulders: each wing is a pale veil with a
 * solid leading edge, and a fainter ghost of it a little further round shows the beat.
 */
function wings(p: Painter): void {
  const wing = (ox: number, oy: number, deg: number, len: number, wide: number, ghost: boolean) => {
    const a = (deg * Math.PI) / 180
    const cx = ox + (Math.cos(a) * len) / 2
    const cy = oy + (Math.sin(a) * len) / 2
    const veil = p.m().ellipse(cx, cy, len / 2, wide, deg)
    if (ghost) {
      p.fill(veil.facing([0, -1, 0, 1]).and(p.m().rect(0, 0, 80, 112)), WING[0])
      return
    }
    veil.each((x, y) => {
      if (bayer(x, y) < 0.3) p.set(x, y, WING[0])
    })
    p.fill(veil.facing(), WING[1])
    p.fill(
      p
        .m()
        .line(ox, oy, ox + Math.cos(a) * len * 0.85, oy + Math.sin(a) * len * 0.85)
        .and(veil),
      WING[1],
    )
  }
  for (const [ox, oy, deg, len, wide] of [
    [36, 44, 192, 30, 4.6],
    [36, 47, 168, 26, 3.8],
    [48, 44, -12, 30, 4.6],
    [48, 47, 12, 26, 3.8],
  ] as const) {
    wing(ox, oy, deg + (deg > 90 ? 14 : -14), len - 2, wide, true)
    wing(ox, oy, deg, len, wide, false)
  }
}

/** A scythe from the wrist: straight cutting edge on the inside, the back bowed out by `bow`. */
function scythe(d: Painter, base: Pt, tip: Pt, bow: number, w: number): Mask {
  const len = Math.hypot(tip[0] - base[0], tip[1] - base[1])
  const nx = -(tip[1] - base[1]) / len
  const ny = (tip[0] - base[0]) / len
  const s = Math.sign(bow)
  const inner = P(base[0] - (nx * s * w) / 2, base[1] - (ny * s * w) / 2)
  const outer = P(base[0] + (nx * s * w) / 2, base[1] + (ny * s * w) / 2)
  const ctrl = P((outer[0] + tip[0]) / 2 + nx * bow, (outer[1] + tip[1]) / 2 + ny * bow)
  return d.m().poly([inner, ...quad(outer, ctrl, tip, 14)])
}

/** Forearm from the elbow to the wrist, then the blade; `edge` points across the cutting edge. */
function arm(d: Painter, joints: readonly number[], tip: Pt, bow: number, edge: Pt, bias: number): void {
  const wrist = P(joints[joints.length - 2] ?? 0, joints[joints.length - 1] ?? 0)
  d.part(d.m().limb(joints, [3.4, 3.2, 3]), GREEN, { bias, bevel: 2.5 })
  const blade = scythe(d, wrist, tip, bow, 7.5)
  d.part(blade, BLADE, { bevel: 2.6, bias })
  const spine = blade.clone().minus(blade.moved(edge[0], edge[1]))
  d.fill(spine.minus(blade.moved(-edge[0], -edge[1]).minus(blade).grown(1)), BLADE[0])
  d.shine(true)
  d.fill(blade.clone().minus(blade.moved(-edge[0], -edge[1])), BLADE[3])
  d.shine(false)
  d.part(d.m().ellipse(wrist[0], wrist[1], 3.4, 3.4), GREEN, { bias, line: 'shadow' })
}

/** An insect leg in two segments: a strong thigh, a thin shin, a hooked foot. */
function leg(d: Painter, hip: Pt, knee: Pt, ankle: Pt, bias: number): void {
  d.part(d.m().limb([hip, knee], [3.8, 2.6]), GREEN, { bias, bevel: 2.5 })
  d.part(d.m().limb([knee, ankle], [2, 1.5]), GREEN, { bias, bevel: 2 })
  d.part(d.m().disc(knee[0], knee[1], 2.5), GREEN, { bias, line: 'shadow' })
  foot(d, ankle[0] + 1, ankle[1] + 1, bias)
}

/** A foot of three hooked toes, hanging down. */
function foot(d: Painter, x: number, y: number, bias: number): void {
  d.part(d.m().poly([x - 3, y - 1.5, x + 3, y - 1.5, x + 2, y + 3, x, y + 4.5, x - 2, y + 3]), GREEN, {
    bias,
    bevel: 2,
  })
  d.stamp(['w..w..w', '.......'], Math.round(x - 3), Math.round(y + 3), { w: CREAM[1] })
}

/** Outline of the head, three quarters to the left: broad flat brow, the face narrowing to the jaw. */
const HEAD = [
  31, 35, 28, 32, 26.5, 28, 27.5, 23.5, 31, 20.5, 37, 19.5, 43, 20, 48, 23.5, 48.5, 28, 45.5, 32.5, 40, 35.5,
  34, 36.5, 31, 35,
]
/** Narrowed eyes, slanting down to the nose: k = lid, r = red iris, w = glint. */
const EYE_NEAR = ['.......kk', '....kkkrk', '.kkkwrrrk', 'kkrrrrrk.', '.kkkkkk..']
const EYE_FAR = ['kk...', 'rrkk.', 'krrk.', '.kk..']

function mantis(d: Painter): void {
  const m = (): Mask => d.m()

  // abdomen behind the thorax, hanging back and down, in segments
  const belly = m().limb([46, 56, 52.5, 65, 58, 73.5, 61.5, 81], [7, 6.4, 5, 3])
  d.part(belly, GREEN, { bias: -1, bevel: 6 })
  for (const [x, y] of pts([49.5, 61, 54, 67.5, 57.5, 73.5, 60, 78.5]))
    d.fill(
      m()
        .line(x - 6, y + 4, x + 6, y - 4)
        .and(belly.shrunk(1)),
      GREEN[0],
    )

  // far leg and far upper arm, in the shadow behind the body; the legs are tucked for the leap
  leg(d, P(48, 60), P(41, 70), P(47, 78), -1)
  d.part(m().limb([51, 43, 57.5, 51, 60, 60], [3.8, 3.4, 3.2]), GREEN, { bias: -1, bevel: 2.5 })

  // thorax with the cream, ribbed chest, and the neck
  const thorax = m().ellipse(42, 49, 10.5, 11.5, 6)
  d.part(thorax, GREEN)
  const chest = m().ellipse(40.5, 48.5, 6.2, 8.6, 6).and(thorax.shrunk(1))
  d.shade(chest, CREAM, { bevel: 4 })
  for (const y of [44, 48, 52])
    d.fill(
      m()
        .line(33, y + 1, 47, y - 1)
        .and(chest.shrunk(1)),
      CREAM[0],
    )
  d.part(m().limb([40, 33, 41.5, 38, 42, 41], 3.4), GREEN)

  // near leg and near upper arm
  leg(d, P(36, 59), P(25, 67), P(32, 77), 0)
  d.part(m().limb([33, 43, 26, 51, 22.5, 60], [4, 3.6, 3.4]), GREEN, { bevel: 2.5 })

  // the forearms cross over the chest; each blade fans out to an upper corner
  arm(d, [60, 60, 49, 56, 37.5, 52], P(9, 21), -4.5, P(1, -1), -1)
  arm(d, [22.5, 60, 34, 56, 46.5, 52], P(72, 21), 4.5, P(-1, -1), 0)

  // head with the crest swept back, eyes narrowed under a flat brow
  const crest = m().poly([42, 21, 58, 13.5, 49.5, 27.5])
  d.part(crest, GREEN, { bevel: 2.5 })
  d.part(m().poly(spline(HEAD, 4)), GREEN, { bevel: 6 })
  d.fill(m().line(28, 32, 31, 32.5), GREEN[0])
  const face = { k: OUTLINE, r: RED, w: BLADE[3] }
  d.stamp(EYE_NEAR, 34, 23, face)
  d.stamp(EYE_FAR, 27, 24, face)

  // the shafts catch the left-hand rims, the haze in the gap the tops of head and shoulders
  d.tone(
    d
      .mask()
      .facing([-1, 0])
      .and(m().rect(0, 16, 80, 70)),
    1,
  )
  d.tone(
    d
      .mask()
      .facing([0, -1])
      .and(m().rect(24, 14, 34, 32)),
    1,
  )
}

export const sichlor: CardDef = {
  id: 'pkm-jungle-072',
  number: 72,
  name: 'Sichlor',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Pflanze',
  hp: 70,
  attacks: [
    { name: 'Schlitzer', cost: ['Pflanze', 'Farblos', 'Farblos'], damage: '30' },
    { name: 'Schwerttanz', cost: ['Pflanze'] },
  ],
  // the light shafts, the glowing X and the cutting edges of the blades shine; the rest stays matt
  foil: 'painted',
  draw(p) {
    thicket(p)
    wings(p)
    const d = p.layer()
    mantis(d)
    p.subject(d, OUTLINE)
    const rand = rng(5)
    p.shine(true)
    for (let i = 0; i < 24; i++) {
      const x = 6 + Math.floor(rand() * 68)
      const y = 18 + Math.floor(rand() * 66)
      if (shaftLight(x, y) > 0.3 && !p.subjectMask.has(x, y)) p.px(x, y, AIR[8])
    }
    p.shine(false)
  },
}
