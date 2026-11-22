import type { Font } from '../fonts.ts'
import { MICRO, drawText, fit, measure } from '../fonts.ts'
import type { RGB, Ramp } from '../toolkit/index.ts'
import { Mask, Painter, colors, hex } from '../toolkit/index.ts'

/**
 * Grading slab: a clear acrylic case with a label on top and the card below. Three label styles
 * evoke the big graders without copying their logos. Pure raster code, usable at runtime.
 *
 * Layout (96×152): label 80×22 at (8, 7), card 80×112 at (8, 33), each in its own window.
 * Label: band with brand and set line, card name, barcode and certificate number, and on the
 * right the descriptor next to the big grade.
 */
export type Grader = 'psa' | 'bgs' | 'cgc'

export interface SlabOptions {
  /** Finished card raster, 80×112. */
  card: Painter
  grader: Grader
  /** Final grade, e.g. 10 or 9.5. */
  grade: number
  /** Card name. */
  title: string
  /** Set and number. */
  subtitle: string
  /** Certificate number, 8 digits. */
  cert: string
  /** BGS only: the black label of a perfect 10. */
  blackLabel?: boolean
}

export const SLAB = { w: 96, h: 152 } as const
const LABEL = { x: 8, y: 7, w: 80, h: 22 } as const
const CARD_AT = { x: 8, y: 33 } as const

/** Acrylic, darkest first, and the dark gap between the case and its content. */
const ICE = colors('27304a', '5b6c8f', '93a6c6', 'b9c9e2', 'e1eaf7', 'ffffff')
const GAP = hex('161b2e')
const WHITE = hex('ffffff')
const TL = [-1, 0, 0, -1]
const BR = [1, 0, 0, 1]

interface Look {
  brand: string
  /** Label stock: one colour, or a ramp for a metallic sheen. */
  paper: Ramp
  band: RGB
  onBand: RGB
  ink: RGB
  /** Descriptor and certificate number. */
  accent: RGB
}

const PSA: Look = {
  brand: 'PSA',
  paper: colors('fbf8ee'),
  band: hex('c9202e'),
  onBand: WHITE,
  ink: hex('1e1a24'),
  accent: hex('c9202e'),
}
const CGC: Look = {
  brand: 'CGC',
  paper: colors('c9dcf8', 'e4eefc'),
  band: hex('1c4fb2'),
  onBand: WHITE,
  ink: hex('13244c'),
  accent: hex('1c4fb2'),
}
const BGS_GOLD: Look = {
  brand: 'BGS',
  paper: colors('e2ac22', 'f6d04e', 'fff0a4'),
  band: hex('6a460a'),
  onBand: hex('fff0a4'),
  ink: hex('33210a'),
  accent: hex('4e3206'),
}
const BGS_SILVER: Look = {
  ...BGS_GOLD,
  paper: colors('a4b0c8', 'ccd5e6', 'f2f6fd'),
  band: hex('465068'),
  onBand: WHITE,
  ink: hex('1c2030'),
  accent: hex('2e3650'),
}
const BGS_BLACK: Look = {
  ...BGS_GOLD,
  paper: colors('15131b', '24212c'),
  band: hex('d9a826'),
  onBand: hex('15131b'),
  ink: hex('fff0a4'),
  accent: hex('d9a826'),
}

function lookOf(o: SlabOptions): Look {
  if (o.grader === 'psa') return PSA
  if (o.grader === 'cgc') return CGC
  return o.blackLabel ? BGS_BLACK : o.grade >= 9.5 ? BGS_GOLD : BGS_SILVER
}

/** Condition in words, one or two short lines next to the grade. */
function descriptor(grade: number): string[] {
  if (grade >= 9.5) return ['GEM', 'MT']
  if (grade >= 9) return ['MINT']
  if (grade >= 8) return ['NM', 'MT']
  return [grade >= 7 ? 'NM' : 'EX']
}

/** Cut a text from the end until it fits. */
function clip(text: string, f: Font, width: number): string {
  let out = text
  while (out.length > 0 && measure(out, f) > width) out = out.slice(0, -1)
  return out
}

/** Rectangle with pixel-rounded corners; `cuts` lists the pixels removed per row at each corner. */
function plate(x: number, y: number, w: number, h: number, cuts: readonly number[] = []): Mask {
  const m = new Mask(SLAB.w, SLAB.h).rect(x, y, w, h)
  cuts.forEach((cut, row) => {
    for (let i = 0; i < cut; i++) {
      m.del(x + i, y + row).del(x + w - 1 - i, y + row)
      m.del(x + i, y + h - 1 - row).del(x + w - 1 - i, y + h - 1 - row)
    }
  })
  return m
}

function drawLabel(o: SlabOptions): Painter {
  const l = new Painter(LABEL.w, LABEL.h)
  const k = lookOf(o)
  const right = LABEL.w - 3

  // stock with a diagonal sheen (metallic labels), band on top, hairline frame
  l.dither(null, k.paper, (x, y) => 0.5 + 0.5 * Math.sin((x + y * 1.6) / 11), 0.3)
  l.fill(l.m().rect(0, 0, LABEL.w, 7), k.band)
  l.fill(l.m().rect(0, 0, LABEL.w, LABEL.h).facing(), k.band)
  drawText(l, k.brand, 3, 1, MICRO, k.onBand)
  drawText(l, clip(o.subtitle.toUpperCase(), MICRO, right - 18), right, 1, MICRO, k.onBand, {
    align: 'right',
  })

  // grade: whole number at double size, a fraction small on the same baseline
  const [whole = '', frac] = String(o.grade).split('.')
  const digits = new Painter(measure(whole, MICRO), MICRO.cap)
  drawText(digits, whole, 0, 0, MICRO, k.ink)
  const fracText = frac === undefined ? '' : `.${frac}`
  const gx = right + 1 - digits.w * 2 - (fracText === '' ? 0 : measure(fracText, MICRO) + 1)
  l.blit(digits.scaled(2), gx, 10)
  drawText(l, fracText, gx + digits.w * 2 + 1, 15, MICRO, k.ink)
  const words = descriptor(o.grade)
  words.forEach((word, i) => drawText(l, word, gx - 3, 9 + i * 6, MICRO, k.accent, { align: 'right' }))
  const wordsWidth = Math.max(...words.map((word) => measure(word, MICRO)))

  // card name, then barcode and certificate number
  const title = o.title.toUpperCase()
  const room = gx - 3 - wordsWidth - 3 - 3
  const f = fit(title, room)
  drawText(l, clip(title, f, room), 3, 8 + 7 - f.cap, f, k.ink)
  let bar = 3
  for (const ch of o.cert) {
    const digit = Number(ch)
    const width = 1 + (digit & 1)
    if (bar + width > 16) break
    l.fill(l.m().rect(bar, 16, width, 4), k.ink)
    bar += width + 1 + ((digit >> 1) & 1)
  }
  drawText(l, o.cert, 18, 16, MICRO, k.accent)
  return l
}

/** The complete slab as a 96×152 raster. */
export function renderSlab(o: SlabOptions): Painter {
  const p = new Painter(SLAB.w, SLAB.h)

  // case: dark outline, a lit lip, the frosted body with a bright top left corner
  p.fill(plate(0, 0, 96, 152, [4, 2, 1, 1]), ICE[0])
  const lip = plate(1, 1, 94, 150, [3, 1, 1])
  p.fill(lip, ICE[3]).edge(lip, ICE[5], TL).edge(lip, ICE[1], BR)
  const body = plate(2, 2, 92, 148, [2, 1])
  p.edge(body, ICE[4], TL).edge(body, ICE[2], BR)
  p.fill(body.facing(TL).and(plate(2, 2, 10, 10)), ICE[5])

  // two windows, label and card: a bevel falling in (shadow top left, light bottom right),
  // then the dark gap between case and content
  for (const [y, h] of [
    [5, 26],
    [31, 116],
  ] as const) {
    const bevel = plate(6, y, 84, h)
    p.fill(bevel, ICE[1]).edge(bevel, ICE[5], BR)
    p.fill(plate(7, y + 1, 82, h - 2), GAP)
  }
  p.blit(drawLabel(o), LABEL.x, LABEL.y)
  p.blit(o.card, CARD_AT.x, CARD_AT.y)

  // reflections run across the whole case: solid on the acrylic, a veil on the card
  const frame = lip.clone().minus(plate(6, 5, 84, 142))
  const glass = plate(CARD_AT.x, CARD_AT.y, 80, 112)
  const streak = (from: number, to: number, alpha: number) => {
    const m = plate(0, 0, SLAB.w, SLAB.h)
    m.each((x, y) => {
      const d = x + y * 0.5
      if (d < from || d >= to) m.del(x, y)
    })
    p.veil(m.clone().and(glass), WHITE, alpha)
    p.fill(m.and(frame), ICE[5])
  }
  streak(50, 61, 0.16)
  streak(66, 69, 0.12)
  streak(128, 133, 0.14)
  return p
}
