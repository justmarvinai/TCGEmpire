import type { Points, Pt } from './path.ts'
import { pts, rng, spline } from './path.ts'

/**
 * A one-bit picture: the shape of a body part, a region to shade, a foil area.
 * Shape methods add pixels and return `this`, so shapes can be chained into one silhouette.
 */
export class Mask {
  readonly w: number
  readonly h: number
  readonly bits: Uint8Array

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.bits = new Uint8Array(w * h)
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.bits[y * this.w + x] === 1
  }

  add(x: number, y: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.bits[y * this.w + x] = 1
    return this
  }

  del(x: number, y: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.bits[y * this.w + x] = 0
    return this
  }

  clone(): Mask {
    const m = new Mask(this.w, this.h)
    m.bits.set(this.bits)
    return m
  }

  count(): number {
    let n = 0
    for (const b of this.bits) n += b
    return n
  }

  /** Call `fn` for every set pixel. */
  each(fn: (x: number, y: number) => void): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (this.bits[y * this.w + x] === 1) fn(x, y)
  }

  // ── shapes ────────────────────────────────────────────────────────────────

  rect(x: number, y: number, w: number, h: number): this {
    for (let j = Math.round(y); j < Math.round(y + h); j++)
      for (let i = Math.round(x); i < Math.round(x + w); i++) this.add(i, j)
    return this
  }

  /** Ellipse around (cx, cy), optionally rotated by `rot` degrees. */
  ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): this {
    const cos = Math.cos((rot * Math.PI) / 180)
    const sin = Math.sin((rot * Math.PI) / 180)
    const r = Math.ceil(Math.max(rx, ry)) + 1
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        const u = (dx * cos + dy * sin) / rx
        const v = (-dx * sin + dy * cos) / ry
        if (u * u + v * v <= 1) this.add(x, y)
      }
    }
    return this
  }

  disc(cx: number, cy: number, r: number): this {
    return this.ellipse(cx, cy, r, r)
  }

  /** Filled polygon (even-odd rule). */
  poly(points: Points): this {
    const list = pts(points)
    let minY = Infinity
    let maxY = -Infinity
    for (const p of list) {
      minY = Math.min(minY, p[1])
      maxY = Math.max(maxY, p[1])
    }
    const y0 = Math.max(0, Math.floor(minY))
    const y1 = Math.min(this.h - 1, Math.ceil(maxY))
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5
      const xs: number[] = []
      for (let i = 0; i < list.length; i++) {
        const a = list[i] ?? [0, 0]
        const b = list[(i + 1) % list.length] ?? [0, 0]
        if (a[1] <= cy !== b[1] <= cy) xs.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))
      }
      xs.sort((p, q) => p - q)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.ceil((xs[i] ?? 0) - 0.5)
        const to = Math.ceil((xs[i + 1] ?? 0) - 0.5)
        for (let x = from; x < to; x++) this.add(x, y)
      }
    }
    return this
  }

  /** Tapered capsule: a thick line from (x0, y0) with radius r0 to (x1, y1) with radius r1. */
  capsule(x0: number, y0: number, x1: number, y1: number, r0: number, r1 = r0): this {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t)
    }
    return this
  }

  /** Smooth limb through the points; `radii` gives the thickness at each point. */
  limb(points: Points, radii: number | readonly number[]): this {
    const per = 8
    const curve = spline(points, per)
    const last = pts(points).length - 1
    const radiusAt = (i: number) =>
      typeof radii === 'number' ? radii : (radii[Math.min(i, radii.length - 1)] ?? 1)
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i] ?? [0, 0]
      const b = curve[i + 1] ?? [0, 0]
      const seg = Math.min(last - 1, Math.floor(i / per))
      const t0 = i / per - seg
      const t1 = (i + 1) / per - seg
      const ra = radiusAt(seg) + (radiusAt(seg + 1) - radiusAt(seg)) * t0
      const rb = radiusAt(seg) + (radiusAt(seg + 1) - radiusAt(seg)) * t1
      this.capsule(a[0], a[1], b[0], b[1], ra, rb)
    }
    return this
  }

  /** One-pixel line between two pixels (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number): this {
    let x = Math.floor(x0)
    let y = Math.floor(y0)
    const ex = Math.floor(x1)
    const ey = Math.floor(y1)
    const dx = Math.abs(ex - x)
    const dy = -Math.abs(ey - y)
    const sx = x < ex ? 1 : -1
    const sy = y < ey ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.add(x, y)
      if (x === ex && y === ey) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
    return this
  }

  /** One-pixel polyline through the points (use with `quad`, `cubic` or `spline`). */
  path(points: Points): this {
    const list = pts(points)
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i] ?? [0, 0]
      const b = list[i + 1] ?? [0, 0]
      this.line(a[0], a[1], b[0], b[1])
    }
    return this
  }

  /** Organic lump: an ellipse with a wobbling edge (clouds, bushes, smoke, rock). */
  blob(cx: number, cy: number, rx: number, ry: number, seed: number, wobble = 0.18): this {
    const rand = rng(seed)
    const phases = [rand() * 6.283, rand() * 6.283, rand() * 6.283]
    const pts: Pt[] = []
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2
      const k =
        1 +
        wobble *
          (0.5 * Math.sin(2 * a + (phases[0] ?? 0)) +
            0.3 * Math.sin(3 * a + (phases[1] ?? 0)) +
            0.2 * Math.sin(5 * a + (phases[2] ?? 0)))
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
    }
    return this.poly(pts)
  }

  // ── set operations ────────────────────────────────────────────────────────

  or(m: Mask): this {
    for (let i = 0; i < this.bits.length; i++) if (m.bits[i] === 1) this.bits[i] = 1
    return this
  }

  and(m: Mask): this {
    for (let i = 0; i < this.bits.length; i++) if (m.bits[i] !== 1) this.bits[i] = 0
    return this
  }

  minus(m: Mask): this {
    for (let i = 0; i < this.bits.length; i++) if (m.bits[i] === 1) this.bits[i] = 0
    return this
  }

  invert(): this {
    for (let i = 0; i < this.bits.length; i++) this.bits[i] = this.bits[i] === 1 ? 0 : 1
    return this
  }

  // ── derived masks (all return a new mask) ─────────────────────────────────

  /** Copy moved by (dx, dy). */
  moved(dx: number, dy: number): Mask {
    const m = new Mask(this.w, this.h)
    this.each((x, y) => m.add(x + dx, y + dy))
    return m
  }

  /** Copy mirrored at the vertical line x = axis. */
  mirrored(axis: number): Mask {
    const m = new Mask(this.w, this.h)
    this.each((x, y) => m.add(Math.round(2 * axis) - 1 - x, y))
    return m
  }

  /** Copy grown by `n` pixels (4-neighbourhood). */
  grown(n = 1): Mask {
    let cur = this.clone()
    for (let k = 0; k < n; k++) {
      const next = cur.clone()
      cur.each((x, y) =>
        next
          .add(x - 1, y)
          .add(x + 1, y)
          .add(x, y - 1)
          .add(x, y + 1),
      )
      cur = next
    }
    return cur
  }

  /** Copy shrunk by `n` pixels (4-neighbourhood). Pixels beyond the canvas count as set. */
  shrunk(n = 1): Mask {
    let cur = this.clone()
    for (let k = 0; k < n; k++) {
      const src = cur
      const next = new Mask(this.w, this.h)
      const full = (x: number, y: number) => x < 0 || y < 0 || x >= src.w || y >= src.h || src.has(x, y)
      src.each((x, y) => {
        if (full(x - 1, y) && full(x + 1, y) && full(x, y - 1) && full(x, y + 1)) next.add(x, y)
      })
      cur = next
    }
    return cur
  }

  /**
   * Edge pixels of the mask whose neighbour in one of the given directions is outside
   * (default: all four directions). `facing([1, 0])` is the right-hand rim, for rim light.
   */
  facing(dirs: Points = [-1, 0, 1, 0, 0, -1, 0, 1]): Mask {
    const list = pts(dirs)
    const m = new Mask(this.w, this.h)
    this.each((x, y) => {
      if (list.some(([dx, dy]) => !this.has(x + dx, y + dy))) m.add(x, y)
    })
    return m
  }

  /** Pixels just outside the mask. */
  outerEdge(): Mask {
    return this.grown(1).minus(this)
  }

  /** Remove single stray pixels and fill single-pixel holes. */
  cleaned(): Mask {
    const m = this.clone()
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const n = +this.has(x - 1, y) + +this.has(x + 1, y) + +this.has(x, y - 1) + +this.has(x, y + 1)
        if (this.has(x, y) && n === 0) m.del(x, y)
        if (!this.has(x, y) && n === 4) m.add(x, y)
      }
    }
    return m
  }
}

/**
 * Distance from every set pixel to the nearest unset pixel (0 for unset pixels), exact
 * Euclidean (Felzenszwalb and Huttenlocher). The canvas border does not count as an edge, so
 * shapes cut off by the picture frame are shaded as if they continued.
 */
export function distanceField(m: Mask): Float32Array {
  const { w, h } = m
  const INF = 1e12
  const grid = new Float64Array(w * h)
  for (let i = 0; i < grid.length; i++) grid[i] = m.bits[i] === 1 ? INF : 0
  const n = Math.max(w, h)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  const pass = (len: number) => {
    const meet = (p: number, q: number) => ((f[q] ?? 0) + q * q - ((f[p] ?? 0) + p * p)) / (2 * q - 2 * p)
    let k = 0
    v[0] = 0
    z[0] = -Infinity
    z[1] = Infinity
    for (let q = 1; q < len; q++) {
      let s = meet(v[k] ?? 0, q)
      while (s <= (z[k] ?? 0)) {
        k--
        s = meet(v[k] ?? 0, q)
      }
      k++
      v[k] = q
      z[k] = s
      z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < len; q++) {
      while ((z[k + 1] ?? Infinity) < q) k++
      const p = v[k] ?? 0
      d[q] = (q - p) * (q - p) + (f[p] ?? 0)
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x] ?? 0
    pass(h)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y] ?? 0
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x] ?? 0
    pass(w)
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(Math.min(d[x] ?? 0, INF))
  }
  return out
}
