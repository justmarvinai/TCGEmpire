import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, cubic, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Yasuo, Windrider (Signature), Ultra. Our own wandering swordsman: a wild dark ponytail, a strip of
 * bandage across the nose, a white kimono top with one steel shoulder guard, night-blue hakama, a gold
 * scarf and a little white spirit mask tied to his sash. He rides a gust of wind across a lake of
 * floating lanterns like a surfer, katana drawn low and trailing behind him. Full art, 80×112.
 *
 * Composition: a diagonal. He leans into the wind towards the right, feet planted on a teal ribbon
 * of wind that rises from the lower left; scarf and ponytail stream back to the upper left, the blade
 * trails to the lower left. A second ribbon full of petals sweeps up behind him and curls over the
 * right. The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('060a1c', '0c1632', '16264c', '24386a')
const TEAL = colors('0e5a5e', '1a8c88', '3cc4b4', 'a8f4e4')
const CLOTH = colors('6a7c98', 'a8b8cc', 'e4eef4', 'ffffff')
const GOLD = colors('8a5a14', 'd09a2c', 'f8d060', 'fff4b0')
const SKIN = colors('7a4a34', 'c88a64', 'f0bc90')
const HAIR = colors('140f16', '2e242c', '4a3c44')
const STEEL = colors('4e5c74', 'a8b6c8', 'f4f8ff')
const PINK = colors('e07aa0', 'ffd0e0')
const RED = hex('c83040')
const OUTLINE = hex('040610')

/** A wind ribbon along a cubic curve, thickest in the middle. */
function ribbonMask(p: Painter, a: Pt, b: Pt, c: Pt, e: Pt, width: number): { mask: Mask; line: Pt[] } {
  const line = cubic(a, b, c, e, 40)
  const radii = line.map((_, i) => 0.5 + width * Math.sin((Math.PI * i) / (line.length - 1)))
  return { mask: p.m().limb(line, radii), line }
}

function paintRibbon(p: Painter, r: { mask: Mask; line: Pt[] }, seed: number): void {
  p.fill(r.mask, TEAL[1])
  p.fill(r.mask.facing([0, 1]), TEAL[0])
  p.fill(r.mask.facing([0, -1]), TEAL[2])
  p.fill(p.m().path(r.line).and(r.mask.shrunk(1)), TEAL[2])
  // petals and sparkles caught in the wind
  const rand = rng(seed)
  r.line.forEach(([x, y], i) => {
    if (i % 5 !== 2) return
    const dx = Math.round((rand() - 0.5) * 3)
    p.px(Math.round(x) + dx, Math.round(y) - 1, rand() < 0.5 ? PINK[1] : TEAL[3])
    if (rand() < 0.5) p.px(Math.round(x) + dx + 1, Math.round(y) - 1, PINK[0])
  })
}

function night(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 46, (y - 40) * 0.9) / 38)
      return 0.08 + glow * 0.7 + (y > 60 ? 0.15 : 0) + noise(x, y, 7, 9) * 0.1
    },
    0.7,
  )
  stars(p, rng(9), 20, [CLOTH[3], TEAL[3], GOLD[3]], { x: 2, y: 2, w: 76, h: 50 })
  p.shine(false)

  // the lake: dark water under a faint horizon
  const lake = p.m().rect(0, 64, 80, 48)
  p.dither(lake, [NIGHT[0], NIGHT[1], NIGHT[2]], (_x, y) => 0.9 - (y - 64) / 30, 0.6)
  p.fill(p.m().rect(0, 64, 80, 1), NIGHT[3])
}

/** One floating lantern with its glow and its reflection on the water. */
function lantern(p: Painter, x: number, y: number, size: number): void {
  if (size === 0) {
    p.px(x, y, GOLD[2]).px(x, y + 1, GOLD[1])
    if (y > 64) p.px(x, y + 4, GOLD[0])
    return
  }
  p.stamp(['.k.', 'gyg', 'gyg', '.g.'], x - 1, y, { k: HAIR[0], g: GOLD[1], y: GOLD[3] })
  if (size > 1) p.px(x - 2, y + 1, GOLD[0]).px(x + 2, y + 1, GOLD[0]).px(x, y - 1, GOLD[0])
  if (y > 63) p.px(x, y + 6, GOLD[1]).px(x, y + 7, GOLD[0]).px(x - 1, y + 9, GOLD[0])
}

function lanterns(p: Painter): void {
  p.shine(true)
  const rand = rng(27)
  for (let i = 0; i < 30; i++) {
    const y = 58 + Math.floor(rand() * 28)
    const x = 2 + Math.floor(rand() * 76)
    lantern(p, x, y, y < 68 ? 0 : y < 78 ? 1 : 2)
  }
  for (const [x, y] of [
    [8, 44],
    [72, 50],
    [64, 40],
    [14, 30],
  ] as const) {
    lantern(p, x, y, 1)
  }
  p.shine(false)
}

function swordsman(d: Painter): void {
  const m = (): Mask => d.m()

  // the gold scarf streaming back from his neck
  d.part(m().limb([44, 35.5, 37.5, 38, 30.5, 39, 23.5, 41.5], [1.6, 1.6, 1.3, 0.5]), GOLD, { bevel: 1, bias: -1 })
  const scarf = m().limb([45, 34, 39, 31.5, 32, 32.5, 25, 30.5, 18, 31, 11, 28.5], [2, 2.1, 2, 1.8, 1.4, 0.6])
  d.part(scarf, GOLD, { bevel: 1 })
  d.fill(scarf.facing([0, 1]), GOLD[0])

  // the wild ponytail, spikes blown back
  const tail = m()
    .limb([43, 21, 38, 19.5, 33, 19.5, 28, 18.5], [1.8, 2.5, 2.5, 2])
    .limb([29, 18, 23, 15.5, 16, 14.5], [1.8, 1.2, 0.4])
    .limb([29, 19.5, 22.5, 20.5, 14.5, 22.5], [1.8, 1.2, 0.4])
    .limb([31, 20.5, 26, 23.5, 20.5, 26.5], [1.4, 0.9, 0.3])
  d.part(tail, HAIR, { bevel: 2 })
  d.fill(m().path([41, 19.5, 36, 18.5, 30, 18, 24, 16]).and(tail.shrunk(1)), HAIR[2])
  d.part(m().ellipse(42.5, 21, 1.2, 2), GOLD.slice(1), { bevel: 1 })

  // back leg stretched out behind him on the wind, the hakama flapping
  const back = m().limb([39, 55, 33, 63, 26.5, 71.5], [4.2, 4, 3.2])
  d.part(back, NIGHT.slice(1), { bevel: 3 })
  d.part(m().poly([30, 62, 24, 61, 20.5, 64, 25, 66.5, 28.5, 68]), NIGHT.slice(1), { bevel: 2, bias: -1 })
  d.part(m().ellipse(24.5, 73.5, 3, 1.7), CLOTH, { bevel: 1.5 })

  // front leg bent under him, knee forward
  const front = m().limb([44, 55, 50.5, 60.5, 53, 69.5], [4.2, 4, 3.2])
  d.part(front, NIGHT.slice(1), { bevel: 3 })
  d.part(m().poly([47, 63, 44.5, 68, 47.5, 70.5, 49.5, 66]), NIGHT.slice(1), { bevel: 2, bias: -1 })
  d.part(m().ellipse(55, 71.5, 3.2, 1.7), CLOTH, { bevel: 1.5 })
  d.fill(m().path([30, 69, 34.5, 61]).path([49, 59, 53, 67]), NIGHT[1])

  // back arm reaching down to the katana held low behind him
  d.part(m().limb([42.5, 37.5, 38, 46, 33.5, 54], [3.2, 2.9, 2.5]), CLOTH)

  // the white kimono top, leaning into the wind, the chest open at the neck, a teal sash
  const torso = m().poly([40.5, 34.5, 51, 36, 50.5, 45, 47, 54.5, 37.5, 54.5, 38, 45])
  d.part(torso, CLOTH, { bevel: 4 })
  d.part(m().poly([44, 35.5, 49, 36.5, 45.5, 43.5]), SKIN, { bevel: 2, line: 'none' })
  d.fill(m().path([38.5, 47, 45, 41]).and(torso.shrunk(1)), CLOTH[1])
  const sash = m().poly([37, 51, 47.5, 51, 47, 55, 37.2, 55])
  d.part(sash, TEAL, { bevel: 1.5 })

  // the spirit mask tied to his sash: white, red marks, dark eyes
  d.part(m().ellipse(45.5, 57.5, 2.4, 2.9), CLOTH, { bevel: 1.5 })
  d.stamp(['k.k', '...', 'r.r'], 44.5, 56.5, { k: HAIR[0], r: RED })

  // the katana: grip in the fist at his hip, the blade trailing low behind him
  d.part(m().limb([36.5, 53.5, 32.5, 56], 1.3), HAIR, { bevel: 1 })
  d.part(m().ellipse(33, 55.6, 1.5, 2.1), GOLD.slice(0, 3), { bevel: 1 })
  const blade = m().limb([32, 56.5, 20, 61, 6, 64.5], [1.2, 1, 0.4])
  d.part(blade, STEEL, { bevel: 1 })
  d.fill(blade.facing([0, -1]), STEEL[2])
  d.part(m().disc(34.5, 54.5, 2.2), SKIN, { bevel: 1.5 })

  // front arm thrown forward for balance, a steel guard on the shoulder
  d.part(m().limb([50, 38, 56.5, 42.5, 62, 44.5], [2.9, 2.5, 2.2]), SKIN)
  d.part(m().limb([58.5, 43.5, 61, 44.3], 2.4), CLOTH.slice(0, 3), { bevel: 1 })
  d.part(m().ellipse(63.5, 45, 2.2, 1.9), SKIN, { bevel: 1.5 })
  d.part(m().ellipse(50.5, 37.5, 4.2, 3.3), STEEL, { bevel: 2 })
  d.part(m().rect(47, 39.5, 7, 1.5), GOLD.slice(0, 3), { bevel: 1 })

  // neck and head, three quarters to the right
  d.part(m().limb([46.5, 31.5, 46, 35], 2.1), SKIN, { bias: -1 })
  const head = m().ellipse(47, 26.5, 4.4, 5.2).poly([43, 27, 44, 31.5, 46.5, 33, 49.5, 32.5, 51.5, 29.5, 51.6, 26]).poly([51, 26, 53, 28.5, 51, 29])
  d.part(head, SKIN, { bevel: 3, bias: 1 })

  // spiky bangs over the brow, a lock falling past the ear
  const hair = m()
    .ellipse(46, 22.5, 5.2, 3.6)
    .poly([41, 22, 41.5, 30, 43.5, 27, 44, 24])
    .poly([45, 23, 48, 28.5, 48.5, 24.5, 51, 27.5, 50.5, 23.5, 53, 25, 51.5, 21])
  d.part(hair, HAIR, { bevel: 2 })

  // face: a narrow eye under a frowning brow, the bandage across the nose, a stubbled jaw
  d.stamp(['bb..b', 'kk..k', '...ww'], 46, 25, { b: HAIR[1], k: HAIR[0], w: CLOTH[3] })
  d.stamp(['..mm', 's...', '...s'], 46, 31, { m: SKIN[0], s: SKIN[0] })

  // rims: teal from the wind behind, warm from the lanterns below
  const body = d.mask()
  body.facing([-1, 0]).each((x, y) => {
    const c = d.get(x, y)
    if (NIGHT.includes(c) || CLOTH.includes(c)) d.set(x, y, TEAL[2])
  })
  body.facing([0, 1]).each((x, y) => {
    const c = d.get(x, y)
    if (NIGHT.includes(c)) d.set(x, y, GOLD[0])
  })
}

export const yasuoSignature: CardDef = {
  id: 'rb-sfd-085',
  number: 85,
  name: 'Yasuo, Windrider (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Chaos',
  // the sky, the wind ribbons with their petals and the lanterns shine; the swordsman and the water
  // stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    lanterns(p)
    p.shine(true)
    const behind = ribbonMask(p, [-4, 60], [24, 52], [52, 30], [76, 18], 3.2)
    paintRibbon(p, behind, 3)
    const ride = ribbonMask(p, [-4, 82], [22, 79], [54, 76], [84, 66], 3)
    paintRibbon(p, ride, 5)
    p.shine(false)
    const d = p.layer()
    swordsman(d)
    p.subject(d, OUTLINE)
    // a thin gust in front, slipping past his blade
    p.shine(true)
    const gust = ribbonMask(p, [-4, 74], [14, 72], [30, 66], [44, 66], 1.2)
    gust.mask.minus(p.subjectMask)
    paintRibbon(p, gust, 7)
    p.shine(false)
  },
}
