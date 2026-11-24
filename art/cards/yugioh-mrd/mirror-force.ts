import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Spiegelkraft (Ultra, trap). Brief: no character; a curved barrier of hexagonal mirror panels spans
 * the frame, a thick orange monster beam hits it from the top right and is thrown back as a fan of
 * rainbow shards at two attacking monsters, who recoil. Dark arena. Full art, 80×112.
 *
 * Composition: the barrier is a wide arc across the lower half, its hexagons running along the curve,
 * lit from the top left. Behind it, on the arena floor, a horned brute and a serpent dragon attack;
 * the dragon's beam strikes the crown of the arc and bursts into a fan of rainbow shards that fly
 * back up at both of them. The attackers stay flat, dark cut-outs against the glow of the battle.
 * Text plates float over rows 0–13 and 90–111.
 */
const NAVY = colors('03040c', '060a1a', '0b122c', '121c40', '1c2a58', '2c3e74')
const GLASS = colors('12304c', '22587c', '3c88ac', '72bcd8', 'b8e6f2')
const EDGE = hex('f4feff')
const RAINBOW = colors('ff4652', 'ff9a2c', 'ffe048', '62e070', '46b4ff', 'b070ff')
const BEAM = colors('9a2c08', 'e8660e', 'ffa432', 'ffe9a8')
const SHADOW = hex('04050c')
const OUTLINE = hex('050a16')

const P = (x: number, y: number): Pt => [x, y]

/** The barrier: an arc around a centre far below the card, between two radii. */
const ARC = { x: 40, y: 130, inner: 53, outer: 77 }
/** Where the beam strikes the crown of the arc, and where it comes from (the dragon's jaws). */
const IMPACT = P(37, 53.5)
const JAWS = P(59.5, 32.5)

function arena(p: Painter): void {
  // the dark arena; the battle lights a haze behind the attackers
  p.shine(true)
  p.dither(
    null,
    NAVY,
    (x, y) => {
      const haze = Math.max(0, 1 - Math.hypot((x - IMPACT[0]) * 0.7, (y - 30) * 1.1) / 50)
      const floor = y > 44 ? -0.22 + Math.max(0, (y - 78) / 40) : 0
      return 0.16 + haze * 1.05 + floor + noise(x, y, 3, 7) * 0.12
    },
    0.7,
  )
  p.shine(false)
  // floor lines running to the far end of the arena
  for (const x of [-30, -6, 18, 58, 82, 106])
    p.fill(
      p
        .m()
        .line(40, 44, x, 112)
        .and(p.m().rect(0, 45, 80, 67)),
      NAVY[1],
    )
  p.fill(p.m().rect(0, 44, 80, 1), NAVY[3])
}

/** The two attackers: flat dark cut-outs, both thrown back by the shards. */
function attackers(p: Painter): void {
  const m = (): Mask => p.m()
  // a horned brute on the left, leaning back with its arms flung up
  const brute = m()
    .ellipse(17, 33, 7, 9.5, -18)
    .disc(20.5, 22, 4.4)
    .limb([18, 20, 15, 15, 16, 11], [1.6, 1.1, 0.5])
    .limb([22.5, 19.5, 26, 15, 30, 13], [1.6, 1.1, 0.5])
    .limb([12, 28, 6, 22, 4, 15], [2.4, 2, 1.6])
    .limb([23, 27, 29, 24, 31, 18], [2.2, 1.8, 1.5])
    .limb([14, 40, 11, 45], [3, 2.4])
    .limb([20, 40, 23, 45], [3, 2.4])
  // a horned dragon rearing in from the top right, its head thrown back, jaws open on the beam
  const serpent = m()
    .limb([82, 46, 76, 36, 72, 29, 67, 26], [5.4, 4.6, 3.8, 3.4])
    .ellipse(66, 25.5, 5, 3.6, 25)
    .poly([64, 22.5, 56, 28.5, 57, 30.5, 64, 29])
    .poly([65, 30, 58, 34.5, 59, 36, 67, 32])
    .limb([66.5, 22, 70, 16.5, 75, 14], [1.4, 1, 0.5])
    .limb([69, 23, 74, 19.5, 79, 19], [1.3, 0.9, 0.5])
    .poly([76, 34, 81, 31, 79, 37])
    .poly([73, 28, 78, 24, 77, 30])
  p.fill(brute.or(serpent), SHADOW)
  p.fill(brute.facing([1, 0, 0, 1]).or(serpent.facing([-1, 0, 0, 1])), NAVY[4])
}

/** Polar coordinates around the centre of the arc: arc length along the mid radius, and radius. */
function polar(x: number, y: number): [number, number] {
  const dx = x + 0.5 - ARC.x
  const dy = y + 0.5 - ARC.y
  const mid = (ARC.inner + ARC.outer) / 2
  return [Math.atan2(dx, -dy) * mid, Math.hypot(dx, dy)]
}

/** Hexagonal cell of a point in (u, v): its centre, and how far the point is from the cell border. */
function cell(u: number, v: number): { cu: number; cv: number; border: number } {
  const size = 4.4
  // pointy-top hexagons in axial coordinates, rounded to the nearest cell
  const q = ((Math.sqrt(3) / 3) * u - v / 3) / size
  const r = ((2 / 3) * v) / size
  let rx = Math.round(q)
  let rz = Math.round(r)
  const ry = Math.round(-q - r)
  const dx = Math.abs(rx - q)
  const dy = Math.abs(ry - (-q - r))
  const dz = Math.abs(rz - r)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy <= dz) rz = -rx - ry
  const cu = size * Math.sqrt(3) * (rx + rz / 2)
  const cv = size * 1.5 * rz
  // distance to the border of a hexagon of this size, in its three edge directions
  const du = u - cu
  const dv = v - cv
  const reach = Math.max(
    Math.abs(du),
    Math.abs(du * 0.5 + dv * (Math.sqrt(3) / 2)),
    Math.abs(du * 0.5 - dv * (Math.sqrt(3) / 2)),
  )
  return { cu, cv, border: size * (Math.sqrt(3) / 2) - reach }
}

/** The barrier: hexagonal mirror panels along the arc, each split into a lit and a shaded facet. */
function barrier(d: Painter): void {
  const band = d.m()
  for (let y = 0; y < d.h; y++)
    for (let x = 0; x < d.w; x++) {
      const [, v] = polar(x, y)
      if (v >= ARC.inner && v <= ARC.outer) band.add(x, y)
    }
  d.register(GLASS)
  const [iu, iv] = polar(IMPACT[0], IMPACT[1])
  band.each((x, y) => {
    const [u, v] = polar(x, y)
    const c = cell(u, v - ARC.inner + 2.3)
    // each panel reflects: a lit facet to the top left of its diagonal, a dark one below it
    const du = u - c.cu
    const dv = v - ARC.inner + 2.3 - c.cv
    const facet = du + dv * 1.4 < 0 ? 1 : 0
    // the light falls from the top left; panels near the impact blaze
    // diagonal glints run across whole panels, as on a mirror
    const glint = Math.abs(((c.cu * 0.9 + c.cv * 1.6 + 400) % 38) - 19) < 3.5 ? 0.38 : 0
    const light = 0.3 - u / 150 + facet * 0.3 + glint + noise(c.cu, c.cv, 9, 1) * 0.22 - (ARC.outer - v) / 90
    const blaze = Math.max(0, 1 - Math.hypot(u - iu, (v - iv) * 1.2) / 24)
    const step = Math.max(0, Math.min(4, Math.floor((light + blaze * 0.7) * 4)))
    d.set(x, y, GLASS[step] ?? GLASS[0])
  })
  // the panel seams glint white on the lit side of the arc, pale cyan elsewhere
  d.shine(true)
  band.each((x, y) => {
    const [u, v] = polar(x, y)
    const c = cell(u, v - ARC.inner + 2.3)
    if (c.border < 0.75) d.set(x, y, u < 8 ? EDGE : GLASS[3])
  })
  d.fill(band.facing([0, -1]), EDGE)
  d.shine(false)
  d.fill(band.facing([0, 1]), GLASS[0])
}

/** The beam strikes the arc and is thrown back as a fan of rainbow shards at the attackers. */
function reflection(p: Painter): void {
  p.shine(true)
  // the beam: a thick orange ray from the jaws to the impact, a pale core
  const ray = (r: number): Mask => p.m().capsule(JAWS[0], JAWS[1], IMPACT[0], IMPACT[1], r)
  p.fill(ray(3.2), BEAM[0])
  p.fill(ray(2.3), BEAM[1])
  p.fill(ray(1.4), BEAM[2])
  p.fill(ray(0.6), BEAM[3])

  // the shards: thin slivers fanning out from the impact, one colour of the rainbow each
  const rand = rng(85)
  const fan = 11
  const beam = (Math.atan2(JAWS[1] - IMPACT[1], JAWS[0] - IMPACT[0]) * 180) / Math.PI
  for (let i = 0; i < fan; i++) {
    let deg = -170 + (i * 150) / (fan - 1) + (rand() - 0.5) * 6
    if (Math.abs(deg - beam) < 12) deg = beam + (deg < beam ? -12 : 12)
    const a = deg * (Math.PI / 180)
    const len = 18 + rand() * 20
    const from = 5 + rand() * 4
    const [cx, cy] = [Math.cos(a), Math.sin(a)]
    const c = RAINBOW[Math.min(5, Math.floor((i * 6) / fan))] ?? RAINBOW[0]
    const x0 = IMPACT[0] + cx * from
    const y0 = IMPACT[1] + cy * from
    const x1 = IMPACT[0] + cx * (from + len)
    const y1 = IMPACT[1] + cy * (from + len)
    const w = 1.1 + rand() * 0.5
    const sliver = p
      .m()
      .poly([
        x0,
        y0,
        (x0 + x1) / 2 - cy * w,
        (y0 + y1) / 2 + cx * w,
        x1,
        y1,
        (x0 + x1) / 2 + cy * w,
        (y0 + y1) / 2 - cx * w,
      ])
    p.fill(sliver.or(p.m().line(x0, y0, x1, y1)), c)
    p.px(Math.round(x1 - 0.5), Math.round(y1 - 0.5), EDGE)
  }

  // the flash where beam and mirror meet
  const [ix, iy] = IMPACT
  p.fill(p.m().disc(ix, iy, 4.6), BEAM[2])
  p.fill(
    p
      .m()
      .disc(ix, iy, 2.8)
      .line(ix - 9, iy, ix + 9, iy)
      .line(ix, iy - 9, ix, iy + 3),
    BEAM[3],
  )
  p.fill(p.m().disc(ix, iy, 1.6), EDGE)

  // sparks where the shards bite into the attackers
  for (const [x, y] of [P(22, 27), P(13, 31), P(27, 21), P(63, 31), P(68, 28), P(72, 34)])
    p.px(x, y, EDGE)
      .px(x - 1, y, RAINBOW[2])
      .px(x + 1, y, RAINBOW[2])
      .px(x, y - 1, RAINBOW[1])
      .px(x, y + 1, RAINBOW[1])
  p.shine(false)
}

export const mirrorForce: CardDef = {
  id: 'ygo-mrd-085',
  number: 85,
  name: 'Spiegelkraft',
  tier: 'ultra',
  kind: 'trap',
  sub: 'normal',
  text: 'Alle Angreifer tot',
  // the arena haze, the panel seams, the beam and the shards shine; panels and attackers stay matt
  foil: 'painted',
  draw(p) {
    arena(p)
    attackers(p)
    const d = p.layer()
    barrier(d)
    p.subject(d, OUTLINE)
    reflection(p)
  },
}
