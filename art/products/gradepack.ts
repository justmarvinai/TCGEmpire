import { MICRO, drawText, measure } from '../fonts.ts'
import type { Mask, RGB } from '../toolkit/index.ts'
import { Painter, colors, hex, rays } from '../toolkit/index.ts'
import { GRADEPACK } from './gradepack-geometry.ts'
import type { ProductDef } from './index.ts'

/**
 * Sealed return packs a graded card comes back in, 112×168, one painter for every grader: a heat-sealed
 * foil pouch with crimped seals all round, the grader's band and wordmark (our own lettering, not their
 * logos), a recessed medallion with a big "?" over a burst, a grade scale from 1 to 10, a holographic
 * "VERSIEGELT" sticker and a barcode label. The rows above `GRADEPACK.tear` are the strip the player tears
 * off: top seal, "AUFREISSEN", a tear notch at the left edge and the perforation in its last row.
 * Everything below the tear line is opaque, because the slab waits behind it.
 */

const { w: W, h: H, tear: TEAR } = GRADEPACK

type R3 = readonly [RGB, RGB, RGB]
type R6 = readonly [RGB, RGB, RGB, RGB, RGB, RGB]
type R7 = readonly [RGB, RGB, RGB, RGB, RGB, RGB, RGB]

interface Look {
  id: string
  /** Wordmark on the band. */
  brand: string
  /** Pouch foil, darkest first: outline, seam, seal ridge, seal, local colour of the face, light, sheen. */
  foil: R7
  /** Band, darkest first; also the ring and "?" of the medallion and the grade scale. */
  band: R6
  /** Wordmark letters: shade, fill, light. */
  letter: R3
  /** Outline around the wordmark letters; dark letters go without one and only cast a shadow. */
  letterLine?: RGB
  /** Print on the bare foil: "AUFREISSEN", perforation, the numbers of the scale. */
  print: RGB
  /** Floor of the medallion: shadow and the lit rays of the burst. */
  well: readonly [RGB, RGB]
  /** Glints: the arms and the core of the little four-point stars. */
  glint: readonly [RGB, RGB]
}

/** The puffed face inside the seals; the seals are 4 px wide at the sides and 8 px at top and bottom. */
const FACE = { x: 5, y: 9, w: W - 10, h: H - 19 }
const BAND = { y: 29, h: 22 }
const MEDAL = { x: 56, y: 81, r: 23 }
/** Bottom row of the grade-scale bars. */
const SCALE = 120

const HOLO = colors('f2a6cf', 'ffd39a', 'fff2a2', 'b4efc6', '9ad8ff', 'c9b2ff')
const STICKER_INK = hex('1a1f3a')
const LABEL = colors('1b1e2a', 'd9dce6', 'ffffff')

/** Heavy capitals of the wordmarks, 13 rows, three-pixel stems. */
const LETTERS: Readonly<Record<string, readonly string[]>> = {
  A: [
    '..######..',
    '.########.',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '##########',
    '##########',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
  ],
  B: [
    '#########.',
    '##########',
    '###....###',
    '###....###',
    '###....###',
    '#########.',
    '##########',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '##########',
    '#########.',
  ],
  C: [
    '.########.',
    '##########',
    '###....###',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
    '###....###',
    '##########',
    '.########.',
  ],
  D: [
    '########..',
    '#########.',
    '###...####',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '###...####',
    '#########.',
    '########..',
  ],
  G: [
    '.########.',
    '##########',
    '###....###',
    '###.......',
    '###.......',
    '###.......',
    '###..#####',
    '###..#####',
    '###....###',
    '###....###',
    '###....###',
    '##########',
    '.########.',
  ],
  I: Array<string>(13).fill('###'),
  N: [
    '####...###',
    '####...###',
    '#####..###',
    '#####..###',
    '#####..###',
    '###.##.###',
    '###.##.###',
    '###.##.###',
    '###..#####',
    '###..#####',
    '###..#####',
    '###...####',
    '###...####',
  ],
  P: [
    '#########.',
    '##########',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
    '##########',
    '#########.',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
    '###.......',
  ],
  R: [
    '#########.',
    '##########',
    '###....###',
    '###....###',
    '###....###',
    '##########',
    '#########.',
    '###..###..',
    '###...###.',
    '###....###',
    '###....###',
    '###....###',
    '###....###',
  ],
  S: [
    '.########.',
    '##########',
    '###....###',
    '###.......',
    '###.......',
    '#########.',
    '.#########',
    '.......###',
    '.......###',
    '.......###',
    '###....###',
    '##########',
    '.########.',
  ],
}

/** The big question mark in the medallion, 15×20. */
const QUESTION = [
  '....#######....',
  '..###########..',
  '.#############.',
  '####.......####',
  '###.........###',
  '###.........###',
  '...........####',
  '..........####.',
  '.........####..',
  '........####...',
  '.......####....',
  '......####.....',
  '......###......',
  '......###......',
  '......###......',
  '...............',
  '...............',
  '......###......',
  '......###......',
  '......###......',
]

const ARROW = ['#..', '##.', '###', '##.', '#..']
const DIAMOND = ['..#..', '.###.', '#####', '.###.', '..#..']
const GLINT = ['..o..', '..w..', 'owwwo', '..w..', '..o..']

/** Bars of the barcode label; it encodes nothing. */
const BARCODE = '#.##.#..###.#.##..#.#.###..#.##.#.#..##'

function grid(p: Painter, rows: readonly string[], x: number, y: number): Mask {
  const m = p.m()
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(x + i, y + j)
  })
  return m
}

/** The wordmark as a mask, centred on the pack with the top of its letters at y. */
function lettering(p: Painter, text: string, y: number): Mask {
  const glyphs = [...text].map((ch) => LETTERS[ch] ?? [])
  const width = glyphs.reduce((sum, g) => sum + (g[0]?.length ?? 0) + 2, -2)
  const m = p.m()
  let x = Math.round((W - width) / 2)
  for (const g of glyphs) {
    m.or(grid(p, g, x, y))
    x += (g[0]?.length ?? 0) + 2
  }
  return m
}

/** A raised shape: drop shadow and outline (if any), fill, lit top left edges, shaded bottom right edges. */
function emboss(p: Painter, m: Mask, fill: R3, line: RGB | undefined, shadow: RGB): void {
  const rim = line === undefined ? m : m.grown(1)
  p.fill(rim.moved(1, 1), shadow)
  if (line !== undefined) p.fill(rim, line)
  p.fill(m, fill[1])
  p.fill(m.facing([-1, 0, 0, -1]), fill[2])
  p.fill(m.facing([1, 0, 0, 1]), fill[0])
}

/** Diagonal sheen of the foil, twice across the pack: a dull band, then a wide and a narrow band of light. */
function sheen(x: number, y: number): number {
  const d = (x + y * 0.55) % 120
  if ((d >= 52 && d < 63) || (d >= 67 && d < 70)) return 1
  return d >= 38 && d < 48 ? -0.5 : 0
}

/** Burst of light around the medallion, fading out towards the seals. */
function burst(lit: Mask, x: number, y: number): number {
  const fade = 1 - Math.hypot(x - MEDAL.x, (y - MEDAL.y) * 0.8) / 60
  return fade <= 0 || !lit.has(x, y) ? 0 : 0.26 * Math.min(1, fade * 2)
}

/** Light of the puffed face: lit along the top left seams, falling off towards the bottom right ones. */
function pillow(x: number, y: number): number {
  const left = x - FACE.x
  const top = y - FACE.y
  const right = FACE.x + FACE.w - 1 - x
  const bottom = FACE.y + FACE.h - 1 - y
  let t = 0.56 - (top / FACE.h) * 0.1 - (left / FACE.w) * 0.08
  if (left < 6) t += 0.26 * (1 - left / 6)
  if (top < 5) t += 0.22 * (1 - top / 5)
  if (right < 8) t -= 0.34 * (1 - right / 8)
  if (bottom < 8) t -= 0.34 * (1 - bottom / 8)
  return t
}

function drawPack(p: Painter, k: Look): void {
  const { foil, band } = k
  p.register(foil).register(band)
  const row = (y: number, x = 1, w = W - 2) => p.m().rect(x, y, w, 1)

  // pouch: the puffed face with its sheen, ridged seals all round, a seam where they meet
  const face = p.m().rect(FACE.x, FACE.y, FACE.w, FACE.h)
  const wedges = rays(p, MEDAL.x, MEDAL.y, 12, 0.01)
  p.dither(face, foil.slice(2), (x, y) => pillow(x, y) + sheen(x, y) * 0.24 + burst(wedges, x, y), 0.4)
  const seam = p.m().rect(FACE.x - 1, FACE.y - 1, FACE.w + 2, FACE.h + 2).minus(face)
  const seals = p.m().rect(1, 1, W - 2, H - 2).minus(face).minus(seam)
  seals.each((x, y) => {
    const across = y < FACE.y - 1 || y > FACE.y + FACE.h
    p.set(x, y, (across ? x : y) % 3 === 0 ? foil[2] : foil[3])
  })
  p.fill(seam, foil[1])
  p.fill(row(1), foil[4]).fill(p.m().rect(1, 1, 1, H - 2), foil[4])
  p.fill(row(H - 2), foil[1]).fill(p.m().rect(W - 2, 1, 1, H - 2), foil[1])

  // strip: "AUFREISSEN" between arrows, the perforation in its last row
  const text = 'AUFREISSEN'
  const half = Math.floor(measure(text, MICRO) / 2)
  drawText(p, text, W / 2, 14, MICRO, k.print, { align: 'center' })
  p.fill(grid(p, ARROW, W / 2 - half - 6, 14), k.print)
  p.fill(grid(p, ARROW, W / 2 + half + 3, 14), k.print)
  for (let x = 6; x < W - 1; x++) if ((x - 6) % 5 < 3) p.set(x, TEAR - 1, k.print)

  // band across the whole pack with the wordmark; the seals stay ridged under it
  const top = BAND.y
  const bottom = BAND.y + BAND.h - 1
  p.dither(
    p.m().rect(1, top, W - 2, BAND.h),
    band.slice(1, 5),
    (x, y) => 0.78 - ((y - top) / BAND.h) * 0.55 + sheen(x, y) * 0.3,
    0.6,
  )
  p.fill(row(top), band[0]).fill(row(bottom), band[0])
  p.fill(row(top + 1), band[5]).fill(row(bottom - 1), band[1])
  p.fill(row(top + 3), k.letter[1]).fill(row(bottom - 3), k.letter[1])
  const letters = lettering(p, k.brand, top + 5)
  emboss(p, letters, k.letter, k.letterLine, band[0])
  let left: number = W
  let right = 0
  letters.each((x) => {
    left = Math.min(left, x)
    right = Math.max(right, x)
  })
  for (const x of [Math.round((FACE.x + left) / 2) - 3, Math.round((right + FACE.x + FACE.w) / 2) - 1]) {
    const gem = grid(p, DIAMOND, x, top + 9)
    p.fill(gem.moved(1, 1), band[0]).fill(gem, k.letter[1]).fill(gem.facing([1, 0, 0, 1]), k.letter[0])
  }
  const ridges = p.m().rect(FACE.x - 1, top, 1, BAND.h).rect(FACE.x + FACE.w, top, 1, BAND.h)
  for (let y = top; y <= bottom; y++) if (y % 3 === 0) ridges.rect(1, y, 3, 1).rect(W - 4, y, 3, 1)
  p.tone(ridges, -1)

  // medallion: a lit ring around a recessed floor with a burst, and the big "?"
  const { x: cx, y: cy, r } = MEDAL
  const ring = p.m().disc(cx, cy, r - 1)
  const floor = p.m().disc(cx, cy, r - 4)
  p.fill(p.m().disc(cx, cy, r), band[0])
  p.dither(ring.clone().minus(floor), band.slice(1, 5), (x, y) => 0.5 - (x - cx + y - cy) / (2.4 * r), 0.5)
  p.fill(floor, k.well[0])
  p.fill(floor.clone().and(rays(p, cx, cy, 9, 0.02)), k.well[1])
  p.fill(floor.facing([-1, 0, 0, -1]), foil[1])
  p.fill(p.m().disc(cx, cy, r - 3).minus(floor).and(p.m().rect(0, cy, W, r)), band[4])
  emboss(p, grid(p, QUESTION, cx - 7, cy - 10), [band[2], band[3], band[5]], band[0], foil[1])

  // grade scale: ten bars from 1 to 10, growing and brightening towards the 10
  for (let i = 0; i < 10; i++) {
    const x = 18 + i * 8
    const h = 3 + i
    const c = band[Math.min(4, 1 + Math.floor(i / 3))] ?? band[3]
    p.fill(p.m().rect(x, SCALE - h + 1, 4, h), c)
    p.fill(p.m().rect(x, SCALE - h + 1, 4, 1), band[5])
  }
  p.fill(row(SCALE + 1, 16, 80), foil[1])
  drawText(p, '1', 19, SCALE + 3, MICRO, k.print)
  drawText(p, '10', 91, SCALE + 3, MICRO, k.print, { align: 'center' })

  // holographic "VERSIEGELT" sticker, bottom left
  const sticker = p.m().rect(8, 136, 46, 11)
  p.fill(sticker.grown(1), foil[0])
  p.dither(sticker, HOLO, (x, y) => ((x - y * 0.8 + 400) % 30) / 30, 0.5)
  p.fill(sticker.facing([-1, 0, 0, -1]), LABEL[2])
  drawText(p, 'VERSIEGELT', 31, 139, MICRO, STICKER_INK, { align: 'center' })

  // barcode label, bottom right
  const label = p.m().rect(62, 133, 42, 17)
  p.fill(label.grown(1), foil[0])
  p.fill(label, LABEL[2])
  p.fill(label.facing([1, 0, 0, 1]), LABEL[1])
  for (let i = 0; i < BARCODE.length; i++) if (BARCODE[i] === '#') p.fill(p.m().rect(64 + i, 135, 1, 8), LABEL[0])
  drawText(p, '2311 2026', 83, 144, MICRO, LABEL[0], { align: 'center' })

  // glints on the foil, the band and the ring
  for (const [x, y] of [
    [93, 56],
    [10, 98],
    [84, 99],
    [99, 31],
    [37, 60],
  ] as const)
    p.stamp(GLINT, x, y, { w: k.glint[1], o: k.glint[0] })

  // outline, and the tear notch cut into the left edge of the strip
  p.fill(p.m().rect(0, 0, W, H).minus(p.m().rect(1, 1, W - 2, H - 2)), foil[0])
  const notch = p.m()
  for (let j = 0; j < 5; j++) notch.rect(0, TEAR - 5 + j, j + 1, 1)
  p.erase(notch)
  p.fill(notch.grown(1).minus(notch), foil[0])
}

const LOOKS: readonly Look[] = [
  {
    id: 'gradepack-psa',
    brand: 'PSA',
    foil: colors('2b2f42', '5f667f', '8d94ac', 'b5bbcd', 'd6dae5', 'eef0f5', 'ffffff'),
    band: colors('4a0a14', '86121f', 'b01b2a', 'c9202e', 'e4474c', 'f8918a'),
    letter: colors('e2d6da', 'ffffff', 'ffffff'),
    letterLine: hex('4a0a14'),
    print: hex('c9202e'),
    well: colors('8d94ac', 'b5bbcd'),
    glint: colors('8d94ac', 'ffffff'),
  },
  {
    id: 'gradepack-bgs',
    brand: 'BGS',
    foil: colors('040406', '0c0c10', '16161c', '202028', '2a2a34', '3e3e4c', '6c6c82'),
    band: colors('4a2a08', '8c5a14', 'c88e28', 'eeba44', 'ffe286', 'fff8d8'),
    letter: colors('060608', '141418', '34343f'),
    print: hex('eeba44'),
    well: colors('0c0c10', '16161c'),
    glint: colors('c88e28', 'fff8d8'),
  },
  {
    id: 'gradepack-cgc',
    brand: 'CGC',
    foil: colors('050a1c', '0c1634', '14224a', '1b2d5f', '243a76', '34508f', '5a7cc0'),
    band: colors('163a78', '2b62b0', '4f8fd6', '7fb6ec', 'b4d8f8', 'e8f4ff'),
    letter: colors('c7dcf4', 'ffffff', 'ffffff'),
    letterLine: hex('13244c'),
    print: hex('7fb6ec'),
    well: colors('0c1634', '14224a'),
    glint: colors('4f8fd6', 'e8f4ff'),
  },
  {
    id: 'gradepack-company',
    brand: 'GRADING',
    foil: colors('0b0c10', '16171d', '20222a', '2b2e37', '373a45', '4e5262', '7a8094'),
    band: colors('4a2a08', '8c5a14', 'c88e28', 'eeba44', 'ffe286', 'fff8d8'),
    letter: colors('0b0c10', '1c1e26', '3a3e4b'),
    print: hex('eeba44'),
    well: colors('16171d', '20222a'),
    glint: colors('c88e28', 'fff8d8'),
  },
]

/** The four return packs: `gradepack-psa`, `gradepack-bgs`, `gradepack-cgc`, `gradepack-company`. */
export const GRADE_PACKS: readonly ProductDef[] = LOOKS.map((look) => ({
  id: look.id,
  w: W,
  h: H,
  draw(p: Painter) {
    drawPack(p, look)
  },
}))
