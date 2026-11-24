import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, quad, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Mondkaiserin (Grail, Spuk). Brief: a ghostly empress moth with huge pale wings patterned like a full
 * moon and a tiara of stars, floating over a misty lake at night; violet and silver. Full art, 80×112.
 *
 * Composition: the moth hovers square to the viewer over the middle of the lake, wings spread across
 * the whole card. Each forewing carries a full moon, each hindwing a crescent and a long trailing tail
 * like the train of a gown. There is no moon in the sky: she is it. Her light lies on the water below
 * her in broken silver strokes, mist drifts over the lake. The plates cover rows 4–14 and 91–106.
 */
const SKY = colors('08051a', '120a2c', '1c1042', '2a185a', '3e2878')
const WING = colors('4a3c7c', '7a6aaa', 'b2a6d8', 'e2dcf8', 'ffffff')
const VIOLET = colors('3a1a6a', '6a34b0', 'a46ee8')
const GOLD = colors('b8862a', 'f4d270', 'fff6d0')
const WATER = colors('05030e', '0c0820', '161034')
const MIST = colors('2e2458', '4c3e80')
const EYE = hex('1a0a34')
const OUTLINE = hex('0a0518')

function night(p: Painter): void {
  // violet night sky, lightest behind the moth
  p.dither(
    null,
    SKY,
    (x, y) => 0.12 + Math.max(0, 1 - Math.hypot(x - 40, (y - 42) * 0.9) / 46) * 0.8 + (noise(x, y, 6, 9) - 0.5) * 0.1,
    0.75,
  )
  stars(p, rng(12), 30, [WING[3], WING[2], GOLD[2]], { x: 3, y: 15, w: 74, h: 48 })

  // far shore: low wooded hills on the horizon
  const shore = p.m()
  for (let x = 0; x < 80; x++) {
    const hills = Math.max(0, 6 - Math.abs(x - 12) * 0.5) + Math.max(0, 4 - Math.abs(x - 66) * 0.4)
    const top = 64 - Math.round(noise(x, 0, 4, 5) * 4 + hills)
    shore.rect(x, top, 1, 70 - top)
  }
  p.fill(shore, SKY[0])

  // the lake: dark water, the moth's light lying on it in broken silver strokes
  p.dither(p.m().rect(0, 68, 80, 44), [WATER[2], WATER[1], WATER[0]], (_x, y) => (y - 68) / 30, 0.6)
  p.fill(p.m().rect(0, 68, 80, 1), MIST[0])
  const rand = rng(5)
  for (let y = 70; y < 96; y += 1 + Math.floor(rand() * 2)) {
    const spread = 5 + (y - 70) * 0.5
    const x = 40 + (rand() - 0.5) * spread * 2
    const w = 1 + Math.floor(rand() * (y < 80 ? 5 : 3))
    p.fill(p.m().rect(Math.round(x - w / 2), y, w, 1), rand() < 0.5 ? WING[2] : WING[1])
  }
}

/** Mist drifting over the water: soft dithered banks. */
function mist(p: Painter, rows: readonly (readonly number[])[]): void {
  for (const [y, x0, x1, seed] of rows) {
    const cx = ((x0 ?? 0) + (x1 ?? 0)) / 2
    const rx = ((x1 ?? 0) - (x0 ?? 0)) / 2
    const bank = p.m().blob(cx, y ?? 0, rx, 2.6, seed ?? 1, 0.3)
    bank.each((x, by) => {
      const t = (1 - Math.abs(x - cx) / rx) * 0.8 + noise(x, by, seed ?? 1, 3) * 0.5 - 0.25
      if (t > bayer(x, by) + 0.3) p.set(x, by, MIST[1])
      else if (t > bayer(x, by) * 0.6) p.set(x, by, MIST[0])
    })
  }
}

/** One side of the moth, `s` = −1 left, 1 right. */
function wings(d: Painter, s: number): void {
  const X = (v: number, y: number): Pt => [40 + v * s, y]
  const flat = (...pts: Pt[]): number[] => pts.flatMap(([x, y]) => [x, y])

  // hindwing with its long tail, behind the forewing
  const hind = d.m().poly(
    flat(
      ...[X(2, 44), X(14, 44), X(27, 48), X(31, 55), ...quad(X(29, 61), X(24, 66), X(20, 72), 5)],
      ...[X(21, 80), X(24, 85.5), X(20, 87), X(15, 82), X(12, 72), X(6, 62), X(2, 56)],
    ),
  )
  d.part(hind, WING, { bevel: 5, bias: -1 })
  // a violet border and a crescent moon on the hindwing
  d.fill(hind.clone().minus(hind.shrunk(1)).and(d.m().rect(0, 50, 80, 40)), VIOLET[1])
  const [cx, cy] = X(17, 57)
  const crescent = d.m().disc(cx, cy, 4.5).minus(d.m().disc(cx + 2.2 * s, cy - 1.5, 4))
  d.fill(crescent.and(hind), WING[4])

  // forewing: a broad sail from the shoulder to a hooked tip
  const fore = d.m().poly(
    flat(
      ...[X(3, 37), X(10, 29), X(22, 21), X(33, 17), X(37, 18.5), X(37.5, 23)],
      ...[...quad(X(37, 30), X(35, 40), X(27, 46), 6), X(16, 47.5), X(6, 46), X(2, 42)],
    ),
  )
  d.part(fore, WING, { bevel: 7 })
  // veins fanning out from the shoulder
  for (const [vx, vy] of [
    [30, 20],
    [35, 30],
    [26, 44],
  ] as const)
    d.fill(d.m().path([...X(4, 39), ...X(vx, vy)]).and(fore.shrunk(1)), WING[1])
  // a scalloped violet margin round the outer edge
  const margin = fore.clone().minus(fore.shrunk(2)).minus(d.m().poly(flat(X(0, 30), X(14, 25), X(14, 50), X(0, 50))))
  d.fill(margin, VIOLET[1])
  d.fill(fore.clone().minus(fore.shrunk(1)).and(margin), VIOLET[0])
  // little gold pearls along the margin
  for (const [px, py] of [X(30, 19.5), X(35, 24), X(35.5, 31.5), X(32, 38.5), X(26, 43.5)])
    d.px(Math.round(px), Math.round(py), GOLD[1])
  d.tone(fore.clone().and(d.m().poly(flat(X(0, 34), X(10, 26), X(12, 50), X(0, 50)))), -1)
  d.tone(hind.clone().and(d.m().poly(flat(X(0, 44), X(9, 44), X(7, 62), X(0, 62)))), -1)

  // the full moon: a silver disc ringed in violet, with grey seas on it
  const [mx, my] = X(23, 32)
  const moon = d.m().disc(mx, my, 7)
  d.fill(d.m().disc(mx, my, 8.2).and(fore), VIOLET[2])
  d.shade(moon, [WING[2], WING[3], WING[4]], { bevel: 5 })
  for (const [sx, sy, r] of [
    [-2.5, -2, 2.2],
    [2, 1.5, 1.8],
    [-1, 3.5, 1.3],
  ] as const)
    d.fill(d.m().ellipse(mx + sx * s, my + sy, r, r * 0.8).and(moon), WING[2])
}

function body(d: Painter): void {
  const m = (): Mask => d.m()
  // feathered antennae sweeping out
  for (const s of [-1, 1]) {
    const stalk = m().limb([40 + s * 2, 29, 40 + s * 5, 23, 40 + s * 10, 19, 40 + s * 16, 18.5], [0.7, 0.7, 0.6, 0.5])
    for (const [x, y] of [
      [5.5, 23.5],
      [8, 20.5],
      [11, 19],
      [14, 18.5],
    ] as const)
      stalk.path([40 + s * x, y, 40 + s * (x + 2), y - 2])
    d.part(stalk, WING, { bevel: 1, line: 'none', bias: -1 })
  }
  // abdomen in soft rings, thorax in a fur collar, the head
  const abdomen = m().ellipse(40, 54, 3.6, 10)
  d.part(abdomen, WING, { bevel: 3 })
  for (const y of [49, 53, 57, 61]) d.fill(m().rect(36, y, 8, 1).and(abdomen.shrunk(1)), WING[1])
  d.part(m().ellipse(40, 39.5, 5.5, 6.5), WING, { bevel: 4 })
  const collar = m().ellipse(40, 34.5, 6.5, 3)
  for (const s of [-1, 1]) collar.poly([40 + s * 3, 35, 40 + s * 8, 37, 40 + s * 4, 37.5])
  d.part(collar, WING, { bevel: 2, bias: 1 })
  d.part(m().ellipse(40, 30.5, 4, 3.5), WING, { bevel: 3 })
  // large eyes glowing with a pale violet light
  d.stamp(['kk....kk', 'kvw..wvk', '.kv..vk.'], 36, 29, { k: EYE, v: VIOLET[2], w: WING[4] })
}

/** A tiara of stars over the head: five little stars on an arc, the middle one the largest. */
function tiara(p: Painter): void {
  const small = ['.g.', 'gwg', '.g.']
  const big = ['..g..', '.gwg.', 'gwwwg', '.gwg.', '..g..']
  for (const [x, y] of [
    [33, 25],
    [36, 22.5],
    [42, 22.5],
    [45, 25],
  ] as const)
    p.stamp(small, x, y, { g: GOLD[1], w: GOLD[2] })
  p.stamp(big, 38, 19, { g: GOLD[1], w: GOLD[2] })
  p.fill(p.m().path([34.5, 27.5, 37, 25.5, 40, 25, 43, 25.5, 45.5, 27.5]), GOLD[0])
}

export const mondkaiserin: CardDef = {
  id: 'emp1-020',
  number: 20,
  name: 'Mondkaiserin',
  tier: 'grail',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    night(p)
    mist(p, [
      [70, 0, 30, 1],
      [74, 46, 80, 2],
      [80, 8, 44, 3],
    ])
    const d = p.layer()
    wings(d, -1)
    wings(d, 1)
    body(d)
    // her own glow round the silhouette
    d.mask()
      .grown(3)
      .minus(d.mask())
      .each((x, y) => {
        if ((x + y) % 2 === 0) p.set(x, y, SKY[4])
      })
    p.subject(d, OUTLINE)
    tiara(p)
    // moon dust drifting down from her wings, a few sparkles round the tips
    const rand = rng(31)
    for (let i = 0; i < 22; i++) {
      const s = i % 2 === 0 ? -1 : 1
      const x = Math.round(40 + s * (8 + rand() * 30))
      const y = Math.round(48 + rand() * 40)
      if (!p.subjectMask.has(x, y)) p.px(x, y, rand() < 0.3 ? GOLD[1] : WING[3])
    }
    for (const [x, y] of [
      [4, 45],
      [72, 45],
      [18, 15],
      [59, 15],
    ] as const)
      if (!p.subjectMask.has(x + 1, y + 1)) p.stamp(['.w.', 'wWw', '.w.'], x, y, { w: WING[2], W: WING[4] })
    mist(p, [[86, 20, 62, 4]])
  },
}
