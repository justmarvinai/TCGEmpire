import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, fire, flameMask, hex, noise, pts, quad, rng, sparks } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Lavados (Ultra). Brief: fire bird rising straight up out of a lava crater, burning wings spread to
 * full width, head thrown back mid-cry; volcanic caldera, lava splashes, black rock, ash plumes
 * against a crimson sky. Full art, 80×112.
 *
 * Composition: the bird rises square to the viewer out of the middle of the crater, wings raised
 * to the card edges, the head thrown back to the right with the beak open. Its tail of fire still
 * trails into the lava lake, lava splashes leap around it, ash columns climb on both sides behind
 * the wings. The name plate covers rows 5–15, the attack plate 88–106.
 */
const SKY = colors('1a0712', '380c1c', '641224', '981c22', 'c8361c')
const ROCK = colors('0b0709', '1d1416', '362629')
const ASH = colors('2e1a24', '503038', '7a4a46')
const FIRE = colors('b01e0e', 'e8501a', 'fc9a26', 'fed850', 'fffbd8')
const GOLD = colors('7a3412', 'c06a18', 'eda22a', 'fed850', 'fffbd8')
const BEAK = colors('8a5a32', 'd8a868', 'f8e6b0')
const OUTLINE = hex('1c0606')

const P = (x: number, y: number): Pt => [x, y]
const MID = 40
/** Mirror an x coordinate at the middle of the bird. */
const mx = (x: number): number => 2 * MID - x

function caldera(p: Painter): void {
  // crimson night that glows hotter towards the crater
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const down = Math.pow(Math.min(1, y / 86), 1.5) * 0.8
      const glow = Math.max(0, 1 - Math.hypot(x - MID, (y - 78) * 1.2) / 40) * 0.7
      return Math.max(down, glow) + (noise(x, y * 1.4, 3, 6) - 0.5) * 0.1
    },
    0.6,
  )
  p.shine(false)

  // ash columns billowing up on both sides, lit on the side that faces the fire
  for (const [lumps, side] of [
    [[5, 64, 9, 7, 2, 52, 8, 8, 8, 41, 7, 6, 3, 31, 6, 6], 1],
    [[75, 63, 9, 7, 78, 51, 8, 8, 72, 40, 7, 6, 77, 30, 6, 6], -1],
  ] as const) {
    for (let i = 0; i + 3 < lumps.length; i += 4) {
      const lump = p.m().blob(lumps[i] ?? 0, lumps[i + 1] ?? 0, lumps[i + 2] ?? 0, lumps[i + 3] ?? 0, 4 + i * side, 0.25)
      p.fill(lump, ASH[1])
      p.fill(lump.clone().minus(lump.moved(-2 * side, -2)), ASH[2])
      p.fill(lump.clone().minus(lump.moved(side, 1)).and(lump.moved(0, 1)), ASH[0])
    }
  }

  // crater walls of black rock dipping to the lava lake, their inner slopes lit by the glow
  const lake = p.m().ellipse(MID, 83, 27, 7)
  p.shine(true)
  p.dither(lake, FIRE.slice(0, 4), (x, y) => 0.95 - Math.abs(x - MID) / 30 + noise(x, y * 3, 5, 3) * 0.3 - (y - 80) / 18, 0.6)
  p.shine(false)
  const rim = p
    .m()
    .poly([0, 66, 5, 64.5, 10, 66, 16, 70, 22, 75, 27, 78, 30, 81, 26, 88, 0, 88])
    .poly([80, 65, 74, 63.5, 68, 66, 62, 70, 57, 75, 52, 78, 50, 81, 54, 88, 80, 88])
    .poly([0, 88, 20, 87.5, 40, 89, 60, 87.5, 80, 88, 80, 112, 0, 112])
  p.fill(rim, ROCK[1])
  p.fill(rim.facing([0, -1]), ROCK[2])
  p.fill(rim.clone().and(p.m().ellipse(MID, 82, 31, 10)).minus(lake), ROCK[2])
  for (const [x, y, w] of [
    [3, 74, 6],
    [9, 81, 7],
    [66, 80, 7],
    [72, 73, 6],
  ] as const)
    p.fill(p.m().rect(x, y, w, 1), ROCK[0])
  // lava running down the inner slopes into the lake
  p.shine(true)
  for (const stream of [
    [17, 71, 21, 77, 24, 83],
    [62, 71, 59, 77, 56, 83],
    [9, 67, 12, 74, 11, 79],
  ])
    p.fill(p.m().path(stream).and(rim), FIRE[1])
  p.shine(false)
}

/** A feather: a broad blade from the root to a rounded tip. */
function feather(d: Painter, root: Pt, tip: Pt, r: number, bias = 0): void {
  const mid = P(root[0] * 0.4 + tip[0] * 0.6, root[1] * 0.4 + tip[1] * 0.6)
  d.part(d.m().limb([root, mid, tip], [r * 0.8, r, r * 0.55]), GOLD, { bias, bevel: 2.2 })
}

/** One wing on the viewer's left, spread level; `side` -1 mirrors it to the right. */
function wing(d: Painter, side: 1 | -1): void {
  const Q = (x: number, y: number): Pt => P(side === 1 ? x : mx(x), y)
  // secondaries along the lower edge, then the primaries fanning down out of the hand
  for (const [rx, ry, tx, ty] of [
    [33, 46, 31, 55],
    [28, 44, 25, 55],
    [23, 42, 19, 53.5],
    [19, 40, 13, 50.5],
  ] as const)
    feather(d, Q(rx, ry), Q(tx, ty), 3.4, -1)
  for (const [tx, ty] of [
    [7, 48],
    [3.5, 42],
    [2, 35.5],
    [3, 29.5],
  ] as const)
    feather(d, Q(16, 35), Q(tx, ty), 3.4)
  // coverts over the roots of the flight feathers, the arm along the leading edge
  d.part(d.m().poly([Q(37, 42), Q(28, 37.5), Q(18, 33.5), Q(12, 37), Q(15, 44), Q(24, 48), Q(33, 50)]), GOLD, {
    bevel: 4,
  })
  d.part(d.m().limb([Q(37, 41), Q(28, 36.5), Q(18, 32.5), Q(8, 30)], [2.8, 2.5, 2.2, 1.6]), GOLD, { bevel: 2 })
}

/** Eye under an angry brow: k = brow, e = eye, w = glint. */
const EYE = ['kk..', '.kkk', '.kew']
/** The long beak opened in a cry: B b n = pale to dark, r = the inside of the mouth. */
const BEAK_OPEN = [
  '................B',
  '..............BB.',
  '............BBbrb',
  '..........BBbbrb.',
  '.........Bbbbrb..',
  '.........bbrrb...',
  '..........rrn....',
  '...........nn....',
  '..........nn.....',
  '..........n......',
]

function bird(d: Painter): void {
  const m = (): Mask => d.m()

  // wings first, the body over their roots
  wing(d, 1)
  wing(d, -1)

  // legs dangling below the body
  for (const s of [1, -1] as const) {
    const x = (v: number) => MID + (v - MID) * s
    d.part(m().limb([x(37.5), 57, x(36.5), 63, x(35), 68.5], [1.6, 1.3, 1.1]), BEAK, { bevel: 1 })
    d.stamp(['k.k', '.k.'], Math.round(x(35)) - 1, 69, { k: BEAK[0] })
  }

  // body: a slim golden torso, the chest puffed out and catching the light
  d.part(m().ellipse(MID, 48, 7, 11.5), GOLD)
  d.part(m().ellipse(MID - 0.5, 43, 5.5, 6.5), GOLD, { line: 'shadow', bevel: 4 })

  // neck stretched up and arched back, the head thrown back to the right, beak open to the sky
  d.part(m().limb([MID, 39, 40.5, 34, 41.5, 30], [4.3, 3.8, 3.6]), GOLD)
  d.part(m().ellipse(42, 27.5, 5.2, 4.7, -35), GOLD)
  d.stamp(BEAK_OPEN, 36, 18, { B: BEAK[2], b: BEAK[1], n: BEAK[0], r: FIRE[0] })
  d.stamp(EYE, 40, 24, { k: GOLD[0], e: OUTLINE, w: FIRE[4] })

  // the flight feathers burn towards their tips
  const burn = new Map([
    [GOLD[4], FIRE[3]],
    [GOLD[3], FIRE[2]],
    [GOLD[2], FIRE[1]],
    [GOLD[1], FIRE[0]],
  ])
  d.mask().each((x, y) => {
    const c = burn.get(d.get(x, y))
    if (c !== undefined && (Math.abs(x + 0.5 - MID) - 29) / 6 > bayer(x, y)) d.set(x, y, c)
  })
}

/** Flame tongues licking up off the leading edges and tips of both wings, and the crest. */
function flames(p: Painter): Mask {
  const all = p.m()
  for (const s of [1, -1] as const) {
    const x = (v: number) => (s === 1 ? v : mx(v))
    for (const [fx, fy, w, h, lean] of [
      [3, 31, 6, 10, -2],
      [9, 32, 8, 16, -1],
      [17, 34, 7, 11, 0],
      [24, 37, 7, 13, 1],
      [31, 40, 5, 7, 1],
    ] as const)
      all.or(flameMask(p, x(fx), fy, w, h, { lean: lean * s, tongues: 2, seed: fx + fy }))
  }
  return all
}

/** The crest: a plume of fire blown back off the raised head. */
function crest(p: Painter): Mask {
  return flameMask(p, 39, 26, 7, 12, { lean: -6, tongues: 2, seed: 3 })
}

/** The tail of fire trailing from the rump down into the lava. */
function tail(p: Painter): Mask {
  return p
    .m()
    .limb([MID, 57, 37, 66, 39, 75, 36, 84], [4.5, 5, 4, 3])
    .limb([MID, 58, 44, 67, 45, 77], [3.5, 3.5, 2])
    .limb([MID - 1, 58, 32, 66, 29, 73], [3, 2.6, 1.5])
}

export const lavados: CardDef = {
  id: 'pkm-fossil-069',
  number: 69,
  name: 'Lavados',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Feuer',
  hp: 70,
  attacks: [
    { name: 'Sturzflug', cost: ['Feuer', 'Feuer', 'Feuer', 'Feuer'], damage: '80' },
    { name: 'Feuersbrunst', cost: ['Feuer'] },
  ],
  // the sky, the lava and every flame shine; the bird, rock and ash stay matt
  foil: 'painted',
  draw(p) {
    caldera(p)
    p.shine(true)
    fire(p, tail(p), FIRE.slice(0, 4), { dy: -1 })
    fire(p, crest(p), FIRE.slice(0, 4))
    p.shine(false)
    const d = p.layer()
    bird(d)
    p.subject(d, OUTLINE)

    p.shine(true)
    const burning = flames(p)
    fire(p, burning.minus(p.subjectMask.shrunk(3)), FIRE.slice(0, 4))
    // splashes of lava thrown up around the bird, and sparks in the hot air
    const arcs = [
      quad(P(26, 82), P(18, 62), P(10, 70), 7),
      quad(P(54, 82), P(64, 60), P(71, 68), 7),
      quad(P(32, 80), P(28, 66), P(22, 64), 5),
      quad(P(48, 80), P(53, 67), P(58, 63), 5),
    ]
    for (const arc of arcs)
      arc.slice(1).forEach(([x, y], i) => p.px(Math.round(x), Math.round(y), i % 2 === 0 ? FIRE[2] : FIRE[1]))
    for (const [x, y] of pts([12, 66, 67, 64, 20, 61, 61, 59]))
      p.fill(p.m().disc(x, y, 1.3), FIRE[3]).px(x, y + 1, FIRE[1])
    sparks(p, rng(13), 16, [FIRE[2], FIRE[3]], { x: 6, y: 18, w: 68, h: 50 })
    p.shine(false)
  },
}
