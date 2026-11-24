import type { Font } from '../../fonts.ts'
import { CONDENSED, MICRO, REGULAR, drawText, fit, measure } from '../../fonts.ts'
import type { Mask } from '../../toolkit/index.ts'
import { Painter, colors, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Monkey.D.Luffy (Steckbrief, Ultra, Red). Brief: Luffy's wanted poster. Full art, 80×112.
 *
 * Composition: a parchment poster nailed to a dark plank wall fills the picture, torn at its edges,
 * its lower right corner curling away from the wall, a bullet hole near the top. Tall WANTED letters
 * head it; the faded photo below shows Luffy: the straw hat with its red band, black hair, big round
 * eyes, the scar under his left eye and his widest grin, his red vest at the bottom. DEAD OR ALIVE
 * and a gold bounty strip close the poster. The frame covers the outer 4 pixels and its plates rows
 * 1–13 and 90–108.
 */
const PLANK = colors('1a100c', '34201a', '54362a', '74503a')
const PAPER = colors('8a6a44', 'c8aa78', 'e6d2a6', 'f8ecd0')
const SEPIA = colors('2a1a10', '5a3a22', '8a5e38')
const GOLD = colors('9a6a1c', 'e8b83a', 'fff0a0')
const RED = hex('a8281e')
const NAIL = colors('5e5e68', 'b4b4c0')
const OUTLINE = hex('120a06')

const POSTER = { x: 8, y: 15, w: 64, h: 74 }

/**
 * Luffy's portrait: the straw hat with its red band, black hair under the brim, big round eyes, the
 * scar under his left eye, the grin from ear to ear, the red vest at the bottom.
 */
const PORTRAIT = [
  '..............oooooooo..............',
  '...........oooyyyyyyyyooo...........',
  '..........oyYYYyyyyyyyyyyo..........',
  '.........oyYYyyyyyyyyyyyyyo.........',
  '.........oyYyyyyyyyyyyyyyyo.........',
  '.........orrrrrrrrrrrrrrrro.........',
  '.........orrrrrrrrrrrrrrrro.........',
  '....oooooyyyyyyyyyyyyyyyyyyooooo....',
  '..ooyyYYYYyyyyyyyyyyyyyyyyyyyyyyoo..',
  '.oyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyo.',
  'oyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyo',
  '.ooyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyoo.',
  '...ookkkkkkkkkkkkkkkkkkkkkkkkkkoo...',
  '..kkkkkkkakkkkkaakkkkaakkkkakkkkkk..',
  '.kkkkkaaaaakaaaaaaaaaaaaakaaaakkkkk.',
  '..kkkaaaaaaaaaaaaaaaaaaaaaaaaaakkk..',
  '.kkkaaaaakkkkaaaaaaaaaakkkkaaaaakkk.',
  '..kkaaaaakwkkaaaaaaaaaakwkkaaaaakk..',
  '...kaaaaakkkkaaaaaaaaaakkkkaaaaak...',
  '...kaaaaaakkaaaaaaaaaaaakkaaaaaak...',
  '...kaaaaaaaaaaaaaAAaaaaHHHHaaaaak...',
  '...kaaaaaaaaaaaaaaaaaaaHaaHaaaaak...',
  '...kaakaaaaaaaaaaaaaaaaaaaaaakaak...',
  '...kaakkkkkkkkkkkkkkkkkkkkkkkkaak...',
  '...kaakwwwwwwwwwwwwwwwwwwwwwwkaak...',
  '...kaaakhhhhhhhhhhhhhhhhhhhhkaaak...',
  '....kaaakhhhhhhrrrrrrhhhhhhkaaak....',
  '....kaaaakkkkkkkkkkkkkkkkkkaaaak....',
  '.....kaaaaaaaaaaaaaaaaaaaaaaaak.....',
  '......kkaaaaaaaaaaaaaaaaaaaakk......',
  '........kkkaaaaaaaaaaaaaakkk........',
  '...........kkkaaaaaaaakkk...........',
  '......vvvvvvvkaaaaaaaakvvvvvvv......',
  '....vvvvvvvvvvkaaaaaakvvvvvvvvvv....',
  '..vvvvvvvvvvvvvkaaaakvvvvvvvvvvvvv..',
  'vvvvvvvvvvvvvvvvkaakvvvvvvvvvvvvvvvv',
]
const PORTRAIT_KEY = {
  k: SEPIA[0],
  w: PAPER[3],
  h: SEPIA[1],
  H: SEPIA[2],
  a: PAPER[2],
  A: PAPER[1],
  o: GOLD[0],
  y: GOLD[1],
  Y: GOLD[2],
  r: RED,
  v: RED,
}
const PX = 22
const PY = 32

function wall(p: Painter): void {
  p.register(PLANK)
  for (let x = 0; x < 80; x += 10) {
    const plank = p.m().rect(x, 0, 10, 112)
    p.dither(plank, PLANK, (px, y) => 0.42 + (noise(px * 3, y * 0.06, x, 5) - 0.5) * 0.45 - (px - x) * 0.014, 0.35)
    p.fill(p.m().rect(x, 0, 1, 112), PLANK[0])
    for (const y of [6, 100]) p.fill(p.m().rect(x + 4, y, 2, 2), PLANK[0])
  }
}

/** Write text as hand-placed pixels, so the cleanup pass keeps every dot of it. */
function ink(p: Painter, text: string, x: number, y: number, f: Font, c: number): void {
  const scratch = new Painter(p.w, p.h)
  drawText(scratch, text, x, y, f, c, { align: 'center' })
  scratch.mask().each((xx, yy) => p.px(xx, yy, c))
}

/** The poster's header: bold capitals stretched to twice their height, set wide apart. */
function header(p: Painter, text: string, cx: number, y: number, c: number): void {
  const gap = 2
  const widths = [...text].map((ch) => measure(ch, REGULAR) + 1)
  let x = cx - Math.floor((widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1)) / 2)
  ;[...text].forEach((ch, i) => {
    const glyph = new Painter(8, 8)
    drawText(glyph, ch, 0, 0, REGULAR, c)
    drawText(glyph, ch, 1, 0, REGULAR, c)
    glyph.mask().each((gx, gy) => p.px(x + gx, y + gy * 2, c).px(x + gx, y + gy * 2 + 1, c))
    x += (widths[i] ?? 0) + gap
  })
}

function poster(d: Painter): void {
  const m = (): Mask => d.m()
  const { x, y, w, h } = POSTER
  // the sheet with torn, uneven edges; the lower right corner curling away from the wall
  const sheet = m().rect(x, y, w, h)
  for (let i = 0; i < h; i += 3) {
    const bite = Math.round(noise(i, 0, 5, 2) * 2)
    sheet.minus(m().rect(x, y + i, bite, 2)).minus(m().rect(x + w - Math.round(noise(i, 9, 6, 2) * 2), y + i, 2, 2))
  }
  sheet.minus(m().poly([x + w - 14, y + h + 1, x + w + 1, y + h - 14, x + w + 1, y + h + 1]))
  sheet.minus(m().poly([x, y + h - 9, x + 6, y + h - 4, x + 3, y + h + 1, x, y + h + 1]))
  d.shine(true)
  d.dither(sheet, PAPER, (px, py) => 0.62 + (noise(px, py, 3, 6) - 0.5) * 0.5 - Math.max(0, 1 - Math.min(px - x, x + w - px, py - y) / 5) * 0.3, 0.3)
  d.cleanup()
  d.shine(false)
  // the curl: the back of the paper, lit, with its shadow on the wall
  const curl = m().poly([x + w - 14, y + h, x + w, y + h - 14, x + w - 9, y + h - 9])
  d.part(curl, PAPER, { bevel: 2 })
  // the photo: a dark rule round a lighter, faded field
  const photo = m().rect(x + 9, y + 17, w - 18, 36)
  d.fill(photo.outerEdge(), SEPIA[1])
  d.dither(photo, [PAPER[0], PAPER[1]], (px, py) => 0.9 - Math.hypot(px - 40, py - 46) / 34, 0.25)
  d.cleanup()
  // red rules above and below the photo
  d.fill(m().rect(x + 6, y + 15, w - 12, 1).rect(x + 6, y + 55, w - 12, 1), RED)
  // the bounty strip
  const strip = m().rect(x + 7, y + 63, w - 14, 9)
  d.shine(true)
  d.part(strip, GOLD, { bevel: 2 })
  d.shine(false)
}

function lettering(p: Painter): void {
  header(p, 'WANTED', 40, 18, SEPIA[0])
  // a flat band of paper under the small print, so no paper pixel between two letters is left alone
  // for the cleanup pass to fill with ink
  p.fill(p.m().rect(12, 71, 56, 7), PAPER[2])
  const doa = 'DEAD OR ALIVE'
  ink(p, doa, 40, 72, CONDENSED, SEPIA[0])
  const bounty = '500.000.000'
  ink(p, bounty, 40, 80, fit(bounty, 48, [REGULAR, CONDENSED, MICRO]), SEPIA[0])
}

function holes(p: Painter): void {
  // nails at the top corners and the bottom, a bullet hole near the top right
  for (const [x, y] of [
    [11, 18],
    [68, 18],
    [12, 82],
  ] as const) {
    p.fill(p.m().disc(x + 0.5, y + 0.5, 1.6), NAIL[0])
    p.px(x, y, NAIL[1])
  }
  p.stamp(['.ppp.', 'pkkkp', 'pkkkp', 'pkkkp', '.ppp.'], 64, 35, { p: PAPER[0], k: PLANK[0] })
  p.px(69, 34, PAPER[0]).px(63, 40, PAPER[0])
}

export const luffyWanted: CardDef = {
  id: 'op03-087',
  number: 87,
  name: 'Monkey.D.Luffy (Steckbrief)',
  tier: 'ultra',
  kind: 'character',
  element: 'Rot',
  print: { cost: 5, power: 6000, type: 'Supernovae/Strohhutbande' },
  // the poster's paper and its gold bounty strip shine; Luffy's portrait, the ink and the wall stay matt
  foil: 'painted',
  draw(p) {
    wall(p)
    const d = p.layer()
    poster(d)
    d.stamp(PORTRAIT, PX, PY, PORTRAIT_KEY)
    p.subject(d, OUTLINE)
    lettering(p)
    holes(p)
  },
}
