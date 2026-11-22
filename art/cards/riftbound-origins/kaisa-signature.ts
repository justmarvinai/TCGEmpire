import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, distanceField, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Daughter of the Void (Signature), Ultra. Our own void huntress: a living chitin armour of black
 * indigo, a horned helm with glowing eye slits, two pairs of wings cut from torn space and a crystal
 * spear. She hovers out of a rift in the sky while a swarm of crystal needles fans out round her.
 * Full art, 80×112.
 *
 * Composition: square to the viewer and nearly symmetric — the rift is a tall tear behind her, the
 * wings fill the four corners, the spear crosses the picture from the lower left to the upper right.
 * The frame's plates cover rows 0–14 and 90–112, so the helm sits at rows 16–33.
 */
const SPACE = colors('05040f', '0e0a22', '1c1238', '2e1a4e')
const RIFT = colors('4a1458', '7a1e78', 'b0389a', 'ff6ab0')
const GLOW = colors('0c4a56', '13848a', '3cc8b8', 'a8fff0', 'ffffff')
const CHITIN = colors('0c0a1c', '1e1c3c', '363466', '5a5896', '8e8ad0')
const OUTLINE = hex('020108')

const P = (x: number, y: number): Pt => [x, y]

/** Mirror x round the middle of the picture. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

/** The tear in the sky: a tall, jagged slit, wider in the middle. */
function riftShape(p: Painter): Mask {
  const rand = rng(31)
  const left: number[] = []
  const right: number[] = []
  for (let y = 4; y <= 102; y += 3) {
    const t = (y - 4) / 98
    const w = Math.sin(t * Math.PI) * 23 + 1
    left.push(40 - w - rand() * 3, y)
    right.unshift(40 + w + rand() * 3, y)
  }
  return p.m().poly([...left, ...right])
}

function space(p: Painter, rift: Mask): void {
  p.shine(true)
  p.dither(null, SPACE, (x, y) => 0.15 + noise(x, y, 7, 14) * 0.55 + noise(x, y, 3, 5) * 0.15, 0.7)
  stars(p, rng(3), 30, [CHITIN[4], GLOW[3], RIFT[3]], { x: 0, y: 0, w: 80, h: 112 })

  // inside the rift: a deeper, warmer sky full of stars, rimmed with light
  const dist = distanceField(rift)
  p.dither(rift, [SPACE[0], RIFT[0], RIFT[1], RIFT[2]], (x, y) => 0.85 - (dist[y * p.w + x] ?? 0) / 14, 0.8)
  stars(p, rng(8), 30, [GLOW[4], RIFT[3], GLOW[3]], { x: 16, y: 8, w: 48, h: 92 })
  p.fill(rift.facing(), GLOW[3])
  p.fill(rift.outerEdge(), GLOW[1])
  rift
    .grown(3)
    .minus(rift.grown(1))
    .each((x, y) => {
      if (bayer(x, y) < 0.4) p.set(x, y, GLOW[0])
    })
  p.shine(false)
}

interface Wing {
  root: Pt
  tip: Pt
  width: number
}

const WINGS: readonly Wing[] = [
  { root: P(35, 37), tip: P(5, 15), width: 6.5 },
  { root: P(36, 44), tip: P(6, 58), width: 5 },
]

/** A wing of torn space: a long blade of starry membrane with glowing veins and edge. */
function wing(d: Painter, w: Wing, s: number): void {
  const x = side(s)
  const [rx, ry] = [x(w.root[0]), w.root[1]]
  const [tx, ty] = [x(w.tip[0]), w.tip[1]]
  const len = Math.hypot(tx - rx, ty - ry)
  const [nx, ny] = [-(ty - ry) / len, (tx - rx) / len]
  const at = (k: number, off: number): number[] => [rx + (tx - rx) * k + nx * off, ry + (ty - ry) * k + ny * off]
  const blade = d.m().poly([
    ...at(0, 0),
    ...at(0.25, w.width * 0.9),
    ...at(0.6, w.width),
    ...at(0.88, w.width * 0.55),
    ...at(1, 0),
    ...at(0.8, -w.width * 0.45),
    ...at(0.45, -w.width * 0.6),
    ...at(0.15, -w.width * 0.4),
  ])
  d.dither(blade, [SPACE[1], SPACE[3], GLOW[0]], (px, py) => 0.3 + noise(px, py, 5, 4) * 0.6, 0.6)
  d.fill(blade.facing(), GLOW[2])
  for (const off of [0.45, -0.2]) {
    d.fill(d.m().path([at(0.05, 0), at(0.5, w.width * off), at(0.95, w.width * off * 0.3)].flat()).and(blade), GLOW[1])
  }
  d.fill(d.m().path([at(0, 0), at(1, 0)].flat()).and(blade), GLOW[2])
}

/** Helm visor: dark glass with two glowing slits slanting up to the sides. */
const VISOR = ['kk......kk', 'wggk..kggw', 'kkggkkggkk', '.kkkkkkkk.']

function huntress(d: Painter): void {
  const m = (): Mask => d.m()

  // wings behind everything, membrane and veins shine
  d.shine(true)
  for (const w of WINGS) for (const s of [1, -1]) wing(d, w, s)
  d.shine(false)
  const wings = d.mask()

  // legs hanging as she hovers: one straight, one drawn up; long greaves ending in points
  d.part(m().limb([36.5, 55, 34.5, 67, 35, 79, 35.5, 86], [3.6, 3, 2.4, 0.8]), CHITIN, { bevel: 3 })
  d.part(m().limb([43.5, 55, 50, 61.5, 46.5, 71, 47.5, 78], [3.6, 3, 2.4, 0.8]), CHITIN, { bias: -1, bevel: 3 })
  for (const [x, y] of [
    [34, 67],
    [49.5, 61.5],
  ] as const) {
    d.part(m().ellipse(x, y, 2.8, 2.4), CHITIN, { bevel: 2 })
  }
  d.fill(m().path([33, 72, 36.5, 72]).path([33.5, 76, 36.5, 76]).path([45, 68, 48.5, 68]), CHITIN[1])

  // abdomen in rings, a narrow waist
  for (const y of [48, 51, 54]) d.part(m().ellipse(40, y, 5.5 - (y - 48) * 0.1, 1.9), CHITIN, { bevel: 2 })

  // chest plate with the glowing core
  const chest = m().poly([33, 35, 47, 35, 46.5, 42, 43, 47, 37, 47, 33.5, 42])
  d.part(chest, CHITIN, { bevel: 4 })
  d.fill(m().path([35, 41, 40, 45, 45, 41]).and(chest.shrunk(1)), CHITIN[1])
  d.shine(true)
  d.stamp(['.w.', 'wgw', 'ggg', '.g.'], 39, 38, { w: GLOW[4], g: GLOW[2] })
  d.shine(false)

  // arms bracing the spear across the body
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().ellipse(x(31), 37.5, 4, 3.6), CHITIN, { bevel: 3 })
    d.part(m().poly([x(28), 36, x(26), 31, x(31), 34.5]), CHITIN, { bevel: 1.5 })
  }
  d.part(m().limb([31, 38, 27, 46.5, 30, 54.5], [2.7, 2.4, 2.2]), CHITIN)
  d.part(m().limb([49, 38, 54, 43.5, 51, 46], [2.7, 2.4, 2.2]), CHITIN)

  // the spear: a dark shaft, a crystal blade at the lower end, a small crystal at the upper end
  const a = P(30, 56)
  const b = P(51, 45)
  const dx = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1])
  const dy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1])
  const on = (t: number): Pt => [a[0] + dx * t, a[1] + dy * t]
  const [s0, s1] = [on(-14), on(42)]
  d.shine(true)
  const shaft = m().limb([...s0, ...s1], 1.1)
  d.contact(shaft)
  d.fill(shaft, GLOW[1])
  d.fill(shaft.facing([0, -1]), GLOW[3])
  const tip = on(-27)
  const blade = m().poly([...on(-13), ...on(-15.5).map((v, i) => v + (i === 0 ? -dy : dx) * 2.6), ...tip, ...on(-15.5).map((v, i) => v + (i === 0 ? dy : -dx) * 2.6)])
  d.fill(blade, GLOW[2])
  d.fill(blade.facing([1, 0, 0, 1]), GLOW[1])
  d.fill(m().path([...on(-14), ...on(-24)]).and(blade), GLOW[4])
  d.part(m().disc(...on(44), 1.8), GLOW.slice(1), { bevel: 1.5 })
  d.shine(false)

  // hands gripping the shaft
  d.part(m().disc(30, 56, 2.2).disc(51, 45, 2.2), CHITIN, { bevel: 1.5 })

  // neck and the horned helm
  d.part(m().limb([40, 32, 40, 35.5], 2.2), CHITIN, { bias: -1 })
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(37.5), 23.5, x(34), 18, x(31), 15.5], [1.8, 1.2, 0.6]), CHITIN, { bevel: 1.5 })
  }
  const helm = m().ellipse(40, 27, 4.6, 5.6).poly([36, 28, 37.5, 33, 40, 34.5, 42.5, 33, 44, 28])
  d.part(helm, CHITIN, { bevel: 4 })
  d.shine(true)
  d.stamp(VISOR, 35, 26, { k: CHITIN[0], g: GLOW[2], w: GLOW[4] })
  d.shine(false)

  // the rift behind her lights the outer rims of the armour
  const body = d.mask().minus(wings)
  d.fill(body.facing([-1, 0, 1, 0, 0, -1]).minus(body.facing([0, 1])), GLOW[1])
}

/** Crystal needles fanning out from her like a swarm, each with a faint trail. */
function needles(p: Painter): void {
  p.shine(true)
  for (let i = 0; i < 11; i++) {
    const a = ((8 + i * 16.4) * Math.PI) / 180
    const r = 30 + (i % 2) * 6
    const cx = 40 + Math.cos(a) * r
    const cy = 50 + Math.sin(a) * r * 0.95
    const [ux, uy] = [Math.cos(a), Math.sin(a) * 0.95]
    const needle = p.m().line(cx - ux * 4, cy - uy * 4, cx + ux * 3, cy + uy * 3)
    const trail = p.m().line(cx - ux * 10, cy - uy * 10, cx - ux * 5, cy - uy * 5)
    p.fill(trail.minus(p.subjectMask), GLOW[0])
    p.fill(needle.grown(1).minus(p.subjectMask).minus(trail), GLOW[1])
    p.fill(needle.minus(p.subjectMask), GLOW[3])
    p.px(Math.round(cx + ux * 3), Math.round(cy + uy * 3), GLOW[4])
  }
  p.shine(false)
}

export const kaisaSignature: CardDef = {
  id: 'rb-ogn-088',
  number: 88,
  name: 'Kai\'Sa, Daughter of the Void (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { tag: 'Legende' },
  // space, the rift, the wings, the needles and every glowing crystal shine; the chitin stays matt
  foil: 'painted',
  draw(p) {
    const rift = riftShape(p)
    space(p, rift)
    const d = p.layer()
    huntress(d)
    p.subject(d, OUTLINE)
    needles(p)
  },
}
