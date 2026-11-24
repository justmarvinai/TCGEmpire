import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Schw. Totenkopfdrache (Ultra, the real cover card). Brief: black dragon rearing on its hind legs,
 * turned three-quarters toward the viewer, wings fully spread, a horned bone skull mask with red
 * eyes, jaws open, molten fire roaring toward the lower left. Volcanic ridge at night. Full art, 80×112.
 *
 * Composition: the dragon rears on the ridge, chest to the viewer, and turns its masked head down to
 * the left. Both wings spread to the top corners, so wrists, shoulders and the head read as one big
 * W against the red sky. The fire pours from the jaws to the lower left corner; it and the skull are
 * the only light areas. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('060103', '12030a', '22050e', '380912', '540e15', '7a1618')
const BLACK = colors('060509', '0e0c14', '18141f', '241e2e', '342a42', '4a3c5e')
const RIM = hex('6c56a4')
const BONE = colors('3a2e28', '766650', 'b4a282', 'e4d8b6', 'fff7de')
const EYE = colors('c0101e', 'ff5a3a')
const FIRE = colors('8a1a06', 'cc420c', 'f47c1a', 'ffbe3c', 'fff09a')
const ROCK = colors('0a0406', '180a0c', '2a1412')
const OUTLINE = hex('030105')

const P = (x: number, y: number): Pt => [x, y]

/** The skull: centre of the cranium and how far the head is turned down (degrees). */
const HEAD = P(37, 29)
const TILT = -22
/** A point of the head, given in its own frame (x to the back of the skull, y down). */
const at = (x: number, y: number): Pt => xf([x, y], { rot: TILT, dx: HEAD[0], dy: HEAD[1] })[0] ?? HEAD

/**
 * The axis of the fire: it leaves the open jaws along the mouth, then bends down and roars into the
 * lower left corner.
 */
const STREAM = quad(at(-13, 7.5), P(15, 49), P(2, 108), 40)

/** Heat of the fire stream at a pixel: 1 on its axis, 0 at its billowing edge, below 0 outside. */
function heat(x: number, y: number): number {
  const cx = x + 0.5
  const cy = y + 0.5
  let best = Infinity
  let t = 0
  for (let i = 0; i + 1 < STREAM.length; i++) {
    const [ax, ay] = STREAM[i] ?? P(0, 0)
    const [bx, by] = STREAM[i + 1] ?? P(0, 0)
    const len2 = (bx - ax) ** 2 + (by - ay) ** 2
    const k = Math.max(0, Math.min(1, ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / len2))
    const dist = Math.hypot(ax + (bx - ax) * k - cx, ay + (by - ay) * k - cy)
    if (dist < best) [best, t] = [dist, (i + k) / (STREAM.length - 1)]
  }
  if (t <= 0 && best > 1.5) return -1
  // the stream widens and billows as it falls
  const width = 1.8 + t * 10
  return 1 - best / width + (noise(x, y, 21, 3.5) - 0.5) * 0.6 * Math.min(1, t * 5)
}

function night(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const below = Math.max(0, 1 - Math.hypot((x - 44) * 0.6, y - 104) / 78)
      const fire = Math.max(0, 1 + heat(x, y) * 0.8)
      const smoke = noise(x * 0.6, y * 1.4, 5, 10) * 0.26 + noise(x, y, 12, 4) * 0.06
      return 0.1 + below * below * 0.9 + fire * 0.28 + smoke - 0.1
    },
    0.75,
  )
  p.shine(false)

  // the volcanic ridge the dragon rears on, lit from below and by the fire; lava seeps from cracks
  const ridge = p
    .m()
    .poly([
      0, 90, 8, 87, 16, 89, 24, 85, 32, 87, 42, 84, 52, 87, 60, 84, 68, 86, 74, 83, 80, 85, 80, 112, 0, 112,
    ])
  p.dither(ridge, ROCK, (x, y) => 0.8 - (y - 84) / 16 + noise(x, y * 1.5, 7, 3) * 0.3, 0.6)
  p.fill(ridge.facing([0, -1]), SKY[5])
  p.shine(true)
  for (const crack of [
    [46, 87, 44, 90],
    [70, 86, 72, 90],
    [20, 88, 22, 91],
  ])
    p.fill(p.m().path(crack).and(ridge.shrunk(1)), FIRE[1])
  p.shine(false)
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tip of the hooked claw on the wrist. */
  claw: Pt
  /** Tips of the finger bones, from the top down, and where the membrane meets the body. */
  tips: readonly [Pt, Pt, Pt, Pt]
  bias: number
}

/** A fully spread wing: the arm rises to the wrist, three fingers fan down, the membrane sags between. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    const mid = P(((a[0] + b[0]) / 2) * 0.66 + wrist[0] * 0.34, ((a[1] + b[1]) / 2) * 0.66 + wrist[1] * 0.34)
    edge.push(...quad(a, mid, b, 6))
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.shade(membrane, BLACK, { bias: s.bias - 1, bevel: 6 })
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    d.tone(
      d
        .m()
        .poly([wrist, P(a[0] * 0.5 + b[0] * 0.5, a[1] * 0.5 + b[1] * 0.5), b])
        .and(membrane),
      -1,
    )
  }
  for (const tip of s.tips.slice(0, 3))
    d.part(d.m().limb([wrist, tip], [1.3, 0.5]), BLACK, { bias: s.bias + 1, line: 'shadow' })
  const arm = d.m().limb(s.arm, [2.8, 2.2, 1.6])
  d.part(arm, BLACK, { bias: s.bias })
  d.fill(arm.facing([0, -1]), BLACK[4])
  const [wx, wy] = wrist
  d.part(d.m().poly([wx - 1.5, wy + 1, ...s.claw, wx + 1.5, wy + 1]), BONE, { bevel: 1.5, bias: -1 })
  // a bone spike on the elbow, pointing back
  const [ex, ey] = elbow
  d.part(d.m().poly([ex - 1.5, ey + 1, ex + (ex < 40 ? -2 : 2), ey + 5, ex + 1.5, ey + 1]), BONE, {
    bevel: 1,
    bias: -2,
  })
}

const NEAR_WING: WingShape = {
  arm: [P(40, 45), P(26, 34), P(12, 21)],
  claw: P(9, 16),
  tips: [P(2, 27), P(2, 45), P(9, 61), P(36, 60)],
  bias: 0,
}
const FAR_WING: WingShape = {
  arm: [P(54, 44), P(64, 32), P(71, 21)],
  claw: P(74, 16),
  tips: [P(78, 28), P(78, 46), P(70, 62), P(55, 60)],
  bias: -1,
}

/** A row of spikes along the back, each pointing along (dx, dy). */
function spikes(d: Painter, at: readonly Pt[], dx: number, dy: number, len: number): void {
  for (const [x, y] of at) {
    const spike = d
      .m()
      .poly([x - dy * 1.3, y + dx * 1.3, x + dx * len, y + dy * len, x + dy * 1.3, y - dx * 1.3])
    d.part(spike, BLACK, { bevel: 1.5 })
  }
}

/** Three hooked claws of a hand or foot, dull bone, spreading from (x, y) towards `way`. */
function claws(d: Painter, x: number, y: number, way: 'left' | 'up' | 'down'): void {
  const key = { c: BONE[1], C: BONE[2] }
  if (way === 'left') d.stamp(['Cc...', '...', 'Cc...', '.....', 'Cc'], x, y, key)
  if (way === 'up') d.stamp(['C.C.C', 'c.c.c'], x, y, key)
  if (way === 'down') d.stamp(['cc.cc', 'C..C.'], x, y, key)
}

/** The masked head: a horned bone skull over the black jaws, which hang open on the fire. Returns its mask. */
function head(d: Painter): Mask {
  const m = (): Mask => d.m()
  const poly = (...xy: number[]): Mask => m().poly(xf(xy, { rot: TILT, dx: HEAD[0], dy: HEAD[1] }))
  const oval = (x: number, y: number, rx: number, ry: number): Mask => {
    const [cx, cy] = at(x, y)
    return m().ellipse(cx, cy, rx, ry, TILT)
  }

  // the black lower jaw hangs open behind the skull, the fire boiling between the jaws
  const jaw = poly(5, 3, 4, 8, -9, 13, -14, 12.5, -13, 10, 0, 6)
  d.part(jaw, BLACK)
  d.shine(true)
  const mouth = poly(3, 4, -15, 4, -15, 9.5, -12, 10.5, 0, 6.5).minus(jaw)
  d.fill(mouth, FIRE[2])
  d.fill(mouth.shrunk(1), FIRE[4])
  d.shine(false)
  for (const x of [-11, -7, -3]) {
    const [tx, ty] = at(x, 10.5 - (x + 11) * 0.3)
    d.px(Math.round(tx), Math.round(ty) - 1, BONE[3]).px(Math.round(tx), Math.round(ty) - 2, BONE[4])
  }

  // the skull: a domed cranium and a long bony muzzle, lit from the top left
  const bone = oval(0.5, -1, 7.5, 6.5).or(poly(-3, -5.5, -13, -3, -16, 0, -15.5, 4, 3, 4.5, 6, 2))
  d.part(bone, BONE, { bevel: 4 })
  // the brow casts a shadow over deep eye sockets; a dark nasal pit on the muzzle
  d.tone(poly(-6, -2.5, 6, -3.5, 6, -1.5, -6, -0.5), -1)
  d.fill(oval(-3, 0, 2.6, 2.1), BONE[0])
  d.fill(oval(-3, 0.3, 1.8, 1.4), BLACK[0])
  d.fill(oval(3.6, -0.6, 1.9, 1.9), BONE[0])
  d.fill(oval(3.8, -0.4, 1.2, 1.2), BLACK[0])
  d.fill(poly(-12, -0.5, -10, -1.5, -9.5, 0.5), BONE[0])
  // upper teeth along the muzzle, pointing down into the fire
  for (const x of [-14, -11, -8, -5, -2]) {
    const [tx, ty] = at(x, 4.5)
    d.px(Math.round(tx), Math.round(ty), BONE[4]).px(Math.round(tx), Math.round(ty) + 1, BONE[3])
  }

  // horns curving up and out from the crown, like the old fiend's
  const near = m().limb([...at(-1, -5.5), 29, 21, 25, 16.5], [2, 1.5, 0.6])
  const far = m().limb([...at(5, -5), 48, 21, 50, 15.5], [1.8, 1.3, 0.6])
  d.part(near, BONE, { bevel: 1.5 })
  d.part(far, BONE, { bevel: 1.5, bias: -1 })

  // the eyes burn in the sockets
  d.shine(true)
  const [ax, ay] = at(-3, 0.3)
  d.stamp(['rR', 'rr'], Math.round(ax) - 1, Math.round(ay) - 1, { r: EYE[0], R: EYE[1] })
  const [bx, by] = at(3.8, -0.4)
  d.stamp(['R', 'r'], Math.round(bx) - 1, Math.round(by) - 1, { r: EYE[0], R: EYE[1] })
  d.shine(false)
  return bone.or(jaw).or(mouth).or(near).or(far).grown(1)
}

/** Paints the dragon on its layer and returns the mask of its head. */
function dragon(d: Painter): Mask {
  const m = (): Mask => d.m()

  wing(d, FAR_WING)
  wing(d, NEAR_WING)

  // tail behind the far leg, sweeping out to the right and curling up
  const tail = m().limb([53, 72, 62, 80, 70, 82, 75, 77, 74, 70], [4.4, 3.6, 2.8, 2, 1.1])
  d.part(tail, BLACK, { bias: -1 })
  spikes(d, [P(63, 77), P(70, 78.5)], 0.2, -1, 2.6)

  // far leg: a thigh, the shin angled back, a foot gripping the ridge
  const farThigh = m().limb([54, 64, 61, 72, 58, 80], [6, 4.6, 3])
  d.part(farThigh, BLACK, { bias: -1 })
  d.part(m().limb([58, 80, 63, 84.5], [2.4, 1.8]), BLACK, { bias: -1 })
  claws(d, 62, 84, 'down')

  // trunk: the broad chest turned to the left, tapering to the hips; ridged plates down the front
  const trunk = m().limb([45, 42, 46, 51, 48, 61, 49, 69], [7, 8.6, 6.8, 6.2])
  d.part(trunk, BLACK, { bias: -1 })
  const plates = m().limb([41, 45, 41, 54, 44, 63, 47, 71], [2.6, 3.6, 3.6, 3]).and(trunk)
  d.shade(plates, BLACK, { bevel: 2 })
  for (let y = 46; y < 74; y += 3)
    d.fill(
      m()
        .path([34, y + 1, 43, y - 1, 52, y + 1])
        .and(plates),
      BLACK[1],
    )

  // near leg: a heavy thigh angled out, the shin back, the foot flat on the ridge
  d.part(m().limb([43, 62, 35, 70, 38, 79], [6.8, 5.2, 3.2]), BLACK)
  d.part(m().limb([38, 79, 31, 83.5], [2.8, 2]), BLACK)
  claws(d, 27, 83, 'down')

  // arms raised in front of the chest, claws spread
  const farArm = m().limb([54, 47, 60, 54, 63, 48], [3.2, 2.6, 2.2])
  d.part(farArm, BLACK, { bias: -1 })
  claws(d, 61, 44, 'up')
  d.part(m().limb([40, 48, 35, 56, 32, 61], [3.6, 2.8, 2.4]), BLACK)
  claws(d, 29, 62, 'down')

  // neck from the chest up behind the skull; spikes on the shoulders
  d.part(m().limb([46, 44, 44, 38, 41, 33], [5.6, 4.8, 4.4]), BLACK, { bias: -1 })
  spikes(d, [P(38, 43), P(53, 41)], 0, -1, 3)

  const skull = head(d)

  // a cold violet rim where the far side meets the sky, the fire's glow on the edges facing it
  const body = d.mask()
  d.fill(body.facing([1, 0]).and(tail.or(farThigh).or(farArm)), RIM)
  const lit = m()
  body.facing([-1, 0]).each((x, y) => {
    if (y > 40 && heat(x - 3, y) > -0.6) lit.add(x, y)
  })
  d.fill(lit, FIRE[0])
  return skull
}

/** The blast: molten fire roaring from the jaws to the lower left corner, embers rising. */
function blast(p: Painter, skull: Mask): void {
  const stream = p.m()
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (heat(x, y) > 0) stream.add(x, y)
  p.shine(true)
  p.dither(stream.cleaned().minus(skull), FIRE, (x, y) => heat(x, y) * 1.25, 0.3)
  const rand = rng(31)
  for (let i = 0; i < 44; i++) {
    const x = 2 + Math.floor(rand() * 76)
    const y = 16 + Math.floor(rand() * 72)
    if (p.subjectMask.has(x, y) || stream.has(x, y)) continue
    p.px(x, y, i % 3 === 0 ? FIRE[3] : FIRE[2])
    if (i % 4 === 0) p.px(x, y + 1, FIRE[0])
  }
  p.shine(false)
}

export const blackSkullDragon: CardDef = {
  id: 'ygo-mrd-086',
  number: 86,
  name: 'Schw. Totenkopfdrache',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'fusion',
  print: { level: 9, atk: 3200, def: 2500, type: 'Drache' },
  // the red sky, the lava, the fire, the eyes and the embers shine; dragon and ridge stay matt
  foil: 'painted',
  draw(p) {
    night(p)
    const d = p.layer()
    const skull = dragon(d)
    p.subject(d, OUTLINE)
    blast(p, skull)
  },
}
