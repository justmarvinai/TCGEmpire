import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rng, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Relaxo, a Grail of Dschungel. Brief: huge sleeper on its back across the whole width of the card,
 * belly up like a hill, arms flopped to the sides, snoring, one foot twitching, a big "Z" bubble
 * rising; a narrow jungle path disappears under its body, small jungle animals wait on both sides,
 * three butterflies sleep on its belly; dawn mist and light rays through the canopy. Full art, 80×112.
 *
 * Composition: Relaxo lies across the picture, head propped up on the left and turned to the viewer,
 * the belly a hill in the middle, the feet up on the right. The path runs from the bottom under the
 * body and on behind it into the mist, where the animals queue. Dawn light falls from a gap in the
 * canopy at the top left. The name plate covers rows 5–15, the attack plate rows 88–106.
 */
const JUNGLE = colors('06140e', '0e2a1a', '184428', '286036', '42803e', '72a448')
const GOLD = colors('c89a48', 'f2d27a', 'fff6d0')
/** Jungle and dawn light as one ramp, so a beam can lift the jungle step by step. */
const WOOD = [...JUNGLE, ...GOLD]
const FUR = colors('0c2230', '163a4c', '235a6c', '33788a', '58a2ac')
const CREAM = colors('7a5c40', 'b8946a', 'e6cc98', 'fff0c8')
const EARTH = colors('2e2016', '5a4028', '8a6a42')
const MOUTH = colors('3a1420', 'b04a58')
const WINGS = colors('e8609a', '3a9ae0', 'e8742a')
const BUBBLE = hex('c8f0f0')
const OUTLINE = hex('081014')

const P = (x: number, y: number): Pt => [x, y]

/** The sun stands far above the top left. Beams: [angle from the sun in degrees, half width]. */
const SUN_AT = P(-20, -70)
const BEAMS = [
  [52, 1.6],
  [58, 2.4],
  [64.5, 1.4],
  [71, 2],
] as const

/** Strength of the dawn light at a pixel: 1 in the heart of a beam, 0 outside; it fades downwards. */
function sunlight(x: number, y: number): number {
  const a = (Math.atan2(y + 0.5 - SUN_AT[1], x + 0.5 - SUN_AT[0]) * 180) / Math.PI
  let s = 0
  for (const [at, half] of BEAMS) s = Math.max(s, 1 - Math.abs(a - at) / half)
  return s * (1 - y / 180)
}

/** Relaxo is drawn lying on the ground line and then lifted this far, to leave room for the path. */
const LIFT = 4
/** The far path: from behind the sleeper up to where it vanishes in the mist between the trees. */
const PATH_FAR = [17, 48, 27, 31, 29, 31, 37, 48]

function jungle(p: Painter): void {
  p.register(WOOD)
  // depth: the dawn glows through a gap in the canopy at the top left, dense growth around it
  p.dither(
    null,
    WOOD,
    (x, y) => {
      const gap = Math.max(0, 1 - Math.hypot(x - 26, (y - 20) * 1.3) / 34)
      const growth = noise(x, y * 0.8, 3, 6) * 0.16 + noise(x, y, 9, 3) * 0.05
      return 0.06 + gap * gap * 0.62 + growth
    },
    0.5,
  )

  // far trunks fading into the mist, a near one on the right edge
  for (const [x, w] of pts([7, 3, 50, 3, 58, 4])) {
    const trunk = p.m().poly([x, 14, x + w, 14, x + w + 1, 56, x - 1, 56])
    p.tone(trunk, -1)
    p.tone(trunk.facing([-1, 0]), 1)
  }
  const near = p.m().poly([71, 14, 80, 14, 80, 64, 70, 64, 73, 52])
  p.fill(near, JUNGLE[1])
  p.fill(near.facing([-1, 0]), JUNGLE[2])

  // canopy: heavy leaves along the top, lianas hanging out of it
  const canopy = p.m()
  for (const [x, y, rx, ry] of [
    [4, 16, 9, 6],
    [60, 15, 14, 7],
    [76, 22, 8, 9],
    [48, 14, 8, 4],
  ] as const)
    canopy.blob(x, y, rx, ry, x + y, 0.3)
  p.fill(canopy, JUNGLE[1])
  p.fill(canopy.facing([0, 1]), JUNGLE[0])
  p.fill(canopy.facing([-1, 0, 0, -1]), JUNGLE[3])
  for (const [x0, y0, x1, y1] of [
    [12, 18, 14, 40],
    [55, 20, 53, 34],
  ] as const)
    p.fill(p.m().line(x0, y0, x1, y1), JUNGLE[1])

  // the far path, lighter where the dawn falls on it, vanishing into the trees
  const far = p.m().poly(PATH_FAR)
  p.tone(far, 1)
  p.tone(far.clone().and(p.m().poly([21, 48, 27.5, 36, 28.5, 36, 33, 48])), 1)

  // dawn mist lying on the ground behind the sleeper: it lifts the jungle by up to two steps
  for (const k of [1, 2]) {
    const mist = p.m()
    for (let y = 26; y < 62; y++)
      for (let x = 0; x < p.w; x++) {
        const v = (1 - Math.abs(y - 46) / 16) * 1.6 + noise(x, y * 2.5, 4, 7) * 0.9 - 0.3
        if (v + bayer(x, y) - 0.5 >= k) mist.add(x, y)
      }
    p.tone(mist, 1)
  }

  // animals queueing on the far side of the sleeper, dark against the mist, eyes catching the light
  p.tone(p.m().ellipse(28, 40, 11, 6), 1)
  const shadow = { k: JUNGLE[0] }
  p.stamp(['k...k.', 'kk..kk', '.kkkk.', '.kkkk.', '.k..k.'], 23, 36, shadow) // a lynx
  p.stamp(['kk.....', 'kkkkkk.', '.kkkkkk', '.kk..kk'], 29, 39, shadow) // a tapir
  p.stamp(['..kk', '.kkk', 'kkk.', '.k..'], 19, 41, shadow) // a bird
  for (const [x, y] of pts([24, 38, 30, 40, 21, 41])) p.px(x, y, GOLD[2])

  // the forest floor in front: moss on both sides of the near end of the path
  const floor = p.m().rect(0, 76, 80, 36)
  p.dither(floor, JUNGLE.slice(1, 5), (x, y) => 0.35 + noise(x, y * 2, 5, 4) * 0.5 - (y - 76) / 30, 0.6)
  const lane = p.m().poly([42, 76, 58, 76, 72, 112, 36, 112])
  p.dither(lane, EARTH, (x, y) => 0.6 + noise(x, y, 7, 3) * 0.3 - (y - 76) / 40, 0.6)
  // and on the near side: a monkey and a frog wait at the edge of the path, a bird on the path
  p.stamp(['.kk..', 'kkkk.', '.kk..', 'kkkk.', 'kkkkk', 'kk.kk', '....k'], 9, 80, shadow)
  p.stamp(['k...k', 'kkkkk', 'kk.kk'], 26, 84, shadow)
  p.stamp(['.kk..', 'kkkkk', '.kkkk', '..k.k'], 61, 82, shadow)
  for (const [x, y] of pts([10, 81, 26, 84, 30, 84, 62, 83])) p.px(x, y, GOLD[2])

  // the sleeper's shadow on the ground
  p.tone(p.m().ellipse(44, 79 - LIFT + 1.5, 31, 3.5), -2)

  // the dawn beams lift whatever they cross by up to three steps, with dithered edges
  const lift = [p.m(), p.m(), p.m()]
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const s = sunlight(x, y) * 3 + bayer(x, y) - 0.5
      lift.forEach((m, k) => {
        if (s >= k + 1) m.add(x, y)
      })
    }
  }
  p.shine(true)
  for (const m of lift) p.tone(m, 1)
  const rand = rng(31)
  for (let i = 0; i < 50; i++) {
    const x = 4 + Math.floor(rand() * 72)
    const y = 16 + Math.floor(rand() * 60)
    if (sunlight(x, y) > 0.35) p.px(x, y, GOLD[2])
  }
  p.shine(false)
}

/** Relaxo's head: drawn upright round its centre, then turned to lie on its back and propped up. */
const HEAD_AT = { ox: 0, oy: 0, rot: -42, dx: 19, dy: 65 }
const head = (list: readonly number[]): Pt[] => xf(list, HEAD_AT)

function snorlax(d: Painter): void {
  const m = (): Mask => d.m()

  // the far foot sticks up behind the near one; the soles are cream with a tan pad and three claws
  const foot = (x: number, y: number, rx: number, ry: number, rot: number, bias: number): void => {
    d.part(m().ellipse(x, y, rx, ry, rot), FUR, { bias, bevel: 3 })
    const sole = m().ellipse(x + 1.2, y + 0.4, rx - 1.3, ry - 1.2, rot)
    d.part(sole, CREAM, { bias, bevel: 3, line: 'none' })
    d.fill(
      m()
        .ellipse(x + 1.5, y + 1.5, rx * 0.4, ry * 0.4, rot)
        .and(sole),
      CREAM[1],
    )
    for (const k of [-0.55, 0, 0.55]) {
      const c = Math.cos((rot * Math.PI) / 180)
      const s = Math.sin((rot * Math.PI) / 180)
      const tx = x + 1.2 + k * rx * c + s * (ry - 1.5)
      const ty = y + 0.4 + k * rx * s - c * (ry - 1.5)
      d.stamp(['w', 'w'], Math.round(tx), Math.round(ty) - 1, { w: CREAM[3] })
    }
  }
  foot(71.5, 42, 5, 7, 28, -1)

  // the body: a hill of fur lying on its back, the cream belly turned up to the light
  const body = m()
    .ellipse(46, 63, 27.5, 20.5)
    .and(m().rect(0, 0, 80, 83))
  d.part(body, FUR, { bevel: 12 })
  const belly = m().ellipse(48, 58.5, 21.5, 14, -6).and(body)
  d.shade(belly, CREAM, { bevel: 9 })

  // near leg and foot, kicked up on the right
  d.part(m().limb([60, 66, 64, 58, 66, 53], [6.5, 5.5, 5]), FUR)
  foot(66.5, 49.5, 6, 8.5, 18, 0)

  // the near arm flops down onto the path, palm up, claws relaxed
  d.part(m().limb([31, 72, 33.5, 79, 39.5, 83.5], [5.2, 4.6, 4.4]), FUR)
  d.part(m().ellipse(43, 83.5, 4, 3.2), FUR, { bevel: 2.5 })
  for (const [x, y] of pts([46, 81, 47, 83, 46, 85])) d.stamp(['ww'], x, y, { w: CREAM[3] })

  // the head: broad skull with two small ears, the cream face, closed eyes, snoring mouth
  for (const ear of [
    [-11, -4, -9.5, -14, -3.5, -8.5],
    [3.5, -8.5, 9.5, -14, 11, -4],
  ])
    d.part(m().poly(head(ear)), FUR, { bevel: 2 })
  const skull = m().ellipse(19, 65, 13.5, 12, HEAD_AT.rot)
  d.part(skull, FUR, { bevel: 7 })
  const face = m()
  const at = (x: number, y: number): Pt => head([x, y])[0] ?? P(x, y)
  for (const [x, y, rx, ry] of [
    [0, 4.5, 11, 7.5],
    [-5.2, 0, 4.6, 3.6],
    [5.2, 0, 4.6, 3.6],
  ] as const) {
    const [cx, cy] = at(x, y)
    face.ellipse(cx, cy, rx, ry, HEAD_AT.rot)
  }
  d.shade(face.and(skull), CREAM, { bevel: 5 })
  // closed eyes: two short lines with a sleepy droop
  for (const lid of [
    [-8, -1, -5.5, 0.6, -2.5, 0],
    [2.5, 0, 5.5, 0.6, 8, -1],
  ])
    d.fill(m().path(head(lid)), FUR[0])
  // the mouth wide open in a snore, the tongue at the bottom, two little fangs on the lower lip
  const [mx, my] = at(0, 5.8)
  const mouth = m().ellipse(mx, my, 4.4, 2.8, HEAD_AT.rot)
  d.fill(mouth, MOUTH[0])
  const [tx, ty] = at(0, 7.2)
  d.fill(m().ellipse(tx, ty, 2.6, 1.2, HEAD_AT.rot).and(mouth), MOUTH[1])
  for (const fx of [-2.6, 2.6])
    for (const fy of [7.9, 6.9]) {
      const [x, y] = at(fx, fy)
      d.px(Math.round(x), Math.round(y), CREAM[3])
    }
}

/** Three butterflies asleep on the belly, wings spread: pink, blue and gold. */
function butterflies(p: Painter): void {
  const BUTTERFLY = ['ww.ww', 'wwkww', '.w.w.']
  p.stamp(BUTTERFLY, 36, 51 - LIFT, { w: WINGS[0], k: FUR[0] })
  p.stamp(BUTTERFLY, 46, 48 - LIFT, { w: WINGS[1], k: FUR[0] })
  p.stamp(BUTTERFLY, 55, 52 - LIFT, { w: WINGS[2], k: FUR[0] })
}

/** The snore: small z's rising from the mouth into a big bubble with a Z in it. */
function snore(p: Painter): void {
  p.shine(true)
  const bubble = p.m().disc(15, 31, 8)
  p.tone(bubble.shrunk(1), 1)
  p.fill(bubble.facing(), BUBBLE)
  p.stamp(['ww..', 'w...', 'w...'], 10, 26, { w: GOLD[2] })
  p.stamp(['wwwwwww', '....ww.', '...ww..', '..ww...', '.ww....', 'wwwwwww'], 12, 28, { w: GOLD[2] })
  p.stamp(['www', '.w.', 'www'], 19, 47, { w: BUBBLE })
  p.stamp(['wwww', '..w.', '.w..', 'wwww'], 13, 40, { w: BUBBLE })
  p.shine(false)
}

/** One foot twitches in its sleep: two short motion strokes beside it. */
function twitch(p: Painter): void {
  for (const [x0, y0, x1, y1] of [
    [70, 31, 72, 29],
    [73, 33, 75, 31],
  ] as const)
    p.fill(p.m().line(x0, y0, x1, y1), CREAM[3])
}

export const relaxo: CardDef = {
  id: 'pkm-jungle-078',
  number: 78,
  name: 'Relaxo',
  tier: 'grail',
  kind: 'pokemon',
  type: 'Farblos',
  hp: 90,
  attacks: [
    { name: 'Bodyslam', cost: ['Farblos', 'Farblos', 'Farblos', 'Farblos'], damage: '30' },
    { name: 'Dickhaut', cost: [] },
  ],
  // the dawn beams, the dust in them and the snore bubble shine; Relaxo and the jungle stay matt
  foil: 'painted',
  draw(p) {
    jungle(p)
    const d = p.layer()
    snorlax(d)
    const lying = p.layer().blit(d, 0, -LIFT)
    // the dawn beams catch the top of the belly and the soles
    const lit = p.m()
    for (let y = 0; y < 70; y++) for (let x = 0; x < p.w; x++) if (sunlight(x, y) > 0.45) lit.add(x, y)
    lying.tone(lying.mask().and(lit), 1)
    p.subject(lying, OUTLINE)
    butterflies(p)
    snore(p)
    twitch(p)
  },
}
