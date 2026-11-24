import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Virtuoso (Signature), Ultra. Our own masked stage marksman: a blank white porcelain mask, slicked
 * black hair, a crimson tailcoat with gold trim and an ornate long rifle. At the very edge of a stage
 * he sinks into a deep theatrical bow, the rifle swept up behind him like a conductor's baton, while
 * exactly four petals of fire drift down around him. Full art, 80×112.
 *
 * Composition: he bows to the left in profile, in the cone of a spotlight that lights the backdrop
 * behind him; the rifle crosses into the top right, red curtains frame both sides. The frame's
 * plates cover rows 0–14 and 90–112, so the stage lip sits at row 88.
 */
const STAGE = colors('0a0510', '170a18', '28101e')
const VELVET = colors('2c0410', '560a1c', '86142a', 'b8243a', 'e8484a')
const GOLD = colors('5a3010', '9c6420', 'd8a438', 'fce48a')
const WOOD = colors('1e0e0c', '3a1e14', '62361c', '8e5626')
const LIGHT = colors('ffd870', 'fff4c8')
const PORCELAIN = colors('8a8098', 'c8c2d4', 'f2eef6', 'ffffff')
const SUIT = colors('120c18', '2a2034', '463a56')
const EMBER = hex('f47a24')
const OUTLINE = hex('06030a')

const P = (x: number, y: number): Pt => [x, y]

/** The spine runs from the hips down to the neck; `BACK` points across it, to the side of the back. */
const HIP = P(47.5, 57)
const SPINE = P(-18.5, -8)
const BACK = P(0.397, -0.918)
/** A point `t` of the way from hips to neck, `off` pixels towards the back. */
const along = (t: number, off = 0): number[] => [HIP[0] + SPINE[0] * t + BACK[0] * off, HIP[1] + SPINE[1] * t + BACK[1] * off]

/** The rifle: from the butt through the hand out to the muzzle. */
const BUTT = P(41.5, 37)
const MUZZLE = P(77, 23)
const gun = (t: number, off = 0): [number, number] => {
  const len = Math.hypot(MUZZLE[0] - BUTT[0], MUZZLE[1] - BUTT[1])
  const [ux, uy] = [(MUZZLE[0] - BUTT[0]) / len, (MUZZLE[1] - BUTT[1]) / len]
  return [BUTT[0] + ux * len * t - uy * off, BUTT[1] + uy * len * t + ux * off]
}

/** Spotlight cone: the share of light at a pixel, 0 outside the cone. */
function beam(x: number, y: number): number {
  const half = 6 + y * 0.24
  const d = Math.abs(x + 0.5 - 40) / half
  if (d >= 1) return 0
  return Math.min(1, (1 - d) * 4) * (0.45 + Math.min(1, y / 84) * 0.55)
}

function stage(p: Painter): void {
  // backdrop: deep darkness, the spotlight cone falling through it onto the boards
  p.shine(true)
  p.dither(p.m().rect(0, 0, 80, 75), [STAGE[0], STAGE[1], STAGE[2], GOLD[0], GOLD[1]], (x, y) => {
    return 0.1 + noise(x, y, 4, 7) * 0.12 + beam(x, y) * 0.85
  }, 0.75)
  p.shine(false)

  // boards running back from the stage lip towards the backdrop
  const floor = p.m().rect(0, 75, 80, 37)
  p.register(WOOD)
  p.dither(floor, WOOD, (x, y) => 0.35 + (y - 75) / 50 + noise(x, y, 6, 5) * 0.1, 0.5)
  for (let k = -6; k <= 6; k++) {
    const x0 = 40 + k * 4.5
    const x1 = 40 + k * 13
    p.fill(p.m().line(x0, 75, x1, 112).and(floor), WOOD[0])
  }
  p.fill(p.m().rect(0, 75, 80, 1), STAGE[0])
  // the pool of the spotlight on the boards
  p.shine(true)
  const pool = p.m().ellipse(40, 85, 24, 5.5).and(floor)
  p.dither(pool, [WOOD[3], GOLD[2], LIGHT[0]], (x, y) => 1 - Math.hypot((x - 40) / 24, (y - 85) / 5.5) * 1.1, 0.8)
  p.shine(false)
  // the gold-trimmed lip of the stage
  p.fill(p.m().rect(0, 88, 80, 1), GOLD[2])
  p.fill(p.m().rect(0, 89, 80, 1), GOLD[0])

  // velvet curtains: the folds as vertical bands, gathered by a gold tie-back on each side
  for (const s of [1, -1]) {
    const x = (v: number) => (s === 1 ? v : 80 - v)
    const drape = p.m().poly([x(0), 0, x(17), 0, x(15), 22, x(12), 44, x(9), 58, x(12), 68, x(17), 76, x(15), 88, x(0), 88])
    p.dither(drape, VELVET.slice(0, 4), (px, py) => {
      const u = s === 1 ? px : 79 - px
      const fold = 0.5 + 0.5 * Math.sin(u * 1.25 + py * 0.02)
      return 0.12 + fold * 0.6 - (u > 11 ? 0.12 : 0)
    }, 0.45)
    p.fill(drape.facing([s, 0]), VELVET[0])
    const tie = p.m().poly([x(0), 56, x(10), 56.5, x(10.5), 59.5, x(0), 60])
    p.shade(tie, GOLD, { bevel: 1.5 })
    p.fill(p.m().disc(x(10.5), 58, 1.8), GOLD[2])
  }

  // the valance across the top: a swag of velvet with a gold fringe
  const valance = p.m().rect(0, 0, 80, 7)
  for (let i = 0; i < 5; i++) valance.ellipse(8 + i * 16, 7, 9, 4.5)
  p.dither(valance, VELVET.slice(0, 4), (x, y) => 0.2 + (y < 7 ? 0.2 : 0.4) + noise(x, y, 2, 4) * 0.2, 0.5)
  p.fill(valance.facing([0, 1]), GOLD[2])
  valance
    .facing([0, 1])
    .moved(0, 1)
    .minus(valance)
    .each((x, y) => {
      if (x % 2 === 0) p.set(x, y, GOLD[1])
    })
}

function marksman(d: Painter): void {
  const m = (): Mask => d.m()

  // coat tails flaring out behind the hips
  const tails = m().poly([45, 52, 51, 51.5, 58, 56, 66, 62.5, 60, 63, 61.5, 70, 54, 63.5, 47, 59])
  d.part(tails, VELVET.slice(1), { bevel: 3, bias: -1 })
  d.fill(m().path([51, 56, 60, 66]).and(tails.shrunk(1)), VELVET[1])

  // far leg slid back, resting on the toes of its pointed shoe
  d.part(m().limb([49.5, 59, 53.5, 71, 57, 82], [2.8, 2.3, 1.8]), SUIT, { bias: -1, bevel: 2 })
  d.part(m().poly([54.5, 81, 59, 80.5, 60.5, 85.5, 57, 86, 53.5, 84.5]), SUIT, { bevel: 1.5 })

  // far arm flung out over the bowed back, the gloved hand holding the rifle out like a baton
  d.part(m().limb([...along(0.9, 2.2), 42, 41.5, 49.5, 34], [2.7, 2.3, 2]), VELVET.slice(1), { bias: -1 })

  // the rifle: a carved stock with a gold butt plate, a long steel barrel with gold bands, a flared muzzle
  const stock = m().poly([...gun(-0.06, -2.2), ...gun(0.1, -1.7), ...gun(0.26, -1.4), ...gun(0.26, 1.4), ...gun(0.16, 1.8), ...gun(0.04, 5), ...gun(-0.06, 5)])
  d.part(stock, [WOOD[1], WOOD[2], WOOD[3], GOLD[2]], { bevel: 2.5 })
  d.fill(m().path([...gun(-0.06, -2.2), ...gun(-0.06, 5)]).and(stock.grown(1)), GOLD[2])
  d.fill(m().path([...gun(-0.01, 0.6), ...gun(0.06, 2.6), ...gun(0.14, 0.4)]).and(stock.shrunk(1)), GOLD[1])
  const barrel = m().limb([...gun(0.23, 0), ...gun(0.95, 0)], [1.6, 1.1])
  d.part(barrel, SUIT, { bevel: 1.5 })
  d.fill(barrel.facing([0, -1]).minus(barrel.facing([0, 1])), PORCELAIN[0])
  for (const t of [0.42, 0.66]) d.part(m().disc(...gun(t), 1.7), GOLD, { bevel: 1.5 })
  d.part(m().poly([...gun(0.9, -1.4), ...gun(1, -2.6), ...gun(1, 2.6), ...gun(0.9, 1.4)]), GOLD, { bevel: 1.5 })
  d.part(m().path([...gun(0.24, 1.4), ...gun(0.26, 3.6), ...gun(0.34, 3.4), ...gun(0.33, 1.4)]), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().ellipse(...gun(0.29, 0.6), 2.2, 2.1), PORCELAIN, { bevel: 1.5 })

  // near leg straight under the hips, planted at the edge of the stage
  d.part(m().limb([45, 59, 43.5, 71, 41.5, 83], [3, 2.4, 1.9]), SUIT, { bevel: 2 })
  d.part(m().poly([35, 83.5, 42.5, 82.5, 43.5, 86, 34, 86.5, 34, 85]), SUIT, { bevel: 1.5 })
  d.fill(m().path([34.5, 86, 43, 86]), SUIT[2])

  // torso bent deep into the bow: tailcoat over a dark waistcoat, gold trim along the hem
  const coat = m().poly([...along(0, 4.6), ...along(0.65, 5.4), ...along(1, 3.4), ...along(1, -2.8), ...along(0.65, -5.4), ...along(0, -4)])
  d.part(coat, VELVET.slice(1), { bevel: 4 })
  const vest = m().poly([...along(0.1, -3.8), ...along(0.65, -5.2), ...along(0.92, -2.6), ...along(0.3, -0.8)])
  d.part(vest, SUIT, { bevel: 2, line: 'none' })
  d.fill(m().path([...along(0.03, -4), ...along(0.03, 4.6)]).and(coat.grown(1)), GOLD[2])
  d.fill(m().path([...along(0.12, -3.7), ...along(0.66, -5.3)]).and(coat), GOLD[1])

  // near arm folded under the chest, the white glove pressed to the waistcoat
  d.part(m().limb([...along(0.88, -0.8), 32, 55, 37.5, 57.5], [2.7, 2.4, 2]), VELVET.slice(1))
  d.part(m().rect(35, 55.5, 2.5, 4), GOLD, { bevel: 1 })
  d.part(m().ellipse(39.5, 57.5, 2.2, 2), PORCELAIN, { bevel: 1.5 })

  // high collar, then the head bowed low: slicked hair, the blank mask turned to the boards
  d.part(m().poly([...along(0.93, 3.6), ...along(1.1, 2.8), ...along(1.08, -2.6), ...along(0.91, -3)]), GOLD, { bevel: 1.5 })
  const head = m().ellipse(24.5, 49.5, 5.2, 5.6, -55)
  d.part(head, SUIT, { bevel: 3 })
  const mask = m().ellipse(22.6, 51.6, 4.2, 4.6, -55).and(head.grown(1))
  d.part(mask, PORCELAIN, { bevel: 3 })
  d.stamp(['kk.', '.kk', '...', '.g.', '.g.'], 20, 50, { k: OUTLINE, g: GOLD[2] })
  d.fill(m().path([26, 45, 30, 47.5]).and(head), SUIT[2])

  // the spotlight lights the rims of the back, the raised arm and the rifle
  d.tone(d.mask().facing([0, -1, 1, 0]).minus(mask), 1)
}

/** Exactly four petals of fire drifting down: a curled flame with a faint glow round it. */
function petals(p: Painter): void {
  p.shine(true)
  for (const [x, y, lean, seed] of [
    [12, 30, 2, 3],
    [30.5, 22, -1.5, 5],
    [67, 44, -2, 7],
    [15, 66, 1.5, 9],
  ] as const) {
    const flame = flameMask(p, x, y, 4, 6.5, { lean, tongues: 0, seed }).minus(p.subjectMask)
    flame
      .grown(1)
      .minus(flame)
      .minus(p.subjectMask)
      .each((fx, fy) => {
        if ((fx + fy) % 2 === 0) p.set(fx, fy, VELVET[2])
      })
    fire(p, flame, [VELVET[4], EMBER, GOLD[3], LIGHT[1]])
  }
  p.shine(false)
}

export const jhinSignature: CardDef = {
  id: 'rb-unl-079',
  number: 79,
  name: 'Jhin, Virtuoso (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { domain2: 'Mind' },
  // the spotlight, its pool on the boards and the fire petals shine; marksman, curtains and stage stay matt
  foil: 'painted',
  draw(p) {
    stage(p)
    const d = p.layer()
    marksman(d)
    p.subject(d, OUTLINE)
    petals(p)
  },
}
