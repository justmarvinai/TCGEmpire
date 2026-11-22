import type { RGB } from '../toolkit/index.ts'
import { Painter } from '../toolkit/index.ts'

/**
 * Geometry of a kit picture of any size. The kit is designed in the classic Pokémon window: 68×48
 * with the ground line at y 33 ("design space"). A stage maps design coordinates onto the real
 * painter, x by w / 68 and y by g / 33, where g is the real ground line (69 % of the visible
 * height). At 68×48 every factor is exactly 1, so classic cards paint pixel for pixel as they always
 * did. `cover` rows at the bottom are hidden by the card frame: the stage is laid out above them and
 * the ground simply continues underneath.
 */
export class Stage {
  readonly w: number
  readonly h: number
  /** Ground line. */
  readonly g: number
  readonly kx: number
  readonly ky: number
  /** Factor for round things (discs, clouds, ring widths): the smaller of kx and ky. */
  readonly kr: number
  /** Subject scale: 1 at 68×48, grows with the square root of the picture area. */
  readonly k: number
  /** Subject ground point: centre line and feet. */
  readonly cx: number
  readonly foot: number

  constructor(w: number, h: number, cover = 0) {
    const seen = h - cover
    this.w = w
    this.h = h
    this.g = Math.round(seen * 0.6875)
    this.kx = w / 68
    this.ky = this.g / 33
    this.kr = Math.min(this.kx, this.ky)
    this.k = Math.sqrt((w * seen) / (68 * 48))
    this.cx = w / 2
    this.foot = this.g + Math.round(12 * this.ky)
  }

  x(v: number): number {
    return v * this.kx
  }

  y(v: number): number {
    return v * this.ky
  }

  r(v: number): number {
    return v * this.kr
  }

  /** Map flat design-space x, y pairs. */
  pts(xy: readonly number[]): number[] {
    return xy.map((v, i) => (i % 2 === 0 ? v * this.kx : v * this.ky))
  }

  /** Scale a count of scattered things (stars, sparks) with the picture area. */
  n(count: number): number {
    return Math.round(count * this.kx * this.ky)
  }
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
  w: number
  h: number
}

/** Bounding box of everything painted on a layer. */
export function bounds(d: Painter): Box {
  let [x0, y0, x1, y1] = [d.w, d.h, -1, -1]
  d.mask().each((x, y) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  })
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export interface PlaceOptions {
  /** Size against the stage (1 = the kit's medium size). */
  s?: number
  /** Silhouette outline colour. */
  line: RGB
  /** 'foot': stands on the ground line (default); 'mid': floats, centred in the picture. */
  anchor?: 'foot' | 'mid'
  /** Called for subjects that do not reach the ground: (x, y, rx) of their shadow. */
  shadow?: (x: number, y: number, rx: number) => void
  /** Effects painted behind the subject (glows, bolts), given its final box and scale. */
  under?: (box: Box, s: number) => void
  /** Whether the `under` effects shine (Holo and Alternative scenes). */
  shine?: boolean
  /** Rows at the bottom hidden by the card frame. */
  cover?: number
  /**
   * Fit the whole subject even where its first drawing runs off the picture (it is measured again on
   * an oversized layer). Off for the Pokémon set, whose cards were tuned with the clipped fit.
   */
  whole?: boolean
}

/**
 * Paint a subject with `draw(layer, x, y, s)` (ground point x, y and scale s), shrink it if it does
 * not fit, centre it and declare it as the subject of the picture. With `whole`, a subject that runs
 * off the layer is painted again with a margin of one picture on every side, so the fit sees all of it.
 */
export function place(p: Painter, draw: (d: Painter, x: number, y: number, s: number) => void, o: PlaceOptions): Box {
  const cover = o.cover ?? 0
  const st = new Stage(p.w, p.h, cover)
  const mid = o.anchor === 'mid'
  const seen = p.h - cover
  const y = mid ? Math.round(seen * 0.5) : st.foot
  let [ox, oy] = [0, 0]
  const paint = (s: number) => {
    const d = ox === 0 ? p.layer() : new Painter(p.w * 3, p.h * 3)
    draw(d, st.cx + ox, y + oy, s)
    return d
  }
  let s = (o.s ?? 1) * st.k
  let d = paint(s)
  let box = bounds(d)
  if (box.w <= 0) return box
  if (o.whole && (box.x0 === 0 || box.y0 === 0 || box.x1 === p.w - 1 || box.y1 === p.h - 1)) {
    ;[ox, oy] = [p.w, p.h]
    d = paint(s)
    box = bounds(d)
  }
  const fit = Math.min(1, (p.w - 6) / box.w, (mid ? seen - 4 : st.foot) / box.h)
  if (fit < 1) {
    s *= fit
    d = paint(s)
    box = bounds(d)
  }
  const [x0, x1, y0, y1] = [box.x0 - ox, box.x1 - ox, box.y0 - oy, box.y1 - oy]
  const dx = Math.round(st.cx - (x0 + x1 + 1) / 2)
  const dy = mid ? Math.round(seen / 2 - (y0 + y1 + 1) / 2) : Math.max(0, 2 - y0)
  const moved = p.layer().blit(d, dx - ox, dy - oy)
  if (o.shadow && y1 + (mid ? dy : 0) < st.g + 9 * st.ky) o.shadow(st.cx, st.foot - 1, (x1 - x0) * 0.3)
  const final = { ...box, x0: x0 + dx, x1: x1 + dx, y0: y0 + dy, y1: y1 + dy }
  if (o.under) {
    p.shine(o.shine ?? false)
    o.under(final, s)
    p.shine(false)
  }
  p.subject(moved, o.line)
  return final
}
