import type { Painter, Pt } from '../../toolkit/index.ts'
import { colors, cubic, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Schnellzugphönix (Ultra, Glut), hand-made full art, 80×112. Brief (docs/sets/empiremon.md): a phoenix
 * shaped like the nose of a sleek express train, wings of fire streaming back, speed lines over a
 * viaduct.
 *
 * Composition: the phoenix races to the right along the viaduct, its body the pearl-white nose of an
 * express train (our own livery: a gold flash, and a dark visor for a windscreen with a fierce slanted
 * eye in it). Its wings and tail are feathers of flame streaming back to the upper and lower left.
 * Behind it a low sun sinks behind the arches; speed lines cut across the dusk. The frame's plates
 * cover rows 4–14 and 91–106, so the phoenix flies at rows 16–74.
 */
const SKY = colors('240c2c', '4e1430', '8a1e2a', 'c83a20', 'f08a30')
const FIRE = colors('8a180e', 'd63c18', 'f8822a', 'ffc644', 'fff4c4')
const PEARL = colors('565870', '9496b0', 'd0d2e2', 'f8f8ff')
const VISOR = colors('121626', '34507e')
const STONE = colors('22101e', '3e1c2a', '6e3434')
const OUTLINE = hex('1c0810')

const SUN = { x: 54, y: 73, r: 11 }
/** Top of the viaduct's deck. */
const DECK = 70

function dusk(p: Painter): void {
  // dusk: deep violet above, burning orange at the horizon and round the sun
  p.dither(
    null,
    SKY,
    (x, y) => {
      const down = Math.pow(Math.min(1, Math.max(0, (y - 8) / 70)), 1.25)
      const sun = Math.max(0, 1 - Math.hypot(x - SUN.x, (y - SUN.y) * 1.3) / 40)
      return Math.min(1, down * 0.85 + sun * 0.5)
    },
    0.45,
  )
  const sun = p.m().disc(SUN.x, SUN.y, SUN.r)
  p.fill(sun, FIRE[3])
  p.fill(p.m().disc(SUN.x - 1, SUN.y - 1, SUN.r - 3), FIRE[4])

  // long thin clouds lit from below
  for (const [x, y, w] of [
    [6, 30, 22],
    [50, 25, 24],
    [30, 61, 18],
    [62, 58, 18],
  ] as const) {
    const cloud = p.m().ellipse(x + w / 2, y, w / 2, 1.6)
    p.fill(cloud, SKY[1])
    p.fill(cloud.facing([0, 1]), SKY[3])
  }

  // speed lines streaking past: most in the colour of the glow, every third one pale
  const rand = rng(28)
  for (let i = 0; i < 16; i++) {
    const y = 18 + Math.floor(rand() * 50)
    const x = Math.floor(rand() * 64)
    const len = 6 + Math.floor(rand() * 16)
    p.fill(p.m().rect(x, y, len, 1), i % 3 === 0 ? FIRE[4] : SKY[4])
  }
}

function viaduct(p: Painter): void {
  // the deck and parapet with the track on top, piers and arches below, all against the sun
  const stone = p.m().rect(0, DECK, 80, 42)
  const arches = p.m()
  for (const cx of [-8, 20, 48, 76]) arches.rect(cx - 9, 82, 18, 30).disc(cx, 82, 9)
  stone.minus(arches)
  p.fill(stone, STONE[1])
  p.fill(p.m().rect(0, DECK, 80, 3), STONE[0])
  p.fill(p.m().rect(0, DECK + 3, 80, 1), STONE[2])
  p.fill(arches.facing([0, -1]).and(p.m().rect(0, 72, 80, 40)), STONE[2])
  p.fill(
    arches
      .outerEdge()
      .and(stone)
      .and(p.m().rect(0, 74, 80, 38)),
    STONE[0],
  )
  // the valley seen through the arches: haze, then dark hills
  p.fill(p.m().poly([0, 96, 14, 90, 30, 93, 48, 88, 66, 92, 80, 89, 80, 112, 0, 112]).and(arches), STONE[0])
  // rails and the masts of the overhead line along the deck
  p.fill(p.m().rect(0, DECK - 1, 80, 1), STONE[2])
  for (const x of [8, 44, 74]) {
    p.fill(
      p
        .m()
        .rect(x, DECK - 16, 1, 16)
        .rect(x - 4, DECK - 15, 5, 1),
      STONE[0],
    )
  }
  p.fill(p.m().path([0, DECK - 13, 40, DECK - 13.5, 80, DECK - 13]), STONE[0])
}

/**
 * A flame feather from its root to its tip: [root x, root y, tip x, tip y, thickness, bow of the first
 * half, bow of the second half (defaults to the first: an arc; the opposite sign makes an S)].
 */
type Feather = readonly [number, number, number, number, number, number, number?]

/**
 * A tongue of flame with a dark seam on whatever it overlaps, in hard bands from white-hot at the root
 * to red at the tip, its lower edge one step darker. `heat` shifts the bands (lower = cooler).
 */
function feather(d: Painter, [rx, ry, tx, ty, width, bend, bend2 = bend]: Feather, heat: number): void {
  const [dx, dy] = [tx - rx, ty - ry]
  const len = Math.hypot(dx, dy)
  const [nx, ny] = [-dy / len, dx / len]
  const at = (k: number, b: number): Pt => [rx + dx * k + nx * b, ry + dy * k + ny * b]
  const m = d
    .m()
    .limb([at(0, 0), at(0.35, bend), at(0.7, bend2 * 0.9), [tx, ty]].flat(), [
      width,
      width * 0.85,
      width * 0.55,
      0.45,
    ])
  // a lick of flame curling off the outer side near the tip
  if (width > 2.4) {
    const [lx, ly] = at(0.62, bend2 * 0.9)
    const side = bend2 < 0 ? 1 : -1
    m.limb([lx, ly, ...at(0.8, bend2 * 0.9 + side * (width + 1.5))], [width * 0.45, 0.4])
  }
  d.contact(m)
  m.each((x, y) => {
    const k = ((x + 0.5 - rx) * dx + (y + 0.5 - ry) * dy) / (len * len) - heat
    d.set(x, y, k < 0.18 ? FIRE[4] : k < 0.42 ? FIRE[3] : k < 0.7 ? FIRE[2] : FIRE[1])
  })
  d.tone(m.facing([0, 1, 1, 0]), -1)
}

/** The near wing, raised and swept back: feathers rooted along its arm, the outermost first. */
const NEAR: readonly Feather[] = [
  [25, 20, 8, 17, 2.8, -1.5],
  [28, 24, 4, 25, 3.3, -2],
  [32, 29, 4, 35, 3.5, -2],
  [36, 34, 9, 44, 3.5, -2],
  [40, 39, 18, 51, 3.3, -1.5],
  [43, 43, 27, 55, 2.9, -1],
]
/** The far wing peeking over the body. */
const FAR: readonly Feather[] = [
  [45, 30, 32, 16, 2.6, -1.5],
  [48, 36, 41, 17, 2.6, -1],
]
/** The tail: three long, wavy ribbons of flame. */
const TAIL: readonly Feather[] = [
  [33, 54, 2, 58, 3, 3, -2],
  [34, 57, 4, 67, 3, 3, -2],
  [37, 59, 15, 74, 2.5, 2, -2],
]
/** The crest along the top of the head, blown back. */
const CREST: readonly Feather[] = [
  [49, 40.5, 43, 31, 1.9, -1],
  [53, 39.5, 49, 29.5, 1.8, -1],
  [57, 39.5, 55, 31.5, 1.5, -1],
]

/** The body: the nose of an express train, pearl white with a gold flash and a dark visor. */
function body(d: Painter): void {
  const top = cubic([30, 47], [42, 37], [58, 36.5], [77, 53], 16)
  const bottom = cubic([74, 55.5], [66, 60], [46, 62], [30, 57], 16)
  const nose = d.m().poly([...top, [76, 55], ...bottom])
  d.part(nose, PEARL, { bevel: 6 })
  // the gold flash along its flank, the sunset glowing on its belly
  const flash = d
    .m()
    .limb(cubic([31, 53], [46, 57], [62, 57.5], [74, 54], 10).flat(), [1.2, 1.1, 0.9, 0.6])
    .and(nose)
  d.fill(flash, FIRE[3])
  d.fill(flash.facing([0, 1]), FIRE[2])
  d.fill(nose.facing([0, 1]).and(d.m().rect(30, 56, 46, 8)), FIRE[2])
  // the visor: a dark windscreen shaped like a raptor's mask, the sky in it, a fierce slanted eye
  const visor = d
    .m()
    .poly([48, 42, 57, 39.5, 65, 41.5, 74, 50.5, 69, 50, 61, 47.5, 53, 47, 48.5, 45])
    .and(nose.shrunk(1))
  d.fill(visor, VISOR[0])
  d.fill(d.m().path([51, 42.5, 56, 41, 61, 41.5]).and(visor), VISOR[1])
  d.stamp(['ww....', 'fffw..', '.offf.', '...oo.'], 56, 43, { w: PEARL[3], f: FIRE[3], o: FIRE[1] })
  // the seam of the beak, headlights under it, and the seam where the nose cone opens
  d.fill(d.m().path([76, 54, 70, 56, 64, 57]), PEARL[0])
  d.px(74, 55, FIRE[4]).px(72, 56, FIRE[3])
  d.fill(d.m().path([38, 41, 37, 47, 38, 59]).and(nose.shrunk(1)), PEARL[1])
}

function phoenix(d: Painter): void {
  d.register(FIRE)
  for (const f of FAR) feather(d, f, -0.1)
  for (const f of TAIL) feather(d, f, 0.05)
  body(d)
  for (const f of CREST) feather(d, f, 0)
  for (const f of NEAR) feather(d, f, 0)
  // the arm of the near wing, white-hot along its leading edge
  const arm = d.m().limb([44, 45, 38, 36, 31, 27, 24.5, 19.5], [3, 2.6, 2.1, 1.5])
  d.contact(arm)
  d.fill(arm, FIRE[3])
  d.fill(arm.facing([-1, 0, 0, -1]), FIRE[4])
  d.fill(arm.facing([0, 1]), FIRE[2])
}

export const schnellzugphoenix: CardDef = {
  id: 'emp5-028',
  number: 28,
  name: 'Schnellzugphönix',
  tier: 'ultra',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    dusk(p)
    viaduct(p)
    const d = p.layer()
    phoenix(d)
    p.subject(d, OUTLINE)
  },
}
