import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, pts, quad, rng, sparks, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Glurak, the Grail of the Basis-Set. Brief: orange dragon rearing mid-roar, wings spread,
 * torrent of fire, volcano erupting at night. Full art, 80×112.
 *
 * Composition: the dragon stands left of the centre and roars to the right, so the torrent has
 * room to widen. Wings fill the top corners, the tail flame the lower left, the volcano the
 * lower right. The name plate covers rows 5–15, the attack plate rows 88–106.
 */
const SKY = colors('13102e', '271447', '541a44', '86222e', 'b83222')
const ROCK = colors('140b1c', '2c1832', '4e263c')
const FIRE = colors('c22a12', 'f0641a', 'fca82c', 'ffe45e', 'fffbd0')
const ORANGE = colors('5a1a18', 'a8361a', 'dc5c1e', 'f0872e', 'fdb354')
const CREAM = colors('a8663a', 'e0a45c', 'f7d68a', 'fff0b8')
const TEAL = colors('0f2f45', '1b5568', '2e868c', '55b9a6')
const BONE = hex('fff6dc')
const OUTLINE = hex('1a0a14')

const P = (x: number, y: number): Pt => [x, y]

function background(p: Painter): void {
  // night sky that glows red towards the horizon and around the crater
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const down = Math.pow(Math.min(1, y / 90), 1.7) * 0.8
      const glow = Math.max(0, 1 - Math.hypot(x - 67, (y - 60) * 1.2) / 30) * 0.75
      return Math.max(down, glow, Math.min(1, down + glow * 0.6))
    },
    0.8,
  )
  stars(p, rng(7), 18, [CREAM[2], TEAL[3]], { x: 4, y: 16, w: 72, h: 14 })
  sparks(p, rng(11), 18, [FIRE[1], FIRE[2]], { x: 4, y: 40, w: 72, h: 46 })
  p.shine(false)

  // volcano in the distance, lower right
  const cone = p.m().poly([40, 92, 54, 71, 59, 64, 62, 60, 72, 60, 75, 64, 80, 71, 80, 92])
  p.fill(cone, ROCK[1])
  p.fill(cone.clone().minus(cone.moved(2, 1)), ROCK[2])

  // eruption: a narrow jet, lava bombs arcing away from it, streams running down the cone
  p.shine(true)
  fire(p, flameMask(p, 67, 61.5, 6, 15, { lean: 1, seed: 4 }), FIRE.slice(0, 4))
  const arcs = [
    quad(P(65, 57), P(60, 47), P(55, 58), 6),
    quad(P(69, 57), P(75, 46), P(79, 58), 6),
    quad(P(66, 55), P(63, 45), P(59, 49), 5),
  ]
  for (const arc of arcs) {
    arc.slice(1).forEach(([x, y], i) => p.px(Math.round(x), Math.round(y), i % 2 === 0 ? FIRE[1] : FIRE[2]))
  }
  const streams = [
    [63, 61, 60, 66, 61, 72, 57, 79, 55, 90],
    [71, 61, 73, 67, 76, 72, 77, 80, 79, 90],
    [66, 61, 67, 68, 65, 76, 67, 90],
  ]
  for (const stream of streams) {
    const line = p.m().path(stream).and(cone)
    p.fill(line.moved(1, 0).or(line.moved(-1, 0)).and(cone), FIRE[0])
    p.fill(line, FIRE[2])
  }
  p.fill(p.m().rect(62, 60, 10, 1), FIRE[3])
  p.shine(false)

  // ledge in the foreground
  const ledge = p.m().poly([0, 89, 12, 88, 28, 89, 44, 88, 60, 89.5, 80, 88, 80, 112, 0, 112])
  p.fill(ledge, ROCK[0])
  p.edge(ledge, ROCK[2], [0, -1])
}

interface WingShape {
  /** Arm bone: shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tip of the claw on the wrist. */
  spike: Pt
  /** Membrane edge from the wrist: outer tip, middle tip, root at the body. */
  tips: readonly [Pt, Pt, Pt]
  /** Control points that pull the three membrane edges into scallops. */
  pulls: readonly [Pt, Pt, Pt]
  /** -1 for the wing in the back. */
  bias: number
}

function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const [outerTip, middleTip, root] = s.tips
  const outer = quad(wrist, s.pulls[0], outerTip)
  const scallops = [...quad(outerTip, s.pulls[1], middleTip), ...quad(middleTip, s.pulls[2], root)]
  const membrane = d.m().poly([shoulder, elbow, wrist, ...outer, ...scallops])
  d.shade(membrane, TEAL, { bias: s.bias, bevel: 9 })
  // folds running from the wrist to the two inner tips
  for (const tip of [middleTip, root]) {
    const fold = d.m().path(quad(wrist, P((wrist[0] + tip[0]) / 2 + 1.5, (wrist[1] + tip[1]) / 2), tip))
    d.fill(fold.and(membrane), s.bias < 0 ? TEAL[0] : TEAL[1])
  }
  d.part(d.m().limb(outer, [1.3, 1, 0.8, 0.7]), ORANGE, { bias: s.bias - 1, line: 'none' })
  d.part(d.m().limb(s.arm, [2.3, 1.9, 1.4]), ORANGE, { bias: s.bias })
  d.part(d.m().poly([P(wrist[0] - 1.8, wrist[1] + 1), s.spike, P(wrist[0] + 1.8, wrist[1] + 1)]), ORANGE, {
    bias: s.bias,
  })
}

/**
 * The head is hand-pixelled: profile to the right, tilted up, jaws wide open.
 * h o s d = orange from light to dark, k = line, w = teeth and eye white, p = pupil,
 * r = inside of the mouth, t = tongue.
 */
const HEAD = [
  '.....dd.......................',
  '......dsd.....................',
  'ho.....dssd...................',
  '.hoo.....dssoooooo.........ho.',
  '...hoo....soohhhooo...hhhhhooo',
  '....hooo.soohhkooohhhhooooooko',
  '......sooooooowkkoooooooooooos',
  '.......soooooowwpkoooooosssss.',
  '........soooooooooooossssssw..',
  '........sooooooooossssswrrrr..',
  '.........soooooossswrrrrrrrr..',
  '.........dsoooskrrrrrrrrrrr...',
  '.........dsooosrrrrtttttrr....',
  '..........dssooooortttttrr....',
  '...........dsooooooorrrrrr....',
  '............dsoooooooorrwr....',
  '..............ddssoooooow.....',
  '................ddsssooooo....',
  '..................ddsssssss...',
  '......................ddddd...',
]
const HEAD_KEY = {
  h: ORANGE[4],
  o: ORANGE[3],
  s: ORANGE[2],
  d: ORANGE[1],
  k: ORANGE[0],
  w: BONE,
  p: OUTLINE,
  r: SKY[3],
  t: FIRE[0],
}

function dragon(d: Painter, torrent: Mask): void {
  const m = (): Mask => d.m()

  // far wing, mostly hidden behind head and fire
  wing(d, {
    arm: [P(38, 52), P(50, 34), P(65, 17)],
    spike: P(68, 9),
    tips: [P(82, 26), P(68, 36), P(46, 38)],
    pulls: [P(80, 16), P(74, 30), P(58, 36)],
    bias: -1,
  })

  // tail, sweeping out to the left behind the legs and curling up
  d.part(m().limb([26, 82, 16, 85.5, 8.5, 82, 6.5, 75, 9.5, 68.5], [5.2, 4.8, 4, 3, 2]), ORANGE)

  // near wing
  wing(d, {
    arm: [P(28, 55), P(18.5, 39), P(9.5, 20)],
    spike: P(8, 12),
    tips: [P(2.5, 46), P(10, 55), P(22, 63)],
    pulls: [P(0.5, 26), P(8, 44), P(16.5, 51)],
    bias: 0,
  })

  // torso, and a neck drawn back in an S before the roar
  const trunk = m()
    .limb([30, 75, 33, 64, 35.5, 54], [11.5, 10.4, 8.8])
    .limb([35.5, 51, 32.5, 44, 31.5, 37.5], [7.4, 6.6, 6])
  d.part(trunk, ORANGE)
  const belly = m().limb([36.5, 42, 37, 48, 40, 56, 39, 66, 35.5, 77], [2.4, 4, 6, 8.4, 8.8]).and(trunk)
  d.shade(belly, CREAM, { bevel: 7 })
  for (const y of [57, 63, 69, 75]) {
    const crease = m().path(quad(P(28, y + 1.5), P(36, y - 1), P(47, y + 1)))
    d.fill(crease.and(belly), CREAM[1])
  }

  // legs with three claws each
  d.part(m().ellipse(40.5, 78, 6.5, 8, -10).poly([37.5, 83, 46, 82, 51, 85.5, 51, 88, 36.5, 88]), ORANGE)
  d.part(m().ellipse(22, 77, 7, 8.5, 15).poly([13.5, 83.5, 22, 82, 27.5, 85.5, 27.5, 88, 12.5, 88]), ORANGE)
  for (const x of [13, 18, 23, 38, 43, 48]) d.stamp(['ww', '.w'], x, 86, { w: BONE })

  // arms, raised with claws out
  d.part(m().limb([41, 57, 47.5, 62, 51, 56.5], [3.1, 2.6, 2.4]), ORANGE)
  d.stamp(['w.w.w', 'w.w.w'], 49, 52, { w: BONE })
  d.part(m().limb([27, 57.5, 20.5, 63, 18.5, 57], [3.3, 2.7, 2.5]), ORANGE)
  d.stamp(['w.w.w', 'w.w.w'], 16, 53, { w: BONE })

  const head = d.layer().stamp(HEAD, 22, 24, HEAD_KEY)
  d.contact(head.mask()).blit(head)

  // the torrent lights up whatever is close to it, and the right-hand rim of the body below it
  d.tone(d.mask().and(torrent.grown(3)), 1)
  d.tone(
    d
      .mask()
      .facing([1, 0])
      .and(m().rect(40, 44, 20, 26)),
    1,
  )
}

const BREATH_PATH = [47.5, 36.5, 54, 35.5, 61, 34.5, 70, 34, 83, 32]
const BREATH_WIDTHS = [1.8, 3.8, 6.4, 9.6, 14]

/** One layer of the fire torrent; inner layers are thinner and billow out of step. */
function breathLayer(p: Painter, scale: number, phase: number): Mask {
  const widths = BREATH_WIDTHS.map((w, i) => w * scale * (1 + 0.2 * Math.sin(i * 2.4 + phase)))
  return p.m().limb(BREATH_PATH, widths)
}

/** Outline of the torrent: the outer layer plus tongues of flame trailing off its edges. */
function breathShape(p: Painter): Mask {
  const outer = breathLayer(p, 1, 0)
  const tongues = [P(57, 36), P(64, 33), P(71, 30), P(61, 44), P(69, 47)]
  tongues.forEach(([x, y], i) =>
    outer.or(flameMask(p, x, y, 5, 8, { lean: i % 3 === 0 ? -3 : -4, tongues: 0 })),
  )
  return outer
}

function breath(p: Painter, outer: Mask): void {
  // glow on the night air around the torrent
  const halo = outer.grown(2).minus(outer).minus(p.subjectMask)
  halo.each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, SKY[4])
  })
  p.fill(outer, FIRE[0])
  p.fill(breathLayer(p, 0.78, 1.3), FIRE[1])
  p.fill(breathLayer(p, 0.54, 2.6), FIRE[2])
  p.fill(breathLayer(p, 0.32, 3.9), FIRE[3])
  p.fill(breathLayer(p, 0.14, 5.2), FIRE[4])
  for (const [x, y] of pts([57, 26, 74, 20, 56, 45, 63, 49, 75, 50, 70, 52]))
    p.px(x, y, x % 2 === 0 ? FIRE[2] : FIRE[3])
}

export const glurak: CardDef = {
  id: 'pkm-base-090',
  number: 90,
  name: 'Glurak',
  tier: 'grail',
  kind: 'pokemon',
  type: 'Feuer',
  hp: 120,
  attacks: [{ name: 'Feuerwirbel', cost: ['Feuer', 'Feuer', 'Feuer', 'Feuer'], damage: '100' }],
  // the sky and everything that burns shine; dragon, volcano rock and ledge stay matt
  foil: 'painted',
  draw(p) {
    background(p)
    const torrent = breathShape(p)
    const d = p.layer()
    dragon(d, torrent)
    p.subject(d, OUTLINE)

    p.shine(true)
    breath(p, torrent)
    fire(p, flameMask(p, 10, 70, 10, 18, { lean: 2, seed: 3 }), FIRE.slice(0, 4))
    for (const [x, y] of pts([6, 50, 13, 47, 9, 44, 15, 53])) p.px(x, y, FIRE[2])
    p.shine(false)
  },
}
