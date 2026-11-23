import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Abgrundwal (Ultra, Flut). Brief: a huge deep-sea whale with glowing spots and a lantern lure, rising
 * from black depths into a shaft of light, small fish around it. Full art, 80×112.
 *
 * Composition: the whale fills the card on a long curve. Its tail sinks into the black at the lower
 * left, where only its glowing spots still trace the flukes; its head breaks into the light falling
 * from the upper right, the lure dangling in front of its mouth and little fish circling the glow. A
 * far shoal and two jellyfish give the scale. The frame's plates cover rows 4–14 and 91–106.
 */
const WATER = colors('010208', '030a18', '07172c', '0d2a46', '164262', '246282', '3a88a2')
const SKIN = colors('08111f', '122340', '1d375c', '2c5079', '46709a')
const BELLY = colors('3a5874', '6a8aa2', 'a6bece')
const GLOW = colors('1aa8b8', '74f2e6', 'e2fffa')
const LURE = colors('d0802a', 'ffd25a', 'fff8d8')
const OUTLINE = hex('01040c')

function water(p: Painter): void {
  // black at the bottom, a fan of light falling from the surface over the upper right
  p.dither(
    null,
    WATER,
    (x, y) => {
      const depth = 1 - Math.min(1, y / 104)
      const angle = Math.atan2(x - 70, y + 40)
      const ray = Math.pow(Math.max(0, Math.cos(angle * 11 + 0.6)), 3) * 0.3
      const shaft = Math.max(0, 1 - Math.hypot((x - 64) * 0.7, y - 12) / 64)
      return Math.pow(depth, 1.6) * 0.55 + shaft * 0.5 + ray * shaft + (noise(x, y, 2, 6) - 0.5) * 0.06
    },
    0.8,
  )
  // marine snow drifting in the light
  const rand = rng(17)
  for (let i = 0; i < 26; i++) {
    const x = 4 + Math.floor(rand() * 72)
    const y = 14 + Math.floor(rand() * 60)
    p.px(x, y, y < 40 ? WATER[6] : WATER[5])
  }
}

/** A tiny glowing jellyfish drifting in the deep: a bell and three trailing threads. */
function jelly(p: Painter, x: number, y: number): void {
  p.stamp(['..ggg..', '.gwwwg.', 'gwwwwwg', 'ggggggg', '.g.g.g.', 'g..g..g', '.g.g.g.', '.g..g..', '....g..'], x, y, {
    g: WATER[5],
    w: GLOW[0],
  })
}

/** A little fish, 5×3, looking left or right. */
function fish(p: Painter, x: number, y: number, dir: number, body: number, light: number): void {
  const grid = dir > 0 ? ['.bbl.', 'bbbbb', '.bb..'] : ['.lbb.', 'bbbbb', '..bb.']
  const tail = dir > 0 ? ['b.', '.b', 'b.'] : ['.b', 'b.', '.b']
  p.stamp(grid, x, y, { b: body, l: light })
  p.stamp(tail, dir > 0 ? x - 2 : x + 5, y, { b: body })
}

/** Spine of the whale from the snout to the tail stock, and its half-width at every point. */
const SPINE = [66, 30, 57, 31.5, 48, 37.5, 40.5, 46, 34, 55.5, 27.5, 64.5, 21, 72, 14.5, 78, 9, 81.5]
const RADII = [7, 11.5, 12.5, 12, 10.5, 8.5, 6.5, 4.2, 2.4]
/** Fluke outline at the end of the tail stock. */
const FLUKES = [10, 81, 6, 74, 2.5, 70.5, 1, 72.5, 2.5, 78, 4, 82, 1.5, 87, 2, 90, 6, 88.5, 11, 84]

function whale(d: Painter): void {
  const m = (): Mask => d.m()

  // flukes at the end of the tail, spread across it
  d.part(m().poly(FLUKES), SKIN, { bevel: 2, bias: -1 })

  // the body: a vast head with a jutting lower jaw, the back arching down into the dark
  const body = m().limb(SPINE, RADII)
  body.poly([60, 33, 70, 31.5, 72.5, 33.5, 70, 37.5, 63, 41])
  d.part(body, SKIN, { bevel: 9 })

  // pale grooved throat under the jaw and along the belly
  const throat = m().limb([70, 35.5, 64, 39.5, 57, 44, 50, 49], [2.4, 4, 4.4, 2.8]).and(body)
  d.shade(throat, BELLY, { bevel: 3, bias: -1 })
  for (const k of [0, 1, 2]) {
    const groove = m().path(spline([68 - k, 37 + k * 1.2, 62 - k, 41 + k * 1.3, 54 - k, 46.5 + k * 1.3, 49 - k, 50 + k], 3))
    d.fill(groove.and(throat.shrunk(1)), BELLY[0])
  }

  // the arched mouth line, rising from the snout and falling to the corner
  d.fill(m().path(spline([71, 33.5, 66, 31.5, 60, 31.5, 55.5, 35], 3)).and(body), SKIN[0])

  // the near flipper, swept back along the flank
  const flipper = m().poly([
    49, 44, 54, 46.5, 57, 51, 58, 57, 57, 63, 55.5, 68, 53, 72.5, 51, 70, 51.5, 64, 50, 57, 47.5, 50.5,
  ])
  d.part(flipper, SKIN, { bevel: 3 })
  d.fill(flipper.facing([1, 0]).and(m().rect(54, 52, 6, 22)), BELLY[0])

  // the lure on its stalk, curling forward from the forehead
  const stalk = spline([55, 21.5, 59, 18, 64.5, 17.5, 69, 20, 71, 23.5], 4)
  d.part(m().limb(stalk, [0.9, 0.8, 0.75, 0.7, 0.6]), SKIN, { bevel: 1, line: 'none' })

  // the deep swallows the whale towards its tail: a dithered fade to black
  const whole = d.mask()
  whole.each((x, y) => {
    const t = (y - 1.25 * (x - 4)) / 34
    const b = (((x + 2 * y) % 4) + 0.5) / 4
    if (t > 1 + b * 0.6) d.set(x, y, SKIN[0])
    else if (t > 0.3 + b * 0.5) {
      const i = (SKIN as readonly number[]).indexOf(d.get(x, y))
      if (i > 0) d.set(x, y, SKIN[i - 1] ?? SKIN[0])
    }
  })

  d.stamp(['kk', 'kg'], 55, 30, { k: SKIN[0], g: GLOW[1] })
}

/** Rows of glowing spots along the flank: a bright core and a dim tail. */
function spots(p: Painter): void {
  const rows = [
    [58, 24, 51, 26, 44, 30.5, 38, 36.5, 32, 43, 27, 50, 22, 57, 17, 63.5, 12, 70, 8, 75.5],
    [42, 43, 36, 49.5, 31, 56.5, 25.5, 63.5, 20.5, 70, 15, 76],
    [5, 73, 2, 79, 3, 86],
  ]
  for (const row of rows) {
    for (let i = 0; i + 1 < row.length; i += 2) {
      const x = Math.round(row[i] ?? 0)
      const y = Math.round(row[i + 1] ?? 0)
      if (y > 66) p.px(x, y, GLOW[1]).px(x + 1, y, GLOW[0])
      else p.px(x, y, y > 54 ? GLOW[1] : GLOW[2]).px(x + 1, y, GLOW[1]).px(x, y + 1, GLOW[0])
    }
  }
}

function lure(p: Painter): void {
  const [x, y] = [71.5, 26.5]
  const bulb = p.m().disc(x, y, 2.6)
  bulb
    .grown(3)
    .minus(bulb)
    .minus(p.subjectMask)
    .each((bx, by) => {
      if ((bx + by) % 2 === 0) p.set(bx, by, WATER[6])
    })
  p.fill(bulb.grown(1).minus(bulb), LURE[0])
  p.fill(bulb, LURE[1])
  p.fill(p.m().disc(x - 0.5, y - 0.5, 1.2), LURE[2])
}

export const abgrundwal: CardDef = {
  id: 'emp1-018',
  number: 18,
  name: 'Abgrundwal',
  tier: 'ultra',
  kind: 'monster',
  element: 'Flut',
  foil: 'art',
  draw(p) {
    water(p)
    // a shoal far off in the light, dark against it
    for (const [x, y, dir] of [
      [14, 22, 1],
      [22, 18, 1],
      [9, 29, 1],
      [27, 25, 1],
      [18, 32, 1],
    ] as const)
      fish(p, x, y, dir, WATER[2], WATER[3])

    jelly(p, 60, 74)
    jelly(p, 69, 61)
    const d = p.layer()
    whale(d)
    p.subject(d, OUTLINE)
    spots(p)
    lure(p)

    // little fish drawn to the lure, silver in its light
    for (const [x, y, dir] of [
      [64, 41, 1],
      [71, 36, -1],
      [74, 46, -1],
      [61, 15, 1],
    ] as const)
      fish(p, x, y, dir, BELLY[1], BELLY[2])
  },
}
