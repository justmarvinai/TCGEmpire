import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Bounty Hunter (Signature), Ultra. Our own pirate bounty hunter: an eyepatch, a black braid, a red
 * bandana under a gold-trimmed tricorn, a sea-green greatcoat and two flintlocks. One boot on a deck
 * cannon, she has just fired one pistol into the air and aims the other at the ships burning on the
 * horizon; a wanted poster tears past in the wind. Full art, 80×112.
 *
 * Composition: she stands right of the centre, turned three quarters to the right; the raised pistol
 * and the poster hold the top left, the burning ships the right. The sun sinks at the left. The
 * frame's plates cover rows 0–14 and 90–112.
 */
const SKY = colors('2a1040', '5a1a52', 'a02c50', 'e0583c', 'f89a3c', 'ffd070')
const SUN = hex('fff2c0')
const DEEP = hex('1a0c2a')
const WOOD = colors('3a1c14', '6a3a20', '9c5a30', 'c88a4a')
const IRON = colors('1c1c2a', '3c4058', '7a84a0')
const COAT = colors('0c3a3a', '17605a', '2e8c78', '5cbc98')
const GOLD = colors('b07a20', 'f0c850')
const SKIN = colors('6a3020', 'b8643e', 'e8a070', 'fcd0a0')
const HAIR = colors('120c18', '2c2236')
const RED = colors('a01e2a', 'e04040')
const SHIRT = hex('ece4d4')
const OUTLINE = hex('0c0612')

function sunset(p: Painter): void {
  // sky from violet to gold at the horizon, the sun sinking at the left
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const sun = Math.max(0, 1 - Math.hypot(x - 14, (y - 62) * 1.3) / 34) * 0.35
      return Math.pow(Math.min(1, y / 64), 1.1) * 0.9 + sun + noise(x, y, 5, 9) * 0.06
    },
    0.8,
  )
  p.fill(p.m().disc(14, 62, 8.5).rect(0, 0, 80, 64).and(p.m().disc(14, 62, 8.5)), SUN)
  p.shine(false)

  // sea, with the glitter of the sun on it
  const sea = p.m().rect(0, 64, 80, 20)
  p.dither(sea, [DEEP, SKY[0], SKY[1]], (_x, y) => 1 - (y - 64) / 13, 0.7)
  for (const [x, y, w] of [
    [30, 67, 7],
    [46, 70, 9],
    [3, 73, 6],
    [36, 75, 10],
    [62, 72, 6],
  ] as const) {
    p.fill(p.m().rect(x, y, w, 1), SKY[2])
  }
  p.shine(true)
  const rand = rng(4)
  for (let y = 65; y < 77; y += 2) {
    const w = 12 - (y - 64) * 0.6
    const x = 14 - w / 2 + (rand() - 0.5) * 3
    p.fill(p.m().rect(x, y, Math.max(2, w * (0.6 + rand() * 0.4)), 1), y < 70 ? SKY[5] : SKY[4])
  }
  p.shine(false)
}

/** Two ships burning on the horizon, smoke leaning away in the wind. */
function fleet(p: Painter): void {
  // two columns of smoke rising from the fires and leaning away in the wind
  const smoke = p.m()
  for (const [x0, y0, x1, y1, r0, r1] of [
    [59, 56, 70, 24, 1.8, 5.5],
    [72, 52, 82, 18, 2.2, 6.5],
  ] as const) {
    for (let t = 0; t <= 1; t += 0.1) {
      const x = x0 + (x1 - x0) * t + Math.sin(t * 7) * 1.5
      const y = y0 + (y1 - y0) * t
      smoke.blob(x, y, r0 + (r1 - r0) * t, (r0 + (r1 - r0) * t) * 0.8, Math.round(t * 10) + x0, 0.3)
    }
  }
  p.dither(smoke, [SKY[0], SKY[1], SKY[2]], (x, y) => 0.75 - (60 - y) / 70 + noise(x, y, 3, 3) * 0.35, 0.6)
  // hulls with a curved keel, two masts each, square sails
  for (const [x0, w, mast] of [
    [55, 11, 13],
    [66, 14, 17],
  ] as const) {
    const mid = x0 + w / 2
    const ship = p
      .m()
      .poly([x0 - 1, 60, x0 + w + 1, 59, x0 + w - 1, 62.5, mid, 64, x0 + 1.5, 62.5])
      .rect(mid - 2.5, 60 - mast, 1, mast)
      .rect(mid + 2, 62 - mast, 1, mast - 2)
      .rect(mid - 5, 62 - mast, 6, 4)
      .rect(mid - 5, 67 - mast, 6, 4)
      .rect(mid, 64 - mast, 5, 4)
      .rect(mid, 69 - mast, 5, 3)
    p.fill(ship, DEEP)
  }
  p.shine(true)
  for (const [x, y, w, h, seed] of [
    [59, 60, 4, 7, 1],
    [71, 59.5, 5, 9, 2],
    [75.5, 59, 3, 5, 3],
    [70, 49, 3, 5, 4],
  ] as const) {
    fire(p, flameMask(p, x, y, w, h, { lean: 1.5, tongues: 1, seed }), [SKY[3], SKY[4], SKY[5], SUN])
  }
  p.shine(false)
}

/** Deck: the rail in front of the sea, planks below. */
function deck(p: Painter): void {
  p.register(WOOD)
  const rail = p.m().rect(0, 77, 80, 4)
  p.shade(rail, WOOD, { bevel: 2 })
  for (let x = 3; x < 80; x += 8) p.fill(p.m().rect(x, 81, 2, 3), WOOD[0])
  const planks = p.m().rect(0, 84, 80, 28)
  p.fill(planks, WOOD[1])
  for (let y = 86; y < 112; y += 4) p.fill(p.m().rect(0, y, 80, 1), WOOD[0])
  for (const [x, y] of [
    [9, 84],
    [33, 88],
    [60, 84],
    [20, 92],
    [52, 96],
    [70, 92],
  ] as const) {
    p.fill(p.m().rect(x, y, 1, 2), WOOD[0])
  }
  p.fill(p.m().rect(0, 84, 80, 1), WOOD[2])
}

/** A wanted poster blowing past: parchment, a portrait and the bounty. */
function poster(p: Painter): void {
  const sheet = p.m().poly([4, 21, 15, 17.5, 18.5, 30, 7, 33])
  p.shade(sheet, [SKY[3], SKY[4], SKY[5], SUN], { bevel: 2 })
  p.fill(p.m().path([6, 22, 14.5, 19.5]), IRON[0])
  p.fill(p.m().disc(11, 25.5, 2.4), SKY[3])
  p.fill(p.m().path([8.5, 30, 15.5, 28]), IRON[0])
  for (const [x, y] of [
    [20, 36],
    [23, 31],
    [2, 37],
  ] as const) {
    p.fill(p.m().rect(x, y, 2, 2), GOLD[1])
    p.px(x + 1, y + 1, GOLD[0])
  }
}

/** A flintlock: iron barrel from (x0, y0) to (x1, y1), a curved wooden grip under the hand. */
function pistol(d: Painter, x0: number, y0: number, x1: number, y1: number, grip: readonly number[]): void {
  const m = (): Mask => d.m()
  d.part(m().limb(grip, [1.6, 1.4, 1.3]), WOOD.slice(1), { bevel: 1.5 })
  d.part(m().limb([x0, y0, x1, y1], [1.4, 1.1]), IRON, { bevel: 1.5 })
  d.part(m().disc(x0, y0, 1.6), GOLD, { bevel: 1.5 })
}

function captain(d: Painter): void {
  const m = (): Mask => d.m()

  // the deck cannon her boot rests on
  d.part(m().poly([8, 79, 36, 79, 35, 85, 9, 85]), WOOD, { bevel: 2 })
  d.part(m().disc(13, 85, 3).disc(31, 85, 3), WOOD.slice(0, 3), { bevel: 2 })
  d.part(m().limb([38, 75.5, 22, 76, 5, 75], [4, 3.6, 3]), IRON, { bevel: 3 })
  d.part(m().limb([7, 75, 3, 75], 3.8), IRON, { bevel: 2 })
  d.part(m().disc(39.5, 75.5, 2), IRON, { bevel: 1.5 })

  // coat tail flying out behind her
  d.part(m().poly([38, 50, 44, 52, 40, 66, 33, 76, 24, 79, 27, 72, 32, 62]), COAT, { bias: -1, bevel: 4 })

  // standing leg with its tall boot, foot planted on the deck
  d.part(m().limb([48, 52, 50, 66, 51, 76], [3.6, 3.1, 2.8]), IRON.slice(0, 2), { bevel: 3 })
  const boot = m().poly([47.5, 69, 54, 69, 53.8, 82.5, 57.5, 84, 58, 86.5, 47.5, 86.5, 48, 80])
  d.part(boot, WOOD.slice(0, 3), { bevel: 2 })
  d.fill(m().rect(47, 69, 8, 2).and(boot.grown(1)), WOOD[3])

  // raised leg: thigh forward, the boot planted on the cannon
  d.part(m().limb([42, 53, 35, 59, 32.5, 65], [3.6, 3.2, 2.9]), IRON.slice(0, 2), { bevel: 3 })
  const raised = m().poly([29.5, 62, 36, 62, 35.5, 70, 37.5, 71.5, 37.5, 73.5, 28.5, 73.5, 29.5, 68])
  d.part(raised, WOOD.slice(0, 3), { bevel: 2 })
  d.fill(m().rect(28.5, 62, 8, 2).and(raised.grown(1)), WOOD[3])

  // the greatcoat over a white shirt, a red sash, gold buttons
  // coat skirt behind the standing leg
  d.part(m().poly([48, 51, 55, 51, 57.5, 62, 59, 69, 53, 68.5, 49.5, 60]), COAT, { bevel: 3 })
  const coat = m().poly([37, 36, 54, 36, 55.5, 44, 54, 51, 49.5, 54, 42, 54, 37, 50, 35.5, 43])
  d.part(coat, COAT, { bevel: 4 })
  const shirt = m().poly([42, 36, 49.5, 36, 46, 46])
  d.part(shirt, [IRON[2], SHIRT], { bevel: 2, line: 'none' })
  d.fill(m().path([41.5, 36, 46, 46.5]).path([50, 36, 46.5, 46.5]), COAT[3])
  d.part(m().rect(38, 49, 16, 3), RED, { bevel: 1 })
  d.part(m().rect(44.5, 49, 3, 3), GOLD, { bevel: 1 })
  for (const [x, y] of [
    [40, 40],
    [40, 44],
    [52, 40],
    [52, 44],
  ] as const) {
    d.px(x, y, GOLD[1])
  }

  // arm aiming to the right, pistol levelled at the burning ships
  d.part(m().limb([53, 37.5, 59, 40.5, 63.5, 40.5], [3, 2.6, 2.4]), COAT)
  d.part(m().rect(61, 38.5, 3, 4), GOLD, { bevel: 1 })
  d.part(m().ellipse(65, 40.5, 2, 1.8), SKIN, { bevel: 1.5 })
  pistol(d, 66.5, 39.5, 77, 38, [65.5, 41, 64.5, 43.5, 62.5, 45])

  // arm raised beside the head, the other pistol pointing at the sky, smoke curling off its muzzle
  d.part(m().limb([38.5, 38, 33, 35.5, 32, 29], [3, 2.6, 2.4]), COAT)
  d.part(m().rect(30.5, 28, 4, 3), GOLD, { bevel: 1 })
  d.part(m().ellipse(32.5, 26, 2, 2), SKIN, { bevel: 1.5 })
  pistol(d, 31.5, 24.5, 27, 15.5, [32.5, 26.5, 34.5, 28.5, 35.5, 30])

  // braid falling over the near shoulder, bandana ends fluttering behind
  d.part(m().limb([41.5, 24, 36, 24.5, 31.5, 22.5], [1.4, 1.1, 0.6]), RED)
  d.part(m().limb([41.5, 30, 40, 36, 40, 42, 41, 47], [2.4, 2.1, 1.8, 1.3]), HAIR, { bevel: 2 })
  for (const y of [34, 37, 40, 43]) d.fill(m().path([39, y, 41.5, y + 1.5]), HAIR[0])
  d.part(m().disc(41, 47.5, 1.3), RED, { bevel: 1 })

  // neck, head turned three quarters to the right
  d.part(m().limb([45.5, 31, 45.5, 36], 2.3), SKIN, { bias: -1 })
  d.part(m().ellipse(42.5, 27.5, 3.8, 5), HAIR, { bevel: 2 })
  const head = m().ellipse(46, 27.5, 4.6, 5).poly([41.5, 28, 42.5, 32, 45.5, 34.5, 48.5, 33.5, 50.5, 30.5, 51, 27])
  d.part(head, SKIN, { bevel: 4 })

  // bandana under the hat, eyepatch on its strap, the open eye, a smirk
  d.part(head.grown(1).and(m().rect(0, 22, 80, 2)), RED, { bevel: 1 })
  d.fill(m().path([42, 24, 47, 28]), OUTLINE)
  d.stamp(['kk', 'kk'], 46, 27, { k: OUTLINE })
  d.stamp(['k.', 'wk'], 49, 27, { k: OUTLINE, w: SHIRT })
  d.stamp(['s..', '.mm'], 47, 31, { s: SKIN[1], m: SKIN[0] })

  // tricorn with a gold-trimmed brim
  const hat = m().poly([34.5, 22.5, 38, 17.5, 44, 15, 50.5, 15.5, 55.5, 19, 57.5, 23, 51, 21.5, 46, 23.5, 40.5, 21.5])
  d.part(hat, [HAIR[0], HAIR[1], IRON[1]], { bevel: 3 })
  d.fill(hat.facing([0, 1]), GOLD[1])
  d.fill(hat.facing([0, 1]).moved(0, -1).and(hat).minus(hat.facing([0, 1])), GOLD[0])
}

export const missFortuneSignature: CardDef = {
  id: 'rb-ogn-087',
  number: 87,
  name: 'Miss Fortune, Bounty Hunter (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Body',
  print: { tag: 'Legende' },
  // the sky, the sun and its glitter on the sea and the fires shine; captain, ships and deck stay matt
  foil: 'painted',
  draw(p) {
    sunset(p)
    fleet(p)
    deck(p)
    poster(p)
    const d = p.layer()
    captain(d)
    p.subject(d, OUTLINE)
    // powder smoke curling off the pistol that was just fired into the air
    const puff = p.m().blob(25.5, 13, 3.2, 2.6, 8, 0.3).blob(23, 9.5, 2.6, 2.2, 9, 0.3).minus(p.subjectMask)
    p.fill(puff, IRON[2])
    p.fill(puff.clone().and(puff.moved(1, 1)), SHIRT)
  },
}
