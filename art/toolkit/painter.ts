import type { RGB, Ramp } from './color.ts'
import { NONE } from './color.ts'
import { Mask, distanceField } from './mask.ts'
import type { Points, Pt } from './path.ts'

const FOIL = 1
const DETAIL = 2

/**
 * House light: from the top left and well in front of the picture (unit vector, y points down).
 * The frontal share keeps the highlight inside a form instead of on its very edge.
 */
const LIGHT = { x: -0.3, y: -0.4, z: 0.866 }
/** Brightness above which a pixel takes the top ramp step, and below which shadows begin. */
const HIGHLIGHT = 0.965
const SHADOW = 0.74
const DARKEST = -0.2

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Ordered 4×4 Bayer threshold in (0, 1) for a pixel. */
export function bayer(x: number, y: number): number {
  return ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16
}

export interface ShadeOptions {
  /** Radius of the rounded edge in pixels. Default: the part is rounded all the way through. */
  bevel?: number
  /** Shift the result by this many ramp steps (negative = darker, e.g. for parts in the back). */
  bias?: number
}

export interface PartOptions extends ShadeOptions {
  /** Contact line on earlier paint around the part: on all sides (default), only on its shadow side, or none. */
  line?: 'all' | 'shadow' | 'none'
}

interface Shade {
  ramp: Ramp
  index: number
}

/**
 * The painter: an RGBA raster plus the drawing operations of the house style.
 * Draw creatures on a `layer()`, part by part from back to front, then `subject()` them onto the
 * scene. Everything painted while `shine(true)` is active becomes part of the card's foil mask.
 */
export class Painter {
  readonly w: number
  readonly h: number
  readonly data: Uint8ClampedArray
  /** Union of the silhouettes of all layers composited with `subject()`. */
  readonly subjectMask: Mask
  private readonly flags: Uint8Array
  private readonly shades: Map<RGB, Shade>
  private foilOn = false

  constructor(w: number, h: number, shades: Map<RGB, Shade> = new Map()) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
    this.flags = new Uint8Array(w * h)
    this.subjectMask = new Mask(w, h)
    this.shades = shades
  }

  /** New transparent painter of the same size that shares the ramp registry. */
  layer(): Painter {
    return new Painter(this.w, this.h, this.shades)
  }

  /** New empty mask of the painter's size. */
  m(): Mask {
    return new Mask(this.w, this.h)
  }

  // ── pixels ────────────────────────────────────────────────────────────────

  /** Colour of a pixel, or `NONE` if it is transparent or outside the picture. */
  get(x: number, y: number): RGB {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return NONE
    const o = (y * this.w + x) * 4
    if (this.data[o + 3] === 0) return NONE
    return ((this.data[o] ?? 0) << 16) | ((this.data[o + 1] ?? 0) << 8) | (this.data[o + 2] ?? 0)
  }

  private put(x: number, y: number, c: RGB, detail: boolean): void {
    // fractional coordinates would address bytes inside a neighbouring pixel
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    this.data[i * 4] = (c >> 16) & 255
    this.data[i * 4 + 1] = (c >> 8) & 255
    this.data[i * 4 + 2] = c & 255
    this.data[i * 4 + 3] = 255
    this.flags[i] = (this.foilOn ? FOIL : 0) | (detail ? DETAIL : 0)
  }

  /** Paint one pixel as part of an area. */
  set(x: number, y: number, c: RGB): this {
    this.put(x, y, c, false)
    return this
  }

  /** Hand-place one detail pixel (eye glint, nostril, spark). The cleanup pass leaves it alone. */
  px(x: number, y: number, c: RGB): this {
    this.put(x, y, c, true)
    return this
  }

  /** Make the pixels of a mask transparent again. */
  erase(m: Mask): this {
    m.each((x, y) => {
      const i = y * this.w + x
      this.data[i * 4 + 3] = 0
      this.flags[i] = 0
    })
    return this
  }

  /** While on, everything painted is marked as foil; painting with it off makes pixels matt again. */
  shine(on: boolean): this {
    this.foilOn = on
    return this
  }

  // ── areas ─────────────────────────────────────────────────────────────────

  /** Fill the whole picture with one colour. */
  clear(c: RGB): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.put(x, y, c, false)
    return this
  }

  /** Flat fill. */
  fill(m: Mask, c: RGB): this {
    m.each((x, y) => this.put(x, y, c, false))
    return this
  }

  /**
   * Volume shading: treats the mask as a rounded body lit from the top left and paints it in
   * clean bands of the ramp. The second-lightest step is the local colour of flat areas.
   */
  shade(m: Mask, ramp: Ramp, o: ShadeOptions = {}): this {
    this.register(ramp)
    const { w, h } = this
    const dist = distanceField(m)
    let deepest = 0
    m.each((x, y) => {
      deepest = Math.max(deepest, dist[y * w + x] ?? 0)
    })
    const r = Math.max(1.5, o.bevel ?? Math.min(deepest, 64))
    const height = new Float32Array(w * h)
    m.each((x, y) => {
      const k = r - Math.min(r, (dist[y * w + x] ?? 0) - 0.5)
      height[y * w + x] = Math.sqrt(r * r - k * k)
    })
    const top = ramp.length - 1
    const steps = Math.max(1, top - 1)
    m.each((x, y) => {
      const here = height[y * w + x] ?? 0
      const at = (xx: number, yy: number) =>
        xx < 0 || yy < 0 || xx >= w || yy >= h ? here : (height[yy * w + xx] ?? 0)
      const gx = (at(x + 1, y) - at(x - 1, y)) / 2
      const gy = (at(x, y + 1) - at(x, y - 1)) / 2
      const lit = (-gx * LIGHT.x - gy * LIGHT.y + LIGHT.z) / Math.hypot(gx, gy, 1)
      let index: number
      if (top === 0) index = 0
      else if (lit >= HIGHLIGHT) index = top
      else index = Math.min(top - 1, Math.max(0, Math.floor(((lit - DARKEST) / (SHADOW - DARKEST)) * steps)))
      index = Math.min(top, Math.max(0, index + (o.bias ?? 0)))
      this.put(x, y, ramp[index] ?? 0, false)
    })
    return this
  }

  /**
   * Contact line: redraws earlier paint just outside the mask in the darkest shade of its own
   * ramp. This is the selective, coloured outline that separates overlapping parts.
   */
  contact(m: Mask, line: 'all' | 'shadow' = 'all'): this {
    m.outerEdge().each((x, y) => {
      if (line === 'shadow' && !m.has(x - 1, y) && !m.has(x, y - 1)) return
      const under = this.shades.get(this.get(x, y))
      if (under) this.put(x, y, under.ramp[0] ?? 0, false)
    })
    return this
  }

  /** Paint one body part: contact line on whatever lies beneath its edge, then volume shading. */
  part(m: Mask, ramp: Ramp, o: PartOptions = {}): this {
    if (o.line !== 'none') this.contact(m, o.line ?? 'all')
    return this.shade(m, ramp, o)
  }

  /**
   * Ordered-dither gradient. `t(x, y)` returns the position along the ramp from 0 (first colour)
   * to 1 (last colour). `spread` 1 dithers the whole way, smaller values give flat bands with a
   * dithered seam, 0 gives hard bands. Pass `null` as mask to cover the whole picture.
   */
  dither(m: Mask | null, ramp: Ramp, t: (x: number, y: number) => number, spread = 1): this {
    const top = ramp.length - 1
    const one = (x: number, y: number) => {
      const v = Math.min(1, Math.max(0, t(x, y))) * top
      const i = Math.min(top, Math.floor(v))
      const f = v - i
      const g = spread <= 0 ? (f >= 0.5 ? 1 : 0) : (f - 0.5) / spread + 0.5
      this.put(x, y, ramp[Math.min(top, i + (g > bayer(x, y) ? 1 : 0))] ?? 0, false)
    }
    if (m) m.each(one)
    else for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) one(x, y)
    return this
  }

  /**
   * Recolour the edge pixels of a mask that face the given directions (default: all four).
   * Use it for outlines and bevels, e.g. `edge(panel, light, [-1, 0, 0, -1])`.
   */
  edge(m: Mask, c: RGB, dirs?: Points): this {
    return this.fill(m.facing(dirs), c)
  }

  /** Move painted pixels inside the mask along their ramp (negative = darker). */
  tone(m: Mask, steps: number): this {
    m.each((x, y) => {
      const s = this.shades.get(this.get(x, y))
      if (!s) return
      const i = Math.min(s.ramp.length - 1, Math.max(0, s.index + steps))
      this.put(x, y, s.ramp[i] ?? 0, false)
    })
    return this
  }

  /** Blend a colour over the painted pixels of a mask (glass plates, glows). Adds new colours. */
  veil(m: Mask, c: RGB, alpha: number): this {
    m.each((x, y) => {
      const o = (y * this.w + x) * 4
      if (this.data[o + 3] === 0) return
      this.data[o] = (this.data[o] ?? 0) * (1 - alpha) + ((c >> 16) & 255) * alpha
      this.data[o + 1] = (this.data[o + 1] ?? 0) * (1 - alpha) + ((c >> 8) & 255) * alpha
      this.data[o + 2] = (this.data[o + 2] ?? 0) * (1 - alpha) + (c & 255) * alpha
    })
    return this
  }

  /**
   * Hand-authored pixel grid, e.g. `stamp(['.w.', 'wkw'], x, y, { w: white, k: black })`.
   * Characters without a colour in `key` are skipped.
   */
  stamp(
    grid: readonly string[],
    x: number,
    y: number,
    key: Readonly<Record<string, RGB>>,
    flipX = false,
  ): this {
    grid.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = key[row[flipX ? row.length - 1 - i : i] ?? '']
        if (c !== undefined) this.put(x + i, y + j, c, true)
      }
    })
    return this
  }

  // ── passes and composition ────────────────────────────────────────────────

  /** Register a ramp so `tone` and contact lines can find darker shades of its colours. */
  register(ramp: Ramp): this {
    ramp.forEach((c, index) => {
      if (!this.shades.has(c)) this.shades.set(c, { ramp, index })
    })
    return this
  }

  /** Mask of all painted pixels. */
  mask(): Mask {
    const m = new Mask(this.w, this.h)
    for (let i = 0; i < m.bits.length; i++) if (this.data[i * 4 + 3] !== 0) m.bits[i] = 1
    return m
  }

  /** Mask of all pixels marked as foil. */
  foilMask(): Mask {
    const m = new Mask(this.w, this.h)
    for (let i = 0; i < m.bits.length; i++) if (((this.flags[i] ?? 0) & FOIL) !== 0) m.bits[i] = 1
    return m
  }

  private alone(x: number, y: number, c: RGB): boolean {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx !== 0 || dy !== 0) && this.get(x + dx, y + dy) === c) return false
    return true
  }

  /** Stray single pixels (no neighbour of the same colour) that are not hand-placed details. */
  orphans(within?: Mask): Pt[] {
    const out: Pt[] = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y)
        if (c === NONE || ((this.flags[y * this.w + x] ?? 0) & DETAIL) !== 0) continue
        if (within && !within.has(x, y)) continue
        if (this.alone(x, y, c)) out.push([x, y])
      }
    }
    return out
  }

  /**
   * Cleanup pass: gives every stray pixel left over by shading the most common colour around it.
   * Hand-placed details (`px`, `stamp`) are left alone.
   */
  cleanup(within?: Mask): this {
    for (let pass = 0; pass < 6; pass++) {
      const strays = this.orphans(within)
      if (strays.length === 0) break
      for (const [x, y] of strays) {
        const c = this.get(x, y)
        if (!this.alone(x, y, c)) continue
        const counts = new Map<RGB, number>()
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const n = this.get(x + dx, y + dy)
            if (n !== NONE && n !== c) counts.set(n, (counts.get(n) ?? 0) + (dx === 0 || dy === 0 ? 2 : 1))
          }
        }
        let best = NONE
        let bestCount = 0
        for (const [n, count] of counts) if (count > bestCount) [best, bestCount] = [n, count]
        if (best === NONE) continue
        const foil = this.foilOn
        this.foilOn = ((this.flags[y * this.w + x] ?? 0) & FOIL) !== 0
        this.put(x, y, best, false)
        this.foilOn = foil
      }
    }
    return this
  }

  /**
   * Draw the dark silhouette outline around everything painted so far and close single-pixel
   * holes. Returns the finished silhouette.
   */
  silhouette(c: RGB): Mask {
    this.fill(this.mask().outerEdge(), c)
    const outlined = this.mask()
    const closed = outlined.cleaned()
    this.fill(closed.clone().minus(outlined), c)
    return closed
  }

  /** Copy another painter onto this one (alpha 0–1 blends over existing paint). */
  blit(src: Painter, dx = 0, dy = 0, alpha = 1): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y)
        if (c === NONE) continue
        const tx = x + dx
        const ty = y + dy
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue
        const o = (ty * this.w + tx) * 4
        if (alpha >= 1 || this.data[o + 3] === 0) {
          const foil = this.foilOn
          const flag = src.flags[y * src.w + x] ?? 0
          this.foilOn = foil || (flag & FOIL) !== 0
          this.put(tx, ty, c, (flag & DETAIL) !== 0)
          this.foilOn = foil
        } else {
          this.data[o] = (this.data[o] ?? 0) * (1 - alpha) + ((c >> 16) & 255) * alpha
          this.data[o + 1] = (this.data[o + 1] ?? 0) * (1 - alpha) + ((c >> 8) & 255) * alpha
          this.data[o + 2] = (this.data[o + 2] ?? 0) * (1 - alpha) + (c & 255) * alpha
        }
      }
    }
    return this
  }

  /**
   * Finish a creature layer and put it into the scene: runs the cleanup pass, draws the dark
   * silhouette outline and composites the layer. The silhouette is remembered for the quality gate.
   */
  subject(layer: Painter, outline: RGB): this {
    layer.cleanup()
    this.subjectMask.or(layer.silhouette(outline))
    return this.blit(layer)
  }

  /** Nearest-neighbour upscale by an integer factor. */
  scaled(n: number): Painter {
    const out = new Painter(this.w * n, this.h * n)
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        const s = (Math.floor(y / n) * this.w + Math.floor(x / n)) * 4
        const d = (y * out.w + x) * 4
        for (let k = 0; k < 4; k++) out.data[d + k] = this.data[s + k] ?? 0
      }
    }
    return out
  }

  /** All distinct colours in the picture (transparent pixels are ignored). */
  colors(): Set<RGB> {
    const set = new Set<RGB>()
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y)
        if (c !== NONE) set.add(c)
      }
    }
    return set
  }
}
