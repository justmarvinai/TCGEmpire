import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Mystischer Raum-Taifun (Ultra). Brief: no character. A green-white cyclone spirals from the upper
 * left into the centre, its tail sweeping across the frame; at its eye a face-down card tears into
 * shards. Deep space with nebula clouds; the stars bend into the spiral. Full art, 80×112.
 *
 * Composition: one wide arm of emerald wind enters under the name plate at the top left, sweeps down
 * the left side, along the bottom and up the right, and coils tighter and whiter into the eye a
 * little below the middle. There a face-down card (our own card back) is torn in two, its halves
 * twisting apart and shards flying off along the wind. Stars near the storm are drawn out into
 * arcs; violet nebula drifts in the black-blue space. Text plates float over rows 0–13 and 90–111.
 */
const SPACE = colors('02030a', '050a18', '0a1430', '121e44')
const NEBULA = colors('22103e', '3e1c62', '66308a')
const WIND = colors('06301e', '0e5a36', '1c8c52', '3cc878', '9af4b8')
const CORE = hex('f2fff6')
const BACK = colors('0e1c52', '2150b0', '62a8f0')
const GOLD = colors('8a5a0e', 'e9b62a')
const RED = hex('d8323a')
const STAR = hex('a8c0f0')
const OUTLINE = hex('010308')

const P = (x: number, y: number): Pt => [x, y]

/** The eye of the storm, where the card is torn. */
const EYE = P(44, 52)
/** The centre line of the arm from its tail (top left, off the picture) to the eye. */
const ARM = spline(
  [
    P(-6, 12),
    P(9, 27),
    P(12, 52),
    P(24, 74),
    P(48, 81),
    P(67, 68),
    P(70, 44),
    P(57, 29),
    P(38, 31),
    P(29, 46),
    P(35, 61),
    P(50, 63),
    P(56, 52),
    P(50, 43),
    P(41, 44),
  ],
  6,
)
/** Half the width of the arm, from the tail to the eye. */
const width = (t: number): number => 7.5 - t * 5.5

/** Nearest point of the arm: how far along it (0 tail – 1 eye), and how far across (−1 … 1). */
function onArm(x: number, y: number): { t: number; across: number } {
  let best = Infinity
  let t = 0
  let side = 0
  for (let i = 0; i + 1 < ARM.length; i++) {
    const [ax, ay] = ARM[i] ?? P(0, 0)
    const [bx, by] = ARM[i + 1] ?? P(0, 0)
    const dx = bx - ax
    const dy = by - ay
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    const d = Math.hypot(x - ax - dx * k, y - ay - dy * k)
    if (d < best) {
      best = d
      t = (i + k) / (ARM.length - 1)
      side = Math.sign((x - ax) * dy - (y - ay) * dx)
    }
  }
  return { t, across: (side * best) / width(t) }
}

function space(p: Painter): void {
  p.shine(true)
  // black-blue space, violet nebula drifting through it
  p.dither(null, SPACE, (x, y) => 0.15 + noise(x, y, 2, 14) * 0.5 + (y / 112) * 0.2, 0.8)
  p.dither(
    null,
    [SPACE[2], ...NEBULA],
    (x, y) => {
      const cloud = noise(x * 0.8, y, 9, 11) * 0.7 + noise(x, y, 4, 5) * 0.2 - 0.3
      return cloud + Math.max(0, 1 - Math.hypot(x - 8, y - 96) / 40) * 0.5
    },
    1,
  )
  // restore the darkest space where the nebula is thin
  p.dither(p.m().rect(0, 0, 80, 112).and(nebulaGaps(p)), SPACE, (x, y) => 0.1 + noise(x, y, 2, 14) * 0.45 + (y / 112) * 0.15, 0.8)

  // stars: pinpricks far out, drawn out into arcs round the eye where the storm pulls at them
  const rand = rng(31)
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * 80)
    const y = Math.floor(rand() * 112)
    const r = Math.hypot(x - EYE[0], y - EYE[1])
    const c = rand() < 0.35 ? CORE : STAR
    if (r > 34 || r < 9) {
      p.px(x, y, c)
      continue
    }
    const a = Math.atan2(y - EYE[1], x - EYE[0])
    const len = 3 + Math.round((34 - r) / 7)
    for (let j = 0; j < len; j++) {
      const b = a - (j * 1.3) / r
      p.px(Math.round(EYE[0] + Math.cos(b) * r), Math.round(EYE[1] + Math.sin(b) * r), j === 0 ? c : STAR)
    }
  }
  p.shine(false)
}

/** Where the nebula noise is thin, so deep space shows through. */
function nebulaGaps(p: Painter): Mask {
  const m = p.m()
  for (let y = 0; y < 112; y++)
    for (let x = 0; x < 80; x++) {
      const cloud = noise(x * 0.8, y, 9, 11) * 0.7 + noise(x, y, 4, 5) * 0.2 - 0.3
      if (cloud + Math.max(0, 1 - Math.hypot(x - 8, y - 96) / 40) * 0.5 < 0.1) m.add(x, y)
    }
  return m
}

/** The arm of the cyclone: emerald wind with white streaks, whiter and tighter towards the eye. */
function cyclone(d: Painter): void {
  const band = d.m()
  const info = new Map<number, { t: number; across: number }>()
  for (let y = 0; y < 112; y++)
    for (let x = 0; x < 80; x++) {
      const o = onArm(x + 0.5, y + 0.5)
      // ragged edges: the wind frays along its length
      const fray = (noise(o.t * 150, o.across > 0 ? 0 : 40, 5, 3) - 0.5) * 0.7
      if (Math.abs(o.across) <= 1 + fray) {
        band.add(x, y)
        info.set(y * 80 + x, o)
      }
    }
  band.each((x, y) => {
    const { t, across } = info.get(y * 80 + x) ?? { t: 0, across: 0 }
    // the inner side (towards the eye) is lit by the white core; streaks run along the wind
    const lit = -across * 0.5 + t * 0.9 + 0.15
    const streak = Math.abs(Math.sin(across * 3.4 + t * 9)) > 0.9 && noise(t * 220, across * 4, 2, 3) > 0.45
    let c = lit > 0.95 ? WIND[4] : lit > 0.6 ? WIND[3] : lit > 0.25 ? WIND[2] : lit > -0.1 ? WIND[1] : WIND[0]
    if (streak) c = t > 0.7 ? CORE : lit > 0.4 ? WIND[4] : WIND[3]
    d.set(x, y, c)
  })
  // the white core of the storm glows in the eye, behind the card
  const [ex, ey] = EYE
  d.dither(d.m().disc(ex, ey, 8.5), [WIND[3], WIND[4], CORE], (x, y) => 1.25 - Math.hypot(x + 0.5 - ex, y + 0.5 - ey) / 7, 0.8)
}

/** Filaments of wind trailing off the outer edge of the arm. */
function filaments(p: Painter): void {
  p.shine(true)
  for (const [from, to, off, c] of [
    [8, 30, 1.7, WIND[1]],
    [22, 44, 1.6, WIND[2]],
    [40, 58, 1.8, WIND[1]],
    [52, 70, 1.7, WIND[2]],
    [70, 84, 1.9, WIND[1]],
  ] as const) {
    const pts: Pt[] = []
    for (let i = from; i < to && i + 1 < ARM.length; i++) {
      const [ax, ay] = ARM[i] ?? P(0, 0)
      const [bx, by] = ARM[i + 1] ?? P(0, 0)
      const len = Math.hypot(bx - ax, by - ay) || 1
      const w = width(i / (ARM.length - 1)) * (off + ((i - from) / (to - from)) * 0.6)
      pts.push(P(ax + ((by - ay) / len) * w, ay - ((bx - ax) / len) * w))
    }
    p.fill(p.m().path(pts).minus(p.subjectMask), c)
  }
  p.shine(false)
}

/** The face-down card in the eye, torn in two along a jagged line; the halves twist apart. */
function card(d: Painter): void {
  // the card in its own coordinates (u across, v down), torn from the top edge to the bottom
  const tear = [P(1, -8.5), P(-0.5, -5.5), P(1.5, -2.5), P(-1, 0.5), P(1, 3.5), P(-0.5, 6), P(-1, 8.5)]
  const halves: { poly: Pt[]; turn: number; shift: Pt }[] = [
    { poly: [P(-6, -8.5), ...tear, P(-6, 8.5)], turn: -13, shift: P(-2.2, -2) },
    { poly: [P(6, -8.5), P(6, 8.5), ...[...tear].reverse()], turn: 11, shift: P(2.2, 1.5) },
  ]
  for (const { poly, turn, shift } of halves) {
    const a = ((-14 + turn) * Math.PI) / 180
    const at = ([u, v]: Pt): Pt =>
      P(EYE[0] + shift[0] + u * Math.cos(a) - v * Math.sin(a), EYE[1] + shift[1] + u * Math.sin(a) + v * Math.cos(a))
    const half = d.m().poly(poly.map(at))
    const inner = d.m().poly([P(-5, -7.5), P(5, -7.5), P(5, 7.5), P(-5, 7.5)].map(at)).and(half)
    d.fill(half, GOLD[1])
    d.fill(half.facing([1, 0, 0, 1]), GOLD[0])
    d.fill(inner, BACK[1])
    d.fill(inner.facing([-1, 0, 0, -1]), BACK[2])
    for (const v of [-5.5, 5.5]) d.fill(d.m().poly([P(-4, v - 1), P(4, v - 1), P(4, v + 0.6), P(-4, v + 0.6)].map(at)).and(inner), GOLD[1])
    // the capsule in the middle, torn through with the card
    const [cx, cy] = at(P(0, 0.5))
    const capsule = d.m().disc(cx, cy, 2.6).and(half)
    d.fill(capsule, CORE)
    d.fill(capsule.clone().and(d.m().poly([P(-3, -3), P(3, -3), P(3, 0.2), P(-3, 0.2)].map(at))), RED)
    d.fill(d.m().poly([P(-3, 0.2), P(3, 0.2), P(3, 0.9), P(-3, 0.9)].map(at)).and(capsule), BACK[0])
  }
}

/** Shards of the card fly off along the wind; a few sparks of the torn edge. */
function shards(p: Painter): void {
  const rand = rng(14)
  for (const [x, y, s] of [
    [55, 44, 2.2],
    [59, 52, 1.6],
    [33, 60, 2],
    [30, 49, 1.4],
    [52, 63, 1.4],
    [62, 38, 1.2],
  ] as const) {
    const a = rand() * Math.PI
    const pts: Pt[] = [0, 1, 2].map((i) => {
      const b = a + (i * Math.PI * 2) / 3 + (rand() - 0.5) * 0.8
      return P(x + Math.cos(b) * s * 1.3, y + Math.sin(b) * s)
    })
    const shard = p.m().poly(pts).or(p.m().rect(x - 0.5, y - 0.5, 1, 1))
    p.fill(shard.outerEdge(), OUTLINE)
    p.fill(shard, BACK[1])
    p.fill(shard.facing([-1, 0, 0, -1]), GOLD[1])
  }
  p.shine(true)
  for (const [x, y] of [P(46, 45), P(41, 59), P(48, 57)]) p.px(x, y, CORE)
  p.shine(false)
}

export const mysticalSpaceTyphoon: CardDef = {
  id: 'ygo-mrl-078',
  number: 78,
  name: 'Mystischer Raum-Taifun',
  tier: 'ultra',
  kind: 'spell',
  sub: 'quickplay',
  text: 'Zauber/Falle weg',
  // space, the nebula, the stars and the wind shine; the torn card and its shards stay matt
  foil: 'painted',
  draw(p) {
    space(p)
    const d = p.layer()
    d.shine(true)
    cyclone(d)
    d.shine(false)
    card(d)
    p.subject(d, OUTLINE)
    filaments(p)
    shards(p)
  },
}
