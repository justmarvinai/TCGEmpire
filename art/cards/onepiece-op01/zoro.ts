import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Roronoa Zoro (Alt-Art, Ultra). Brief: phantom stance with three faces and six shimmering arms, nine
 * swords; black-green void. Full art, 80×112.
 *
 * Composition: Zoro stands square to the viewer in a black-green void, bandana tied on, a sword
 * between his teeth, two swords in his fists. Beside his head rise the phantom's two faces, green
 * ghosts of his own, each biting a blade; four more ghost arms reach out from behind him, blades up
 * along the edges and down into the mist. Nine blades in all fan out round him. Green mist rises
 * from below, sparks drift in the dark. The frame covers the outer 4 pixels and its plates rows
 * 1–13 and 90–108.
 */
const VOID = colors('03060a', '081812', '0f2a20', '1a4232')
const AURA = colors('1d6a46', '3aa070', '7ae0a8', 'd8ffe8')
const SKIN = colors('5a2a24', 'a8603e', 'e09a6a', 'f8c898')
const HAIR = colors('1a4a24', '2e7a3a', '5ab04e')
const BANDANA = colors('121218', '2a2a38', '4a4a5e')
const ROBE = [VOID[1], VOID[2], VOID[3], HAIR[0]]
const SASH = colors('5a0c16', 'b02428', 'e0503c')
const STEEL = colors('4a5468', 'a8b4c8', 'eef4ff')
const GOLD = hex('e8b83a')
const OUTLINE = hex('020405')

/**
 * Zoro's head, frontal: bandana, green hair at the temples, the glare of the right eye, the left
 * eye shut under its scar, three gold earrings, the hilt of a sword between his teeth.
 */
const HEAD = [
  '.....bbbbbbbb.....',
  '...bbBBbbbbbbbb...',
  '..bBBbbbbbbbbbbb..',
  '..bBbbbbbbbbbbbbb.',
  '.bbbbbbbbbbbbbbbbb',
  '.bbbbbbbbbbbbbbbb.',
  '.qgbbbbbbbbbbbbgq.',
  '.gGffffffffffSfGg.',
  '.gKKffffffffffKKg.',
  '.gffKKKffffKKSffgo',
  '.gfKeKKffffKKSKfg.',
  '..ffssffffffffSfs.',
  '..sffffffsfffSfs.o',
  '..sfffffffsffffs..',
  '...sfffffSSffss..o',
  '...sffSSSSSSfss...',
  '....sffffffffs....',
  '.....ssffffss.....',
  '.......ssss.......',
]
const HEAD_KEY = {
  K: OUTLINE,
  b: BANDANA[0],
  B: BANDANA[1],
  g: HAIR[1],
  G: HAIR[2],
  q: HAIR[0],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  o: GOLD,
  e: STEEL[2],
}
const HX = 31
const HY = 19

function voidBackground(p: Painter): void {
  p.register(VOID).register(AURA)
  // black-green void, a little lighter behind him, green mist drifting up
  p.dither(
    null,
    VOID,
    (x, y) =>
      Math.max(0, 0.7 - Math.hypot(x - 40, (y - 44) * 0.8) / 44) +
      Math.max(0, noise(x * 0.5, y * 0.15, 4, 6) - 0.55) * 1.6,
    0.7,
  )
  p.shine(true)
  stars(p, rng(13), 34, [AURA[2], AURA[3], AURA[1]], { x: 4, y: 14, w: 72, h: 76 })
  // green mist rising from below
  p.dither(
    p.m().rect(0, 66, 80, 46),
    [VOID[1], VOID[3], AURA[0]],
    (x, y) => (y - 64) / 30 + noise(x * 0.7, y * 0.4, 23, 5) * 0.7 - 0.45,
    0.8,
  )
  p.shine(false)
}

/** A sword: blade from `hilt` to `tip` (an edge and its back), a round guard, the grip behind. */
function sword(p: Painter, hilt: Pt, tip: Pt, blade: readonly number[], grip: number, guard = GOLD): void {
  const len = Math.hypot(tip[0] - hilt[0], tip[1] - hilt[1])
  const ux = (tip[0] - hilt[0]) / len
  const uy = (tip[1] - hilt[1]) / len
  const start = [hilt[0] + ux * 2, hilt[1] + uy * 2]
  const back = p.m().path([start[0] ?? 0, start[1] ?? 0, tip[0] - ux * 2, tip[1] - uy * 2])
  const side = Math.abs(ux) > Math.abs(uy) ? [0, uy >= 0 ? -1 : 1] : [ux >= 0 ? 1 : -1, 0]
  const edge = back
    .moved(side[0] ?? 0, side[1] ?? 0)
    .or(p.m().path([start[0] ?? 0, start[1] ?? 0, tip[0], tip[1]]))
  p.fill(back.grown(1).minus(edge).minus(back), blade[0] ?? 0)
  p.fill(back, blade[1] ?? 0)
  p.fill(edge, blade[2] ?? 0)
  p.fill(p.m().disc(hilt[0] + ux * 1.4, hilt[1] + uy * 1.4, 1.6), guard)
  p.fill(p.m().limb([hilt[0], hilt[1], hilt[0] - ux * 5, hilt[1] - uy * 5], 1.1), grip)
}

/** The phantom: two more faces beside his own and four more arms, all shimmering green, with blades. */
function phantom(p: Painter): void {
  const g = p.layer()
  const ghostKey = {
    K: VOID[0],
    b: AURA[0],
    B: AURA[1],
    g: AURA[1],
    G: AURA[2],
    q: AURA[0],
    S: AURA[0],
    s: AURA[1],
    f: AURA[2],
    o: AURA[3],
    e: AURA[3],
  }
  g.stamp(HEAD, HX - 19, HY - 2, ghostKey, true)
  g.stamp(HEAD, HX + 19, HY - 2, ghostKey)
  const m = (): Mask => g.m()
  for (const s of [-1, 1]) {
    const x = (v: number) => 40 + s * (v - 40)
    g.part(m().limb([x(29), 47, x(17), 47, x(9), 43], [2.8, 2.5, 2.3]), AURA, { bevel: 2 })
    g.part(m().limb([x(30), 64, x(20), 68, x(11), 66], [2.8, 2.5, 2.3]), AURA, { bevel: 2 })
    g.part(m().disc(x(8.5), 42, 2.6), AURA, { bevel: 2 })
    g.part(m().disc(x(10), 66, 2.6), AURA, { bevel: 2 })
  }
  const shape = g.silhouette(VOID[0])
  p.shine(true)
  p.fill(shape.grown(1).minus(shape), AURA[0])
  p.blit(g)
  const ghost = [AURA[0], AURA[2], AURA[3]]
  for (const [hx, hy, tx, ty] of [
    [8, 41, 5, 15],
    [72, 41, 75, 15],
    [10, 67, 4, 92],
    [70, 67, 76, 92],
    [HX - 7, 33, 2, 30],
    [HX + 25, 33, 78, 30],
  ] as const)
    sword(p, [hx, hy], [tx, ty], ghost, AURA[1], AURA[2])
  p.shine(false)
}

function zoro(d: Painter): void {
  const m = (): Mask => d.m()
  // real arms, held out low, a sword in each fist
  d.part(m().limb([29, 46, 22, 54, 15, 57], [3.3, 2.9, 2.7]), SKIN)
  d.part(m().limb([51, 46, 58, 54, 65, 57], [3.3, 2.9, 2.7]), SKIN)
  for (const x of [14, 66]) d.part(m().disc(x, 57.5, 2.8), SKIN, { bevel: 2 })
  // the robe, open wide over the chest, sleeves pushed back; red sash
  const robe = m().poly([24, 45, 33, 40, 47, 40, 56, 45, 55, 70, 54, 112, 26, 112, 25, 70])
  d.part(robe, ROBE, { bevel: 6 })
  d.part(m().limb([27, 45, 22, 52], 4.4), ROBE)
  d.part(m().limb([53, 45, 58, 52], 4.4), ROBE)
  const chest = m().poly([32, 40, 48, 40, 44, 66, 36, 66])
  d.part(chest, SKIN, { bevel: 5 })
  d.fill(m().path([36, 49, 39.5, 50.5]).path([44, 49, 40.5, 50.5]).path([40, 54, 40, 62]), SKIN[1])
  d.fill(m().path([32, 40, 36, 66]).path([48, 40, 44, 66]), HAIR[0])
  // the old diagonal scar across his chest, stitched
  d.fill(m().path([34, 43, 46, 61]).and(chest.shrunk(1)), SKIN[0])
  for (const [x, y] of [
    [36, 45],
    [39, 50],
    [42, 54],
  ] as const)
    d.px(x + 1, y - 1, SKIN[0])
  const sash = m().poly([25, 66, 55, 66, 55, 75, 25, 75])
  d.part(sash, SASH, { bevel: 3 })
  d.fill(m().path([26, 70, 54, 70]).and(sash), SASH[0])
  // the robe's skirts below the sash: the front edges overlapping, a few deep folds
  const skirt = robe.clone().and(m().rect(0, 75, 80, 37))
  for (const fold of [
    [41, 75, 46, 112],
    [31, 76, 30, 112],
    [50, 76, 51, 112],
  ])
    d.fill(m().path(fold).and(skirt.shrunk(1)), VOID[1])
  d.fill(m().path([42, 75, 47, 112]).and(skirt.shrunk(1)), HAIR[0])
  // neck and head
  d.part(m().rect(36, 34, 8, 7), SKIN, { bevel: 3 })
  d.tone(m().rect(36, 35, 8, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
}

export const zoroAlt: CardDef = {
  id: 'op01-086',
  number: 86,
  name: 'Roronoa Zoro (Alt-Art)',
  tier: 'ultra',
  kind: 'character',
  element: 'Rot',
  print: { cost: 3, power: 5000, type: 'Supernovae/Strohhutbande' },
  // the aura, the phantom with its blades and the sparks in the void shine; Zoro himself stays matt
  foil: 'painted',
  draw(p) {
    voidBackground(p)
    phantom(p)
    const d = p.layer()
    zoro(d)
    p.subject(d, OUTLINE)
    // his own three blades: two in his fists, one between his teeth
    sword(p, [13, 58], [5, 80], STEEL, BANDANA[0])
    sword(p, [67, 58], [75, 80], STEEL, SASH[1])
    sword(p, [33, 36], [17, 41], STEEL, STEEL[2])
  },
}
