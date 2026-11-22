import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, lightning, noise, pts, quad, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Turtok (Ultra). Brief: armoured tortoise bracing, twin shell cannons firing water jets,
 * harbour storm waves. Full art, 80×112.
 *
 * Composition: the tortoise stands right of the centre on the quay, turned three quarters to the
 * left, head thrust forward. Both cannons fire up and to the left, so the jets widen towards the
 * top left corner (the mirror image of Glurak's torrent). Spray climbs behind the shell on the
 * right, a lighthouse holds the left. The name plate covers rows 5–15, the attack plate 88–106.
 */
const SKY = colors('0b1029', '16233f', '274a5c', '4f8482', 'a8ccb4')
const WATER = colors('1a4a94', '2c86cc', '62c2ea', 'b8ecfa', 'ffffff')
const SPRAY = WATER.slice(1)
const BLUE = colors('1b2259', '2a3c92', '3d5fc4', '5b88e2', '94bcf8')
const CREAM = colors('8f5f3a', 'cf9f5e', 'f2d08c', 'fff0be')
const SHELL = colors('40221a', '74432a', 'a56d3a', 'cf9a56')
const STEEL = colors('3d4a68', '8494b0', 'c6d2e2', 'f6f9fd')
const MOUTH = hex('7a2236')
const RED = hex('d8424a')
const OUTLINE = hex('080a1c')

const P = (x: number, y: number): Pt => [x, y]

/** Both cannons point this way; `UP` is across the barrel, towards the light. */
const DIR = P(-0.882, -0.471)
const UP = P(0.471, -0.882)
/** A point `t` pixels down the barrel from `from` and `off` pixels across it. */
const along = (from: Pt, t: number, off = 0): Pt => [
  from[0] + DIR[0] * t + UP[0] * off,
  from[1] + DIR[1] * t + UP[1] * off,
]

interface Gun {
  /** Where the barrel leaves the shell. */
  base: Pt
  /** Barrel radius. */
  r: number
  /** Visible length of the jet. */
  reach: number
  /** Jet radius at the muzzle and at the end of its reach. */
  jet: readonly [number, number]
  bias: number
}
const BARREL = 14.5
const NEAR: Gun = { base: P(60, 33), r: 5, reach: 54, jet: [3.4, 7.8], bias: 0 }
const FAR: Gun = { base: P(31, 30), r: 4, reach: 28, jet: [2.7, 5.4], bias: -1 }
const muzzle = (g: Gun): Pt => along(g.base, BARREL)

function harbour(p: Painter): void {
  // storm front: heavy clouds above a band of pale light at the horizon
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const cloud = noise(x * 0.6, y * 1.5, 5, 11) * 0.34 + noise(x, y * 1.7, 9, 5) * 0.1
      const flash = Math.max(0, 1 - Math.hypot(x - 70, y - 25) / 15) * 0.4
      return cloud + flash + Math.pow(Math.max(0, 1 - Math.abs(y - 60) / 36), 1.4) * 0.78
    },
    0.8,
  )
  const bolt = lightning(p, P(73, 12), P(66, 37), WATER[4], { seed: 6, jag: 2.5, glow: SKY[4] })
  lightning(p, bolt[3] ?? P(70, 24), P(77, 32), WATER[4], { seed: 2, jag: 1.5 })
  const rand = rng(21)
  for (let i = 0; i < 16; i++) {
    const x = 5 + Math.floor(rand() * 70)
    const y = 17 + Math.floor(rand() * 34)
    p.px(x, y, SKY[3]).px(x - 1, y + 1, SKY[3])
  }

  // sea: dark swell that lightens towards the horizon, a few crests
  p.dither(
    p.m().rect(0, 63, 80, 25),
    [SKY[3], SKY[2], SKY[1]],
    (x, y) => (y - 62) / 20 + 0.3 * Math.sin(x * 0.55 + y * 0.9),
    0.5,
  )
  for (const [x, y] of pts([1, 66, 12, 68, 3, 72, 14, 75, 70, 67, 64, 71]))
    p.fill(p.m().rect(x, y, 6 + (y % 3), 1), WATER[3])
  p.shine(false)

  // breakwater with a lighthouse, far left
  p.fill(p.m().poly([0, 61, 5, 60, 13, 61, 20, 63.5, 0, 64.5]), SKY[0])
  const tower = p.m().poly([4.2, 61, 5, 45, 8.6, 45, 9.4, 61])
  p.fill(tower, STEEL[2])
  p.fill(tower.clone().and(p.m().rect(0, 48, 14, 3).rect(0, 55, 14, 3)), RED)
  p.fill(tower.facing([1, 0]), STEEL[0])
  p.fill(p.m().rect(4, 43, 6, 2), SKY[0])
  p.fill(p.m().rect(5, 40, 4, 3), CREAM[3])
  p.fill(p.m().rect(5, 38, 4, 2).rect(6, 37, 2, 1), RED)
  for (const [x, y] of pts([3, 41, 10, 41, 11, 41, 2, 41])) p.px(x, y, x % 9 < 3 ? CREAM[2] : CREAM[3])

  // breakers bursting over the quay: every lump is x, y, rx, ry, from back to front
  p.shine(true)
  const plume = (lumps: readonly number[], seed: number, bias: number) => {
    for (let i = 0; i + 3 < lumps.length; i += 4) {
      const lump = p
        .m()
        .blob(lumps[i] ?? 0, lumps[i + 1] ?? 0, lumps[i + 2] ?? 0, lumps[i + 3] ?? 0, seed + i, 0.2)
      p.part(lump, SPRAY, { bevel: 3.5, line: 'shadow', bias })
    }
  }
  // the right one shows only its shadow side past the shell, so it is painted a step lighter
  plume([76, 79, 8, 8, 70, 68, 7, 8, 76, 59, 7, 8, 73, 50, 6, 7, 76, 42, 5, 6, 71, 38, 4, 4.5], 3, 1)
  plume([3, 81, 8, 7, 13, 84, 6, 5, 2, 71, 5, 6, 9, 75, 5, 5], 9, 0)
  for (const [x, y] of pts([69, 40, 73, 34, 78, 33, 66, 44, 11, 68, 5, 64, 15, 71, 18, 78]))
    p.px(x, y, (x + y) % 2 === 0 ? WATER[3] : WATER[4])
  p.shine(false)

  // quay: wet stone, a mooring bollard
  const quay = p.m().poly([0, 87, 30, 86, 80, 87, 80, 112, 0, 112])
  p.fill(quay, SKY[0])
  p.edge(quay, SKY[2], [0, -1])
  for (const [x, y] of pts([6, 96, 30, 96, 54, 96, 18, 106, 42, 106, 66, 106]))
    p.fill(
      p
        .m()
        .rect(x, y - 9, 1, 9)
        .rect(x - 12, y, 24, 1),
      SKY[1],
    )
  for (const [x, y] of pts([36, 87, 40, 88, 62, 88, 14, 88])) p.fill(p.m().rect(x, y, 5, 1), STEEL[1])
  p.fill(p.m().rect(8, 79, 6, 2).rect(9, 81, 4, 6).rect(7, 86, 8, 1), SKY[0])
  p.fill(p.m().rect(8, 79, 5, 1).rect(9, 81, 1, 5), SKY[3])
}

/** A steel barrel leaving the shell through a raised port, with a reinforced muzzle. */
function cannon(d: Painter, g: Gun): void {
  const tip = muzzle(g)
  const bar = (from: number, to: number, r: number): Mask =>
    d.m().poly([along(g.base, from, r), along(g.base, to, r), along(g.base, to, -r), along(g.base, from, -r)])
  d.part(d.m().disc(g.base[0], g.base[1], g.r + 2), SHELL, { bias: g.bias, bevel: 3 })
  d.part(bar(0, BARREL, g.r), STEEL, { bias: g.bias, bevel: g.r })
  d.part(bar(BARREL - 3.5, BARREL, g.r + 1), STEEL, { bias: g.bias, bevel: 2 })
  d.fill(d.m().ellipse(tip[0] + 0.4, tip[1] + 0.2, g.r * 0.5, g.r * 0.85, 28), OUTLINE)
}

/** A white claw: a small spike from (x, y) in the direction (dx, dy). */
function claw(d: Painter, x: number, y: number, dx: number, dy: number, len = 3.6): void {
  const spike = d
    .m()
    .poly([x - dy * 1.3, y + dx * 1.3, x + dx * len, y + dy * len, x + dy * 1.3, y - dx * 1.3])
  d.fill(spike, STEEL[3])
  d.fill(spike.facing([1, 0, 0, 1]).and(spike.moved(-1, -1)), STEEL[1])
}

const EYE = ['....kkkk', '..kkwwwk', 'kkpiiwwk', '.kppiwwk', '..kkkkk.']
/** Outline of the skull, from the tip of the muzzle over the brow and round the cheek. */
const SKULL = [
  15, 39, 18, 36.2, 22, 34.5, 25, 31.8, 30, 29.5, 35, 29.5, 39.5, 32, 42, 37, 41.5, 43, 38, 48, 33, 49.5, 29,
  47, 24, 46, 19, 44.5, 15.5, 43, 14.2, 41, 15, 39,
]
const JAW = [33, 48.5, 27, 49.5, 21, 50, 16.5, 49, 15.5, 51, 18, 54, 24, 55.5, 30, 54, 35, 51, 33, 48.5]

function tortoise(d: Painter, jets: Mask): void {
  const m = (): Mask => d.m()

  // behind everything: far cannon and the stubby tail
  cannon(d, FAR)
  d.part(m().limb([64, 78, 71, 81, 75.5, 76], [4.6, 3.6, 2]), BLUE, { bias: -1 })

  // shell: a brown dome on the back, scutes hinted along its edge
  const shell = m().ellipse(51, 59.5, 21.5, 23, -8)
  d.part(shell, SHELL, { bevel: 11 })
  d.fill(
    shell
      .shrunk(5)
      .facing([1, 0, 0, -1])
      .and(m().rect(56, 36, 20, 44)),
    SHELL[1],
  )
  for (const seam of [
    [64, 43, 68, 40],
    [68.5, 54, 73, 53],
    [68, 68, 72, 70],
  ])
    d.fill(m().path(seam).and(shell.shrunk(1)), SHELL[1])
  cannon(d, NEAR)

  // far leg and far arm, reaching forward to brace
  d.part(m().limb([33, 73, 28, 79, 27, 83.5], [6.5, 6, 5.5]), BLUE, { bias: -1 })
  d.part(m().ellipse(23.5, 84.8, 8, 3.2), BLUE, { bias: -1, bevel: 3 })
  for (const x of [16.5, 20.5, 24.5]) claw(d, x, 86.2, -0.95, 0.3, 3)
  d.part(m().limb([28, 63, 19.5, 68, 13, 65.5], [5, 4.6, 4.8]), BLUE, { bias: -1 })
  claw(d, 9.5, 62.5, -0.8, -0.6)
  claw(d, 8.5, 66, -1, 0.1)
  claw(d, 9.5, 69.5, -0.75, 0.65)

  // belly plate inside the white rim of the shell
  const plate = m().ellipse(41.5, 64, 16, 18.5, -6)
  d.part(plate.grown(2), STEEL, { bevel: 2.5 })
  d.shade(plate, CREAM, { bevel: 10 })
  for (const y of [54, 62, 70, 77]) {
    d.fill(
      m()
        .path(quad(P(24, y + 1.5), P(39, y - 2.5), P(59, y + 1)))
        .and(plate),
      CREAM[1],
    )
  }
  d.fill(
    m()
      .path(quad(P(38.5, 46), P(35.5, 64), P(40.5, 83)))
      .and(plate),
    CREAM[1],
  )

  // near leg, planted wide
  d.part(m().limb([54, 71, 59.5, 77.5, 59.5, 83.5], [8, 7.5, 6.3]), BLUE)
  d.part(m().ellipse(56, 84.8, 9.5, 3.4), BLUE, { bevel: 3 })
  for (const x of [48, 52.5, 57]) claw(d, x, 86.2, -0.95, 0.3, 3.4)

  // neck and ears
  d.part(m().limb([41, 52, 37, 46], 7), BLUE)
  d.part(m().poly([29.5, 31, 31, 27, 34, 30.5]), BLUE, { bias: -1, bevel: 2 })
  const ear = m().poly([34, 32, 38.5, 27.5, 41, 35])
  d.part(ear, BLUE, { bevel: 2 })
  d.fill(ear.shrunk(1).and(ear.moved(1, 1)), BLUE[0])

  // head thrust forward, jaws open: the mouth first, then the cream lower jaw and the skull over it
  const mouth = m().poly([15, 41, 30, 44, 33, 48.5, 27, 51, 16.5, 51])
  d.contact(mouth).fill(mouth, MOUTH)
  d.fill(m().ellipse(22.5, 49, 5, 1.8, -5).and(mouth), RED)
  d.part(m().poly(spline(JAW, 5)), CREAM, { bevel: 2.5 })
  d.part(m().poly(spline(SKULL, 5)), BLUE)
  d.stamp(EYE, 21, 36, { k: BLUE[0], w: STEEL[3], p: OUTLINE, i: SHELL[2] })
  d.px(16, 40, BLUE[0])

  // near arm out of its white-rimmed port, the fist clenched in front of the belly
  d.part(m().ellipse(57.5, 54.5, 6.4, 7), STEEL, { bevel: 2.5 })
  d.part(m().limb([58, 54.5, 66, 61.5, 59.5, 68], [5.6, 5.6, 6.4]), BLUE)
  claw(d, 53.5, 66, -1, -0.2)
  claw(d, 52.8, 69.5, -1, 0.1)
  claw(d, 54.5, 72.8, -0.9, 0.45)

  // the jets light what is close to them, the lightning the right-hand rim
  d.tone(d.mask().and(jets.grown(3)), 1)
  d.tone(
    d
      .mask()
      .facing([1, 0])
      .and(m().rect(58, 36, 22, 40)),
    1,
  )
}

/** One layer of a jet; inner layers are thinner and sit towards the light. */
function jetLayer(p: Painter, g: Gun, scale: number, phase: number): Mask {
  const stops = [-0.03, 0.25, 0.5, 0.75, 1]
  const radius = (s: number) => g.jet[0] + (g.jet[1] - g.jet[0]) * Math.max(0, s)
  return p.m().limb(
    stops.map((s) => along(muzzle(g), s * g.reach, radius(s) * (1 - scale) * 0.4)),
    stops.map((s, i) => radius(s) * scale * (1 + 0.09 * Math.sin(i * 2.3 + phase))),
  )
}

function jet(p: Painter, g: Gun, seed: number): void {
  const outer = jetLayer(p, g, 1, seed)
  // mist on the storm air around the jet
  outer
    .grown(3)
    .minus(p.subjectMask)
    .each((x, y) => {
      if ((x + y) % 2 === 0) p.set(x, y, WATER[0])
    })
  p.fill(outer.grown(1), WATER[0])
  p.fill(outer, WATER[1])
  p.fill(jetLayer(p, g, 0.76, seed + 1.3), WATER[2])
  p.fill(jetLayer(p, g, 0.5, seed + 2.6), WATER[3])
  p.fill(jetLayer(p, g, 0.22, seed + 3.9), WATER[4])
  // froth torn off the edges, and a burst of foam around the muzzle
  const rand = rng(seed)
  for (let t = 5; t < g.reach; t += 4 + rand() * 2) {
    const r = g.jet[0] + ((g.jet[1] - g.jet[0]) * t) / g.reach
    const side = rand() < 0.5 ? 1 : -1
    const [x, y] = along(muzzle(g), t, side * (r + 0.4))
    p.fill(p.m().disc(x, y, 1.2 + rand() * 0.9), side > 0 ? WATER[3] : WATER[2])
    const [sx, sy] = along(muzzle(g), t + 2, -side * (r + 2.5 + rand() * 2))
    p.px(Math.round(sx), Math.round(sy), WATER[3])
  }
  for (const off of [-1, 0, 1]) {
    const [x, y] = along(muzzle(g), 1.5 - Math.abs(off), off * (g.jet[0] + 1))
    p.fill(p.m().disc(x, y, 1.7), off > 0 ? WATER[4] : WATER[3])
  }
}

export const turtok: CardDef = {
  id: 'pkm-base-088',
  number: 88,
  name: 'Turtok',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Wasser',
  hp: 100,
  attacks: [{ name: 'Hydropumpe', cost: ['Wasser', 'Wasser', 'Wasser'], damage: '40+' }],
  // sky, sea, spray and the jets shine; tortoise, lighthouse and quay stay matt
  foil: 'painted',
  draw(p) {
    harbour(p)
    const d = p.layer()
    tortoise(d, jetLayer(p, NEAR, 1, 2).or(jetLayer(p, FAR, 1, 5)))
    p.subject(d, OUTLINE)
    p.shine(true)
    jet(p, FAR, 5)
    jet(p, NEAR, 2)
    p.shine(false)
  },
}
