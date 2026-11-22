import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Yamato (Alt-Art, Ultra). Brief: the warrior as white wolf guardian howling frost; aurora over a
 * frozen sea. Full art, 80×112.
 *
 * Composition: the great white wolf, her guardian form, rises as a pale spirit on the right and howls
 * up into the aurora; its frost breath curls away to the upper left. Yamato stands in front of it on
 * the ice, lower left, her iron club over her shoulder, horns up, long white hair blowing out to the
 * left with its mint-green tips. Ribbons of aurora over the night sky, a frozen sea of floes below.
 * The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('050a1c', '0c1734', '1a2a54')
const AURORA = colors('17675a', '38c49a', 'a2f6c6')
const ICE = colors('2a4a7a', '5a8ac0', 'a8d0f0', 'eaf6ff')
const SKIN = colors('6a3434', 'c07a62', 'f0b894', 'ffe0c4')
const HAIR = colors('8a8098', 'd0c8d4', 'f8f4f0')
const MINT = hex('5cc8a8')
const HORN = colors('9a1a1a', 'e04a2a')
const ROPE = colors('8a3a10', 'f08a1e', 'ffc070')
const IRON = colors('14141e', '34343f', '62626e')
const OUTLINE = hex('05060e')

const HORIZON = 62

/** Yamato: red horns, white hair parted over the brow, orange eyes, a fearless grin. */
const HEAD = [
  '....y........y....',
  '....hH......Hh....',
  '.....hH....Hh.....',
  '....WWhHWWWHhWW...',
  '...WWWWWWWWWWWWW..',
  '..WWWWwWWWWWwWWWW.',
  '..WWWwWWWWWWWwWWW.',
  '.WWWwWffWWWffwWWWW',
  '.WWwWffffWffffwWWW',
  '.WWwfggffffffggwWW',
  '.WWfKKKffffffKKKWW',
  '.WwfKoeKffffKeoKwW',
  '.Wwffssffffffssfw.',
  '.WWsfffffsffffffWW',
  '.WWwsffffSSfffswWW',
  '.WWWsffmttttmffsWW',
  '.WWWwsffmmmmffswWW',
  '.WWWWsfffffffsWWW.',
  '..WWWWssffffsWWW..',
  '..WWWW..ssss..WWW.',
]
const HEAD_KEY = {
  K: OUTLINE,
  H: HORN[0],
  h: HORN[1],
  y: ROPE[2],
  W: HAIR[2],
  w: HAIR[1],
  g: HAIR[0],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  o: ROPE[1],
  e: ICE[3],
  m: HORN[0],
  t: ICE[3],
}
const HX = 13
const HY = 30

function night(p: Painter): void {
  p.register(SKY).register(AURORA).register(ICE)
  p.shine(true)
  p.dither(null, SKY, (_x, y) => Math.min(1, y / HORIZON) * 1.1, 0.7)
  stars(p, rng(21), 30, [ICE[2], ICE[3]], { x: 4, y: 14, w: 72, h: 44 })
  // aurora: two curtains with vertical rays, brightest along their lower hem
  for (let x = 0; x < 80; x++) {
    for (const [base, amp, phase, depth] of [
      [30, 6, 0, 16],
      [44, 4, 2.2, 10],
    ] as const) {
      const hem = base + amp * Math.sin(x * 0.09 + phase) + 2 * Math.sin(x * 0.27 + phase)
      for (let y = Math.floor(hem - depth); y <= hem; y++) {
        const t = 1 - (hem - y) / depth
        const ray = noise(x * 0.9, 0, 5 + phase, 2.5) * 0.7 + 0.3
        const v = t * t * ray * 3 + bayer(x, y) - 0.6
        if (v >= 0.6) p.set(x, y, AURORA[Math.min(2, Math.floor(v))] ?? AURORA[0])
      }
    }
  }
  p.shine(false)
  // frozen sea: floes of ice with dark water in the cracks, snow on their tops
  const sea = p.m().rect(0, HORIZON, 80, 50)
  p.fill(sea, SKY[1])
  const rand = rng(8)
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + 1 + Math.floor(rand() * 48)
    const x = Math.floor(rand() * 84) - 2
    const w = 6 + (y - HORIZON) * 0.4 + rand() * 6
    const floe = p
      .m()
      .poly([
        x,
        y,
        x + w,
        y - 0.5,
        x + w + 2,
        y + 2 + (y - HORIZON) * 0.06,
        x - 1,
        y + 2.5 + (y - HORIZON) * 0.06,
      ])
    p.fill(floe, ICE[1])
    p.fill(floe.facing([0, -1]), ICE[2])
  }
  p.fill(p.m().rect(0, HORIZON, 80, 1), ICE[1])
}

/** The great white wolf as a pale spirit, head thrown back, howling; below the neck it fades into mist. */
function wolf(p: Painter): void {
  const w = p.layer()
  const m = (): Mask => w.m()
  // the neck rising behind her, a fluffy ruff down the throat, fur strokes
  const neck = m().poly([54, 44, 62, 40, 74, 40, 80, 48, 82, 76, 50, 76, 47, 62])
  for (const [x, y, r] of [
    [55, 46, 4.5],
    [51, 53, 4.5],
    [49, 61, 4.5],
    [49, 69, 4],
  ] as const)
    neck.or(m().disc(x, y, r))
  w.part(neck, ICE, { bevel: 10, bias: 1 })
  for (const stroke of [
    [60, 50, 57, 60],
    [66, 48, 63, 60],
    [72, 50, 70, 62],
    [53, 50, 51, 56],
    [51, 60, 50, 66],
  ])
    w.fill(m().path(stroke).and(neck.shrunk(1)), ICE[1])
  // far ear, skull, near ear with its shaded inside
  w.part(m().poly([66, 29, 77, 13, 74, 33]), ICE, { bevel: 2 })
  w.part(m().ellipse(63, 34, 10, 8.5, -35), ICE, { bevel: 7, bias: 1 })
  const ear = m().poly([56, 27, 63, 9, 67, 29])
  w.part(ear, ICE, { bevel: 2, bias: 1 })
  w.fill(ear.shrunk(1).and(ear.moved(1, 1)), ICE[1])
  // the jaws thrown open, the long muzzle raised to the sky, a black nose
  w.part(m().limb([60, 42, 52, 35, 45, 28], [4, 3, 2]), ICE, { bevel: 2 })
  w.fill(m().poly([43, 24, 56, 32, 59.5, 37.5, 47, 30]), SKY[0])
  w.part(m().limb([62, 33, 52, 24, 42, 15.5], [6, 4.6, 3]), ICE, { bevel: 5, bias: 1 })
  w.fill(m().ellipse(42, 15.5, 2, 1.7, -40), OUTLINE)
  // the eye shut in the howl, a red mark over it
  w.fill(m().path([55, 25, 59, 27]), OUTLINE)
  w.fill(m().path([55, 23, 60, 25]), HORN[1])
  const shape = w.silhouette(OUTLINE)
  p.shine(true)
  p.blit(w)
  // below, the spirit dissolves into mist over the ice
  const mist = shape
    .clone()
    .and(p.m().rect(0, 54, 80, 58))
    .or(p.m().poly([44, 70, 82, 62, 82, 92, 40, 92]))
  p.dither(
    mist,
    [SKY[1], ICE[0], ICE[1], ICE[2], ICE[3]],
    (x, y) => (84 - y) / 30 + noise(x, y, 17, 4) * 0.35 - 0.15,
    0.9,
  )
  p.shine(false)
}

/** Frost breath billowing up out of the jaws into the aurora, glittering. */
function frost(p: Painter): void {
  p.shine(true)
  const breath = p
    .m()
    .limb([41, 14, 36, 11, 29, 11, 23, 14, 18, 19], [1.4, 2.4, 3.2, 3.4, 2.4])
    .or(p.m().blob(21, 16, 4, 2.8, 4, 0.3))
  p.dither(breath, [ICE[1], ICE[2], ICE[3]], (x, y) => 0.3 + noise(x, y, 31, 3) * 0.9, 0.5)
  for (const [x, y] of pts([36, 18, 28, 21, 19, 13, 24, 22, 16, 23, 31, 8, 41, 10, 15, 17]))
    p.px(x, y, ICE[3])
  p.shine(false)
}

function yamato(d: Painter): void {
  const m = (): Mask => d.m()
  // long white hair streaming out to the left behind her, mint at the ends
  const hair = m()
    .limb([18, 36, 12, 44, 7, 54, 5, 66, 7, 76], [6, 7, 6, 4.5, 2])
    .limb([16, 44, 10, 56, 10, 68, 13, 80], [3, 4, 3.5, 1.5])
  d.part(hair, HAIR, { bevel: 4 })
  hair.each((x, y) => {
    if (y > 66 + ((x * 3) % 5)) d.set(x, y, MINT)
  })
  for (const strand of [
    [15, 40, 9, 52, 7, 64],
    [17, 47, 12, 58, 11, 70],
  ])
    d.fill(m().path(strand).and(hair.shrunk(1)), HAIR[0])
  // pale blue trousers flaring wide, pleated
  const trousers = m().poly([16, 75, 32, 75, 38, 112, 10, 112])
  d.part(trousers, ICE, { bevel: 6 })
  for (const pleat of [
    [20, 79, 17, 98],
    [24, 79, 24, 100],
    [28, 79, 31, 98],
  ])
    d.fill(m().path(pleat).and(trousers.shrunk(1)), ICE[1])
  // white sleeveless top, crossed over at the chest, narrow at the waist
  const top = m().poly([14, 56, 19, 52, 28, 52, 33, 56, 31, 66, 30, 75, 17, 75, 16, 66])
  d.part(top, HAIR, { bevel: 5, bias: 1 })
  d.part(m().poly([20, 52, 27, 52, 23.5, 60]), SKIN, { bevel: 2 })
  d.fill(m().path([20, 52, 25, 63]).path([27, 52, 23, 59]), HAIR[0])
  // the thick orange rope round her waist, white paper strips hanging from it
  const rope = m().limb([15, 74, 24, 76, 33, 74], 2.6)
  d.part(rope, ROPE, { bevel: 2 })
  for (const x of [17, 21, 25, 29])
    d.fill(
      m()
        .path([x, 72, x + 2, 77])
        .and(rope),
      ROPE[0],
    )
  d.stamp(['w.', 'ww', '.w', 'ww', 'w.'], 20, 78, { w: ICE[3] })
  d.stamp(['.w', 'ww', 'w.', 'ww', '.w'], 27, 78, { w: ICE[3] })
  // right arm at her side, a fist; iron cuff on the wrist
  d.part(m().limb([16, 57, 13, 66, 13, 73], [2.6, 2.3, 2.1]), SKIN)
  d.part(m().rect(11.5, 68, 3.5, 3), IRON, { bevel: 1 })
  // the iron club on her left shoulder, its studded head up against the wolf
  const club = m().limb([33, 66, 38, 52, 45, 34], [1.6, 2.6, 4])
  d.part(club, IRON, { bevel: 3 })
  for (const [x, y] of pts([43, 37, 41, 42, 45, 41, 39, 47, 43, 46])) d.px(x, y, HAIR[1])
  d.part(m().limb([31, 57, 35, 63, 34, 67], [2.6, 2.3, 2.3]), SKIN)
  d.part(m().rect(32.5, 62, 3.5, 3), IRON, { bevel: 1 })
  // neck and head
  d.part(m().rect(19, 47, 7, 7), SKIN, { bevel: 3 })
  d.tone(m().rect(19, 48, 7, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

export const yamatoAlt: CardDef = {
  id: 'op01-087',
  number: 87,
  name: 'Yamato (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Grün',
  print: { cost: 5, power: 5000, type: 'Land Wano' },
  // sky, aurora, the wolf spirit and the frost shine; Yamato and the ice stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    wolf(p)
    frost(p)
    const d = p.layer()
    yamato(d)
    p.subject(d, OUTLINE)
  },
}
