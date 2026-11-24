import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng, spline, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Der Letzte Döner, the first Grail of Spätschicht (docs/sets/empiremon.md). Brief: a legendary serpent-dragon
 * whose body is a turning meat cone, its scales golden lettuce and onion, floating over the sleeping city at
 * 3 a.m. under a huge moon. Full art, 80×112.
 *
 * Composition: a huge golden moon fills the middle of the sky. The dragon winds down across it in an S: the
 * head at the top right in profile, roaring to the left, the steel spit through its skull as a horn; the body
 * is the cone, thick at the neck, tapering to the spit's tip at the tail, sliced into crispy layers, with a frill
 * of golden lettuce along its back and onion rings down its belly. Below, the sleeping city with one clock
 * tower at three. The plates cover rows 4–14 and 91–106.
 */
const SKY = colors('070616', '0f0c28', '1a143e', '2a1e56', '3e2a70')
const GOLD = colors('7a4a12', 'c8862a', 'f0c050', 'fff0a8', 'fffbe8')
const MEAT = colors('3a140c', '6e2a12', 'a8521e', 'd8843a', 'f4b464')
const LETTUCE = colors('3e5a10', '84a020', 'c4d23e', 'f0f080')
const ONION = colors('6a2462', 'c47ec0', 'f8eaf4')
const STEEL = colors('4a4a62', 'a8aec4', 'f0f4ff')
const CITY = colors('05040e', '0c0a1e')
const RED = hex('b8282a')
const OUTLINE = hex('14060a')

const P = (x: number, y: number): Pt => [x, y]

// ── night, moon and the sleeping city ──────────────────────────────────────

const MOON = { x: 40, y: 47, r: 27 }

function night(p: Painter): void {
  p.shine(true)
  // sky: dark at the top, lighter and warmer in a wide ring round the moon
  p.dither(
    null,
    SKY,
    (x, y) => {
      const d = Math.hypot(x - MOON.x, y - MOON.y)
      return 0.12 + Math.max(0, 1 - (d - MOON.r) / 30) * 0.7 + (noise(x, y, 2, 8) - 0.5) * 0.1
    },
    0.7,
  )
  stars(p, rng(17), 26, [GOLD[3], SKY[4], GOLD[2]], { x: 3, y: 15, w: 74, h: 60 })
  // the moon: a pale gold disc, a brighter rim on its lit side, soft seas
  const moon = p.m().disc(MOON.x, MOON.y, MOON.r)
  p.fill(moon.grown(1).minus(moon), GOLD[1])
  p.dither(moon, [GOLD[2], GOLD[3], GOLD[4]], (x, y) => 0.9 - Math.hypot(x - 30, y - 36) / 60, 0.5)
  for (const [x, y, rx, ry, seed] of [
    [31, 41, 6, 4, 1],
    [47, 37, 4, 3, 2],
    [50, 56, 7, 4, 3],
    [33, 60, 3, 2, 4],
  ] as const) {
    p.fill(p.m().blob(x, y, rx, ry, seed, 0.3).and(moon), GOLD[2])
  }
  p.shine(false)

  // the sleeping city: roofs and spires against the bottom of the moon, almost every window dark
  const city = p.m()
  for (const [x, top, w] of [
    [0, 76, 8],
    [7, 72, 6],
    [18, 74, 7],
    [24, 69, 9],
    [33, 75, 6],
    [38, 70, 8],
    [46, 67, 7],
    [53, 73, 6],
    [58, 70, 9],
    [72, 75, 8],
  ] as const) {
    city.rect(x, top, w, 112 - top)
    city.poly([x, top, x + w / 2, top - 3, x + w, top])
  }
  // the clock tower on the left, the church on the right
  city.rect(12, 62, 6, 50).poly([11.5, 62, 15, 55, 18.5, 62])
  city.rect(66, 70, 6, 42).poly([66, 70, 69, 58, 72, 70])
  p.fill(city, CITY[1])
  p.fill(city.facing([0, -1]), SKY[2])
  // three o'clock: one gold face, hands at twelve and three
  p.fill(p.m().disc(15.5, 67.5, 2.8), GOLD[2])
  p.px(15, 65, CITY[0]).px(15, 66, CITY[0]).px(15, 67, CITY[0]).px(16, 67, CITY[0]).px(17, 67, CITY[0])
  const rand = rng(5)
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(rand() * 76)
    const y = 76 + Math.floor(rand() * 13)
    if (city.has(x, y) && city.has(x + 1, y)) p.px(x, y, GOLD[1]).px(x + 1, y, GOLD[1])
  }
}

// ── the dragon ──────────────────────────────────────────────────────────────

/** Centreline of the body from the neck to the tip of the tail. */
const SPINE = spline([57, 32, 50, 42, 36, 47, 25, 55, 28, 66, 44, 70, 57, 76, 56, 84, 44, 87, 31, 86], 8)
const radiusAt = (k: number) => 1.2 + 7.6 * Math.pow(1 - k, 1.15)
/** Distance along the spine at every sample. */
const ARC = SPINE.reduce<number[]>((acc, pt, i) => {
  const prev = SPINE[i - 1]
  acc.push(i === 0 || !prev ? 0 : (acc[i - 1] ?? 0) + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]))
  return acc
}, [])

/** Position along the spine (0 = neck, 1 = tail) and the unit normal pointing to the belly; the back is opposite. */
function frame(i: number): { pt: Pt; nx: number; ny: number; k: number } {
  const a = SPINE[Math.max(0, i - 1)] ?? P(0, 0)
  const b = SPINE[Math.min(SPINE.length - 1, i + 1)] ?? P(0, 0)
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return { pt: SPINE[i] ?? P(0, 0), nx: -(b[1] - a[1]) / len, ny: (b[0] - a[0]) / len, k: i / (SPINE.length - 1) }
}

/** For a pixel: index of the nearest spine sample and the signed distance across the body. */
function where(x: number, y: number): [number, number] {
  let best = 0
  let bestD = Infinity
  SPINE.forEach(([sx, sy], i) => {
    const dd = (sx - x - 0.5) ** 2 + (sy - y - 0.5) ** 2
    if (dd < bestD) [best, bestD] = [i, dd]
  })
  const f = frame(best)
  return [best, (x + 0.5 - f.pt[0]) * f.nx + (y + 0.5 - f.pt[1]) * f.ny]
}

/** A ruffled leaf of golden lettuce: a wobbly lobe, shaded, its frilled edge catching gold. */
function leaf(d: Painter, x: number, y: number, r: number, seed: number): void {
  const m = d.m().blob(x, y, r, r * 0.85, seed, 0.38)
  d.part(m, LETTUCE, { bevel: Math.max(1.5, r * 0.7) })
  d.fill(m.facing([0, -1]).minus(m.facing([1, 0])), LETTUCE[3])
}

function dragon(d: Painter): Mask {
  const m = (): Mask => d.m()
  const n = SPINE.length - 1

  // the lettuce frill along the back, behind the body
  for (let i = 3; i < n - 5; i += 4) {
    const f = frame(i)
    const r = radiusAt(f.k)
    leaf(d, f.pt[0] - f.nx * (r + 0.5), f.pt[1] - f.ny * (r + 0.5), 1.4 + r * 0.5, i)
  }

  // the body: a cone of meat. Crispy crust along the back, fine shaved layers on the flanks,
  // a band of onion rings down the belly like a dragon's belly plates
  const body = m()
  SPINE.forEach(([x, y], i) => body.disc(x, y, radiusAt(i / n)))
  d.part(body, MEAT, { bevel: 4 })
  body.each((x, y) => {
    const [i, s] = where(x, y)
    const r = radiusAt(i / n)
    const u = Math.max(-1, Math.min(1, s / r))
    const along = (ARC[i] ?? 0) + (1 - u * u) * 1.2
    const slice = along % 3.4 < 1
    if (u > 0.42 && r > 2) {
      d.set(x, y, slice || u > 0.85 ? ONION[1] : ONION[2])
      if (u < 0.56) d.set(x, y, ONION[0])
    } else if (u < -0.6) d.set(x, y, slice ? MEAT[0] : MEAT[1])
    else if (u > -0.3 && u < 0.2 && r > 2.5) d.set(x, y, slice ? MEAT[2] : along % 3.4 < 2.2 ? MEAT[3] : MEAT[4])
    else if (slice && r > 1.6) d.set(x, y, u < -0.1 ? MEAT[1] : MEAT[2])
  })

  // the spit pokes out of the tail
  d.fill(m().line(31, 86, 21, 84).line(31, 87, 21, 85), STEEL[1])
  d.fill(m().line(31, 86, 21, 84), STEEL[2])

  // mane of lettuce flaring behind the head
  for (const [x, y, r, seed] of [
    [64, 23, 3.6, 11],
    [66.5, 29.5, 3.4, 12],
    [62, 34.5, 3, 13],
    [61, 17.5, 3, 14],
  ] as const) {
    leaf(d, x, y, r, seed)
  }
  // the spit through the skull as a horn
  d.fill(m().line(57, 22, 71, 15).line(57, 23, 71, 16), STEEL[1])
  d.fill(m().line(57, 22, 71, 15), STEEL[2])

  // lower jaw dropped open, pale onion lining like the belly
  const jaw = m().poly([56, 30, 49, 33, 42, 35.5, 40, 37.5, 44, 38.5, 52, 37, 59, 33])
  d.part(jaw, MEAT, { bevel: 2.5 })
  d.fill(jaw.clone().and(m().rect(0, 37, 80, 3)), ONION[1])
  // head in profile: a heavy skull and a long upper jaw with a turned-up nose
  const head = m()
    .ellipse(56, 25.5, 6.5, 5.8)
    .poly([52, 20, 45, 21.5, 40, 23, 37, 24, 36.5, 27, 39, 30, 46, 30.5, 53, 31.5])
  d.part(head, MEAT, { bevel: 4 })
  // mouth, tongue and fangs
  const mouth = m().poly([52, 31, 45, 30.8, 40, 31, 41.5, 35, 47, 33.6, 53, 32.5])
  d.fill(mouth, RED)
  d.fill(mouth.facing([0, -1]), OUTLINE)
  d.stamp(['w..w..w', 'w..w...'], 40, 31, { w: ONION[2] })
  d.stamp(['...w..w', '..ww.ww'], 39, 33, { w: ONION[2] })
  // crispy ridges over the snout, a heavy brow over a glowing gold eye, the nostril
  d.fill(m().line(41, 23, 44, 26).line(45, 22, 48, 26).and(head), MEAT[1])
  d.stamp(['...kkk', '.kkk..', 'kwgok.', '.ggo..'], 48, 20, { k: OUTLINE, w: GOLD[4], g: GOLD[3], o: RED })
  d.px(37, 25, OUTLINE)
  return d.mask()
}

/** Onion whiskers trailing from the snout, drawn over the night without an outline. */
function whiskers(p: Painter): void {
  const strands = p.m().path(spline([37, 28, 32, 29, 28, 33, 25, 38, 22, 40], 4))
  strands.path(spline([38.5, 29.5, 35, 33, 33, 38, 30, 43, 27, 45], 4))
  p.fill(strands.minus(p.subjectMask), ONION[1])
}

/** Backlight: where the dragon lies on the moon, its edge catches a line of gold, and a few stars sparkle. */
function backlight(p: Painter, body: Mask): void {
  const moon = p.m().disc(MOON.x, MOON.y, MOON.r)
  p.shine(true)
  body
    .facing()
    .and(moon.grown(1))
    .each((x, y) => {
      const toMoon = Math.hypot(x + 0.5 - MOON.x, y + 0.5 - MOON.y)
      if (toMoon > 6) p.set(x, y, GOLD[3])
    })
  const SPARK = ['..w..', '..w..', 'wwgww', '..w..', '..w..']
  for (const [x, y] of [
    [8, 24],
    [69, 40],
    [6, 52],
    [70, 66],
  ] as const) {
    p.stamp(SPARK, x, y, { w: GOLD[3], g: GOLD[4] })
  }
  p.shine(false)
}

/** A gold aura round the dragon where it lies on the night sky, fading out over three pixels. */
function aura(p: Painter): void {
  const moon = p.m().disc(MOON.x, MOON.y, MOON.r + 1)
  const near = p.subjectMask.grown(1)
  const mid = near.grown(1)
  p.shine(true)
  p.subjectMask
    .grown(3)
    .minus(p.subjectMask)
    .minus(moon)
    .each((x, y) => {
      if (y > 88) return
      const level = near.has(x, y) ? 0.6 : mid.has(x, y) ? 0.3 : 0.12
      if (bayer(x, y) < level) p.set(x, y, GOLD[1])
    })
  p.shine(false)
}

export const derLetzteDoener: CardDef = {
  id: 'emp2-017',
  number: 17,
  name: 'Der Letzte Döner',
  tier: 'grail',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    night(p)
    const d = p.layer()
    const body = dragon(d)
    p.subject(d, OUTLINE)
    aura(p)
    backlight(p, body)
    whiskers(p)
  },
}
