import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Arktos (Ultra). Brief: ice bird soaring diagonally across the card, wings fully spread, the long
 * ribbon tail curving behind, head turned to the viewer; frozen mountain peaks under a night sky
 * with aurora, ice crystals forming in its wake. Full art, 80×112.
 *
 * Composition: the bird is built upright like Lavados and banked 28° into a climb to the upper
 * right, so the near wing reaches up to the top left under the aurora and the far wing dips to the
 * right over the peaks. The head turns out of the card; the tail streams down to the lower left in
 * an S and sheds ice crystals. The name plate covers rows 5–15, the attack plate 88–106.
 */
const NIGHT = colors('050918', '0b132e', '142048', '213362')
const AURORA = colors('17584f', '28977a', '62dca2', 'c4fde0')
const ICE = colors('1a3f86', '2f6ec2', '5ca6e6', '9cd8f8', 'eafaff')
const SNOW = colors('25365e', '52709e', 'a4bfe0', 'eef6ff')
const GREY = colors('4c5670', '8e98b0', 'd4dae6')
const RED = hex('d02a3c')
const OUTLINE = hex('060a1e')

const P = (x: number, y: number): Pt => [x, y]
/** Chest of the bird on the card, and its bank angle. */
const AT = P(38, 47)
const BANK = (28 * Math.PI) / 180
/** A point of the upright bird (chest at 0, 0) placed on the card. */
const T = (x: number, y: number): Pt => [
  AT[0] + x * Math.cos(BANK) - y * Math.sin(BANK),
  AT[1] + x * Math.sin(BANK) + y * Math.cos(BANK),
]
const TS = (list: readonly number[]): Pt[] => pts(list).map(([x, y]) => T(x, y))
const DEG = 28

function night(p: Painter): void {
  // navy sky with two aurora curtains: bright along their lower hem, fading upwards in soft rays
  p.shine(true)
  p.dither(null, NIGHT, (x, y) => 0.15 + y / 140 + (noise(x, y, 2, 9) - 0.5) * 0.15, 0.5)
  for (const [y0, amp, phase, height] of [
    [36, 6, 0.6, 20],
    [48, 4, 2.4, 13],
  ] as const) {
    for (let x = 0; x < 80; x++) {
      const hem = y0 + Math.sin(x * 0.09 + phase) * amp + Math.sin(x * 0.27 + phase) * 1.5
      const ray = 0.62 + 0.38 * Math.sin(x * 0.62 + phase * 3 + Math.sin(x * 0.2) * 2)
      for (let y = Math.floor(hem - height); y <= hem; y++) {
        const v = Math.pow(1 - (hem - y) / height, 0.8) * ray + (noise(x, y * 0.3, 6, 3) - 0.5) * 0.12
        if (v < 0.2 + bayer(x, y) * 0.3) continue
        p.set(x, y, AURORA[v > 0.8 ? 2 : v > 0.5 ? 1 : 0])
      }
      if (ray > 0.75) p.set(x, Math.round(hem), AURORA[3])
    }
  }
  stars(p, rng(5), 22, [SNOW[2], SNOW[3]], { x: 4, y: 16, w: 72, h: 40 })
  p.shine(false)

  // frozen peaks, far ones dim, near ones with lit snow faces and a shadow side
  for (const [ax, ay, w, near] of [
    [12, 60, 14, 0],
    [36, 63, 13, 0],
    [66, 55, 15, 0],
    [3, 72, 12, 1],
    [27, 70, 15, 1],
    [52, 74, 13, 1],
    [76, 68, 14, 1],
  ] as const)
    peak(p, ax, ay, w, near === 1)
  p.fill(p.m().rect(0, 86, 80, 26), SNOW[0])
}

/** A mountain peak with its apex at (ax, ay), a snow cap with a jagged hem, lit from the left. */
function peak(p: Painter, ax: number, ay: number, w: number, near: boolean): void {
  const base = 90
  const h = base - ay
  const lit = p.m().poly([ax, ay, ax - w, ay + h * 0.95, ax - w * 0.1, base, ax + 0.4, base])
  const dark = p.m().poly([ax, ay, ax + 0.4, base, ax + w, ay + h * 0.9])
  p.fill(lit, near ? SNOW[1] : NIGHT[3])
  p.fill(dark, near ? SNOW[0] : NIGHT[2])
  const cap = p
    .m()
    .poly([ax, ay - 1, ax - w * 0.42, ay + h * 0.34, ax - w * 0.22, ay + h * 0.28, ax - w * 0.08, ay + h * 0.4, ax + w * 0.14, ay + h * 0.27, ax + w * 0.36, ay + h * 0.33])
  p.fill(cap.clone().and(lit), near ? SNOW[3] : SNOW[1])
  p.fill(cap.and(dark), near ? SNOW[2] : NIGHT[3])
}

/** A flight feather from root to tip, in upright bird coordinates. */
function feather(d: Painter, root: Pt, tip: Pt, r: number, bias = 0): void {
  const mid = P(root[0] * 0.4 + tip[0] * 0.6, root[1] * 0.4 + tip[1] * 0.6)
  d.part(d.m().limb([T(...root), T(...mid), T(...tip)], [r * 0.8, r, r * 0.5]), ICE, { bias, bevel: 2.2 })
}

/** One wing in upright coordinates; `s` 1 is the near wing on the left, -1 the far one on the right. */
function wing(d: Painter, s: 1 | -1): void {
  const X = (x: number): number => x * s
  const bias = s === 1 ? 0 : -1
  for (const [rx, ry, tx, ty] of [
    [-7, -1, -8, 9],
    [-12, -3, -14, 8.5],
    [-17, -4, -20.5, 7.5],
    [-22, -5, -27, 5.5],
  ] as const)
    feather(d, P(X(rx), ry), P(X(tx), ty), 3.3, bias - 1)
  for (const [tx, ty] of [
    [-33, 3],
    [-37.5, -1],
    [-39.5, -6],
    [-38.5, -11],
  ] as const)
    feather(d, P(X(-25), -7), P(X(tx), ty), 3.2, bias)
  d.part(d.m().poly(TS([X(-3), -6, X(-14), -10, X(-25), -11, X(-29), -6, X(-23), -1, X(-12), 2, X(-4), 4])), ICE, {
    bias: bias + 1,
    bevel: 4,
  })
  d.part(d.m().limb(TS([X(-3), -6, X(-14), -10, X(-25), -10.5, X(-33), -10]), [2.6, 2.3, 2, 1.4]), ICE, {
    bias: bias + 1,
    bevel: 2,
  })
}

/** Face turned three quarters to the viewer: k = brow, r = red eye, w = glint; the far eye on the right. */
const FACE = ['kkk...k', '.wrk.kr', '.rr...r']

function bird(d: Painter): void {
  const m = (): Mask => d.m()

  // the far wing behind the body, the long ribbon tail, then the body and the near wing
  wing(d, -1)
  d.part(m().limb(TS([0, 14, -1, 24, 2, 33]), [4.2, 3.4, 2.2]), ICE, { bias: -1 })
  d.part(m().ellipse(...T(0, 5), 6.5, 11.5, DEG), ICE)
  d.part(m().ellipse(...T(0.5, -1), 4.5, 6, DEG), ICE, { line: 'shadow', bias: 1, bevel: 4 })
  wing(d, 1)

  // head turned out of the card: a round skull under the swept-back crest
  const head = T(0.5, -16.5)
  for (const [dx, dy, reach, r] of [
    [-1.5, -3, 11, 1.8],
    [1, -4, 16, 2.3],
    [3, -2.5, 12, 1.8],
  ] as const) {
    const [x, y] = [head[0] + dx, head[1] + dy]
    const plume = [x, y, x - reach * 0.25, y - 4, x - reach * 0.6, y - 5.5, x - reach, y - 4 - dx * 0.8]
    d.part(m().limb(plume, [r, r * 0.9, r * 0.7, 0.6]), ICE, { bias: -1, bevel: 1.5 })
  }
  d.part(m().limb(TS([0, -5, 0.3, -10, 0.5, -13]), [4, 3.6, 3.4]), ICE)
  d.part(m().ellipse(head[0], head[1], 6, 5.4), ICE)
  d.part(m().poly([head[0] + 1.5, head[1] + 0.5, head[0] + 8, head[1] + 4, head[0] + 2, head[1] + 4.5]), GREY, { bevel: 1.5 })
  d.stamp(FACE, Math.round(head[0]) - 4, Math.round(head[1]) - 3, { k: ICE[0], r: RED, w: ICE[4] })
}

/** The ribbon tail streaming down to the lower left in an S, two streamers side by side. */
const RIBBON = [27, 65, 21, 72, 15, 74, 9, 78, 6, 86]
const RIBBON2 = [29, 67, 26, 75, 20, 79, 17, 87]

function tail(d: Painter): void {
  d.part(d.m().limb(RIBBON2, [3, 2.6, 2, 1.2]), ICE, { bias: -1, bevel: 2 })
  d.part(d.m().limb(RIBBON, [3.4, 3.1, 2.7, 2, 1.2]), ICE, { bevel: 2.5 })
}

/** Ice crystals forming in the wake: sparkles behind the wings and along the tail, frost glints. */
function crystals(p: Painter): void {
  p.shine(true)
  const rand = rng(31)
  for (let i = 0; i < 40; i++) {
    const t = rand()
    const [x, y] = [4 + t * 30 + (rand() - 0.5) * 14, 86 - t * 34 + (rand() - 0.5) * 12]
    if (p.subjectMask.grown(1).has(Math.round(x), Math.round(y))) continue
    p.px(Math.round(x), Math.round(y), rand() < 0.4 ? ICE[4] : ICE[3])
  }
  for (const [x, y] of pts([8, 58, 21, 84, 3, 77, 24, 57, 13, 46, 31, 80, 36, 66])) {
    if (p.subjectMask.grown(1).has(x, y)) continue
    p.stamp(['.w.', 'wkw', '.w.'], x - 1, y - 1, { w: ICE[3], k: ICE[4] })
  }
  p.shine(false)
}

export const arktos: CardDef = {
  id: 'pkm-fossil-071',
  number: 71,
  name: 'Arktos',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Wasser',
  hp: 70,
  attacks: [
    { name: 'Blizzard', cost: ['Wasser', 'Wasser', 'Wasser', 'Wasser'], damage: '50' },
    { name: 'Gefriertrocknung', cost: ['Wasser', 'Wasser', 'Wasser'], damage: '30' },
  ],
  // the sky, the aurora, the stars and the ice crystals shine; bird and peaks stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    const d = p.layer()
    tail(d)
    bird(d)
    p.subject(d, OUTLINE)
    crystals(p)
  },
}
