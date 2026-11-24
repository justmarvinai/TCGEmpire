import type { Mask, Painter, Pt, RGB } from '../../toolkit/index.ts'
import { colors, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Verbrecher-Duo (Ultra). Brief: two little imps back to back, one red with a pointed tail, one blue
 * with bat ears, each snatching a card out of a fanned hand held up at the frame edges; cheeky grins.
 * Night alley under a single street lamp. Full art, 80×112.
 *
 * Composition: one street lamp hangs from a bracket at the top and throws a cone of yellow light
 * down the alley. In the cone the two imps stand back to back, red on the left, blue on the right,
 * grinning out at the viewer while each pinches a card out of a fan that a hand holds up out of the
 * dark at its edge of the picture. The red imp's tail curls up between them. Text plates float over
 * rows 0–13 and 90–111.
 */
const NIGHT = colors('05060f', '0a0d1e', '121834', '1c2448', '2a3460')
const LIGHT = colors('4a4448', '8a7650', 'd8aa48', 'ffe27a', 'fffbe0')
const RED = colors('520a14', '9e1c24', 'e24838', 'ff9c78')
const BLUE = colors('0a1a56', '1c46aa', '3a86ea', '9ad2ff')
const CARD = colors('aab2c8', 'f6f6f0')
const OUTLINE = hex('020309')

const P = (x: number, y: number): Pt => [x, y]

/** The lamp, and how far its light reaches down the wall. */
const LAMP = P(40, 21)
const GROUND = 81

/** How brightly the lamp lights a point of the wall: a cone that widens and fades downwards. */
function lit(x: number, y: number): number {
  if (y < LAMP[1]) return 0
  const t = (y - LAMP[1]) / (GROUND - LAMP[1])
  const half = 5 + t * 33
  const across = Math.abs(x + 0.5 - LAMP[0]) / half
  return Math.max(0, 1 - across ** 4) * (1 - t * 0.3)
}

function alley(p: Painter): void {
  // brick wall in the dark; where the cone falls on it, it warms through the night blues to lamp light
  p.dither(p.m().rect(0, 0, 80, GROUND), NIGHT.slice(1, 4), (x, y) => 0.2 + noise(x, y, 4, 9) * 0.3 - y / 300, 0.6)
  p.shine(true)
  p.dither(
    p.m().rect(0, LAMP[1], 80, GROUND - LAMP[1]),
    [NIGHT[2], NIGHT[3], LIGHT[0], LIGHT[1], LIGHT[2]],
    (x, y) => lit(x, y) * 0.95 + noise(x, y, 4, 9) * 0.1 - 0.05,
    0.5,
  )
  p.shine(false)
  for (let y = 16; y < GROUND; y += 4) {
    const mortar = p.m().rect(0, y, 80, 1)
    for (let x = (y / 4) % 2 === 0 ? 2 : 6; x < 80; x += 8) mortar.rect(x, y - 3, 1, 3)
    mortar.each((x, y2) => p.set(x, y2, lit(x, y2) > 0.55 ? LIGHT[0] : lit(x, y2) > 0.25 ? NIGHT[2] : NIGHT[0]))
  }

  // the cobbled ground, lit in a pool under the imps
  p.fill(p.m().rect(0, GROUND, 80, 31), NIGHT[0])
  for (let row = 0; row < 8; row++) {
    const y = GROUND + 1 + row * 3.5
    for (let x = (row % 2) * 3 - 2; x < 82; x += 6) {
      const pool = Math.max(0, 1 - Math.hypot((x + 2.5 - 40) / 32, (y - GROUND - 2) / 9))
      const stone = p.m().ellipse(x + 2.5, y + 1.2, 2.6, 1.4)
      p.fill(stone, pool > 0.5 ? NIGHT[4] : pool > 0.15 ? NIGHT[3] : NIGHT[2])
      p.fill(stone.facing([0, -1]), pool > 0.5 ? LIGHT[1] : pool > 0.15 ? NIGHT[4] : NIGHT[3])
    }
  }

  // the lamp: a bracket from the right wall, a lantern with a glowing pane
  p.fill(p.m().path([80, 14, 60, 14, 46, 15, 41, 16]).path([80, 15, 62, 15]), NIGHT[0])
  p.fill(p.m().path([70, 15, 74, 19, 78, 19]), NIGHT[0])
  p.fill(p.m().poly([36.5, 18, 43.5, 18, 42, 16.5, 38, 16.5]), NIGHT[0])
  p.shine(true)
  const pane = p.m().poly([37, 18, 43, 18, 42, 23, 38, 23])
  p.fill(pane, LIGHT[3])
  p.fill(p.m().rect(39, 19, 2, 3), LIGHT[4])
  p.fill(p.m().rect(37, 23, 6, 1), NIGHT[0])
  p.shine(false)
}

/** One playing card, the face to the viewer with a little picture on it; `turn` in degrees. */
function card(p: Painter, at: Pt, turn: number, art: RGB, clip?: Mask): void {
  const a = (turn * Math.PI) / 180
  const pt = (u: number, v: number): Pt => P(at[0] + u * Math.cos(a) - v * Math.sin(a), at[1] + u * Math.sin(a) + v * Math.cos(a))
  const face = p.m().poly([pt(-3.2, -5), pt(3.2, -5), pt(3.2, 5), pt(-3.2, 5)])
  const keep = (m: Mask): Mask => (clip ? m.minus(clip) : m)
  p.fill(keep(face.outerEdge()), OUTLINE)
  p.fill(keep(face.clone()), CARD[1])
  p.fill(keep(face.facing([1, 0, 0, 1])), CARD[0])
  p.fill(keep(p.m().poly([pt(-1.8, -3.2), pt(1.8, -3.2), pt(1.8, 0.2), pt(-1.8, 0.2)])), art)
}

/** A fan of cards held up from the edge of the picture by a hand reaching out of the dark. */
function fan(p: Painter, pivot: Pt, dir: 1 | -1): void {
  const [px, py] = pivot
  const arts = [RED[1], BLUE[1], LIGHT[2]]
  ;[-34, -14, 6].forEach((deg, i) => {
    const a = ((deg * dir - 90) * Math.PI) / 180
    card(p, P(px + Math.cos(a) * 6, py + Math.sin(a) * 6), deg * dir, arts[i] ?? CARD[0])
  })
  // the hand: fingers closed round the foot of the fan, the thumb over it, the wrist out of the dark
  const hand = p
    .m()
    .ellipse(px, py + 1, 3.6, 3)
    .capsule(px - dir * 2, py + 2, px - dir * 9, py + 6, 2.4)
    .capsule(px + dir * 1, py - 1.5, px + dir * 3, py - 3.5, 1)
  p.fill(hand.outerEdge(), OUTLINE)
  p.fill(hand, NIGHT[3])
  p.fill(hand.facing([0, -1]), NIGHT[4])
}

/**
 * An imp's face in three-quarter view, looking out of the picture with a cheeky grin:
 * k = ink, Y = yellow eyes, W = teeth, m = mouth. Drawn for an imp facing left, mirrored for the other.
 */
const FACE = ['kk...kk..', '.Yk..Yk..', '.........', 'kWWWWWk..', '.kmmmk...']

interface ImpLook {
  ramp: readonly RGB[]
  /** +1 faces right, -1 faces left. */
  dir: 1 | -1
  /** Centre of the imp. */
  x: number
  /** Where its raised hand pinches the stolen card. */
  grab: Pt
}

function imp(d: Painter, look: ImpLook): void {
  const m = (): Mask => d.m()
  const { ramp, dir, x, grab } = look
  const X = (v: number): number => x + v * dir

  // stubby legs, the feet turned outwards
  for (const [hip, foot, bias] of [
    [1, 3, 0],
    [-2.5, -1, -1],
  ] as const) {
    d.part(m().limb([X(hip), 69, X(foot), 78], [2.6, 2.2]), ramp, { bias })
    d.part(m().ellipse(X(foot + 1.5), 79.5, 2.9, 1.5), ramp, { bias })
  }
  // pear-shaped body, the belly to its own side
  const body = m().ellipse(X(0), 64, 6.2, 7.2)
  d.part(body, ramp)
  d.fill(m().ellipse(X(2), 66, 3.2, 4).and(body.shrunk(1)), ramp[2] ?? OUTLINE)
  // the raised arm, the hand pinching the card at the edge
  d.part(m().limb([X(3.5), 59, X(12), 52, grab[0] - dir * 2.5, grab[1] + 2], [2, 1.7, 1.5]), ramp)
  d.part(m().disc(grab[0] - dir * 1.8, grab[1] + 1.2, 2), ramp)
  // big head, three-quarter view towards the viewer and its own side
  const head = m().ellipse(X(1), 48.5, 7.4, 6.6)
  d.part(head, ramp, { bevel: 4 })
  d.stamp(FACE, Math.round(X(1) - (dir < 0 ? 6 : 2)), 46, { k: OUTLINE, Y: LIGHT[3], W: CARD[1], m: RED[0] }, dir > 0)
}

function duo(d: Painter): void {
  const m = (): Mask => d.m()
  // the red imp's tail curls up between them, high over their heads, and ends in an arrowhead
  d.part(m().limb([37, 69, 40.5, 63, 41, 52, 40, 42, 42.5, 33.5], [1.3, 1.2, 1.1, 1, 0.9]), RED, { bias: -1 })
  d.part(m().poly([39.5, 33.5, 43.5, 27.5, 46, 34, 43, 32.5]), RED, { bevel: 1 })

  imp(d, { ramp: BLUE, dir: 1, x: 48, grab: P(63, 31) })
  // bat ears: broad, pointed, with a scalloped lower edge
  for (const [root, tip, back] of [
    [P(50, 43), P(56, 30.5), P(56.5, 45)],
    [P(46, 42.5), P(44.5, 34), P(42.5, 44.5)],
  ] as const) {
    const sag = (k: number, drop: number): Pt => P(tip[0] + (back[0] - tip[0]) * k, tip[1] + (back[1] - tip[1]) * k - drop)
    const ear = m().poly([root, tip, sag(0.3, -0.5), sag(0.45, 1.5), sag(0.7, -0.5), sag(0.82, 1), back])
    d.part(ear, BLUE, { bevel: 2 })
    d.fill(m().line(root[0], root[1], (tip[0] * 2 + back[0]) / 3, (tip[1] * 2 + back[1]) / 3).and(ear.shrunk(1)), BLUE[0])
  }
  imp(d, { ramp: RED, dir: -1, x: 32, grab: P(17, 31) })
  // little horns on the red imp
  for (const [a, b] of [
    [P(28.5, 43), P(26.5, 38.5)],
    [P(34.5, 42.5), P(35.5, 38)],
  ] as const)
    d.part(m().limb([a, b], [1.4, 0.4]), RED, { bias: 1 })
}

export const delinquentDuo: CardDef = {
  id: 'ygo-mrl-075',
  number: 75,
  name: 'Verbrecher-Duo',
  tier: 'ultra',
  kind: 'spell',
  sub: 'normal',
  text: 'Gegner wirft 2 ab',
  // the lamp and the brightest part of its light shine; the alley, the imps and the cards stay matt
  foil: 'painted',
  draw(p) {
    alley(p)
    fan(p, P(5, 47), 1)
    fan(p, P(75, 47), -1)
    const d = p.layer()
    duo(d)
    p.subject(d, OUTLINE)
    // the card each imp has pulled out of its fan, pinched up by a corner
    card(p, P(14, 34), 28, BLUE[1], p.subjectMask)
    card(p, P(66, 34), -28, RED[1], p.subjectMask)
  },
}
