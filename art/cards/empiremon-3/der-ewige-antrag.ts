import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, spline, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Der Ewige Antrag (Grail, Spuk): an endless serpent made of one never-ending form (lines and checkboxes,
 * no readable words) coiling through a violet void into infinity, glowing seals on it. Full art, 80×112.
 *
 * Composition: the serpent rears up right of the middle like a cobra; its spread hood is a form with a
 * gold rim and the great seal in its centre. Its body, one strip of continuous form paper with tractor
 * holes, coils through the foreground and then winds up the left side, ever narrower and dimmer, into the
 * bright point of infinity at the top left. Gold seals glow along the strip. The name plate covers rows
 * 4–14, the bottom plate rows 91–106.
 */
const OUTLINE = hex('05020c')
const VOID = colors('07040f', '120a22', '1f1238', '301c52', '46296e', '613a8e', 'a070d8', 'e4c8ff')
const PAPER = colors('6a5a8a', 'a898c0', 'd8cce6', 'f6f0fa')
const INK = hex('5a4a9a')
const GOLD = colors('6a3e0a', 'b07818', 'e8b838', 'ffe680', 'fffbe0')
const TAPE = colors('8a1838', 'd83a5a')

/** Middle of the hood and the head. */
const HX = 46
/** The point of infinity the strip winds into. */
const END: Pt = [15, 21]

/** The whole strip, from the neck through the near coil and up the left side into infinity. */
const PATH: readonly Pt[] = [
  [46, 49], [49, 57], [61, 63], [70, 72], [66, 83], [48, 89], [27, 87], [14, 78], [12, 66], [18, 55], [27, 47],
  [20, 40], [12, 35], [18, 30], [23, 27], [18, 24], [14.5, 22.5], [16.5, 21.5], END,
]
/** Where along the strip (share of its length) it leaves the foreground: from here on it has no outline and fades. */
const SPLIT = 0.72

/** Half width of the strip at `t`, the share of its length from the neck (0) to infinity (1). */
function width(t: number): number {
  if (t < 0.06) return 5.2 + t * 30
  if (t < 0.62) return 7
  return Math.max(0.5, 7 * Math.exp(-(t - 0.62) * 7))
}

/** The strip's centre line, densely sampled, with the share of the length at every point. */
function centre(): { line: Pt[]; t: number[] } {
  const line = spline(PATH, 12)
  const run = [0]
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] ?? [0, 0]
    const b = line[i] ?? [0, 0]
    run.push((run[i - 1] ?? 0) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = run[run.length - 1] ?? 1
  return { line, t: run.map((r) => r / total) }
}

function abyss(p: Painter): void {
  // violet void, swirling round the point of infinity and glowing behind the hood
  p.dither(
    null,
    VOID.slice(0, 7),
    (x, y) => {
      const dx = x - END[0]
      const dy = y - END[1]
      const r = Math.hypot(dx, dy)
      const swirl = Math.sin(Math.atan2(dy, dx) * 3 - Math.log(r + 1) * 3.4) * 0.08
      const pit = Math.max(0, 1 - r / 64) * 0.6 + Math.max(0, 1 - r / 12) * 0.4
      const halo = Math.max(0, 1 - Math.hypot(x - HX, (y - 32) * 1.1) / 28) * 0.38
      return pit + halo + swirl * Math.min(1, r / 10) + noise(x, y, 3, 6) * 0.05
    },
    0.7,
  )
  // forms drifting in the void, far away
  for (const [x, y, w, h] of [[66, 18, 4, 5], [6, 50, 3, 4], [70, 50, 3, 4], [34, 60, 3, 4]] as const) {
    p.fill(p.m().rect(x, y, w, h), VOID[3])
    p.fill(p.m().rect(x + 1, y + 1, w - 2, 1).rect(x + 1, y + 3, w - 2, 1), VOID[2])
  }
  // a thin gold halo behind the hood
  const ring = p.m().ellipse(HX, 31, 23, 21).minus(p.m().ellipse(HX, 31, 22, 20))
  p.fill(ring, GOLD[1])
  p.fill(ring.and(p.m().rect(0, 0, 80, 26)), GOLD[2])
  stars(p, rng(12), 30, [VOID[6], VOID[7], GOLD[3]], { x: 3, y: 15, w: 74, h: 74 })
  // the point of infinity: a bright star with long rays
  const [ex, ey] = END
  p.fill(p.m().disc(ex + 0.5, ey + 0.5, 3.2), VOID[6])
  p.fill(p.m().rect(ex - 9, ey, 19, 1).rect(ex, ey - 7, 1, 15), VOID[6])
  p.fill(p.m().rect(ex - 4, ey, 9, 1).rect(ex, ey - 4, 1, 9).disc(ex + 0.5, ey + 0.5, 1.6), VOID[7])
}

interface Strip {
  band: Mask
  holes: Mask
  rows: Mask
  boxes: Pt[]
  seals: { at: Pt; r: number }[]
}

/**
 * Masks of a strip of continuous form paper along `line` between `t0` and `t1`: tractor holes along both
 * edges, rows of checkbox and line across it, and where its seals sit.
 */
function strip(p: Painter, c: { line: Pt[]; t: number[] }, t0: number, t1: number, sealAt: readonly number[]): Strip {
  const { line, t } = c
  const out: Strip = { band: p.m(), holes: p.m(), rows: p.m(), boxes: [], seals: [] }
  let run = 0
  let lastRow = -99
  for (let i = 0; i < line.length - 1; i++) {
    const ta = t[i] ?? 0
    const tb = t[i + 1] ?? 1
    if (tb < t0 || ta > t1) continue
    const a = line[i] ?? [0, 0]
    const b = line[i + 1] ?? [0, 0]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
    const wa = width(ta)
    const wb = width(tb)
    out.band.capsule(a[0], a[1], b[0], b[1], wa, wb)
    const at = (u: number): Pt => [a[0] + nx * wa * u, a[1] + ny * wa * u]
    // tractor holes, one every 4 px of length
    if (wa > 3.6 && Math.floor((run + len) / 4) > Math.floor(run / 4)) {
      for (const u of [-0.66, 0.66]) {
        const [hx, hy] = at(u)
        out.holes.add(Math.floor(hx), Math.floor(hy))
      }
    }
    // a row of the form: a checkbox, then a line across
    if (wa > 1.6 && run - lastRow >= (wa > 5 ? 3.5 : 2.4)) {
      lastRow = run
      if (wa > 4.6) out.boxes.push(at(-0.36))
      out.rows.path([at(wa > 4.6 ? -0.02 : -0.5), at(0.5)])
    }
    run += len
  }
  for (const ts of sealAt) {
    const i = t.findIndex((v) => v >= ts)
    out.seals.push({ at: line[Math.max(0, i)] ?? [0, 0], r: width(ts) * 0.8 })
  }
  return out
}

function paintStrip(p: Painter, s: Strip, dim: number): void {
  const inner = s.band.shrunk(1)
  if (dim === 0) p.part(s.band, PAPER, { bevel: 3, bias: 1 })
  else {
    const tone = (i: number) => PAPER[Math.max(0, i - dim)] ?? PAPER[0]
    p.fill(s.band, tone(3))
    p.fill(s.band.facing([1, 0, 0, 1]), tone(1))
  }
  const ink = PAPER[Math.max(0, 1 - dim)] ?? PAPER[0]
  p.fill(s.rows.and(inner), dim === 0 ? PAPER[1] : ink)
  p.fill(s.holes.and(inner.shrunk(1)), ink)
  s.boxes.forEach(([x, y], i) => {
    p.stamp(['iii', 'i.i', 'iii'], Math.round(x) - 1, Math.round(y) - 1, { i: dim === 0 ? PAPER[0] : ink })
    if (dim === 0 && i % 3 === 1) p.px(Math.round(x), Math.round(y), GOLD[2])
  })
}

/** A glowing gold seal: rim, ring, a star in the middle, ribbons below if it is big enough. */
function seal(p: Painter, x: number, y: number, r: number): void {
  if (r >= 4) {
    p.fill(p.m().poly([x - 2.5, y + 1, x - 4.5, y + r + 4, x - 2.5, y + r + 3, x - 1, y + r + 5, x, y + 1]), TAPE[0])
    p.fill(p.m().poly([x + 2.5, y + 1, x + 4.5, y + r + 4, x + 2.5, y + r + 3, x + 1, y + r + 5, x, y + 1]), TAPE[1])
  }
  const disc = p.m().disc(x, y, r)
  p.fill(disc, GOLD[2])
  p.fill(disc.facing([-1, 0, 0, -1]), GOLD[3])
  p.fill(disc.facing([1, 0, 0, 1]), GOLD[1])
  if (r >= 3.5) p.fill(p.m().disc(x, y, r - 1.5).minus(p.m().disc(x, y, r - 2.5)), GOLD[1])
  if (r >= 4) p.stamp(['..h..', '.hhh.', 'hhhhh', '.h.h.'], Math.round(x - 2.5), Math.round(y - 2), { h: GOLD[4] })
  else p.px(Math.floor(x), Math.floor(y), GOLD[4])
}

/** Glint of a seal: a small cross of gold light round it. */
function glint(p: Painter, x: number, y: number, r: number): void {
  const [cx, cy] = [Math.floor(x), Math.floor(y)]
  const reach = Math.round(r) + 3
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    for (let k = Math.round(r) + 1; k <= reach; k++) p.px(cx + dx * k, cy + dy * k, k === reach ? GOLD[1] : GOLD[3])
  }
}

/** The hood: a form with a gold rim, rows of checkboxes on both wings, tractor holes along its edge. */
function hood(d: Painter): void {
  const m = (): Mask => d.m()
  const half = [-4, 51, -9, 44, -15, 37, -18, 28, -16, 20, -11, 15.5, -5, 14.5, 0, 16]
  const pts: number[] = []
  for (let i = 0; i < half.length; i += 2) pts.push(HX + (half[i] ?? 0), half[i + 1] ?? 0)
  for (let i = half.length - 2; i >= 0; i -= 2) pts.push(HX - (half[i] ?? 0), half[i + 1] ?? 0)
  const shape = m().poly(pts)
  d.part(shape, PAPER, { bevel: 6 })
  d.fill(shape.facing(), GOLD[2])
  d.fill(shape.facing([1, 0, 0, 1]), GOLD[1])
  // tractor holes just inside the rim
  shape.shrunk(2).facing().each((x, y) => {
    if ((x + y * 3) % 4 === 0 && Math.abs(x + 0.5 - HX) > 8) d.px(x, y, PAPER[1])
  })
  // rows of the form on both wings: a checkbox, a line; some boxes ticked
  for (const [y, tick] of [[23, true], [27, false], [31, true], [35, false], [39, true]] as const) {
    for (const s of [1, -1]) {
      const inset = 15 - Math.max(0, (y - 31) * 0.45)
      const box = Math.round(s > 0 ? HX - inset : HX + inset - 3)
      d.stamp(['iii', 'i.i', 'iii'], box, y - 1, { i: INK })
      if (tick) d.px(box + 1, y, GOLD[3])
      d.fill(m().rect(s > 0 ? box + 4 : box - 5, y + 1, 5, 1).and(shape.shrunk(2)), PAPER[1])
    }
  }
}

/** The head on top of the hood, square to the viewer: glowing gold eyes, a forked tongue of red tape. */
function head(d: Painter): void {
  const m = (): Mask => d.m()
  const skull = m().ellipse(HX, 22, 6.5, 5.5).poly([HX - 6, 22, HX + 6, 22, HX + 3.5, 30, HX - 3.5, 30])
  d.part(skull, PAPER, { bevel: 4, bias: 1 })
  // angry brows meeting low, dark sockets, glowing gold eyes, nostrils
  d.stamp(
    ['k...........k', 'kk.........kk', '.kkk.....kkk.', '..kkk...kkk..', '.khhgk.kghhk.', '..kggk.kggk..', '.............', '.............', '....k...k....'],
    HX - 6,
    19,
    { k: PAPER[0], g: GOLD[3], h: GOLD[4] },
  )
  d.fill(m().rect(HX - 1, 30, 2, 4).poly([HX - 1, 34, HX + 1, 34, HX + 3, 37, HX + 1, 36, HX, 35, HX - 1, 36, HX - 3, 37]), TAPE[1])
}

export const derEwigeAntrag: CardDef = {
  id: 'emp3-014',
  number: 14,
  name: 'Der Ewige Antrag',
  tier: 'grail',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    abyss(p)
    const line = centre()
    // the far strip winds into infinity without an outline, dimmer with the distance
    for (const [t0, t1, dim] of [[0.86, 1, 2], [SPLIT - 0.005, 0.865, 1]] as const) {
      const far = strip(p, line, t0, t1, t0 > 0.8 ? [0.91] : [0.79])
      paintStrip(p, far, dim)
      for (const s of far.seals) {
        seal(p, s.at[0], s.at[1], s.r)
        glint(p, s.at[0], s.at[1], s.r)
      }
    }
    // the near coil and the neck, the hood and the head on top
    const d = p.layer()
    const near = strip(d, line, 0, SPLIT, [0.17, 0.56])
    paintStrip(d, near, 0)
    for (const s of near.seals) seal(d, s.at[0], s.at[1], s.r)
    hood(d)
    head(d)
    seal(d, HX, 38, 6)
    p.subject(d, OUTLINE)
    // every seal glints
    for (const s of near.seals) glint(p, s.at[0] - 0.5, s.at[1] - 0.5, s.r + 1)
    glint(p, HX - 0.5, 37.5, 7)
  },
}
