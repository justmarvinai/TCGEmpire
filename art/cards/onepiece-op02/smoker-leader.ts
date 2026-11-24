import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Smoker (Leader, Alt-Art, Ultra). Brief: side-on, exhaling, two cigars clenched, the seastone jitte
 * resting on his shoulder, his legs dissolving into smoke; the smoke coils round him as a white
 * serpent; rainy harbour at night, lamp reflections on wet planks. Full art, 80×112.
 *
 * Composition: Smoker stands side-on, facing right, his jitte over his shoulder, its seastone tip
 * high on the left. The smoke from his two cigars streams forward and becomes a white serpent that
 * rears up on the right with open jaws; its body loops round his waist and down into the smoke his
 * legs dissolve into. Cold rain slants across a black harbour, two lamps burn ice-white and lay their
 * reflections on the wet planks. The only warm pixels are the cigar tips. The frame covers the outer
 * 4 pixels and its plates rows 1–13 and 90–108.
 */
const NIGHT = colors('06080e', '0c101a', '141a28', '202a3c')
const RAIN = colors('3e5a80', '7aa0cc')
const LAMP = colors('c8e4ff', 'f4faff')
const SMOKE = colors('585c68', '8c909c', 'c0c4cc', 'eceef2')
const SKIN = colors('3a2a30', '7e6062', 'bc9a8e', 'e2c4b4')
const IRON = colors('1a1a22', '34363f', '5a5e6a')
const CIGAR = colors('4a4040', '7a6a62')
const EMBER = colors('ff8a3a', 'ffd27a')
const COAT = colors('2a2e3a', '444a5a', '646c80', '8a94a8')
const OUTLINE = hex('04050a')

const HORIZON = 70

/** Smoker in profile, facing right: white hair swept back, a scowling brow, a heavy jaw. */
const HEAD = [
  '......HHhhh...........',
  '....HhhhwwwwhH........',
  '...HhhwwwwwwwwhH......',
  '..HhhhhhhhhwwwwhH.....',
  '.HhhhhhhhhhhhhhhhF....',
  '.hhhhhhhhhhhhhFFFff...',
  '..hhhhhhhhhhFFfffffs..',
  '..hhhhhhhhhFfffffffff.',
  '...hhhhhhhffffKKKKKKs.',
  '...hhhhhsSffffffKeKFf.',
  '...hhhhsfFsffffffffFfs',
  '....hhhsfSsfffffffffFF',
  '....hhhhssffffffffffss',
  '.....hhsfffffffffffs..',
  '.....hhsffffffffKKKs..',
  '......hsfffffffffFs...',
  '......hssfffffffffFFs.',
  '.......ssffffffffffs..',
  '.........sssssssss....',
]
const HEAD_KEY = {
  H: SMOKE[1],
  h: SMOKE[2],
  w: SMOKE[3],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  F: SKIN[3],
  K: OUTLINE,
  e: LAMP[1],
}
const HX = 30
const HY = 15

function harbour(p: Painter): void {
  p.register(NIGHT).register(SMOKE)
  p.dither(null, NIGHT, (x, y) => Math.min(1, y / HORIZON) * 0.9 + noise(x, y, 2, 10) * 0.25 - 0.1, 0.8)
  // the far quay: warehouses and a mast, black on the mist
  p.fill(
    p
      .m()
      .poly([0, 60, 10, 60, 10, 56, 22, 56, 22, 62, 56, 62, 58, 58, 70, 58, 70, 54, 80, 54, 80, 70, 0, 70])
      .rect(48, 30, 1, 32)
      .line(40, 40, 49, 32),
    NIGHT[0],
  )
  // wet planks
  const planks = p.m().rect(0, HORIZON, 80, 42)
  p.fill(planks, NIGHT[1])
  for (let y = HORIZON + 3; y < 112; y += 5) p.fill(p.m().rect(0, y, 80, 1), NIGHT[0])
  // two lamps: ice-white glow, their reflections running down the wet planks
  p.shine(true)
  for (const x of [9, 71]) {
    p.fill(p.m().rect(x, 44, 1, HORIZON - 44), IRON[1])
    p.fill(p.m().disc(x + 0.5, 42.5, 4.5), NIGHT[3])
    p.fill(p.m().rect(x - 1, 41, 3, 3), LAMP[0])
    p.px(x, 42, LAMP[1])
    for (let y = HORIZON + 1; y < 100; y++) {
      const w = 1 + Math.floor((y - HORIZON) / 8)
      if ((y + x) % 3 !== 0) p.fill(p.m().rect(x - Math.floor(w / 2), y, w, 1), (y - HORIZON) % 4 === 0 ? LAMP[1] : LAMP[0])
    }
  }
  p.shine(false)
}

/** Cold rain slanting across the night. */
function rain(p: Painter): void {
  const rand = rng(41)
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * 90)
    const y = Math.floor(rand() * 96)
    const len = 3 + Math.floor(rand() * 3)
    p.fill(p.m().line(x, y, x - Math.floor(len / 2), y + len), rand() < 0.3 ? RAIN[1] : RAIN[0])
  }
}

function smoker(d: Painter): void {
  const m = (): Mask => d.m()
  // his long coat, side-on, open over the chest; the hem dissolves into smoke below
  const coat = m().poly([28, 38, 46, 37, 51, 44, 53, 60, 51, 76, 30, 78, 25, 60])
  d.part(coat, COAT, { bevel: 6 })
  d.part(m().poly([46, 40, 51, 44, 53, 58, 48, 58]), SKIN, { bevel: 2 })
  d.fill(m().path([31, 46, 33, 72]).path([42, 60, 44, 74]), COAT[0])
  d.fill(coat.facing([1, 0]).and(m().rect(40, 44, 20, 34)), COAT[3])
  // the near arm: elbow down, a fur cuff, the gloved fist round the jitte at his chest
  d.part(m().limb([38, 42, 34, 51, 36, 58], [4.4, 4, 3.6]), COAT)
  d.part(m().limb([36, 58, 42, 57], 3.6), COAT, { bias: -1 })
  d.part(m().ellipse(42.5, 57, 2, 3.6), SMOKE, { bevel: 1, bias: 1 })
  // the white fur collar
  const fur = m().blob(36, 38, 10, 5, 3, 0.25)
  d.part(fur, SMOKE, { bevel: 3, bias: 1 })
  d.fill(m().path([28, 38, 31, 41]).path([34, 40, 37, 42]).path([40, 40, 43, 42]), SMOKE[1])
  // the jitte resting on his shoulder: iron shaft lit along its top, the seastone tip high behind him
  const shaft = m().limb([50, 61, 37, 43, 15, 17], [1.8, 1.7, 1.6])
  d.part(shaft, IRON, { bevel: 1 })
  d.fill(shaft.facing([0, -1]), IRON[2])
  d.part(m().limb([20, 23, 14, 15], 2.4), [NIGHT[2], NIGHT[3], RAIN[0], RAIN[1]], { bevel: 1 })
  // the hook prong above his fist, the gloved fist closed round the shaft
  d.fill(m().path([44, 51, 41, 46]).path([44, 51, 45, 52]), IRON[2])
  d.part(m().ellipse(46.5, 56, 3.6, 3.4), IRON, { bevel: 2 })
  d.fill(m().path([45, 54, 48, 54]), IRON[2])
  // neck and head
  d.part(m().rect(38, 31, 8, 6), SKIN, { bevel: 2 })
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

/** Two cigars clenched in the corner of his mouth, their tips glowing. */
function cigars(d: Painter): void {
  d.fill(d.m().line(47, 29, 53, 27), CIGAR[1])
  d.fill(d.m().line(47, 30, 53, 32), CIGAR[0])
  d.px(54, 27, EMBER[1]).px(55, 26, EMBER[0])
  d.px(54, 32, EMBER[1]).px(55, 32, EMBER[0])
}

/**
 * The serpent: his smoke rises out of his dissolving legs, loops in front of his waist, climbs up on
 * the right and rears with open jaws; the smoke from the cigars streams into its neck.
 */
function serpent(d: Painter): void {
  const m = (): Mask => d.m()
  // the smoke his legs dissolve into: rolling puffs, thinning out downwards
  const legs = m()
  for (const [x, y, rx, ry, k] of [
    [34, 80, 8, 5, 3],
    [42, 84, 7, 5, 5],
    [30, 88, 6, 4, 7],
    [46, 76, 6, 4, 9],
  ] as const)
    legs.blob(x, y, rx, ry, k, 0.3)
  d.part(legs, SMOKE, { bevel: 3 })
  const body = m().limb(
    [24, 90, 13, 84, 10, 73, 16, 65, 30, 64, 46, 65, 58, 59, 63, 49, 64, 39, 63, 31],
    [2.5, 3.5, 4.2, 4.5, 4.5, 4.5, 4.5, 4.2, 4, 3.8],
  )
  d.part(body, SMOKE, { bevel: 3 })
  // rolling curls along the smoke
  for (const curl of [
    [12, 78, 15, 74, 14, 70],
    [22, 63, 25, 67, 29, 65],
    [40, 63, 43, 67, 47, 65],
    [60, 52, 64, 50, 63, 46],
  ])
    d.fill(m().path(curl), SMOKE[1])
  d.part(m().limb([55, 30, 58, 32, 61, 35], [1.2, 1.5, 2]), SMOKE, { bevel: 1, line: 'none' })
  // the head rearing up on the right, jaws open
  const head = m()
    .poly([57, 28, 60, 22, 66, 18, 73, 19, 74, 22, 68, 24, 64, 28])
    .poly([60, 31, 66, 29, 73, 30, 72, 32, 64, 33])
  d.part(head, SMOKE, { bevel: 2, bias: 1 })
  d.fill(m().poly([64, 28, 72, 25, 72, 29, 65, 30]), NIGHT[0])
  d.px(70, 25, SMOKE[3]).px(70, 29, SMOKE[3])
  d.fill(m().rect(64, 21, 2, 1), OUTLINE)
}

export const smokerLeader: CardDef = {
  id: 'op02-086',
  number: 86,
  name: 'Smoker (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Schwarz',
  print: { life: 5, power: 5000, type: 'Marine' },
  // the lamps and their reflections and the smoke serpent shine; Smoker stays matt
  foil: 'painted',
  draw(p) {
    harbour(p)
    rain(p)
    const d = p.layer()
    smoker(d)
    cigars(d)
    d.shine(true)
    serpent(d)
    d.shine(false)
    p.subject(d, OUTLINE)
  },
}
