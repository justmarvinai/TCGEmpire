import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Spätikönig, an Ultra of Spätschicht (docs/sets/empiremon.md). Brief: a chubby raccoon king with a bottle-cap
 * crown, enthroned on a glowing drinks fridge, city night behind. Full art, 80×112.
 *
 * Composition: the fridge stands in the lower half, its glass door glowing cold white over rows of bottles; the
 * raccoon sits on top in a red mantle, legs dangling over the light box, a beer raised in a toast. The skyline
 * frames him left and right, a pink neon moon hangs on the right block. The frame's plates cover rows 4–14 and
 * 91–106, so the crown starts at row 17 and the face sits at rows 27–40.
 */
const SKY = colors('0a0a1e', '15153a', '231f55', '35296a', '553a80')
const GREY = colors('2a2838', '4e4c60', '7c7a90', 'aeacc0', 'e4e2ee')
const COLD = colors('3c8cb4', '8ad8ee', 'e4fbff')
const GOLD = colors('6a3c10', 'b67a22', 'eeb84a', 'fff0a4')
const RED = colors('4c1022', '96203a', 'd83a48', 'f8806a')
const GREEN = colors('1e5a3a', '3aa05a', '9ae07a')
const PINK = colors('a02a8a', 'ff5ec8', 'ffc4ee')
const OUTLINE = hex('0c0a18')

/** Mirror x round the middle of the raccoon. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

// ── the night behind ────────────────────────────────────────────────────────

/** Blocks of the skyline: x, top, width. */
const FAR: readonly (readonly [number, number, number])[] = [
  [0, 44, 9],
  [8, 50, 8],
  [24, 54, 10],
  [46, 52, 9],
  [58, 42, 7],
  [70, 47, 10],
]
const NEAR: readonly (readonly [number, number, number])[] = [
  [0, 52, 7],
  [6, 38, 12],
  [62, 32, 13],
  [74, 50, 6],
]

function city(p: Painter): void {
  // sky: deep blue at the top, the violet haze of the city light towards the roofs
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const haze = Math.pow(Math.max(0, y - 6) / 62, 1.5)
      const glow = Math.pow(Math.max(0, 1 - Math.hypot(x - 40, (y - 42) * 0.8) / 40), 0.8) * 0.95
      return Math.max(haze, glow) + (noise(x, y, 4, 9) - 0.5) * 0.12
    },
    0.7,
  )
  stars(p, rng(14), 14, [GREY[3], GOLD[3], PINK[2]], { x: 4, y: 15, w: 72, h: 18 })
  p.shine(false)

  p.register(SKY)
  // the far city in the haze: a radio mast with its red light, low blocks
  const haze = p.m().rect(0, 56, 80, 56).rect(14, 50, 6, 6).rect(30, 52, 8, 4).rect(42, 49, 5, 7).rect(52, 53, 9, 3)
  haze.rect(57, 27, 1, 24).rect(56, 37, 3, 1).rect(55, 46, 5, 5)
  p.fill(haze, SKY[2])
  p.px(57, 26, RED[3])
  for (const [x, top, w] of FAR) p.fill(p.m().rect(x, top, w, 112 - top), SKY[1])
  // a rooftop water tank and an aerial on the far blocks
  p.fill(p.m().rect(60, 38, 3, 4).rect(61, 36, 1, 2), SKY[1])
  p.fill(p.m().rect(12, 44, 1, 6).rect(10, 46, 5, 1), SKY[1])
  for (const [x, top, w] of NEAR) {
    p.fill(p.m().rect(x, top, w, 112 - top), SKY[0])
    p.fill(p.m().rect(x, top, w, 1), SKY[2])
  }

  // windows: a grid on each near block, a few lit warm, one or two by a television
  const rand = rng(21)
  for (const [x, top, w] of NEAR) {
    for (let wy = top + 3; wy < 92; wy += 4) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        const r = rand()
        if (r < 0.14) p.px(wx, wy, GOLD[2]).px(wx, wy + 1, GOLD[1])
        else if (r < 0.18) p.px(wx, wy, COLD[1]).px(wx, wy + 1, COLD[0])
        else p.px(wx, wy, SKY[1]).px(wx, wy + 1, SKY[1])
      }
    }
  }
  for (const [x, top, w] of FAR) {
    for (let wy = top + 3; wy < 92; wy += 4) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) if (rand() < 0.1) p.px(wx, wy, GOLD[1]).px(wx, wy + 1, GOLD[1])
    }
  }

  // a pink neon moon on the right block, with its glow on the wall
  const moon = p.m().disc(68.5, 43.5, 4.5).minus(p.m().disc(70.5, 42, 4))
  const glow = moon.grown(2).minus(moon)
  glow.each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, PINK[0])
  })
  p.fill(moon, PINK[1])
  p.fill(moon.clone().minus(moon.moved(1, 1)), PINK[2])
  p.px(72, 46, PINK[2]).px(73, 45, PINK[1]).px(71, 45, PINK[1]).px(72, 44, PINK[1]).px(72, 47, PINK[1])
}

// ── the throne ──────────────────────────────────────────────────────────────

/** Front of the fridge: the cabinet, a light box on top, then the glass door down behind the plate. */
const FR = { x: 17, y: 60, w: 46 }
const SHELVES = [79, 89, 99] as const

/** Bottles and cans as small grids: b body, h highlight, d shade, c cap, l rim. */
const BOTTLE = ['.c.', '.b.', '.b.', 'hbd', 'hbd', 'hbd', 'hbd', 'hbd', 'hbd']
const STUBBY = ['.c.', '.b.', 'hbd', 'hbd', 'hbd', 'hbd', 'hbd']
const CAN = ['lll', 'hbd', 'hbd', 'hbd', 'hbd', 'hbd']

type Drink = readonly [grid: readonly string[], body: number, light: number, dark: number]
const DRINKS: readonly Drink[] = [
  [BOTTLE, GREEN[1], GREEN[2], GREEN[0]],
  [CAN, RED[2], RED[3], RED[1]],
  [STUBBY, GOLD[1], GOLD[2], GOLD[0]],
  [CAN, PINK[1], PINK[2], PINK[0]],
  [BOTTLE, GOLD[1], GOLD[2], GOLD[0]],
  [CAN, COLD[0], COLD[1], SKY[3]],
  [STUBBY, GREEN[1], GREEN[2], GREEN[0]],
  [BOTTLE, RED[1], RED[2], RED[0]],
  [CAN, GOLD[2], GOLD[3], GOLD[1]],
]

function fridge(p: Painter): void {
  const { x, y, w } = FR
  const cabinet = p.m().rect(x, y, w, 112 - y)

  // cold light spilling out of the door onto the night round it
  p.shine(true)
  const halo = cabinet.grown(4).minus(cabinet)
  halo.each((hx, hy) => {
    const d = Math.min(Math.abs(hx - x + 0.5), Math.abs(hx - x - w + 0.5), Math.abs(hy - y + 0.5))
    if (hy > y - 3 && (d < 2.5 ? (hx + hy) % 2 === 0 : (hx + hy) % 4 === 0 && hy % 2 === 0)) p.set(hx, hy, SKY[3])
  })
  p.shine(false)

  p.register(GREY)
  p.fill(cabinet, GREY[1])
  p.fill(cabinet.facing([-1, 0]), GREY[2])
  p.fill(cabinet.facing([1, 0]), GREY[0])
  p.fill(p.m().rect(x, y, w, 1), GREY[3])

  // light box over the door, glowing pink
  const box = p.m().rect(x + 2, y + 2, w - 4, 5)
  p.fill(box, PINK[1])
  p.fill(p.m().rect(x + 2, y + 2, w - 4, 1), PINK[2])
  p.fill(p.m().rect(x + 2, y + 6, w - 4, 1), PINK[0])

  // glass door: a steel frame round a glowing inside, bright at the top where the tube sits
  const door = p.m().rect(x + 2, y + 9, w - 4, 112 - y - 9)
  p.fill(door, GREY[3])
  p.fill(door.facing([0, -1, -1, 0]), GREY[4])
  const inside = p.m().rect(x + 4, y + 11, w - 8, 112 - y - 11)
  p.shine(true)
  p.dither(inside, [COLD[0], COLD[1], COLD[2]], (_x, yy) => 1 - (yy - y - 11) / 34, 0.6)
  p.shine(false)

  // shelves and the drinks standing on them
  SHELVES.forEach((sy, row) => {
    p.fill(p.m().rect(x + 4, sy, w - 8, 1), GREY[4])
    p.fill(p.m().rect(x + 4, sy + 1, w - 8, 1), GREY[2])
    for (let i = 0; i < 9; i++) {
      const [grid, body, light, dark] = DRINKS[(i * 4 + row * 3) % DRINKS.length] ?? DRINKS[0]!
      p.stamp(grid, x + 5 + i * 4, sy - grid.length, { b: body, h: light, d: dark, c: GOLD[2], l: GREY[4] })
    }
  })

  // reflections on the glass and the handle
  p.shine(true)
  const glare = p.m().poly([x + 4, y + 15, x + 12, y + 11, x + 16, y + 11, x + 4, y + 19])
  glare.poly([x + 4, y + 23, x + 22, y + 11, x + 24, y + 11, x + 4, y + 25])
  p.fill(glare.and(inside), COLD[2])
  p.shine(false)
  p.fill(p.m().rect(x + w - 6, y + 16, 1, 22), GREY[4])
  p.fill(p.m().rect(x + w - 5, y + 16, 1, 22), GREY[2])
}

// ── the king ────────────────────────────────────────────────────────────────

function king(d: Painter): void {
  const m = (): Mask => d.m()
  const paw = [OUTLINE, GREY[0], GREY[1]] as const

  // royal mantle behind him, falling over the edges of the fridge
  const mantle = m().poly([28, 40, 52, 40, 57, 50, 64, 61, 63, 66, 54, 62, 40, 60, 26, 62, 17, 66, 16, 61, 23, 50])
  d.part(mantle, RED, { bevel: 4, bias: -1 })

  // ringed tail curling round the right of the fridge
  const tail = m().limb([52, 56, 60, 57, 66, 63, 67, 72, 63, 79], [3.2, 3.8, 3.8, 3.2, 1.8])
  d.part(tail, GREY, { bevel: 3 })
  const rings = m()
  for (const [cx, cy, a] of [
    [57.5, 57.5, 80],
    [63.5, 60.5, 50],
    [66.5, 66, 15],
    [66.5, 72.5, -15],
  ] as const) {
    rings.ellipse(cx, cy, 1.3, 5, a)
  }
  d.fill(rings.and(tail), GREY[0])
  d.fill(tail.clone().and(m().disc(63, 79, 2.6)), OUTLINE)

  // chubby body, a pale belly bulging out of the open robe
  const body = m().ellipse(40, 49, 12, 11.5).ellipse(40, 55, 13.5, 7)
  d.part(body, GREY, { bevel: 6 })
  d.part(m().ellipse(40, 52, 7.5, 8.5), GREY.slice(1), { bevel: 5, line: 'none' })

  // the robe over both shoulders, open over the belly, an ermine trim down each front edge
  for (const s of [1, -1]) {
    const x = side(s)
    const robe = m().poly([x(27), 41, x(36.5), 41, x(34), 46, x(32), 52, x(32), 58, x(33), 62, x(25), 61, x(26), 50])
    d.part(robe, RED, { bevel: 3 })
    const trim = m().poly([x(34.5), 41, x(36.5), 41, x(34), 46, x(32), 52, x(32), 58, x(33), 62, x(31), 62, x(30), 58, x(30), 52, x(32), 46])
    d.fill(trim, GREY[4])
    d.fill(trim.facing([s, 0]), GREY[3])
    for (const [px, yy] of [
      [34, 44],
      [31, 50],
      [31, 57],
    ] as const) {
      d.px(Math.floor(x(px + 0.5)), yy, OUTLINE)
    }
  }

  // legs dangling over the light box, dark paws lit pink from below
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(35), 58, x(34.5), 64], [3, 2.6]), GREY, { bevel: 2 })
    const foot = m().ellipse(x(34.5), 66.5, 3, 2.2)
    d.part(foot, paw, { bevel: 2 })
    d.fill(foot.facing([0, 1]), PINK[0])
  }

  // ermine collar over the shoulders
  const collar = m().poly([28, 39, 52, 39, 54.5, 42.5, 47, 43.5, 40, 42, 33, 43.5, 25.5, 42.5])
  d.fill(collar, GREY[4])
  d.fill(collar.facing([0, 1]), GREY[3])
  for (const [cx, cy] of [
    [29, 41],
    [34, 42],
    [46, 42],
    [51, 41],
  ] as const) {
    d.px(cx, cy, OUTLINE)
  }

  // right arm resting on the belly, left arm raised with a beer
  d.part(m().limb([51, 43, 54.5, 49, 50.5, 54], [3.2, 2.8, 2.6]), RED, { bevel: 2.5 })
  d.part(m().ellipse(49.5, 54.5, 2.6, 2.2), paw, { bevel: 2 })

  const bottle = m().capsule(22.5, 38, 22.5, 30, 2.4).capsule(22.5, 30, 22.5, 24, 1)
  d.part(bottle, GREEN, { bevel: 2 })
  d.fill(m().rect(22, 23, 2, 1), GOLD[2])
  d.fill(m().rect(21, 31, 1, 5), GREEN[2])

  d.part(m().limb([29, 43, 25.5, 41, 23.5, 37], [3.2, 2.8, 2.6]), RED, { bevel: 2.5 })
  d.part(m().ellipse(23, 35.5, 2.8, 2.4), paw, { bevel: 2 })

  // ears with pale rims and dark insides
  for (const s of [1, -1]) {
    const x = side(s)
    const ear = m().ellipse(x(31.5), 26, 3.2, 3.8, s * -20)
    d.part(ear, GREY, { bevel: 2 })
    d.fill(ear.shrunk(1), GREY[0])
    d.fill(ear.clone().minus(ear.shrunk(1)).and(m().rect(0, 0, 80, 26)), GREY[4])
  }

  // head: round skull, cheek fluff sticking out to both sides
  const head = m()
    .ellipse(40, 33, 9, 7.5)
    .poly([31.5, 30, 27.5, 36, 30.5, 36, 29.5, 39, 34, 38.5, 40, 41.5, 46, 38.5, 50.5, 39, 49.5, 36, 52.5, 36, 48.5, 30])
  d.part(head, GREY, { bevel: 5 })

  // face: pale brows, the bandit mask, smug half-closed eyes, a pale muzzle with a black nose and a smirk
  const FACE = [
    '...ww.......ww...',
    '..wwww.....wwww..',
    '.kkkkkk...kkkkkk.',
    'kkkooook.kooookkk',
    'kkwwpwkk.kkwpwwkk',
    '.kkkkkkkkkkkkkkk.',
    'ww..kkwwwwwkk..ww',
    '.wwwwwwwnnnwwwww.',
    '..wwwwwwwnwwwww..',
    '....wwwwwwmmww...',
  ]
  d.stamp(FACE, 32, 28, { w: GREY[4], k: GREY[0], o: OUTLINE, p: OUTLINE, n: OUTLINE, m: GREY[1] })

  // bottle-cap crown: a crimped gold cap upside down, its skirt flaring into points, a red jewel in front
  const crown = m().poly([34.5, 26, 45.5, 26, 47, 20, 33, 20])
  for (let i = 0; i < 5; i++) crown.poly([33 + i * 3.5, 20.5, 34.5 + i * 3.5, 17, 36 + i * 3.5, 20.5])
  d.part(crown, GOLD, { bevel: 2 })
  for (let cx = 35; cx <= 45; cx += 2) d.px(cx, 24, GOLD[1])
  d.stamp(['.r.', 'rhr', '.r.'], 38.5, 21, { r: RED[2], h: RED[3] })
}

export const spaetikoenig: CardDef = {
  id: 'emp2-014',
  number: 14,
  name: 'Spätikönig',
  tier: 'ultra',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    city(p)
    fridge(p)
    const d = p.layer()
    king(d)
    p.subject(d, OUTLINE)
    // foam shooting out of the raised beer in a toast
    p.stamp(['w...w', '.w.w.', 'wwwww', '.www.', '..w..'], 20, 17, { w: GREY[4] })
    p.px(18, 15, GREY[3]).px(26, 14, GREY[3])
  },
}
