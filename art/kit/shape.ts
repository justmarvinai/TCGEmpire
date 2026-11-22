import type { PartOptions, Painter, Ramp, RGB } from '../toolkit/index.ts'
import { Mask, colors, fromHsl, hex, mix, ramp, toHsl } from '../toolkit/index.ts'

/**
 * Local drawing frame of a kit subject: (0, 0) is the ground point under it, +x is where it looks,
 * one unit is one pixel at scale 1. `rot` turns the whole subject (degrees, clockwise on screen).
 */
export interface Place {
  x: number
  y: number
  s: number
  flip: boolean
  rot: number
}

/** A mask drawn in local units. All methods add pixels and return `this`. */
export class Shape {
  readonly mask: Mask
  readonly at: Place

  constructor(at: Place, w: number, h: number) {
    this.at = at
    this.mask = new Mask(w, h)
  }

  /** Local point to picture coordinates. */
  pt(x: number, y: number): [number, number] {
    const { s, flip, rot } = this.at
    const c = Math.cos((rot * Math.PI) / 180)
    const n = Math.sin((rot * Math.PI) / 180)
    const rx = (x * c - y * n) * s
    return [this.at.x + (flip ? -rx : rx), this.at.y + (x * n + y * c) * s]
  }

  /** Ellipse, optionally turned by `turn` degrees. */
  e(cx: number, cy: number, rx: number, ry: number, turn = 0): this {
    const [x, y] = this.pt(cx, cy)
    const t = turn + this.at.rot
    this.mask.ellipse(x, y, rx * this.at.s, ry * this.at.s, this.at.flip ? -t : t)
    return this
  }

  c(cx: number, cy: number, r: number): this {
    return this.e(cx, cy, r, r)
  }

  /** Polygon from flat x, y pairs. */
  p(...xy: number[]): this {
    const out: number[] = []
    for (let i = 0; i + 1 < xy.length; i += 2) out.push(...this.pt(xy[i] ?? 0, xy[i + 1] ?? 0))
    this.mask.poly(out)
    return this
  }

  /** Smooth limb through flat x, y pairs with the given radius (or one radius per point). */
  l(xy: readonly number[], r: number | readonly number[]): this {
    const out: number[] = []
    for (let i = 0; i + 1 < xy.length; i += 2) out.push(...this.pt(xy[i] ?? 0, xy[i + 1] ?? 0))
    const s = this.at.s
    this.mask.limb(out, typeof r === 'number' ? r * s : r.map((v) => v * s))
    return this
  }

  /** One-pixel line through flat x, y pairs. */
  line(...xy: number[]): this {
    const out: number[] = []
    for (let i = 0; i + 1 < xy.length; i += 2) out.push(...this.pt(xy[i] ?? 0, xy[i + 1] ?? 0))
    this.mask.path(out)
    return this
  }

  and(o: Shape | Mask): this {
    this.mask.and(o instanceof Shape ? o.mask : o)
    return this
  }

  minus(o: Shape | Mask): this {
    this.mask.minus(o instanceof Shape ? o.mask : o)
    return this
  }

  or(o: Shape | Mask): this {
    this.mask.or(o instanceof Shape ? o.mask : o)
    return this
  }
}

type Ramp3 = readonly [RGB, RGB, RGB]

/** Ramps of a subject: body, secondary, belly and accent, plus the fixed face colours. */
export interface Pal {
  body: readonly [RGB, RGB, RGB, RGB]
  sec: Ramp3
  belly: Ramp3
  acc: Ramp3
  /** Dark silhouette outline, a deep shade of the body colour. */
  line: RGB
}

export const INK = hex('1c1420')
export const WHITE = hex('fffbea')
export const MOUTH = colors('7a1e30', 'f07a8a')

/** Palette from 'body secondary belly accent' hex codes; later ones default to shades of the body. */
export function palette(codes: string): Pal {
  const [b = 0x888888, s, l, a] = codes.split(' ').map(hex)
  const [h, sat] = toHsl(b)
  const sec = s ?? fromHsl(h, sat * 0.8, toHsl(b)[2] * 0.7)
  const r3 = (c: RGB) => ramp(c, 3) as unknown as Ramp3
  return {
    body: ramp(b, 4) as unknown as Pal['body'],
    sec: r3(sec),
    belly: r3(l ?? mix(b, WHITE, 0.6)),
    acc: r3(a ?? sec),
    line: fromHsl(h, Math.min(0.6, sat), 0.11),
  }
}

/**
 * Drawing context of one subject: a layer, its place and its palette. `part` paints a shape the
 * house way (contact line, then volume shading); the stamps are placed and mirrored in local units.
 */
export class Kit {
  readonly d: Painter
  readonly at: Place
  readonly pal: Pal

  constructor(d: Painter, at: Place, pal: Pal) {
    this.d = d
    this.at = at
    this.pal = pal
  }

  m(): Shape {
    return new Shape(this.at, this.d.w, this.d.h)
  }

  part(sh: Shape, r: Ramp, o: PartOptions = {}): Shape {
    this.d.part(sh.mask, r, o)
    return sh
  }

  fill(sh: Shape, c: RGB): Shape {
    this.d.fill(sh.mask, c)
    return sh
  }

  /** Hand-placed grid centred on a local point; `mirror` flips it with the subject. */
  stamp(grid: readonly string[], x: number, y: number, key: Readonly<Record<string, RGB>>, mirror = true): void {
    const [px, py] = this.m().pt(x, y)
    const w = grid[0]?.length ?? 0
    this.d.stamp(grid, Math.round(px - w / 2), Math.round(py - grid.length / 2), key, mirror && this.at.flip)
  }
}
