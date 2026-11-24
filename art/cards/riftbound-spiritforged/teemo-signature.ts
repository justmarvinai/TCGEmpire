import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Teemo, Strategist (Signature), Ultra. Our own little yordle scout: peach fur, long pointed ears, a
 * soft-green ranger hat with a glowing flower in its band, a satchel. He sits on top of a giant
 * mushroom that glows like a paper lantern and studies a big hand-drawn map on his knees, a pencil
 * tucked behind his ear; tiny spirit flowers and mushrooms glow round him in the grass. Full art,
 * 80×112.
 *
 * Composition: the mushroom fills the bottom middle, its warm light coming up from below; Teemo sits
 * on its cap, the map spread across his knees towards the viewer, his ears wide like wings under the
 * hat. Dark tree crowns and an indigo sky frame him. The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('0a0a24', '141842', '222a5e', '343e7a')
const GREEN = colors('17301f', '2e5a32', '5a9048', '9ccc70')
const FUR = colors('6a3a28', 'b8744a', 'e8a878', 'ffd8b0')
const PAPER = colors('b89468', 'e8d4a6', 'fff4d8')
const GLOW = colors('7a2412', 'd0561c', 'f89a30', 'ffe07a')
const MINT = colors('2aa890', 'b4ffe6')
const BROWN = colors('3e2418', '6e4228')
const INK = hex('2c1a2a')
const PINK = hex('e88a86')
const OUTLINE = hex('0a0812')

function night(p: Painter): void {
  p.shine(true)
  p.dither(null, NIGHT, (x, y) => 0.1 + Math.pow(y / 90, 1.4) * 0.8 + noise(x, y, 4, 9) * 0.1, 0.7)
  stars(p, rng(12), 22, [PAPER[2], MINT[1], GLOW[3]], { x: 2, y: 2, w: 76, h: 46 })
  p.shine(false)

  // dark tree crowns behind the clearing
  const trees = p.m()
  for (const [x, y, r, seed] of [
    [4, 56, 11, 1],
    [16, 64, 9, 2],
    [76, 54, 12, 3],
    [64, 63, 9, 4],
    [-2, 72, 10, 5],
    [82, 70, 10, 6],
  ] as const) {
    trees.blob(x, y, r, r * 1.1, seed, 0.22)
  }
  trees.rect(0, 70, 80, 42)
  p.fill(trees, NIGHT[1])
  p.fill(trees.facing([0, -1, -1, 0]), NIGHT[2])
}

/** The glowing mushroom's light pooling on the ground and haloing round its cap. */
function halo(p: Painter): void {
  p.shine(true)
  const glow = p.m().ellipse(40, 70, 34, 22)
  p.dither(glow, [NIGHT[1], NIGHT[2], GLOW[0]], (x, y) => 1.05 - Math.hypot((x - 40) / 34, (y - 70) / 22), 0.9)
  p.shine(false)
}

/** Grass with tiny glowing spirit flowers and mushrooms. */
function meadow(p: Painter, front: boolean): void {
  const rand = rng(front ? 31 : 37)
  if (!front) {
    const ground = p.m().poly([0, 80, 20, 77, 40, 78, 60, 77, 80, 80, 80, 112, 0, 112])
    p.fill(ground, GREEN[0])
    p.fill(ground.facing([0, -1]), GREEN[1])
  }
  for (let i = 0; i < (front ? 26 : 40); i++) {
    const x = Math.floor(rand() * 80)
    const y = front ? 84 + Math.floor(rand() * 6) : 76 + Math.floor(rand() * 14)
    if (front && x > 27 && x < 53) continue
    const h = 2 + Math.floor(rand() * 3)
    const lean = rand() < 0.5 ? -1 : 1
    p.fill(p.m().path([x, y, x + lean * 0.6, y - h]), rand() < 0.5 ? GREEN[1] : GREEN[2])
  }
  p.shine(true)
  const spots: readonly (readonly [number, number, number])[] = front
    ? [
        [7, 83, 0],
        [22, 86, 1],
        [60, 84, 1],
        [73, 87, 0],
      ]
    : [
        [13, 77, 1],
        [4, 74, 0],
        [26, 79, 0],
        [55, 78, 0],
        [67, 76, 1],
        [76, 79, 0],
      ]
  for (const [x, y, kind] of spots) {
    if (kind === 0) {
      // spirit flower: five glowing petals on a thin stem
      p.fill(p.m().path([x, y + 1, x, y + 4]), GREEN[2])
      p.stamp(['.m.', 'mcm', '.m.'], x - 1, y - 1, { m: MINT[0], c: MINT[1] })
    } else {
      // tiny mushroom with a glowing cap
      p.stamp(['.gg.', 'gyyg', '.pp.', '.pp.'], x - 1, y - 1, { g: GLOW[2], y: GLOW[3], p: PAPER[1] })
    }
  }
  p.shine(false)
}

/** Big round eyes cast down on the map, a glint in each. */
const FACE = [
  '..kk....kk..',
  '.kkkk..kkkk.',
  '.kwkk..kwkk.',
  '.kkkk..kkkk.',
  '..kk....kk..',
]

function scout(d: Painter): void {
  const m = (): Mask => d.m()

  // the mushroom lantern: a cream stalk with a ring, the glowing cap with pale spots
  const stalk = m().poly([33.5, 72, 46.5, 72, 48.5, 92, 31.5, 92])
  d.part(stalk, PAPER, { bevel: 4 })
  d.part(m().ellipse(40, 77.5, 9, 1.8), PAPER, { bevel: 1.5 })
  d.shine(true)
  const gills = m().ellipse(40, 71.5, 21.5, 3.2)
  d.fill(gills, GLOW[1])
  for (let x = 21; x <= 59; x += 3) d.fill(m().path([40, 70, x, 73]).and(gills.shrunk(1)), GLOW[2])
  const cap = m().ellipse(40, 69, 23.5, 10.5).and(m().rect(0, 0, 80, 70.5))
  d.part(cap, GLOW, { bevel: 5, bias: 1 })
  for (const [x, y, r] of [
    [27, 64, 2.2],
    [36, 61.5, 1.6],
    [52, 64.5, 2.4],
    [61, 67.5, 1.5],
    [19, 68, 1.4],
  ] as const) {
    d.part(m().ellipse(x, y, r * 1.3, r), PAPER.slice(1), { bevel: 1, line: 'none' })
  }
  d.shine(false)

  // little boots resting on the cap
  d.part(m().ellipse(34, 61, 3, 2.1).ellipse(46, 61, 3, 2.1), BROWN, { bevel: 1.5 })

  // body in the green tunic, the satchel strap across it
  const body = m().ellipse(40, 45, 8, 7)
  d.part(body, GREEN, { bevel: 4 })
  d.fill(m().path([34, 39, 46, 51]).path([35, 39, 47, 51]).and(body), BROWN[1])

  // the map on his knees, tilted towards the viewer, rolled up at both ends
  const map = m().poly([27, 47, 53, 47, 55, 60.5, 25, 60.5])
  d.part(map, PAPER, { bevel: 3, bias: 1 })
  // drawn on it: a river, two little trees, a dashed route winding up to a red cross
  d.fill(m().path([36, 47.5, 37.5, 51, 41, 53, 41.5, 56.5, 44, 60]).and(map.shrunk(1)), MINT[0])
  const route = m().path([29.5, 59, 31.5, 56, 34.5, 55.5, 37, 53.5, 39.5, 55, 43.5, 52.5, 46.5, 50.5, 48.5, 50])
  route.and(map.shrunk(1)).each((x, y) => {
    if ((x + y) % 2 === 0) d.px(x, y, INK)
  })
  d.stamp(['g.g', '.g.', 'g.g'], 49, 48.5, { g: GLOW[1] })
  d.stamp(['.t.', 'ttt', '.b.'], 29.5, 48.5, { t: GREEN[1], b: BROWN[1] })
  d.stamp(['.t.', 'ttt', '.b.'], 32.5, 50.5, { t: GREEN[1], b: BROWN[1] })
  d.stamp(['.gg.', 'gggg', '.pp.'], 48, 55.5, { g: GLOW[1], p: PAPER[0] })
  for (const x of [26, 52.5]) d.part(m().rect(x, 46.5, 2.5, 14.5), PAPER, { bevel: 1 })

  // arms holding the top corners of the map
  d.part(m().limb([34.5, 41, 30.5, 44, 28.5, 47], [2.4, 2.2, 2]), GREEN)
  d.part(m().limb([45.5, 41, 49.5, 44, 51.5, 47], [2.4, 2.2, 2]), GREEN)
  d.part(m().disc(28.5, 47.5, 2.2).disc(51.5, 47.5, 2.2), FUR, { bevel: 1.5 })

  // the head, big and round, a pale muzzle
  const head = m().ellipse(40, 31, 9.2, 7.8)
  d.part(head, FUR, { bevel: 5 })
  d.part(m().ellipse(40, 34.8, 4.6, 2.9), FUR.slice(1), { bevel: 2, line: 'none' })

  // the pencil tucked behind his ear: a graphite tip by the cheek, the eraser above the ear
  d.part(m().limb([47, 33.5, 52.5, 21], 1.1), [GLOW[1], GLOW[2], GLOW[3]], { bevel: 1 })
  d.px(47, 34, INK).px(52, 20, PINK).px(53, 20, PINK)

  // long ears spread wide like wings, pink inside
  for (const s of [1, -1]) {
    const x = (v: number): number => 40 + (v - 40) * s
    const ear = m().poly([x(32), 27, x(25), 22.5, x(18), 19.5, x(14), 20, x(16.5), 23.5, x(23), 28.5, x(31.5), 32])
    d.part(ear, FUR, { bevel: 3 })
    d.fill(m().poly([x(30), 28.5, x(24), 24.5, x(18), 21.5, x(23.5), 26.5, x(30), 30.5]).and(ear.shrunk(1)), PINK)
  }

  // the ranger hat: a soft crown, a wide brim, a band with a glowing spirit flower pinned to it
  const brim = m().ellipse(40, 25, 12.5, 2.6)
  d.part(brim, GREEN, { bevel: 2 })
  const crown = m().ellipse(40, 20.5, 7.4, 5.2).and(m().rect(0, 0, 80, 24.5))
  d.part(crown, GREEN, { bevel: 4 })
  d.fill(m().rect(32, 22.5, 16, 1.6).and(crown), BROWN[1])
  d.fill(m().path([37.5, 16, 40, 19]).and(crown.shrunk(1)), GREEN[1])
  d.shine(true)
  d.stamp(['.m.', 'mcm', '.m.'], 44, 21, { m: MINT[0], c: MINT[1] })
  d.shine(false)

  // face: eyes on the map, a small nose, a cheeky mouth
  d.stamp(FACE, 34, 28, { k: INK, w: PAPER[2] })
  d.stamp(['.nn.', '....', 'k..k', '.kk.'], 38, 33, { k: INK, n: FUR[0] })

  // the mushroom lights his undersides
  const all = d.mask()
  all
    .facing([0, 1])
    .minus(m().rect(0, 60, 80, 52))
    .each((x, y) => {
      const c = d.get(x, y)
      if (FUR.includes(c) || GREEN.includes(c) || PAPER.includes(c)) d.set(x, y, GLOW[2])
    })
}

/** Fireflies drifting over the clearing. */
function fireflies(p: Painter): void {
  p.shine(true)
  const rand = rng(41)
  for (let i = 0; i < 14; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = 16 + Math.floor(rand() * 60)
    if (p.subjectMask.grown(1).has(x, y)) continue
    p.px(x, y, rand() < 0.5 ? GLOW[3] : MINT[1])
  }
  p.shine(false)
}

export const teemoSignature: CardDef = {
  id: 'rb-sfd-083',
  number: 83,
  name: 'Teemo, Strategist (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Mind',
  // the sky, the mushroom's cap and glow, the spirit flowers, the little mushrooms and the fireflies
  // shine; the scout, his map and the grass stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    halo(p)
    meadow(p, false)
    const d = p.layer()
    scout(d)
    p.subject(d, OUTLINE)
    meadow(p, true)
    fireflies(p)
  },
}
