import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Fervent (Signature), the Grail of Spiritforged. Our own blade dancer at a night lantern festival:
 * barefoot on the flat of one floating sword above a mirror-still lake, eyes closed, arms opening,
 * the long sleeves of her teal festival robe falling like wings, while six floating blades hang
 * behind her in a crescent fan. Two ribbons of blossom petals spiral up round her; paper lanterns float on
 * the water. Full art, 80×112.
 *
 * Composition: she stands square to the viewer in the middle, the far shore at row 58 cuts behind
 * her waist; the fan of swords spreads from behind her back to both edges. The frame's plates cover
 * rows 0–13 (the number tag from column 35) and 90–112, so her raised hand and the blade tips stay
 * below row 14 and the sword under her feet floats at row 78.
 */
const NIGHT = colors('050c16', '0a1b2a', '10303f', '1a4a56', '2c6e6e', '4c9a8c')
const ROBE = colors('0b3c44', '17666a', '2e9a90', '7cd8c0')
const SKIN = colors('6e3a30', 'c27c62', 'eab394', 'ffe2c8')
const HAIR = colors('0c0814', '261c36', '4a3c66')
const PINK = colors('8a2856', 'e0729a', 'ffc6d8')
const STEEL = colors('34445a', '8298ae', 'cfe2ea', 'ffffff')
const GOLD = colors('6e3410', 'c8822a', 'f8cc5c', 'fff2c0')
const OUTLINE = hex('03070c')

const P = (x: number, y: number): Pt => [x, y]
const HORIZON = 58

/** Brightness of the night sky at a point, 0–1: a soft spirit glow behind the dancer. */
function skyLight(x: number, y: number): number {
  const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 40) * 0.9) / 36)
  return 0.04 + (y / HORIZON) * 0.16 + Math.pow(glow, 1.4) * 0.95 + noise(x, y, 4, 9) * 0.07
}

function night(p: Painter): void {
  // sky: dark teal, lighter round the dancer and down to the far shore
  p.shine(true)
  p.dither(p.m().rect(0, 0, 80, HORIZON), NIGHT, skyLight, 0.7)
  stars(p, rng(11), 18, [STEEL[2], PINK[2], NIGHT[4]], { x: 2, y: 2, w: 76, h: 40 })
  p.shine(false)

  // the lake mirrors the sky, a little darker with every row towards the viewer
  const lake = p.m().rect(0, HORIZON, 80, 112 - HORIZON)
  p.dither(lake, NIGHT, (x, y) => skyLight(x, 2 * HORIZON - y) * 0.85 - (y - HORIZON) * 0.006, 0.7)
  // long, faint ripples
  const rand = rng(4)
  for (let i = 0; i < 14; i++) {
    const y = HORIZON + 3 + Math.floor(rand() * 30)
    const x = Math.floor(rand() * 70)
    const w = 4 + Math.floor(rand() * (6 + (y - HORIZON) * 0.4))
    p.fill(p.m().rect(x, y, w, 1), y < 70 ? NIGHT[2] : NIGHT[3])
  }

  // far shore: low dark hills, their reflection, a few lights along the water
  const hills = p.m()
  for (let x = 0; x < 80; x++) {
    const top = HORIZON - 1.5 - noise(x, 0, 21, 11) * 5 - (x < 20 ? (20 - x) * 0.12 : 0)
    for (let y = Math.round(top); y < HORIZON; y++) hills.add(x, y)
  }
  p.fill(hills, NIGHT[0])
  p.fill(hills.facing([0, -1]), NIGHT[1])
  hills.each((x, y) => {
    const ry = 2 * HORIZON - 1 - y
    if (ry < HORIZON + 4 && (x + ry) % 2 === 0) p.set(x, ry, NIGHT[1])
  })
  p.fill(p.m().rect(0, HORIZON, 80, 1), NIGHT[2])
  // mist lying on the water along the far shore
  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [6, 57, 11, 1],
    [30, 58, 9, 2],
    [52, 57.5, 12, 3],
    [75, 58, 9, 4],
  ] as const) {
    mist.blob(x, y, rx, 1.8, seed, 0.3)
  }
  p.dither(mist, [NIGHT[1], NIGHT[2], NIGHT[3]], (x, y) => 0.55 + noise(x, y, 9, 4) * 0.4 - Math.abs(y - 57.5) * 0.12, 0.6)
  for (const x of [5, 13, 24, 57, 66, 74]) p.px(x, HORIZON - 2, GOLD[2]).px(x, HORIZON + 1, GOLD[0])
}

/** Paper lanterns floating on the lake, by depth: far (1), middle (2), near (3). */
const LANTERNS = [
  [8, 60, 1],
  [26, 60, 1],
  [58, 60, 1],
  [75, 61, 1],
  [16, 65, 2],
  [66, 66, 2],
  [53, 71, 2],
  [7, 75, 3],
  [72, 77, 3],
  [24, 82, 3],
] as const

const LANTERN: Readonly<Record<1 | 2 | 3, readonly string[]>> = {
  1: ['hg', 'kk'],
  2: ['.k.', 'ghg', 'ggg', 'kkk'],
  3: ['.kkk.', '.ghg.', '.hwh.', '.ghg.', 'kkkkk'],
}

function lanterns(p: Painter): void {
  for (const [x, y, size] of LANTERNS) {
    const grid = LANTERN[size]
    const w = grid[0]?.length ?? 1
    const left = x - Math.floor(w / 2)
    const base = y + grid.length
    // warm light on the water round the near ones, and a broken reflection below
    if (size === 3) {
      p.m()
        .ellipse(x + 0.5, base, 7, 2.2)
        .each((gx, gy) => {
          if ((gx + gy) % 2 === 0) p.set(gx, gy, GOLD[0])
        })
    }
    p.shine(true)
    for (let k = 0; k < size * 2 + 1; k++) {
      const ry = base + k
      if (k % 2 === 1) continue
      p.fill(p.m().rect(left + (k % 4 === 0 ? 0 : 1), ry, Math.max(1, w - 1 - (k > 2 ? 1 : 0)), 1), k < 2 ? GOLD[1] : GOLD[0])
    }
    p.stamp(grid, left, y, { k: HAIR[0], g: GOLD[2], h: GOLD[3], w: STEEL[3] })
    p.shine(false)
  }
}

/** A sword: gold pommel and guard, a short dark grip, a tapering steel blade with a bright edge. */
function sword(d: Painter, hilt: Pt, tip: Pt, half = 1.5): void {
  const len = Math.hypot(tip[0] - hilt[0], tip[1] - hilt[1])
  const [ux, uy] = [(tip[0] - hilt[0]) / len, (tip[1] - hilt[1]) / len]
  const [nx, ny] = [-uy, ux]
  const at = (t: number, s = 0): number[] => [hilt[0] + ux * t + nx * s, hilt[1] + uy * t + ny * s]
  const blade = d
    .m()
    .poly([...at(4.5, half), ...at(len * 0.72, half * 0.95), ...at(len, 0), ...at(len * 0.72, -half * 0.95), ...at(4.5, -half)])
  d.fill(blade, STEEL[1])
  // the edge towards the light is bright, the other dark, a fuller down the middle
  const lit = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1
  d.fill(d.m().path([...at(5, half * lit * 0.7), ...at(len - 1, 0)]).and(blade), STEEL[2])
  d.fill(d.m().path([...at(5, -half * lit * 0.7), ...at(len - 2, -half * lit * 0.2)]).and(blade), STEEL[0])
  d.px(Math.floor(at(len - 1.5)[0] ?? 0), Math.floor(at(len - 1.5)[1] ?? 0), STEEL[3])
  d.fill(d.m().limb([...at(1), ...at(3.6)], 0.9), HAIR[2])
  d.fill(d.m().path([...at(4, -2.6), ...at(4, 2.6)]), GOLD[2])
  d.fill(d.m().path([...at(4.7, -2.2), ...at(4.7, 2.2)]), GOLD[1])
  d.fill(d.m().disc(at(0)[0] ?? 0, at(0)[1] ?? 0, 1.1), GOLD[1])
}

/** The fan behind her: six floating blades like the spread feathers of two wings, roots at her back, points out. */
const CENTRE = P(40, 40)
const FAN = [
  [-166, 35],
  [-143, 35],
  [-120, 33],
  [-60, 30],
  [-37, 35],
  [-14, 35],
] as const

/** A floating blade without a hilt: a gold collar at its root, widest a third of the way, a long point. */
function blade(d: Painter, root: Pt, tip: Pt, half: number): void {
  const len = Math.hypot(tip[0] - root[0], tip[1] - root[1])
  const [ux, uy] = [(tip[0] - root[0]) / len, (tip[1] - root[1]) / len]
  const [nx, ny] = [-uy, ux]
  const at = (t: number, s = 0): number[] => [root[0] + ux * t + nx * s, root[1] + uy * t + ny * s]
  const steel = d.m().poly([...at(0, half * 0.6), ...at(len * 0.3, half), ...at(len, 0), ...at(len * 0.3, -half), ...at(0, -half * 0.6)])
  d.fill(steel, STEEL[1])
  const lit = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1
  d.fill(steel.facing().and(d.m().poly([...at(-1, 0), ...at(len + 1, 0), ...at(len + 1, lit * 4), ...at(-1, lit * 4)])), STEEL[2])
  d.fill(steel.facing().and(d.m().poly([...at(-1, 0), ...at(len + 1, 0), ...at(len + 1, -lit * 4), ...at(-1, -lit * 4)])), STEEL[0])
  d.fill(d.m().path([...at(1.5, 0), ...at(len - 2, 0)]).and(steel.shrunk(1)), STEEL[2])
  d.px(Math.floor(at(len - 2)[0] ?? 0), Math.floor(at(len - 2)[1] ?? 0), STEEL[3])
  d.fill(d.m().poly([...at(-0.6, half * 0.75), ...at(1.6, half * 0.85), ...at(1.6, -half * 0.85), ...at(-0.6, -half * 0.75)]), GOLD[1])
  d.fill(d.m().path([...at(0.4, half * 0.6), ...at(0.4, -half * 0.6)]), GOLD[2])
}

/** A thin crescent of spirit light that ties the fan together, painted on the sky behind it. */
function crescent(p: Painter): void {
  p.shine(true)
  const ring = (r: number) => p.m().ellipse(CENTRE[0], CENTRE[1], r, r * 0.96).minus(p.m().ellipse(CENTRE[0], CENTRE[1], r - 1, r * 0.96 - 1))
  // only the upper arc, from just above the left wing round to just above the right one
  const upper = p.m()
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < 80; x++) {
      const deg = (Math.atan2(y + 0.5 - CENTRE[1], x + 0.5 - CENTRE[0]) * 180) / Math.PI
      if (deg > -174 && deg < -6) upper.add(x, y)
    }
  }
  ring(24).and(upper).each((x, y) => p.set(x, y, NIGHT[5]))
  ring(25).and(upper).each((x, y) => p.set(x, y, STEEL[1]))
  ring(27).and(upper).each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, NIGHT[5])
  })
  p.shine(false)
}

function fan(d: Painter): void {
  d.shine(true)
  for (const [deg, reach] of FAN) {
    const a = (deg * Math.PI) / 180
    const [c, s] = [Math.cos(a), Math.sin(a)]
    blade(d, P(CENTRE[0] + c * 15, CENTRE[1] + s * 15), P(CENTRE[0] + c * reach, CENTRE[1] + s * reach), 2)
  }
  d.shine(false)
}

/** Closed eyes curved like a smile, a little blush, a calm mouth. */
const FACE = ['.........', '.kk...kk.', '.........', '....m....']

function dancer(d: Painter): void {
  const m = (): Mask => d.m()

  // a long skirt split in front, both halves flaring and swept to her left by the updraft
  const skirt = m()
    .poly([35.5, 45, 33, 53, 29.5, 61, 25.5, 70.5, 31, 71.5, 36.5, 71, 37.5, 62, 39, 50])
    .poly([44.5, 45, 48, 52, 52.5, 59, 58.5, 66.5, 54, 69, 48, 70, 45.5, 61, 41, 50])
  d.part(skirt, ROBE, { bevel: 4, bias: -1 })
  d.fill(m().poly([26, 70.5, 31, 71.5, 36.5, 71, 36.5, 69, 31, 69.5, 27, 68.5]).and(skirt), PINK[1])
  d.fill(m().poly([58.5, 66.5, 54, 69, 48, 70, 48, 68, 53.5, 67, 57.5, 64.5]).and(skirt), PINK[1])
  for (const line of [
    [34.5, 50, 31, 62, 29, 69],
    [45.5, 50, 50.5, 59, 54.5, 66],
  ]) {
    d.fill(m().path(line).and(skirt.shrunk(1)), ROBE[0])
  }

  // loose pink silk trousers: the standing leg straight down to bare toes on the blade, the free leg
  // bent into a figure four with its foot against the other knee
  d.part(m().limb([38.6, 71, 38.7, 74, 38.5, 77], [1.2, 1, 0.8]), SKIN, { bevel: 1.5 })
  const standing = m().limb([38.5, 50, 38.6, 60, 38.8, 70.5], [3, 2.5, 2.2])
  d.part(standing, PINK, { bevel: 5 })
  d.fill(m().rect(36.5, 70, 5, 1).and(standing), PINK[0])
  d.part(m().limb([42, 50, 48.5, 56.5], [3, 2.4]), PINK, { bevel: 5 })
  d.part(m().limb([48.5, 56.5, 44.5, 59.5, 42.5, 60.5], [2.4, 2.2, 2]), PINK, { bevel: 5 })
  d.part(m().limb([42.5, 60.5, 40.5, 61.5, 39.8, 64], [1.2, 1, 0.8]), SKIN, { bevel: 1.5 })

  // hips wrapped in the robe, the gold sash with a bow and two long fluttering ends
  d.part(m().poly([35.5, 44, 44.5, 44, 45.5, 49.5, 41.5, 51, 38.5, 51, 34.5, 49.5]), ROBE, { bevel: 3 })
  d.part(m().limb([45, 47, 48.5, 51.5, 51.5, 53, 53.5, 57.5], [1.1, 1.1, 1, 0.7]), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().limb([45, 47.5, 47, 53.5, 49, 57, 49.5, 61], [1.1, 1.1, 1, 0.7]), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().rect(35.5, 43.5, 9.5, 3), GOLD.slice(0, 3), { bevel: 1.5 })
  d.part(m().ellipse(44.5, 45.5, 2, 1.8), GOLD.slice(0, 3), { bevel: 1.5 })

  // torso in a wrap top with a crossing pink collar
  const top = m().poly([35, 34.5, 45, 34.5, 44.5, 40, 43.5, 44, 36.5, 44, 35.5, 40])
  d.part(top, ROBE, { bevel: 3 })
  d.fill(m().path([37, 34.5, 40.5, 40.5, 43, 34.5]).and(top), PINK[2])
  d.fill(m().path([38, 34.5, 40.5, 39]).and(top), PINK[1])

  // arms opening: the left curved up over her head, the right held out low; wide sleeves hang from both
  const sleeveL = m().poly([37, 34, 34.5, 28, 32, 25.5, 28.5, 30, 27.5, 38, 30, 44, 35.5, 40.5])
  const sleeveR = m().poly([43.5, 34, 50, 37, 55.5, 39.5, 58.5, 45, 56.5, 52, 51, 49, 44.5, 41])
  d.part(sleeveL, ROBE, { bevel: 3, bias: -1 })
  d.part(sleeveR, ROBE, { bevel: 3 })
  d.fill(m().poly([28.5, 30, 27.5, 38, 30, 44, 31, 42.5, 29.5, 37.5, 30, 30.5]).and(sleeveL), PINK[1])
  d.fill(m().poly([58.5, 45, 56.5, 52, 55, 51, 57, 45]).and(sleeveR), PINK[1])
  d.part(m().limb([33, 27, 32.5, 21.5, 34, 17.5], [1.6, 1.4, 1.1]), SKIN, { bevel: 1.5 })
  d.part(m().ellipse(35.5, 15.8, 1.6, 2.1, 35), SKIN, { bevel: 1.5 })
  d.part(m().limb([55, 40.5, 59.5, 42, 62.5, 42.5], [1.5, 1.3, 1]), SKIN, { bevel: 1.5 })
  d.part(m().ellipse(64, 42.5, 2.1, 1.5, 10), SKIN, { bevel: 1.5 })

  // neck, head, hair gathered in a high bun with a gold pin, a pink ribbon streaming in the wind
  d.part(m().limb([40, 30, 40, 34.5], 1.6), SKIN, { bias: -1 })
  d.part(m().limb([42, 18.5, 47, 16.5, 51.5, 18.5, 56, 16.5], [0.9, 1, 0.9, 0.6]), PINK, { bevel: 1, line: 'none' })
  const head = m().ellipse(40, 26.5, 4.6, 4.8).poly([35.6, 27, 37.5, 31.5, 40, 33, 42.5, 31.5, 44.4, 27])
  d.part(head, SKIN, { bevel: 6 })
  const hair = m()
    .ellipse(40, 23.2, 5, 2.4)
    .poly([35.1, 23, 34.8, 29, 35.8, 29.5, 36.4, 25])
    .poly([44.9, 23, 45.2, 29, 44.2, 29.5, 43.6, 25])
  d.part(hair, HAIR, { bevel: 2.5 })
  d.part(m().disc(40, 19, 2.6), HAIR, { bevel: 2 })
  d.fill(m().rect(39, 20.5, 3, 1), GOLD[2])
  d.stamp(FACE, 35.5, 26, { k: SKIN[0], m: PINK[0] })

  // the sword she balances on, floating flat under her toes
  d.shine(true)
  sword(d, P(61, 78.5), P(17, 78.5), 1.4)
  d.shine(false)
}

/** Two ribbons of petals spiral up round her; the half behind her is painted before her. */
function petals(p: Painter, front: boolean): void {
  p.shine(true)
  for (const phase of [0, Math.PI]) {
    const rand = rng(phase === 0 ? 3 : 7)
    for (let t = 0.03; t < 1; t += 0.011) {
      const a = t * Math.PI * 2 * 2.2 + phase
      if (Math.sin(a) > 0 !== front) continue
      if (rand() < 0.3) continue
      const r = 10 + t * 21
      const x = Math.round(40 + Math.cos(a) * r + (rand() - 0.5))
      const y = Math.round(82 - t * 70 + Math.sin(a) * r * 0.25)
      if (y < 15 && x > 33) continue
      if (front && p.subjectMask.has(x, y)) continue
      p.px(x, y, front ? (rand() < 0.35 ? PINK[2] : PINK[1]) : rand() < 0.5 ? PINK[1] : PINK[0])
    }
  }
  p.shine(false)
}

/** The sword's light on the water below it: two faint rings of ripples. */
function ripples(p: Painter): void {
  for (const [rx, ry, c] of [
    [13, 1.6, NIGHT[4]],
    [21, 2.6, NIGHT[3]],
  ] as const) {
    const ring = p.m().ellipse(40, 85, rx, ry).minus(p.m().ellipse(40, 85, rx - 2, ry - 0.8))
    ring.each((x, y) => {
      if ((x + y) % 2 === 0 || y === 85) p.set(x, y, c)
    })
  }
  p.fill(p.m().rect(24, 85, 32, 1), STEEL[1])
  p.fill(p.m().rect(31, 85, 18, 1), STEEL[2])
}

export const ireliaSignature: CardDef = {
  id: 'rb-sfd-087',
  number: 87,
  name: 'Irelia, Fervent (Signature)',
  tier: 'grail',
  kind: 'unit',
  element: 'Calm',
  // the sky, the swords, the petals and the lanterns shine; the dancer and the lake stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    crescent(p)
    lanterns(p)
    ripples(p)
    petals(p, false)
    const d = p.layer()
    fan(d)
    dancer(d)
    p.subject(d, OUTLINE)
    petals(p, true)
  },
}
