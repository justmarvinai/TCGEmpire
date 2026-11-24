import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Dragoran, a Grail of Fossil. Brief: friendly orange dragon flying towards the viewer out of a sea
 * storm, small wings in a strong upstroke, arms open wide, calm face, antennae swept back by the
 * wind; towering waves at night, a lighthouse beam cutting through the rain and lighting the dragon
 * from the side, a tiny boat riding the swell behind it. Full art, 80×112.
 *
 * Composition: Dragoran comes straight at the viewer in the middle of the card, wings raised high,
 * arms wide as if to catch someone. The lighthouse stands on a rock far out on the left; its beam
 * fans out through the rain and ends on the dragon, lighting its left side gold while the right side
 * turns away into the storm. A great wave curls up behind on the right, smaller ones break in front,
 * a small boat rides the swell on the horizon. The name plate covers rows 5–15, the attack plate
 * rows 88–106.
 */
const STORM = colors('060a16', '0c1426', '152238', '22344c', '364a62')
const SEA = colors('071428', '0e2442', '183a60')
const FOAM = colors('7e98ae', 'd8e6ee')
const ORANGE = colors('5a2210', '9c4818', 'd87626', 'f4a040', 'ffd27a')
const CREAM = colors('b08448', 'eccb84', 'fff0bc')
const TEAL = colors('0e3a38', '1a6860', '2e9a84', '6cceb0')
const GOLD = colors('b88a2a', 'f0cc5a', 'fff4c0')
const OUTLINE = hex('0a0812')

const P = (x: number, y: number): Pt => [x, y]

/** The lamp of the lighthouse; its beam fans out to the right and finds the dragon's chest. */
const LAMP = P(7, 31)
const TARGET = P(44, 46)
/** Half the opening angle of the beam, in radians. */
const SPREAD = 0.3

/** Strength of the beam at a pixel: 1 on its axis near the lamp, fading outwards and with distance. */
function beam(x: number, y: number): number {
  const ax = TARGET[0] - LAMP[0]
  const ay = TARGET[1] - LAMP[1]
  const along = ((x - LAMP[0]) * ax + (y - LAMP[1]) * ay) / Math.hypot(ax, ay)
  if (along <= 0) return 0
  const across = Math.abs((x - LAMP[0]) * ay - (y - LAMP[1]) * ax) / Math.hypot(ax, ay)
  const k = across / (along * Math.tan(SPREAD) + 1.5)
  // the dragon stops the beam: it dies out just behind the target
  const reach = Math.hypot(ax, ay)
  return (
    Math.max(0, 1 - k * k) * Math.max(0, 1 - along / 110) * Math.min(1, Math.max(0, (reach + 6 - along) / 8))
  )
}

/** The horizon of the open sea. */
const HORIZON = 58

function storm(p: Painter): void {
  p.register(STORM)
  p.shine(true)
  p.dither(
    null,
    STORM,
    (x, y) => 0.08 + noise(x * 0.7, y * 1.4, 4, 10) * 0.45 + noise(x, y, 8, 4) * 0.1 + y / 320,
    0.7,
  )
  // rain: short slanting streaks
  const rand = rng(23)
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * 84)
    const y = 14 + Math.floor(rand() * 46)
    p.fill(p.m().line(x, y, x - 2, y + 4), STORM[3])
  }
  p.shine(false)
}

function lighthouse(p: Painter): void {
  // the lamp's halo lights the rain round the tower, so the tower stands dark against it
  p.shine(true)
  p.dither(
    p.m().ellipse(7.5, 34, 10, 14),
    [STORM[2], STORM[3], STORM[4]],
    (x, y) => 1.1 - Math.hypot((x - 7.5) / 10, (y - 34) / 14),
    0.9,
  )
  p.shine(false)
  const rock = p.m().blob(7, HORIZON + 1, 10, 4, 3, 0.25)
  p.fill(rock, STORM[0])
  p.fill(rock.facing([0, -1]), STORM[2])
  const tower = p.m().poly([3.5, HORIZON, 5, 35, 10, 35, 11.5, HORIZON])
  p.fill(tower, STORM[0])
  p.fill(tower.facing([-1, 0]), STORM[2])
  for (const y of [41, 48]) p.fill(tower.clone().and(p.m().rect(0, y, 14, 2)), STORM[1])
  p.fill(p.m().rect(3, 34, 9, 1).rect(4, 26, 7, 1).rect(5, 25, 5, 1).rect(6, 24, 3, 1), STORM[0])
  p.fill(p.m().rect(4, 27, 1, 7).rect(10, 27, 1, 7), STORM[0])
}

/** The beam: a fan of gold light through the rain from the lamp to the dragon. */
function lightbeam(p: Painter): void {
  p.shine(true)
  const lit = p.m()
  for (let y = 0; y < 100; y++) for (let x = 0; x < p.w; x++) if (beam(x, y) > 0.06) lit.add(x, y)
  p.dither(lit, [STORM[3], STORM[4], GOLD[0], GOLD[1], GOLD[2]], (x, y) => beam(x, y) * 1.1, 0.9)
  const rand = rng(41)
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * 60)
    const y = 20 + Math.floor(rand() * 50)
    if (beam(x, y) > 0.3) p.fill(p.m().line(x, y, x - 2, y + 4), GOLD[2])
  }
  p.fill(p.m().rect(5, 27, 5, 7), GOLD[1])
  p.fill(p.m().rect(6, 28, 3, 5), GOLD[2])
  p.shine(false)
}

/** A wave: its face lighter under a thick foam crest, spray torn off the top. */
function wave(p: Painter, crest: readonly number[], bottom: number, seed: number): void {
  const xs = crest.filter((_, i) => i % 2 === 0)
  const face = p.m().poly([...crest, Math.max(...xs), bottom, Math.min(...xs), bottom])
  const top = Math.min(...crest.filter((_, i) => i % 2 === 1))
  p.dither(
    face,
    [SEA[0], SEA[1], SEA[2], STORM[4]],
    (x, y) => 0.95 - (y - top) / 16 - noise(x * 2, y, seed, 3) * 0.25,
    0.6,
  )
  p.shine(true)
  p.fill(p.m().limb(crest, 1.3), FOAM[0])
  p.fill(p.m().path(crest).moved(0, -1), FOAM[1])
  const rand = rng(seed)
  for (let i = 0; i < 10; i++) {
    const k = Math.floor(rand() * (xs.length - 1)) * 2
    p.px(
      Math.round((crest[k] ?? 0) + rand() * 4),
      Math.round((crest[k + 1] ?? 0) - 2 - rand() * 4),
      FOAM[rand() < 0.5 ? 0 : 1],
    )
  }
  p.shine(false)
}

function sea(p: Painter): void {
  const water = p.m().rect(0, HORIZON, 80, 112 - HORIZON)
  p.dither(water, SEA, (x, y) => 0.55 - (y - HORIZON) / 45 + 0.2 * Math.sin(x * 0.25 + y * 1.1), 0.4)
  p.fill(p.m().rect(0, HORIZON, 80, 1), STORM[2])
  // a tiny boat on the horizon, riding the swell towards the lighthouse
  p.fill(p.m().poly([14, 57, 23, 57, 21.5, 59.5, 15.5, 59.5]).rect(18, 49, 1, 8), STORM[0])
  p.fill(p.m().poly([19, 50, 23, 56, 19, 56]), FOAM[0])
  p.fill(p.m().poly([17, 51, 17, 56, 14.5, 56]), STORM[4])
  p.px(16, 58, GOLD[2])
  // the great wave on the right curls over towards the dragon; smaller ones in front
  wave(p, [50, 70, 54, 58, 59, 50, 65, 45, 72, 42.5, 80, 42], 112, 6)
  p.shine(true)
    .fill(p.m().limb([59, 50, 55.5, 48.5, 53, 50, 52.5, 53], [1.6, 1.3, 1, 0.6]), FOAM[1])
    .shine(false)
  wave(p, [0, 72, 6, 66, 13, 64, 19, 67, 24, 74], 112, 2)
  wave(p, [18, 86, 28, 79, 40, 77, 52, 80, 62, 87], 112, 8)
}

/** A wing in its upstroke: an orange bone along the leading edge, teal membrane behind it. */
function wing(d: Painter, root: Pt, wrist: Pt, tip: Pt, back: readonly Pt[], flip: number): void {
  const m = (): Mask => d.m()
  const membrane = m().poly([root, wrist, tip, ...back])
  d.part(membrane, TEAL, { bevel: 4 })
  const [, last] = back
  if (last)
    d.fill(
      m()
        .path([wrist, P(last[0] + flip, last[1] - 1)])
        .and(membrane.shrunk(1)),
      TEAL[1],
    )
  d.part(m().limb([root, wrist, tip], [2.2, 1.6, 0.8]), ORANGE)
}

function dragonite(d: Painter): void {
  const m = (): Mask => d.m()

  // the tail swings out behind on the right
  d.part(m().limb([45, 74, 51, 81, 58, 85, 66, 84], [5, 4, 3, 1.6]), ORANGE, { bias: -1 })

  // wings raised high in the upstroke
  wing(d, P(33, 46), P(24, 32), P(17, 22), [P(19, 33), P(22, 39), P(27, 44)], -1)
  wing(d, P(47, 46), P(56, 32), P(63, 22), [P(61, 33), P(58, 39), P(53, 44)], 1)

  // legs trailing below, foreshortened, the soles turned back
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + v * s
    d.part(m().limb([x(8.5), 70, x(10.5), 77, x(11.5), 80.5], [5.5, 4.6, 3.6]), ORANGE)
    for (const dx of [-2, 0, 2]) d.stamp(['w'], Math.round(x(11.5) + dx), 83, { w: CREAM[2] })
  }

  // the body: broad and round, the cream belly with its bands
  const body = m().ellipse(40, 52, 12, 10).ellipse(40, 64, 15.5, 13.5)
  d.part(body, ORANGE, { bevel: 10 })
  const belly = m().ellipse(40, 62, 10, 14).and(body)
  d.shade(belly, CREAM, { bevel: 6 })
  for (const y of [53, 58, 63, 68, 73])
    d.fill(
      m()
        .path([30, y + 1, 35, y, 40, y - 0.5, 45, y, 50, y + 1])
        .and(belly),
      CREAM[0],
    )

  // arms flung wide, the hands open with three claws
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + v * s
    d.part(m().limb([x(10), 50, x(18.5), 50, x(26), 45], [4.2, 3.6, 3.2]), ORANGE)
    d.part(m().disc(x(28), 44, 3.2), ORANGE, { bevel: 2 })
    for (const [dx, dy] of pts([2, -3.5, 3.8, -1.2, 3.5, 1.6]))
      d.stamp(['w'], Math.round(x(28 + dx)), Math.round(44 + dy), { w: CREAM[2] })
  }

  // neck and head: antennae swept back, the little horn, a calm friendly face
  d.part(m().limb([40, 46, 40, 40], 6.5), ORANGE)
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + v * s
    d.part(m().limb([x(3.5), 27, x(7), 22.5, x(12), 20.5, x(16), 22], [1.1, 0.9, 0.8, 1.2]), ORANGE)
  }
  const head = m().ellipse(40, 32, 8.8, 7.8)
  d.part(head, ORANGE, { bevel: 6 })
  d.part(m().ellipse(40, 36.5, 6, 4.2), ORANGE, { line: 'shadow', bevel: 3 })
  d.part(m().poly([38.5, 26, 40, 21.5, 41.5, 26]), CREAM, { bevel: 1.5 })
  d.stamp(['kk', 'kk', 'wk'], 35, 30, { k: OUTLINE, w: CREAM[2] })
  d.stamp(['kk', 'kk', 'kw'], 44, 30, { k: OUTLINE, w: CREAM[2] })
  d.px(38, 36, ORANGE[0]).px(42, 36, ORANGE[0])
  d.fill(m().path([36, 39, 38, 40, 40, 40.5, 42, 40, 44, 39]), ORANGE[0])

  // the lighthouse beam lights the left side gold, the right side turns away into the storm
  const all = d.mask()
  const rim = all.facing([-1, 0])
  d.tone(rim.clone().or(rim.moved(1, 0).and(all)), 1)
  d.tone(rim, 1)
  d.tone(all.facing([1, 0]).or(all.facing([1, 0]).moved(-1, 0).and(all)), -1)
}

/** Wind and rain rushing past: a few streaks cross the dragon, curved gusts stream off its sides. */
function wind(p: Painter): void {
  p.shine(true)
  for (const [x, y] of pts([31, 58, 47, 66, 53, 50, 26, 70])) p.fill(p.m().line(x, y, x - 2, y + 4), STORM[4])
  for (const gust of [
    [14, 64, 9, 68, 5, 76],
    [66, 64, 71, 68, 75, 76],
    [20, 40, 14, 42, 9, 46],
    [13, 27, 12, 23, 13.5, 19],
    [67, 27, 68, 23, 66.5, 19],
  ])
    p.fill(p.m().path(gust).minus(p.subjectMask), FOAM[0])
  p.shine(false)
}

export const dragoran: CardDef = {
  id: 'pkm-fossil-075',
  number: 75,
  name: 'Dragoran',
  tier: 'grail',
  kind: 'pokemon',
  type: 'Farblos',
  hp: 100,
  attacks: [
    { name: 'Slam', cost: ['Farblos', 'Farblos', 'Farblos', 'Farblos'], damage: '40×' },
    { name: 'Einspringen', cost: [] },
  ],
  // the storm sky, the beam, the rain, the lamp and the foam shine; Dragoran, the sea and the rock stay matt
  foil: 'painted',
  draw(p) {
    storm(p)
    lighthouse(p)
    sea(p)
    lightbeam(p)
    const d = p.layer()
    dragonite(d)
    p.subject(p.layer().blit(d, 0, -3), OUTLINE)
    wind(p)
  },
}
