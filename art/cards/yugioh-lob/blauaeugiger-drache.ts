import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Blauäugiger w. Drache, the Grail of LOB. Brief: majestic white dragon rearing, sapphire eyes
 * blazing, wings arched, white lightning burst against deep blue sky. Full art, 80×112.
 *
 * Composition: the dragon rears on a crag, chest to the left, and glares out to the left; the near
 * wing arches over the right half, the far wing spreads low on the left behind the neck. The
 * lightning breaks out from behind its chest to every edge, so the dragon stands against the light
 * as if it called the storm. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('050818', '0a1434', '102458', '183a80', '2756a8', '3f7ccc')
const BOLT = colors('8cc4ff', 'd4ecff', 'ffffff')
const WHITE = colors('1d2452', '3a4c88', '6a84c0', 'a2bae4', 'd8e5f7', 'ffffff')
const EYE = colors('1150e0', '42bcff', 'd2f8ff')
const MOUTH = hex('170d30')
const ROCK = colors('080b1c', '141b36', '232e52', '34446e')
const OUTLINE = hex('03040e')

const P = (x: number, y: number): Pt => [x, y]

/** Centre of the lightning burst, hidden behind the chest: the storm breaks out of the dragon. */
const BURST = P(46, 44)

/** A jagged bolt: a random walk across the straight line from `from` to `to`. */
function boltPath(from: Pt, to: Pt, rand: () => number, jag: number): Pt[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const n = Math.max(2, Math.round(len / 3.2))
  const nx = -(to[1] - from[1]) / len
  const ny = (to[0] - from[0]) / len
  let off = 0
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    off = i === 0 || i === n ? 0 : off * 0.45 + (rand() - 0.5) * 2 * jag
    out.push(P(from[0] + (to[0] - from[0]) * t + nx * off, from[1] + (to[1] - from[1]) * t + ny * off))
  }
  return out
}

function storm(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - BURST[0], (y - BURST[1]) * 0.8) / 48)
      const cloud = noise(x * 0.7, y * 1.5, 3, 10) * 0.24 + noise(x, y, 8, 4) * 0.06
      return glow * glow * 0.85 + cloud + 0.02
    },
    0.8,
  )
  // the burst: main bolts out to the edges, a fork off each, a dithered glow around the cores
  const rand = rng(12)
  const cores = p.m()
  const forks = p.m()
  const ends = [P(30, 0), P(80, 6), P(80, 52), P(74, 88), P(0, 84), P(0, 38), P(6, 12)]
  for (const end of ends) {
    const path = boltPath(BURST, end, rand, 2.4)
    cores.path(path)
    const from = path[Math.floor(path.length * 0.55)] ?? BURST
    const turn = rand() < 0.5 ? 1 : -1
    const dx = (end[0] - BURST[0]) * 0.32
    const dy = (end[1] - BURST[1]) * 0.32
    forks.path(boltPath(from, P(from[0] + dx - dy * 0.7 * turn, from[1] + dy + dx * 0.7 * turn), rand, 1.5))
  }
  cores.grown(2).each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, BOLT[0])
  })
  p.fill(cores.grown(1), BOLT[0])
  p.fill(forks, BOLT[1])
  p.fill(cores, BOLT[2])
  // glints: small four-pointed stars in the storm
  for (const [x, y] of [P(8, 22), P(70, 30), P(64, 70), P(14, 50), P(75, 14)]) {
    p.px(x, y, BOLT[2])
      .px(x - 1, y, BOLT[0])
      .px(x + 1, y, BOLT[0])
      .px(x, y - 1, BOLT[0])
      .px(x, y + 1, BOLT[0])
  }
  // the flash itself, a four-pointed star; the dragon hides all but its tips
  const [bx, by] = BURST
  p.fill(
    p
      .m()
      .disc(bx, by, 3.2)
      .line(bx - 8, by, bx + 8, by)
      .line(bx, by - 8, bx, by + 8),
    BOLT[1],
  )
  p.fill(
    p
      .m()
      .disc(bx, by, 2)
      .line(bx - 4, by, bx + 4, by)
      .line(bx, by - 4, bx, by + 4),
    BOLT[2],
  )
  p.shine(false)

  // the crag the dragon rears on
  const crag = p
    .m()
    .poly([0, 91, 10, 88, 22, 86.5, 34, 87.5, 48, 86, 62, 87, 72, 89, 80, 88, 80, 112, 0, 112])
  p.dither(crag, ROCK.slice(0, 3), (x, y) => 0.8 - (y - 86) / 16 + noise(x, y, 5, 3) * 0.3, 0.6)
  p.edge(crag, ROCK[3], [0, -1])
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tip of the claw on the wrist. */
  claw: Pt
  /** Tips of the finger bones, from the outside in, and where the membrane meets the body. */
  tips: readonly [Pt, Pt, Pt, Pt]
  /** -1 for the wing in the back. */
  bias: number
}

/** A wing: arched arm, three finger bones fanning from the wrist, scalloped membrane between them. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    // scallop: the membrane edge sags towards the wrist between two tips
    const mid = P(((a[0] + b[0]) / 2) * 0.7 + wrist[0] * 0.3, ((a[1] + b[1]) / 2) * 0.7 + wrist[1] * 0.3)
    edge.push(...quad(a, mid, b, 6))
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.shade(membrane, WHITE, { bias: s.bias - 1, bevel: 6 })
  // each panel is darker towards the trailing finger, like a membrane stretched between bones
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    d.tone(
      d
        .m()
        .poly([wrist, P(a[0] * 0.55 + b[0] * 0.45, a[1] * 0.55 + b[1] * 0.45), b])
        .and(membrane),
      -1,
    )
  }
  for (const tip of s.tips.slice(0, 3))
    d.part(d.m().limb([wrist, tip], [1.3, 0.6]), WHITE, { bias: s.bias, line: 'shadow' })
  d.part(d.m().limb(s.arm, [2.8, 2.1, 1.6]), WHITE, { bias: s.bias })
  d.part(d.m().poly([P(wrist[0] - 1.5, wrist[1] + 1), s.claw, P(wrist[0] + 1.5, wrist[1] + 1)]), WHITE, {
    bias: s.bias,
  })
}

const FAR_WING: WingShape = {
  arm: [P(44, 46), P(28, 41), P(12, 37)],
  claw: P(9, 31),
  tips: [P(0, 48), P(3, 62), P(15, 69), P(34, 63)],
  bias: -1,
}
const NEAR_WING: WingShape = {
  arm: [P(51, 45), P(58, 29), P(70, 18)],
  claw: P(72, 11),
  tips: [P(80, 31), P(78, 50), P(68, 63), P(56, 62)],
  bias: 0,
}

/**
 * The head is hand-pixelled: profile to the left, jaws parted, three horns swept back.
 * W w l m s k = white from light to dark, o = inside of the mouth. The eye is stamped separately so
 * it can shine.
 */
const HEAD = [
  '................................Wl',
  '.............................WWwl.',
  '..........................WWwwl...',
  '..............WWW......WWWwll.....',
  '............WWwwwWWWWWWwwwll......',
  '..........WWwwkkkkkkwwwwwwlm....Wl',
  '........WWwwwk.....kwwwwwlmm.WWwl.',
  '......WWwwwwwwk....kwwwwwlmmWwwl..',
  '....WWwwwwwwwwwkkwwwwwwwlmmlll....',
  '..WWwswwwwwwwwwwwwwwlllllmm....Wl.',
  'WWwwwwwwwwwwwwwwwwwllmmmmlm.WWwl..',
  '.slllllllllllllwwwlmwwwwlmmWwwl...',
  '..kWoooWoooWookssmlwwwwllmmll.....',
  '...oooooooooooommllwwlmm..........',
  '....kWllllWllllwmmlllmm...........',
  '.....slllllllllllllmmm............',
  '.......ssmmmmmmmmmsss.............',
  '..........ssssssss................',
]
const HEAD_KEY = {
  W: WHITE[5],
  w: WHITE[4],
  l: WHITE[3],
  m: WHITE[2],
  s: WHITE[1],
  k: WHITE[0],
  o: MOUTH,
}
/** Where the head stamp sits, and the eye inside it. */
const HEAD_AT = P(5, 17)
const EYE_GRID = ['beeeb', '.Bbb.']
const EYE_AT = P(HEAD_AT[0] + 14, HEAD_AT[1] + 6)

/** A part that casts a short shadow down and to the right onto what lies behind it. */
function cast(d: Painter, part: Mask, dx = 1, dy = 2): void {
  d.tone(part.moved(dx, dy).minus(part), -1)
}

/** A clawed hand: a small fist with three white claws, pointing up or to the left. */
function hand(d: Painter, x: number, y: number, way: 'up' | 'left', bias: number): void {
  d.part(d.m().disc(x, y, 2.2), WHITE, { bias })
  if (way === 'up') d.stamp(['w.w.w', 'w.w.w'], Math.round(x) - 2, Math.round(y) - 4, { w: WHITE[5] })
  else d.stamp(['ww', '..', 'ww', '..', 'ww'], Math.round(x) - 4, Math.round(y) - 2, { w: WHITE[5] })
}

function dragon(d: Painter): void {
  const m = (): Mask => d.m()

  wing(d, FAR_WING)
  wing(d, NEAR_WING)

  // tail sweeping out to the right behind the near leg and curling up
  d.part(m().limb([57, 74, 64, 81, 71, 84.5, 77, 80.5, 78.5, 72], [4.4, 3.8, 3, 2.2, 1.2]), WHITE, {
    bias: -1,
  })

  // far leg, planted to the left: thigh, shin, a long foot
  d.part(m().limb([46, 65, 41, 71, 37.5, 76], [5.8, 5, 3.6]), WHITE, { bias: -2 })
  d.part(m().limb([37.5, 76, 36, 83.5], [3.2, 2.6]), WHITE, { bias: -2 })
  d.part(m().limb([37, 85.5, 30.5, 86.5], [2.4, 1.8]), WHITE, { bias: -2 })

  // far arm, reaching forward past the chest
  d.part(m().limb([40, 51, 33, 56.5, 27.5, 53], [2.8, 2.3, 2]), WHITE, { bias: -1 })
  hand(d, 26, 52, 'up', -1)

  // body rising to a broad chest; ridged plates down the front, each lit on its upper edge
  const trunk = m().limb([52, 72, 48.5, 62, 44, 53], [6.8, 7.6, 7.4]).ellipse(42.5, 52, 7.6, 8.4, -18)
  d.part(trunk, WHITE, { bias: -1 })
  const plates = m().limb([36.5, 46, 36.5, 55, 41, 64, 48, 73], [2.4, 3.6, 4, 3.6]).and(trunk)
  d.shade(plates, WHITE, { bevel: 3 })
  for (let y = 48; y < 77; y += 4) {
    const crease = m()
      .path([30, y + 2, 40, y - 1, 54, y + 3])
      .and(plates)
    d.fill(crease.moved(0, -1).and(plates), WHITE[3])
    d.fill(crease, WHITE[2])
    d.fill(crease.moved(0, 1).and(plates).minus(crease), WHITE[5])
  }

  // near leg: a heavy thigh, the shin angled back, the foot flat with claws forward
  const thigh = m().limb([54, 63, 55.5, 70, 54, 76.5], [7, 6.4, 4.2])
  d.part(thigh, WHITE, { bevel: 5 })
  cast(d, thigh, -1, 2)
  d.part(m().limb([54, 76.5, 57, 84], [3.6, 2.8]), WHITE)
  d.part(m().limb([57.5, 85.5, 50.5, 86.8], [2.6, 2]), WHITE)
  for (const [x, y] of [P(27, 86), P(30, 87), P(47, 86), P(50, 87)])
    d.stamp(['ww', 'w.'], x, y, { w: WHITE[5] })

  // near arm reaching forward past the belly, claws spread
  const arm = m().limb([48, 54, 45, 61.5, 36.5, 63.5], [3.2, 2.7, 2.3])
  d.part(arm, WHITE)
  cast(d, arm)
  hand(d, 34, 63, 'left', 0)

  // neck in an S from the chest up to the back of the skull, plates on its throat
  const neck = m().limb([44, 49, 39.5, 43.5, 38.5, 38, 34, 32], [5.4, 4.4, 4, 4.4])
  d.part(neck, WHITE)
  cast(d, neck, 1, 2)
  d.shade(m().limb([38.5, 48, 35, 43, 34, 38, 30.5, 34], [2.2, 2, 1.9, 1.8]).and(neck), WHITE, { bevel: 2 })

  const head = d.layer().stamp(HEAD, HEAD_AT[0], HEAD_AT[1], HEAD_KEY)
  d.contact(head.mask()).blit(head)
  cast(d, head.mask(), 0, 2)
  d.shine(true)
  d.stamp(EYE_GRID, EYE_AT[0], EYE_AT[1], { e: EYE[2], b: EYE[1], B: EYE[0] })
  d.shine(false)

  // the burst behind lights the rim
  d.tone(
    d
      .mask()
      .facing()
      .and(m().disc(BURST[0], BURST[1], 24)),
    1,
  )
}

/** The eye blazes: a sapphire glow on the skull round it and a streak trailing back into the storm. */
function blaze(p: Painter): void {
  const [x, y] = EYE_AT
  p.shine(true)
  for (const [gx, gy] of [P(-1, 0), P(5, 0), P(1, -1), P(2, -1), P(3, -1), P(0, 1), P(4, 1)])
    p.px(x + gx, y + gy, BOLT[0])
  for (let i = 0; i < 12; i++) p.px(x + 5 + i, y - 1 - Math.floor(i / 3), i < 5 ? EYE[2] : EYE[1])
  p.shine(false)
}

export const blauaeugigerDrache: CardDef = {
  id: 'ygo-lob-086',
  number: 86,
  name: 'Blauäugiger w. Drache',
  tier: 'grail',
  kind: 'monster',
  element: 'LICHT',
  sub: 'normal',
  print: { atk: '3000', def: '2500', level: 8, type: 'Drache' },
  // the storm sky, the lightning and the blazing eye shine; dragon and crag stay matt
  foil: 'painted',
  draw(p) {
    storm(p)
    const d = p.layer()
    dragon(d)
    p.subject(d, OUTLINE)
    blaze(p)
  },
}
