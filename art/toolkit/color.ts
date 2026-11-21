/** Colours are 0xRRGGBB numbers. `NONE` marks a transparent pixel. */
export type RGB = number;
export const NONE = -1;

/** A ramp lists the shades of one material, darkest first. */
export type Ramp = readonly RGB[];

export function hex(s: string): RGB {
  return parseInt(s.replace('#', ''), 16);
}

/** Parse space-separated hex codes into a ramp (darkest first). */
export function colors(list: string): RGB[] {
  return list.trim().split(/\s+/).map(hex);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const ch = (shift: number) => {
    const va = (a >> shift) & 255;
    const vb = (b >> shift) & 255;
    return Math.round(va + (vb - va) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

export function toHsl(c: RGB): [number, number, number] {
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

export function fromHsl(h: number, s: number, l: number): RGB {
  const sat = Math.min(1, Math.max(0, s));
  const lum = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = lum - c / 2;
  const [r, g, b] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255);
  return (to(r) << 16) | (to(g) << 8) | to(b);
}

/** Move hue `h` by at most `deg` degrees towards `target`, on the short way round. */
function hueTowards(h: number, target: number, deg: number): number {
  const diff = ((target - h + 540) % 360) - 180;
  return h + Math.sign(diff) * Math.min(Math.abs(diff), deg);
}

/**
 * Build a hue-shifted ramp around a base colour. The base sits one step below the top;
 * shadows drift towards violet-blue and gain saturation, highlights drift towards yellow.
 */
export function ramp(base: RGB, steps = 4, hueShift = 14): RGB[] {
  const [h, s, l] = toHsl(base);
  const baseIndex = Math.max(0, steps - 2);
  const out: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const k = i - baseIndex;
    if (k === 0) out.push(base);
    else if (k < 0) out.push(fromHsl(hueTowards(h, 265, hueShift * -k), s + 0.05 * -k, l * Math.pow(0.72, -k)));
    else out.push(fromHsl(hueTowards(h, 55, hueShift * k), s - 0.04 * k, l + (1 - l) * 0.42 * k));
  }
  return out;
}
