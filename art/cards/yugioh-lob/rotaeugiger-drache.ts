import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Rotäugiger schwarzer Drache (Ultra). Brief: sleek black dragon perched on a crag, red eyes
 * glowing, wings half-open, embers, volcanic night. Full art, 80×112.
 *
 * Composition: the dragon crouches on a rock spire in the lower middle and leans out to the right,
 * head thrust forward, eye burning. Its wings rise half-open to the upper left,
 * backlit red by the lava below; volcanoes glow on the horizon and embers drift up. Faces right,
 * the mirror of the Blue-Eyes Grail. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('0b0306', '1c060b', '360a10', '5c1012', '8c1c10', 'c03612', 'ec6a1c')
const EMBER = colors('ff9a2a', 'ffd462', 'fff4c0')
const BLACK = colors('07060c', '141019', '231b2c', '362a44', '4e3e62', '6e5c86')
/** Wing membranes: black where they are thick, glowing red where the lava shines through. */
const MEMBRANE = [BLACK[0], BLACK[1], SKY[2], SKY[3], SKY[4]]
const EYE = colors('b80c18', 'ff3a2a', 'ffc0a0')
const ROCK = colors('0a0507', '1a0c10', '2c1418', '44201e')
const OUTLINE = hex('020103')

const P = (x: number, y: number): Pt => [x, y]

/** Where the lava glow is strongest, low behind the spire. */
const GLOW = P(36, 82)

function volcanic(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot((x - GLOW[0]) * 0.8, y - GLOW[1]) / 70)
      const smoke = noise(x * 0.6, y * 1.2, 4, 9) * 0.22 + noise(x, y * 0.8, 11, 4) * 0.06
      return glow * glow * 1.05 + smoke - 0.06
    },
    0.75,
  )
  p.shine(false)

  // volcanoes on the horizon; the far one spills lava from its crater
  const far = p
    .m()
    .poly([
      0, 84, 8, 80, 16, 75, 22, 75, 28, 79, 40, 84, 54, 82, 60, 76, 65, 71, 71, 71, 75, 76, 80, 79, 80, 112,
      0, 112,
    ])
  p.fill(far, SKY[1])
  p.fill(far.facing([0, -1]), SKY[2])
  p.shine(true)
  p.fill(p.m().path([67, 72, 66, 75, 64, 78, 63, 82]).and(far), SKY[5])
  p.fill(p.m().rect(66, 71, 5, 1), EMBER[1])
  p.fill(p.m().rect(17, 75, 4, 1), SKY[5])
  p.shine(false)

  // the spire the dragon perches on: dark rock, its edges lit by the lava
  const spire = p
    .m()
    .poly([
      10, 112, 14, 96, 18, 90, 20, 82, 24, 77, 30, 75, 38, 76, 46, 74, 52, 77, 54, 84, 58, 92, 60, 100, 64,
      112,
    ])
  p.dither(spire, ROCK, (x, y) => 0.35 + noise(x, y * 1.5, 7, 3) * 0.45 - (y - 76) / 90, 0.6)
  p.fill(spire.facing([1, 0]).and(p.m().rect(40, 76, 30, 36)), SKY[5])
  p.fill(spire.facing([0, -1]), ROCK[3])
  for (const crack of [
    [30, 86, 33, 92, 31, 100],
    [46, 90, 44, 96, 47, 104],
  ])
    p.fill(p.m().path(crack).and(spire.shrunk(1)), SKY[4])
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tip of the spike on the wrist. */
  claw: Pt
  /** Tips of the finger bones, from the outside in, and where the membrane meets the body. */
  tips: readonly [Pt, Pt, Pt, Pt]
  bias: number
}

/** A half-open wing: a bony arm, three spiked fingers, the membrane sagging deep between them. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    const mid = P(((a[0] + b[0]) / 2) * 0.6 + wrist[0] * 0.4, ((a[1] + b[1]) / 2) * 0.6 + wrist[1] * 0.4)
    edge.push(...quad(a, mid, b, 6))
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.shade(membrane, MEMBRANE, { bias: s.bias, bevel: 7 })
  for (const tip of s.tips.slice(0, 3))
    d.part(d.m().limb([wrist, tip], [1.3, 0.5]), BLACK, { bias: s.bias, line: 'shadow' })
  d.part(d.m().limb(s.arm, [2.6, 2, 1.5]), BLACK, { bias: s.bias })
  const [wx, wy] = wrist
  const [ex, ey] = elbow
  d.part(d.m().poly([wx - 1.5, wy + 1, ...s.claw, wx + 1.5, wy + 1]), BLACK, { bias: s.bias })
  d.part(d.m().poly([ex - 1.5, ey, ex - 5, ey + 1, ex, ey + 2]), BLACK, { bias: s.bias })
}

const FAR_WING: WingShape = {
  arm: [P(44, 55), P(47, 35), P(43, 17)],
  claw: P(45, 10),
  tips: [P(34, 20), P(32, 34), P(36, 47), P(42, 56)],
  bias: -1,
}
const NEAR_WING: WingShape = {
  arm: [P(38, 58), P(25, 41), P(17, 20)],
  claw: P(18, 12),
  tips: [P(3, 30), P(1, 50), P(12, 64), P(30, 66)],
  bias: 0,
}

/**
 * The head is hand-pixelled: profile to the right, lowered, jaws parted on a glow, horns swept
 * back. W w l m s k = black from light to dark, o O = the glow in the mouth, t = teeth. The eye is
 * stamped separately so it can shine.
 */
const HEAD = [
  'WW............................',
  '.WWw..........................',
  '..WWwl........................',
  '...Wwwll......................',
  '....Wwwlll....................',
  '.....wwwllWWWW................',
  'WWw...wllwwwwwWWWW............',
  '.WWwl..mlwwwwwwwwwWWW.........',
  '..lwwll.mlwwkkkwwwwwwWWW......',
  '....lmmmmllk....kwwwwwwwWWW...',
  '.....smmmlwlwkkklllwwwwwwwWWW.',
  '......smmlmwlllllllllllllwwwWW',
  '.....ssmmlmmmmmmmmmmmlllllllll',
  '....ssmmmlmmkoOOOOOOOOOoooo...',
  '...sssmmmmmmmtotoooototo......',
  '..ssm..ssmmmmmmmmlllll........',
  '.ss.....sssmmmmmmmmm..........',
  's..........sss..sss...........',
]
const HEAD_KEY = {
  W: BLACK[5],
  w: BLACK[4],
  l: BLACK[3],
  m: BLACK[2],
  s: BLACK[1],
  k: BLACK[0],
  o: SKY[3],
  O: SKY[5],
  t: EMBER[2],
}
const HEAD_AT = P(46, 27)
const EYE_GRID = ['rRRe']
const EYE_AT = P(HEAD_AT[0] + 12, HEAD_AT[1] + 9)

/** A row of spikes along a curve, each pointing along (dx, dy). */
function spikes(d: Painter, at: readonly Pt[], dx: number, dy: number, len: number, bias = 0): void {
  for (const [x, y] of at) {
    const spike = d
      .m()
      .poly([x - dy * 1.4, y + dx * 1.4, x + dx * len, y + dy * len, x + dy * 1.4, y - dx * 1.4])
    d.part(spike, BLACK, { bias, bevel: 1.5 })
  }
}

function dragon(d: Painter): void {
  const m = (): Mask => d.m()

  wing(d, FAR_WING)

  // tail hanging down the left side of the spire, spikes along it
  d.part(m().limb([27, 69, 20, 74, 17, 84, 19, 94, 15, 106], [4, 3.4, 2.8, 2.2, 1.2]), BLACK, { bias: -1 })
  spikes(d, [P(17, 77), P(14, 88), P(15, 99)], -1, -0.2, 3, -1)

  // far legs, gripping the rock behind the near ones
  d.part(m().limb([33, 69, 39, 74, 35, 77.5], [3.6, 2.8, 2.2]), BLACK, { bias: -1 })
  d.part(m().limb([51, 61, 55, 69, 54, 75.5], [2.6, 2.2, 2]), BLACK, { bias: -1 })

  wing(d, NEAR_WING)

  // body crouched low on the spire, sleek, rising to the shoulders; spikes along the spine
  const body = m().limb([25, 69, 34, 66, 44, 61, 49, 57], [5.4, 6.2, 6.4, 5.8])
  d.part(body, BLACK)
  const belly = m().limb([30, 72.5, 40, 68.5, 49, 63], [2.2, 3, 3.2]).and(body)
  d.shade(belly, BLACK, { bevel: 2 })
  for (const x of [33, 37, 41, 45]) d.fill(belly.clone().and(m().line(x, 62, x - 3, 76)), BLACK[1])
  spikes(d, [P(25, 63), P(31, 60), P(37, 57)], -0.3, -1, 3.6)

  // near hind leg folded under: thigh forward, shin back, the foot gripping the edge
  const thigh = m().limb([28, 66, 34, 71.5, 31, 75], [5.2, 4.2, 2.6])
  d.part(thigh, BLACK)
  d.part(m().limb([31, 75, 24, 77.5], [2.4, 1.8]), BLACK)
  d.stamp(['t.t.t', 't.t.t'], 20, 77, { t: EMBER[2] })

  // near arm reaching down the front of the spire, claws hooked over the rock
  const arm = m().limb([46, 59, 51.5, 66, 48.5, 74], [3.4, 2.7, 2.2])
  d.part(arm, BLACK)
  d.tone(arm.moved(-1, 1).minus(arm), -1)
  d.stamp(['t.t.t', 't.t.t'], 45, 74, { t: EMBER[2] })

  // neck rising from the chest and bending forward to the head, spikes down its back
  const neck = m().limb([48, 58, 51, 50, 54, 45, 57, 42], [5, 4.2, 4, 4.2])
  d.part(neck, BLACK)
  spikes(d, [P(47, 51), P(50, 45), P(53, 40)], -0.7, -0.7, 3.4)

  const head = d.layer().stamp(HEAD, HEAD_AT[0], HEAD_AT[1], HEAD_KEY)
  d.contact(head.mask()).blit(head)
  d.shine(true)
  d.stamp(EYE_GRID, EYE_AT[0], EYE_AT[1], { r: EYE[0], R: EYE[1], e: EYE[2] })
  d.shine(false)

  // the lava lights the undersides
  d.fill(
    d
      .mask()
      .facing([0, 1])
      .and(m().rect(14, 40, 66, 50)),
    SKY[5],
  )
}

/** The eye burns: a red glow on the skull round it, a streak trailing back. Embers drift up. */
function glare(p: Painter): void {
  const [x, y] = EYE_AT
  p.shine(true)
  for (const [gx, gy] of [P(-1, 0), P(4, 0), P(1, -1), P(2, -1), P(1, 1), P(2, 1)])
    p.px(x + gx, y + gy, EYE[0])
  for (let i = 0; i < 9; i++) p.px(x - 2 - i, y - Math.floor(i / 3), i < 4 ? EYE[1] : EYE[0])
  const rand = rng(23)
  for (let i = 0; i < 40; i++) {
    const ex = 2 + Math.floor(rand() * 76)
    const ey = 14 + Math.floor(rand() * 74)
    const c = [EMBER[0], EMBER[1], SKY[6]][i % 3] ?? EMBER[0]
    if (p.subjectMask.has(ex, ey) && i % 5 !== 0) continue
    p.px(ex, ey, c)
    if (i % 3 === 0 && !p.subjectMask.has(ex, ey + 1)) p.px(ex, ey + 1, EMBER[0])
  }
  p.shine(false)
}

export const rotaeugigerDrache: CardDef = {
  id: 'ygo-lob-083',
  number: 83,
  name: 'Rotäugiger schwarzer Drache',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'normal',
  print: { atk: '2400', def: '2000', level: 7, type: 'Drache' },
  // the glowing sky, the lava, the burning eye and the embers shine; dragon and rock stay matt
  foil: 'painted',
  draw(p) {
    volcanic(p)
    const d = p.layer()
    dragon(d)
    p.subject(d, OUTLINE)
    glare(p)
  },
}
