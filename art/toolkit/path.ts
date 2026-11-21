/**
 * Point lists in continuous coordinates: pixel `i` covers the range [i, i + 1), so the centre
 * of pixel (3, 5) is (3.5, 5.5). Shapes are filled where a pixel centre lies inside.
 */
export type Pt = readonly [number, number];

/** Seeded random numbers (mulberry32), so every build draws the same picture. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quadratic bezier from p0 to p1 with control point c, as `n + 1` points. */
export function quad(p0: Pt, c: Pt, p1: Pt, n = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return out;
}

/** Cubic bezier as `n + 1` points. */
export function cubic(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * c0[0] + c * c1[0] + d * p1[0], a * p0[1] + b * c0[1] + c * c1[1] + d * p1[1]]);
  }
  return out;
}

/** Smooth Catmull-Rom curve through all points, `n` samples per segment. */
export function spline(pts: readonly Pt[], n = 6): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => pts[Math.min(pts.length - 1, Math.max(0, i))] ?? [0, 0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(at(pts.length - 1));
  return out;
}

export interface Transform {
  /** Origin of rotation, scaling and flipping. */
  ox?: number;
  oy?: number;
  /** Rotation in degrees, clockwise on screen. */
  rot?: number;
  scale?: number;
  flipX?: boolean;
  /** Translation applied last. */
  dx?: number;
  dy?: number;
}

/** Flip, scale and rotate points around an origin, then move them. */
export function xf(pts: readonly Pt[], t: Transform): Pt[] {
  const { ox = 0, oy = 0, rot = 0, scale = 1, flipX = false, dx = 0, dy = 0 } = t;
  const cos = Math.cos((rot * Math.PI) / 180);
  const sin = Math.sin((rot * Math.PI) / 180);
  return pts.map(([px, py]) => {
    const x = (flipX ? ox - px : px - ox) * scale;
    const y = (py - oy) * scale;
    return [ox + dx + x * cos - y * sin, oy + dy + x * sin + y * cos] as const;
  });
}
