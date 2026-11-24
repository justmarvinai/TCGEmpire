import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, rng, sparks } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Portgas.D.Ace (Leader, Alt-Art, Ultra, Red). Brief: Ace riding his fire-driven boat down a road of
 * flame that parts the sea at sunset. Full art, 80×112.
 *
 * Composition: seen bow on, Ace stands in his little boat and rides straight at us, feet planted,
 * arms crossed over his bare chest, the orange hat with its two little faces on his head, his black
 * hair blowing, a cocky smirk under the brim; the red bead necklace on his chest. Flames lick up
 * round his shoulders. The fire behind him has set the sea alight: a burning road runs back to the
 * sun on the horizon and parts the water into two walls, lit orange from below, foam on their
 * crests. Embers drift up. The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('140c34', '3a1450', '7a1a4e', 'c43a3a', 'f07a2e', 'ffc04a')
const HOT = colors('fff0b0', 'fffbea')
const FIRE = [hex('9a2216'), SKY[3], SKY[4], SKY[5], HOT[0]]
const SEA = colors('070718', '120f30', '221c4c')
const BLACK = colors('0c1024', '1a2346', '2e3f70')
const HAT = [hex('9a2216'), SKY[4], SKY[5]] as const
const BEADS = [hex('9a2216'), SKY[3], SKY[4]] as const
const SKIN = colors('5a2620', 'a85a3c', 'e09468', 'f8c49a')
const WOOD = colors('2a120e', '5e3018', '9a5a28')
const WATER = colors('3a3480', 'a8a4e0')
const OUTLINE = hex('0a0614')

const HORIZON = 49
const SUN = { x: 40, y: 49, r: 14 }

/**
 * Ace's face under the hat brim: black bangs, eyes open with a glint, brows set, freckles across both
 * cheeks, one corner of the mouth pulled up in a smirk.
 */
const FACE = [
  'hhHhhhhhhhhHhh',
  'hHFFhffhffhffh',
  'hFFfffffffffsh',
  'hFKKKffffKKKsh',
  'hfKwKffffKwKsh',
  'hffffffffffssh',
  'hfSfSffffSfSsh',
  '.fffffffsffsS.',
  '.ffffffffffKs.',
  '.fffffKKKKKss.',
  '.ffffffffffss.',
  '..fffffffsss..',
  '....ssssss....',
]
const FACE_KEY = {
  h: BLACK[1],
  H: BLACK[2],
  F: SKIN[3],
  f: SKIN[2],
  s: SKIN[1],
  S: SKIN[0],
  K: OUTLINE,
  w: HOT[1],
}
const FX = 34
const FY = 23

function sky(p: Painter): void {
  p.register(SKY)
  p.shine(true)
  p.dither(
    p.m().rect(0, 0, 80, HORIZON),
    SKY,
    (x, y) =>
      Math.pow(y / HORIZON, 1.3) * 0.9 + Math.max(0, 1 - Math.hypot(x - SUN.x, (y - SUN.y) * 1.4) / 40) * 0.32,
    0.7,
  )
  // the sun sinking into the sea at the end of the corridor, a halo around it
  const above = p.m().rect(0, 0, 80, HORIZON)
  const sun = p.m().disc(SUN.x, SUN.y, SUN.r).and(above)
  p.fill(sun.grown(2).and(above), SKY[5])
  p.fill(sun, HOT[0])
  p.fill(p.m().disc(SUN.x - 2, SUN.y - 3, SUN.r - 4).and(sun), HOT[1])
  // cloud streaks, lit along their lower edge
  for (const [x0, y0, len] of [
    [50, 40, 26],
    [4, 42, 22],
    [56, 28, 20],
    [8, 26, 16],
  ] as const) {
    const band = p.m().capsule(x0, y0, x0 + len, y0 - 1, 1.1)
    p.fill(band, y0 > 34 ? SKY[2] : SKY[1])
    p.fill(band.facing([0, 1]), y0 > 34 ? SKY[4] : SKY[3])
  }
  p.shine(false)
}

/**
 * The sea parted by fire: a burning road runs from the boat back to the sun, and the water stands
 * up on both sides of it in two walls. Seen down the corridor, both inner faces glow orange near the
 * fire and fade to dark indigo towards the foam on their crests.
 */
function corridor(p: Painter): void {
  const crestAt = (x: number) => HORIZON - 1 - Math.abs(x - SUN.x) * 0.52
  const footAt = (x: number) => HORIZON + 1 + Math.abs(x - SUN.x) * 0.95
  const walls = p.m()
  const road = p.m()
  for (let x = 0; x < 80; x++) {
    const top = Math.round(crestAt(x) + noise(x, 0, 3, 3) * 3 - 1.5)
    const foot = Math.round(footAt(x))
    if (Math.abs(x - SUN.x) > 2) walls.rect(x, top, 1, foot - top)
    road.rect(x, Math.min(foot, 112), 1, 112 - foot)
  }
  road.or(p.m().poly([SUN.x - 2, HORIZON, SUN.x + 2, HORIZON, SUN.x + 1, HORIZON + 3, SUN.x - 1, HORIZON + 3]))
  p.shine(true)
  // the road of fire, hottest in its middle behind the boat
  p.dither(
    road,
    [SEA[1], FIRE[0] ?? 0, FIRE[1] ?? 0, FIRE[2] ?? 0, FIRE[3] ?? 0, HOT[0]],
    (x, y) => {
      const across = Math.abs(x - SUN.x) / Math.max(1, (y - HORIZON) * 1.05)
      return 0.95 - across * 0.85 + (noise(x * 0.6, y * 2, 17, 3) - 0.5) * 0.35
    },
    0.5,
  )
  // the walls: falling streaks, lit from the road below, dark under the crest
  p.dither(
    walls,
    [SEA[0], SEA[1], SEA[2], WATER[0], FIRE[0] ?? 0, FIRE[1] ?? 0, FIRE[2] ?? 0],
    (x, y) => {
      const lift = (footAt(x) - y) / Math.max(1, footAt(x) - crestAt(x))
      const streak = noise(x * 1.3, y * 0.1, 29, 2.5)
      return 0.95 - lift * 0.8 + (streak - 0.5) * 0.5
    },
    0.5,
  )
  // foam: the crest, a lip curling over towards the road, spray above
  const crest = walls.facing([0, -1])
  p.fill(crest.moved(0, 1).and(walls), WATER[1])
  p.fill(crest, HOT[1])
  const rand = rng(12)
  crest.each((x, y) => {
    if (rand() < 0.16) p.px(x, y - 2 - Math.floor(rand() * 2), HOT[1])
  })
  // the foot of each wall, where it meets the fire, boils white
  p.fill(walls.facing([0, 1]).and(p.m().rect(0, HORIZON + 6, 80, 60)), HOT[0])
  p.shine(false)
}

/** Embers blown up off the burning road. */
function embers(p: Painter): void {
  p.shine(true)
  sparks(p, rng(4), 34, [FIRE[3] ?? 0, HOT[0], FIRE[2] ?? 0], { x: 6, y: 20, w: 68, h: 44 })
  p.shine(false)
}

/** The skiff, bow on: a pointed prow with a light rail, its stem cutting a bow wave. */
function skiff(d: Painter): void {
  const m = (): Mask => d.m()
  const hull = m().poly([21, 77, 60, 77, 55, 84, 45, 92, 36, 92, 26, 84])
  d.part(hull, WOOD, { bevel: 5 })
  for (const y of [82, 86])
    d.fill(
      m()
        .path([24 + (y - 77) * 0.8, y, 40.5, y + 3, 57 - (y - 77) * 0.8, y])
        .and(hull.shrunk(1)),
      WOOD[0],
    )
  d.fill(m().rect(21, 77, 40, 2).and(hull), WOOD[2])
  d.fill(m().rect(40, 80, 1, 12).and(hull), WOOD[2])
  // bow wave thrown up white on both sides of the stem
  const foam = m()
  for (const s of [-1, 1]) {
    const x = (v: number) => 40.5 + s * (v - 40.5)
    foam.limb([x(34), 90, x(27), 87, x(20), 81, x(17), 77], [1.4, 2.6, 2, 0.8])
    foam.limb([x(32), 91, x(23), 90, x(14), 86], [1.2, 2, 0.8])
  }
  d.part(foam.minus(hull), [WATER[0], WATER[1], HOT[1]], { bevel: 2 })
}

/** Flames licking up round his shoulders and arms, behind him. */
function aura(p: Painter): void {
  const flames = p.m()
  for (const [x, y, w, h, lean, seed] of [
    [27, 50, 12, 26, -3, 3],
    [54, 50, 12, 26, 3, 5],
    [22, 62, 9, 18, -4, 7],
    [59, 62, 9, 18, 4, 9],
  ] as const)
    flames.or(flameMask(p, x, y, w, h, { lean, tongues: 2, seed }))
  p.shine(true)
  fire(p, flames, FIRE, { dy: 1, step: 1 })
  p.shine(false)
}

function ace(d: Painter): void {
  const m = (): Mask => d.m()
  // legs planted wide in the boat: black shorts to the knee, bare shins, black boots
  d.part(m().limb([37, 58, 34, 67, 32, 79], [3.8, 3.4, 3.2]), SKIN, { bias: -1 })
  d.part(m().limb([44, 58, 47, 67, 49, 79], [3.8, 3.4, 3.2]), SKIN, { bias: -1 })
  d.part(m().poly([30, 56, 51, 56, 52, 69, 44, 70, 41, 63, 38, 70, 29, 69]), BLACK, { bevel: 3, bias: 1 })
  d.part(m().ellipse(31.5, 77, 4, 3).ellipse(49.5, 77, 4, 3), BLACK, { bevel: 2 })
  // bare torso
  const torso = m().poly([27, 40, 34, 36, 47, 36, 54, 40, 53, 50, 50, 58, 31, 58, 28, 50])
  d.part(torso, SKIN, { bevel: 7 })
  d.fill(m().path([40.5, 43, 40.5, 55]).path([35, 52, 39, 53]).path([42, 53, 46, 52]), SKIN[1])
  // belt with a brass buckle
  d.part(m().rect(30, 55, 21, 3), WOOD, { bevel: 1 })
  d.fill(m().rect(38, 55, 5, 3), FIRE[3] ?? 0)
  // arms crossed: his left forearm below, the right one on top, fists tucked in
  d.part(m().limb([51, 41, 55, 48, 50, 53, 35, 53], [4, 3.6, 3.2, 3]), SKIN)
  d.part(m().limb([30, 41, 26, 48, 31, 51, 46, 49], [4, 3.6, 3.4, 3.2]), SKIN, { bias: 1 })
  d.part(m().ellipse(48.5, 48.5, 2.6, 2.4), SKIN, { bevel: 2 })
  d.part(m().ellipse(32, 54, 2.6, 2), SKIN, { bevel: 2, bias: -1 })
  // neck, the red bead necklace on his chest
  d.part(m().rect(36, 33, 9, 6), SKIN, { bevel: 3 })
  d.tone(m().rect(36, 34, 9, 2), -1)
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.1 + (i / 8) * 0.8)
    d.part(m().disc(40.5 + Math.cos(a) * 7.5, 37 + Math.sin(a) * 4.5, 1.4), BEADS, { bevel: 1, line: 'none' })
  }
  // black wavy hair falling to his neck, blown back at the ends
  const hair = m()
    .limb([34, 23, 32, 28, 31, 32], [3, 2.6, 1.6])
    .limb([47, 23, 49, 28, 50, 32], [3, 2.6, 1.6])
    .limb([33, 29, 30, 30, 28, 33], [1.6, 1.4, 0.8])
    .limb([48, 29, 51, 30, 53, 33], [1.6, 1.4, 0.8])
    .limb([32, 32, 33, 35], [1.4, 0.7])
    .limb([49, 32, 48, 35], [1.4, 0.7])
  d.part(hair, BLACK, { bevel: 2 })
  d.part(m().ellipse(40.5, 24, 8, 4), BLACK, { bevel: 2 })
  // the orange hat: wide brim, crown with a dark band and the two little faces, one laughing, one sad
  const brim = m().ellipse(40.5, 21.5, 14, 3.2)
  d.part(brim, HAT, { bevel: 2 })
  d.fill(brim.facing([0, 1]), HAT[0])
  d.part(m().poly([33, 21, 34, 14, 37, 12, 40.5, 13, 44, 12, 47, 14, 48, 21]), HAT, { bevel: 4 })
  d.fill(m().path([37, 13, 40.5, 15, 44, 13]), HAT[0])
  d.part(m().rect(33, 18, 15, 2), BEADS, { bevel: 1 })
  d.stamp(['ww', 'kk'], 36, 16, { w: WATER[1], k: OUTLINE })
  d.stamp(['kk', 'ww'], 43, 16, { w: WATER[1], k: OUTLINE })
  d.stamp(FACE, FX, FY, FACE_KEY)
}

export const aceLeader: CardDef = {
  id: 'op03-084',
  number: 84,
  name: 'Portgas.D.Ace (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Rot',
  print: { life: 5, power: 5000, type: 'Whitebeard-Bande' },
  // the sky, the sun, the burning trail, the walls' glow and the flames round him shine; Ace and the boat stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    corridor(p)
    embers(p)
    aura(p)
    const d = p.layer()
    skiff(d)
    ace(d)
    // the fire behind him lights his right-hand rim
    d.tone(d.mask().facing([0, -1]).or(d.mask().facing([1, 0])).or(d.mask().facing([-1, 0])).and(d.m().rect(0, 30, 80, 48)), 1)
    p.subject(d, OUTLINE)
  },
}
