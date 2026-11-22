import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, pts, rays, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Monkey.D.Luffy (Leader, Alt-Art, Ultra). Brief: captain on the lion figurehead, arms wide, the hat
 * shadowing his grin; sunrise horizon, gulls. Full art, 80×112.
 *
 * Composition: Luffy sits on the head of the ship's lion, legs dangling over its brow, and throws his
 * arms wide in a V. The sun rises right behind him, so its burst of rays frames him like a halo. The
 * lion's face with its mane of pointed petals fills the lower middle above the ship's bow, the sea
 * glitters on both sides, gulls wheel in the sky. The frame covers the outer 4 pixels and its plates
 * rows 1–13 and 90–108.
 */
const SKY = colors('22265e', '4a3a7e', 'a04a72', 'ec7a4c', 'ffbe5c')
const SUN = colors('ffe89a', 'fffbe6')
const LION = colors('a35a10', 'e0951e', 'f8c43a', 'fff08a')
const MANE = colors('8e2c14', 'c2441a', 'ee7426')
const SKIN = colors('6a2e2a', 'b8684a', 'eda478', 'ffd6a8')
const HAIR = colors('1a1420', '3a3048')
const RED = colors('5a0c16', 'b81e28', 'ee4636')
const BLUE = colors('1c2a66', '2e50a8', '5c86dc')
const OUTLINE = hex('140c14')
/** Planks of the ship: the mane's dark red-brown into the lion's brown. */
const WOOD = [MANE[0], LION[0], LION[1]]

const HORIZON = 58
const SUN_AT = { x: 40, y: 58 }

/**
 * Luffy's head, seen a little from below: the straw hat's brim throws his eyes into shadow (two
 * glints show), the scar under the left eye, the grin under it.
 */
const HEAD = [
  '........bbbbbb........',
  '......bccddccccb......',
  '.....bcddcccccccb.....',
  '.....bcdcccccccbb.....',
  '.....RrrrrrrrrrrR.....',
  '.....RrrrrrrrrrRR.....',
  '..abbcccccccccccccbba.',
  '.abccddcccccccccccccba',
  'aabbbbbbbbbbbbbbbbbbaa',
  '.aaaaaaaaaaaaaaaaaaaa.',
  'hhhhHhSSSSSSSSSShHhhhh',
  '.hhhhSSSssSSSssSSShhh.',
  '..hhSSsfwfsSsfwfsSShh.',
  '...hSsffffffffSfSfsh..',
  '....sfmmmmmmmmmmmmfs..',
  '....smtttttttttttmms..',
  '....smmttttttttttmms..',
  '.....smmmmmmmmmmmms...',
  '.....ssmmmrrrrmmmss...',
  '......sssmmmmmmsss....',
  '.......sssssssss......',
  '........sssssss.......',
]
const HEAD_KEY = {
  a: LION[0],
  b: LION[1],
  c: LION[2],
  d: LION[3],
  r: RED[1],
  R: RED[0],
  h: HAIR[0],
  H: HAIR[1],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  w: SKIN[3],
  m: RED[0],
  t: SUN[1],
}
const HX = 29
const HY = 14

/** The lion's face: round eyes with glints, a little nose, a wide cat smile. */
const LION_FACE = [
  '.kkk.......kkk.',
  'kkwkk.....kkwkk',
  'kkkkk.....kkkkk',
  '.kkk.......kkk.',
  '...............',
  '......kkk......',
  '.......k.......',
  'k.....k.k.....k',
  '.kkkkk...kkkkk.',
]

function sky(p: Painter): void {
  p.register(SKY)
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => Math.pow(Math.min(1, y / HORIZON), 1.15) + Math.max(0, 0.3 - Math.abs(x - 40) / 120),
    0.7,
  )
  // the sun's rays: every second wedge lifted, two steps close to the sun, one further out
  const burst = rays(p, SUN_AT.x, SUN_AT.y, 12, 0.02).and(p.m().rect(0, 0, 80, HORIZON))
  const near = p.m()
  const far = p.m()
  burst.each((x, y) => {
    const d = Math.hypot(x - SUN_AT.x, y - SUN_AT.y) + bayer(x, y) * 10
    if (d < 44) near.add(x, y)
    else if (d < 70) far.add(x, y)
  })
  p.tone(near, 2)
  p.tone(far, 1)
  // a big sun just risen behind him
  const above = p.m().rect(0, 0, 80, HORIZON)
  const sun = p.m().disc(SUN_AT.x, SUN_AT.y, 21).and(above)
  p.fill(sun.grown(1).and(above), SKY[4])
  p.fill(sun, SUN[0])
  p.fill(
    p
      .m()
      .disc(SUN_AT.x - 2, SUN_AT.y - 2, 16)
      .and(sun),
    SUN[1],
  )
  p.shine(false)
  // gulls
  const gull = ['k...k', '.k.k.', '..k..']
  for (const [x, y] of pts([8, 40, 14, 35, 64, 31, 70, 40, 59, 18])) p.stamp(gull, x, y, { k: HAIR[0] })
}

function sea(p: Painter): void {
  const water = p.m().rect(0, HORIZON, 80, 54)
  p.dither(water, [SKY[2], SKY[1], SKY[0]], (_x, y) => (y - HORIZON) / 16, 0.6)
  // the sun's road on the water, glittering
  p.shine(true)
  const rand = rng(3)
  for (let i = 0; i < 60; i++) {
    const y = HORIZON + 1 + Math.floor(rand() * 32)
    const spread = 4 + (y - HORIZON) * 0.9
    const x = Math.round(40 + (rand() - 0.5) * 2 * spread)
    const c = y < HORIZON + 6 ? SUN[1] : rand() < 0.5 ? SKY[4] : SUN[0]
    p.fill(p.m().rect(x, y, 2 + Math.floor(rand() * 3), 1), c)
  }
  p.fill(p.m().rect(0, HORIZON, 80, 1), SKY[4])
  p.shine(false)
}

/** The bow of the ship behind the figurehead: planked sides sweeping back, a white rail. */
function bow(d: Painter): void {
  const m = (): Mask => d.m()
  const hull = m().poly([6, 92, 24, 80, 56, 80, 74, 92, 80, 112, 0, 112])
  d.part(hull, WOOD, { bevel: 6 })
  for (const y of [86, 92, 98])
    d.fill(
      m()
        .path([0, y + 6, 24, y, 56, y, 80, y + 6])
        .and(hull),
      MANE[0],
    )
  d.part(m().path([4, 92, 24, 79, 56, 79, 76, 92]).grown(1), SUN, { bevel: 1 })
}

function lion(d: Painter): void {
  const m = (): Mask => d.m()
  // mane: pointed petals all round the face, alternating colours
  const cx = 40
  const cy = 74
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1
    const tip = [cx + Math.cos(a) * 25, cy + Math.sin(a) * 23]
    const l = [cx + Math.cos(a - 0.2) * 13, cy + Math.sin(a - 0.2) * 12]
    const r = [cx + Math.cos(a + 0.2) * 13, cy + Math.sin(a + 0.2) * 12]
    const petal = m().poly([...l, ...tip, ...r])
    d.part(petal, i % 2 === 0 ? MANE : LION, { bevel: 3, bias: i % 2 === 0 ? 0 : -1 })
  }
  // the round face
  d.part(m().ellipse(cx, cy, 14.5, 13.5), LION, { bevel: 8 })
  d.part(m().ellipse(cx, cy + 6, 6, 3.5), LION, { bevel: 3, line: 'shadow' })
  d.stamp(LION_FACE, cx - 7, cy - 4, { k: OUTLINE, w: SUN[1] })
}

function luffy(d: Painter): void {
  const m = (): Mask => d.m()
  // arms thrown wide, behind the body
  d.part(m().limb([31, 40, 22, 35, 15, 30, 10, 22], [2.6, 2.4, 2.3, 2.2]), SKIN)
  d.part(m().limb([49, 40, 58, 35, 65, 30, 70, 22], [2.6, 2.4, 2.3, 2.2]), SKIN)
  for (const [x, y, s] of [
    [9, 19.5, -1],
    [71, 19.5, 1],
  ] as const) {
    d.part(m().ellipse(x, y, 2.4, 3), SKIN, { bevel: 2 })
    d.part(m().limb([x - s * 2, y + 1, x - s * 3.5, y - 1], 1), SKIN, { line: 'shadow' })
  }
  // open red vest with rolled sleeves, the chest with the X-shaped scar
  d.part(m().poly([31, 38, 49, 38, 50, 52, 30, 52]), RED, { bevel: 4 })
  d.part(m().limb([31, 39.5, 27, 37], 3), RED)
  d.part(m().limb([49, 39.5, 53, 37], 3), RED)
  const chest = m().poly([36, 37, 44, 37, 43.5, 51, 36.5, 51])
  d.part(chest, SKIN, { bevel: 3 })
  d.fill(m().path([37, 40, 43, 47]).path([43, 40, 37, 47]), SKIN[1])
  // yellow sash, blue shorts on the lion's brow, legs dangling
  d.part(m().poly([30, 50, 50, 50, 50, 54, 30, 54]), LION, { bevel: 2 })
  d.part(m().poly([29, 53, 51, 53, 53, 59, 27, 59]), BLUE, { bevel: 3 })
  d.part(m().limb([32, 58, 33, 66], 2.4), SKIN)
  d.part(m().limb([48, 58, 47, 66], 2.4), SKIN)
  for (const x of [33, 47]) d.part(m().ellipse(x, 67, 3, 1.6), LION, { bias: -1, bevel: 1.5 })
  // neck and head
  d.part(m().rect(37, 33, 6, 6), SKIN, { bevel: 3 })
  d.tone(m().rect(37, 34, 6, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

export const luffyLeader: CardDef = {
  id: 'op01-085',
  number: 85,
  name: 'Monkey.D.Luffy (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Rot/Grün',
  print: { life: 4, power: 5000, type: 'Supernovae/Strohhutbande' },
  // the sky, its rays, the sun and the glitter on the sea shine; Luffy and the lion stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    sea(p)
    const d = p.layer()
    bow(d)
    lion(d)
    luffy(d)
    // the sun behind him lights his rim
    d.tone(
      d
        .mask()
        .facing([0, -1])
        .and(d.m().rect(0, 0, 80, 60)),
      1,
    )
    p.subject(d, OUTLINE)
  },
}
