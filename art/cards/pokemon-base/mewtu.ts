import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, distanceField, hex, noise, pts } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Mewtu (Ultra). Brief: pale psychic clone hovering with arms crossed, eyes glowing, shattered
 * laboratory tubes. Full art, 80×112.
 *
 * Composition: Mewtu hovers in the middle, square to the viewer, arms crossed, and glares out of
 * the card; its tail sweeps out to the right and curls up. Behind it the lab: on the left the stump
 * of a burst cloning tube on its base, on the right the upper half of another one hanging from the
 * ceiling. Glass shards float in the psychic aura. The name plate covers rows 5–15, the attack
 * plate 88–106.
 */
const LAB = colors('04050e', '0a1024', '131e3a', '213456', '345278')
const GLASS = colors('237a88', '4cc4cc', 'aaf2ee', 'ffffff')
const STEEL = [LAB[1], LAB[3], hex('5d6f90'), hex('a3b3cb')]
const SKIN = colors('3b2a56', '6c5a8e', 'a294c2', 'd6cde8', 'f6f2fc')
const PURPLE = colors('2c1040', '582878', '8a4aae', 'b47ad4')
const AURA = colors('1c2a7a', '3456d8', '74a4ff', 'd2e8ff')
const RED = hex('ff3048')
const OUTLINE = hex('0c0616')

/** A cloning tube: tinted glass, a lit wall on the left, a dark one on the right, the break bright. */
function tube(p: Painter, glass: Mask, x0: number, x1: number, rim: readonly number[]): void {
  const column = (x: number, w: number): Mask => glass.clone().and(p.m().rect(x, 0, w, p.h))
  p.tone(glass, 1)
  p.dither(column(x0 + 2, 3), [LAB[3], GLASS[0], GLASS[1]], (x) => 1 - Math.abs(x - x0 - 3) * 0.5, 0.6)
  p.fill(column(x0, 1), GLASS[1])
  p.fill(column(x1 - 1, 1), GLASS[0])
  p.fill(p.m().path(rim), GLASS[2])
}

function lab(p: Painter): void {
  p.register(LAB)
  // dark wall of steel panels, faintly lit around the middle where Mewtu glows
  p.dither(
    null,
    LAB,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 52) * 0.8) / 46)
      return 0.1 + glow * 0.5 + noise(x, y, 4, 9) * 0.12
    },
    0.6,
  )
  for (const x of [27, 53]) p.fill(p.m().rect(x, 0, 1, 86), LAB[0])
  for (const [x, y] of pts([25, 30, 29, 30, 51, 30, 55, 30, 25, 66, 29, 66, 51, 66, 55, 66]))
    p.px(x, y, LAB[3])

  // floor, with the glow of the aura on it
  const floor = p.m().rect(0, 86, 80, 26)
  p.fill(floor, LAB[1])
  p.edge(floor, LAB[3], [0, -1])
  p.dither(floor.clone().and(p.m().ellipse(40, 87, 15, 2.5)), [LAB[1], AURA[0]], () => 0.6, 0.5)

  // left: the stump of a burst tube on its base, cloning fluid still inside
  p.shine(true)
  const left = [4, 50, 6.5, 46, 8.5, 50.5, 11, 42.5, 13.5, 48.5, 16, 44.5, 18.5, 50, 21, 46]
  const stump = p.m().poly([4, 79, ...left, 21, 79])
  tube(p, stump, 4, 21, left)
  const fluid = stump.clone().and(p.m().rect(0, 65, 80, 14))
  p.dither(fluid, [GLASS[0], GLASS[1]], (x, y) => 0.35 + noise(x, y, 2, 3) * 0.4, 0.5)
  p.fill(fluid.facing([0, -1]), GLASS[2])
  for (const [x, y] of pts([9, 70, 14, 74, 11, 76, 16, 68])) p.px(x, y, GLASS[3])

  // right: the top half of another tube still hangs from the ceiling, dripping
  const right = [74, 48, 71.5, 53, 69, 47.5, 66.5, 54, 64, 48.5, 62, 52.5, 60, 47]
  tube(p, p.m().poly([60, 21, 74, 21, ...right]), 60, 74, right)
  for (const [x, y] of pts([66, 57, 66, 60, 71, 57, 62, 56])) p.px(x, y, GLASS[1])
  p.shine(false)

  // steel: the base of the stump, the cap of the hanging tube; red status lamps
  p.shade(p.m().rect(2, 78, 22, 8), STEEL, { bevel: 2 })
  p.fill(p.m().rect(2, 81, 22, 1), LAB[1])
  p.shade(p.m().rect(58, 14, 18, 7), STEEL, { bevel: 2 })
  p.fill(p.m().rect(58, 19, 18, 1), LAB[1])
  p.fill(p.m().rect(5, 83, 2, 1).rect(68, 16, 2, 1), RED)
}

/** Psychic aura round the body: bright close to it, flickering out into the dark. */
function aura(p: Painter, body: Mask): void {
  const dist = distanceField(body.clone().invert())
  p.shine(true)
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const d = dist[y * p.w + x] ?? 0
      if (d <= 1 || d > 12) continue
      const reach = 2.5 + noise(x, y, 17, 5) * 5
      const i = Math.min(3, Math.floor((1 - (d - 1) / reach) * 3.4 + bayer(x, y) - 0.5))
      if (i >= 0) p.set(x, y, AURA[i] ?? AURA[0])
    }
  }
  p.shine(false)
}

/** A glass shard floating in the aura: a small triangle, lit on its top left. */
function shard(p: Painter, x: number, y: number, r: number, deg: number): void {
  const a = (deg * Math.PI) / 180
  const corner = (turn: number, k: number) => [x + Math.cos(a + turn) * r * k, y + Math.sin(a + turn) * r * k]
  const tri = p
    .m()
    .poly([...corner(0, 1), ...corner(2.4, 0.7), ...corner(3.8, 0.8)])
    .minus(p.subjectMask)
  p.fill(tri, GLASS[1])
  p.fill(tri.facing([1, 0, 0, 1]), GLASS[0])
  p.fill(tri.facing([-1, 0, 0, -1]), GLASS[2])
}

/** Lids and mouth (k, m) and the glowing eyes (c, g), 13 columns centred on x = 40. */
const FACE = ['.kk.......kk.', '..kkk...kkk..', ...Array<string>(6).fill(''), '.....mmm.....']
const EYES = ['..cgg...ggc..', '...c.....c...']

/** Mirror x around the middle of the body for the right-hand side. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

function mewtwo(d: Painter): void {
  const m = (): Mask => d.m()

  // tail from behind the right hip, out to the right and curling up
  d.part(
    m().limb([47, 63, 57, 74, 67, 78.5, 74, 72.5, 76, 62.5, 72, 54.5], [5, 4.8, 4.5, 4.2, 3.8, 3.4]),
    PURPLE,
    { bevel: 4 },
  )
  // the tube from the back of the skull into the spine, behind the neck
  d.part(m().limb([45.5, 29.5, 50, 34.5, 49, 40], 1.7), SKIN, { bias: -1 })

  // body in one piece: broad chest and shoulders, a slim waist; the purple belly below the chest
  d.part(m().limb([40, 30, 40, 37], 2.8), SKIN)
  d.part(
    m().limb([40, 37, 40, 45, 40, 53], [9.5, 8.5, 6.2]).disc(29.5, 40.5, 3.8).disc(50.5, 40.5, 3.8),
    SKIN,
    { bevel: 6 },
  )
  d.part(m().ellipse(40, 57, 6, 9.5), PURPLE, { bevel: 4 })

  // legs hang loose while it hovers: heavy thighs, knees together, slim shins, toes pointing down
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(
      m().limb([x(34.5), 59, x(33.5), 66, x(35), 72, x(36.5), 77, x(37.6), 79.5], [6, 5.3, 3.3, 2.2, 1.8]),
      SKIN,
      { bevel: 5 },
    )
    d.part(m().ellipse(x(37.8), 80.8, 2.2, 1.6), SKIN, { bevel: 2 })
  }

  // arms crossed: slim upper arms, the far forearm with its fingers round the left biceps, the near
  // forearm over it with its fingers round the right biceps
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(29.5), 41, x(27.5), 47, x(27.5), 52.5], [3.2, 2.8, 2.7]), SKIN)
  }
  d.part(m().limb([52.5, 52.5, 44, 49, 34, 46], [2.6, 2.4, 2.2]), SKIN)
  for (const [x, y] of pts([31.8, 44, 30.8, 46.4, 31.8, 48.8])) d.part(m().disc(x, y, 1.3), SKIN)
  d.part(m().limb([27.5, 53, 36, 51.2, 46, 48.5], [2.8, 2.6, 2.4]), SKIN)
  for (const [x, y] of pts([48.3, 46.2, 49.3, 48.6, 48.3, 51])) d.part(m().disc(x, y, 1.3), SKIN)

  // head like a cat's: blunt horns, a round skull wide at the cheeks, a short muzzle, the glare
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(36.3), 22, x(34.8), 17.6], [2.4, 1.9]), SKIN)
  }
  d.part(m().ellipse(40, 25, 6.3, 5.3).ellipse(40, 27.8, 7, 3.6), SKIN)
  d.part(m().ellipse(40, 31.6, 3.4, 2.8), SKIN, { line: 'shadow' })
  d.stamp(FACE, 34, 25, { k: SKIN[0], m: SKIN[1] })
  d.shine(true)
  d.stamp(EYES, 34, 27, { c: GLASS[2], g: GLASS[3] })
  d.shine(false)

  // the aura lights the right-hand rim
  d.tone(d.mask().facing([1, 0]), 1)
}

const SHARDS = [
  [21, 23, 2.6, 20],
  [58, 28, 2.2, 140],
  [17, 58, 3.2, 300],
  [61, 63, 2.4, 80],
  [24, 80, 2.2, 200],
  [57, 83, 2.6, 30],
] as const

export const mewtu: CardDef = {
  id: 'pkm-base-089',
  number: 89,
  name: 'Mewtu',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Psycho',
  hp: 60,
  attacks: [
    { name: 'Psychokinese', cost: ['Psycho', 'Farblos'], damage: '10+' },
    { name: 'Barriere', cost: ['Psycho', 'Psycho'] },
  ],
  // the aura, the glass, the fluid and the glowing eyes shine; Mewtu and the lab stay matt
  foil: 'painted',
  draw(p) {
    lab(p)
    const d = p.layer()
    mewtwo(d)
    aura(p, d.mask())
    p.subject(d, OUTLINE)
    p.shine(true)
    for (const [x, y, r, deg] of SHARDS) shard(p, x, y, r, deg)
    p.shine(false)
  },
}
