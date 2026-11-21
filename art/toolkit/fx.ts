import type { RGB, Ramp } from './color.ts'
import { Mask } from './mask.ts'
import type { Painter } from './painter.ts'
import type { Pt } from './path.ts'
import { cubic, rng } from './path.ts'

export interface Region {
  x: number
  y: number
  w: number
  h: number
}

/** Vertical sky gradient from the first ramp colour (top) to the last (bottom of the region). */
export function sky(p: Painter, ramp: Ramp, top = 0, bottom = p.h, spread = 0.7): void {
  p.dither(
    p.m().rect(0, top, p.w, bottom - top),
    ramp,
    (_x, y) => (y - top) / Math.max(1, bottom - top - 1),
    spread,
  )
}

/**
 * Every second wedge of a burst of `count` rays around a centre, as a mask. Fill it, or `tone`
 * it one step lighter, for the classic sunburst behind trainers, items and logos.
 */
export function rays(p: Painter, cx: number, cy: number, count: number, turn = 0): Mask {
  const m = p.m()
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const angle = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) / (Math.PI * 2) + 1 + turn
      if (Math.floor(angle * count * 2) % 2 === 0) m.add(x, y)
    }
  }
  return m
}

/** Single-pixel stars and a few small crosses, scattered over a region. */
export function stars(p: Painter, rand: () => number, count: number, colors: Ramp, region: Region): void {
  for (let i = 0; i < count; i++) {
    const x = region.x + Math.floor(rand() * region.w)
    const y = region.y + Math.floor(rand() * region.h)
    const c = colors[Math.floor(rand() * colors.length)] ?? 0
    p.px(x, y, c)
    if (rand() < 0.15)
      p.px(x - 1, y, c)
        .px(x + 1, y, c)
        .px(x, y - 1, c)
        .px(x, y + 1, c)
  }
}

/** Rising embers: single pixels and short vertical streaks. */
export function sparks(p: Painter, rand: () => number, count: number, colors: Ramp, region: Region): void {
  for (let i = 0; i < count; i++) {
    const x = region.x + Math.floor(rand() * region.w)
    const y = region.y + Math.floor(rand() * region.h)
    const c = colors[Math.floor(rand() * colors.length)] ?? 0
    p.px(x, y, c)
    if (rand() < 0.35) p.px(x, y + 1, colors[0] ?? c)
  }
}

export interface FlameShape {
  /** Horizontal offset of the tip against the base. */
  lean?: number
  /** Extra tongues left and right of the main one. */
  tongues?: number
  seed?: number
}

/** Flame silhouette standing on (x, y): a round base with curling, pointed tongues. */
export function flameMask(
  p: Painter,
  x: number,
  y: number,
  width: number,
  height: number,
  shape: FlameShape = {},
): Mask {
  const { lean = 0, tongues = 2, seed = 1 } = shape
  const rand = rng(seed)
  const m = p.m()
  const tongue = (cx: number, w: number, h: number, tip: number) => {
    const left = cubic(
      [cx - w / 2, y - w * 0.3],
      [cx - w * 0.75, y - h * 0.35],
      [cx + tip * 0.2 - w * 0.2, y - h * 0.6],
      [cx + tip, y - h],
      10,
    )
    const right = cubic(
      [cx + tip, y - h],
      [cx + tip * 0.6 + w * 0.3, y - h * 0.55],
      [cx + w * 0.75, y - h * 0.3],
      [cx + w / 2, y - w * 0.3],
      10,
    )
    m.poly([...left, ...right])
    m.ellipse(cx, y - w * 0.3, w / 2, w * 0.36)
  }
  tongue(x, width * 0.8, height, lean)
  for (let i = 0; i < tongues; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const off = side * width * (0.2 + 0.12 * Math.floor(i / 2))
    tongue(x + off, width * 0.5, height * (0.45 + rand() * 0.25), lean * 0.5 + side * width * 0.18)
  }
  return m.cleaned()
}

export interface FireOptions {
  /** How far each inner layer moves towards the hot core. */
  dx?: number
  dy?: number
  /** Pixels each layer shrinks. */
  step?: number
}

/** Paint a flame or glow as nested layers: ramp[0] on the outside, the last colour in the core. */
export function fire(p: Painter, m: Mask, ramp: Ramp, o: FireOptions = {}): void {
  const { dx = 0, dy = 1, step = 1 } = o
  let cur = m
  ramp.forEach((c, i) => {
    if (i > 0) cur = cur.shrunk(step).moved(dx, dy).and(m).cleaned()
    p.fill(cur, c)
  })
}

export interface LightningOptions {
  seed?: number
  /** Sideways displacement of the zigzag in pixels. */
  jag?: number
  /** Colour of the halo around the bolt, if any. */
  glow?: RGB
}

/** Jagged bolt from `from` to `to`. Returns the points of the bolt so branches can start on it. */
export function lightning(p: Painter, from: Pt, to: Pt, core: RGB, o: LightningOptions = {}): Pt[] {
  const { seed = 1, jag = 3, glow } = o
  const rand = rng(seed)
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const n = Math.max(2, Math.round(len / 4))
  const nx = -(to[1] - from[1]) / len
  const ny = (to[0] - from[0]) / len
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const off = i === 0 || i === n ? 0 : (i % 2 === 0 ? 1 : -1) * jag * (0.5 + rand() * 0.5)
    pts.push([from[0] + (to[0] - from[0]) * t + nx * off, from[1] + (to[1] - from[1]) * t + ny * off])
  }
  const bolt = new Mask(p.w, p.h).path(pts)
  if (glow !== undefined) p.fill(bolt.outerEdge(), glow)
  p.fill(bolt, core)
  return pts
}

function lattice(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise in 0–1 for cloudy textures; `scale` is the size of one lump in pixels. */
export function noise(x: number, y: number, seed: number, scale: number): number {
  const fx = x / scale
  const fy = y / scale
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix))
  const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy))
  const top = lattice(ix, iy, seed) + (lattice(ix + 1, iy, seed) - lattice(ix, iy, seed)) * sx
  const bottom = lattice(ix, iy + 1, seed) + (lattice(ix + 1, iy + 1, seed) - lattice(ix, iy + 1, seed)) * sx
  return top + (bottom - top) * sy
}
