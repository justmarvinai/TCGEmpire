import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, cubic, fire, flameMask, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Nine-Tailed Fox (Signature), the Grail of Origins. Our own take on the folklore nine-tailed fox
 * spirit: a white shrine fox with kitsune markings and a red bib sits on a rock at night, its nine
 * gold-tipped tails fanned out behind it like a halo, fox-fire drifting round it. Full art, 80×112.
 *
 * Composition: the fox sits in the middle, head square to the viewer; the tails rise from behind its
 * rump and fan from the left edge over the top to the right edge, twisting like a pinwheel. The
 * frame's plates cover rows 0–14 and 90–112, so the face sits at rows 18–46.
 */
const SKY = colors('07061a', '120f30', '1f1a4a', '33296a', '4e3c8a')
const FUR = colors('5e5490', 'a29ec8', 'e2e0f2', 'ffffff')
const GOLD = colors('9a4a1c', 'dc8a2e', 'f6c658', 'fff0b0')
const FOXFIRE = colors('0f5a60', '20a090', '68e0c0', 'd8fff0')
const RED = colors('5e1030', 'b02838', 'e85a4c')
const ROCK = colors('15122c', '262046', '3c3466')
const INK = hex('1a1030')
const OUTLINE = hex('0a0716')

const P = (x: number, y: number): Pt => [x, y]
const rad = (deg: number): number => (deg * Math.PI) / 180

function night(p: Painter): void {
  // night sky, brightest in a wide ring behind the fox
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 42) * 0.8) / 44)
      return 0.06 + glow * 0.9 + noise(x, y, 3, 9) * 0.08
    },
    0.7,
  )
  stars(p, rng(5), 20, [FUR[2], GOLD[2], FOXFIRE[2]], { x: 2, y: 2, w: 76, h: 40 })
  p.shine(false)

  // the rock the fox sits on, with mist curling round its top
  const rock = p.m().poly([0, 89, 9, 86.5, 22, 85.5, 38, 87, 56, 86, 70, 86.5, 80, 88, 80, 112, 0, 112])
  p.register(ROCK)
  p.fill(rock, ROCK[0])
  p.edge(rock, ROCK[2], [0, -1])
  p.fill(rock.clone().and(p.m().rect(0, 88, 80, 3)).minus(rock.facing([0, -1])), ROCK[1])
  for (const [x, y, w] of [
    [4, 95, 9],
    [20, 99, 7],
    [46, 96, 10],
    [62, 101, 8],
    [30, 105, 6],
  ] as const) {
    p.fill(p.m().rect(x, y, w, 1), ROCK[1])
  }
  // mist drifting over the rock
  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [10, 91, 12, 1],
    [34, 93, 10, 2],
    [58, 90.5, 13, 3],
    [76, 94, 9, 4],
    [22, 101, 9, 5],
    [60, 103, 10, 6],
  ] as const) {
    mist.blob(x, y, rx, 2.6, seed, 0.25)
  }
  p.dither(mist, [ROCK[1], SKY[3], SKY[4]], (x, y) => 0.75 - (y - 88) / 22 + noise(x, y, 8, 4) * 0.3, 0.6)
}

interface Tail {
  /** Where the gold tip ends up, as an angle round the head (degrees, −90 = straight up). */
  deg: number
  /** Thickest radius. */
  width: number
  /** Sideways swing of the S-curve in pixels (positive = clockwise twist). */
  curl: number
  /** −1 for tails in the back. */
  bias: number
}

/** The tails grow from behind the rump; their tips lie on a ring round the head, the halo. */
const ROOT = P(40, 72)
const HALO = { x: 40, y: 41, r: 33 }

/** Painted back to front: the middle tails first, the outer ones overlap them. */
const TAILS: readonly Tail[] = [
  { deg: -90, width: 5, curl: 0, bias: -1 },
  { deg: -113, width: 5, curl: -5, bias: -1 },
  { deg: -67, width: 5, curl: 5, bias: -1 },
  { deg: -136, width: 5.3, curl: -7, bias: 0 },
  { deg: -44, width: 5.3, curl: 7, bias: 0 },
  { deg: -159, width: 5.6, curl: -7, bias: 0 },
  { deg: -21, width: 5.6, curl: 7, bias: 0 },
  { deg: 178, width: 5.6, curl: -6, bias: 0 },
  { deg: 2, width: 5.6, curl: 6, bias: 0 },
]

function centreline(t: Tail, n: number): Pt[] {
  const tip = P(HALO.x + Math.cos(rad(t.deg)) * HALO.r, HALO.y + Math.sin(rad(t.deg)) * HALO.r)
  const len = Math.hypot(tip[0] - ROOT[0], tip[1] - ROOT[1])
  const dx = (tip[0] - ROOT[0]) / len
  const dy = (tip[1] - ROOT[1]) / len
  // normal pointing clockwise from the direction of the tail
  const at = (k: number, s: number): Pt => [ROOT[0] + dx * len * k - dy * s, ROOT[1] + dy * len * k + dx * s]
  return cubic(at(0, 0), at(0.35, -t.curl * 0.5), at(0.72, -t.curl * 0.9), at(1, t.curl * 0.6), n)
}

function radius(t: Tail, k: number): number {
  if (k < 0.58) return 1.4 + (t.width - 1.4) * Math.sin((Math.PI / 2) * (k / 0.58))
  return Math.max(0.6, t.width * Math.pow(Math.cos((Math.PI / 2) * ((k - 0.58) / 0.42)), 0.6))
}

/** One bushy tail: white fur, a gold tip whose edge is cut into locks, a darker strand down its side. */
function tail(d: Painter, t: Tail): void {
  const n = 16
  const line = centreline(t, n)
  const radii = line.map((_, i) => radius(t, i / n))
  const fur = d.m().limb(line, radii)
  // tufts of fur sticking out of both edges, swept towards the tip
  for (const k of [0.36, 0.5, 0.64]) {
    const i = Math.round(k * n)
    const a = line[i] ?? ROOT
    const b = line[i + 1] ?? ROOT
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    const r = radii[i] ?? 1
    for (const sgn of [1, -1]) {
      const [ex, ey] = [a[0] - uy * sgn * r, a[1] + ux * sgn * r]
      fur.poly([ex - ux * 2.4, ey - uy * 2.4, ex + ux * 3.2 - uy * sgn * 1.6, ey + uy * 3.2 + ux * sgn * 1.6, ex + ux * 1.2, ey + uy * 1.2])
    }
  }
  d.part(fur, FUR, { bevel: 4, bias: t.bias })

  // position along the tail (0 at the root, 1 at the tip) and across it (−1 … 1) for every pixel
  const dense = centreline(t, 60)
  const where = (x: number, y: number): [number, number] => {
    let best = 0
    let bestD = Infinity
    dense.forEach(([cx, cy], i) => {
      const dd = (cx - x - 0.5) ** 2 + (cy - y - 0.5) ** 2
      if (dd < bestD) [best, bestD] = [i, dd]
    })
    const k = best / 60
    const a = dense[Math.max(0, best - 1)] ?? ROOT
    const b = dense[Math.min(60, best + 1)] ?? ROOT
    const side = (b[0] - a[0]) * (y + 0.5 - a[1]) - (b[1] - a[1]) * (x + 0.5 - a[0])
    return [k, Math.sign(side) * Math.min(1, Math.sqrt(bestD) / Math.max(1, radius(t, k)))]
  }
  fur.each((x, y) => {
    const [k, s] = where(x, y)
    // a strand of darker fur down the shadow side, the gold tip cut into locks
    if (k > 0.3 && k < 0.66 && s > 0.35 && s < 0.6) d.set(x, y, FUR[1])
    const lock = 0.74 + 0.08 * Math.abs(((s * 1.6 + 3) % 2) - 1)
    if (k < lock) return
    const i = FUR.indexOf(d.get(x, y))
    if (i >= 0) d.set(x, y, k > 0.95 ? GOLD[3] : (GOLD[i] ?? GOLD[1]))
  })
}

/** Mirror x round the middle of the fox. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

function fox(d: Painter): void {
  const m = (): Mask => d.m()

  d.shine(true)
  for (const t of TAILS) tail(d, t)
  d.shine(false)

  // sitting square to the viewer like a shrine statue: haunches and hind feet either side
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().ellipse(x(31), 76, 6.5, 10, s * 24), FUR, { bevel: 5 })
    d.part(m().ellipse(x(27.5), 86.5, 5.5, 1.8), FUR, { bevel: 2 })
  }

  // chest, puffed out, with a ruff of white fur hanging over it
  d.part(m().ellipse(40, 62, 10, 13), FUR, { bevel: 8 })
  const ruff = m().poly([30, 46, 50, 46, 49, 53, 46.5, 56, 44, 54.5, 42, 58, 40, 56, 38, 58, 36, 54.5, 33.5, 56, 31, 53])
  d.part(ruff, FUR, { bevel: 4, bias: 1, line: 'none' })

  // front legs, paws together
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(36.5), 66, x(36.5), 76, x(36.5), 84.5], [2.6, 2.2, 2.1]), FUR, { bevel: 2.5 })
    d.part(m().ellipse(x(36.5), 86, 2.8, 1.7), FUR, { bevel: 2 })
  }
  for (const x of [35, 37, 43, 45]) d.px(x, 86, FUR[0])

  // red shrine bib with a gold bell
  const bib = m().poly([32, 45, 48, 45, 46, 50, 40, 55.5, 34, 50])
  d.part(bib, RED, { bevel: 3 })
  d.fill(m().rect(32, 45, 16, 1).and(bib), RED[0])
  d.stamp(['.gg.', 'ghgg', 'gggd', '.kk.'], 38, 46, { g: GOLD[2], h: GOLD[3], d: GOLD[1], k: GOLD[0] })

  // tall ears with dark insides and dark tips
  for (const s of [1, -1]) {
    const x = side(s)
    const ear = m().poly([x(30.5), 30, x(31.5), 14.5, x(38), 26])
    d.part(ear, FUR, { bevel: 3 })
    d.fill(m().poly([x(32.5), 28, x(32.8), 18.5, x(36.5), 26.5]).and(ear.shrunk(1)), RED[0])
    d.fill(ear.clone().and(m().rect(0, 14, 80, 3)), FUR[0])
  }

  // head: round skull, cheek ruffs flaring out to the sides, a pointed muzzle
  const head = m()
    .ellipse(40, 31, 7, 5)
    .poly([32.5, 28.5, 29, 36.5, 31, 39.5, 33.5, 39, 36.5, 42.5, 40, 45, 43.5, 42.5, 46.5, 39, 49, 39.5, 51, 36.5, 47.5, 28.5])
  d.part(head, FUR, { bevel: 5 })

  // kitsune markings, eyes, nose
  const FACE = [
    '......rr......',
    '.....rhhr.....',
    '......rr......',
    '..............',
    '.rr........rr.',
    '..rkkk..kkkr..',
    '...ggk..kgg...',
    '..............',
    '..............',
    '.....kkkk.....',
    '......kk......',
  ]
  d.stamp(FACE, 33, 26, { r: RED[1], h: RED[2], k: INK, g: GOLD[2] })
}

/** A tongue of fox-fire with a faint halo on the sky. */
function wisp(p: Painter, x: number, y: number, size: number, lean: number, seed: number): void {
  const flame = flameMask(p, x, y, size, size * 1.9, { lean, tongues: 2, seed })
  flame
    .grown(2)
    .minus(flame)
    .minus(p.subjectMask)
    .each((fx, fy) => {
      if ((fx + fy) % 2 === 0) p.set(fx, fy, FOXFIRE[0])
    })
  fire(p, flame, FOXFIRE)
}

const WISPS = [
  [8, 34, 7, 2, 3],
  [72, 34, 7, -2, 4],
  [9, 86, 8, 2, 5],
  [71, 86, 8, -2, 6],
] as const

export const ahriSignature: CardDef = {
  id: 'rb-ogn-089',
  number: 89,
  name: 'Ahri, Nine-Tailed Fox (Signature)',
  tier: 'grail',
  kind: 'legend',
  element: 'Calm',
  print: { tag: 'Legende' },
  // the sky, the tails and the fox-fire shine; the fox's body and the rock stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    const d = p.layer()
    fox(d)
    p.subject(d, OUTLINE)
    p.shine(true)
    for (const [x, y, size, lean, seed] of WISPS) wisp(p, x, y, size, lean, seed)
    p.shine(false)
  },
}
