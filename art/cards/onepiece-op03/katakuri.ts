import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, rays, rng, sparks } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Charlotte Katakuri (Alt-Art, Ultra, Yellow). Brief: Katakuri in battle with his mochi and his
 * trident. Full art, 80×112.
 *
 * Composition: under a golden sky Katakuri stands with his feet planted, his fur-trimmed scarf up over
 * his mouth again, eyes blazing gold under his spiky maroon hair. His right hand swings his trident
 * overhead; his left reaches out, and a tower of white mochi answers it, rising up beside him from
 * the ground. His dark coat flares open over his bare chest. Behind him the skyline of a candy
 * island: tiered cake towers, frosted domes and lollipop trees in warm silhouette, light bursting
 * from behind. The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('8a3a10', 'c8641a', 'f09a2a', 'f8c848', 'fff0a0')
const TOWN = colors('4a2026', '7a3a3e', 'b0606a')
const CANDY = hex('f0a0b0')
/** Colours of the mochi tower and its splashes, also cut out for the booster wrapper. */
export const CREAM = colors('c8a888', 'f0e2c8', 'fffdf6')
const SKIN = colors('5a2a24', 'a8603e', 'e09a6a', 'f8c898')
const LEATHER = colors('141018', '2e2632', '4e4458')
const COAT = colors('3a0c16', '6a1a28', '9a2a3a')
const GOLD = [hex('9a6a1c'), hex('e8b83a'), SKY[4]] as const
const STEEL = colors('4e5a70', 'a8b4c8', 'eef4ff')
const OUTLINE = hex('140a0c')

/** His face in battle above the scarf: brows drawn down, eyes blazing gold. */
const FACE = [
  '..ffffffffffffffffff..',
  '.fffffffffffffffffffs.',
  '.fKKKffffffffffffKKKs.',
  '.ffKKKKKffffffKKKKKss.',
  'sffffKKKKffffKKKKffssS',
  'fffwYYKfffffffKYYwfssS',
  'fffffffffFFffffffffssS',
  'fffffffffFffffffffsssS',
  'ffffffffffsffffffffssS',
]
const FACE_KEY = {
  f: SKIN[2],
  F: SKIN[3],
  s: SKIN[1],
  S: SKIN[0],
  K: OUTLINE,
  w: STEEL[2],
  Y: SKY[4],
}
const FX = 26
const FY = 26

function sky(p: Painter): void {
  p.register(SKY)
  p.shine(true)
  p.dither(null, SKY, (x, y) => 0.25 + (y / 112) * 0.75 + Math.max(0, 0.5 - Math.hypot(x - 40, y - 70) / 90), 0.7)
  // light bursting up from behind the island
  const burst = rays(p, 40, 74, 14, 0.01).and(p.m().rect(0, 0, 80, 74))
  const near = p.m()
  burst.each((x, y) => {
    if (Math.hypot(x - 40, y - 74) + bayer(x, y) * 12 < 58) near.add(x, y)
  })
  p.tone(near, 1)
  sparks(p, rng(9), 26, [SKY[4], CREAM[2]], { x: 4, y: 14, w: 72, h: 50 })
  p.shine(false)
}

/** The candy island's skyline: tiered cakes, frosted domes on towers, lollipop trees. */
function skyline(p: Painter): void {
  const m = (): Mask => p.m()
  const back = m()
    .rect(0, 74, 80, 40)
    .rect(2, 58, 9, 16)
    .ellipse(6.5, 58, 6, 4)
    .rect(64, 54, 10, 20)
    .ellipse(69, 54, 7, 5)
    .rect(68, 44, 2, 6)
    .rect(14, 64, 12, 10)
    .rect(16, 58, 8, 6)
    .rect(18, 54, 4, 4)
    .rect(52, 62, 12, 12)
    .rect(54, 57, 8, 5)
  p.fill(back, TOWN[1])
  p.fill(back.facing([0, -1]), TOWN[2])
  // frosting drips along the tops and a few lit windows
  for (const [x, y] of [
    [3, 61],
    [8, 61],
    [15, 66],
    [22, 66],
    [53, 64],
    [60, 64],
    [65, 57],
    [72, 57],
  ] as const)
    p.fill(m().rect(x, y - 1, 1, 2), CANDY)
  for (const [x, y] of [
    [5, 66],
    [19, 68],
    [57, 67],
    [68, 62],
  ] as const)
    p.fill(m().rect(x, y, 2, 2), SKY[4])
  // lollipop trees
  for (const [x, y, r] of [
    [32, 66, 3.5],
    [48, 64, 4],
    [77, 64, 3],
  ] as const) {
    p.fill(m().rect(x, y, 1, 74 - y), TOWN[2])
    const pop = m().disc(x + 0.5, y, r)
    p.fill(pop, CANDY)
    p.fill(m().path([x - r + 1, y, x + 0.5, y - r + 1, x + r, y]).and(pop), TOWN[2])
  }
  // a sugar-pink plaza in front of the town, striped towards us
  p.fill(m().rect(0, 74, 80, 1), TOWN[2])
  p.dither(m().rect(0, 76, 80, 36), [TOWN[1], TOWN[2], CANDY], (x, y) => 0.35 + (y - 76) / 40 + (((x - 40) * 6) / (y - 66) > 0 ? 0 : 0) + ((Math.floor(((x - 40) * 8) / (y - 64)) & 1) === 0 ? 0.25 : 0), 0.3)
}

/**
 * The mochi answering his hand: a tower of soft white dough rising behind him on the right, roll on
 * roll, its tip curling over; splashes of mochi round his boots.
 */
function meringue(p: Painter): void {
  const m = (): Mask => p.m()
  p.shine(true)
  const tiers: [number, number, number, number][] = [
    [64, 84, 16, 7],
    [66, 72, 14, 6.5],
    [63, 61, 12, 6],
    [66, 51, 10, 5.4],
    [64, 42, 8, 4.8],
    [66, 34, 6, 4.2],
  ]
  for (const [x, y, rx, ry] of tiers) {
    const tier = m().ellipse(x, y, rx, ry)
    p.fill(tier.outerEdge(), CREAM[0])
    p.fill(tier, CREAM[1])
    p.fill(tier.clone().minus(tier.moved(-1, -2)), CREAM[0])
    p.fill(tier.clone().minus(tier.moved(1, 2)), CREAM[2])
    p.fill(m().path([x - rx + 3, y + 1, x - 1, y + ry - 1.5, x + rx - 4, y + 1]).and(tier.shrunk(1)), CREAM[0])
  }
  // the tip, curling over towards him
  const tip = m().limb([66, 31, 65, 25, 61, 21, 57, 23, 58, 26], [3.6, 2.8, 2.2, 1.6, 1.1])
  p.fill(tip.outerEdge(), CREAM[0])
  p.fill(tip, CREAM[1])
  p.fill(tip.clone().minus(tip.moved(1, 1)), CREAM[2])
  // splashes round his feet, droplets in the air
  for (const [x, y, rx, ry] of [
    [14, 90, 9, 3.4],
    [40, 92, 7, 2.6],
  ] as const) {
    const splash = m().ellipse(x, y, rx, ry)
    p.fill(splash.outerEdge(), CREAM[0])
    p.fill(splash, CREAM[1])
    p.fill(splash.clone().minus(splash.moved(0, 1)), CREAM[2])
  }
  for (const [x, y] of [
    [48, 30],
    [74, 22],
    [52, 44],
    [8, 80],
    [26, 84],
  ] as const)
    p.stamp(['.c.', 'cCc', '.c.'], x - 1, y - 1, { c: CREAM[1], C: CREAM[2] })
  p.shine(false)
}

function katakuri(d: Painter): void {
  const m = (): Mask => d.m()
  // the scarf's long ends streaming out behind him in the wind
  d.part(m().limb([46, 42, 54, 38, 62, 36, 70, 30, 76, 28], [3.4, 3.2, 3, 2.6, 2.2]), COAT, { bevel: 2, bias: -1 })
  d.fill(m().rect(72, 26, 4, 2), CREAM[1])
  // legs planted wide in dark trousers and heavy boots
  d.part(m().limb([33, 70, 28, 80, 24, 88], [5, 4.6, 4.2]), LEATHER, { bias: 1 })
  d.part(m().limb([47, 70, 52, 80, 56, 88], [5, 4.6, 4.2]), LEATHER, { bias: 1 })
  d.part(m().ellipse(23, 88, 6, 3.4).ellipse(57, 88, 6, 3.4), LEATHER, { bevel: 2 })
  // the dark leather coat flaring open at the hem over his bare chest
  const coat = m().poly([22, 48, 30, 43, 50, 43, 58, 48, 60, 60, 66, 78, 54, 76, 46, 66, 34, 66, 26, 76, 14, 78, 20, 60])
  d.part(coat, LEATHER, { bevel: 9 })
  d.part(m().poly([32, 44, 48, 44, 45, 66, 35, 66]), SKIN, { bevel: 5 })
  d.fill(m().path([40, 50, 40, 64]).path([35, 55, 39, 57]).path([41, 57, 45, 55]), SKIN[1])
  d.fill(m().path([32, 44, 35, 66]).path([48, 44, 45, 66]), GOLD[1])
  d.part(m().rect(27, 62, 26, 4), LEATHER, { bevel: 1, bias: 1 })
  d.fill(m().rect(38, 62, 4, 4), GOLD[1])
  // the left arm reaching out to the mochi, fingers spread
  d.part(m().limb([56, 50, 63, 52, 69, 47], [5.4, 4.6, 4]), SKIN)
  d.part(m().rect(66, 44, 3, 7), LEATHER, { bevel: 1 })
  d.part(m().ellipse(72, 46, 3.4, 3), SKIN, { bevel: 2 })
  d.part(m().limb([73, 44, 76, 40], 1).limb([74, 46, 78, 44], 1).limb([72, 43, 73, 39], 1), SKIN, { bevel: 1 })
  // the right arm up, gripping the trident
  d.part(m().limb([24, 50, 17, 44, 14, 35], [5.4, 4.6, 4]), SKIN, { bias: -1 })
  d.part(m().rect(11, 37, 7, 3), LEATHER, { bevel: 1 })
  // head with spiky maroon hair, ears
  d.part(m().ellipse(37, 30, 12.5, 12.5), SKIN, { bevel: 7 })
  d.part(m().ellipse(24, 33, 2, 3.2).ellipse(50, 33, 2, 3.2), SKIN, { bevel: 1.5 })
  const hair = m().ellipse(37, 22, 12.5, 6)
  for (const [x, y] of [
    [32, 8],
    [37, 6],
    [42, 8],
    [27, 13],
    [47, 14],
    [23, 19],
    [52, 20],
  ] as const)
    hair.limb([37, 21, x, y], [4, 0.6])
  d.part(hair, COAT, { bevel: 3, bias: 1 })
  d.fill(m().path([36, 20, 32, 11]).path([37, 19, 37, 10]).path([38, 20, 42, 11]).path([33, 22, 27, 16]).path([41, 22, 47, 17]), COAT[0])
  d.stamp(FACE, FX, FY, FACE_KEY)
  // the scarf wound up over his mouth, fur along its upper edge
  const wrap = m().limb([22, 40, 30, 39, 37, 39.5, 44, 39, 52, 40], [4.2, 4.6, 4.8, 4.6, 4.2]).or(m().ellipse(37, 44, 13, 4))
  d.part(wrap, COAT, { bevel: 4 })
  d.fill(m().path([28, 41, 32, 44]).path([36, 40, 38, 45]).path([44, 40, 47, 43]).and(wrap.shrunk(1)), COAT[0])
  const fur = wrap.facing([0, -1])
  d.fill(fur.or(fur.moved(0, 1).and(wrap)), CREAM[1])
  d.fill(fur.and(m().rect(0, 0, 37, 112)), CREAM[2])
}

/** The trident: a long dark shaft through his fist, three prongs above his head. */
function trident(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().limb([5, 66, 14, 36, 19, 17], 1.4), LEATHER, { bevel: 1 })
  const fork = m()
    .limb([15, 20, 19, 17, 25, 15], 1.2)
    .limb([15, 20, 15, 13, 16, 9], [1.2, 1, 0.6])
    .limb([19, 17, 19.5, 10, 20, 5], [1.4, 1.1, 0.6])
    .limb([25, 15, 27, 9, 28, 6], [1.2, 1, 0.6])
  d.part(fork, LEATHER, { bevel: 1, bias: 1 })
  d.fill(fork.facing([-1, 0]).and(m().rect(0, 0, 40, 16)), STEEL[1])
  d.part(m().ellipse(14.5, 36, 3.4, 3.2), SKIN, { bevel: 2 })
}

export const katakuriAlt: CardDef = {
  id: 'op03-088',
  number: 88,
  name: 'Charlotte Katakuri (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Gelb',
  print: { cost: 8, power: 8000, type: 'Big-Mom-Piraten' },
  // the golden sky, its burst and sparks, and the towering mochi shine; Katakuri stays matt
  foil: 'painted',
  draw(p) {
    sky(p)
    skyline(p)
    meringue(p)
    const d = p.layer()
    katakuri(d)
    trident(d)
    p.subject(d, OUTLINE)
  },
}
