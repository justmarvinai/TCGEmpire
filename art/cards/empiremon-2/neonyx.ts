import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng, spline, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Neonyx, the second Grail of Spätschicht (docs/sets/empiremon.md). Brief: a shadow cat goddess with neon-violet
 * eyes, a neon halo and several thin glowing tails, sitting on a rooftop antenna above the skyline. Full art,
 * 80×112.
 *
 * Composition: high above the city, the goddess sits upright like a temple statue on the boom of an old roof
 * antenna. A ring of violet neon stands behind her head; her body is shadow with a few stars inside, rimmed by
 * the light of the ring and of the city below. Five thin glowing tails stream from her seat: four ripple down
 * over the city, one curls up beside her. Gold marks her as divine: a crescent on the brow, a broad collar,
 * rings in the ears. The plates cover rows 4–14 and 91–106, so the ears end at row 16.
 */
const SKY = colors('06041a', '0e0a2a', '1a1240', '2a1a58', '42267a')
const SHADOW = colors('0b0716', '1c1330', '30244e', '4c3a78')
const NEON = colors('5a1aa0', 'a040ff', 'd890ff', 'f6e8ff')
const PINK = colors('b02a82', 'ff60c0')
const CYAN = hex('2ab8d8')
const GOLD = colors('7a4a12', 'c8862a', 'f0c050', 'fff0a8')
const STEEL = colors('221c38', '4c4668', '8a84aa')
const OUTLINE = hex('05020c')

/** Mirror x round the middle of the cat. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

const HALO = { x: 40, y: 29, r: 14 }

// ── sky and city ────────────────────────────────────────────────────────────

function night(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const halo = Math.max(0, 1 - Math.abs(Math.hypot(x - HALO.x, y - HALO.y) - HALO.r) / 16) * 0.55
      const city = Math.pow(Math.max(0, (y - 50) / 40), 1.4) * 0.8
      return 0.08 + Math.max(halo, city) + (noise(x, y, 6, 9) - 0.5) * 0.1
    },
    0.7,
  )
  stars(p, rng(23), 30, [NEON[3], GOLD[3], NEON[2]], { x: 3, y: 15, w: 74, h: 50 })
  // a thin crescent moon in the top left
  const moon = p.m().disc(13, 22, 5).minus(p.m().disc(15.5, 20.5, 4.6))
  p.fill(moon, GOLD[3])
  p.shine(false)

  // the city far below: roofs in rows, windows lit in gold, neon signs in pink and cyan
  const rand = rng(9)
  for (const [top, step, shade] of [
    [70, 5, SKY[2]],
    [76, 6, SKY[1]],
    [83, 7, SKY[0]],
  ] as const) {
    for (let x = -2; x < 80; ) {
      const w = step + Math.floor(rand() * 5)
      const h = top + Math.floor(rand() * 5)
      const block = p.m().rect(x, h, w - 1, 112 - h)
      p.fill(block, shade)
      for (let wy = h + 2; wy < 92; wy += 3) {
        for (let wx = x + 1; wx < x + w - 2; wx += 2) {
          const r = rand()
          if (r < 0.18) p.px(wx, wy, GOLD[2])
          else if (r < 0.22) p.px(wx, wy, CYAN)
          else if (r < 0.25) p.px(wx, wy, PINK[1])
        }
      }
      x += w
    }
  }
  // violet haze rising over the roofs
  p.shine(true)
  p.m()
    .rect(0, 64, 80, 26)
    .each((x, y) => {
      if (bayer(x, y) < 0.42 - Math.abs(y - 72) * 0.045) p.set(x, y, SKY[3])
    })
  p.shine(false)
}

// ── the antenna ─────────────────────────────────────────────────────────────

function antenna(p: Painter): void {
  p.register(STEEL)
  // the mast from the roof below up to the boom, the boom with its fishbone of elements
  p.fill(p.m().rect(39, 67, 2, 33), STEEL[1])
  p.fill(p.m().rect(39, 67, 1, 33), STEEL[2])
  p.fill(p.m().rect(14, 66, 52, 2), STEEL[1])
  p.fill(p.m().rect(14, 66, 52, 1), STEEL[2])
  for (const [x, h] of [
    [16, 7],
    [21, 9],
    [26, 10],
    [54, 10],
    [59, 9],
    [64, 7],
  ] as const) {
    p.fill(p.m().rect(x, 67 - h, 1, h * 2 + 1), STEEL[1])
  }
  // a clamp on the mast, a red warning light at the end of the boom
  p.fill(p.m().rect(38, 74, 4, 2), STEEL[0])
  p.px(65, 65, PINK[1])
}

// ── the goddess ─────────────────────────────────────────────────────────────

interface Tail {
  pts: readonly number[]
}

/** Five tails swirl round her: a small curl and a high sweep round the halo on the right, one down each side,
 * one curling up on the left. Radii taper from the seat to the tip. */
const TAILS: readonly Tail[] = [
  { pts: [45, 62, 51, 61, 55, 57, 56, 52, 53, 49] },
  { pts: [44, 66, 56, 70, 66, 66, 72, 56, 71, 44, 66, 36, 61, 31] },
  { pts: [45, 65, 53, 70, 61, 70, 67, 74, 70, 82] },
  { pts: [35, 64, 26, 66, 18, 62, 14, 55, 15, 48, 19, 45] },
  { pts: [36, 66, 29, 72, 21, 74, 14, 79, 11, 86] },
]

/** The tails: thin tapering neon with a bright core and a brighter tip. Returns their mask for the glow. */
function tails(d: Painter): Mask {
  const all = d.m()
  const cores = TAILS.map((t) => d.m().path(spline(t.pts, 6)))
  TAILS.forEach((t) => {
    const n = t.pts.length / 2
    all.or(d.m().limb(t.pts, Array.from({ length: n }, (_, i) => 1.6 - (0.9 * i) / (n - 1))))
  })
  d.fill(all, NEON[1])
  for (const c of cores) d.fill(c, NEON[2])
  // the last stretch of every tail burns brightest
  TAILS.forEach((t) => {
    const n = t.pts.length
    const tip = spline(t.pts.slice(n - 4), 6)
    d.fill(d.m().path(tip), NEON[3])
  })
  return all
}

/** Glow of the tails on the night, fading over three pixels. */
function tailGlow(p: Painter, tubes: Mask): void {
  const near = tubes.grown(2)
  p.shine(true)
  tubes
    .grown(4)
    .minus(p.subjectMask)
    .each((x, y) => {
      if (bayer(x, y) < (near.has(x, y) ? 0.5 : 0.2)) p.set(x, y, NEON[0])
    })
  p.shine(false)
}

function goddess(d: Painter): void {
  const m = (): Mask => d.m()

  // haunches: rounded thighs either side, small hind paws
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().ellipse(x(33.5), 57.5, 4.6, 7.5, s * 14), SHADOW, { bevel: 4 })
    d.part(m().ellipse(x(32), 65, 3.2, 1.6), SHADOW, { bevel: 2 })
  }
  // the body, a slim vase from the chest down to the seat, and the neck
  d.part(m().ellipse(40, 55.5, 6.8, 9).ellipse(40, 44, 5.5, 8).rect(37, 33, 6, 6), SHADOW, { bevel: 5 })

  // front legs straight down, paws together on the boom, a gold bangle on each
  const legs = m()
  for (const s of [1, -1]) {
    const x = side(s)
    const leg = m().limb([x(37.8), 47, x(38), 56, x(38), 63.5], [2.2, 1.9, 1.8])
    d.part(leg, SHADOW, { bevel: 2 })
    d.part(m().ellipse(x(38), 64.8, 2.3, 1.5), SHADOW, { bevel: 2 })
    d.fill(leg.facing([s, 0]).and(m().rect(0, 49, 80, 13)), SHADOW[3])
    d.fill(m().rect(x(36.5) - 1, 60, 3, 1), GOLD[2])
    legs.or(leg)
  }

  // broad gold collar, a violet gem hanging from it
  const collar = m().ellipse(40, 37.5, 7, 4.5).minus(m().ellipse(40, 35, 5.5, 3.3))
  d.part(collar, GOLD, { bevel: 2 })
  for (const x of [35, 38, 41, 44]) d.fill(m().rect(x, 38, 1, 3).and(collar.shrunk(1)), GOLD[1])
  d.stamp(['.v.', 'vwv', '.v.'], 38.5, 41, { v: NEON[1], w: NEON[3] })

  // tall ears with violet insides, the head with a fine chin
  for (const s of [1, -1]) {
    const x = side(s)
    const ear = m().poly([x(33), 27, x(32), 15.5, x(38.5), 22.5])
    d.part(ear, SHADOW, { bevel: 2 })
    d.fill(m().poly([x(33.8), 24.5, x(33.2), 18.5, x(36.6), 22.8]).and(ear.shrunk(1)), NEON[0])
  }
  const head = m().ellipse(40, 28, 6.8, 5.6).poly([34.5, 30, 40, 36, 45.5, 30])
  d.part(head, SHADOW, { bevel: 4 })

  // a few stars inside the shadow
  for (const [x, y, c] of [
    [37, 51, NEON[2]],
    [43, 55, GOLD[3]],
    [40, 60, NEON[2]],
    [42, 46, NEON[2]],
  ] as const) {
    d.px(x, y, c)
  }

  // rim light from the halo and the city on the outer edges and over the hips
  const body = d.mask()
  d.fill(body.facing([-1, 0, 1, 0, 0, -1]).minus(m().rect(0, 63, 80, 8)).minus(collar), SHADOW[3])
  for (const s of [1, -1]) {
    const x = side(s)
    const hip = m().ellipse(x(33.5), 57.5, 4.6, 7.5, s * 14)
    d.fill(hip.facing([0, -1]).minus(legs), SHADOW[3])
  }

  // neon eyes glowing on the shadow of the face, a gold crescent on the brow, gold rings in the ears, a violet nose
  d.stamp(['v........v', '.vvw..wvv.', '..vv..vv..'], 35, 26, { v: NEON[1], w: NEON[3] })
  d.stamp(['g.g', '.g.'], 38.5, 22, { g: GOLD[2] })
  d.px(33, 25, GOLD[3]).px(46, 25, GOLD[3])
  d.px(39, 31, NEON[1]).px(40, 31, NEON[1])
}

/** The neon halo: a ring of violet tube behind the head, glowing on the sky. */
function halo(p: Painter): void {
  const ring = p.m().disc(HALO.x, HALO.y, HALO.r).minus(p.m().disc(HALO.x, HALO.y, HALO.r - 2))
  const core = p.m().disc(HALO.x, HALO.y, HALO.r - 0.5).minus(p.m().disc(HALO.x, HALO.y, HALO.r - 1.5))
  const glow = ring.grown(3).minus(ring)
  p.shine(true)
  glow.each((x, y) => {
    const level = ring.grown(1).has(x, y) ? 0.7 : ring.grown(2).has(x, y) ? 0.4 : 0.15
    if (bayer(x, y) < level) p.set(x, y, NEON[0])
  })
  p.fill(ring, NEON[1])
  p.fill(core, NEON[3])
  p.shine(false)
}

export const neonyx: CardDef = {
  id: 'emp2-018',
  number: 18,
  name: 'Neonyx',
  tier: 'grail',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    night(p)
    halo(p)
    antenna(p)
    const t = p.layer()
    const tubes = tails(t)
    p.subject(t, NEON[0])
    const d = p.layer()
    goddess(d)
    p.subject(d, OUTLINE)
    tailGlow(p, tubes)
  },
}
