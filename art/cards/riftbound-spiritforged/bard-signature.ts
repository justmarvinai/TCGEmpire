import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, noise, rng, spline, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Bard, Mercurial (Signature), Ultra. Our own cosmic wanderer: a broad figure in a cream cloak with
 * gold trim, a deep pointed hood with nothing inside but a starry night and two glowing eyes. He
 * floats cross-legged above a lantern festival and rings a golden hand bell; a looping path of stars
 * trails behind him, carrying chimes and three tiny round spirits. Full art, 80×112.
 *
 * Composition: he sits a little left of the middle, the hood's tip swept back to the upper left, the
 * bell raised to the upper right. The star path rises from the bell, curls over the right side, runs
 * under him and climbs the left edge. Strings of lanterns glow far below. The frame's plates cover
 * rows 0–14 and 90–112.
 */
const NIGHT = colors('0a0820', '161236', '24204e', '36306a')
const VOID = colors('2a1e5e', '5a44a8')
const CREAM = colors('7a6a64', 'bcaa96', 'e8dcc2', 'fff8ea')
const GOLD = colors('7a4a12', 'c08428', 'f0c050', 'fff0a8')
const PINK = colors('b03a82', 'ff86c4', 'ffd4ee')
const LANTERN = colors('a8282c', 'f07a30')
const OUTLINE = NIGHT[0]

/** The path of stars: from the bell down the right side, round a loop, under him and up the left edge. */
const TRAIL: readonly Pt[] = spline(
  [69, 29.5, 73.5, 35.5, 74.5, 45, 71, 52.5, 64.5, 55.5, 60, 51, 62.5, 46, 68, 47.5, 70, 54, 67, 62, 58, 70, 45, 76, 31, 76.5, 19, 71, 11.5, 62, 9, 50, 11, 39, 15.5, 32, 21.5, 29],
  10,
)

function sky(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const halo = Math.max(0, 1 - Math.hypot(x - 40, (y - 42) * 0.85) / 40)
      return 0.05 + halo * 0.75 + noise(x, y, 5, 8) * 0.12
    },
    0.7,
  )
  // the festival's warm glow rising from below
  p.dither(p.m().rect(0, 62, 80, 50), [NIGHT[2], NIGHT[3], PINK[0]], (_x, y) => (y - 62) / 22, 0.5)
  stars(p, rng(7), 22, [CREAM[3], GOLD[3], PINK[2]], { x: 2, y: 2, w: 76, h: 60 })
  p.shine(false)
}

/** One paper lantern: a dark cap, a red body with a glowing core. */
function lantern(p: Painter, x: number, y: number, big: boolean): void {
  if (big) p.stamp(['.k.', 'rgr', 'ryr', 'rgr', '.k.'], x - 1, y, { k: NIGHT[0], r: LANTERN[0], g: LANTERN[1], y: GOLD[3] })
  else p.stamp(['r', 'g'], x, y, { r: LANTERN[0], g: GOLD[2] })
}

/** The festival far below: roofs, a pagoda, sagging strings of lanterns, sky lanterns rising. */
function festival(p: Painter): void {
  const roofs = p.m().rect(0, 86, 80, 26)
  for (const [x0, top, w] of [
    [-4, 80, 22],
    [16, 84, 20],
    [34, 79, 18],
    [50, 83, 18],
    [66, 78, 18],
  ] as const) {
    roofs.poly([x0, top + 3, x0 + 3, top, x0 + w - 3, top, x0 + w, top + 3, x0 + w - 2, top + 4, x0 + 2, top + 4])
    roofs.rect(x0 + 2, top + 4, w - 4, 30)
  }
  // a pagoda on the left
  for (let k = 0; k < 4; k++) {
    const y = 78 - k * 6
    const w = 10 - k * 2
    roofs.poly([8 - w, y, 8 - w * 0.5, y - 2.5, 8 + w * 0.5, y - 2.5, 8 + w, y, 8, y + 1.5]).rect(8 - w * 0.4, y, w * 0.8, 5)
  }
  p.fill(roofs, NIGHT[1])
  p.fill(roofs.facing([0, -1]), NIGHT[3])
  p.shine(true)
  for (const [y0, sag, step, big] of [
    [69, 6, 7, false],
    [77, 5, 6, true],
  ] as const) {
    const line = p.m()
    for (let x = 0; x < 80; x++) line.add(x, Math.round(y0 + sag * Math.sin((x / 80) * Math.PI)))
    p.fill(line.minus(roofs), NIGHT[3])
    for (let x = 3; x < 80; x += step) lantern(p, x, Math.round(y0 + sag * Math.sin((x / 80) * Math.PI)) + 1, big)
  }
  for (const [x, y] of [
    [6, 58],
    [74, 62],
    [62, 76],
    [20, 64],
  ] as const) {
    lantern(p, x, y, true)
  }
  p.shine(false)
}

/** The star path behind him: dots of starlight with a small four-point star every few steps. */
function trail(p: Painter): void {
  p.shine(true)
  const path = p.m().path(TRAIL)
  let i = 0
  path.each((x, y) => {
    p.px(x, y, bayer(x, y) < 0.5 ? ((x + y) % 3 === 0 ? PINK[1] : GOLD[2]) : PINK[0])
  })
  TRAIL.forEach(([x, y], k) => {
    if (k % 14 !== 7) return
    i++
    const c = i % 2 === 0 ? CREAM[3] : GOLD[3]
    p.px(x, y, c).px(x - 1, y, c).px(x + 1, y, c).px(x, y - 1, c).px(x, y + 1, c)
  })
  p.shine(false)
}

/** A tiny round spirit: a cream puff with dot eyes, a blush and a gold flame on top. */
function spirit(p: Painter, x: number, y: number, flip: boolean): void {
  p.shine(true)
  p.stamp(
    ['...f..', '..ff..', '.cccc.', 'cchcc.', 'ckcckc', 'cpccpc', '.cccc.'],
    x - 3,
    y - 4,
    { f: GOLD[2], c: CREAM[2], h: CREAM[3], k: NIGHT[0], p: PINK[1] },
    flip,
  )
  p.px(x - 3 + (flip ? 5 : 0), y + 2, CREAM[1])
  p.shine(false)
}

/** A little gold chime hanging from the star path. */
function chime(p: Painter, x: number, y: number): void {
  p.shine(true)
  p.stamp(['.l.', '.g.', 'ggg', 'gdg', '.y.'], x - 1, y, { l: CREAM[3], g: GOLD[2], d: GOLD[1], y: GOLD[3] })
  p.shine(false)
}

/** A point `t` (0 at the handle, 1 at the mouth) along the bell and `off` pixels across it. */
const BELL_A: Pt = [61.5, 18]
const BELL_B: Pt = [68.5, 26.5]
function onBell(t: number, off: number): Pt {
  const dx = BELL_B[0] - BELL_A[0]
  const dy = BELL_B[1] - BELL_A[1]
  const len = Math.hypot(dx, dy)
  return [BELL_A[0] + dx * t - (dy / len) * off, BELL_A[1] + dy * t + (dx / len) * off]
}

function wanderer(d: Painter): void {
  const m = (): Mask => d.m()

  // the front of the robe hanging below the lap, a gold hem
  const panel = m().poly([32, 64, 48, 64, 47.5, 70.5, 44, 73.5, 40, 72, 36, 73.5, 32.5, 70.5])
  d.part(panel, CREAM, { bias: -1, bevel: 3 })
  d.fill(panel.clone().minus(panel.moved(0, -1)), GOLD[2])

  // the cloak draped over the crossed legs: a wide lap, the knees at both ends, folds meeting in a V
  const lap = m().poly([21.5, 62.5, 25, 58.5, 33, 57, 47, 57, 55, 58.5, 58.5, 62.5, 57, 66, 48, 67.5, 40, 68, 32, 67.5, 23, 66])
  d.part(lap, CREAM, { bevel: 4 })
  d.fill(m().path([30, 60, 40, 66, 50, 60]).path([25.5, 63, 33, 65]).path([54.5, 63, 47, 65]).and(lap.shrunk(1)), CREAM[1])

  // the body under the cloak, a gold seam down the front
  const robe = m().poly([30, 42, 50, 42, 51.5, 55, 28.5, 55])
  d.part(robe, CREAM, { bevel: 5 })
  d.fill(m().path([34.5, 47, 32.5, 55]).path([45.5, 47, 47.5, 55]).and(robe.shrunk(1)), CREAM[1])
  d.fill(m().path([40, 47, 40, 55]).and(robe), GOLD[1])

  // arm resting on the knee
  d.part(m().limb([30, 39, 25.5, 47, 25, 55], [3.4, 3.1, 2.8]), CREAM)
  d.part(m().limb([25, 53, 25, 54.5], 2.8), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().ellipse(25, 57.5, 2.4, 2.2), CREAM.slice(0, 3), { bevel: 1.5 })

  // the mantle over the broad shoulders with its gold hem and a round clasp
  const mantle = m().poly([24.5, 43, 26, 37.5, 31, 33.5, 49, 33.5, 54, 37.5, 55.5, 43, 48, 45.5, 40, 46.5, 32, 45.5])
  d.part(mantle, CREAM, { bevel: 4 })
  d.fill(mantle.clone().minus(mantle.moved(0, -2)), GOLD[2])
  d.fill(mantle.clone().minus(mantle.moved(0, -1)), GOLD[1])
  d.part(m().disc(40, 44.5, 2.6), GOLD, { bevel: 2 })
  d.px(40, 44, PINK[1])

  // arm raised high, ringing the bell
  d.part(m().limb([50, 38, 56.5, 34, 60.5, 25.5], [3.4, 3.1, 2.8]), CREAM)
  d.part(m().limb([60, 27, 61, 24], 2.9), GOLD.slice(0, 3), { bevel: 1 })
  d.part(m().ellipse(61.5, 21.5, 2.4, 2.2), CREAM.slice(0, 3), { bevel: 1.5 })

  // the hand bell, swinging out to the right, its clapper showing at the mouth
  d.shine(true)
  const bell = m().poly([...onBell(0.15, -1.6), ...onBell(0.5, -2.6), ...onBell(0.85, -3.6), ...onBell(1, -5), ...onBell(1, 5), ...onBell(0.85, 3.6), ...onBell(0.5, 2.6), ...onBell(0.15, 1.6)])
  d.part(bell, GOLD, { bevel: 2.5 })
  d.fill(m().path([...onBell(0.9, -4), ...onBell(0.9, 4)]).and(bell), GOLD[1])
  d.part(m().disc(...onBell(-0.08, 0), 1.6), GOLD, { bevel: 1 })
  d.part(m().disc(...onBell(1.12, -1), 1.4), GOLD.slice(0, 2), { bevel: 1 })
  d.shine(false)

  // the deep hood, its long tip swept back to the upper left, gold trim round the opening
  const hood = m()
    .ellipse(40, 25, 9.6, 9.6)
    .poly([33, 19, 28, 13.5, 20.5, 10.5, 23.5, 16, 27, 22.5, 31.5, 28])
    .poly([30, 30, 50, 30, 52, 36.5, 28, 36.5])
  d.part(hood, CREAM, { bevel: 5 })
  d.fill(m().path([22.5, 12, 27.5, 16, 31.5, 21]).and(hood.shrunk(1)), CREAM[1])
  d.fill(m().path([33, 33, 36, 28]).path([47.5, 33, 46.5, 28.5]).and(hood.shrunk(1)), CREAM[1])
  const opening = m().ellipse(42, 28, 5, 5.6).poly([37, 28, 38, 34, 42, 35.5, 46, 34, 47, 28])
  d.fill(opening.grown(1).and(hood), GOLD[2])
  d.fill(opening.grown(1).and(hood).facing([1, 0, 0, 1]).minus(opening), GOLD[1])
  d.part(m().ellipse(42, 19, 1.6, 2), GOLD, { bevel: 1.5 })

  // inside the hood only a starry night and two glowing eyes
  d.shine(true)
  d.dither(opening, [NIGHT[0], VOID[0], VOID[1]], (x, y) => 0.1 + (y - 25) / 16 + noise(x, y, 2, 3) * 0.2, 0.8)
  d.stamp(['gg..gg', '.y...y'], 39, 27, { g: GOLD[3], y: GOLD[2] })
  d.px(41, 32, CREAM[3]).px(45, 31, PINK[2]).px(38, 33, PINK[1])
  d.shine(false)

  // the lanterns below light the undersides warm
  const body = d.mask()
  body
    .facing([0, 1])
    .minus(bell)
    .each((x, y) => {
      if (CREAM.includes(d.get(x, y))) d.set(x, y, GOLD[1])
    })
}

/** Rings of sound round the bell and pink sparkles. */
function ringing(p: Painter): void {
  p.shine(true)
  const [cx, cy] = onBell(1.05, 0)
  for (const r of [5, 8]) {
    for (let a = -40; a <= 80; a += 6) {
      const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * r)
      const y = Math.round(cy + Math.sin((a * Math.PI) / 180) * r)
      if (!p.subjectMask.grown(1).has(x, y)) p.px(x, y, r === 5 ? PINK[1] : PINK[0])
    }
  }
  for (const [x, y] of [
    [18, 22],
    [56, 16],
    [76, 36],
    [30, 46],
    [61, 50],
    [16, 48],
  ] as const) {
    if (p.subjectMask.grown(1).has(x, y)) continue
    p.px(x, y, PINK[2]).px(x - 1, y, PINK[1]).px(x + 1, y, PINK[1]).px(x, y - 1, PINK[1]).px(x, y + 1, PINK[1])
  }
  p.shine(false)
}

export const bardSignature: CardDef = {
  id: 'rb-sfd-082',
  number: 82,
  name: 'Bard, Mercurial (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Mind',
  // the sky, the star path, the spirits and chimes, the lanterns, the bell and the hood's night
  // shine; the cloak stays matt
  foil: 'painted',
  draw(p) {
    sky(p)
    festival(p)
    trail(p)
    const d = p.layer()
    wanderer(d)
    p.subject(d, OUTLINE)
    for (const [x, y, flip] of [
      [74, 42, false],
      [30, 77, true],
      [10, 52, true],
    ] as const) {
      spirit(p, x, y, flip)
    }
    for (const [x, y] of [
      [64, 46],
      [56, 71],
      [18, 72],
      [14, 34],
    ] as const) {
      chime(p, x, y)
    }
    ringing(p)
  },
}
