import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Charlotte Katakuri (Leader, Alt-Art, Ultra, Yellow). Brief: the giant commander alone at a
 * candlelit table of sweets, in his secret snack time. Full art, 80×112.
 *
 * Composition: Katakuri fills the picture behind a long table, spiky maroon hair, his huge bare arms,
 * a dark leather vest. Alone, he has pulled his fur-trimmed scarf down off his mouth, the mouth no one
 * may see: wide, lined with sharp teeth, it bites into a pink-glazed doughnut, eyes shut in bliss. His
 * other hand rests by his plate and teacup. Towers of ring cakes and a stand of macarons rise on the
 * table, two tall candles burn at its ends, cream-and-pink striped wallpaper glows behind him. The
 * frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const WALL = colors('c88890', 'f0b8c0', 'f8e8d0')
const WOOD = colors('2a140e', '4a2618', '7a4428')
const FLAME = colors('f88a24', 'ffd04a', 'fff6c8')
const CLOTH = [hex('c8a898'), WALL[2], hex('fffaf0')] as const
const DOUGH = colors('8a4a1e', 'c8803a', 'eab466')
const MINT = hex('9adcbc')
const LILAC = hex('bea0e0')
const SKIN = colors('5a2a24', 'a8603e', 'e09a6a', 'f8c898')
const LEATHER = colors('141018', '2e2632', '4e4458')
const COAT = colors('3a0c16', '6a1a28', '9a2a3a')
const GOLD = colors('9a6a1c', 'e8b83a', 'fff0a0')
const OUTLINE = hex('140a0c')

/**
 * Katakuri's face with the scarf pulled down: heavy brows, eyes shut in bliss, and the secret mouth,
 * wide from cheek to cheek and lined with sharp teeth.
 */
const FACE = [
  '..ffffffffffffffffff..',
  '.fffffffffffffffffffs.',
  '.fKKKKKffffffKKKKKfss.',
  'fffffffffffffffffffssS',
  'ffKKKfffffffffKKKffssS',
  'fffffKfffFFffKfffffssS',
  'ffffffffFfffffffffsssS',
  'fffffffffffsffffffsssS',
  'sffffffffsssfffffffssS',
  'sKfffffffffffffffffKsS',
  'sKKtKtKtKtKtKtKtKtKKsS',
  'ssKmmmmmmmmmmmmmmmmKsS',
  '.sKtKtKtKtKtKtKtKtKKs.',
  '..sKKKKKKKKKKKKKKKKss.',
  '...sssffffffffffsss...',
  '.....ssssssssssss.....',
]
const FACE_KEY = {
  f: SKIN[2],
  F: SKIN[3],
  s: SKIN[1],
  S: SKIN[0],
  K: OUTLINE,
  m: COAT[0],
  t: CLOTH[2],
}
const FX = 29
const FY = 24

function hall(p: Painter): void {
  // striped wallpaper, warmer and brighter around the candles
  p.register(WALL).register(WOOD)
  p.shine(true)
  const glow = (x: number, y: number) =>
    Math.max(0, 1 - Math.hypot(x - 8, (y - 40) * 0.8) / 30) + Math.max(0, 1 - Math.hypot(x - 72, (y - 40) * 0.8) / 30)
  p.dither(
    p.m().rect(0, 0, 80, 62),
    [WOOD[1], WALL[0], WALL[1], WALL[2]],
    (x, y) => 0.3 + glow(x, y) * 0.55 + ((x >> 2) % 2 === 0 ? 0.2 : 0) - y * 0.002,
    0.4,
  )
  // a gilded picture rail and dark wainscot behind the table
  p.fill(p.m().rect(0, 20, 80, 1), GOLD[0])
  p.shine(false)
  p.fill(p.m().rect(0, 62, 80, 50), WOOD[1])
  p.fill(p.m().rect(0, 62, 80, 1), WOOD[2])
  for (let x = 2; x < 80; x += 10) p.fill(p.m().rect(x, 65, 7, 12), WOOD[0])
}

/** A ring cake, glazed on top, a few sprinkles. */
function ringCake(d: Painter, cx: number, cy: number, rx: number, ry: number, glaze: number, seed: number): void {
  const m = (): Mask => d.m()
  const ring = m().ellipse(cx, cy, rx, ry).minus(m().ellipse(cx, cy - 0.5, rx * 0.34, ry * 0.34))
  d.part(ring, DOUGH, { bevel: 2 })
  const top = ring.clone().and(m().ellipse(cx, cy - ry * 0.25, rx * 0.95, ry * 0.8))
  d.fill(top, glaze)
  d.fill(top.facing([0, -1]), CLOTH[2])
  const rand = rng(seed)
  top.shrunk(1).each((x, y) => {
    if (rand() < 0.16) d.px(x, y, [MINT, LILAC, CLOTH[2]][Math.floor(rand() * 3)] ?? MINT)
  })
}

/** Two tall candles standing at the ends of the table, in front of him. */
function candles(d: Painter): void {
  for (const x of [6, 74]) {
    d.part(d.m().rect(x - 2, 47, 4, 25), CLOTH, { bevel: 2 })
    d.part(d.m().rect(x - 4, 69, 8, 3).rect(x - 2.5, 67, 5, 2), GOLD, { bevel: 1 })
    d.fill(d.m().rect(x - 0.5, 44, 1, 3), WOOD[0])
  }
}

function flames(p: Painter): void {
  p.shine(true)
  for (const x of [6, 74]) fire(p, flameMask(p, x, 46, 6, 11, { lean: 1, tongues: 0, seed: x }), FLAME, { dy: 1, step: 1 })
  p.shine(false)
}

/** The table: a white cloth falling over its front edge, plate and teacup, towers of sweets. */
function table(d: Painter): void {
  const m = (): Mask => d.m()
  // tower of ring cakes on the right, a stand of macarons on the left
  ;[DOUGH[2], WALL[1], WOOD[1], CLOTH[2], WALL[1], DOUGH[2], WOOD[1]].forEach((glaze, i) =>
    ringCake(d, 67, 69 - i * 4.2, 7 - i * 0.35, 2.6, glaze, 40 + i),
  )
  for (const [y, w] of [
    [70, 13],
    [60, 10],
    [51, 7],
  ] as const) {
    d.part(m().rect(12 - w / 2, y, w, 2), GOLD, { bevel: 1 })
    for (let i = 0; i < Math.floor(w / 3.4); i++) {
      const x = 12 - w / 2 + 1.5 + i * 3.4
      d.part(m().ellipse(x + 0.5, y - 2, 1.6, 1.4), i % 3 === 0 ? [WALL[0], MINT, CLOTH[2]] : i % 3 === 1 ? [WALL[0], LILAC, CLOTH[2]] : WALL, { bevel: 1 })
    }
  }
  d.part(m().rect(11.5, 51, 1, 21), GOLD, { bevel: 1, line: 'none' })
  // the cloth
  const cloth = m().poly([0, 72, 80, 72, 80, 92, 0, 92])
  d.part(cloth, CLOTH, { bevel: 4 })
  d.fill(m().rect(0, 72, 80, 1), CLOTH[2])
  for (let x = 6; x < 80; x += 9) d.fill(m().rect(x, 80, 1, 12), CLOTH[0])
  // plate with a slice of cake, teacup
  d.part(m().ellipse(52, 74, 8, 2.2), CLOTH, { bevel: 1.5 })
  d.part(m().poly([48, 72, 55, 70, 56, 73, 49, 75]), DOUGH, { bevel: 1 })
  d.fill(m().rect(49, 72, 6, 1).and(m().poly([48, 72, 55, 70, 56, 73, 49, 75])), WALL[1])
  d.part(m().rect(25, 67, 6, 5).ellipse(28, 72, 5, 1.5), [WALL[0], WALL[1], CLOTH[2]], { bevel: 2 })
  d.part(m().ellipse(32, 69, 1.4, 1.6).minus(m().disc(32, 69, 0.6)), [WALL[0], WALL[1], CLOTH[2]], { bevel: 1 })
}

function katakuri(d: Painter): void {
  const m = (): Mask => d.m()
  // the huge body in a dark leather vest, open over his chest, a gold zip down its edges
  const vest = m().poly([4, 56, 10, 46, 24, 40, 56, 40, 70, 46, 76, 56, 78, 74, 2, 74])
  d.part(vest, LEATHER, { bevel: 10 })
  d.part(m().poly([31, 44, 49, 44, 46, 74, 34, 74]), SKIN, { bevel: 5 })
  d.fill(m().path([40, 50, 40, 72]).path([34, 56, 39, 58]).path([41, 58, 46, 56]), SKIN[1])
  d.fill(m().path([31, 44, 34, 74]).path([49, 44, 46, 74]), GOLD[1])
  // the left hand by the plate: a bare, muscled arm
  d.part(m().limb([66, 50, 62, 62, 58, 70], [6.5, 5.5, 4.6]), SKIN, { bias: -1 })
  d.part(m().rect(54, 65, 8, 3), LEATHER, { bevel: 1 })
  d.part(m().ellipse(58, 71, 5, 3), SKIN, { bevel: 2.5 })
  // the right arm raising the doughnut to his mouth
  d.part(m().limb([14, 52, 12, 44, 16, 37], [6.5, 5.6, 4.8]), SKIN)
  d.part(m().rect(11, 38, 9, 3), LEATHER, { bevel: 1 })
  d.part(m().ellipse(18, 34, 4.6, 4.2), SKIN, { bevel: 2.5 })
  // the scarf pulled down off his mouth: a thick maroon roll round his neck, fur along its edges,
  // its ends hanging down his chest
  d.part(m().limb([33, 48, 31, 57, 32, 66], [3.4, 3.2, 3]).limb([47, 48, 49, 57, 48, 64], [3.2, 3, 2.8]), COAT, { bevel: 2 })
  d.fill(m().rect(29, 64, 7, 2).rect(45, 62, 7, 2), CLOTH[1])
  const drape = m().limb([28, 46, 34, 51, 40, 52, 46, 51, 52, 46], [3.2, 3.6, 3.8, 3.6, 3.2])
  d.part(drape, COAT, { bevel: 3, bias: -1 })
  const roll = m().limb([24, 42, 32, 46, 40, 47, 48, 46, 56, 42], [4.2, 4.6, 4.8, 4.6, 4.2])
  d.part(roll, COAT, { bevel: 4 })
  d.fill(m().path([30, 45, 34, 48]).path([39, 45, 41, 49]).path([47, 44, 50, 47]).path([36, 50, 44, 50]).and(roll.or(drape).shrunk(1)), COAT[0])
  roll.facing([0, -1]).each((x, y) => d.set(x, y, (x + y) % 2 === 0 ? CLOTH[2] : CLOTH[1]))
  d.fill(roll.facing([0, -1]).moved(0, 1).and(roll).and(m().rect(0, 0, 80, 46)), CLOTH[1])
  // neck and head: spiky maroon hair standing up, ears
  d.part(m().ellipse(40, 28, 13, 13), SKIN, { bevel: 7 })
  d.part(m().ellipse(27, 31, 2, 3.2).ellipse(53, 31, 2, 3.2), SKIN, { bevel: 1.5 })
  const hair = m().ellipse(40, 21, 13, 6)
  for (const [x, y] of [
    [36, 6],
    [40, 5],
    [44, 8],
    [31, 14],
    [50, 15],
    [26, 18],
    [55, 19],
  ] as const)
    hair.limb([40, 20, x, y], [4, 0.6])
  d.part(hair, COAT, { bevel: 3, bias: 1 })
  d.fill(m().path([40, 19, 36, 9]).path([41, 18, 41, 9]).path([42, 19, 46, 10]).path([36, 21, 29, 14]).path([44, 21, 51, 15]), COAT[0])
  d.stamp(FACE, FX, FY, FACE_KEY)
  // the doughnut at his mouth, a bite already gone from it
  ringCake(d, 22, 34, 5.4, 4.6, WALL[1], 7)
  d.erase(m().disc(27.5, 35, 2.4).and(m().ellipse(22, 34, 6, 5.5)))
  d.part(m().ellipse(17, 37, 2.6, 1.8, -20), SKIN, { bevel: 1.5 })
  d.px(29, 41, DOUGH[2]).px(30, 42, WALL[1])
}

export const katakuriLeader: CardDef = {
  id: 'op03-086',
  number: 86,
  name: 'Charlotte Katakuri (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Gelb',
  print: { life: 5, power: 5000, type: 'Big-Mom-Piraten' },
  // the wallpaper, the picture rail and the candle flames shine; Katakuri and his table stay matt
  foil: 'painted',
  draw(p) {
    hall(p)
    const d = p.layer()
    katakuri(d)
    table(d)
    candles(d)
    p.subject(d, OUTLINE)
    flames(p)
    // candlelight sparkles on the gold
    p.shine(true)
    for (const [x, y] of [
      [40, 52],
      [12, 50],
      [66, 50],
    ] as const)
      p.px(x, y, GOLD[2])
    p.shine(false)
  },
}
