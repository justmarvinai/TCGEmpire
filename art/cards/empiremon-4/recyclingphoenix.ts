import type { Mask, Painter, Pt, Ramp } from '../../toolkit/index.ts'
import { colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Recyclingphönix (Ultra, Glut). A phoenix of molten glass and crushed can metal rises out of a melting
 * heap of cans and bottles in a furnace. Its two wings and its tail are three bands of orange-green fire
 * that chase each other round it in a ring, each ending in an arrowhead, like the arrows of a recycling
 * cycle. Full art, 80×112.
 *
 * Composition: the phoenix rises square to the viewer, wings of flame spread wide, head turned left; the
 * ring of green arrows runs behind it, each arrow leaving a wing or the tail. The frame's plates cover rows
 * 4–14 and 91–106, so the ring spans rows 23–81 and the heap lies between rows 80 and 90.
 */
const DARK = colors('0e0606', '1e0a08', '361410', '5a1e12', '8a3014')
const FIRE = colors('7a1e0a', 'c8441a', 'f08a2a', 'ffc850', 'fff4c0')
const FLAME = colors('0e3a14', '1e7a2a', '4ac040', 'b8f070')
const CAN = colors('3a3e4a', '7a8090', 'c0c6d0', 'f0f2f6')
const LABEL = colors('8a1a1e', 'd83a3a')
const OUTLINE = hex('120404')

const P = (x: number, y: number): Pt => [x, y]
const C = P(40, 52)
const R = 29
const TAU = Math.PI * 2

// ── the furnace ─────────────────────────────────────────────────────────────

function furnace(p: Painter): void {
  p.dither(
    null,
    DARK,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - C[0], (y - C[1]) * 0.85) / 50)
      return 0.05 + glow * glow * 0.95 + Math.max(0, (y - 70) / 60) * 0.3
    },
    0.5,
  )
  p.register(DARK)
  // the brick arch of the furnace mouth round the scene
  const arch = p.m()
  for (let y = 0; y < 112; y++) {
    for (let x = 0; x < 80; x++) {
      const d = Math.hypot((x - 40) * 1.05, y < 50 ? y - 50 : 0)
      if (d > 37) arch.add(x, y)
    }
  }
  p.fill(arch, DARK[1])
  const joints = p.m()
  arch.each((x, y) => {
    const row = Math.floor(y / 4)
    if (y % 4 === 0 || (x + (row % 2) * 3) % 6 === 0) joints.add(x, y)
  })
  p.fill(joints.and(arch), DARK[0])
  p.fill(arch.facing([1, 0, -1, 0, 0, 1]).and(p.m().rect(0, 0, 80, 90)), DARK[3])
  // embers rising
  const rand = rng(17)
  for (let i = 0; i < 30; i++) {
    const x = 6 + Math.floor(rand() * 68)
    const y = 15 + Math.floor(rand() * 72)
    if (arch.has(x, y)) continue
    const c = rand() < 0.5 ? FIRE[3] : FLAME[3]
    p.px(x, y, c)
    if (rand() < 0.4) p.px(x, y + 1, FIRE[1])
  }
}

/** A heap of crushed cans and bottle glass melting into a glowing pool under the phoenix. */
function heap(p: Painter): void {
  const pool = p.m().ellipse(40, 86, 30, 6)
  p.dither(
    pool,
    [FIRE[1], FIRE[2], FIRE[3], FIRE[4]],
    (x, y) => 1 - Math.hypot(x - 40, (y - 84) * 3) / 30,
    0.6,
  )
  p.register(FIRE)
  const cans: readonly [number, number, number][] = [
    [16, 83, -25],
    [25, 86, 15],
    [56, 84, 30],
    [64, 86, -10],
    [10, 88, 70],
    [70, 82, 60],
  ]
  for (const [x, y, rot] of cans) {
    // a crushed can: a squashed silver body with a red band, dented in the middle
    const body = p.m().ellipse(x, y, 4.2, 2.4, rot)
    p.part(body, CAN, { bevel: 1.5 })
    const band = p.m().ellipse(x, y, 4.2, 0.9, rot).and(body.shrunk(1))
    p.fill(band, LABEL[1])
    p.fill(band.facing([0, 1]), LABEL[0])
  }
  // bottle shards in the melt
  for (const [x, y, flip] of [
    [33, 84, false],
    [47, 85, true],
  ] as const) {
    p.stamp(['..g', '.gG', 'gGG', 'ggg'], x, y - 3, { g: FLAME[1], G: FLAME[2] }, flip)
  }
  // drops of molten glass rising out of the pool towards the bird
  for (const [x, y] of [
    [27, 76],
    [52, 74],
    [47, 79],
  ] as const) {
    p.fill(p.m().disc(x, y, 1.1), FIRE[3])
    p.fill(p.m().rect(x - 0.5, y + 1, 1, 2), FIRE[1])
  }
}

// ── the ring of fire ────────────────────────────────────────────────────────

/** A point on the ring at an angle (degrees, clockwise from the right). */
const onRing = (deg: number, r = R): Pt => [
  C[0] + Math.cos((deg * TAU) / 360) * r,
  C[1] + Math.sin((deg * TAU) / 360) * r,
]

interface Arrow {
  /** Where the band starts (at a wing tip or the tail) and where its arrowhead begins (degrees, clockwise). */
  from: number
  head: number
}

/** Left wing's arrow over the top, right wing's down the right side, the tail's up the left: clockwise. */
const ARROWS: readonly Arrow[] = [
  { from: 218, head: 290 },
  { from: 338, head: 50 },
  { from: 98, head: 170 },
]
const HEAD_LEN = 20
const BAND = 4.2
const BARB = 8.5

/** Angle of a pixel round the ring centre in degrees, 0–360 clockwise from the right. */
const angleOf = (x: number, y: number): number =>
  ((Math.atan2(y + 0.5 - C[1], x + 0.5 - C[0]) * 360) / TAU + 360) % 360
/** Degrees from `a` clockwise to `b`. */
const span = (a: number, b: number): number => (b - a + 360) % 360

/** Paint the arrows: a yellow core, green fire round it, dark green tongues at the edges; flame lines across. */
function ring(p: Painter): void {
  const ramp: Ramp = [FLAME[0], FLAME[0], FLAME[1], FLAME[2], FLAME[3], FIRE[3]]
  for (const a of ARROWS) {
    const m = p.m()
    const body = span(a.from, a.head)
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const t = span(a.from, angleOf(x, y))
        const r = Math.hypot(x + 0.5 - C[0], y + 0.5 - C[1])
        let h: number
        let line = false
        if (t <= body) {
          // swelling out of the feathers; tongues lick backwards off the outer edge, the inner edge is scalloped
          h = BAND * (0.5 + 0.5 * Math.min(1, t / 24))
          if (r > R) h += (((t * 0.9) % 12) / 12) * 2.8 * Math.min(1, t / 24)
          else h -= Math.abs(((t % 9) / 9) * 2 - 1) * 1.2
          line = r < R + 1 && t % 9 < 1.4 && t > 12
        } else if (t <= body + HEAD_LEN) h = BARB * (1 - (t - body) / HEAD_LEN)
        else continue
        const k = Math.abs(r - R) / Math.max(0.5, h)
        if (k > 1) continue
        let c = k < 0.2 ? 5 : k < 0.45 ? 4 : k < 0.68 ? 3 : k < 0.86 ? 2 : 1
        if (line && c > 2) c -= 2
        p.set(x, y, ramp[c] ?? 0)
        m.add(x, y)
      }
    }
    p.fill(m.facing(), FLAME[0])
  }
  p.register(FLAME)
  p.register(FIRE)
}

// ── the phoenix ─────────────────────────────────────────────────────────────

/** A tongue of flame along a curve: shaded fire with a yellow core line, red towards the tip, a green tip. */
function tongue(d: Painter, line: readonly Pt[], r: number): Mask {
  const f = d.m().limb(line, [r, r * 0.75, r * 0.45, 0.6])
  d.part(f, FIRE, { bevel: 2, line: 'shadow' })
  const tip = line[line.length - 1] ?? C
  const before = line[line.length - 2] ?? tip
  d.fill(d.m().capsule(tip[0], tip[1], before[0], before[1], 2.2, 2.2).and(f).minus(f.shrunk(1)), FIRE[1])
  d.fill(
    d
      .m()
      .capsule(
        tip[0],
        tip[1],
        tip[0] + (before[0] - tip[0]) * 0.4,
        tip[1] + (before[1] - tip[1]) * 0.4,
        1.4,
        1.4,
      )
      .and(f),
    FLAME[2],
  )
  const core = d.m().path(line.slice(0, -1).flat()).and(f.shrunk(1))
  d.fill(core, FIRE[3])
  return f
}

/** Mirror x round the middle of the bird. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

/** A point at an angle (degrees, clockwise from the right) and a distance from the ring centre. */
const polar = (deg: number, r: number): Pt => onRing(deg, r)

/** The phoenix rises square to the viewer inside the ring: wings of flame tongues, a swept tail, a molten-glass body. */
function phoenix(d: Painter): void {
  const m = (): Mask => d.m()
  // wings: four tongues each, fanning out from the shoulder to just inside the ring, curling up at the tips
  for (const s of [1, -1]) {
    const x = side(s)
    const tip = (deg: number, r: number): Pt => {
      const [px, py] = polar(deg, r)
      return P(x(px), py)
    }
    const tongues: readonly [readonly Pt[], number][] = [
      [[P(x(36), 47), P(x(32), 41), tip(222, 20), tip(220, 24.5)], 3.6],
      [[P(x(36), 48), P(x(30), 45), tip(198, 20), tip(194, 25)], 3.4],
      [[P(x(36), 50), P(x(29), 51), tip(176, 19), tip(170, 24)], 3],
      [[P(x(36.5), 52), P(x(31), 56), tip(154, 17), tip(146, 21)], 2.6],
    ]
    // the wing is one fan: the shoulder, the top tongue out to its tip, notches between the tips, the
    // lowest tongue back; the tongues are then painted over it as feathers of flame
    const tips = tongues.map(([line]) => line[line.length - 1] ?? C)
    const outline: Pt[] = [...(tongues[0]?.[0] ?? [])]
    for (let i = 1; i < tips.length; i++) {
      const a = tips[i - 1] ?? C
      const b = tips[i] ?? C
      outline.push(
        P(
          (a[0] + b[0]) / 2 + (x(36) - (a[0] + b[0]) / 2) * 0.3,
          (a[1] + b[1]) / 2 + (49 - (a[1] + b[1]) / 2) * 0.3,
        ),
        b,
      )
    }
    outline.push(...[...(tongues[3]?.[0] ?? [])].reverse())
    d.part(m().poly(outline), FIRE, { bevel: 3, bias: -1 })
    for (const [line, r] of [...tongues].reverse()) tongue(d, line, r)
    // a pauldron of crushed can metal on the shoulder, its red print
    const plate = m().ellipse(x(35.5), 46.5, 4, 2.8, s * -25)
    d.part(plate, CAN, { bevel: 1.5, bias: 1 })
    d.fill(
      m()
        .path([x(32.5), 47.5, x(38.5), 45])
        .and(plate.shrunk(1)),
      LABEL[1],
    )
  }
  // tail: one long plume sweeping down to the left, a thinner lick beside it
  tongue(d, [P(41, 59), P(43, 66), P(43.5, 72), P(41.5, 76)], 2.2)
  tongue(d, [P(40, 57), P(38.5, 65), P(35, 71), P(30, 75), P(26.5, 75)], 3.8)
  // body of molten glass, white-hot at the heart
  const body = m().ellipse(40, 51, 5.8, 8.2)
  d.part(body, FIRE, { bevel: 4 })
  d.fill(m().ellipse(39.5, 50, 2.8, 4.4).and(body.shrunk(2)), FIRE[4])
  for (const [fx, fy] of [
    [38, 54],
    [42, 54],
    [40, 57],
  ] as const) {
    d.fill(
      m()
        .path([fx - 1.5, fy - 1, fx, fy + 0.5, fx + 1.5, fy - 1])
        .and(body.shrunk(1)),
      FIRE[2],
    )
  }
  // neck and head in profile, looking left; a hooked beak of green bottle glass
  d.part(m().limb([40, 44, 39.5, 40, 39, 37], [3.2, 2.9, 2.7]), FIRE, { bevel: 2.5, line: 'shadow' })
  d.part(m().ellipse(39, 34.5, 4.3, 3.8), FIRE, { bevel: 3 })
  const beak = m().poly([35.5, 32.5, 29.5, 33, 30.5, 35.5, 32.5, 37, 35.5, 37])
  d.part(beak, [FLAME[0], FLAME[1], FLAME[2], FLAME[3]], { bevel: 1.5 })
  d.px(30, 35, FLAME[0])
  d.stamp(['ww', 'kw'], 36.5, 33, { w: FIRE[4], k: OUTLINE })
  // a crest of flames swept back from the crown of the head
  tongue(d, [P(40.5, 31.5), P(43, 28), P(47, 26.5), P(50, 27.5)], 1.8)
  tongue(d, [P(42, 33), P(45.5, 31.5), P(49, 32), P(51, 34)], 1.5)
}

/** Close single-pixel gaps left between two composited subjects, the way `silhouette` does inside one. */
function seal(p: Painter): void {
  const gaps = p.subjectMask.cleaned().minus(p.subjectMask)
  p.fill(gaps, OUTLINE)
  p.subjectMask.or(gaps)
}

export const recyclingphoenix: CardDef = {
  id: 'emp4-022',
  number: 22,
  name: 'Recyclingphönix',
  tier: 'ultra',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    furnace(p)
    heap(p)
    const back = p.layer()
    ring(back)
    p.subject(back, OUTLINE)
    const d = p.layer()
    phoenix(d)
    p.subject(d, OUTLINE)
    seal(p)
  },
}
