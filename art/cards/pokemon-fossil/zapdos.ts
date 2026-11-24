import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, distanceField, hex, lightning, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Zapdos (Ultra). Brief: thunder bird perched on top of a storm-wrecked radio tower, jagged wings
 * raised, beak open in a screech, bolts converging on it from the clouds; night thunderstorm over
 * dark hills, rain streaks, sparks raining down from the tower. Full art, 80×112.
 *
 * Composition: the third of the bird trio, staged like Lavados square to the viewer, but perched:
 * it grips the bent top of the mast with both wings thrown up in a jagged V and screeches to the
 * left out of the gap between them. Three bolts strike in from the clouds and the edges and meet
 * in its body, which crackles with their glow. The name plate covers rows 5–15, the attack plate
 * 88–106.
 */
const SKY = colors('0b0716', '170f2c', '271948', '3a2766')
const CLOUD = colors('513a82', '7658aa', 'ae94dc')
const BOLT = colors('5f8fe8', 'a8d4ff', 'f4fbff')
const YELLOW = colors('7a4a0a', 'c08a14', 'f0c828', 'fde868', 'fffbc8')
const BLACK = colors('141018', '2e2836', '4a4254')
const ORANGE = colors('8a3e12', 'd8782a', 'f6b462')
const STEEL = colors('1e1830', '3e3658', '6e6690')
const OUTLINE = hex('08050e')

const P = (x: number, y: number): Pt => [x, y]
const MID = 40

function storm(p: Painter): void {
  p.shine(true)
  p.dither(null, SKY, (x, y) => 0.25 + noise(x, y * 1.3, 4, 10) * 0.45 - y / 200, 0.6)

  // storm clouds rolling over the top, lit from below by the lightning
  for (const [x, y, rx, ry, seed] of [
    [8, 22, 14, 7, 1],
    [30, 17, 13, 6, 2],
    [54, 18, 14, 6, 3],
    [74, 24, 12, 7, 4],
    [18, 32, 10, 5, 5],
    [64, 34, 10, 5, 6],
  ] as const) {
    const lump = p.m().blob(x, y, rx, ry, seed, 0.3)
    p.fill(lump, CLOUD[0])
    p.fill(lump.clone().minus(lump.moved(0, 2)), CLOUD[1])
    p.fill(lump.clone().minus(lump.moved(0, 1)).and(lump.moved(-1, -1)), CLOUD[2])
  }

  // rain slanting across the whole storm
  const rand = rng(17)
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * 84)
    const y = 16 + Math.floor(rand() * 70)
    p.fill(p.m().line(x, y, x - 1, y + 3), rand() < 0.5 ? SKY[3] : CLOUD[0])
  }
  p.shine(false)

  // dark hills under the storm
  p.fill(p.m().poly([0, 74, 12, 70, 24, 73, 34, 78, 46, 76, 58, 71, 70, 72, 80, 69, 80, 112, 0, 112]), SKY[1])
  p.fill(p.m().poly([0, 81, 16, 78, 30, 82, 50, 83, 66, 79, 80, 82, 80, 112, 0, 112]), SKY[0])
}

/** The radio mast: two steel legs, cross bracing, a bent antenna and a snapped brace. */
function tower(p: Painter): void {
  const legs = p.m().line(35, 64, 28, 90).line(45, 64, 52, 90)
  const braces = p.m()
  for (let y = 64; y < 88; y += 7) {
    const a = 35 - (y - 64) * 0.27
    const b = 45 + (y - 64) * 0.27
    const c = 35 - (y + 7 - 64) * 0.27
    const d = 45 + (y + 7 - 64) * 0.27
    braces.line(a, y, d, y + 7)
    if (y !== 71) braces.line(b, y, c, y + 7)
    braces.line(a, y, b, y)
  }
  p.fill(braces, STEEL[1])
  p.fill(legs.or(legs.moved(1, 0)), STEEL[1])
  p.fill(legs, STEEL[2])
  // the platform it perches on, and the antenna bent over by the storm
  p.fill(p.m().rect(32, 63, 16, 2), STEEL[1])
  p.fill(p.m().rect(32, 63, 16, 1), STEEL[2])
  p.fill(p.m().path([46, 63, 50, 55, 55, 51, 60, 52]), STEEL[2])
  p.fill(p.m().path([47, 63, 51, 55.5]), STEEL[1])
  // a snapped brace dangling from the left leg
  p.fill(p.m().line(31, 78, 26, 84), STEEL[1])
}

/** A spike feather: a narrow triangle from a base on the arm to a sharp tip, black at the end. */
function spike(d: Painter, base: Pt, tip: Pt, width: number, bias: number, black = true): void {
  const [dx, dy] = [tip[0] - base[0], tip[1] - base[1]]
  const len = Math.hypot(dx, dy)
  const [nx, ny] = [-dy / len, dx / len]
  const blade = d.m().poly([base[0] + nx * width, base[1] + ny * width, tip[0], tip[1], base[0] - nx * width, base[1] - ny * width])
  d.part(blade, YELLOW, { bias, bevel: 2 })
  if (!black) return
  const end = d.m().poly([base[0] + dx * 0.62 + nx * width, base[1] + dy * 0.62 + ny * width, tip[0], tip[1], base[0] + dx * 0.62 - nx * width, base[1] + dy * 0.62 - ny * width])
  d.shade(end.and(blade), BLACK, { bias, bevel: 1.5 })
}

/** One wing raised on the viewer's left; `side` -1 mirrors it to the far wing on the right. */
function wing(d: Painter, side: 1 | -1): void {
  const Q = (x: number, y: number): Pt => P(side === 1 ? x : 2 * MID - x, y)
  const bias = side === 1 ? 0 : -1
  // feathers hang from the arm, longest at the hand, with a zigzag outer edge
  for (const [bx, by, tx, ty, w] of [
    [33, 43, 27, 56, 3],
    [30, 39, 19, 53, 3.2],
    [27, 35, 11, 48, 3.4],
    [24, 30, 6, 41, 3.4],
    [21, 26, 3, 33, 3.4],
    [18, 22, 3, 24, 3.2],
    [15, 19, 5, 17, 3],
  ] as const)
    spike(d, Q(bx, by), Q(tx, ty), w, bias)
  d.part(d.m().poly([Q(36, 46), Q(26, 33), Q(17, 21), Q(13, 17.5), Q(15, 26), Q(20, 35), Q(28, 44), Q(33, 49)]), YELLOW, {
    bias,
    bevel: 3,
  })
  d.part(d.m().limb([Q(36, 45), Q(27, 33.5), Q(19, 23), Q(13.5, 17.5)], [2.6, 2.4, 2, 1.3]), YELLOW, { bias, bevel: 2 })
}

/** Eye under a jagged brow, the bird looks to the left: k = brow, e = eye, w = glint. */
const EYE = ['..kk', 'kkk.', 'we..']
/** The long beak opened in a screech: B b n = light to dark, c = lower mandible, r = the throat. */
const BEAK_OPEN = [
  '........BBBB',
  '....BBBBbbbb',
  'BBBBnnnnnnnn',
  '.rrrrrrrrrcc',
  '..rrrrrrcccc',
  '...rrcccnnnn',
  '..cccnnnnnn.',
  '.cnn........',
]

function bird(d: Painter): void {
  const m = (): Mask => d.m()

  // far wing, tail spikes, then the body
  wing(d, -1)
  for (const [tx, ty] of pts([53, 66, 49, 69, 56, 61])) spike(d, P(43, 57), P(tx, ty), 2.4, -1)
  d.part(m().ellipse(MID, 51, 8, 9.5), YELLOW)
  // spiky tufts on the chest
  for (const [bx, by, tx, ty] of [
    [34, 46, 29, 49],
    [34, 51, 29, 55],
    [36, 56, 32, 60],
  ] as const)
    spike(d, P(bx, by), P(tx, ty), 2.3, 0)

  // legs gripping the platform
  for (const x of [37, 43]) {
    d.part(m().limb([x, 58, x - 0.5, 61, x, 63.5], [1.3, 1.1, 1]), ORANGE, { bevel: 1 })
    d.stamp(['k.k.k', '.....'], x - 2, 64, { k: ORANGE[0] })
  }
  wing(d, 1)

  // neck and head, screeching to the left out of the gap between the wings
  d.part(m().limb([MID, 45, 40, 38, 40.5, 34], [3.8, 3.5, 3.3]), YELLOW)
  for (const [tx, ty] of pts([41.5, 21.5, 46.5, 23, 50, 26.5, 51.5, 31]))
    spike(d, P(41.5, 30), P(tx, ty), 2, 0, false)
  d.part(m().ellipse(40.5, 31, 4.8, 4.3), YELLOW)
  d.stamp(BEAK_OPEN, 25, 28, { B: ORANGE[2], b: ORANGE[1], n: ORANGE[0], c: ORANGE[1], r: BLACK[1] })
  d.stamp(EYE, 36, 28, { k: OUTLINE, e: OUTLINE, w: BOLT[2] })
}

/** Crackling glow round the bird, brightest close to it. */
function aura(p: Painter, body: Mask): void {
  const dist = distanceField(body.clone().invert())
  p.shine(true)
  for (let y = 16; y < 88; y++) {
    for (let x = 0; x < p.w; x++) {
      const d = dist[y * p.w + x] ?? 0
      if (d <= 1 || d > 5) continue
      const reach = 1.5 + noise(x, y, 23, 3) * 3
      const i = Math.floor((1 - (d - 1) / reach) * 2.6 + bayer(x, y) - 0.5)
      if (i >= 0) p.set(x, y, BOLT[Math.min(1, i)] ?? BOLT[0])
    }
  }
  p.shine(false)
}

export const zapdos: CardDef = {
  id: 'pkm-fossil-072',
  number: 72,
  name: 'Zapdos',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Elektro',
  hp: 80,
  attacks: [{ name: 'Donnersturm', cost: ['Elektro', 'Elektro', 'Elektro', 'Elektro'], damage: '40' }],
  // the storm sky, the bolts, the glow and the sparks shine; the bird, the mast and the hills stay matt
  foil: 'painted',
  draw(p) {
    storm(p)
    p.shine(true)
    // bolts striking in from the clouds and both edges, meeting in the bird
    lightning(p, P(52, 16), P(44, 40), BOLT[2], { seed: 4, jag: 2.5, glow: BOLT[0] })
    lightning(p, P(1, 60), P(36, 52), BOLT[2], { seed: 7, jag: 3, glow: BOLT[0] })
    lightning(p, P(79, 64), P(46, 54), BOLT[2], { seed: 9, jag: 3, glow: BOLT[0] })
    p.shine(false)
    tower(p)
    const d = p.layer()
    bird(d)
    aura(p, d.mask())
    p.subject(d, OUTLINE)

    // sparks raining down from the platform
    p.shine(true)
    const rand = rng(29)
    for (let i = 0; i < 18; i++) {
      const x = 33 + Math.floor(rand() * 15) + Math.floor((rand() - 0.5) * i * 0.6)
      const y = 66 + Math.floor(rand() * 20)
      p.px(x, y, rand() < 0.5 ? YELLOW[3] : YELLOW[4])
      if (rand() < 0.4) p.px(x, y - 1, YELLOW[2])
    }
    p.shine(false)
  },
}
