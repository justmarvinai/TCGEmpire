import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Nami (Leader, Alt-Art, Ultra, Blue). Brief: the navigator riding her sea chart through the sky,
 * making weather with her Clima-Tact. Full art, 80×112.
 *
 * Composition: high above a sea of small islands, Nami sits on a giant unrolled sea chart that floats
 * like a magic carpet, her long orange hair streaming out behind her. In her blue-and-white striped
 * shirt and orange skirt she winks and flashes a peace sign, and raises her Clima-Tact: a little rain
 * cloud springs from the orb at its tip, and from the cloud a rainbow arcs across the whole sky
 * behind her. A compass rose and coastlines are drawn on the chart. The frame covers the outer 4
 * pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('1e56b0', '2e78d6', '5aa6ec', '96d0f8', 'd8f0ff')
const CLOUD = colors('a8c8ec', 'ffffff')
const RAIN = hex('7a8cb0')
const ISLE = colors('2e7a3a', '72b84a')
const CHART = colors('a8865a', 'e6cfa0', 'fbefd2')
const INK = hex('6a4a2a')
const SKIN = colors('6a2e2a', 'c07050', 'f0a880', 'ffd8b8')
const HAIR = colors('a8401a', 'e8742a', 'ffa848')
const VIOLET = hex('9a4a84')
const RED = hex('d22c3a')
const BLUSH = hex('f47a80')
const NAVY = colors('142450', '22408a')
const LEATHER = colors('4a2618', '8a5232')
const BRASS = colors('d0882a', 'f8d460')
const SHIRT = [SKY[2], CLOUD[0], CLOUD[1]] as const
const OUTLINE = hex('0c1634')
const RAINBOW = [RED, BRASS[0], BRASS[1], ISLE[1], SKY[1], VIOLET]
/** The Clima-Tact: slender pale blue rods. */
const ROD = [NAVY[0], NAVY[1], SKY[2], SKY[3]] as const
/** Colours of the rain cloud over her staff and its rain, for the booster wrapper's cut-out. */
export const RAINCLOUD = [RAIN, CLOUD[0], OUTLINE, SKY[4]]

/** Nami's face: orange bangs, one eye open with a glint, the other shut in a wink, blush, a wide laugh. */
const FACE = [
  '.hHHhhHHhhhh..',
  'hhHhhhhhhhhhh.',
  'hFFFhffhffhfsh',
  'FFfffffffffffs',
  'FffKwffffKKffs',
  'fffKKfffKffKfs',
  'fffKKffffffffs',
  'fppffffSffppfs',
  '.fffffffffffs.',
  '.ffffmmmmmffs.',
  '..fffmtttmfss.',
  '...ffffffsss..',
  '.....ssss.....',
]
const FACE_KEY = {
  h: HAIR[1],
  H: HAIR[2],
  F: SKIN[3],
  f: SKIN[2],
  s: SKIN[1],
  S: SKIN[0],
  K: OUTLINE,
  w: CLOUD[1],
  p: BLUSH,
  m: SKIN[0],
  t: RED,
}
const FX = 26
const FY = 30

/** The peace sign: two fingers up, thumb folded over the others. */
const PEACE = ['f.f.', 'f.f.', 'fsf.', 'ffff', 'ffFs', '.ss.']

const SEA_AT = 58

function sky(p: Painter): void {
  p.register(SKY)
  p.dither(p.m().rect(0, 0, 80, SEA_AT), SKY, (x, y) => 0.15 + (y / SEA_AT) * 0.8 + (noise(x, y, 2, 10) - 0.5) * 0.12, 0.7)
  // the sea far below: deep blue, small islands with sandy rims, haze over the horizon
  const sea = p.m().rect(0, SEA_AT, 80, 112 - SEA_AT)
  p.dither(sea, [SKY[0], SKY[1], SKY[2]], (_x, y) => 0.9 - (y - SEA_AT) / 30, 0.6)
  for (const [x, y, rx, ry, seed] of [
    [58, 82, 7, 2.4, 3],
    [76, 60, 4, 1.2, 5],
    [36, 86, 4, 1.4, 7],
    [3, 61, 4, 1.2, 9],
    [70, 76, 3, 1, 11],
  ] as const) {
    const isle = p.m().blob(x, y, rx, ry, seed)
    p.fill(isle.grown(1), CHART[2])
    p.fill(isle, ISLE[0])
    p.fill(isle.clone().minus(isle.moved(0, -1)), ISLE[1])
  }
  p.fill(p.m().rect(0, SEA_AT, 80, 1), SKY[3])
  p.fill(p.m().rect(0, SEA_AT + 1, 80, 1), SKY[2])
  // white clouds drifting at our height
  for (const [x, y, rx, ry, seed] of [
    [8, 50, 12, 5, 21],
    [76, 46, 10, 4.5, 22],
    [78, 90, 12, 5, 23],
    [8, 86, 13, 6, 24],
  ] as const)
    cloud(p, x, y, rx, ry, seed)
}

function cloud(p: Painter, x: number, y: number, rx: number, ry: number, seed: number): void {
  const puff = p
    .m()
    .blob(x, y, rx, ry, seed, 0.25)
    .or(p.m().disc(x - rx * 0.35, y - ry * 0.6, ry * 0.9))
    .or(p.m().disc(x + rx * 0.25, y - ry * 0.8, ry * 1.05))
  p.fill(puff, CLOUD[1])
  p.fill(puff.clone().minus(puff.moved(1, -2)), CLOUD[0])
}

/** The rainbow springing from the rain cloud, arcing across the sky behind her. */
function rainbow(p: Painter): void {
  p.shine(true)
  RAINBOW.forEach((c, i) => {
    const outer = 56 - i * 2
    const band = p.m().disc(40, 76, outer).minus(p.m().disc(40, 76, outer - 2)).and(p.m().rect(0, 0, 62, SEA_AT))
    p.fill(band, c)
  })
  p.shine(false)
}

/** The Clima-Tact: three pale blue rods joined by brass sleeves, the weather orb at its tip. */
function staff(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().limb([46, 58, 54, 45, 60, 34], 1.3), ROD, { bevel: 1 })
  for (const [x, y] of [
    [50, 51.5],
    [55.5, 42.5],
  ] as const)
    d.part(m().ellipse(x, y, 1.8, 1.8), BRASS, { bevel: 1, line: 'none' })
  const orb = m().disc(61.5, 30.5, 3.6)
  d.part(orb, [NAVY[1], SKY[1], SKY[3], CLOUD[1]], { bevel: 3 })
  d.px(60, 29, CLOUD[1])
}

function raincloud(p: Painter): void {
  p.shine(true)
  const rand = rng(5)
  for (let i = 0; i < 12; i++) {
    const x = 64 + Math.floor(rand() * 11)
    const y = 24 + Math.floor(rand() * 10)
    p.fill(p.m().rect(x, y, 1, 2), SKY[4])
  }
  const puff = p.m().blob(66, 21, 9, 3.6, 31, 0.2).or(p.m().disc(62, 19, 3.8)).or(p.m().disc(68.5, 18, 4))
  p.fill(puff.grown(1), OUTLINE)
  p.fill(puff, RAIN)
  p.fill(puff.clone().minus(puff.moved(1, -2)), CLOUD[0])
  p.shine(false)
}

/** The sea chart, floating like a carpet: rolled ends, a compass rose, coastlines and a route. */
function chart(d: Painter): void {
  const m = (): Mask => d.m()
  const sheet = m().poly([10, 61, 71, 55, 74, 67, 6, 75])
  d.part(sheet, CHART, { bevel: 3 })
  // coastlines and a dotted route
  d.fill(m().path([12, 70, 16, 66, 21, 68]).path([58, 59, 61, 62, 67, 60]), INK)
  for (let i = 0; i < 5; i++) d.px(44 + i * 3, 69 - i * 1.6, RED)
  // compass rose
  const cx = 62
  const cy = 64
  d.fill(m().poly([cx, cy - 4.5, cx + 1.2, cy, cx, cy + 4.5, cx - 1.2, cy]).poly([cx - 5.5, cy, cx, cy - 1, cx + 5.5, cy, cx, cy + 1]), INK)
  d.fill(m().poly([cx, cy - 4.5, cx + 1.2, cy, cx - 1.2, cy]), RED)
  // rolled ends
  d.part(m().limb([10, 60, 6, 75], 2.2), CHART, { bevel: 2 })
  d.part(m().limb([71, 54, 74, 67], 2.2), CHART, { bevel: 2 })
}

function nami(d: Painter): void {
  const m = (): Mask => d.m()
  // long orange hair streaming out behind her in the wind
  const hair = m()
    .ellipse(33, 31, 9, 8)
    .limb([30, 31, 23, 38, 17, 46, 13, 55, 8, 61], [7, 7, 6, 4.5, 2])
    .limb([27, 40, 21, 50, 18, 58], [4, 3.4, 1.6])
  d.part(hair, HAIR, { bevel: 4 })
  for (const strand of [
    [26, 34, 19, 43, 14, 53],
    [28, 38, 22, 47, 17, 56],
    [24, 33, 17, 40, 12, 48],
  ])
    d.fill(m().path(strand).and(hair.shrunk(1)), HAIR[0])
  // legs swinging over the chart's front edge, laced boots
  d.part(m().limb([29, 66, 27, 74, 25, 81], [3, 2.6, 2.3]), SKIN)
  d.part(m().limb([36, 66, 39, 73, 43, 79], [3, 2.6, 2.3]), SKIN)
  d.part(m().ellipse(25, 82, 2.6, 3.2).ellipse(44, 80, 3.2, 2.6, -30), LEATHER, { bevel: 1.5 })
  d.fill(m().rect(24, 80, 3, 1).rect(43, 78, 2, 1), CHART[0])
  // orange skirt on the edge of the chart
  d.part(m().poly([25, 58, 39, 58, 42, 67, 34, 69, 24, 68]), HAIR, { bevel: 3 })
  // white shirt with blue stripes
  const shirt = m().poly([25, 44, 38, 44, 40, 52, 39, 61, 25, 61, 23, 52])
  d.part(shirt, SHIRT, { bevel: 4 })
  d.fill(
    shirt.clone().and(
      m()
        .rect(0, 48, 80, 1)
        .rect(0, 52, 80, 1)
        .rect(0, 56, 80, 1),
    ),
    NAVY[1],
  )
  // arms: the right one up beside the face with a peace sign, the left one raising the Clima-Tact
  d.part(m().limb([25, 46, 19, 47, 18, 40], [2.6, 2.2, 2]), SKIN, { bias: -1 })
  d.part(m().limb([18, 41, 19, 36], 1.8), SKIN)
  d.stamp(PEACE, 17, 30, { f: SKIN[2], F: SKIN[3], s: SKIN[1] })
  d.part(m().limb([38, 46, 44, 47, 48, 51], [2.6, 2.2, 2]), SKIN)
  d.part(m().ellipse(51, 48.5, 2.2, 2), SKIN, { bevel: 1.5 })
  // neck, a lock of hair falling in front of each shoulder
  d.part(m().rect(30, 40, 6, 5), SKIN, { bevel: 2 })
  d.tone(m().rect(30, 41, 6, 2), -1)
  d.part(m().limb([26, 36, 25, 42, 24, 47], [2.2, 2, 1.2]).limb([40, 36, 41, 42, 42, 46], [2.2, 2, 1.2]), HAIR, { bevel: 2 })
  d.stamp(FACE, FX, FY, FACE_KEY)
}

export const namiLeader: CardDef = {
  id: 'op03-085',
  number: 85,
  name: 'Nami (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Blau',
  print: { life: 5, power: 5000, type: 'East Blue' },
  // the rainbow and the rain cloud shine; Nami, her chart and the sky stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    rainbow(p)
    raincloud(p)
    const d = p.layer()
    chart(d)
    staff(d)
    nami(d)
    p.subject(d, OUTLINE)
  },
}
