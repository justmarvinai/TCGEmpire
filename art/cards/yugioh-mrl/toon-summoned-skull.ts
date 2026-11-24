import type { Mask, Painter, Pt, RGB } from '../../toolkit/index.ts'
import { colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Herbeigerufener Toon-Schädel (Ultra). Brief: cartoon skull demon mid-jump, bendy noodle arms wide,
 * goofy grin with the tongue out, zigzag cartoon lightning from its fingertips; comic-panel
 * background with halftone dots and an action starburst behind it. Full art, 80×112, in the Toon
 * look of the set: flat fills, one shadow step, thick ink, big goofy eyes. The cartoon twin of the
 * Summoned Skull of Magic Ruler.
 *
 * Composition: square to the viewer, the fiend hangs mid-jump in front of a comic starburst: bat
 * wings flung up to the top corners, noodle arms wobbling out to the sides, knees pulled up. Zigzag
 * bolts crackle from its claws down to the bottom corners. Its googly eyes look two ways at once and
 * its tongue lolls out of a toothy grin. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('2aa2d8', '5ccaee', '9ae4f8')
const BURST = colors('e0401c', 'ff9a1e', 'ffdc3a', 'fff6b0')
const BONE = colors('8a7cae', 'd0c8e6', 'f4f0fc')
const HIDE = colors('7464a2', 'aa9ed4', 'cec6e8')
const WING = colors('341f52', '573a80')
const HORN = colors('b8946a', 'f4e6c2')
const TONGUE = colors('b0142c', 'ee4256', 'ff98a0')
const MOUTH = hex('4a0a22')
const WHITE = hex('ffffff')
const INK = hex('1a0f2e')

const P = (x: number, y: number): Pt => [x, y]
/** Everything is drawn round the centre line x = 40. */
const MID = 40
const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => P(2 * MID - x, y))

/** Centre of the starburst behind the fiend. */
const BANG = P(40, 48)

/** Ink line on earlier paint around a part: the toon's inner contour. */
function ink(d: Painter, m: Mask): void {
  d.fill(m.outerEdge().and(d.mask()), INK)
}

/** Toon fill: ink contour, flat base colour, a crescent of shadow on the side away from the light. */
function toon(d: Painter, m: Mask, ramp: readonly RGB[], shadow = 2, base = 1): Mask {
  ink(d, m)
  d.fill(m, ramp[base] ?? INK)
  d.fill(m.clone().minus(m.moved(-shadow, -shadow)), ramp[base - 1] ?? INK)
  return m
}

/** A comic starburst: a ring of irregular spikes round a centre. */
function burstMask(p: Painter, [cx, cy]: Pt, outer: number, inner: number, spikes: number, seed: number): Mask {
  const rand = rng(seed)
  const pts: Pt[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const a = ((i + 1) / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? outer * (0.88 + rand() * 0.2) : inner * (0.92 + rand() * 0.12)
    pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.12))
  }
  return p.m().poly(pts)
}

function panel(p: Painter): void {
  p.shine(true)
  // cyan comic sky printed in halftone: dots that swell towards the bottom-left and top-right
  p.fill(p.m().rect(0, 0, 80, 112), SKY[1])
  for (let y = 0; y < 112; y += 3) {
    for (let x = (y / 3) % 2 === 0 ? 0 : 2; x < 80; x += 4) {
      const t = Math.abs(x - 40 - (y - 56) * 0.7) / 56
      if (t > 0.5) p.fill(p.m().disc(x + 0.5, y + 0.5, t > 0.85 ? 1.3 : 0.8), SKY[0])
      else if (t > 0.3) p.set(x, y, SKY[0])
    }
  }
  // the starburst: an inked spiky ring of orange, yellow inside, a pale flash at its heart
  const outer = burstMask(p, BANG, 40, 25, 12, 5)
  p.fill(outer.outerEdge(), INK)
  p.fill(outer, BURST[0])
  p.fill(burstMask(p, BANG, 34, 21, 12, 5), BURST[1])
  p.fill(burstMask(p, BANG, 26, 16, 12, 5), BURST[2])
  p.fill(burstMask(p, BANG, 14, 9, 12, 5), BURST[3])
  p.shine(false)
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  claw: Pt
  /** Finger tips from the top down, then where the membrane meets the body. */
  tips: readonly [Pt, Pt, Pt, Pt]
}

/** A cartoon bat wing: a bony arm, fingers fanning from the wrist, a scalloped membrane between. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    const sag = P(((a[0] + b[0]) / 2) * 0.72 + wrist[0] * 0.28, ((a[1] + b[1]) / 2) * 0.72 + wrist[1] * 0.28)
    edge.push(a, sag)
  }
  edge.push(s.tips[3])
  toon(d, d.m().poly([shoulder, elbow, wrist, ...edge]), WING, 2)
  for (const tip of s.tips.slice(0, 3)) toon(d, d.m().limb([wrist, tip], [1.1, 0.5]), HIDE, 1)
  toon(d, d.m().limb(s.arm, [2, 1.7, 1.4]), HIDE, 1)
  toon(d, d.m().poly([wrist[0] - 1.5, wrist[1] + 1, ...s.claw, wrist[0] + 1.5, wrist[1] + 1]), BONE, 1)
}

const LEFT_WING: WingShape = {
  arm: [P(36, 46), P(29, 37), P(23, 28)],
  claw: P(21, 23),
  tips: [P(12, 27), P(10, 36), P(15, 43), P(31, 46)],
}

/**
 * Googly eyes, the left one small with its pupil up in the corner, the right one big with its
 * pupil down in the other: k = ink, W = white, e = glint.
 */
const EYES = [
  '..........kkkk..',
  '.kkkkk...kWWWWk.',
  'kWWWWWk.kWWWWWWk',
  'kkkWWWk.kWWWWWWk',
  'kekWWWk.kWWWWWWk',
  'kWWWWWk.kWWWWkkk',
  'kWWWWWk.kWWWWkek',
  'kWWWWWk.kWWWWWWk',
  '.kWWWk...kWWWWk.',
  '..kkk.....kkkk..',
]
/** The grin: a row of teeth over a dark mouth that opens wide for the tongue. */
const GRIN = [
  'kk...............kk',
  '.kkkkkkkkkkkkkkkkk.',
  '.kWkWkWkWkWkWkWkWk.',
  '..kmmmmmmmmmmmmmk..',
  '...kkmmmmmmmmmkk...',
  '.....kkkkkkkkk.....',
]
const FACE_KEY = { k: INK, W: WHITE, e: WHITE, m: MOUTH }

function fiend(d: Painter): void {
  const m = (): Mask => d.m()

  // wings flung up behind it
  wing(d, LEFT_WING)
  wing(d, {
    arm: mirror(LEFT_WING.arm) as unknown as WingShape['arm'],
    claw: mirror([LEFT_WING.claw])[0] ?? LEFT_WING.claw,
    tips: mirror(LEFT_WING.tips) as unknown as WingShape['tips'],
  })

  // rubber-hose legs pulled up mid-jump, big clawed feet dangling
  for (const [hip, knee, ankle, foot, dir] of [
    [P(37.5, 61), P(30, 65.5), P(31, 73.5), P(28.5, 76), -1],
    [P(42.5, 61), P(50.5, 64.5), P(49.5, 72.5), P(52, 75), 1],
  ] as const) {
    toon(d, m().limb([hip, knee, ankle], [1.9, 1.7, 1.6]), HIDE, 1)
    toon(d, m().ellipse(foot[0], foot[1], 3.6, 2.2, dir * 12), HIDE, 1)
    d.stamp(['k.k.k'], Math.round(foot[0]) - 2 + dir * 2, Math.round(foot[1]) + 2, { k: BONE[2] })
  }

  // body: a lean belly under a bony ribcage
  toon(d, m().ellipse(MID, 56.5, 5.4, 6.5).ellipse(MID, 61, 4.6, 2.6), HIDE)
  const ribs = m().ellipse(MID, 51.5, 6.4, 5.2)
  toon(d, ribs, BONE)
  for (const y of [49.5, 52, 54.5]) d.fill(m().path([34.5, y, MID, y + 1.5, 45.5, y]).and(ribs.shrunk(1)), INK)
  d.fill(m().rect(MID - 0.5, 47, 1, 9).and(ribs), INK)

  // noodle arms wobbling out to the sides, three claws each
  for (const arm of [
    [P(34.5, 49), P(28, 53.5), P(21, 47.5), P(14.5, 50)],
    [P(45.5, 49), P(52, 44.5), P(59, 50.5), P(65.5, 48)],
  ]) {
    toon(d, m().limb(arm, 1.7), HIDE, 1)
  }
  for (const [x, y, dir] of [
    [12.5, 50.5, -1],
    [67.5, 48, 1],
  ] as const) {
    toon(d, m().disc(x, y, 2.5), HIDE, 1)
    const claws = m()
    for (const dy of [-2, 0, 2]) claws.capsule(x + dir * 2, y + dy, x + dir * 4.2, y + dy * 1.6, 0.7, 0.4)
    toon(d, claws, BONE, 1)
  }

  // horns curling up from the crown, then the skull and its jaw
  for (const horn of [
    [P(31.5, 25), P(25.5, 22.5), P(22.5, 18.5), P(23.5, 15.5)],
    mirror([P(31.5, 25), P(25.5, 22.5), P(22.5, 18.5), P(23.5, 15.5)]),
  ])
    toon(d, m().limb(horn, [2.8, 2.1, 1.3, 0.5]), HORN, 1)
  const skull = m().ellipse(MID, 31, 10.5, 9).ellipse(MID, 40.5, 8, 4)
  toon(d, skull, BONE)
  d.stamp(EYES, 32, 25, FACE_KEY)
  d.stamp(['kkk', '.k.'], MID - 1, 36, { k: INK })
  d.stamp(GRIN, MID - 9, 38, FACE_KEY)

  // the tongue lolls out of the grin and over the chin
  const tongue = m().limb([42.5, 42.5, 43.5, 46.5, 42, 49.5], [1.8, 2.2, 1.7])
  toon(d, tongue, TONGUE, 1)
  d.fill(m().line(43, 44, 43, 47).and(tongue.shrunk(1)), TONGUE[0])
  d.px(41, 46, TONGUE[2])
}

/** A cartoon bolt: a thick zigzag from `from` to `to`, inked, with a white-hot core. */
function bolt(p: Painter, from: Pt, to: Pt, seed: number): void {
  const rand = rng(seed)
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const n = Math.max(2, Math.round(len / 5))
  const nx = -(to[1] - from[1]) / len
  const ny = (to[0] - from[0]) / len
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const off = i === 0 || i === n ? 0 : (i % 2 === 0 ? 1 : -1) * (2 + rand() * 1.2)
    pts.push(P(from[0] + (to[0] - from[0]) * t + nx * off, from[1] + (to[1] - from[1]) * t + ny * off))
  }
  const core = p.m().path(pts)
  const body = core.grown(1).or(core.moved(1, 0).grown(1)).minus(p.subjectMask)
  p.fill(body.outerEdge().minus(p.subjectMask), INK)
  p.fill(body, BURST[2])
  p.fill(core.minus(p.subjectMask), WHITE)
}

function zap(p: Painter): void {
  p.shine(true)
  bolt(p, P(8, 49), P(3, 34), 3)
  bolt(p, P(8, 53), P(4, 70), 8)
  bolt(p, P(72, 46), P(77, 31), 5)
  bolt(p, P(72, 51), P(76, 68), 11)
  p.shine(false)
}

export const toonSummonedSkull: CardDef = {
  id: 'ygo-mrl-077',
  number: 77,
  name: 'Herbeigerufener Toon-Schädel',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'effect',
  print: { level: 6, atk: 2500, def: 1200, type: 'Unterweltler/Toon' },
  // the halftone sky, the starburst and the lightning shine; the fiend stays matt
  foil: 'painted',
  draw(p) {
    panel(p)
    const d = p.layer()
    fiend(d)
    // the toon's thick ink: one more pixel of outline on the shadow side
    const body = d.mask()
    d.fill(body.moved(1, 0).or(body.moved(0, 1)).minus(body), INK)
    p.subject(d, INK)
    zap(p)
  },
}
