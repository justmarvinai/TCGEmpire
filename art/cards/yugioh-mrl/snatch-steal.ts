import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Schnappstahl (Ultra). Brief: a red-gloved hand with a chain reaches in from the bottom right; the
 * chain is looped around the collar of an enemy monster (a generic beast warrior) and drags it
 * across the frame toward the viewer. Steel-grey background of interlocking gears with the open jaws
 * of a steel trap: the "Stahl" pun of the German name. Full art, 80×112.
 *
 * Composition: one diagonal from the top left to the bottom right. The beast warrior stumbles out
 * of the open trap, yanked off its feet by the collar, one arm flung up, the other clutching at the
 * chain; the taut bronze chain runs down to the red-gloved fist that reaches in from the corner.
 * Gears turn behind it all. Text plates float over rows 0–13 and 90–111.
 */
const STEEL = colors('15181e', '232830', '343b45', '4c5562', '6c7886', '9aa6b2')
const BRONZE = colors('4e2c10', '8e5a20', 'cf9440', 'ffd890')
const FUR = colors('1e2a16', '3a4a26', '5a6e36', '84985a')
const LEATHER = colors('2e1a10', '5a3620')
const GLOVE = colors('4a0a10', '8c1a22', 'c83632', 'f47c5c')
const SLEEVE = colors('0e1020', '1e2238')
const BONE = hex('f2ecd8')
const OUTLINE = hex('07080b')

const P = (x: number, y: number): Pt => [x, y]

/** Where the chain leaves the collar and where the fist holds it. */
const RING = P(34, 48)
const FIST = P(62, 74)

/** A gear: a toothed wheel with a hub and holes, shaded as steel. */
function gear(p: Painter, cx: number, cy: number, r: number, teeth: number, turn: number, bias: number): void {
  const wheel = p.m().disc(cx, cy, r - 2)
  for (let i = 0; i < teeth; i++) {
    const a = turn + (i / teeth) * Math.PI * 2
    const w = (Math.PI / teeth) * 0.55
    const at = (rr: number, da: number): Pt => P(cx + Math.cos(a + da) * rr, cy + Math.sin(a + da) * rr)
    wheel.poly([at(r - 2.5, -w * 1.2), at(r + 1, -w * 0.7), at(r + 1, w * 0.7), at(r - 2.5, w * 1.2)])
  }
  const holes = p.m()
  for (let i = 0; i < 4; i++) {
    const a = turn + Math.PI / 4 + (i / 4) * Math.PI * 2
    holes.disc(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.17)
  }
  const body = wheel.minus(holes).minus(p.m().disc(cx, cy, 1.6))
  p.fill(body.outerEdge(), STEEL[0])
  p.shade(body, STEEL.slice(1, 5), { bevel: 2, bias })
  p.fill(body.facing([-1, 0, 0, -1]), STEEL[4 + bias] ?? STEEL[4])
  p.fill(p.m().disc(cx, cy, r * 0.3).minus(p.m().disc(cx, cy, r * 0.3 - 1)), STEEL[1])
}

/** The open jaws of a steel trap: two toothed bows hinged at the bottom, gaping upwards. */
function trap(p: Painter): void {
  const jaws = p.m()
  const teeth = p.m()
  for (const flip of [1, -1]) {
    const x = (v: number): number => 30 + (v - 30) * flip
    const bow = quad(P(x(30), 97), P(x(5), 93), P(x(5), 64), 10)
    jaws.limb(bow, [2.6, 2.4, 2.2])
    for (let i = 1; i < bow.length; i++) {
      const [bx, by] = bow[i] ?? P(0, 0)
      const [ax, ay] = bow[i - 1] ?? P(0, 0)
      const len = Math.hypot(bx - ax, by - ay) || 1
      // each tooth points into the gap between the jaws
      const nx = (-(by - ay) / len) * flip
      const ny = ((bx - ax) / len) * flip
      teeth.poly([P(ax, ay), P((ax + bx) / 2 + nx * 5, (ay + by) / 2 + ny * 5), P(bx, by)])
    }
  }
  const all = jaws.or(teeth)
  p.fill(all.outerEdge(), STEEL[0])
  p.shade(teeth.minus(jaws), STEEL.slice(2), { bevel: 1.5 })
  p.shade(jaws, STEEL.slice(1), { bevel: 1.5 })
  p.fill(p.m().disc(30, 96, 3), STEEL[3])
}

function workshop(p: Painter): void {
  p.shine(true)
  // a dim steel wall, brighter behind the beast
  p.dither(null, STEEL.slice(0, 3), (x, y) => 0.9 - Math.hypot(x - 30, y - 46) / 70 + noise(x, y, 6, 8) * 0.12, 0.6)
  // gears meshing behind the scene
  gear(p, 13, 24, 15, 12, 0.1, -1)
  gear(p, 40, 12, 8, 8, 0.3, -1)
  gear(p, 67, 30, 13, 10, 0.25, -1)
  gear(p, 76, 58, 9, 8, 0.1, -1)
  p.shine(false)
  trap(p)
}

/**
 * The beast's head in profile, facing right and down the chain, jaws gaping in shock: F f d = fur
 * from light to dark, k = ink, W = eye white and fangs, m = mouth.
 */
function beast(d: Painter): void {
  const m = (): Mask => d.m()

  // trailing leg kicked out behind, the other stumbling forward
  d.part(m().limb([17, 58, 11, 65, 5.5, 70], [4, 3.2, 2.4]), FUR, { bias: -1 })
  d.part(m().limb([5.5, 70, 2.5, 69], [2.2, 1.6]), FUR, { bias: -1 })
  // the arm flung up behind, claws spread
  d.part(m().limb([24, 43, 17.5, 36.5, 15, 28.5], [3, 2.5, 2]), FUR, { bias: -1 })
  for (const [tx, ty] of [P(11.5, 25.5), P(14, 24), P(17, 24.5)]) d.part(m().limb([15, 28.5, tx, ty], [1.2, 0.6]), FUR, { bias: -1 })

  // torso leaning into the pull, a leather belt at the hips
  const torso = m().limb([17, 59, 22, 51, 27.5, 45], [6, 6.8, 6.4])
  d.part(torso, FUR)
  d.part(m().limb([12.5, 57, 22, 62.5], [2, 2]).and(torso.grown(1)), LEATHER, { bevel: 1 })
  d.fill(m().path([20, 50, 23, 47]).path([18, 54, 21, 51]).and(torso.shrunk(1)), FUR[1])

  // front leg stumbling forward
  d.part(m().limb([21, 60, 26, 68, 23.5, 76], [4.2, 3.4, 2.6]), FUR)
  d.part(m().limb([23.5, 76, 29, 78], [2.4, 1.8]), FUR)
  d.stamp(['W.W'], 29, 78, { W: BONE })

  // steel pauldron on the far shoulder
  d.part(m().ellipse(22.5, 44, 5, 3.8, -30), STEEL.slice(1), { bevel: 2 })
  d.stamp(['b.b'], 20, 43, { b: BRONZE[2] })

  // the head: skull, ears laid back, snout and gaping jaw thrust down the chain
  d.part(m().limb([28, 32, 24.5, 24.5], [2.4, 0.6]), FUR, { bias: -1 })
  const skull = m().ellipse(32, 36.5, 6.4, 5.6, -20)
  const snout = m().poly([35, 33.5, 44.5, 38, 44, 41, 35.5, 41.5])
  const jaw = m().poly([35, 42, 42.5, 46, 41, 47.5, 34, 45])
  d.part(jaw, FUR, { bias: -1 })
  d.fill(m().poly([36, 41.5, 43.5, 41, 42, 45.5, 36, 43.5]), GLOVE[0])
  d.part(skull.or(snout), FUR)
  d.part(m().limb([32.5, 31.5, 31.5, 23.5], [2.4, 0.6]), FUR)
  d.stamp(['W.W.W', '.....', '..W.W'], 38, 41, { W: BONE })
  d.stamp(['kk'], 44, 38, { k: OUTLINE })
  d.stamp(['kkk', 'WWk', 'Wkk'], 33, 33, { k: OUTLINE, W: BONE })
  d.fill(m().path([31, 32, 35, 31.5]).and(skull), FUR[0])

  // the near arm grabbing at the chain below its chest
  d.part(m().limb([27, 50, 31, 56.5, 37.5, 56], [3, 2.5, 2.2]), FUR)
  d.part(m().ellipse(38.5, 55, 2.6, 2.2), FUR)
  d.stamp(['W.W'], 39, 53, { W: BONE })

  // the collar round its neck, studded, a bronze ring at the front for the chain
  const collar = m().limb([24, 45.5, 28.5, 47.5, 33, 46.5], [2.2, 2.2, 2])
  d.part(collar, LEATHER, { bevel: 1 })
  d.stamp(['b..b..b'], 25, 46, { b: BRONZE[3] })
  d.part(m().disc(RING[0], RING[1], 2.4).minus(m().disc(RING[0], RING[1], 1)), BRONZE, { bevel: 1 })
}

/** The chain: bronze links alternating face-on and edge-on, taut from the collar to the fist. */
function chain(c: Painter): void {
  const n = 9
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const x = RING[0] + 1.5 + (FIST[0] - RING[0] - 4) * t
    const y = RING[1] + 1.5 + (FIST[1] - RING[1] - 4) * t + Math.sin(t * Math.PI) * 1.2
    if (i % 2 === 1) {
      const link = c.m().ellipse(x, y, 3.2, 2.1, 43).minus(c.m().ellipse(x, y, 1.6, 0.6, 43))
      c.part(link, BRONZE, { bevel: 1.5 })
    } else c.part(c.m().capsule(x - 2, y - 1.9, x + 2, y + 1.9, 1.1), BRONZE, { bevel: 1 })
  }
}

/** The red-gloved fist reaching in from the corner: knuckles up, the chain running through it. */
function glove(c: Painter): void {
  const m = (): Mask => c.m()
  // the loose end of the chain hangs out under the fist
  for (const [x, y, face] of [
    [60.5, 82.5, false],
    [59.5, 86.5, true],
  ] as const) {
    if (face) c.part(m().ellipse(x, y, 1.9, 2.8, 10).minus(m().ellipse(x, y, 0.5, 1.3, 10)), BRONZE, { bevel: 1 })
    else c.part(m().capsule(x, y - 2, x - 0.6, y + 2, 1.1), BRONZE, { bevel: 1 })
  }
  c.part(m().limb([84, 98, 77, 89, 72.5, 83], [6.4, 5.8, 5]), SLEEVE, { bevel: 3 })
  // a flared gauntlet cuff, then the back of the hand
  c.part(m().poly([66, 80.5, 72, 74.5, 79, 82, 73, 88]), GLOVE, { bevel: 2, bias: -1 })
  c.fill(m().path([67, 81, 72.5, 75.5]), GLOVE[3])
  const hand = m().ellipse(67.5, 75, 5.4, 4.2, -40)
  c.part(hand, GLOVE, { bevel: 3 })
  // four curled fingers wrapped round the chain, each knuckle catching the light
  for (const [x, y] of [P(60.5, 75.5), P(62, 78), P(64, 80), P(66.5, 81.5)]) {
    const finger = m().ellipse(x, y, 2.1, 1.7, -40)
    c.part(finger, GLOVE, { bevel: 1.5 })
    c.fill(finger.facing([1, 1]).and(m().rect(0, 0, 80, 112)), GLOVE[0])
  }
  // the thumb pressed over the chain
  c.part(m().limb([69, 71.5, 64.5, 70.5, 61.5, 72.5], [1.9, 1.7, 1.5]), GLOVE, { bevel: 1.5 })
}

export const snatchSteal: CardDef = {
  id: 'ygo-mrl-076',
  number: 76,
  name: 'Schnappstahl',
  tier: 'ultra',
  kind: 'spell',
  sub: 'equip',
  text: 'Monster klauen',
  // the steel wall with its gears shines; trap, beast, chain and glove stay matt
  foil: 'painted',
  draw(p) {
    workshop(p)
    const d = p.layer()
    beast(d)
    chain(d)
    glove(d)
    p.subject(d, OUTLINE)
  },
}
