import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Tausenddrache (Ultra). Brief: a very old dragon sitting hunched, long white whiskers and beard
 * trailing to the ground, drooping torn wings, wrinkled scales, a faint sparkling breath. A stream of
 * hourglass sand pours down from the sky, ivy-covered ruins, and in the sand a tiny baby-dragon
 * silhouette of what it once was. Full art, 80×112.
 *
 * Composition: the old dragon sits hunched in the middle of the ruins, its tattered wings hanging down
 * its back, and lowers its head to the left, where a thin stream of sand falls out of the dusky sky
 * onto a mound. On the mound stands the little silhouette of the baby dragon it once was; the old one
 * looks at it. The cream beard and the whiskers flow down to the ground. Text plates float over rows
 * 0–13 and 90–111.
 */
const SKY = colors('1c1330', '30204a', '4e3462', '744a74', 'a0647a', 'cc8a7a')
const SCALE = colors('1c281e', '384834', '5c6c50', '869672', 'b0bc92')
const BEARD = colors('857a62', 'c4b896', 'efe6cc', 'fffaee')
const SAND = colors('6a3a12', 'b26e1e', 'e2a63a', 'ffd87a')
const MOSS = colors('203a1a', '46742c')
const STONE = colors('2a2236', '463a50', '6a5c6e')
const OUTLINE = hex('120c14')

const P = (x: number, y: number): Pt => [x, y]

/** Where the sand stream falls, and the top of the mound it builds. */
const STREAM_X = 16
const MOUND = P(16, 76)

function dusk(p: Painter): void {
  p.shine(true)
  p.dither(null, SKY, (x, y) => (y - 6) / 80 + noise(x * 0.6, y * 1.6, 3, 9) * 0.2 - 0.05, 0.7)
  p.shine(false)

  // ruins: a broken column on the left, a broken arch on the right, a low wall on the horizon
  const wall = p
    .m()
    .poly([0, 74, 10, 73, 10, 70, 18, 70, 18, 72, 40, 72, 40, 69, 52, 69, 52, 72, 80, 71, 80, 88, 0, 88])
  p.fill(wall, STONE[0])
  p.fill(wall.facing([0, -1]), STONE[1])
  // a ruined gate on the left: two pillars and a broken lintel, the sand falls through it
  const gate = p
    .m()
    .rect(0, 30, 4, 56)
    .rect(27, 34, 6, 52)
    .poly([0, 26, 26, 27, 29, 30, 34, 29, 35, 34, 22, 33, 19, 31, 15, 34, 0, 33])
  p.shade(gate, STONE, { bevel: 2.5 })
  p.fill(gate.facing([-1, 0, 0, -1]), STONE[2])
  for (let y = 40; y < 86; y += 8)
    p.fill(
      p
        .m()
        .rect(0, y, 4, 1)
        .rect(27, y + 3, 6, 1)
        .and(gate),
      STONE[0],
    )
  // ivy hanging from the lintel and climbing the pillars
  for (const [x, y, rx, ry, seed] of [
    [5, 34, 4, 3, 1],
    [3, 47, 2.4, 6, 2],
    [2, 60, 2.4, 4, 3],
    [22, 35, 3.4, 2.6, 4],
    [29, 41, 2.6, 4, 5],
    [1, 80, 2.4, 4, 6],
    [31, 31, 3, 2.4, 7],
  ] as const) {
    const leaf = p.m().blob(x, y, rx, ry, seed, 0.4)
    p.fill(leaf, MOSS[0])
    p.fill(leaf.clone().minus(leaf.moved(1, 1)), MOSS[1])
  }
  // the ground
  const ground = p.m().poly([0, 85, 30, 84, 60, 85.5, 80, 84, 80, 112, 0, 112])
  p.dither(
    ground,
    [STONE[0], STONE[1], SAND[0]],
    (x, y) => 0.5 - (y - 84) / 20 + noise(x, y, 9, 3) * 0.3,
    0.6,
  )
}

/** The sand: a thin stream pouring out of the sky onto a mound, and on it the baby dragon. */
function hourglass(p: Painter): void {
  p.shine(true)
  const stream = p.m()
  for (let y = 0; y < MOUND[1] + 2; y++) {
    const sway = Math.sin(y * 0.18) * 0.6
    stream.rect(STREAM_X - 1 + sway, y, 3, 1)
  }
  p.fill(stream, SAND[1])
  p.fill(stream.clone().and(stream.moved(1, 0)).and(stream.moved(-1, 0)), SAND[3])
  const mound = p.m().poly([0, 87, 3, 80, 8, 76, 12, 75, MOUND[0], MOUND[1], 22, 79, 28, 87])
  p.dither(mound, SAND, (x, y) => 0.95 - (y - MOUND[1]) / 16 - Math.abs(x - MOUND[0]) / 40, 0.5)
  const rand = rng(81)
  for (let i = 0; i < 24; i++) {
    const y = 14 + Math.floor(rand() * 60)
    p.px(STREAM_X + Math.floor(rand() * 5) - 2, y, i % 3 === 0 ? SAND[3] : SAND[2])
  }
  p.shine(false)

  // the baby dragon it once was: a little silhouette on the mound, looking up at the old one
  const baby = p
    .m()
    .ellipse(8, 74.5, 3.2, 2.8)
    .disc(11, 70.5, 2.5)
    .poly([12, 69.5, 16, 70.5, 13, 72.5])
    .poly([6.5, 73, 4.5, 67, 9.5, 72])
    .limb([5.5, 76, 2.5, 76.5, 1.5, 74], [1.1, 0.8, 0.4])
    .limb([10, 68.5, 9.5, 66.5], [0.8, 0.4])
    .limb([7, 76, 7, 78.5], [1, 1])
    .limb([9.5, 76.5, 10, 78.5], [1, 1])
  p.fill(baby, STONE[0])
  p.fill(baby.facing([0, -1, 1, 0]), SAND[1])
  p.px(11, 70, SAND[3])
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tips of the finger bones, hanging down, and where the membrane meets the back. */
  tips: readonly [Pt, Pt, Pt, Pt]
  bias: number
  seed: number
}

/** A drooping wing: the arm folded up, the fingers hanging down, the membrane torn at its edge. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    edge.push(
      ...quad(
        a,
        P(((a[0] + b[0]) / 2) * 0.75 + wrist[0] * 0.25, ((a[1] + b[1]) / 2) * 0.75 + wrist[1] * 0.25),
        b,
        6,
      ),
    )
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  // tears: notches bitten out of the edge and a few holes
  const rand = rng(s.seed)
  for (const [x, y] of edge.filter((_, i) => i % 4 === 2))
    membrane.minus(d.m().poly([x - 1.5, y + 1, x + (rand() - 0.5) * 3, y - 2.5 - rand() * 2, x + 1.5, y + 1]))
  for (let i = 0; i < 2; i++) {
    const t = 0.35 + rand() * 0.3
    const tip = s.tips[i + 1] ?? wrist
    membrane.minus(
      d.m().disc(wrist[0] + (tip[0] - wrist[0]) * t + 2, wrist[1] + (tip[1] - wrist[1]) * t, 1.2),
    )
  }
  const clean = membrane.cleaned()
  d.shade(clean, SCALE, { bevel: 5, bias: s.bias - 1 })
  for (const tip of s.tips.slice(0, 3))
    d.part(d.m().limb([wrist, tip], [1.2, 0.6]), SCALE, { bias: s.bias, line: 'shadow' })
  d.part(d.m().limb(s.arm, [2.6, 2.2, 1.8]), SCALE, { bias: s.bias })
}

/**
 * The head in profile, lowered to the left: worn horns, a heavy brow over a sleepy eye, a long drooping
 * snout. h H = horn, L l m s k = scales light to dark, w = wrinkles, e E = lid and eye, n = nostril,
 * o = the mouth, t = teeth.
 */
const HEAD = [
  '..........hHH.....',
  '.........mlhHH....',
  '......mllllmhH....',
  '....mllLLLllmmh...',
  '...mlLLLLLLwwwlm..',
  '..mlLLLLLlweEEwlm.',
  '.mlLLLLLllwmmlmmmk',
  'mlLLLLlllllmmmmmsk',
  'nlLllllllmmmsmmsk.',
  'kmmmmmmmmmmmmssk..',
  '.oootototmmmmsk...',
  '..kssssssssssk....',
  '....kkkkkkkkk.....',
]
const HEAD_KEY = {
  h: BEARD[0],
  H: BEARD[1],
  L: SCALE[4],
  l: SCALE[3],
  m: SCALE[2],
  s: SCALE[1],
  k: SCALE[0],
  w: SCALE[1],
  e: SAND[2],
  E: SCALE[0],
  n: SCALE[0],
  o: SCALE[0],
  t: BEARD[2],
}
const HEAD_AT = P(19, 40)

function dragon(d: Painter): void {
  const m = (): Mask => d.m()

  wing(d, {
    arm: [P(54, 48), P(60, 38), P(68, 31)],
    tips: [P(78, 46), P(78, 60), P(71, 70), P(60, 62)],
    bias: -1,
    seed: 3,
  })

  // tail curling along the ground behind the haunch
  d.part(m().limb([62, 80, 70, 85, 76, 82, 77, 76], [4.2, 3.4, 2.4, 1.2]), SCALE, { bias: -1 })

  // the hunched body: a round back, the shoulders high, sagging into the haunch
  const back = m().ellipse(54, 63, 12.5, 15.5, 18).disc(48, 49, 7)
  d.part(back, SCALE, { bevel: 9 })
  // the soft belly, pale and creased with age
  const belly = m().ellipse(46, 66, 5.5, 11, 12).and(back)
  d.shade(belly, SCALE, { bevel: 3, bias: 1 })
  for (let y = 58; y < 78; y += 3)
    d.fill(
      m()
        .path([40, y, 47, y + 1, 52, y])
        .and(belly),
      SCALE[2],
    )

  // the haunch and the hind foot, flat on the ground
  d.part(m().ellipse(60, 77, 8.5, 7.5, 10), SCALE, { bevel: 5 })
  d.part(m().limb([57, 82, 51, 85.5], [2.8, 2.2]), SCALE)
  const claw = { c: BEARD[0] }
  d.stamp(['c.c.c', 'c.c.c'], 47, 85, claw)

  // the near wing hangs over the side, ragged
  wing(d, {
    arm: [P(48, 46), P(55, 40), P(61, 35)],
    tips: [P(68, 52), P(69, 66), P(60, 74), P(52, 62)],
    bias: 0,
    seed: 7,
  })

  // a thin, bony foreleg leaning on the ground
  d.part(m().limb([44, 56, 40, 68, 41, 83], [3.2, 2.4, 2]), SCALE)
  d.part(m().ellipse(40.5, 84, 2.8, 1.6), SCALE)
  d.stamp(['c.c.c'], 37, 85, claw)

  // the neck: wrinkled, sagging forward from the shoulders down to the head
  const neck = m().limb([47, 50, 43, 42, 36, 43], [6, 5, 4.6])
  d.part(neck, SCALE)
  for (const fold of [
    [40, 46, 42, 49],
    [43, 44, 45, 48],
    [37, 47, 39, 50],
  ])
    d.fill(m().path(fold).and(neck.shrunk(1)), SCALE[1])

  // the long cream beard flows down from the chin to the ground; the whiskers trail beside it
  // a thin lock behind, then the beard itself: one wavy mass that curls to the left on the ground
  d.part(m().limb([34, 52, 36, 61, 35, 70, 36.5, 77], [2.4, 2.1, 1.6, 0.8]), BEARD, { bevel: 2, bias: -1 })
  const path = [29, 50.5, 28, 59, 30, 68, 29, 77, 25, 83.5, 20, 85]
  const beard = m().limb(path, [4.4, 4.2, 3.8, 3.2, 2, 1])
  d.part(beard, BEARD, { bevel: 3 })
  for (const dx of [-1.6, 1.4])
    d.fill(
      m()
        .path(path.slice(0, 8).map((v, i) => (i % 2 === 0 ? v + dx : v)))
        .and(beard.shrunk(1)),
      BEARD[1],
    )

  const head = d.layer().stamp(HEAD, HEAD_AT[0], HEAD_AT[1], HEAD_KEY)
  d.contact(head.mask()).blit(head)
  // a bushy white brow over the sleepy eye
  d.stamp(['..wwww', '.wWWWww', 'wW....'], HEAD_AT[0] + 9, HEAD_AT[1] + 2, { w: BEARD[1], W: BEARD[3] })
}

/** The long whiskers droop from the snout, too fine for an outline. */
function whiskers(p: Painter): void {
  p.fill(p.m().path(quad(P(20, 47), P(9, 50), P(9, 66))), BEARD[2])
  p.fill(p.m().path(quad(P(20, 49), P(14, 56), P(14, 70))), BEARD[1])
}

/** A faint, sparkling breath escapes the jaws and drifts towards the falling sand. */
function breath(p: Painter): void {
  p.shine(true)
  for (const [x, y, c] of [
    [17, 50, BEARD[3]],
    [14, 48, SAND[3]],
    [12, 51, BEARD[2]],
    [10, 47, SAND[3]],
    [7, 49, BEARD[3]],
  ] as const)
    p.px(x, y, c)
  p.px(10, 46, BEARD[2]).px(10, 48, BEARD[2]).px(9, 47, BEARD[2]).px(11, 47, BEARD[2])
  p.shine(false)
}

export const thousandDragon: CardDef = {
  id: 'ygo-mrd-081',
  number: 81,
  name: 'Tausenddrache',
  tier: 'ultra',
  kind: 'monster',
  element: 'WIND',
  sub: 'fusion',
  print: { level: 7, atk: 2400, def: 2000, type: 'Drache' },
  // the dusky sky, the falling sand and the breath shine; the dragon, the ruins and the baby stay matt
  foil: 'painted',
  draw(p) {
    dusk(p)
    hourglass(p)
    const d = p.layer()
    dragon(d)
    p.subject(d, OUTLINE)
    whiskers(p)
    breath(p)
  },
}
