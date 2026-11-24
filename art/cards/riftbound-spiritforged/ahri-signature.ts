import type { Mask, Painter, Pt, RGB } from '../../toolkit/index.ts'
import { colors, cubic, hex, noise, rng, stars, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Inquisitive (Signature), the Grail of Spiritforged. Our own take on the folklore nine-tailed fox
 * spirit, at the night lantern festival: a rose-red fox sits on the ridge of a shrine roof, leans
 * forward and cocks her head at the glowing peach-blossom orb she holds up in one forepaw, with a
 * sly half-smile. Her nine tails are translucent spirit light; they fan out over a huge pale moon
 * and break up into blossom petals at their tips. Strings of lanterns sag over the town below.
 * Full art, 80×112.
 *
 * Composition: three quarters to the left, the fox sits left of the middle on the ridge (row 74);
 * the orb floats in the dark sky top left, the moon fills the right half, the tails fan from her
 * rump over it. The frame's plates cover rows 0–13 (the number tag from column 35) and 90–112.
 */
const SKY = colors('110a24', '20123e', '33205a', '4f3078', '74509a')
const MOON = colors('c4b0d4', 'eadff0', 'fffaf6')
const FUR = colors('4a1636', '9a345e', 'd8668c', 'f6a6bc')
const SOCK = hex('2a0e2a')
const SPIRIT = colors('3e2470', '6c46a6', 'a87cd2', 'e4c4f0')
const GOLD = colors('7a3418', 'd2802e', 'ffc65a', 'fff0b4')
const ROOF = colors('0c0718', '1a1230', '2c2048')
const OUTLINE = hex('090412')

const P = (x: number, y: number): Pt => [x, y]
const MOON_C = P(53, 40)
const MOON_R = 23

function sky(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const halo = Math.max(0, 1 - (Math.hypot(x - MOON_C[0], y - MOON_C[1]) - MOON_R) / 22)
      return 0.08 + (y / 112) * 0.3 + halo * halo * 0.7 + noise(x, y, 6, 10) * 0.08
    },
    0.7,
  )
  stars(p, rng(21), 16, [MOON[2], FUR[3], GOLD[3]], { x: 2, y: 2, w: 40, h: 50 })

  // the moon: pale, faintly mottled, a soft shadow along its lower right rim
  const moon = p.m().disc(MOON_C[0], MOON_C[1], MOON_R)
  p.dither(moon, MOON, (x, y) => 0.95 - Math.max(0, Math.hypot(x - 48, y - 34) - 12) / 16 - noise(x, y, 2, 6) * 0.25, 0.5)
  p.fill(moon.facing([1, 0, 0, 1]), MOON[0])
  // a thin band of cloud drifting across its lower half
  const cloud = p.m()
  for (const [x, y, rx, seed] of [
    [40, 54, 12, 1],
    [58, 52, 10, 2],
    [74, 55, 8, 3],
  ] as const) {
    cloud.blob(x, y, rx, 1.6, seed, 0.3)
  }
  p.fill(cloud, SKY[3])
  p.fill(cloud.facing([0, -1]), SKY[4])
  p.shine(false)
}

/** Distant roofs of the festival town under the moon, with lit windows. */
function town(p: Painter): void {
  const rand = rng(17)
  let x = -3
  while (x < 82) {
    const w = 7 + Math.floor(rand() * 6)
    const top = 63 + Math.floor(rand() * 5)
    const house = p.m().poly([x, top + 3, x + w / 2, top, x + w, top + 3, x + w - 1, 80, x + 1, 80])
    p.fill(house, ROOF[1])
    p.fill(house.facing([0, -1]), SKY[3])
    if (rand() < 0.7) p.px(Math.round(x + w / 2), top + 5, GOLD[1])
    x += w - 1
  }
}

/** Two strings of paper lanterns sagging across the town. */
function lanterns(p: Painter): void {
  p.shine(true)
  for (const [y0, y1, sag, seed] of [
    [55, 52, 9, 1],
    [66, 64, 6, 2],
  ] as const) {
    const line = cubic(P(-2, y0), P(26, y0 + sag * 1.3), P(54, y1 + sag * 1.3), P(82, y1), 40)
    p.fill(p.m().path(line), ROOF[2])
    const rand = rng(seed)
    for (let i = 2; i < line.length - 1; i += 4) {
      const [lx, ly] = line[i] ?? [0, 0]
      const x = Math.round(lx + rand())
      const y = Math.round(ly) + 1
      p.stamp(['.k.', 'ghg', 'ggg', '.k.'], x - 1, y, { k: GOLD[0], g: GOLD[2], h: GOLD[3] })
    }
  }
  p.shine(false)
}

/** The curved ridge of the shrine roof, tiles running down towards the viewer, an upswept end. */
function roof(p: Painter): void {
  const ridgeTop = (x: number) => 73.5 - Math.max(0, x - 58) ** 2 * 0.045
  const ridge = p.m()
  const tiles = p.m()
  for (let x = 0; x < 80; x++) {
    const top = ridgeTop(x)
    for (let y = Math.round(top); y < Math.round(top) + 4; y++) ridge.add(x, y)
    for (let y = Math.round(top) + 4; y < 112; y++) tiles.add(x, y)
  }
  ridge.poly([70, 64, 75, 57.5, 77, 58.5, 76.5, 63, 74, 68, 70, 70])
  p.fill(tiles, ROOF[0])
  // rows of round tile ends down the slope, their tops catching the moonlight
  for (let row = 0; row < 5; row++) {
    const y = 80 + row * 4
    for (let x = (row % 2) * 2 - 2; x < 82; x += 4) {
      const scale = p.m().ellipse(x + 2, y, 2, 2.6).and(tiles)
      p.fill(scale, ROOF[1])
      p.fill(scale.facing([0, -1]), SPIRIT[0])
    }
  }
  p.register(ROOF)
  p.part(ridge, [ROOF[0], ROOF[1], ROOF[2], SPIRIT[1]], { bevel: 2 })
  p.fill(ridge.facing([0, -1]), SPIRIT[2])
  // gold caps along the ridge and on the curl
  for (const x of [8, 22, 64]) p.fill(p.m().rect(x, Math.round(ridgeTop(x)) + 1, 2, 2), GOLD[1])
  p.fill(p.m().disc(75.5, 58.5, 1.4), GOLD[2])
}

interface Tail {
  deg: number
  reach: number
  curl: number
}

/** The tails grow from her rump and fan out over the moon; their tips lie on an arc. */
const ROOT = P(50, 66)
const ARC = P(47, 46)
const TAILS: readonly Tail[] = [
  { deg: -110, reach: 31, curl: 9 },
  { deg: -90, reach: 33, curl: 9 },
  { deg: -70, reach: 34, curl: 9 },
  { deg: -51, reach: 34, curl: 9 },
  { deg: -32, reach: 33, curl: 9 },
  { deg: -13, reach: 32, curl: 8 },
  { deg: 6, reach: 30, curl: 7 },
  { deg: 24, reach: 27, curl: 6 },
  { deg: 41, reach: 23, curl: 5 },
]

function tailLine(t: Tail, n: number): Pt[] {
  const a = (t.deg * Math.PI) / 180
  const tip = P(ARC[0] + Math.cos(a) * t.reach, ARC[1] + Math.sin(a) * t.reach)
  const len = Math.hypot(tip[0] - ROOT[0], tip[1] - ROOT[1])
  const [ux, uy] = [(tip[0] - ROOT[0]) / len, (tip[1] - ROOT[1]) / len]
  const at = (k: number, s: number): Pt => [ROOT[0] + ux * len * k - uy * s, ROOT[1] + uy * len * k + ux * s]
  return cubic(at(0, 0), at(0.4, t.curl), at(0.75, t.curl * 0.6), at(1, -t.curl * 0.6), n)
}

const tailRadius = (k: number): number =>
  k < 0.62 ? 1.3 + 1.9 * Math.sin((Math.PI / 2) * (k / 0.62)) : Math.max(0.8, 3.2 * Math.cos((Math.PI / 2) * ((k - 0.62) / 0.38)) ** 0.5)

/** What the sky behind a translucent tail turns into. */
function tint(c: RGB): RGB {
  if (c === MOON[2] || c === MOON[1] || c === MOON[0]) return SPIRIT[2]
  if (c === SKY[4] || c === SKY[3]) return SPIRIT[1]
  return SPIRIT[0]
}

/** One tail of spirit light: a rose root, a translucent body with a bright rim, a pale tip. */
function tail(d: Painter, behind: Painter, t: Tail): void {
  const n = 18
  const line = tailLine(t, n)
  const shape = d.m().limb(line, line.map((_, i) => tailRadius(i / n)))
  const dense = tailLine(t, 48)
  const along = (x: number, y: number): number => {
    let best = 0
    let bestD = Infinity
    dense.forEach(([cx, cy], i) => {
      const dd = (cx - x - 0.5) ** 2 + (cy - y - 0.5) ** 2
      if (dd < bestD) [best, bestD] = [i, dd]
    })
    return best / 48
  }
  d.register(SPIRIT)
  d.contact(shape)
  const rim = shape.facing()
  shape.each((x, y) => {
    const k = along(x, y)
    if (k < 0.18) d.set(x, y, k < 0.1 ? FUR[1] : FUR[2])
    else if (k > 0.88) d.set(x, y, rim.has(x, y) ? FUR[3] : MOON[2])
    else if (rim.has(x, y)) d.set(x, y, FUR[3])
    // half see-through: every other pixel keeps the sky or the moon behind it
    else d.set(x, y, (x + y) % 2 === 0 ? tint(behind.get(x, y)) : behind.get(x, y))
  })
}

/** The fox is drawn in three quarters; her head is cocked by `TILT` degrees round `HEAD`, looking up at the orb. */
const HEAD = P(36, 36)
const TILT = 10
const turn = (pts: readonly number[]): Pt[] => xf(pts, { ox: HEAD[0], oy: HEAD[1], rot: TILT })
const at = (x: number, y: number): Pt => turn([x, y])[0] ?? [x, y]

function fox(d: Painter, behind: Painter): void {
  const m = (): Mask => d.m()

  d.shine(true)
  for (const t of TAILS) tail(d, behind, t)
  d.shine(false)

  // haunch and hind paw on the ridge, the body leaning forward to the chest
  d.part(m().ellipse(47, 64, 8, 9, -10), FUR, { bevel: 6 })
  d.part(m().ellipse(41.5, 72.5, 4, 1.8), [SOCK, FUR[0], FUR[1]], { bevel: 2 })
  d.part(m().poly([33, 47, 41, 45, 50, 56, 51, 65, 41, 66, 33, 60]), FUR, { bevel: 6 })

  // planted foreleg down to the ridge, dark sock below the elbow
  d.part(m().limb([35, 58, 34.5, 66, 34, 72.5], [2.6, 2.1, 1.9]), FUR, { bevel: 2.5 })
  d.part(m().limb([34.5, 66.5, 34, 72.5], [2, 1.9]), [SOCK, FUR[0], FUR[1]], { bevel: 2 })
  d.part(m().ellipse(33, 73, 3, 1.6), [SOCK, FUR[0], FUR[1]], { bevel: 1.5 })

  // pale chest and bib of fur
  const chest = m().ellipse(35, 53, 5.5, 7.5, 12).poly([31, 48, 30.5, 56, 33, 61, 36, 58, 38, 62, 40, 56, 39.5, 47])
  d.part(chest, MOON, { bevel: 4 })

  // raised foreleg, paw turned up under the orb
  d.part(m().limb([33, 50, 27.5, 50.5, 23.5, 47, 21.5, 44.5], [2.6, 2.2, 1.9, 1.8]), FUR, { bevel: 2.5 })
  d.part(m().limb([24.5, 48, 22, 45, 21.5, 43.5], [1.9, 1.8, 1.7]), [SOCK, FUR[0], FUR[1]], { bevel: 2 })
  d.part(m().ellipse(21, 42.8, 2.4, 1.5, -20), [SOCK, FUR[0], FUR[1]], { bevel: 1.5 })

  // neck
  d.part(m().poly([...at(33, 40), ...at(41, 39), 41, 48, 33, 49]), FUR, { bevel: 4 })

  // ears: tall, dark at the back, cream inside; the near one turned a little towards the orb
  for (const [base0, tip, base1] of [
    [[31, 31], [30, 18.5], [36.5, 29.5]],
    [[38.5, 29], [43, 17], [44, 31]],
  ] as const) {
    const ear = m().poly(turn([...base0, ...tip, ...base1]))
    d.part(ear, FUR, { bevel: 2.5 })
    const inner = m().poly(turn([base0[0] + 1.5, base0[1] - 0.5, tip[0] + (base1[0] > 40 ? -0.5 : 0.5), tip[1] + 3.5, base1[0] - 1.5, base1[1] - 0.5]))
    d.fill(inner.and(ear.shrunk(1)), MOON[0])
    d.fill(ear.clone().and(m().poly(turn([tip[0] - 4, tip[1] - 2, tip[0] + 4, tip[1] - 2, tip[0] + 4, tip[1] + 3.5, tip[0] - 4, tip[1] + 3.5]))), SOCK)
  }

  // head: round skull, pale cheek ruffs flaring back, a long muzzle pointing at the orb
  const skull = m().poly(turn([30.5, 33, 32.5, 29, 37, 27.5, 42, 28.5, 45, 32, 45, 37, 42, 40, 35, 40]))
  d.part(skull, FUR, { bevel: 5 })
  const cheeks = m().poly(turn([31, 36, 30, 40.5, 33.5, 42.5, 37.5, 41.5, 41.5, 44, 46.5, 41, 45.5, 36.5, 40, 38.5, 35, 38.5]))
  d.part(cheeks, MOON, { bevel: 3, line: 'shadow' })
  const muzzle = m().poly(turn([31.5, 32.5, 25.5, 36, 23.5, 37.5, 24.5, 39, 31, 39.5, 33.5, 38]))
  d.part(muzzle, FUR, { bevel: 2.5 })
  d.fill(m().poly(turn([24, 38, 31, 38, 31.5, 39.8, 24.5, 39.5])).and(muzzle), MOON[1])

  // nose, eyes, a sly half-smile, a blossom mark on the brow
  const [nx, ny] = at(23.6, 37.1)
  d.px(Math.round(nx), Math.round(ny), OUTLINE).px(Math.round(nx) + 1, Math.round(ny), OUTLINE)
  // almond eyes under a dark lid: the near one full, the far one narrow beside the bridge of the muzzle
  const [ex, ey] = at(35, 33.5).map(Math.round) as [number, number]
  d.stamp(['kkkk', 'kghk', '.kk.'], ex - 1, ey - 1, { k: OUTLINE, g: GOLD[2], h: GOLD[3] })
  const [fx, fy] = at(29.5, 33.8).map(Math.round) as [number, number]
  d.stamp(['kk', 'gk'], fx, fy - 1, { k: OUTLINE, g: GOLD[2] })
  // the mouth runs back from the nose and curls up at its corner: a sly half-smile
  for (const [sx, sy] of [
    [25.5, 38.6],
    [26.5, 38.9],
    [27.5, 39],
    [28.5, 38.9],
    [29.4, 38.3],
  ] as const) {
    const [x, y] = at(sx, sy).map(Math.round) as [number, number]
    d.px(x, y, FUR[0])
  }
  const [bx, by] = at(36, 30).map(Math.round) as [number, number]
  d.stamp(['.w.', 'whw', '.w.'], bx - 1, by - 1, { w: FUR[3], h: GOLD[3] })
}

/** The peach-blossom orb: five round petals of light, a gold heart, a halo and a few sparks. */
function orb(p: Painter): void {
  const [cx, cy] = [20, 36.5]
  p.shine(true)
  p.m()
    .disc(cx, cy, 9)
    .minus(p.subjectMask)
    .each((x, y) => {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (r < 5.2) p.set(x, y, (x + y) % 2 === 0 ? FUR[2] : FUR[1])
      else if (r < 7) p.set(x, y, (x + y) % 2 === 0 ? FUR[1] : SKY[4])
      else if ((x + y) % 2 === 0) p.set(x, y, SKY[4])
    })
  const flower = p.m()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    flower.disc(cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, 2.1)
  }
  p.fill(flower, FUR[3])
  p.fill(flower.shrunk(1), MOON[2])
  p.fill(p.m().disc(cx, cy, 1.3), GOLD[2])
  p.px(Math.floor(cx), Math.floor(cy), GOLD[3])
  for (const [x, y] of [
    [11, 31],
    [28, 30],
    [13, 44],
    [27, 41],
  ] as const) {
    p.px(x, y, GOLD[3])
  }
  p.shine(false)
}

/** Petals blown off the tail tips, drifting across the moon and the sky. */
function petals(p: Painter): void {
  p.shine(true)
  const rand = rng(29)
  for (const t of TAILS) {
    const line = tailLine(t, 10)
    const [tx, ty] = line[10] ?? ARC
    const [px, py] = line[8] ?? ARC
    const [ux, uy] = [tx - px, ty - py]
    for (let i = 0; i < 7; i++) {
      const k = 1 + i * 0.45 + rand() * 0.4
      const x = Math.round(px + ux * k + (rand() - 0.5) * (2 + i))
      const y = Math.round(py + uy * k + (rand() - 0.5) * (2 + i))
      if (p.subjectMask.has(x, y) || (y < 14 && x > 33)) continue
      p.px(x, y, i % 2 === 0 ? FUR[3] : FUR[2])
      if (i === 0) p.px(x + 1, y, FUR[2])
    }
  }
  p.shine(false)
}

export const ahriSignature: CardDef = {
  id: 'rb-sfd-088',
  number: 88,
  name: 'Ahri, Inquisitive (Signature)',
  tier: 'grail',
  kind: 'unit',
  element: 'Mind',
  // the sky, the moon, the lanterns, the tails, the orb and the petals shine; the fox and the roof stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    town(p)
    lanterns(p)
    roof(p)
    const d = p.layer()
    fox(d, p)
    p.subject(d, OUTLINE)
    orb(p)
    petals(p)
  },
}
