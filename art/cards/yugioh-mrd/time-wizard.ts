import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Zeitzauberer (Ultra). Brief: a small jester-like wizard in a purple robe and pointed cap, one foot
 * kicked up mid-spell, one hand holding up a round clock-face shield, the other a wand topped with a
 * spinning roulette wheel. A vortex of floating clock faces and gears; a sapling on one side, the
 * same tree old and gnarled on the other. Full art, 80×112.
 *
 * Composition: the wizard hops in the middle of a teal vortex, kicking one curled shoe up, his cap
 * flopping back to the left. The clock shield is raised on the left, the roulette wheel spins high on
 * the right: the two bright discs carry the card. Clocks and gears drift in the spiral; the sapling
 * sprouts in the lower left, the old tree twists up in the lower right. Text plates float over rows
 * 0–13 and 90–111.
 */
const TEAL = colors('03161a', '072a32', '0c424c', '14646c', '20908e', '4cc4b4')
const ROBE = colors('1c0a36', '361860', '582a8e', '8446be', 'ae78e2')
const GOLD = colors('5e3c0e', 'a8721a', 'e6b43a', 'fff0a0')
const FACE = hex('f6eed8')
const RED = colors('5a0e1a', 'c42c30')
const SKIN = colors('94543a', 'd49470', 'f6c8a0')
const LEAF = colors('2a6428', '62b04a')
const BARK = colors('24140c', '4a2c18', '78502e')
const WHITE = hex('ffffff')
const OUTLINE = hex('0a0618')

const P = (x: number, y: number): Pt => [x, y]

/** Centre of the vortex, behind the wizard's chest. */
const EYE_OF_TIME = P(40, 50)
/** The two bright discs: the clock shield on the left, the roulette wheel on the right. */
const SHIELD = { x: 20, y: 52, r: 9 }
const WHEEL = { x: 61, y: 27, r: 7.5 }

/** A cog: a disc with square teeth round its rim and a hole in the middle. */
function cog(p: Painter, x: number, y: number, r: number, turn: number): Mask {
  const m = p.m().disc(x, y, r - 1)
  for (let i = 0; i < 8; i++) {
    const a = turn + (i / 8) * Math.PI * 2
    m.disc(x + Math.cos(a) * (r - 0.4), y + Math.sin(a) * (r - 0.4), 1.2)
  }
  return m.minus(p.m().disc(x, y, r * 0.35))
}

/** A clock face: a rim, a pale face, twelve ticks and two hands. */
function clock(
  p: Painter,
  x: number,
  y: number,
  r: number,
  rim: readonly number[],
  face: number,
  ink: number,
): void {
  p.fill(p.m().disc(x, y, r), rim[0] ?? ink)
  p.fill(p.m().disc(x, y, r - 0.8), rim[1] ?? ink)
  p.fill(p.m().disc(x - 0.3, y - 0.3, r - 1.6), face)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const k = i % 3 === 0 ? 2.6 : 2.1
    p.px(Math.floor(x + Math.cos(a) * (r - k)), Math.floor(y + Math.sin(a) * (r - k)), ink)
  }
  p.fill(
    p
      .m()
      .line(x, y, x - r * 0.35, y - r * 0.45)
      .line(x, y, x + r * 0.55, y - r * 0.1),
    ink,
  )
}

function vortex(p: Painter): void {
  p.shine(true)
  const [cx, cy] = EYE_OF_TIME
  p.dither(
    null,
    TEAL,
    (x, y) => {
      const r = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 0.9)
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
      const arms = Math.max(0, Math.sin(a * 3 + r * 0.24)) * 0.32
      const glow = Math.max(0, 1 - r / 52)
      return glow * 0.55 + arms * (0.4 + glow) + noise(x, y, 2, 6) * 0.1
    },
    0.6,
  )
  // clocks and gears drifting in the spiral, dimmed by the depth of the vortex
  const ink = TEAL[1]
  clock(p, 11, 24, 5, [TEAL[2], TEAL[4]], TEAL[5], ink)
  clock(p, 70, 52, 4.5, [TEAL[2], TEAL[4]], TEAL[5], ink)
  clock(p, 29, 76, 4, [TEAL[2], TEAL[4]], TEAL[5], ink)
  for (const [x, y, r, turn] of [
    [9, 64, 4.5, 0.2],
    [74, 70, 5.5, 0.5],
    [6, 40, 4, 0.1],
    [52, 79, 3.5, 0.3],
  ] as const) {
    const g = cog(p, x, y, r, turn)
    p.fill(g, GOLD[0])
    p.fill(g.facing([-1, 0, 0, -1]), GOLD[1])
  }
  // sparkles of time
  const rand = rng(83)
  for (let i = 0; i < 26; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = 15 + Math.floor(rand() * 72)
    p.px(x, y, i % 4 === 0 ? WHITE : TEAL[5])
  }
  p.shine(false)

  // the ground, the sapling on the left and the old tree on the right: a thousand years apart
  const ground = p.m().poly([0, 86, 16, 84, 34, 85.5, 52, 84.5, 66, 85, 80, 83, 80, 112, 0, 112])
  p.fill(ground, TEAL[1])
  p.fill(ground.facing([0, -1]), TEAL[3])
  p.fill(p.m().line(11, 85, 11, 79), BARK[2])
  p.fill(p.m().ellipse(9, 79, 2.2, 1.2, -25).ellipse(13.5, 78, 2.2, 1.2, 25), LEAF[1])
  p.px(8, 79, LEAF[0]).px(14, 78, LEAF[0])
  const trunk = p
    .m()
    .limb([70, 86, 72, 78, 69, 72, 72, 65, 70, 59], [3.4, 2.6, 2.4, 1.8, 1.2])
    .limb([70, 71, 75, 68, 78, 63], [1.4, 1, 0.6])
    .limb([72, 65, 76, 61, 77, 56], [1.2, 0.8, 0.5])
    .limb([70, 61, 67, 57, 67, 53], [1, 0.7, 0.5])
  p.shade(trunk, BARK, { bevel: 1.5 })
  p.fill(trunk.facing([-1, 0]), BARK[2])
  for (const [x, y] of [P(78, 62), P(67, 52), P(77, 55), P(71, 58)])
    p.fill(p.m().ellipse(x, y, 1.8, 1.1), LEAF[0])
}

/**
 * The face under the brim, hand-pixelled: big round eyes, a long nose and a wide grin.
 * S s d = skin light to dark, e = white of the eyes, k = pupils and the mouth, t = teeth.
 */
const MUG = [
  'dddddddddd',
  'dSeksseksd',
  'dSeesseesd',
  'dSSSsssSsd',
  'dSSkSdsksd',
  '.dSktttkd.',
  '..dskkksd.',
  '...dssd...',
]
const MUG_KEY = { S: SKIN[2], s: SKIN[1], d: SKIN[0], e: WHITE, k: ROBE[0], t: FACE }
const MUG_AT = P(35, 37)

function wizard(d: Painter): void {
  const m = (): Mask => d.m()

  // the planted leg and the kicked-up leg, both in striped hose, ending in curled jester shoes
  d.part(m().limb([37, 70, 35, 78, 34, 83], [2.6, 2.2, 2]), ROBE, { bias: -1 })
  d.part(m().poly([31, 82, 37, 82, 38, 85, 27, 85, 26, 82.5]), GOLD, { bevel: 1.5 })
  d.part(m().limb([45, 69, 52, 74, 58, 70], [2.8, 2.4, 2]), ROBE)
  d.part(m().poly([56, 68, 61, 66, 64, 62, 62, 69, 57, 72]), GOLD, { bevel: 1.5 })
  for (const [x, y] of [P(35, 76), P(34, 80), P(50, 73), P(54, 72.5)])
    d.fill(m().rect(x - 1, y, 3, 1), GOLD[1])

  // the robe: a bell flaring from the shoulders to a zigzag hem trimmed in gold
  const hem: number[] = []
  for (let i = 0; i <= 8; i++) hem.push(52 - i * 3.25, i % 2 === 0 ? 71 : 74)
  const robe = m().poly([35, 46, 45, 46, 50, 58, ...hem, 30, 58])
  d.part(robe, ROBE, { bevel: 5 })
  d.fill(robe.facing([0, 1]), GOLD[2])
  d.fill(
    m()
      .path(quad(P(40, 47), P(38, 60), P(40, 73)))
      .and(robe.shrunk(1)),
    ROBE[1],
  )

  // the arm holding the wand up, then the wand and the arm behind the shield
  d.part(m().limb([46, 49, 52, 45, 56, 39], [2.6, 2.2, 2]), ROBE)
  d.part(m().limb([57, 46, 60, 34], [0.9, 0.8]), GOLD, { bevel: 1 })
  d.part(m().disc(56.5, 39, 2.2), SKIN)
  d.part(m().limb([34, 50, 28, 53, 25, 52], [2.6, 2.2, 2]), ROBE)

  // the jester collar: gold-tipped points round the neck
  const collar = m()
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9)
    collar.poly([
      40 - Math.cos(a) * 2,
      45,
      40 + Math.cos(a) * 9,
      45 + Math.sin(a) * 5.5,
      40 + Math.cos(a) * 2,
      45.5,
    ])
  }
  d.part(collar.or(m().ellipse(40, 46, 7.5, 2.4)), ROBE, { bevel: 2, bias: 1 })
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9)
    d.px(Math.round(40 + Math.cos(a) * 9 - 0.5), Math.round(45 + Math.sin(a) * 5.5 - 0.5), GOLD[3])
  }

  const mug = d.layer().stamp(MUG, MUG_AT[0], MUG_AT[1], MUG_KEY)
  d.contact(mug.mask()).blit(mug)

  // the cap: a tall cone flopping back to the upper left, a gold band, a bell on its tip
  const cap = m().poly([
    P(33, 36),
    ...quad(P(34, 29), P(34, 22), P(26, 18), 6),
    ...quad(P(26, 18), P(37, 21), P(43, 27), 6),
    P(47, 36),
  ])
  d.part(cap, ROBE, { bevel: 4 })
  d.fill(
    m()
      .path(quad(P(35, 33), P(35, 25), P(29, 20)))
      .and(cap.shrunk(1)),
    ROBE[4],
  )
  d.part(m().rect(32, 34.5, 16, 2.5), GOLD, { bevel: 1 })
  d.part(m().disc(25, 18.5, 2), GOLD, { bevel: 1.5 })
}

/** The two bright discs: the clock shield and the spinning roulette wheel. */
function discs(d: Painter): void {
  const m = (): Mask => d.m()
  // the clock shield: a gold rim, a pale face with ticks and two hands
  const { x, y, r } = SHIELD
  d.part(m().disc(x, y, r), GOLD, { bevel: 2.5 })
  d.shine(true)
  d.fill(m().disc(x - 0.3, y - 0.3, r - 2.2), FACE)
  d.shine(false)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const k = r - (i % 3 === 0 ? 3.6 : 3.1)
    const tx = Math.floor(x + Math.cos(a) * k)
    const ty = Math.floor(y + Math.sin(a) * k)
    d.px(tx, ty, ROBE[1])
    if (i % 3 === 0)
      d.px(Math.floor(x + Math.cos(a) * (k - 1)), Math.floor(y + Math.sin(a) * (k - 1)), ROBE[1])
  }
  d.fill(
    m()
      .line(x, y, x - 2, y - 4)
      .line(x, y, x + 4, y - 1),
    ROBE[0],
  )
  d.px(Math.floor(x), Math.floor(y), GOLD[1])

  // the roulette wheel on the wand: red and pale pockets round a gold hub, a gold rim
  const w = WHEEL
  d.part(m().disc(w.x, w.y, w.r), GOLD, { bevel: 2 })
  d.shine(true)
  const inner = m().disc(w.x, w.y, w.r - 1.6)
  inner.each((px, py) => {
    const a = Math.atan2(py + 0.5 - w.y, px + 0.5 - w.x) + 0.3
    const pocket = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10) % 2
    d.set(px, py, pocket === 0 ? RED[1] : FACE)
  })
  d.fill(m().disc(w.x, w.y, 2), GOLD[2])
  d.px(Math.floor(w.x), Math.floor(w.y), GOLD[3])
  d.shine(false)
}

/** The wheel spins and the shield shines: motion arcs round the wheel, sparkles on both. */
function spin(p: Painter): void {
  p.shine(true)
  const w = WHEEL
  p.fill(p.m().path(quad(P(w.x - 9, w.y - 3), P(w.x - 7, w.y - 10), P(w.x - 1, w.y - 11))), WHITE)
  p.fill(p.m().path(quad(P(w.x + 9, w.y + 3), P(w.x + 7, w.y + 10), P(w.x + 1, w.y + 11))), WHITE)
  for (const [x, y] of [P(14, 44), P(24, 47), P(57, 22), P(66, 31)])
    p.px(x, y, WHITE)
      .px(x - 1, y, TEAL[5])
      .px(x + 1, y, TEAL[5])
      .px(x, y - 1, TEAL[5])
      .px(x, y + 1, TEAL[5])
  p.shine(false)
}

export const timeWizard: CardDef = {
  id: 'ygo-mrd-083',
  number: 83,
  name: 'Zeitzauberer',
  tier: 'ultra',
  kind: 'monster',
  element: 'LICHT',
  sub: 'effect',
  print: { level: 2, atk: 500, def: 400, type: 'Hexer' },
  // the vortex with its clocks and gears, the faces of both discs and the sparkles shine; the
  // wizard, the ground and the trees stay matt
  foil: 'painted',
  draw(p) {
    vortex(p)
    const d = p.layer()
    wizard(d)
    discs(d)
    p.subject(d, OUTLINE)
    spin(p)
  },
}
