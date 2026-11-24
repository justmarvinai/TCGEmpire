import type { Mask, Painter } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Deceiver (Signature), Ultra. Our own mirror sorceress: a gold half-mask, a slim diadem with two
 * curled points, long black hair, a violet gown with gold trim and a fan collar, ruby jewels and a
 * tall gold staff crowned by a ruby in a crescent. She steps out of a tall gilded mirror with a
 * knowing smile, her fingertips still rippling the glass, while three pale copies of her bow inside
 * the reflection and violet smoke curls along the floor. Full art, 80×112.
 *
 * Composition: the arched mirror stands right of the middle; she steps out of its left half towards
 * the viewer, the staff on the left. The copies recede into the right half of the glass. The
 * frame's plates cover rows 0–14 and 90–112.
 */
const ROOM = colors('08040e', '140a1e', '22122e')
const VIOLET = colors('2a0e3e', '461868', '6a2a94', '9a4ac0', 'c89ae8')
const GOLD = colors('5a3a0c', '9a6a1a', 'd8a832', 'fce07a')
const RUBY = colors('5a0818', 'a01830', 'f04a5a')
const SKIN = colors('7a4a5a', 'c8908e', 'f0c8b8')
const HAIR = colors('0c0810', '1e1428', '3a2848')
const GLASS = colors('1a1438', '2e2660', '4a4290')
const OUTLINE = hex('06030a')

/** The glass of the mirror: an arch. */
function glassShape(p: Painter): Mask {
  return p.m().rect(27, 30, 42, 62).ellipse(48, 30, 21, 13)
}

function room(p: Painter, glass: Mask): void {
  // dark violet walls with a faint diamond pattern
  p.dither(null, ROOM, (x, y) => 0.25 + noise(x, y, 3, 10) * 0.35 + (((x + y) % 8 === 0 || (x - y + 112) % 8 === 0) ? 0.25 : 0), 0.5)
  const floor = p.m().rect(0, 84, 80, 28)
  p.fill(floor, ROOM[0])
  p.fill(p.m().rect(0, 84, 80, 1), ROOM[2])

  // the gilded frame: a heavy arch with knobs and a crest on top
  const frame = glass.grown(4).minus(glass)
  p.register(GOLD)
  p.shade(frame, GOLD, { bevel: 2 })
  p.fill(glass.outerEdge(), GOLD[0])
  for (const [x, y] of [
    [23, 46],
    [73, 46],
    [23, 70],
    [73, 70],
  ] as const) {
    p.shade(p.m().disc(x, y, 2.4), GOLD, { bevel: 1.5 })
  }
  p.shade(p.m().poly([44, 17, 48, 13, 52, 17, 48, 20]), GOLD, { bevel: 1.5 })
  p.fill(p.m().disc(48, 16.5, 1.2), RUBY[1])

  // inside the glass: a cooler, deeper room, lit from where she came through
  p.shine(true)
  p.dither(glass, [ROOM[1], GLASS[0], GLASS[1], GLASS[2]], (x, y) => 0.2 + Math.max(0, 1 - Math.hypot(x - 42, y - 52) / 30) * 0.75 + noise(x, y, 6, 5) * 0.15, 0.7)
  // ripples spreading from where she stepped through the glass
  for (const r of [4, 8, 12.5, 17]) {
    p.m()
      .ellipse(37, 58, r, r * 1.35)
      .minus(p.m().ellipse(37, 58, r - 1, r * 1.35 - 1))
      .and(glass)
      .each((x, y) => {
        if (bayer(x, y) < 0.7) p.set(x, y, VIOLET[4])
      })
  }
  p.shine(false)
}

/**
 * A pale copy of her curtsying inside the reflection, facing left: a bell of a skirt, the upper body
 * bowed forward, the head low. `s` is its scale, `foot` the floor line.
 */
function copy(p: Painter, x: number, foot: number, s: number, glass: Mask): void {
  const m = (): Mask => p.m()
  const at = (dx: number, dy: number): number[] => [x + dx * s, foot - dy * s]
  const body = m()
    .poly([...at(-8.5, 0), ...at(8.5, 0), ...at(5, 5), ...at(3, 10), ...at(2.4, 13.5), ...at(-2.4, 13.5), ...at(-3, 10), ...at(-5, 5)])
    .limb([...at(0, 13), ...at(-2.5, 17.5), ...at(-4.5, 19.5)], [2.6 * s, 2.4 * s, 2 * s])
    .ellipse(...(at(-6.5, 19) as [number, number]), 2.5 * s, 2.5 * s)
    .and(glass)
  // solid ghost violet, lit on its rim, the hem fading into the glass
  p.shine(true)
  p.fill(body, VIOLET[2])
  body.each((px, py) => {
    if (py > foot - 4 * s && bayer(px, py) < 0.5) p.set(px, py, GLASS[2])
  })
  p.fill(body.facing([0, -1, -1, 0]), VIOLET[4])
  const [gx, gy] = at(-7.5, 19)
  p.px(Math.round(gx ?? 0), Math.round(gy ?? 0), GOLD[3])
  p.shine(false)
}

function sorceress(d: Painter): void {
  const m = (): Mask => d.m()

  // the fan collar rising behind her head, edged in gold
  const collar = m().poly([21, 35, 18, 23, 23.5, 26, 27, 19, 31, 24, 35, 19, 38.5, 26, 43, 23, 40, 35])
  d.part(collar, VIOLET.slice(1), { bevel: 2 })
  d.fill(collar.facing([0, -1, -1, 0, 1, 0]), GOLD[2])

  // long black hair falling behind the shoulders
  d.part(m().poly([23.5, 26, 37.5, 26, 39.5, 41, 34, 45, 27, 45, 21.5, 41]), HAIR, { bevel: 3 })

  // the far arm trailing back into the glass
  d.part(m().limb([36.5, 40, 41, 46, 44, 51], [2.2, 1.9, 1.6]), VIOLET.slice(1), { bias: -1 })
  d.part(m().limb([42.5, 49, 45, 52.5], 1.3), SKIN, { bevel: 1 })

  // the skirt: flaring folds, a dark underskirt in the split, gold along the hem
  const skirt = m().poly([25.5, 52, 37, 52, 41, 64, 46, 87.5, 15, 87.5, 20, 66])
  d.part(skirt, VIOLET.slice(0, 4), { bevel: 6 })
  for (const fold of [
    [27, 56, 23, 71, 20, 86],
    [36, 57, 40, 72, 42, 86],
  ]) {
    d.fill(m().path(fold).and(skirt.shrunk(1)), VIOLET[3])
  }
  const split = m().poly([30, 58, 33, 58, 36, 87.5, 26, 87.5])
  d.part(split, HAIR, { bevel: 2, line: 'none' })
  d.fill(m().path([15.5, 87, 45.5, 87]).and(skirt), GOLD[2])
  d.fill(m().path([30, 58, 26.5, 87]).path([33, 58, 35.5, 87]).and(skirt), GOLD[1])
  // the front foot stepping out over the frame, a pointed gold-tipped shoe
  d.part(m().poly([26, 85, 31, 84.5, 32, 88.5, 22.5, 89, 23, 87]), HAIR, { bevel: 1.5 })
  d.fill(m().rect(22.5, 88, 2, 1), GOLD[2])

  // the bodice with a gold V at the neck, a gold belt with a ruby
  const bodice = m().poly([25, 36, 37.5, 36, 38.5, 44, 36.5, 53, 26, 53, 24, 44])
  d.part(bodice, VIOLET.slice(1), { bevel: 4 })
  d.fill(m().path([26.5, 36.5, 31, 44, 35.5, 36.5]), GOLD[2])
  d.fill(m().poly([27.5, 36.5, 34.5, 36.5, 31, 42.5]), SKIN[1])
  d.part(m().rect(25.5, 51, 11.5, 3), GOLD, { bevel: 1 })
  d.part(m().disc(31, 52.5, 1.6), RUBY, { bevel: 1 })

  // the near arm down to the staff, a gold cuff at the wrist
  d.part(m().limb([25, 39, 21, 46, 18.5, 52], [2.4, 2.1, 1.8]), VIOLET.slice(1))
  d.part(m().rect(17, 50.5, 4, 2), GOLD, { bevel: 1 })

  // the staff: a gold rod, a crescent at the top cradling a ruby
  d.part(m().limb([18, 24, 18.5, 56, 19, 87.5], [1.1, 1.1, 1]), GOLD, { bevel: 1 })
  const crescent = m().disc(18, 20.5, 5).minus(m().disc(18, 17.5, 4.2))
  d.part(crescent, GOLD, { bevel: 1.5 })
  d.part(m().disc(18, 19.5, 2.4), RUBY, { bevel: 1.5 })
  d.px(17, 18, RUBY[2])
  d.part(m().ellipse(19, 53.5, 2, 2.2), SKIN, { bevel: 1.5 })

  // neck, a ruby choker, the face turned to the viewer
  d.part(m().rect(29, 32.5, 5, 4), SKIN, { bias: -1, bevel: 2 })
  d.fill(m().rect(29, 35, 5, 1), RUBY[1])
  const face = m().ellipse(31.5, 28, 5.2, 5.8).poly([27, 29, 28.5, 33.5, 31.5, 35, 34.5, 33.5, 36, 29])
  d.part(face, SKIN, { bevel: 3, bias: 1 })
  // hair framing the face, parted in the middle
  d.part(m().poly([26, 28, 26.5, 22, 31.5, 20.5, 36.5, 22, 37, 28, 35.5, 24.5, 31.5, 23.5, 27.5, 24.5]), HAIR, { bevel: 2 })
  // a narrow gold half-mask across the eyes, flaring to points; a knowing smile
  const mask = m().poly([25.5, 26, 28.5, 26.4, 31.5, 27.2, 34.5, 26.4, 37.5, 26, 36, 28.8, 32.5, 29, 31.5, 29.6, 30.5, 29, 27, 28.8])
  d.part(mask, GOLD, { bevel: 1.5 })
  d.stamp(['kk.....kk', '.........', '.........', '.........', '..r...r..', '...rrr...'], 27.5, 27, { k: OUTLINE, r: RUBY[1] })
  // the diadem: a slim band with two curled points
  d.fill(m().path([27, 23, 36, 23]), GOLD[2])
  d.part(m().limb([27.5, 23, 25.5, 19.5, 27, 16.5], [1, 0.8, 0.6]).limb([35.5, 23, 37.5, 19.5, 36, 16.5], [1, 0.8, 0.6]), GOLD, { bevel: 1 })
  d.px(31, 22, RUBY[2])

  // the light of the mirror rims her right-hand side
  d.tone(d.mask().facing([1, 0]), 1)
}

/** Violet smoke curling along the floor in front of the mirror. */
function smoke(p: Painter): void {
  const cloud = p.m()
  for (const [x, y, rx, ry, seed] of [
    [8, 85, 10, 3.5, 1],
    [26, 88, 12, 3, 2],
    [48, 86, 11, 3.5, 3],
    [70, 87, 11, 3, 4],
    [60, 82, 6, 2.2, 5],
    [14, 80, 5, 2, 6],
  ] as const) {
    cloud.blob(x, y, rx, ry, seed, 0.35)
  }
  p.shine(true)
  p.dither(cloud, [VIOLET[0], VIOLET[1], VIOLET[2], GLASS[2]], (x, y) => 0.3 + noise(x, y, 7, 3) * 0.6 - (y - 80) / 40, 0.7)
  p.shine(false)
}

export const leblancSignature: CardDef = {
  id: 'rb-unl-084',
  number: 84,
  name: 'LeBlanc, Deceiver (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Mind',
  print: { domain2: 'Order' },
  // the glass, its ripples, the copies and the smoke shine; the sorceress, the frame and the room stay matt
  foil: 'painted',
  draw(p) {
    const glass = glassShape(p)
    room(p, glass)
    copy(p, 59.5, 86, 1.05, glass)
    copy(p, 53, 61, 0.72, glass)
    copy(p, 63, 47, 0.5, glass)
    const d = p.layer()
    sorceress(d)
    p.subject(d, OUTLINE)
    smoke(p)
  },
}
