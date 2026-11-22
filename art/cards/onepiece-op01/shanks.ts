import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, pts, rng, sparks, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Shanks (Alt-Art, Ultra). Brief: captain raising his sake cup in a toast, crew silhouettes; bonfire
 * beach at night. Full art, 80×112.
 *
 * Composition: Shanks stands in the middle, laughing, and raises a red sake dish high with his one
 * arm; sake splashes over the rim. The bonfire burns in the lower left and lights him from that side.
 * Behind him his crew toasts along: Lucky Roux, round, lifting a meat on the bone on the left; Benn
 * Beckman, tall with his rifle, black against a low full moon on the right. Night sky, stars, a calm
 * sea. The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('0b0a1f', '17163a', '2a2155', '46306e')
const MOON = colors('b8b0d8', 'fff2c8')
const SAND = colors('2a1a26', '553429', '8a5534')
const FIRE = colors('8a1c10', 'd8401a', 'f88a24', 'ffd04a', 'fff6c8')
const SKIN = colors('6e2e2a', 'b8644a', 'e8a07a', 'ffd4aa')
const HAIR = colors('4a0c14', '8e1622', 'c8282c', 'f05a3a')
const CLOAK = colors('0c0a14', '1e1a2c', '38304a')
const SHIRT = colors('5a5678', '9894b0', 'd8d4e2', 'fffaf2')
const OUTLINE = hex('120812')

const HORIZON = 52

/**
 * Shanks laughing, nearly frontal, turned a little towards the fire: red hair, three scars over the
 * left eye (dark marks above the brow, across it and below the eye), eyes shut with laughter.
 */
const HEAD = [
  '.....RRRRRRR......',
  '...RRrrrrrrrRR....',
  '..RrrooorrrrrrR...',
  '.RrooorrrrRrrrrR..',
  '.RrorrrrRRrrrrrrR.',
  'RrrrrrRRrrRRrrrrR.',
  'RrrrRRfffRffRRrrrR',
  'RrrRfffffccfcRrrR.',
  'RrRfffffffcfcfcRrR',
  'RrRfHHHffcHcHcfRrR',
  'RrRfffffffcfcfcRrR',
  'RrRffKKffffKKffsRR',
  'RrsfKffKfffKffKsRR',
  'RRsffffffsfcfcfcRR',
  '.RsffffffSScfcfsR.',
  '.RsfmmmmmmmmmffsR.',
  '.RsfmtttttttmfsR..',
  '..sfmmrrrrrmmfs...',
  '..ssfmmmmmmmffs...',
  '...ssffffffffs....',
  '....ssfSSSfss.....',
  '.....sssssss......',
  '......sssss.......',
]
const HEAD_KEY = {
  H: HAIR[0],
  R: HAIR[1],
  r: HAIR[2],
  o: HAIR[3],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  c: SKIN[0],
  K: OUTLINE,
  m: HAIR[0],
  t: SHIRT[3],
}
const HX = 38
const HY = 15

function background(p: Painter): void {
  // night sky, lighter and violet towards the horizon; stars
  p.shine(true)
  p.dither(null, SKY, (x, y) => Math.pow(y / HORIZON, 1.6) + noise(x, y, 3, 9) * 0.12 - 0.06, 0.7)
  stars(p, rng(5), 26, [MOON[0], MOON[1]], { x: 4, y: 14, w: 72, h: 30 })
  // a low full moon on the right, its light on the water
  const moon = p.m().disc(66, 38, 7.5)
  p.fill(moon.grown(1), SKY[3])
  p.fill(moon, MOON[1])
  p.fill(moon.clone().minus(moon.moved(-2, -1)), MOON[0])
  p.shine(false)
  // sea
  const sea = p.m().rect(0, HORIZON, 80, 10)
  p.dither(sea, [SKY[2], SKY[1], SKY[0]], (_x, y) => (y - HORIZON) / 9, 0.6)
  p.shine(true)
  const rand = rng(9)
  for (let i = 0; i < 18; i++) {
    const y = HORIZON + 1 + Math.floor(rand() * 8)
    const x = 58 + Math.floor((rand() - 0.5) * (6 + (y - HORIZON) * 2))
    p.fill(p.m().rect(x, y, 2 + Math.floor(rand() * 3), 1), rand() < 0.5 ? MOON[0] : MOON[1])
  }
  p.shine(false)
  // beach: dark sand, warm where the fire reaches
  const beach = p.m().poly([0, 61, 30, 60, 80, 62, 80, 112, 0, 112])
  p.dither(
    beach,
    SAND,
    (x, y) => Math.max(0, 1 - Math.hypot(x - 18, (y - 84) * 1.6) / 40) + noise(x, y * 2, 7, 4) * 0.15,
    0.6,
  )
  p.fill(beach.facing([0, -1]), SKY[3])
}

/** The crew, black against the sea and the moon, rimmed by the fire. */
function crew(p: Painter): void {
  const m = (): Mask => p.m()
  // Benn Beckman: tall, his head black against the moon, rifle over the shoulder, cigarette glowing
  const benn = m()
    .ellipse(66.5, 38.5, 3, 3.6)
    .poly([68.5, 35, 71, 36.5, 69, 39])
    .rect(65, 41, 3, 3)
    .poly([61, 44, 73, 44, 75, 72, 60, 72])
    .limb([62, 46, 59, 54, 60, 60], 2)
    .path([60, 58, 76, 26])
    .path([61, 58, 77, 26])
  // Lucky Roux: round as a barrel, lifting a meat on the bone
  const roux = m().ellipse(11, 66, 10, 11).disc(11, 52, 4.5).limb([4, 60, 2, 50, 5, 44], 2.3)
  const meat = m().ellipse(6, 40, 3.8, 2.8, -35)
  // a third mate further back, mug raised
  const mate = m().ellipse(27, 53, 2, 2.4).poly([24, 56, 30, 56, 31, 64, 23, 64]).limb([29, 57, 31, 51], 1.2)
  for (const s of [benn, roux, mate]) p.fill(s, CLOAK[0])
  p.fill(meat, SAND[1])
  p.fill(meat.facing([1, 0, 0, 1]), FIRE[0])
  p.fill(meat.facing([-1, 0, 0, -1]), SAND[2])
  p.stamp(['ww', 'w.'], 8, 36, { w: SHIRT[3] })
  p.stamp(['.w', 'ww'], 2, 43, { w: SHIRT[3] })
  // the fire rims their sides that face it
  p.fill(roux.facing([1, 0]).and(m().rect(14, 46, 10, 30)), FIRE[1])
  p.fill(mate.facing([-1, 0]), FIRE[0])
  p.fill(p.m().rect(62, 40, 2, 1), SHIRT[2])
  p.px(61, 40, FIRE[3])
}

function bonfire(p: Painter): void {
  // logs, then the flames, sparks rising
  p.fill(p.m().limb([8, 88, 28, 82], 1.8).limb([10, 82, 29, 88], 1.8), SAND[0])
  p.fill(p.m().path([9, 87, 27, 81.5]).path([11, 82, 28, 87]), SAND[2])
  p.shine(true)
  fire(p, flameMask(p, 18.5, 86, 16, 26, { lean: 2, tongues: 3, seed: 6 }), FIRE, { dy: 1, step: 1.4 })
  sparks(p, rng(4), 22, [FIRE[2], FIRE[3]], { x: 8, y: 40, w: 22, h: 24 })
  p.shine(false)
}

function captain(d: Painter): void {
  const m = (): Mask => d.m()
  // black cloak over both shoulders, flaring out; the left side hangs empty
  d.part(m().poly([36, 44, 44, 41, 52, 41, 58, 44, 66, 66, 69, 90, 70, 112, 26, 112, 28, 80, 31, 62]), CLOAK)
  // white shirt, open over the chest, pulled up by the raised arm; sash below
  const shirt = m().poly([38, 44, 44, 41, 52, 41, 56, 45, 56, 70, 55, 112, 38, 112, 37, 70])
  d.part(shirt, SHIRT, { bevel: 5 })
  d.part(m().poly([43, 40, 51, 40, 47.5, 56]), SKIN, { bevel: 3 })
  d.fill(m().path([43, 41, 47, 55]).path([51, 41, 48, 55]), SHIRT[1])
  for (const fold of [
    [39, 49, 46, 60],
    [39, 55, 49, 66],
    [40, 63, 47, 72],
    [53, 58, 52, 74],
  ])
    d.fill(m().path(fold).and(shirt.shrunk(1)), SHIRT[1])
  const sash = m().poly([37, 80, 56, 78, 56, 85, 37, 87])
  d.part(sash, HAIR, { bevel: 2 })
  d.fill(m().path([38, 83, 55, 81]).and(sash), HAIR[1])
  // the cloak's front over the left shoulder, a fold catching the moonlight
  const front = m().poly([53, 41, 59, 43, 64, 52, 66, 70, 64, 90, 66, 112, 54, 112, 55, 84, 56, 62, 55, 48])
  d.part(front, CLOAK)
  d.fill(m().path([59, 50, 62, 66, 60, 88]).and(front.shrunk(1)), CLOAK[2])
  // raised right arm: sleeve to the elbow, the forearm bare, the fist under the dish
  d.part(m().limb([39, 47, 33, 43, 28.5, 39], [3.8, 3.4, 3.2]), SHIRT)
  d.part(m().limb([28.5, 39, 31, 41], 3.3), SHIRT, { bias: -1 })
  d.part(m().limb([28, 38, 26, 31, 25.5, 27], [2.4, 2.2, 2]), SKIN)
  d.part(m().ellipse(25.5, 25.5, 2.8, 2.6), SKIN, { bevel: 2 })
  d.fill(m().path([24, 25, 27, 24]), SKIN[1])
  // neck and head
  d.part(m().rect(43, 35, 8, 7), SKIN, { bevel: 3 })
  d.tone(m().rect(43, 36, 8, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

/** The red lacquer sake dish, seen from below as he lifts it, sake splashing over the rim. */
function sake(p: Painter): void {
  const dish = p.m().ellipse(25, 21.5, 7, 2.4, -8)
  p.fill(dish.outerEdge(), OUTLINE)
  p.fill(dish, HAIR[1])
  p.fill(dish.clone().minus(dish.moved(0, -1)), HAIR[0])
  p.fill(dish.clone().minus(dish.moved(0, 1)), HAIR[3])
  p.fill(p.m().rect(23, 23, 4, 1).and(dish), HAIR[2])
  p.shine(true)
  const splash = p.m().ellipse(20, 18.5, 3, 1.3, -20).ellipse(29, 18.8, 2.2, 1, 15)
  p.fill(splash, MOON[1])
  for (const [x, y] of pts([16, 17, 14, 15, 18, 15, 22, 16, 31, 16, 33, 17, 25, 15])) p.px(x, y, FIRE[4])
  p.shine(false)
}

export const shanks: CardDef = {
  id: 'op01-088',
  number: 88,
  name: 'Shanks (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Rot',
  print: { cost: 9, power: 10000, type: 'Rothaar-Piraten' },
  // sky, stars, moon, the moonlight on the water, the fire and its sparks shine; the people stay matt
  foil: 'painted',
  draw(p) {
    background(p)
    crew(p)
    bonfire(p)
    const d = p.layer()
    captain(d)
    // the fire lights the side of him that faces it
    d.tone(
      d
        .mask()
        .facing([-1, 0])
        .and(d.m().rect(0, 30, 50, 60)),
      1,
    )
    p.subject(d, OUTLINE)
    sake(p)
  },
}
