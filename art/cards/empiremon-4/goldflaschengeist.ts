import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, rays, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Goldflaschengeist (Grail, Spuk). A genie of golden smoke pours out of a golden deposit bottle that lies
 * on a hoard of caps and coins; he wears a crown of bottle caps, rests one fist on his hip and holds a
 * glowing golden receipt high like a trophy. Violet night, a glow and rays behind him. Full art, 80×112.
 *
 * Composition: one rising S from the bottle (bottom left) through the twisted smoke tail and the torso up
 * the raised arm to the receipt (top right). The frame's plates cover rows 4–14 and 91–106, so the crown
 * starts at row 14 and the bottle lies between rows 70 and 90. The booster cuts the genie and the bottle
 * out of this artwork; its seal sits bottom right, which is why the bottle lies on the left.
 */
const SKY = colors('0a0616', '160b2c', '241244', '381a60', '50267e', '6e3898', '9c5cb8', 'c890d4')
const GOLD = colors('4a2408', '8a4e12', 'c8841e', 'eec040', 'fff0a0')
const PAPER = colors('e0b860', 'f8e8b0', 'fffbe8')
const GLASS = colors('10301c', '22603a', '4a9a5c', 'a0e098')
const EYE = colors('9a62e8', 'f2e6ff')
const PLUM = hex('2c0c2a')
const WHITE = hex('ffffff')
const OUTLINE = hex('1a0816')

const P = (x: number, y: number): Pt => [x, y]

// ── the scene ───────────────────────────────────────────────────────────────

/** Centre of the glow behind the genie. */
const GLOW = P(39, 40)

function night(p: Painter): void {
  const wedges = rays(p, GLOW[0], GLOW[1], 10, 0.01)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const d = Math.hypot(x - GLOW[0], (y - GLOW[1]) * 0.78)
      const glow = Math.max(0, 1 - d / 56)
      return 0.02 + glow * glow * 0.86 + (wedges.has(x, y) ? glow * 0.26 : 0)
    },
    0.4,
  )
  p.register(SKY)
  const rand = rng(11)
  for (let i = 0; i < 30; i++) {
    const x = 5 + Math.floor(rand() * 70)
    const y = 15 + Math.floor(rand() * 62)
    if (Math.hypot(x - GLOW[0], (y - GLOW[1]) * 0.8) < 24) continue
    p.px(x, y, rand() < 0.6 ? SKY[7] : GOLD[3])
  }
}

function twinkle(p: Painter, x: number, y: number, big: boolean): void {
  if (big)
    p.stamp(['...o...', '...g...', '..ggg..', 'ogg#ggo', '..ggg..', '...g...', '...o...'], x - 3, y - 3, {
      '#': WHITE,
      g: GOLD[4],
      o: GOLD[3],
    })
  else p.stamp(['.g.', 'g#g', '.g.'], x - 1, y - 1, { '#': WHITE, g: GOLD[3] })
}

/** A gold coin or cap, flying or lying, tilted: a flat oval with a lit rim. */
function coin(p: Painter, x: number, y: number, rx: number, ry: number, rot: number): void {
  const c = p.m().ellipse(x, y, rx, ry, rot)
  p.fill(c, GOLD[3])
  p.fill(c.facing([0, -1, -1, 0]), GOLD[4])
  p.fill(c.facing([0, 1, 1, 0]), GOLD[1])
}

/** A hoard of caps and coins with two green bottles in it, under the golden bottle. */
function hoard(p: Painter): void {
  const mound = p
    .m()
    .poly([80, 84, 71, 81.5, 60, 81, 50, 82.5, 38, 80, 24, 78, 12, 78.5, 0, 80, 0, 112, 80, 112])
  p.register(GOLD)
  p.dither(mound, [GOLD[0], GOLD[1], GOLD[2]], (_x, y) => 1.15 - (y - 79) / 13, 0.4)
  // two green bottles stuck in the hoard
  for (const [x, y, rot] of [
    [70, 84, 28],
    [16, 81, -30],
  ] as const) {
    const a = (rot * Math.PI) / 180
    const g = p.m().capsule(x, y, x + Math.sin(a) * 7, y - Math.cos(a) * 7, 2.6, 2.4)
    g.capsule(x + Math.sin(a) * 7, y - Math.cos(a) * 7, x + Math.sin(a) * 11, y - Math.cos(a) * 11, 1.2, 1.2)
    p.part(g, GLASS, { bevel: 2 })
  }
  // coins and caps lying on the hoard
  const rand = rng(8)
  for (let i = 0; i < 40; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = 82 + Math.floor(rand() * 10)
    if (!mound.has(x, y - 2)) continue
    coin(p, x + 0.5, y + 0.5, 2, 1.2, 0)
  }
}

// ── the genie ───────────────────────────────────────────────────────────────

/** The golden bottle lies from its base (bottom left) to its mouth (up right). */
const BASE = P(3, 86)
const MOUTH = P(33, 74.5)

function bottle(d: Painter): void {
  const len = Math.hypot(MOUTH[0] - BASE[0], MOUTH[1] - BASE[1])
  const u = P((MOUTH[0] - BASE[0]) / len, (MOUTH[1] - BASE[1]) / len)
  // across the bottle, pointing up
  const n = P(u[1], -u[0])
  const radius = (t: number): number => {
    const k = t / len
    if (k < 0.48) return 5.6
    if (k < 0.7) return 2.3 + 3.3 * Math.cos(((k - 0.48) / 0.22) * (Math.PI / 2))
    if (k < 0.91) return 2.3
    return 2.9
  }
  const at = (t: number, s: number): Pt => [BASE[0] + u[0] * t + n[0] * s, BASE[1] + u[1] * t + n[1] * s]
  const top: Pt[] = []
  const bottom: Pt[] = []
  for (let t = 0; t <= len; t += 0.5) {
    top.push(at(t, radius(t)))
    bottom.push(at(t, -radius(t)))
  }
  const glass = d.m().poly([...top, ...bottom.reverse()])
  d.part(glass, GOLD, { bevel: 3 })
  // the label: a violet band with a little gold crown, no lettering
  const label = d
    .m()
    .poly([at(len * 0.14, 7), at(len * 0.4, 7), at(len * 0.4, -7), at(len * 0.14, -7)])
    .and(glass)
  d.fill(label, SKY[4])
  d.fill(label.facing([0, -1]), SKY[6])
  d.fill(label.facing([0, 1]), SKY[2])
  const c = at(len * 0.27, 0.3)
  d.stamp(['g.g.g', 'ggggg', '.ggg.'], Math.round(c[0]) - 2, Math.round(c[1]) - 1, { g: GOLD[4] })
  // a long highlight down the upper side of the glass, the lip ring, a glint on the shoulder
  const shine = d.m()
  for (let t = len * 0.03; t < len * 0.62; t += 0.5) {
    if (t > len * 0.12 && t < len * 0.42) continue
    const [x, y] = at(t, radius(t) * 0.55)
    shine.add(Math.floor(x), Math.floor(y))
  }
  d.fill(shine.and(glass.shrunk(1)), GOLD[4])
  const lip = d
    .m()
    .poly([at(len * 0.91, 3), at(len, 3), at(len, -3), at(len * 0.91, -3)])
    .and(glass)
  d.fill(lip.facing([-1, 0]), GOLD[1])
  const g = at(len * 0.6, 2.4)
  d.px(Math.floor(g[0]), Math.floor(g[1]), WHITE)
}

/** Smoke from the bottle's mouth, curving up into the genie's waist and twisted like a rope. */
function smoke(d: Painter): Mask {
  const line: Pt[] = [
    P(38, 55),
    P(42, 61.5),
    P(44.5, 67.5),
    P(42, 72),
    P(37.5, 74.5),
    P(MOUTH[0] + 0.5, MOUTH[1]),
  ]
  const m = d.m().limb(line, [7.2, 6, 4.6, 3.3, 2.3, 1.7])
  // puffs billowing out of the outside of the curve
  for (const [x, y, r] of [
    [44.5, 58.5, 2.8],
    [47.5, 64, 2.6],
    [48, 69, 2.2],
    [45.2, 73.6, 1.8],
  ] as const) {
    m.disc(x, y, r)
  }
  d.part(m, GOLD, { bevel: 3.5 })
  // the twist: diagonal grooves wind round the tail, each with a lit crest above it
  const dense = spline(line, 12)
  const last = dense.length - 1
  const groove = d.m()
  const crest = d.m()
  m.shrunk(1).each((x, y) => {
    let best = 0
    let bestD = Infinity
    dense.forEach(([cx, cy], i) => {
      const dd = (cx - x - 0.5) ** 2 + (cy - y - 0.5) ** 2
      if (dd < bestD) [best, bestD] = [i, dd]
    })
    const a = dense[Math.max(0, best - 1)] ?? line[0] ?? P(0, 0)
    const b = dense[Math.min(last, best + 1)] ?? a
    const across =
      Math.sign((b[0] - a[0]) * (y + 0.5 - a[1]) - (b[1] - a[1]) * (x + 0.5 - a[0])) * Math.sqrt(bestD)
    const phase = (best / last) * 4 - across * 0.13
    const f = phase - Math.floor(phase)
    if (f < 0.15) groove.add(x, y)
    else if (f < 0.28) crest.add(x, y)
  })
  d.tone(groove, -1)
  d.tone(crest, 1)
  return m
}

/** Mirror x round the middle of the genie. */
const side = (s: number) => (v: number) => 38 + (v - 38) * s

function genie(d: Painter): void {
  const m = (): Mask => d.m()
  bottle(d)
  const tail = smoke(d)

  // the arm on the hip, behind the torso: upper arm out to the left, forearm back to the waist
  d.part(m().limb([27, 42, 21.5, 45, 18, 49], [4, 3.6, 3.1]), GOLD, { bevel: 3 })
  d.part(m().limb([18, 49, 22, 53, 26, 55.5], [3, 2.8, 2.6]), GOLD, { bevel: 2.5 })
  d.part(m().ellipse(27, 56, 3, 2.6), GOLD, { bevel: 2 })
  d.fill(m().limb([20.5, 52, 22.5, 54], 1.1), GOLD[4])
  d.fill(m().path([21, 53.5, 23, 55]), GOLD[1])

  // torso: wide shoulders tapering to the waist
  const torso = m().poly([
    50, 40, 44, 37, 32, 37, 26, 40, 27.5, 46, 32, 53, 33.5, 58, 42.5, 58, 44, 53, 48.5, 46,
  ])
  d.part(torso, GOLD, { bevel: 6 })
  for (const s of [1, -1]) d.part(m().disc(side(s)(49.5), 42, 4.6), GOLD, { bevel: 4, line: 'none' })
  // chest and belly lines, then a violet rim light down the shadow side of the tail
  d.fill(
    m().path([45, 48.5, 43, 50, 39, 49]).path([37, 49, 33, 50, 31, 48.5]).path([38, 41, 38, 48]),
    GOLD[2],
  )
  d.fill(m().path([36, 53, 40, 53]).path([38, 55, 38, 56]), GOLD[2])
  d.edge(
    tail
      .clone()
      .minus(torso)
      .and(m().rect(20, 56, 40, 30)),
    SKY[6],
    [1, 0],
  )

  // the raised arm, the fist round the top of the receipt
  d.part(m().limb([49, 42, 55.5, 36, 57.5, 31], [4, 3.6, 3.1]), GOLD, { bevel: 3, line: 'shadow' })
  d.part(m().limb([57.5, 31, 59.5, 27.5, 60.5, 24], [3, 2.8, 2.7]), GOLD, { bevel: 2.5 })
  receipt(d)
  d.part(m().ellipse(60.5, 22, 3.4, 3), GOLD, { bevel: 2 })
  d.fill(m().path([57.5, 21, 62.5, 21]).path([58.5, 23, 62.5, 23]), GOLD[1])
  d.fill(m().limb([62, 27, 57.5, 28], 1.1), GOLD[4])
  d.fill(m().path([61.5, 28, 56.5, 29]), GOLD[1])

  // pointed ears, head
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().poly([x(31), 26.5, x(22.5), 21, x(25), 24.5, x(30), 32]), GOLD, { bevel: 2 })
  }
  const head = m()
    .ellipse(38, 28, 8, 7.5)
    .poly([30.2, 28, 45.8, 28, 44.5, 34, 41.5, 37.5, 34.5, 37.5, 31.5, 34])
  d.part(head, GOLD, { bevel: 5 })

  const FACE = [
    '.bbb.....bbb.',
    '...bb...bb...',
    '..eew...wee..',
    '...ee...ee...',
    '.............',
    '.....k.k.....',
    'k...........k',
    '.kttttttttttk',
    '..kttttttttk.',
    '...kpppppk...',
    '....kkkkk....',
  ]
  d.stamp(FACE, 31, 24, { b: GOLD[0], e: EYE[0], w: EYE[1], k: PLUM, t: WHITE, p: GOLD[1] })
  // teeth gaps
  for (const x of [34, 37, 40]) d.px(x, 32, PAPER[0])

  // crown: a gold band and three bottle caps standing on it, the middle one with a violet stone
  const band = m().rect(30, 20, 15, 3)
  d.part(band, GOLD, { bevel: 1 })
  d.fill(band.facing([0, -1]), GOLD[4])
  d.fill(band.facing([0, 1]), GOLD[1])
  const CAP = ['.d.d.', 'dllmd', '.lmm.', 'dmmmd', '.d.d.']
  const BIG = ['.d.d.d.', 'dllllmd', '.llmmm.', 'dlmvmmd', '.mmmmm.', 'dmmmmmd', '.d.d.d.']
  const key = { d: GOLD[1], l: GOLD[4], m: GOLD[3], v: EYE[0] }
  d.stamp(CAP, 29, 16, key)
  d.stamp(CAP, 42, 16, key)
  d.stamp(BIG, 34, 14, key)
}

/** The receipt hangs from the raised fist: pale paper, rows of print, a barcode and a torn end. */
const SLANT = 0.14
const receiptLeft = (y: number) => 57 + (y - 23) * SLANT

function receiptMask(d: Painter): Mask {
  const m = d.m()
  for (let y = 23; y < 53; y++) m.rect(Math.round(receiptLeft(y)), y, 7, 1)
  for (let x = 57; x < 70; x++) if (x % 2 === 0) m.del(x, 52)
  return m
}

function receipt(d: Painter): void {
  const strip = receiptMask(d)
  d.fill(strip, PAPER[1])
  d.fill(strip.facing([-1, 0]), PAPER[2])
  d.fill(strip.facing([1, 0, 0, 1]), PAPER[0])
  const print = d.m()
  const rand = rng(3)
  for (let y = 27; y < 43; y += 2) {
    const left = Math.round(receiptLeft(y)) + 1
    print.rect(left, y, 2 + Math.floor(rand() * 2), 1).rect(left + 4, y, 1, 1)
  }
  print.rect(Math.round(receiptLeft(44)) + 1, 44, 5, 1)
  const bar = Math.round(receiptLeft(48)) + 1
  for (const x of [0, 1, 3, 4]) print.rect(bar + x, 47, 1, 3)
  d.fill(print, GOLD[1])
}

/** Rings of light round the receipt, gold close to the paper, fading into the violet. */
function aura(p: Painter): void {
  let inner = receiptMask(p)
  for (let ring = 0; ring < 4; ring++) {
    const outer = inner.grown(1)
    const t = 1 - ring / 4
    p.dither(outer.clone().minus(inner), [SKY[5], SKY[6], GOLD[2], GOLD[3]], () => t - 0.06, 0.8)
    inner = outer
  }
}

export const goldflaschengeist: CardDef = {
  id: 'emp4-023',
  number: 23,
  name: 'Goldflaschengeist',
  tier: 'grail',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    night(p)
    for (const [x, y, rx, ry, rot] of [
      [12, 30, 2.2, 1.2, 30],
      [70, 66, 2, 1.1, -25],
      [14, 60, 1.8, 1.8, 0],
    ] as const) {
      coin(p, x, y, rx, ry, rot)
    }
    hoard(p)
    aura(p)
    const d = p.layer()
    genie(d)
    // the genie glows: the sky brightens in a soft ring round his silhouette
    const body = d.mask()
    for (let ring = 3; ring >= 1; ring--) p.tone(body.grown(ring + 1).minus(body.grown(ring)), 4 - ring)
    p.subject(d, OUTLINE)
    for (const [x, y, big] of [
      [70, 20, true],
      [10, 18, true],
      [52, 62, false],
      [9, 46, false],
      [72, 52, false],
      [22, 74, false],
      [49, 80, true],
      [9, 82, false],
    ] as const) {
      twinkle(p, x, y, big)
    }
  },
}
