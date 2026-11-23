import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Gewitterhirsch (Ultra, Strom). Brief: a white stag whose antlers are forked lightning, on a hill in a
 * night storm, rain streaks, yellow glow. Full art, 80×112.
 *
 * Composition: the stag stands side on across the crest of a hill, body to the right, and turns its
 * head to the viewer like a stag on a crest; the two lightning antlers fan out over the top of the
 * card and light everything round them yellow. A bolt strikes the horizon behind on the left, rain
 * slants through the dark. The frame's plates cover rows 4–14 and 91–106.
 */
const SKY = colors('06081a', '0c1230', '141c42', '1e2a56', '2c3c6e', '43568c')
const HILL = colors('04050c', '0a0e1a', '121a28', '1e2a38')
const FUR = colors('3a4470', '6c7aa6', 'aab6d4', 'e2e8f4', 'ffffff')
const BOLT = colors('a07a12', 'f0c020', 'ffe668', 'fffbd8')
const GLOW = colors('4c4c44', '7a7040')
const DARK = hex('141626')
const RAIN = hex('3c4c7c')
const OUTLINE = hex('060818')

/** The stag is drawn in its own frame: scaled round the point between its hooves. */
const STAG = { ox: 50, oy: 82, scale: 1.1, dy: 6 }
const S = STAG.scale
const T = (...xy: number[]): Pt[] => xf(xy, STAG)
const at = (x: number, y: number): Pt => T(x, y)[0] ?? [x, y]

function storm(p: Painter): void {
  // heavy clouds, lit from within near the bolt on the left and round the antlers
  p.dither(
    null,
    SKY,
    (x, y) => {
      const cloud = noise(x * 0.8, y * 1.6, 3, 10) * 0.45 + noise(x, y * 2, 7, 4) * 0.12
      const flash = Math.max(0, 1 - Math.hypot(x - 10, (y - 36) * 0.7) / 22) * 0.55
      const halo = Math.max(0, 1 - Math.hypot(x - 36, (y - 28) * 1.2) / 26) * 0.6
      const horizon = Math.max(0, (y - 54) / 26) * 0.3
      return cloud + flash + halo + horizon - 0.08
    },
    0.75,
  )
  // the bolt striking the horizon behind, with a branch
  bolt(p, [11, 12, 8, 19, 12, 25, 8, 33, 11, 41, 7, 50, 10, 58, 8, 66])
  bolt(p, [8, 33, 3, 38, 4, 44, 0, 50])
}

/** A jagged bolt: a one-pixel white-hot core in a pale halo. */
function bolt(p: Painter, line: readonly number[]): void {
  const core = p.m().path(line)
  core
    .grown(1)
    .minus(core)
    .each((x, y) => {
      if ((x + y) % 2 === 0) p.set(x, y, SKY[5])
    })
  p.fill(core, BOLT[3])
}

function hill(p: Painter): void {
  // far ridge on the horizon, then the hill the stag stands on, its crest catching the antler light
  const far = p.m().poly([0, 70, 12, 66, 24, 68, 40, 64, 56, 67, 70, 63, 80, 65, 80, 112, 0, 112])
  p.fill(far, HILL[1])
  p.fill(far.facing([0, -1]), HILL[2])
  const near = p.m().poly([0, 94, 10, 91, 22, 89.5, 34, 88.5, 48, 88, 60, 88.5, 70, 90.5, 80, 93, 80, 112, 0, 112])
  // grass blades along the crest
  for (let x = 2; x < 80; x += 3) {
    const top = 88.5 + Math.abs(x - 46) * 0.12 + (x % 2)
    near.poly([x - 1, top + 2, x + (x % 4 === 0 ? -1 : 1), top - 2.5, x + 1, top + 2])
  }
  p.fill(near, HILL[0])
  const crest = near.facing([0, -1])
  p.fill(crest.clone().and(p.m().rect(16, 0, 52, 112)), GLOW[0])
  p.fill(crest.minus(p.m().rect(16, 0, 52, 112)), HILL[2])
}

/** Slanting rain: short streaks, skipping a mask. */
function rain(p: Painter, skip: Mask, count: number, seed: number, c: number, region: readonly number[]): void {
  const rand = rng(seed)
  const [rx = 0, ry = 0, rw = 80, rh = 80] = region
  for (let i = 0; i < count; i++) {
    const x = rx + Math.floor(rand() * rw)
    const y = ry + Math.floor(rand() * rh)
    const len = 3 + Math.floor(rand() * 2)
    for (let k = 0; k < len; k++) {
      const px = x - Math.floor(k / 2)
      const py = y + k
      if (!skip.has(px, py)) p.px(px, py, c)
    }
  }
}

/**
 * One antler: a chain of straight lightning strokes with sharp turns, `s` = −1 for the left one, 1 for
 * the right. Points are (outward from the middle of the face, y, radius) in the stag's frame.
 */
function antler(p: Painter, s: number): Mask {
  const m = p.m()
  const stroke = (...uyr: number[]) => {
    for (let i = 0; i + 5 < uyr.length; i += 3) {
      // the crown is pressed a little flatter so the tips stay clear of the name plate
      const [x0, y0] = at(36 + (uyr[i] ?? 0) * s, 35.5 - (35.5 - (uyr[i + 1] ?? 0)) * 0.88)
      const [x1, y1] = at(36 + (uyr[i + 3] ?? 0) * s, 35.5 - (35.5 - (uyr[i + 4] ?? 0)) * 0.88)
      m.capsule(x0, y0, x1, y1, (uyr[i + 2] ?? 1) * S, (uyr[i + 5] ?? 1) * S)
    }
  }
  // the beam zigzags up and out; a brow tine juts out low, two more tines fork off higher up
  stroke(3, 35.5, 1.5, 8, 29, 1.3, 5.5, 28, 1.2, 11, 21, 1, 9, 20, 0.9, 13.5, 15.5, 0.5)
  stroke(8, 29, 1.1, 13, 30, 0.9, 16, 26.5, 0.5)
  stroke(11, 21, 1, 16, 21.5, 0.8, 19.5, 17, 0.4)
  stroke(5.5, 28, 0.9, 4.5, 23, 0.4)
  return m
}

function stag(d: Painter): void {
  const m = (): Mask => d.m()
  const limb = (pts: readonly number[], radii: readonly number[]) =>
    m().limb(
      T(...pts),
      radii.map((r) => r * S),
    )
  const ellipse = (x: number, y: number, rx: number, ry: number, rot = 0) => {
    const [cx, cy] = at(x, y)
    return m().ellipse(cx, cy, rx * S, ry * S, rot)
  }

  // far legs, a step darker: the front leg straight, the hind leg bent at the hock
  d.part(limb([43, 63, 43.5, 70, 43, 74, 43.5, 81], [2.3, 1.4, 1.2, 1]), FUR, { bevel: 2, bias: -1 })
  d.part(limb([58, 62, 61, 71, 59.5, 81], [2.6, 1.3, 1.1]), FUR, { bevel: 2, bias: -1 })

  // body: a long barrel with the belly tucked up, the withers over the shoulders, a white flag of a tail
  const body = limb([39, 60, 50, 61, 61, 59], [6, 5.4, 5.8]).or(ellipse(44, 56.5, 5.5, 3.5))
  body.or(m().poly(T(64.5, 55, 67.5, 51.5, 68, 56)))
  d.part(body, FUR, { bevel: 5 })

  // shoulder and haunch, each a rounded mass over its leg
  d.part(ellipse(40.5, 61, 4.5, 5.5, 8), FUR, { bevel: 4, line: 'shadow' })
  d.part(ellipse(60.5, 60.5, 5.2, 5.6, -10), FUR, { bevel: 4, line: 'shadow' })

  // near legs, slender, ending in dark hooves
  d.part(limb([39.5, 65, 38.5, 71, 38.5, 74.5, 39, 81], [2.5, 1.5, 1.3, 1]), FUR, { bevel: 2, line: 'shadow' })
  d.part(limb([62, 64, 65, 71.5, 63.5, 81], [2.8, 1.4, 1.1]), FUR, { bevel: 2, line: 'shadow' })
  for (const [hx, far] of [
    [43.5, true],
    [59.5, true],
    [39, false],
    [63.5, false],
  ] as const) {
    const [x, y] = at(hx, 81)
    d.fill(m().rect(Math.round(x) - 1, Math.round(y), 3, 2), far ? HILL[1] : DARK)
  }

  // neck rising forward from the withers, slimmer under the head, a shaggy ruff at the throat
  const neck = limb([44, 58, 40.5, 51, 37, 44.5], [5.4, 4.2, 3.6])
  d.part(neck, FUR, { bevel: 3, line: 'shadow' })

  // big ears, then the long face turned to the viewer
  for (const s of [-1, 1]) d.part(ellipse(36 + s * 8.5, 37, 4.4, 2, s * -22), FUR, { bevel: 1.5 })
  d.part(m().poly(T(30, 35, 42, 35, 42.5, 38.5, 40, 44.5, 38.5, 48, 33.5, 48, 32, 44.5, 29.5, 38.5)), FUR, { bevel: 3 })

  // the face: dark eyes with a glint of the antler light, the muzzle, the forehead lit by the antlers
  const put = (grid: readonly string[], x: number, y: number) => {
    const [px, py] = at(x, y)
    d.stamp(grid, Math.round(px), Math.round(py), { k: DARK, y: BOLT[2], w: BOLT[3] })
  }
  put(['kk', 'ky'], 31, 38.5)
  put(['kk', 'yk'], 39, 38.5)
  put(['kk', 'kk'], 35, 46)

  // the crown lights the top of the head, the ears and the back of the neck
  const [lx, ly] = at(36, 30)
  const lit = d.mask().facing([0, -1]).and(m().ellipse(lx, ly + 6, 16, 11))
  d.fill(lit, BOLT[3])
}

export const gewitterhirsch: CardDef = {
  id: 'emp1-017',
  number: 17,
  name: 'Gewitterhirsch',
  tier: 'ultra',
  kind: 'monster',
  element: 'Strom',
  foil: 'art',
  draw(p) {
    storm(p)
    hill(p)
    rain(p, p.m(), 46, 4, RAIN, [4, 14, 80, 66])

    const d = p.layer()
    stag(d)
    p.subject(d, OUTLINE)

    // the antlers: lightning strokes out of the skull, yellow with a white-hot core, in a dithered glow
    const antlers = antler(p, -1).or(antler(p, 1))
    antlers
      .grown(2)
      .minus(antlers)
      .minus(p.subjectMask)
      .each((x, y) => {
        if ((x + y) % 2 === 0) p.set(x, y, GLOW[1])
      })
    p.fill(antlers, BOLT[1])
    p.fill(antlers.clone().minus(antlers.facing([1, 0, 0, 1])), BOLT[2])
    p.fill(antlers.shrunk(1), BOLT[3])
    rain(p, p.subjectMask.clone().or(antlers.grown(3)), 12, 11, FUR[1], [8, 20, 70, 60])
  },
}
