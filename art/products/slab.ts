import { MICRO, drawText } from '../fonts.ts'
import type { RGB } from '../toolkit/index.ts'
import { Mask, Painter, colors, hex, mix } from '../toolkit/index.ts'
import type { ProductDef } from './index.ts'
import type { SlabGrader } from './slab-geometry.ts'
import { SLAB, SLAB_GRADERS } from './slab-geometry.ts'

/**
 * Grading slab frames: a clear acrylic case with a printed label and an empty card window, one
 * frame per grading company. The label shows the grader's colours and wordmark (in the spirit of
 * the big graders, not their logos) and leaves flat zones for the texts the client writes on top.
 * Layout and zones: `slab-geometry.ts`.
 */

/** Acrylic, darkest first, and the dark gap between the case and its content. */
const ICE = colors('27304a', '5b6c8f', '93a6c6', 'b9c9e2', 'e1eaf7', 'ffffff')
const GAP = hex('161b2e')
const TL = [-1, 0, 0, -1]
const BR = [1, 0, 0, 1]

interface Label {
  /** Printed wordmark in the brand cell; empty for player companies. */
  brand: string
  paper: RGB
  /** Hairline frame, column rule and brand cell. */
  band: RGB
}

const LABELS: Readonly<Record<SlabGrader, Label>> = {
  psa: { brand: 'PSA', paper: hex('fbf8ee'), band: hex('c9202e') },
  bgs: { brand: 'BGS', paper: hex('f2c94a'), band: hex('5e3c08') },
  cgc: { brand: 'CGC', paper: hex('e6eefb'), band: hex('1c4fb2') },
  company: { brand: '', paper: hex('f3f5f9'), band: hex('8a93a8') },
}

/** Bars of the printed barcode; it encodes nothing, the real number is the cert text. */
const BARCODE = '##.#.##.#..#'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const box = (r: Rect): Mask => new Mask(SLAB.w, SLAB.h).rect(r.x, r.y, r.w, r.h)
const grow = (r: Rect, n: number): Rect => ({ x: r.x - n, y: r.y - n, w: r.w + n * 2, h: r.h + n * 2 })

/** Rectangle with pixel-rounded corners; `cuts` lists the pixels removed per row at each corner. */
function plate(r: Rect, cuts: readonly number[] = []): Mask {
  const m = box(r)
  cuts.forEach((cut, row) => {
    for (let i = 0; i < cut; i++) {
      m.del(r.x + i, r.y + row).del(r.x + r.w - 1 - i, r.y + row)
      m.del(r.x + i, r.y + r.h - 1 - row).del(r.x + r.w - 1 - i, r.y + r.h - 1 - row)
    }
  })
  return m
}

function drawLabel(p: Painter, grader: SlabGrader): void {
  const k = LABELS[grader]
  const { label } = SLAB
  const { brand, title, cert } = SLAB.zones
  const ink = hex(SLAB.colors[grader].ink)
  const onBand = hex(SLAB.colors[grader].onBand)

  // paper in a hairline frame, a rule between the text column and the grade column, a fine rule
  // above the certificate line
  const sheet = box(label)
  p.fill(sheet, k.paper)
  p.fill(sheet.facing(), k.band)
  p.fill(box({ x: brand.x - 1, y: label.y + 1, w: 1, h: label.h - 2 }), k.band)
  p.fill(box({ x: title.x, y: cert.y - 1, w: title.w, h: 1 }), mix(k.paper, k.band, 0.3))

  // brand cell, with the wordmark in bold (every glyph twice, one pixel apart)
  p.fill(box(brand), k.band)
  if (k.brand !== '') {
    const cx = brand.x + Math.floor(brand.w / 2)
    drawText(p, k.brand, cx, brand.y + 1, MICRO, onBand, { align: 'center' })
    drawText(p, k.brand, cx + 1, brand.y + 1, MICRO, onBand, { align: 'center' })
  }

  // barcode left of the certificate number
  for (let i = 0; i < BARCODE.length; i++)
    if (BARCODE[i] === '#') p.fill(box({ x: title.x + i, y: cert.y, w: 1, h: cert.h }), ink)
}

/** The empty frame of one grading company as a 96×152 raster. */
export function renderSlabFrame(grader: SlabGrader): Painter {
  const p = new Painter(SLAB.w, SLAB.h)
  const { label, card } = SLAB

  // case: dark outline, a lit lip, the frosted body with a bright top left corner
  p.fill(plate({ x: 0, y: 0, w: SLAB.w, h: SLAB.h }, [4, 2, 1, 1]), ICE[0])
  const lip = plate({ x: 1, y: 1, w: SLAB.w - 2, h: SLAB.h - 2 }, [3, 1, 1])
  p.fill(lip, ICE[3]).edge(lip, ICE[5], TL).edge(lip, ICE[1], BR)
  const body = plate({ x: 2, y: 2, w: SLAB.w - 4, h: SLAB.h - 4 }, [2, 1])
  p.edge(body, ICE[4], TL).edge(body, ICE[2], BR)
  p.fill(body.facing(TL).and(plate({ x: 2, y: 2, w: 10, h: 10 })), ICE[5])

  // two windows, label and card: a bevel falling in (shadow top left, light bottom right), then
  // the dark gap between case and content
  const bevels = new Mask(SLAB.w, SLAB.h)
  for (const r of [label, card]) {
    const bevel = plate(grow(r, 2))
    bevels.or(bevel)
    p.fill(bevel, ICE[1]).edge(bevel, ICE[5], BR)
    p.fill(plate(grow(r, 1)), GAP)
  }
  drawLabel(p, grader)

  // reflections on the acrylic only, never over the label or the card window: bright on the lip,
  // dimmer where they cross the bevels and the gap
  const glass = lip.clone().minus(box(label)).minus(box(card))
  for (const [from, to] of [
    [50, 61],
    [66, 69],
    [128, 133],
  ] as const) {
    glass.each((x, y) => {
      const d = x + y * 0.5
      if (d < from || d >= to) return
      const c = p.get(x, y)
      if (!bevels.has(x, y)) p.set(x, y, ICE[5])
      else p.set(x, y, c === GAP ? ICE[1] : c === ICE[1] ? ICE[3] : c)
    })
  }
  return p
}

/** One product per grading company: `slab-psa`, `slab-bgs`, `slab-cgc`, `slab-company`. */
export const SLAB_FRAMES: readonly ProductDef[] = SLAB_GRADERS.map((grader) => ({
  id: `slab-${grader}`,
  w: SLAB.w,
  h: SLAB.h,
  draw(p: Painter) {
    p.blit(renderSlabFrame(grader))
  },
}))
