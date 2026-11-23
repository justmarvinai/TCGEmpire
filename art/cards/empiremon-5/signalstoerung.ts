import type { Mask, Painter, Points, Pt } from '../../toolkit/index.ts'
import { colors, hex, lightning, noise, rays, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Signalstörung (Grail, Strom), hand-made full art, 80×112. Brief (docs/sets/empiremon.md): an eldritch
 * tangle of signal cables with dozens of red and green signal lights for eyes, crackling over the tracks
 * in a storm.
 *
 * Composition: a knot of black signal cables hangs over the track like a storm god, in its heart a giant
 * red signal lamp with a slit pupil in a golden shield, two dozen smaller lamps staring from the tangle,
 * red and green at once. Cables (two of them striped in hazard yellow) writhe out of the knot, some
 * ending in signal heads, some frayed and spitting copper sparks; golden lightning crackles across the
 * knot and down to the rails. The storm flashes white behind it under a crown of pale rays; rain lashes
 * the rails, which glint red and green. The frame's plates cover rows 4–14 and 91–106, so the knot
 * fills rows 16–88.
 */
const SKY = colors('090b14', '121828', '1e2840', '2e3c5a', '485a7c', '7a90b8', 'c4d4f0')
const VOLT = colors('7a5008', 'd8a018', 'ffe04a', 'fffad8')
const CABLE = colors('0b0c12', '1c1f2a', '343a4c', '5c6680')
const RED = colors('5c0810', 'e0202c', 'ff9a88')
const GREEN = colors('083c22', '1ed060', 'b0ffd0')
const COPPER = colors('8a4a1c', 'e08a3c')
const OUTLINE = hex('050609')

/** Heart of the knot. */
const CORE = { x: 40, y: 47 }
/** Vanishing point of the track. */
const VP = { x: 40, y: 70 }
const along = (x0: number, y: number): number => VP.x + ((x0 - VP.x) * (y - VP.y)) / (112 - VP.y)

function storm(p: Painter): void {
  // storm clouds, lit from within round the knot
  p.register(SKY)
  p.dither(
    p.m().rect(0, 0, 80, VP.y),
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - CORE.x, (y - CORE.y) * 0.9) / 46)
      const cloud = noise(x, y * 1.4, 29, 11) * 0.5 + noise(x, y, 31, 5) * 0.2
      return 0.05 + glow * 0.55 + cloud * 0.45
    },
    0.5,
  )
  // the storm lit from within: a white flash behind the knot, a crown of pale rays reaching out
  const sky = p.m().rect(0, 0, 80, VP.y)
  const reach = (x: number, y: number): number => Math.hypot(x - CORE.x, (y - CORE.y) * 1.05)
  const crown = rays(p, CORE.x, CORE.y, 12, 0.02).and(sky)
  p.dither(crown, SKY.slice(1, 6), (x, y) => 1.1 - reach(x, y) / 46 + noise(x, y, 5, 4) * 0.12, 0.4)
  const flash = p.m().disc(CORE.x, CORE.y, 34).and(sky)
  p.dither(flash, SKY.slice(2), (x, y) => 1.2 - reach(x, y) / 31 + noise(x, y, 6, 4) * 0.1, 0.4)

  // a fork of lightning far behind
  const bolt = lightning(p, [12, 8], [20, 52], VOLT[2], { seed: 4, jag: 3, glow: SKY[4] })
  lightning(p, bolt[3] ?? [15, 24], [4, 40], VOLT[1], { seed: 8, jag: 2 })

  // the ground: wet gravel, the track running into the storm, the masts of the overhead line
  const ground = p.m().rect(0, VP.y, 80, 112 - VP.y)
  p.dither(
    ground,
    [SKY[0], SKY[1], CABLE[2]],
    (x, y) => ((y - VP.y) / 42) * 0.8 + noise(x, y, 7, 2) * 0.3,
    0.4,
  )
  for (let k = 0; k < 12; k++) {
    const y = VP.y + 42 / (1 + k * 0.45)
    const t = Math.max(1, Math.round(2.4 / (1 + k * 0.45)))
    p.fill(
      p.m().poly([along(14, y), y, along(66, y), y, along(66, y + t), y + t, along(14, y + t), y + t]),
      CABLE[1],
    )
  }
  for (const x0 of [22, 58]) {
    p.fill(
      p.m().poly([along(x0 - 1.5, 112), 112, along(x0 + 1.5, 112), 112, VP.x + (x0 - VP.x) * 0.02, VP.y]),
      CABLE[2],
    )
    p.fill(p.m().path([x0, 112, VP.x + (x0 - VP.x) * 0.02, VP.y]), SKY[4])
  }
  for (const [x, top, base] of [
    [6, 30, 86],
    [74, 30, 86],
    [20, 52, 76],
    [60, 52, 76],
    [30, 62, 72],
    [50, 62, 72],
  ] as const) {
    p.fill(p.m().rect(x, top, base > 80 ? 2 : 1, base - top), SKY[0])
  }
  p.fill(
    p.m().path([0, 33, 6, 32, 20, 53, 30, 62.5, 40, 68]).path([80, 33, 74, 32, 60, 53, 50, 62.5, 40, 68]),
    SKY[0],
  )

  // rain lashing down from the right
  const rand = rng(29)
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * 84)
    const y = Math.floor(rand() * 100)
    p.fill(p.m().path([x, y, x - 2, y + 4]), y > VP.y ? SKY[3] : SKY[4])
  }
}

/**
 * A cable: shaded black insulation with a glossy line along its lit side and a dark band every few
 * pixels; `hazard` cables are striped yellow and black instead. Returns its mask.
 */
function cable(d: Painter, line: Points, r0: number, r1: number, bias = 0, hazard = false): Mask {
  const curve = spline(line, 8)
  const m = d.m().limb(line, [r0, (r0 * 2 + r1) / 3, (r0 + r1 * 2) / 3, r1])
  d.part(m, CABLE, { bevel: 2, bias })
  if (hazard) {
    m.each((x, y) => {
      if (Math.floor((x + y) / 2) % 2 === 0)
        d.set(x, y, d.get(x, y) === CABLE[0] ? VOLT[0] : VOLT[bias < 0 ? 1 : 2])
    })
  }
  const shine = d
    .m()
    .path(curve.map(([x, y]) => [x - r0 * 0.35, y - r0 * 0.45] as const).flat())
    .and(m.shrunk(1))
  d.fill(shine, hazard ? VOLT[3] : CABLE[3])
  let run = 0
  for (let i = 0; i + 1 < curve.length; i++) {
    const [ax, ay] = curve[i] ?? [0, 0]
    const [bx, by] = curve[i + 1] ?? [0, 0]
    const len = Math.hypot(bx - ax, by - ay)
    run += len
    if (run < 5 || len === 0) continue
    run = 0
    const [nx, ny] = [-(by - ay) / len, (bx - ax) / len]
    d.fill(
      d
        .m()
        .line(bx - nx * 4, by - ny * 4, bx + nx * 4, by + ny * 4)
        .and(m.shrunk(1)),
      CABLE[0],
    )
  }
  return m
}

/** A signal lamp staring out of the tangle: a black housing, a glowing lens, a hood, a glint. */
function lamp(d: Painter, [x, y]: Pt, r: number, glow: readonly number[]): void {
  if (r < 2) {
    d.stamp(['.kk.', 'kllk', 'kmmk', '.kk.'], Math.round(x) - 2, Math.round(y) - 2, {
      k: OUTLINE,
      l: glow[2] ?? 0,
      m: glow[1] ?? 0,
    })
    return
  }
  d.fill(d.m().disc(x, y + 0.5, r + 1.2), OUTLINE)
  d.fill(
    d
      .m()
      .disc(x, y, r + 1.5)
      .minus(d.m().disc(x, y + 1, r + 1.2))
      .and(d.m().rect(0, 0, 80, y - r * 0.2)),
    CABLE[2],
  )
  d.fill(d.m().disc(x, y + 0.5, r), glow[1] ?? 0)
  d.fill(d.m().disc(x - r * 0.25, y + 0.25 - r * 0.25, r * 0.55), glow[2] ?? 0)
  d.px(Math.floor(x - r * 0.45), Math.floor(y - r * 0.35), VOLT[3])
}

/** The giant eye in the heart of the knot: a red lamp with a slit pupil in a heavy signal shield. */
function heart(d: Painter): void {
  const { x, y } = CORE
  const shield = d.m().ellipse(x, y, 8.5, 9.5)
  d.part(shield, VOLT, { bevel: 3 })
  d.fill(shield.facing([1, 0, 0, 1]), VOLT[0])
  d.fill(d.m().disc(x, y + 0.5, 6.4), OUTLINE)
  d.fill(d.m().disc(x, y + 0.5, 5.4), RED[1])
  d.fill(d.m().disc(x - 1, y - 0.5, 3.6), RED[2])
  d.fill(
    d
      .m()
      .rect(x - 0.5, y - 4, 1, 9)
      .rect(x - 1, y - 2, 3, 5),
    OUTLINE,
  )
  d.stamp(['ww', 'w.'], x - 4, y - 3, { w: VOLT[3] })
  // the hood over the lamp, pulled down like a brow
  d.fill(
    d.m().poly([x - 8, y - 6, x, y - 9, x + 8, y - 6, x + 6.5, y - 4.5, x, y - 6.5, x - 6.5, y - 4.5]),
    OUTLINE,
  )
}

/** The cables, back to front: [points from the knot outwards, radius at the knot, radius at the tip]. */
const BACK: readonly (readonly [Points, number, number])[] = [
  [[36, 40, 26, 30, 17, 22, 9, 21, 5, 27, 8, 31], 2.8, 1.2],
  [[46, 40, 55, 31, 64, 23, 72, 21, 75, 28], 2.8, 1.2],
  [[34, 54, 22, 60, 12, 58, 6, 51, 7, 44], 2.6, 1.1],
]
const FRONT: readonly (readonly [Points, number, number])[] = [
  [[30, 50, 18, 47, 10, 40, 11, 33], 2.8, 1.3],
  [[50, 49, 62, 46, 70, 40, 71, 33], 2.8, 1.3],
  [[33, 56, 26, 66, 18, 72, 12, 80], 3, 1.4],
  [[47, 56, 55, 65, 63, 71, 69, 80], 3, 1.4],
  [[40, 56, 42, 66, 38, 76, 40, 85], 3, 1.6],
  [[44, 39, 43, 31, 39, 26, 41, 21], 2.6, 1.3],
  [[54, 55, 66, 60, 73, 57, 75, 50], 2.4, 1.1],
]

/** Where the cables end: signal heads with one lamp, and frayed ends. */
const HEADS: readonly (readonly [number, number, 'r' | 'g'])[] = [
  [8, 31, 'g'],
  [75, 28, 'r'],
  [11, 33, 'r'],
  [71, 33, 'g'],
  [41, 21, 'r'],
]
const FRAYED: readonly Pt[] = [
  [7, 44],
  [12, 80],
  [69, 80],
  [40, 85],
  [75, 50],
]

/** The lamps staring out of the knot and along the cables. */
const EYES: readonly (readonly [number, number, number, 'r' | 'g'])[] = [
  [30, 41, 2.6, 'g'],
  [51, 41, 2.6, 'g'],
  [29, 54, 2.4, 'r'],
  [51, 54, 2.4, 'r'],
  [40, 61, 2.2, 'g'],
  [35, 35, 1, 'r'],
  [46, 34, 1, 'r'],
  [24, 47, 1, 'g'],
  [57, 47, 1, 'r'],
  [21, 32, 1, 'r'],
  [60, 28, 1, 'g'],
  [16, 50, 1, 'r'],
  [64, 51, 1, 'g'],
  [24, 64, 1, 'g'],
  [56, 64, 1, 'r'],
  [13, 41, 1, 'g'],
  [68, 40, 1, 'r'],
  [41, 72, 1, 'r'],
  [18, 71, 1, 'r'],
  [63, 70, 1, 'g'],
  [42, 29.5, 1, 'g'],
  [69, 57, 1, 'r'],
]

function knot(d: Painter): void {
  for (const [line, r0, r1] of BACK) cable(d, line, r0, r1, -1)
  // the knot itself: cables looped round and round the heart
  d.part(d.m().blob(CORE.x, CORE.y + 1, 10, 10, 30, 0.14), CABLE, { bevel: 5, bias: -1 })
  cable(d, [27, 46, 31, 36, 42, 33, 52, 38, 54, 48, 47, 58, 36, 59, 28, 52], 2.6, 2.6)
  cable(d, [52, 57, 55, 46, 49, 37, 38, 36, 29, 43, 30, 54, 38, 60], 2.2, 2.2)
  cable(d, [24, 38, 33, 31, 46, 30, 57, 35, 63, 44], 1.6, 1.4, 0, true)
  for (const [line, r0, r1] of FRONT) cable(d, line, r0, r1)
  cable(d, [17, 60, 26, 56, 34, 62, 44, 63, 55, 60, 62, 64], 1.6, 1.3, 0, true)
  for (const [x, y, c] of HEADS) {
    d.part(d.m().rect(x - 3, y - 4, 6, 8), CABLE, { bevel: 2 })
    lamp(d, [x, y - 1], 1.9, c === 'r' ? RED : GREEN)
  }
  for (const [x, y] of FRAYED) {
    d.stamp(['c.c.c', '.cbc.', '..b..'], x - 2, y - 1, { c: COPPER[1], b: COPPER[0] })
  }
  heart(d)
  for (const [x, y, r, c] of EYES) lamp(d, [x, y], r, c === 'r' ? RED : GREEN)
}

/** Lightning crackling between the cables and down to the rails, glow round the big lamps, glints. */
function crackle(p: Painter): void {
  for (const [from, to, seed] of [
    [[7, 44], [2, 60], 3],
    [[12, 80], [24, 88], 5],
    [[69, 80], [58, 88], 6],
    [[75, 50], [79, 66], 7],
    [[5, 27], [2, 17], 9],
    [[75, 28], [78, 18], 10],
  ] as const) {
    lightning(p, from, to, VOLT[2], { seed, jag: 2 })
  }
  // and across the knot itself
  for (const [from, to, seed] of [
    [[22, 44], [31, 36], 11],
    [[49, 33], [58, 41], 12],
    [[25, 58], [33, 65], 13],
    [[57, 57], [49, 66], 14],
  ] as const) {
    lightning(p, from, to, VOLT[3], { seed, jag: 1.5 })
  }
  for (const [x, y] of [
    [3, 58],
    [22, 87],
    [60, 87],
    [78, 63],
  ] as const) {
    p.stamp(['.w.', 'wyw', '.w.'], x - 1, y - 1, { w: VOLT[2], y: VOLT[3] })
  }
  // halos of red and green round the big lamps, on the storm only
  for (const [x, y, r, c] of EYES) {
    if (r < 2) continue
    p.m()
      .disc(x, y, r + 4)
      .minus(p.subjectMask)
      .each((gx, gy) => {
        if ((gx + gy) % 2 === 0) p.set(gx, gy, (c === 'r' ? RED : GREEN)[0])
      })
  }
  // the rails glint red and green under the knot
  for (const [x, y, c] of [
    [27, 86, RED[1]],
    [29, 82, GREEN[1]],
    [53, 86, GREEN[1]],
    [51, 82, RED[1]],
  ] as const) {
    p.px(x, y, c)
  }
}

export const signalstoerung: CardDef = {
  id: 'emp5-029',
  number: 29,
  name: 'Signalstörung',
  tier: 'grail',
  kind: 'monster',
  element: 'Strom',
  foil: 'art',
  draw(p) {
    storm(p)
    const d = p.layer()
    knot(d)
    p.subject(d, OUTLINE)
    crackle(p)
  },
}
