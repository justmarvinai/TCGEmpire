import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Bürokrator (Ultra, Beton): a grey dragon in shirt, tie and sleeve garters with a giant rubber stamp in
 * each claw, behind his desk between towers of files, under the cold light of a fluorescent tube.
 * Full art, 80×112.
 *
 * Composition: the dragon looms over his desk, both stamps just slammed down on the forms, and glares
 * sideways at the viewer (the applicant) over his reading glasses, snorting; loose sheets fly up from the
 * blow. Towers of files lean on both sides; the tube hangs at the top left, so the house light is the
 * lamp, and it throws his shadow on the files behind him. The name plate covers rows 4–14, the bottom
 * plate rows 91–106.
 */
const OUTLINE = hex('0c1012')
const WALL = colors('0f1819', '172326', '203034', '2b4044', '3d585a', '557572')
const TUBE = colors('a6ecd2', 'f2fff6')
const SKIN = colors('282e3a', '454e5e', '6a7486', '96a1b2', 'c4ccd8')
const SHIRT = colors('5a7698', '8aa6c6', 'bcd2e8')
const PAPER = hex('eef4f2')
const TIE = colors('4a1020', '8a2030', 'c03a48')
const WOOD = colors('2a1812', '55301f', '87532e', 'b97f3e')
const MANILA = colors('5e5038', '9a855a', 'cdb984', 'efe1b0')
const EYE = colors('d8a828', 'fff0a0')

/** Row of the desk's back edge: it hides the dragon's lower body. */
const DESK = 80

/** Mirror x round the middle of the card. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

/** A crooked tower of files: folders and paper bundles from `base` up to `top`; `dim` darkens it. */
function tower(p: Painter, x: number, base: number, top: number, w: number, lean: number, seed: number, dim: number): void {
  const rand = rng(seed)
  let y = base
  while (y > top) {
    const h = 2 + Math.floor(rand() * 3)
    const off = Math.round((lean * (base - y)) / (base - top) + (rand() - 0.5) * 2.5)
    const width = w - Math.floor(rand() * 3)
    const ramp = rand() < 0.62 ? MANILA : SHIRT
    const box = p.m().rect(x + off, y - h, width, h)
    const step = (i: number) => ramp[Math.max(0, i - dim)] ?? ramp[0]
    p.fill(box, step(1))
    p.fill(box.facing([0, -1]), step(2))
    p.fill(box.facing([1, 0]), step(0))
    p.fill(box.facing([0, 1]), WALL[0])
    y -= h
  }
}

function office(p: Painter): void {
  // back wall in a sickly green-grey, lit by the tube at the top left
  p.register(WALL)
  p.dither(
    null,
    WALL,
    (x, y) => {
      const lamp = Math.max(0, 1 - Math.hypot((x - 16) * 0.8, (y - 18) * 0.9) / 62)
      return 0.08 + lamp * 0.8
    },
    0.75,
  )

  // the cone of cold light falling from the tube
  p.tone(p.m().poly([5, 19, 29, 19, 46, 80, 0, 80]), 1)

  // towers of files on both sides
  tower(p, 63, DESK, 14, 14, -2, 7, 1)
  tower(p, 0, DESK, 22, 14, 2, 9, 0)

  // the tube: a housing, the glowing tube
  p.fill(p.m().rect(9, 15, 1, 1).rect(24, 15, 1, 1), WALL[0])
  p.fill(p.m().rect(5, 16, 24, 1), WALL[4])
  p.fill(p.m().rect(6, 17, 22, 1), TUBE[1])
  p.fill(p.m().rect(5, 18, 24, 1), TUBE[0])

  // desk of grey laminate: lit back edge, top, dark front
  p.fill(p.m().rect(0, DESK, 80, 11), SKIN[2])
  p.fill(p.m().rect(0, DESK, 80, 1), SKIN[3])
  p.fill(p.m().rect(0, DESK + 11, 80, 112 - DESK - 11), SKIN[0])

  // the two forms under the stamps
  for (const s of [1, -1]) {
    const x = side(s)
    const form = p.m().poly([x(1), 83, x(33), 82, x(34), 91, x(2), 92])
    p.fill(form, PAPER)
    p.fill(form.facing([0, 1]), SHIRT[1])
    for (const y of [86, 88]) p.fill(p.m().rect(Math.min(x(4), x(14)), y, 10, 1).and(form), SHIRT[1])
  }

  // the ink pad between them, lid open
  p.fill(p.m().rect(33, 81, 14, 3), SKIN[1])
  p.fill(p.m().rect(33, 81, 14, 1), SKIN[3])
  p.fill(p.m().rect(33, 84, 14, 5), SKIN[0])
  p.fill(p.m().rect(34, 85, 12, 3), TIE[1])
  p.fill(p.m().rect(34, 85, 12, 1), TIE[2])
}

/** One stamp: wooden knob and neck, wide block, red-inked rubber. `x` is the middle, `y` the top of the knob. */
function stamp(d: Painter, x: number, y: number, w: number): void {
  const m = (): Mask => d.m()
  d.part(m().rect(x - w / 2, y + 13, w, 7), WOOD, { bevel: 2 })
  d.fill(m().rect(x - w / 2 + 1, y + 20, w - 2, 2), TIE[1])
  d.fill(m().rect(x - w / 2 + 1, y + 21, w - 2, 1), TIE[0])
  d.part(m().rect(x - 2.5, y + 4, 5, 9), WOOD, { bevel: 2 })
  d.part(m().ellipse(x, y + 2.8, 4, 2.8), WOOD, { bevel: 2 })
}

/** Band across a limb at point `at`, perpendicular to the direction `dir`: a sleeve garter. */
function band(d: Painter, limb: Mask, at: Pt, dir: Pt, width: number): Mask {
  const len = Math.hypot(dir[0], dir[1])
  const [ux, uy] = [dir[0] / len, dir[1] / len]
  const [nx, ny] = [-uy * 9, ux * 9]
  const [hx, hy] = [(ux * width) / 2, (uy * width) / 2]
  return d
    .m()
    .poly([at[0] - nx - hx, at[1] - ny - hy, at[0] + nx - hx, at[1] + ny - hy, at[0] + nx + hx, at[1] + ny + hy, at[0] - nx + hx, at[1] - ny + hy])
    .and(limb)
}

function body(d: Painter): void {
  const m = (): Mask => d.m()

  // spines along the shoulders
  for (const sx of [1, -1]) {
    const x = side(sx)
    for (const [bx, by, tx, ty] of [[27, 50, 24, 43], [22, 52, 17, 47]] as const) {
      d.part(m().poly([x(bx - 2.5), by, x(tx), ty, x(bx + 2.5), by - 1]), SKIN, { bevel: 2, bias: -1 })
    }
  }

  // torso in a pale blue office shirt; the desk will hide everything below its edge
  d.part(m().ellipse(40, 69, 15.5, 19).limb([24, 55, 40, 50, 56, 55], [6, 7, 6]), SHIRT, { bevel: 8 })
  // breast pocket with two pens
  d.fill(m().rect(45, 53, 1, 4), TIE[2])
  d.fill(m().rect(47, 52, 1, 5), SKIN[0])
  d.part(m().rect(43.5, 56, 7, 6), SHIRT, { bevel: 1, line: 'shadow' })
  d.fill(m().rect(44, 56, 6, 1), SHIRT[0])
  for (const s of [1, -1]) {
    const x = side(s)
    // sleeve cinched by a garter and rolled up above the elbow, bare forearm, fist round the neck of the stamp
    const sleeve = m().limb([x(25), 54, x(19), 57.5, x(13.5), 61], [5.2, 4.8, 4.4])
    d.part(sleeve, SHIRT, { bevel: 4 })
    d.part(band(d, sleeve, [x(19.5), 57], [x(13.5) - x(25), 7], 2), TIE, { bevel: 1 })
    d.part(m().limb([x(12.5), 62, x(8.5), 66, x(14.5), 70], [3.6, 3.5, 3.2]), SKIN, { bevel: 3, line: 'shadow' })
    d.part(m().ellipse(x(13.5), 61, 4.2, 3.4), SHIRT, { bevel: 2, bias: 1 })
    stamp(d, x(17.5), 62, 26)
    d.part(m().ellipse(x(17.5), 70.5, 4.2, 3.2), SKIN, { bevel: 3 })
    const col = (c: number) => Math.round(x(c)) - (s < 0 ? 1 : 0)
    for (const c of [16, 18]) d.fill(m().rect(col(c), 71, 1, 2), SKIN[1])
    for (const c of [15, 17, 19]) d.stamp(['c', 'C'], col(c), 73, { c: MANILA[3], C: MANILA[1] })
  }
  // neck with throat plates, collar, tie
  const neck = m().limb([42, 36, 41, 42, 40, 48], [5.6, 5.8, 6.4])
  d.part(neck, SKIN, { bevel: 4, bias: -1 })
  // pale throat plates down the front of the neck
  const throat = m().limb([40.5, 37, 40, 43, 39.5, 48], [2.6, 3, 3.4]).and(neck)
  d.fill(throat, SKIN[3])
  for (const y of [39.5, 42.5, 45.5]) d.fill(m().path(quad([35, y], [40, y + 1.5], [45, y], 4)).and(throat), SKIN[2])
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().poly([x(33.5), 46, x(39.5), 49.5, x(35.5), 53.5]), SHIRT, { bevel: 2, bias: 1 })
  }
  d.part(m().poly([38, 48, 42, 48, 41.5, 51, 38.5, 51]), TIE, { bevel: 2 })
  d.part(m().poly([38.5, 51, 41.5, 51, 43.5, 67, 40, 71.5, 36.5, 67]), TIE, { bevel: 2 })
}

/** The head, three quarters to the left: horns, frill, skull, snout, open jaw, brow, glasses. */
function head(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().limb([39, 20, 43, 16.5, 48, 15.5], [2.5, 1.7, 0.7]), MANILA, { bevel: 2, bias: -1 })
  d.part(m().poly([47, 26, 56, 23, 50, 30, 57, 31, 49, 35, 55, 38, 46, 38]), SKIN, { bevel: 2, bias: -1 })
  d.part(m().poly([25, 35, 39, 34, 43, 38.5, 31, 40, 26, 38]), SKIN, { bevel: 2, bias: -1 })
  d.fill(m().poly([23, 33.5, 39, 33, 39, 35, 25, 35.5]), TIE[0])
  d.part(m().ellipse(41, 27, 8, 7.5).poly([36, 21.5, 25, 25.5, 21.5, 27.5, 20.5, 31, 22, 33.5, 39, 33.5]), SKIN, { bevel: 5 })
  d.part(m().ellipse(23.5, 27.5, 2.6, 2), SKIN, { bevel: 2, bias: 1, line: 'none' })
  d.part(m().limb([43, 21, 49, 18, 56, 17.5], [3, 2, 0.8]), MANILA, { bevel: 2 })
  d.part(m().poly([27, 23.5, 38, 19.5, 40.5, 22, 30, 26]), SKIN, { bevel: 2, bias: 1, line: 'shadow' })
  // eye glaring sideways at the viewer over half-moon glasses, the glasses' arm, nostril, teeth
  d.stamp(['eeyp', '.eep'], 32, 24, { e: EYE[0], y: EYE[1], p: OUTLINE })
  d.stamp(['o.....oooooooo', 'occ..o........', '.oooo.........'], 30, 26, { o: OUTLINE, c: TUBE[1] })
  d.px(22, 27, OUTLINE).px(23, 27, OUTLINE)
  d.stamp(['w.w.w..w.w', 'w.....w...'], 25, 34, { w: PAPER })
}

/** A loose sheet blown up by the slam: a tilted page with two lines and a shaded edge. */
function sheet(p: Painter, cx: number, cy: number, deg: number): void {
  const a = (deg * Math.PI) / 180
  const at = (u: number, v: number): Pt => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]
  const page = p.m().poly([at(-3.6, -2.6), at(3.6, -2.6), at(3.6, 2.6), at(-3.6, 2.6)])
  p.fill(page, PAPER)
  p.fill(page.facing([1, 0, 0, 1]), SHIRT[1])
  p.fill(p.m().path([at(-2, -0.6), at(2, -0.6)]).and(page.shrunk(1)), SHIRT[1])
}

/** Puffs of snort smoke curling up from the nostril. */
function snort(p: Painter): void {
  const puffs = p.m().disc(18, 25, 2.2).disc(15, 22.5, 2.6).disc(12.5, 19.5, 2)
  p.fill(puffs, SKIN[3])
  p.fill(puffs.facing([-1, 0, 0, -1]), SKIN[4])
}

export const buerokrator: CardDef = {
  id: 'emp3-011',
  number: 11,
  name: 'Bürokrator',
  tier: 'ultra',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    office(p)
    const d = p.layer()
    body(d)
    head(d)
    // the desk hides the lower body, but not the stamps that land on it
    d.erase(d.m().rect(31, DESK, 18, 112 - DESK))
    // the tube throws his shadow on the wall and the files behind him, and rims his lit edges
    p.tone(d.mask().moved(6, 3).and(p.m().rect(0, 0, 80, DESK)), -1)
    const lit = d.mask().facing([-1, 0, 0, -1]).and(d.m().poly([0, 0, 46, 0, 30, 60, 0, 60]))
    d.fill(lit.and(d.m().rect(0, 0, 80, 46)), TUBE[0])
    p.subject(d, OUTLINE)
    snort(p)
    for (const [x, y, deg] of [[8, 40, 20], [70, 37, -25], [63, 22, 12], [74, 55, 35], [6, 59, -30]] as const) sheet(p, x, y, deg)
    // ink spattered on the forms by the slam
    for (const s of [1, -1]) {
      const col = (c: number) => Math.round(side(s)(c)) - (s < 0 ? 1 : 0)
      p.px(col(32), 84, TIE[1]).px(col(33), 86, TIE[1]).px(col(31), 88, TIE[0])
    }
  },
}
