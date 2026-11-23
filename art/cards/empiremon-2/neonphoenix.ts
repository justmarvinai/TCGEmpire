import type { Mask, Painter, Ramp } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Neonphönix, an Ultra of Spätschicht (docs/sets/empiremon.md). Brief: a phoenix of bent neon tubes in pink and
 * cyan over a dark street, reflections on wet asphalt. Full art, 80×112.
 *
 * Composition: a street at night in one-point perspective, the vanishing point low in the middle. The phoenix
 * hangs over it like a sign come alive: wings of fanned tubes reach into the upper corners, the head turned to
 * the right, the tail curling down to the street, where the wet asphalt mirrors it in broken streaks. Tram
 * wires run to the vanishing point. The plates cover rows 4–14 and 91–106, so the crest ends at row 16.
 */
const NIGHT = colors('05051a', '0c0c26', '151534', '201e48', '302a62')
const PINK = colors('5c1060', 'b0208e', 'ff4ec8', 'ffe0f6')
const CYAN = colors('0e4466', '1a8ab0', '30e4f4', 'e0ffff')
const YELLOW = colors('8a6210', 'ffc830', 'fff2a0')
const OUTLINE = hex('2a0c4a')

/** Vanishing point of the street. */
const VP = { x: 40, y: 64 }
/** Row where the wet street starts to mirror the phoenix. */
const MIRROR = 72

// ── the street ──────────────────────────────────────────────────────────────

/** A point on the line from (x0, y0) on the border to the vanishing point, at depth z (1 = border, ∞ = vanishing point). */
const at = (x0: number, y0: number, z: number): [number, number] => [VP.x + (x0 - VP.x) / z, VP.y + (y0 - VP.y) / z]

/** Depth at which the facades end and the far block across the street begins. */
const FAR = 5.5

function street(p: Painter): void {
  p.register(NIGHT)
  // sky between the roofs, a faint violet haze over the far end of the street
  p.dither(null, NIGHT, (x, y) => 0.1 + Math.max(0, 1 - Math.hypot(x - VP.x, (y - VP.y) * 1.2) / 44) * 0.75, 0.7)

  // the far block across the end of the street, a few lit windows
  const [fx0, fy0] = at(0, -6, FAR)
  const [fx1] = at(80, -6, FAR)
  const block = p.m().rect(fx0, fy0 + 3, fx1 - fx0, VP.y - fy0)
  p.fill(block, NIGHT[1])
  p.fill(p.m().rect(fx0, fy0 + 3, fx1 - fx0, 1), NIGHT[3])
  for (const [x, y, c] of [
    [35, 54, YELLOW[0]],
    [38, 54, NIGHT[3]],
    [41, 57, YELLOW[0]],
    [44, 54, CYAN[0]],
    [36, 60, NIGHT[3]],
    [43, 60, YELLOW[0]],
  ] as const) {
    p.fill(p.m().rect(x, y, 2, 2), c)
  }

  // facades on both sides: floors and windows shrinking towards the vanishing point, glowing shop fronts below
  const shops = [YELLOW[0], NIGHT[2], PINK[0], NIGHT[2], CYAN[0], NIGHT[2]]
  for (const s of [-1, 1]) {
    const edge = s < 0 ? 0 : 80
    const quad = (y0: number, y1: number, z0: number, z1: number) => {
      const [ax, ay] = at(edge, y0, z0)
      const [bx, by] = at(edge, y0, z1)
      const [cx, cy] = at(edge, y1, z1)
      const [dx, dy] = at(edge, y1, z0)
      return p.m().poly([ax, ay, bx, by, cx, cy, dx, dy])
    }
    p.fill(quad(-6, 92, 1, FAR), NIGHT[1])
    // the roof edge catches the haze
    const [rx, ry] = at(edge, -6, FAR)
    p.fill(p.m().path([edge, -6, rx, ry]), NIGHT[3])
    const rand = rng(s < 0 ? 31 : 47)
    for (let k = 0; k < 7; k++) {
      const z0 = 1 + k * 0.62
      const z1 = z0 + 0.28
      for (let f = 0; f < 5; f++) {
        const top = 4 + f * 13
        const r = rand()
        const c = r < 0.3 ? YELLOW[0] : r < 0.4 ? CYAN[0] : NIGHT[2]
        p.fill(quad(top, top + 7, z0, z1), c)
      }
      // shop front on the ground floor
      p.fill(quad(72, 86, z0, z0 + 0.5), shops[(k + (s < 0 ? 0 : 3)) % shops.length] ?? NIGHT[2])
      p.fill(quad(70, 72, z0, z0 + 0.6), NIGHT[3])
    }
    // kerb: where the facade meets the pavement
    const [kx, ky] = at(edge, 92, FAR)
    p.fill(p.m().path([edge, 92, kx, ky]), NIGHT[3])
  }

  // the street: wet asphalt with lighter streaks, the kerb lines and a dashed middle line
  const road = p.m().poly([...at(-30, 112, FAR), ...at(110, 112, FAR), 110, 112, -30, 112])
  p.dither(road, [NIGHT[0], NIGHT[1], NIGHT[2]], (x, y) => 0.3 + (noise(x * 0.5, y * 3, 5, 5) - 0.5) * 0.8, 0.5)
  for (const x0 of [-30, 110]) p.fill(p.m().path([x0, 112, ...at(x0, 112, FAR)]), NIGHT[3])
  for (let z = 1.2; z < FAR; z *= 1.45) {
    const [ax, ay] = at(40, 112, z)
    const [, by] = at(40, 112, z * 1.18)
    p.fill(p.m().rect(ax, by, 1, Math.max(1, ay - by)), NIGHT[3])
  }

  // tram wires sagging over the street
  for (const [y0, sag] of [
    [18, 3],
    [27, 2],
  ] as const) {
    for (const edge of [0, 80]) {
      const [ex, ey] = at(edge, y0, FAR)
      p.fill(p.m().path(spline([edge, y0, (edge + ex) / 2, (y0 + ey) / 2 + sag, ex, ey], 4)), NIGHT[4])
    }
  }
}

// ── the phoenix ─────────────────────────────────────────────────────────────

type Hue = 'p' | 'c' | 'y'
const HUES: Readonly<Record<Hue, Ramp>> = { p: PINK, c: CYAN, y: [YELLOW[0], YELLOW[0], YELLOW[1], YELLOW[2]] }

interface Tube {
  hue: Hue
  pts: readonly number[]
  /** Fine tubes for the head: no inner glow round them. */
  thin?: boolean
}

/** Mirror x round the middle of the phoenix. */
const flip = (pts: readonly number[]) => pts.map((v, i) => (i % 2 === 0 ? 80 - v : v))

/** One wing, the left; the right is its mirror image. The outline with flame-like primaries, then two vanes. */
const WING: readonly Tube[] = [
  {
    hue: 'p',
    pts: [36, 40, 29, 31, 20, 23, 12, 17, 4, 19, 11, 23, 3, 28, 11, 31, 5, 37, 14, 38, 9, 45, 19, 44, 16, 51, 26, 47, 36, 46],
  },
  { hue: 'c', pts: [33, 40, 25, 32, 17, 26, 11, 24] },
  { hue: 'c', pts: [33, 43, 25, 38, 17, 35, 12, 35] },
]

const TUBES: readonly Tube[] = [
  // tail, behind the body: two plumes sweeping out and curling, a long middle plume
  { hue: 'c', pts: [39, 55, 36, 62, 30, 67, 24, 68, 20, 65, 22, 61, 26, 62] },
  { hue: 'c', pts: [41, 55, 44, 62, 50, 67, 56, 68, 60, 65, 58, 61, 54, 62] },
  { hue: 'p', pts: [40, 56, 40, 64, 38, 70, 34, 73, 31, 71, 33, 68] },
  ...WING,
  ...WING.map((t) => ({ hue: t.hue, pts: flip(t.pts) })),
  // body: a teardrop with a chevron of feathers inside, the neck curving up to the head
  { hue: 'p', pts: [40, 37, 45, 41, 45.5, 48, 40, 57, 34.5, 48, 35, 41, 40, 37] },
  { hue: 'c', pts: [37, 46, 40, 50, 43, 46] },
  { hue: 'p', pts: [40, 37, 38.5, 32, 40, 28] },
  // head in profile looking right: a round skull, three crest plumes flaring back
  { hue: 'p', thin: true, pts: [41, 27.5, 39.5, 23, 42, 19, 46.5, 18.5, 49.5, 21.5, 49, 26, 45.5, 28.5, 41, 27.5] },
  { hue: 'c', thin: true, pts: [40, 20.5, 36, 17.5, 31, 17.5, 28, 20] },
  { hue: 'p', thin: true, pts: [42, 18.5, 40, 15.5, 36, 15] },
  { hue: 'y', thin: true, pts: [45, 18, 45, 15.5, 43, 15] },
]

function phoenix(d: Painter): Mask {
  const cores = TUBES.map((t) => d.m().path(spline(t.pts, 5)))
  const bodies = cores.map((c) => c.grown(1))
  const all = d.m()
  for (const b of bodies) all.or(b)
  // inner glow round every thick tube first, so no glow ever covers a tube
  TUBES.forEach((t, i) => {
    if (!t.thin) d.fill((bodies[i] ?? all).grown(1), HUES[t.hue][1] ?? 0)
  })
  // the tubes back to front; a dark gap where a tube crosses one painted earlier
  const done = d.m()
  TUBES.forEach((t, i) => {
    const body = bodies[i] ?? all
    const ramp = HUES[t.hue]
    d.fill(body.grown(1).and(done), OUTLINE)
    d.fill(body, ramp[2] ?? 0)
    d.fill(cores[i] ?? all, ramp[3] ?? 0)
    done.or(body)
  })
  // a hooked beak of yellow neon and a bright eye
  const beak = d.m().poly([49, 20.5, 54, 21.5, 56.5, 24.5, 55, 26.5, 53.5, 24.5, 49.5, 25.5])
  d.fill(beak.grown(1).and(done), OUTLINE)
  d.fill(beak, YELLOW[1])
  d.fill(beak.facing([0, -1]), YELLOW[2])
  d.stamp(['cc', 'cc'], 44, 22, { c: YELLOW[2] })
  return all.or(beak)
}

/** Outer glow on the night round the phoenix, every other pixel. */
function glow(p: Painter, tubes: Mask): void {
  const ring = tubes.grown(4).minus(p.subjectMask)
  ring.each((x, y) => {
    if ((x + y) % 2 !== 0) return
    let best: Hue = 'p'
    let bestD = Infinity
    TUBES.forEach((t) => {
      const pts = t.pts
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const dd = ((pts[i] ?? 0) - x) ** 2 + ((pts[i + 1] ?? 0) - y) ** 2
        if (dd < bestD) [best, bestD] = [t.hue, dd]
      }
    })
    p.set(x, y, HUES[best][0] ?? 0)
  })
}

/** The wet street mirrors the phoenix below MIRROR in thin streaks broken by ripples. */
function reflection(p: Painter): void {
  const dim = new Map<number, number>([
    [PINK[3], PINK[1]],
    [PINK[2], PINK[0]],
    [CYAN[3], CYAN[1]],
    [CYAN[2], CYAN[0]],
    [YELLOW[2], YELLOW[0]],
    [YELLOW[1], YELLOW[0]],
  ])
  p.shine(true)
  for (let y = MIRROR + 1; y < 112; y++) {
    if ((y - MIRROR) % 3 !== 1) continue
    const src = Math.round(MIRROR - (y - MIRROR) * 1.3)
    const shift = Math.round(Math.sin(y * 1.7) * 1.5)
    for (let x = 0; x < 80; x++) {
      const c = dim.get(p.get(x - shift, src))
      if (c !== undefined) p.set(x, y, c).set(x, y + 1, NIGHT[1])
    }
  }
  p.shine(false)
}

export const neonphoenix: CardDef = {
  id: 'emp2-015',
  number: 15,
  name: 'Neonphönix',
  tier: 'ultra',
  kind: 'monster',
  element: 'Strom',
  foil: 'art',
  draw(p) {
    street(p)
    const d = p.layer()
    const tubes = phoenix(d)
    p.subject(d, OUTLINE)
    glow(p, tubes)
    reflection(p)
  },
}
