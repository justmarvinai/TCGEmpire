import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Soraka, Wanderer (Signature), Ultra. Our own star healer: lavender skin, a single golden horn, long
 * silver hair, pointed ears and a flowing mint gown with gold trim. She walks barefoot to the left
 * through a glowing meadow, leaning on a tall staff crowned with a golden crescent, while little star
 * spirits follow her like fireflies and a shooting star crosses the sky. Full art, 80×112.
 *
 * Composition: she walks right of the middle, the staff a tall vertical line at the left with the
 * crescent high up; hair and gown stream back to the right, where the star spirits trail after her.
 * The shooting star runs down from the upper right. The meadow glows brightest round her bare feet.
 * The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('0e0a24', '1c1640', '2e2660', '463a86')
const SKIN = colors('6a5090', 'a888c8', 'd4bcec')
const SILVER = colors('8a8cb0', 'c8cce4', 'f4f6ff')
const MINT = colors('1e5a50', '3a9a80', '72d8b0', 'c8ffe6')
const GOLD = colors('8a5a1a', 'd8a038', 'f8d870', 'fff6c4')
const MEADOW = colors('102a2c', '1a4238')
const LILAC = hex('e8a8e8')
const OUTLINE = hex('08061a')

function night(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 46, (y - 46) * 0.8) / 40)
      return 0.08 + glow * 0.65 + (y / 112) * 0.25 + noise(x, y, 5, 9) * 0.1
    },
    0.7,
  )
  stars(p, rng(14), 26, [SILVER[2], GOLD[3], MINT[3]], { x: 2, y: 2, w: 76, h: 58 })

  // the shooting star: a bright head running down to the left, its tail fading back up
  const tail: [number, number][] = []
  for (let t = 0; t <= 1; t += 0.05) tail.push([60 + 17 * t, 19.5 - 5.5 * t])
  tail.forEach(([x, y], i) => {
    const c = i < 4 ? SILVER[2] : i < 10 ? SILVER[1] : i < 18 ? SILVER[0] : NIGHT[3]
    p.px(Math.round(x), Math.round(y), c)
    if (i < 8) p.px(Math.round(x), Math.round(y) + 1, i < 3 ? SILVER[1] : SILVER[0])
  })
  p.stamp(['.w.', 'www', '.w.'], 58, 18.5, { w: SILVER[2] })
  p.px(59, 19.5, GOLD[3])
  p.shine(false)

  // soft dark hills behind the meadow
  const hills = p.m().blob(14, 80, 26, 8, 2, 0.15).blob(64, 78, 28, 9, 3, 0.15).rect(0, 80, 80, 32)
  p.fill(hills, NIGHT[1])
  p.fill(hills.facing([0, -1]), NIGHT[2])
}

/** The glowing meadow: grass lit from within, brightest round her feet, flowers and light motes. */
function meadow(p: Painter): void {
  const ground = p.m().poly([0, 81, 22, 79, 50, 80, 80, 78, 80, 112, 0, 112])
  p.shine(true)
  p.dither(
    ground,
    [MEADOW[0], MEADOW[1], MINT[0], MINT[1]],
    (x, y) => 0.35 + Math.max(0, 1 - Math.hypot((x - 43) / 30, (y - 85) / 7)) * 0.8 - (y - 80) / 40 + noise(x, y, 6, 4) * 0.2,
    0.6,
  )
  const rand = rng(19)
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * 80)
    const y = 79 + Math.floor(rand() * 11)
    const h = 2 + Math.floor(rand() * 3)
    p.fill(p.m().path([x, y, x + (rand() < 0.5 ? -1 : 1), y - h]), rand() < 0.6 ? MINT[2] : MINT[1])
  }
  for (const [x, y, c] of [
    [6, 82, LILAC],
    [15, 85, GOLD[2]],
    [24, 81, SILVER[2]],
    [60, 84, LILAC],
    [69, 81, GOLD[2]],
    [75, 86, SILVER[2]],
    [52, 87, MINT[3]],
  ] as const) {
    p.stamp(['.c.', 'cwc', '.c.'], x - 1, y - 1, { c, w: GOLD[3] })
  }
  p.shine(false)
}

/** The crescent at the top of the staff: a gold moon opening upwards, a star hanging in it. */
function crescent(d: Painter): Mask {
  const moon = d.m().disc(29.5, 17.5, 5.2).minus(d.m().disc(31.5, 14.5, 4.6))
  d.part(moon, GOLD, { bevel: 2 })
  return moon
}

function healer(d: Painter): void {
  const m = (): Mask => d.m()

  // hair streaming back to the right in long silver waves
  const hair = m()
    .ellipse(44.5, 25, 5.2, 4.4)
    .poly([42, 22, 48, 21, 52, 23.5, 55, 28, 56.5, 35, 57.5, 42, 59, 48, 56, 50.5, 53, 45, 51.5, 39, 49.5, 34, 47.5, 31])
    .limb([56.5, 40, 60.5, 45, 65.5, 47.5, 70, 46], [2, 2, 1.5, 0.5])
    .limb([57, 46, 60.5, 51, 65, 53.5, 68.5, 53], [1.8, 1.6, 1.2, 0.5])
  d.part(hair, SILVER, { bevel: 3, bias: 1 })
  for (const strand of [
    [47, 24, 52, 28, 54, 35, 55.5, 43, 57.5, 48],
    [50, 23.5, 54.5, 29, 56.5, 38, 60, 45, 66, 47],
    [52.5, 33, 53.5, 41, 55.5, 47],
  ]) {
    d.fill(m().path(strand).and(hair.shrunk(1)), SILVER[0])
  }

  // back arm swinging behind her, a gold bracelet
  d.part(m().limb([47, 38.5, 50.5, 45, 53.5, 50.5], [1.9, 1.7, 1.5]), SKIN)
  d.part(m().ellipse(54, 52, 1.7, 1.9), SKIN, { bevel: 1 })
  d.fill(m().rect(51.5, 48, 3, 1), GOLD[2])

  // feet in mid-stride on the glowing grass
  d.part(m().ellipse(31.5, 84.5, 3.2, 1.4), SKIN, { bevel: 1 })
  d.part(m().poly([49, 80, 52.5, 81, 55, 85, 52, 85.5]), SKIN, { bevel: 1, bias: -1 })
  d.part(m().limb([35.5, 78, 33, 83.5], 1.5), SKIN)

  // the gown flowing back to the right, a pale hem
  const skirt = m().poly([38.5, 49, 47.5, 49, 52, 58, 58, 66, 66, 71.5, 72, 74.5, 64.5, 76, 60, 80, 54, 78.5, 49.5, 82, 43, 80, 37, 82.5, 32, 81.5, 33.5, 73, 36, 60])
  d.part(skirt, MINT, { bevel: 4 })
  d.fill(skirt.facing([0, 1, 1, 0]).minus(m().rect(0, 0, 80, 66)), MINT[3])
  for (const fold of [
    [39.5, 52, 35.5, 72, 35, 80],
    [42.5, 53, 41.5, 66, 42.5, 79],
    [46, 53, 53, 64, 60, 73],
    [49, 55, 58, 65, 67, 72],
  ]) {
    d.fill(m().path(fold).and(skirt.shrunk(1)), MINT[1])
  }

  // bodice, gold collar and belt
  const torso = m().poly([39.5, 35.5, 47.5, 35.5, 47, 43.5, 46, 50, 39.5, 50, 38.8, 43.5])
  d.part(torso, MINT, { bevel: 3 })
  d.part(m().rect(38.5, 48, 9, 2.2), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().ellipse(43.5, 36.5, 4.4, 1.6), GOLD, { bevel: 1 })

  // the staff, planted ahead of her
  d.part(m().limb([30, 21, 30.5, 54, 31, 88], 1.1), GOLD.slice(0, 3), { bevel: 1 })
  d.shine(true)
  crescent(d)
  d.stamp(['.s.', 'sws', '.s.'], 29, 15, { s: GOLD[2], w: GOLD[3] })
  d.shine(false)

  // front arm reaching forward to the staff
  d.part(m().limb([40.5, 38.5, 35.5, 43, 31.5, 46], [1.9, 1.7, 1.5]), SKIN)
  d.part(m().ellipse(30.5, 46.5, 1.9, 2), SKIN, { bevel: 1 })
  d.fill(m().rect(33, 43.5, 2, 1).rect(34, 44, 1, 1), GOLD[2])

  // neck and head, turned three quarters to the left
  d.part(m().limb([43.5, 32.5, 43.5, 36], 1.8), SKIN, { bias: -1 })
  const head = m().ellipse(43.5, 28, 4.4, 5).poly([39.2, 28, 38.6, 29.5, 39.6, 31, 41, 33.2, 44, 33.5, 46.5, 32, 47.8, 29])
  d.part(head, SKIN, { bevel: 3, bias: 1 })

  // fringe swept back, a lock falling in front of the ear, the pointed ear through the hair
  const front = m().poly([39, 25.5, 41, 22, 46, 21, 49, 23.5, 47.5, 26.5, 44.5, 24.5, 42, 25.5]).limb([47.5, 26, 48.5, 31, 47.5, 35], [1.3, 1.1, 0.5])
  d.part(front, SILVER, { bevel: 2 })
  d.part(m().poly([48, 26.5, 53.5, 23, 49, 29.5]), SKIN, { bevel: 1 })

  // the single golden horn on her brow
  d.part(m().limb([41.5, 23, 40.6, 19, 39.6, 15.5], [1.4, 1, 0.4]), GOLD, { bevel: 1 })
  d.fill(m().path([41, 21.5, 40.5, 19]).path([40.5, 18, 40, 17]), GOLD[1])

  // serene closed eyes, a soft smile, a blush
  d.stamp(['k.k..k', '.k...k', '......', '..mm..'], 40, 27.5, { k: OUTLINE, m: SKIN[0] })
  d.px(43, 30, LILAC)

  // the meadow lights her from below, the starlight her hair
  const body = d.mask()
  body.facing([0, 1]).each((x, y) => {
    const c = d.get(x, y)
    if (MINT.includes(c) || SKIN.includes(c)) d.set(x, y, MINT[3])
  })
}

/** Little star spirits drifting after her, two of them with sleepy faces, and motes of light. */
function spirits(p: Painter): void {
  p.shine(true)
  const big = ['...y...', '...y...', '..yhy..', 'yyyhyyy', '.ykyky.', '..yyy..', '.yy.yy.']
  p.stamp(big, 61, 53, { y: GOLD[2], h: GOLD[3], k: NIGHT[1] })
  p.stamp(big, 67, 30, { y: SILVER[1], h: SILVER[2], k: NIGHT[1] })
  const small = ['.y.', 'yhy', '.y.']
  for (const [x, y, c] of [
    [56, 64, GOLD[2]],
    [72, 60, SILVER[1]],
    [66, 70, GOLD[2]],
    [75, 42, SILVER[1]],
    [58, 46, MINT[2]],
  ] as const) {
    p.stamp(small, x - 1, y - 1, { y: c, h: GOLD[3] })
  }
  const rand = rng(29)
  for (let i = 0; i < 16; i++) {
    const x = 52 + Math.floor(rand() * 26)
    const y = 30 + Math.floor(rand() * 46)
    if (p.subjectMask.grown(1).has(x, y)) continue
    p.px(x, y, rand() < 0.5 ? GOLD[3] : MINT[3])
  }
  p.shine(false)
}

export const sorakaSignature: CardDef = {
  id: 'rb-sfd-086',
  number: 86,
  name: 'Soraka, Wanderer (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Order',
  // the sky, the shooting star, the glowing meadow, the crescent and the star spirits shine; the
  // healer and the hills stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    meadow(p)
    const d = p.layer()
    healer(d)
    p.subject(d, OUTLINE)
    spirits(p)
  },
}
