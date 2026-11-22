import type { Mask, Painter, Ramp, RGB } from '../toolkit/index.ts'
import { colors, fire, flameMask, hex, mix, ramp, rng, sky, sparks, stars } from '../toolkit/index.ts'
import type { Shape } from './shape.ts'
import { INK, Kit, palette } from './shape.ts'
import { Stage, place } from './stage.ts'

/**
 * Runes and landscapes.
 *
 * Rune spec: { rune: true } — a glowing rune stone with the glyph of the card's domain (Fury,
 * Calm, Mind, Body, Chaos, Order) floating over the domain scene; `glyph` picks another domain's
 * glyph, `s` the size.
 *
 * Landscape spec: { land: 'kind' } — a scene without a figure, for Riftbound battlefields and
 * Yu-Gi-Oh! field spells. The main landform is the subject (it gets the silhouette outline).
 *   peak (mountain summit with a star halo) | rift (purple void tear in desert rock) | warrens
 *   (pipes, walkways and chem lamps) | forest | wasteland (bones and rock spires) | mountain (twin
 *   peaks over clouds) | plains (grassland with banners) | sea (wave and fins) | void (dark mist with eyes)
 *   `v` 1 = the night version of peak, forest, plains and sea.
 */
export type Domain = 'Fury' | 'Calm' | 'Mind' | 'Body' | 'Chaos' | 'Order'
export type Land = 'peak' | 'rift' | 'warrens' | 'forest' | 'wasteland' | 'mountain' | 'plains' | 'sea' | 'void'

export interface RuneArt {
  rune: true
  glyph?: Domain
  s?: number
}

export interface LandArt {
  land: Land
  v?: 0 | 1
}

/** Glow ramps of the domains, outside first. */
const GLOW: Readonly<Record<Domain, Ramp>> = {
  Fury: colors('a01818', 'f04a2a', 'ffb070', 'fff0d0'),
  Calm: colors('1e7a3a', '4ac060', 'a8f0a0', 'f0fff0'),
  Mind: colors('1a4aa8', '3a8ae0', 'a0d0ff', 'f0f8ff'),
  Body: colors('a8481a', 'f08a2a', 'ffc878', 'fff4e0'),
  Chaos: colors('5a1a90', '9a4ad0', 'd8a0f8', 'fbeeff'),
  Order: colors('a87810', 'f0c838', 'fff0a0', 'fffcf0'),
}

export function isDomain(s: string | undefined): s is Domain {
  return s !== undefined && s in GLOW
}

/** The glyph of a domain, about 14 units tall, centred on (0, 0). */
function glyph(k: Kit, d: Domain): Shape {
  const sh = k.m()
  switch (d) {
    case 'Fury': {
      const [x, y] = k.m().pt(0, 6)
      sh.mask.or(flameMask(k.d, x, y, 9 * k.at.s, 14 * k.at.s, { lean: 1, tongues: 2, seed: 4 }))
      return sh
    }
    case 'Calm':
      return sh.e(0, 0, 4, 7, 30).minus(k.m().line(-3, 5, 3, -5))
    case 'Mind':
      return sh.c(0, 4.4, 7).and(k.m().c(0, -4.4, 7)).minus(k.m().c(0, 0, 2.2)).c(0, 0, 1)
    case 'Body':
      return sh.p(-6.5, 5.5, 0, -6.5, 6.5, 5.5).minus(k.m().p(-3.2, 3.6, 0, -2.4, 3.2, 3.6)).c(0, 1.6, 1)
    case 'Chaos': {
      const pts: number[] = []
      for (let i = 0; i <= 16; i++) {
        const a = (i * 40 * Math.PI) / 180
        pts.push(Math.cos(a) * (0.6 + i * 0.4), Math.sin(a) * (0.6 + i * 0.4))
      }
      return sh.l(pts, 0.9)
    }
    case 'Order':
      return sh.p(0, -7.5, 2, -2, 7.5, 0, 2, 2, 0, 7.5, -2, 2, -7.5, 0, -2, -2)
  }
}

/** A rune stone floating in the middle of the picture, the domain glyph glowing on it. */
export function runeArt(p: Painter, art: RuneArt, domain: Domain, brighten: (m: Mask) => void, shine: boolean, cover = 0): void {
  const d = art.glyph ?? domain
  const glow = GLOW[d]
  const stone = ramp(mix(glow[1] ?? INK, hex('545866'), 0.72), 3)
  const pal = palette('545866')
  place(
    p,
    (layer, x, y, s) => {
      const k = new Kit(layer, { x, y, s, flip: false, rot: 0 }, pal)
      for (const [fx, fy, r] of [[-14, 9, 2.6], [13, 11, 2], [12, -12, 1.6]] as const) k.part(k.m().e(fx, fy, r * 1.2, r), stone, { bevel: 1.5 })
      const body = k.part(k.m().p(-8, -10, -3, -15, 4, -14.5, 9, -9, 8.5, 9, 2, 14, -6, 13, -9, 7), stone, { bevel: 4 })
      const g = glyph(k, d).and(body.mask.shrunk(2))
      layer.fill(g.mask.grown(1).and(body.mask), stone[0] ?? INK)
      fire(layer, g.mask, glow.slice(1), { step: 1, dy: 0 })
    },
    {
      s: art.s ?? 1,
      line: mix(stone[0] ?? INK, INK, 0.5),
      anchor: 'mid',
      shine,
      cover,
      whole: true,
      under(box, s) {
        const cx = (box.x0 + box.x1 + 1) / 2
        const cy = (box.y0 + box.y1 + 1) / 2
        const r = Math.max(box.w, box.h) * 0.6
        brighten(p.m().disc(cx, cy, r))
        brighten(p.m().disc(cx, cy, r * 0.7))
        sparks(p, rng(5), Math.round(10 * s), [glow[1] ?? INK, glow[2] ?? INK], { x: box.x0 - 4, y: box.y0 - 4, w: box.w + 8, h: box.h + 8 })
      },
    },
  )
}

// ── landscapes ──────────────────────────────────────────────────────────────

interface Scape {
  sky: Ramp
  ground?: Ramp
  /** Behind the landform. */
  back?(p: Painter, st: Stage): void
  /** The landform on its own layer: the subject. Returns its outline colour. */
  form(d: Painter, st: Stage): RGB
  /** In front of the landform. */
  front?(p: Painter, st: Stage): void
}

const cloudBank = (p: Painter, st: Stage, y: number, c: Ramp, seed: number) => {
  const m = p.m()
  for (let i = 0; i < 6; i++) m.blob(st.x(i * 13 + (seed % 5)), st.y(y + (i % 2) * 2), st.x(9), st.y(3.6), seed + i)
  p.fill(m, c[1] ?? 0)
  p.fill(m.clone().minus(m.moved(0, -1)), c[2] ?? 0)
}

const SCAPES: Readonly<Record<Land, readonly [Scape, Scape]>> = {
  peak: [
    {
      sky: colors('101838', '2a3a78', '7a6ab0'),
      back(p, st) {
        stars(p, rng(3), st.n(18), colors('e8e8ff', 'b0b8f0'), { x: 2, y: 2, w: p.w - 4, h: st.g })
      },
      form(d, st) {
        const rock = colors('2e2e4a', '4a4a70', '76769e')
        d.part(d.m().poly(st.pts([2, 49, 28, 6, 34, 2, 40, 7, 66, 49])), rock, { bevel: 6 })
        d.part(d.m().poly(st.pts([24, 14, 28, 6, 34, 2, 40, 7, 45, 15, 40, 13, 36, 17, 31, 12, 27, 16])), colors('a8b0d0', 'dce2f4', 'ffffff'), { bevel: 2 })
        return hex('141428')
      },
      front(p, st) {
        cloudBank(p, st, 33, colors('6a6aa0', 'b8b8e0', 'e8e8ff'), 2)
        p.stamp(['..w..', '..w..', 'wwwww', '..w..', '..w..'], Math.round(st.x(34) - 2), Math.round(st.y(2) - 1), { w: hex('fffbe0') })
        p.stamp(['k', 'k', 'k'], Math.round(st.x(46)), Math.round(st.y(18)), { k: INK })
      },
    },
    {
      sky: colors('e07a4a', 'f0b070', 'fce0a8'),
      form(d, st) {
        d.part(d.m().poly(st.pts([2, 49, 28, 6, 34, 2, 40, 7, 66, 49])), colors('6a3a4a', '9a5a5a', 'c88a70'), { bevel: 6 })
        d.part(d.m().poly(st.pts([24, 14, 28, 6, 34, 2, 40, 7, 45, 15, 40, 13, 36, 17, 31, 12, 27, 16])), colors('e8c0b0', 'fbe4d4', 'ffffff'), { bevel: 2 })
        return hex('3a1a24')
      },
      front(p, st) {
        cloudBank(p, st, 33, colors('c87a6a', 'f0b8a0', 'fff0e0'), 4)
      },
    },
  ],
  rift: [
    {
      sky: colors('3a1a3a', '8a4a5a', 'e0a070'),
      ground: colors('c08a5a', '9a6a44'),
      form(d, st) {
        const wall = d.m().poly(st.pts([0, 36, 4, 12, 16, 8, 30, 10, 44, 6, 58, 11, 68, 9, 68, 36]))
        d.part(wall, colors('5a3a30', '8a5a44', 'b8845c'), { bevel: 3 })
        const tear = d.m().poly(st.pts([33, 7, 37, 14, 34, 18, 39, 25, 35, 30, 37, 36, 30, 36, 32, 29, 28, 23, 32, 17, 29, 12]))
        d.fill(tear.grown(1), hex('2a0a2a'))
        fire(d, tear, colors('5a1a7a', '9a3ad0', 'd890ff', 'fbe8ff'), { step: 1, dx: 0, dy: 0 })
        for (const [x, y, dir] of [[30, 16, -1], [38, 24, 1], [31, 30, -1]] as const) {
          d.part(d.m().limb(st.pts([x, y, x + dir * 5, y - 2, x + dir * 8, y + 1]), [st.r(1.2), st.r(0.9), st.r(0.4)]), colors('3a0a4a', '6a1a8a', 'a04ad0'), { bevel: 1 })
        }
        return hex('2a140e')
      },
    },
    {
      sky: colors('120618', '2a0e34', '4a1a50'),
      ground: colors('3a2a3a', '241a26'),
      back(p, st) {
        stars(p, rng(8), st.n(12), colors('d8a8ff'), { x: 2, y: 2, w: p.w - 4, h: st.y(14) })
      },
      form(d, st) {
        const wall = d.m().poly(st.pts([0, 36, 4, 12, 16, 8, 30, 10, 44, 6, 58, 11, 68, 9, 68, 36]))
        d.part(wall, colors('2a1e2e', '44324a', '64506a'), { bevel: 3 })
        const tear = d.m().poly(st.pts([33, 7, 37, 14, 34, 18, 39, 25, 35, 30, 37, 36, 30, 36, 32, 29, 28, 23, 32, 17, 29, 12]))
        d.fill(tear.grown(1), hex('1a0620'))
        fire(d, tear, colors('5a1a7a', '9a3ad0', 'd890ff', 'fbe8ff'), { step: 1, dx: 0, dy: 0 })
        return hex('120a14')
      },
    },
  ],
  warrens: [
    {
      sky: colors('0e1a14', '1a3326', '2e5a3e'),
      ground: colors('1a2a22', '101a16'),
      form(d, st) {
        const rust = colors('4a2a1a', '8a4a2a', 'c07a4a')
        const iron = colors('2a3036', '4a545c', '78848c')
        d.part(d.m().limb(st.pts([10, 0, 10, 40]), st.r(3.2)).limb(st.pts([56, 0, 56, 40]), st.r(2.6)), rust, { bevel: 2 })
        d.part(d.m().limb(st.pts([0, 14, 30, 14, 36, 20, 68, 20]), st.r(2.2)), rust, { bevel: 1.5 })
        for (const y of [27, 36]) {
          d.part(d.m().rect(0, st.y(y), d.w, Math.max(2, st.y(2.2))), iron, { bevel: 1 })
          const rail = d.m().rect(0, st.y(y - 4), d.w, 1)
          for (let x = 2; x < 68; x += 6) rail.rect(st.x(x), st.y(y - 4), 1, st.y(4))
          d.fill(rail, iron[0] ?? INK)
        }
        return hex('0a0e0c')
      },
      front(p, st) {
        for (const [x, y] of [[20, 8], [44, 4], [32, 24], [62, 26]] as const) {
          p.fill(p.m().rect(st.x(x), 0, 1, st.y(y)), hex('2a3036'))
          p.fill(p.m().disc(st.x(x) + 0.5, st.y(y) + 1.5, st.r(2)), hex('3ac060'))
          p.fill(p.m().disc(st.x(x) + 0.5, st.y(y) + 1.5, st.r(1)), hex('c8ffc0'))
        }
        p.fill(p.m().path(st.pts([14, 6, 30, 9, 52, 5])), hex('2a3036'))
        for (const [x, c] of [[19, 'c0a0d0'], [26, 'e0d0a0'], [40, 'a0c0e0']] as const) p.fill(p.m().rect(st.x(x), st.y(7.5), st.x(3), st.y(4)), hex(c))
        p.dither(p.m().rect(0, st.y(39), p.w, p.h - st.y(39)), colors('1a3326', '3a6a4e'), (_x, y) => (y - st.y(39)) / Math.max(1, p.h - st.y(39)), 1)
      },
    },
    {
      sky: colors('1a1a0e', '33331a', '5a5a2e'),
      ground: colors('2a2a1a', '1a1a10'),
      form(d, st) {
        const rust = colors('4a2a1a', '8a4a2a', 'c07a4a')
        d.part(d.m().limb(st.pts([10, 0, 10, 40]), st.r(3.2)).limb(st.pts([56, 0, 56, 40]), st.r(2.6)).limb(st.pts([0, 14, 30, 14, 36, 20, 68, 20]), st.r(2.2)), rust, { bevel: 2 })
        d.part(d.m().rect(0, st.y(30), d.w, Math.max(2, st.y(2.2))), colors('2a3036', '4a545c', '78848c'), { bevel: 1 })
        return hex('0a0e0c')
      },
    },
  ],
  forest: [
    {
      sky: colors('6ab0d8', 'a6d4e8', 'dcf0e8'),
      ground: colors('4a8a38', '346a2a'),
      back(p, st) {
        const far = p.m()
        for (let i = 0; i < 6; i++) far.blob(st.x(i * 13 + 4), st.y(24), st.x(9), st.y(9), 20 + i)
        p.fill(far, hex('5a9a6a'))
      },
      form(d, st) {
        const bark = colors('3a2414', '6a4428', '9a6a40')
        for (const [x, w] of [[12, 7], [36, 9], [58, 6]] as const) d.part(d.m().poly(st.pts([x - w / 2, 0, x + w / 2, 0, x + w / 2 + 2, 36, x - w / 2 - 2, 36])), bark, { bevel: 3 })
        const leaves = d.m().blob(st.x(12), st.y(3), st.x(16), st.y(9), 4).blob(st.x(38), st.y(1), st.x(18), st.y(8), 5).blob(st.x(62), st.y(4), st.x(12), st.y(9), 6)
        d.part(leaves, colors('1e5a24', '357a34', '5aa048'), { bevel: 4 })
        return hex('14200e')
      },
      front(p, st) {
        const bush = p.m().blob(st.x(4), st.y(36), st.x(12), st.y(5), 9).blob(st.x(62), st.y(37), st.x(12), st.y(5), 10)
        p.fill(bush, hex('2a6a2a'))
        for (const [x, y] of [[3, 35], [60, 36]] as const) p.stamp(['y.y'], Math.round(st.x(x)), Math.round(st.y(y)), { y: hex('f8e858') })
      },
    },
    {
      sky: colors('0e1a2a', '1a2e44', '2e4a5e'),
      ground: colors('1e3a22', '142a18'),
      back(p, st) {
        disc(p, st.x(50), st.y(10), st.r(5), colors('c8d0b0', 'f4f0d8'))
      },
      form(d, st) {
        for (const [x, w] of [[12, 7], [36, 9], [58, 6]] as const) d.part(d.m().poly(st.pts([x - w / 2, 0, x + w / 2, 0, x + w / 2 + 2, 36, x - w / 2 - 2, 36])), colors('1a1414', '3a2a24', '5a463a'), { bevel: 3 })
        d.part(d.m().blob(st.x(12), st.y(3), st.x(16), st.y(9), 4).blob(st.x(62), st.y(4), st.x(12), st.y(9), 6), colors('0e2a18', '1e4428', '2e6038'), { bevel: 4 })
        return hex('080e0a')
      },
      front(p, st) {
        for (const [x, y] of [[4, 36], [24, 38], [47, 35], [62, 37]] as const) p.stamp(['y.y'], Math.round(st.x(x)), Math.round(st.y(y)), { y: hex('f8e858') })
      },
    },
  ],
  wasteland: [
    {
      sky: colors('e0a830', 'f0cc68', 'fce8b0'),
      ground: colors('c89a58', 'a87a40'),
      form(d, st) {
        const rock = colors('7a4a2a', 'a86a3a', 'd09a60')
        d.part(d.m().poly(st.pts([4, 34, 7, 10, 10, 7, 13, 12, 16, 34])).poly(st.pts([50, 34, 53, 16, 57, 13, 60, 18, 63, 34])), rock, { bevel: 2 })
        const bone = colors('a8987a', 'e0d4b8', 'fff8e8')
        for (let i = 0; i < 4; i++) d.part(d.m().limb(st.pts([26 + i * 4, 38, 24 + i * 4.4, 30, 28 + i * 4.6, 25]), st.r(0.9)), bone, { bevel: 1 })
        d.part(d.m().limb(st.pts([24, 38, 44, 38]), st.r(1.2)).ellipse(st.x(46), st.y(36), st.x(3.5), st.y(2.6)), bone, { bevel: 1 })
        return hex('3a2412')
      },
      front(p, st) {
        p.fill(p.m().path(st.pts([2, 42, 10, 40, 16, 44])).path(st.pts([46, 44, 54, 41, 60, 45, 66, 43])), hex('8a5a30'))
      },
    },
    {
      sky: colors('5a2440', 'a4404a', 'e88a58'),
      ground: colors('7a4a30', '5a3424'),
      form(d, st) {
        d.part(d.m().poly(st.pts([4, 34, 7, 10, 10, 7, 13, 12, 16, 34])).poly(st.pts([50, 34, 53, 16, 57, 13, 60, 18, 63, 34])), colors('3a1e22', '5a2e2a', '7a4234'), { bevel: 2 })
        for (let i = 0; i < 4; i++) d.part(d.m().limb(st.pts([26 + i * 4, 38, 24 + i * 4.4, 30, 28 + i * 4.6, 25]), st.r(0.9)), colors('a8887a', 'd8c0b0', 'f8ece0'), { bevel: 1 })
        return hex('1e0e10')
      },
    },
  ],
  mountain: [
    {
      sky: colors('2a5a9a', '5a8ac8', 'b8d8f0'),
      form(d, st) {
        const rock = colors('3a4a6a', '5a6a8a', '8a9ab4')
        d.part(d.m().poly(st.pts([0, 40, 18, 6, 24, 10, 38, 40])).poly(st.pts([26, 40, 46, 2, 52, 7, 68, 32, 68, 40])), rock, { bevel: 4 })
        const snow = colors('a8b8d8', 'e0eaf8', 'ffffff')
        d.part(d.m().poly(st.pts([13, 15, 18, 6, 24, 10, 22, 14, 19, 12, 16, 16])).poly(st.pts([40, 13, 46, 2, 52, 7, 55, 13, 51, 11, 47, 15, 43, 12])), snow, { bevel: 2 })
        return hex('141c2e')
      },
      front(p, st) {
        cloudBank(p, st, 34, colors('8aa4c8', 'd8e4f4', 'ffffff'), 3)
        for (const [x, y] of [[30, 8], [60, 16]] as const) p.stamp(['k.k', '.k.'], Math.round(st.x(x)), Math.round(st.y(y)), { k: hex('1a1a2a') })
      },
    },
    {
      sky: colors('1a1438', '3a2a6a', '8a5a9a'),
      form(d, st) {
        d.part(d.m().poly(st.pts([0, 40, 18, 6, 24, 10, 38, 40])).poly(st.pts([26, 40, 46, 2, 52, 7, 68, 32, 68, 40])), colors('1e1a30', '34304e', '524c70'), { bevel: 4 })
        return hex('0a0814')
      },
      front(p, st) {
        cloudBank(p, st, 34, colors('4a3a6a', '7a6a9a', 'b0a0c8'), 3)
      },
    },
  ],
  plains: [
    {
      sky: colors('4a9ae0', '8ac4f0', 'd8f0ff'),
      back(p, st) {
        cloudBank(p, st, 10, colors('b8d8f0', 'e8f4ff', 'ffffff'), 6)
      },
      form(d, st) {
        d.part(d.m().ellipse(st.x(14), st.y(42), st.x(30), st.y(14)).ellipse(st.x(54), st.y(44), st.x(28), st.y(12)), colors('3a8a2a', '5aac3a', '8ad058'), { bevel: 6 })
        for (const [x, top] of [[8, 18], [56, 22]] as const) {
          d.fill(d.m().rect(st.x(x), st.y(top), 1, st.y(36 - top)), hex('5a3a22'))
          d.part(d.m().poly(st.pts([x + 0.5, top, x + 9, top + 1.5, x + 7, top + 3.5, x + 9, top + 5.5, x + 0.5, top + 6])), colors('8a1a24', 'd0303a', 'f07070'), { bevel: 1 })
        }
        return hex('16300e')
      },
    },
    {
      sky: colors('1a2048', '3a3a78', 'e0886a'),
      form(d, st) {
        d.part(d.m().ellipse(st.x(14), st.y(42), st.x(30), st.y(14)).ellipse(st.x(54), st.y(44), st.x(28), st.y(12)), colors('1e3a2a', '2e5236', '4a7048'), { bevel: 6 })
        return hex('0a140c')
      },
    },
  ],
  sea: [
    {
      sky: colors('5aa8e8', '98d0f4', 'e0f4ff'),
      back(p, st) {
        p.fill(p.m().ellipse(st.x(56), st.y(25), st.x(8), st.y(3)), hex('6a9a6a'))
        p.fill(p.m().rect(0, st.y(25), p.w, p.h), hex('2a78c8'))
      },
      form(d, st) {
        const water = colors('1a4a9a', '2a78c8', '7ac0f0')
        d.part(d.m().poly(st.pts([0, 48, 0, 30, 10, 26, 22, 22, 32, 24, 38, 30, 34, 32, 40, 36, 68, 36, 68, 48])), water, { bevel: 4 })
        d.part(d.m().limb(st.pts([10, 27, 22, 23, 32, 25, 37, 30, 34, 32]), st.r(1.2)), colors('a8d8f0', 'e8f8ff', 'ffffff'), { bevel: 1 })
        for (const x of [48, 58]) d.part(d.m().poly(st.pts([x, 36, x + 3, 29, x + 5, 36])), colors('2a3a4a', '4a5a6a', '7a8a9a'), { bevel: 1 })
        return hex('0a1a3a')
      },
    },
    {
      sky: colors('0c1636', '1a2f5e', '2e5288'),
      back(p, st) {
        stars(p, rng(14), st.n(14), colors('dfe8ff'), { x: 2, y: 2, w: p.w - 4, h: st.y(18) })
        p.fill(p.m().rect(0, st.y(25), p.w, p.h), hex('123672'))
      },
      form(d, st) {
        d.part(d.m().poly(st.pts([0, 48, 0, 30, 10, 26, 22, 22, 32, 24, 38, 30, 34, 32, 40, 36, 68, 36, 68, 48])), colors('0e2a5a', '1a4a8a', '4a7ab8'), { bevel: 4 })
        return hex('060e24')
      },
    },
  ],
  void: [
    {
      sky: colors('08040e', '160a24', '2a1440'),
      form(d, st) {
        const mist = d.m()
        for (let i = 0; i < 7; i++) mist.blob(st.x(4 + i * 10), st.y(30 + (i % 3) * 3), st.x(10), st.y(6), 30 + i)
        d.part(mist, colors('2a1440', '4a2468', '7a4a9a'), { bevel: 4 })
        return hex('06020a')
      },
      front(p, st) {
        for (const [x, y] of [[14, 14], [48, 10], [34, 22]] as const) p.stamp(['rr.rr'], Math.round(st.x(x)), Math.round(st.y(y)), { r: hex('f04a4a') })
        for (const [x, y] of [[8, 26], [58, 24], [28, 6]] as const) {
          p.fill(p.m().rect(st.x(x), st.y(y), 1, st.y(3)), hex('e8e0d0'))
          p.stamp(['f', 'o'], Math.round(st.x(x)), Math.round(st.y(y) - 2), { f: hex('ffe070'), o: hex('f08a2a') })
        }
      },
    },
    {
      sky: colors('0a0410', '1e0a1a', '3a1028'),
      form(d, st) {
        const mist = d.m()
        for (let i = 0; i < 7; i++) mist.blob(st.x(4 + i * 10), st.y(30 + (i % 3) * 3), st.x(10), st.y(6), 30 + i)
        d.part(mist, colors('3a1028', '5a1a3a', '8a3a5a'), { bevel: 4 })
        return hex('0a0206')
      },
    },
  ],
}

const disc = (p: Painter, x: number, y: number, r: number, c: Ramp) => {
  p.fill(p.m().disc(x, y, r + 1.5), c[0] ?? 0)
  p.fill(p.m().disc(x, y, r), c[1] ?? 0)
}

/** Paint a landscape: sky, background, the landform as subject, foreground. */
export function landArt(p: Painter, art: LandArt, shine: boolean): void {
  const scape = SCAPES[art.land][art.v ?? 0]
  const st = new Stage(p.w, p.h)
  p.shine(shine)
  sky(p, scape.sky, 0, scape.ground ? st.g : p.h, 0.7)
  if (scape.ground) {
    const g = st.g
    const ground = scape.ground
    p.dither(p.m().rect(0, g, p.w, p.h - g), ground, (_x, y) => (y - g) / Math.max(1, p.h - g - 1), 0.6)
  }
  scape.back?.(p, st)
  const d = p.layer()
  const line = scape.form(d, st)
  p.shine(false)
  p.subject(d, line)
  p.shine(shine)
  scape.front?.(p, st)
  p.shine(false)
}
