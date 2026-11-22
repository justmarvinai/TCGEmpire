import type { PokemonType } from '../cards/types.ts'
import type { Mask, Painter, Ramp, RGB } from '../toolkit/index.ts'
import { colors, fire, flameMask, hex, lightning, mix, ramp, rays, rng, sparks, stars } from '../toolkit/index.ts'
import { INK, WHITE } from './shape.ts'

/**
 * Item illustrations for trainer cards and the energy emblem composition. Items are drawn in
 * picture coordinates of the 68×48 trainer window on a simple backdrop; energies fill 68×84.
 */
export type Item =
  | 'bottle'
  | 'computer'
  | 'device'
  | 'coins'
  | 'letter'
  | 'gadget'
  | 'person'
  | 'building'
  | 'balls'
  | 'pill'
  | 'gust'

export interface ItemArt {
  item: Item
  /** Hex colours 'main second third' (person: 'coat hair skin'). */
  c?: string
  /** Backdrop hex colour and floor hex colour. */
  bg?: string
  /** Options: antenna, mist, super, ball, arrows, moustache, glasses, apron, egg, long, spiky, pony, grin, night. */
  x?: readonly string[]
}

const PAPER = colors('b8ac94', 'e8e0cc', 'fffaf0')
const GREY = colors('4e5870', '98a4bc', 'dfe6f2')
const RED = colors('8a1a26', 'd8344a', 'ff8a88')
const GOLD = colors('8a5a10', 'd09a1c', 'f6d050', 'fff2a8')
const GLASS = colors('2a5a78', '58a8c8', 'b8ecf4')
const LIT = colors('c89a3a', 'f8d870', 'fff4c0')

/** Backdrop: a light-to-mid gradient with a soft sunburst and a floor band. */
function backdrop(p: Painter, bg: RGB, floor: RGB, burst: boolean): void {
  const b = ramp(bg, 3)
  p.dither(p.m().rect(0, 0, p.w, 38), [b[2] ?? bg, b[1] ?? bg], (_x, y) => y / 37, 0.6)
  if (burst) {
    p.register(b)
    p.tone(rays(p, 34, 22, 9, 0.02).and(p.m().rect(0, 0, p.w, 38)), 1)
  }
  const f = ramp(floor, 3)
  p.dither(p.m().rect(0, 38, p.w, 10), [f[1] ?? floor, f[0] ?? floor], (_x, y) => (y - 38) / 9, 0.6)
  p.fill(p.m().rect(0, 38, p.w, 1), f[2] ?? floor)
}

/** A capsule ball of radius r. */
function ball(d: Painter, x: number, y: number, r: number): void {
  const top = d.m().disc(x, y, r).and(d.m().rect(0, 0, d.w, y))
  d.part(d.m().disc(x, y, r), PAPER)
  d.part(top, RED, { bevel: r * 0.8, line: 'none' })
  d.fill(d.m().disc(x, y, r).and(d.m().rect(0, y - 1, d.w, 2)), INK)
  d.fill(d.m().disc(x, y - 0.5, r * 0.3 + 1), INK)
  d.fill(d.m().disc(x, y - 0.5, r * 0.3), PAPER[2])
}

/** Curved arrow along an arc around (x, y) from angle a0 to a1 (degrees). */
function arrow(d: Painter, x: number, y: number, r: number, a0: number, a1: number, c: Ramp): void {
  const pts: number[] = []
  const at = (a: number, rr = r): [number, number] => [x + Math.cos((a * Math.PI) / 180) * rr, y + Math.sin((a * Math.PI) / 180) * rr]
  for (let i = 0; i <= 8; i++) pts.push(...at(a0 + ((a1 - a0) * i) / 8))
  const m = d.m().limb(pts, 1.6)
  const dir = Math.sign(a1 - a0)
  m.poly([...at(a1, r - 4), ...at(a1, r + 4), ...at(a1 + dir * 14)])
  d.part(m, c, { bevel: 1.5 })
}

function bottle(d: Painter, c: Ramp, o: readonly string[]): void {
  d.part(d.m().rect(30, 12, 8, 6), GREY, { bevel: 2 })
  d.part(d.m().poly([26, 6, 40, 6, 41, 13, 27, 13]).rect(40, 7, 6, 3), PAPER, { bevel: 2 })
  d.part(d.m().poly([28, 12, 26, 12, 22, 19, 24, 20]), GREY, { bevel: 1 })
  d.part(d.m().rect(24, 19, 20, 22).ellipse(34, 19, 10, 3).ellipse(34, 41, 10, 2.5), c, { bevel: 5 })
  d.part(d.m().rect(26, 25, 16, 10), PAPER, { bevel: 1.5 })
  d.stamp(['.c.', 'ccc', '.c.'], 33, 28, { c: c[1] ?? INK })
  if (o.includes('mist')) {
    for (const [x, y] of [[49, 8], [52, 6], [53, 10], [56, 8], [58, 5], [59, 11], [62, 8]] as const) d.px(x, y, WHITE)
  }
}

function computer(d: Painter): void {
  const beige = colors('8a7a5a', 'c8b890', 'e8dcb8', 'fff6dc')
  d.part(d.m().rect(48, 12, 13, 27), beige, { bias: -1, bevel: 2 })
  d.part(d.m().rect(13, 4, 34, 28), beige, { bevel: 3 })
  d.part(d.m().rect(26, 32, 8, 4), beige, { bias: -1, bevel: 1 })
  const screen = d.m().rect(17, 8, 26, 19)
  d.fill(screen, hex('12301e'))
  d.fill(d.m().rect(19, 10, 22, 3), hex('7fe08a'))
  for (let i = 0; i < 4; i++) d.fill(d.m().rect(20 + i * 5, 16, 4, 6), hex('3a8a4a'))
  d.fill(d.m().rect(20, 16, 4, 6), hex('b8f8c0'))
  d.part(d.m().poly([10, 37, 52, 37, 56, 44, 6, 44]), beige, { bevel: 2 })
  for (let x = 12; x < 52; x += 4) d.fill(d.m().rect(x, 39, 2, 1).rect(x + 1, 41, 2, 1), beige[1] ?? INK)
}

function device(d: Painter, c: Ramp, o: readonly string[]): void {
  if (o.includes('antenna')) {
    d.part(d.m().limb([38, 18, 44, 4], 1), GREY, { bevel: 1 })
    d.part(d.m().disc(44.5, 4, 2.6), RED, { bevel: 2 })
  }
  d.part(d.m().rect(20, 8, 28, 36), c, { bevel: 4 })
  d.part(d.m().rect(24, 13, 20, 14), GLASS, { bevel: 1.5 })
  if (o.includes('antenna')) d.stamp(['..k..', '.kkk.', 'kkkkk'], 32, 18, { k: GLASS[0] ?? INK })
  else d.fill(d.m().ellipse(33, 21, 5, 4).ellipse(37, 17, 2.5, 2.5), GLASS[0] ?? INK)
  d.part(d.m().disc(26, 34, 2.6), GLASS, { bevel: 1.5 })
  d.fill(d.m().rect(35, 31, 2, 6).rect(33, 33, 6, 2), INK)
  d.part(d.m().disc(43, 33, 1.6).disc(43, 38, 1.6), PAPER, { bevel: 1 })
  if (!o.includes('antenna')) d.part(d.m().disc(15, 10, 4), GLASS, { bevel: 2 })
}

function coins(d: Painter, o: readonly string[]): void {
  for (let i = 0; i < 5; i++) d.part(d.m().ellipse(24, 40 - i * 3.2, 10, 3.6), GOLD, { bevel: 2 })
  d.fill(d.m().ellipse(24, 27.2, 6, 2), GOLD[1])
  d.part(d.m().ellipse(42, 41, 8, 3), GOLD, { bevel: 2 })
  d.part(d.m().ellipse(46, 34, 7, 7), GOLD, { bevel: 2.5 })
  d.fill(d.m().ellipse(46, 34, 3.5, 3.5).minus(d.m().ellipse(46, 34, 2.4, 2.4)), GOLD[0])
  if (o.includes('ball')) ball(d, 23, 17, 8)
}

function letter(d: Painter): void {
  d.part(d.m().poly([14, 8, 42, 4, 46, 34, 18, 38]), PAPER, { bias: -1, bevel: 2 })
  for (let i = 0; i < 4; i++) d.fill(d.m().path([19, 12 + i * 5, 38, 9 + i * 5]), PAPER[0])
  const env = d.m().rect(20, 18, 34, 22)
  d.part(env, PAPER, { bevel: 2 })
  d.fill(d.m().path([20, 18, 37, 30, 53, 18]).and(env), PAPER[0])
  d.part(d.m().disc(37, 30, 3.5), RED, { bevel: 2 })
}

function gadget(d: Painter, c: Ramp, o: readonly string[]): void {
  const big = o.includes('super')
  const s = big ? 1.2 : 1
  d.part(d.m().limb([40, 24, 58, 30], 7 * s), c, { bevel: 4 })
  d.part(d.m().rect(46, 14, 3, 8).rect(46, 13, 10, 3), GREY, { bevel: 1 })
  d.part(d.m().poly([42, 21, 24, 12 - 4 * s, 22, 22, 24, 38 + 4 * s, 42, 33]), GREY, { bevel: 3 })
  d.fill(d.m().ellipse(23.5, 25, 3, 13 * s), INK)
  if (big) {
    const stripes = d.m()
    for (let x = 30; x < 66; x += 5) stripes.poly([x, 18, x + 2.5, 18, x - 2.5, 42, x - 5, 42])
    d.fill(stripes.and(d.m().limb([40, 24, 58, 30], 7 * s).minus(d.m().limb([40, 24, 58, 30], 7 * s - 3))), hex('2a2430'))
  }
  const orb = colors('b05a14', 'f09a28', 'ffe070', 'fffbe0')
  for (const [x, y, r] of big ? [[10, 16, 4.5], [8, 31, 4], [16, 40, 3]] as const : [[10, 25, 5]] as const) {
    fire(d, d.m().disc(x, y, r), orb, { step: 1, dy: 0 })
  }
}

function person(d: Painter, cs: readonly RGB[], o: readonly string[]): void {
  const coat = ramp(cs[0] ?? hex('e8ecf4'), 4)
  const hair = ramp(cs[1] ?? hex('6a4a30'), 3)
  const skin = ramp(cs[2] ?? hex('f1b688'), 4)
  if (o.includes('long') || o.includes('pony')) d.part(d.m().ellipse(34, 22, 11, 12), hair, { bias: -1, bevel: 3 })
  if (o.includes('pony')) d.part(d.m().limb([41, 10, 47, 16, 46, 26], [3, 3.4, 2]), hair, { bias: -1, bevel: 2 })
  d.part(d.m().poly([8, 48, 12, 34, 24, 29, 44, 29, 56, 34, 60, 48]), coat, { bevel: 6 })
  if (o.includes('apron')) d.part(d.m().poly([24, 34, 44, 34, 46, 48, 22, 48]), PAPER, { bevel: 2 })
  if (o.includes('coat')) d.fill(d.m().path([28, 29, 33, 40]).path([40, 29, 35, 40]), coat[0] ?? INK)
  d.part(d.m().rect(30, 23, 8, 7), skin, { bevel: 3 })
  d.part(d.m().ellipse(34, 16, 7.5, 8.5), skin.slice(1), { bevel: 6 })
  const cap = d.m().ellipse(34, 12, 8.6, 6).minus(d.m().ellipse(34, 17, 7, 5))
  if (o.includes('spiky')) for (let i = 0; i < 4; i++) cap.poly([27 + i * 4, 9, 30 + i * 4, 1 + (i % 2) * 2, 33 + i * 4, 9])
  if (o.includes('long')) cap.rect(26, 12, 3, 14).rect(39, 12, 3, 14)
  d.part(cap, hair, { bevel: 3 })
  const grin = o.includes('grin')
  d.stamp(grin ? ['kk...kk', '.......', '.k...k.'] : ['.......', '.......', '.k...k.'], 31, 14, { k: INK })
  if (o.includes('glasses')) d.stamp(['ggg.ggg', 'g.ggg.g', 'ggg.ggg'], 31, 15, { g: INK })
  if (o.includes('moustache')) d.stamp(grin ? ['.mmmmm.', 'mm...mm'] : ['.mmmmm.', 'mm...mm'], grin ? 32 : 31, 20, { m: hair[0] ?? INK })
  d.stamp(grin ? ['k...k', '.kkk.'] : ['.kkk.'], 32, grin ? 22 : 22, { k: skin[0] ?? INK })
  if (o.includes('egg')) d.part(d.m().ellipse(34, 40, 6, 7.5), colors('c8b890', 'f4ecd8', 'ffffff'), { bevel: 3 })
}

function building(d: Painter): void {
  d.part(d.m().rect(8, 18, 52, 26), PAPER, { bevel: 2 })
  d.part(d.m().poly([5, 19, 9, 11, 59, 11, 63, 19]), RED, { bevel: 2 })
  d.part(d.m().rect(28, 28, 12, 16), GLASS, { bevel: 1.5 })
  d.fill(d.m().rect(33, 28, 1, 16), GLASS[0] ?? INK)
  d.part(d.m().rect(12, 24, 11, 8).rect(45, 24, 11, 8), LIT, { bevel: 1.5 })
  ball(d, 34, 9, 6)
}

function pill(d: Painter, c: Ramp): void {
  const body = d.m().limb([22, 38, 46, 12], 9)
  d.part(body, PAPER, { bevel: 5 })
  d.part(body.clone().and(d.m().poly([0, 0, 68, 0, 68, 48, 0, 48]).minus(d.m().poly([34, 25, 68, 56, 68, 0]).poly([34, 25, 0, 48, 68, 48]))), c, { bevel: 5, line: 'none' })
  d.fill(d.m().rect(32, 18, 4, 12).rect(28, 22, 12, 4), WHITE)
}

function gust(d: Painter): void {
  const cloud = colors('8aa0c0', 'c8d8ee', 'f4f8ff')
  d.part(d.m().disc(16, 22, 9).disc(26, 16, 9).disc(28, 28, 8).disc(10, 31, 6), cloud, { bevel: 4 })
  d.stamp(['k..k', '....', '....', '.kk.', 'k..k', '.kk.'], 24, 19, { k: INK })
  for (const [y, len, bend] of [[18, 30, -4], [25, 34, 3], [32, 26, 5]] as const) {
    d.part(d.m().limb([34, y, 34 + len / 2, y + bend, 34 + len, y - bend], [1.2, 1.6, 0.8]), cloud, { bevel: 1 })
  }
  for (const [x, y] of [[46, 12], [58, 22], [50, 36]] as const) d.part(d.m().ellipse(x, y, 2.6, 1.4, -30), colors('2a6a2a', '4c9a38', '8acb5a'), { bevel: 1 })
}

function balls(d: Painter, o: readonly string[]): void {
  ball(d, 20, 27, 9)
  ball(d, 48, 27, 9)
  if (o.includes('arrows')) {
    const c = colors('1e6a8a', '4ab8d8', 'b8f0ff')
    arrow(d, 34, 27, 19, 200, 335, c)
    arrow(d, 34, 27, 19, 20, 155, c)
  }
}

/** Paint a trainer item with its backdrop and declare it as the subject. */
export function itemArt(p: Painter, art: ItemArt): void {
  const o = art.x ?? []
  const cs = (art.c ?? '').split(' ').filter(Boolean).map(hex)
  const [bg, floor] = (art.bg ?? 'a8b8d0 8a6a4a').split(' ').map(hex)
  const night = o.includes('night')
  backdrop(p, bg ?? 0, floor ?? 0, !night && art.item !== 'person' && art.item !== 'computer')
  if (night) stars(p, rng(5), 14, colors('f0f0ff'), { x: 2, y: 2, w: 64, h: 20 })
  const d = p.layer()
  const main = ramp(cs[0] ?? hex('8a5ac8'), 4)
  switch (art.item) {
    case 'bottle':
      bottle(d, main, o)
      break
    case 'computer':
      computer(d)
      break
    case 'device':
      device(d, main, o)
      break
    case 'coins':
      coins(d, o)
      break
    case 'letter':
      letter(d)
      break
    case 'gadget':
      gadget(d, main, o)
      break
    case 'person':
      person(d, cs, o)
      break
    case 'building':
      building(d)
      break
    case 'balls':
      balls(d, o)
      break
    case 'pill':
      pill(d, main)
      break
    case 'gust':
      gust(d)
      break
  }
  p.subject(d, mix(main[0] ?? INK, INK, 0.6))
}

// ── energy ──────────────────────────────────────────────────────────────────

interface EnergyLook {
  /** Deep background, darkest first. */
  field: Ramp
  /** Symbol glow, outside first. */
  sym: Ramp
  /** Symbol mask, centred on (34, 44). */
  emblem(p: Painter): Mask
  particles(p: Painter): void
}

const star = (p: Painter, x: number, y: number, rOut: number, rIn: number, n: number) => {
  const pts: number[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180
    const r = i % 2 ? rIn : rOut
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  return p.m().poly(pts)
}

const bubbles = (p: Painter, c: RGB) => {
  const rand = rng(6)
  for (let i = 0; i < 16; i++) p.stamp(['.w.', 'w.w', '.w.'], Math.floor(rand() * 64) + 2, Math.floor(rand() * 78) + 2, { w: c })
}

const ENERGY: Readonly<Record<PokemonType, EnergyLook>> = {
  Feuer: {
    field: colors('4c0a16', '74101a', 'a01a1a', 'c82c1a'),
    sym: colors('e2441a', 'f67a1e', 'fdb332', 'ffe466', 'fffbd6'),
    emblem: (p) => flameMask(p, 34, 67, 26, 52, { lean: 6, tongues: 0 }).or(flameMask(p, 23, 66, 13, 31, { lean: -5, tongues: 0 })),
    particles: (p) => sparks(p, rng(5), 30, colors('f67a1e', 'fdb332'), { x: 2, y: 2, w: 64, h: 80 }),
  },
  Wasser: {
    field: colors('0a1a4a', '102a6e', '1a4296', '2a62bc'),
    sym: colors('2f7fe0', '5aa8f0', '9ad4fa', 'e0f6ff'),
    emblem: (p) => p.m().disc(34, 51, 13).poly([34, 22, 46.6, 48, 21.4, 48]),
    particles: (p) => bubbles(p, hex('6aa8f0')),
  },
  Pflanze: {
    field: colors('0c2a14', '143e1c', '1e5a26', '2e7a32'),
    sym: colors('3e9e36', '6cc048', 'a8e070', 'e6f8a8'),
    emblem: (p) => p.m().ellipse(35, 42, 20, 10.5, -45).limb([22, 58, 27, 52], 1.6),
    particles: (p) => sparks(p, rng(3), 26, colors('a8e070', 'e6f8a8'), { x: 2, y: 2, w: 64, h: 80 }),
  },
  Elektro: {
    field: colors('6a3a00', '9a5a00', 'c88a10', 'e8b42a'),
    sym: colors('f2b90f', 'fad848', 'fff08a', 'fffbe0'),
    emblem: (p) => p.m().poly([39, 18, 23, 47, 32.5, 47, 27, 71, 47, 37, 37.5, 37, 45, 18]),
    particles: (p) => {
      for (const [x0, y0, x1, y1, s] of [[6, 6, 14, 18, 1], [56, 8, 62, 20, 2], [8, 62, 4, 76, 3], [58, 64, 64, 78, 4]] as const)
        lightning(p, [x0, y0], [x1, y1], hex('fff08a'), { seed: s, jag: 2 })
    },
  },
  Psycho: {
    field: colors('240c3a', '3a1458', '561e7a', '742a9a'),
    sym: colors('9a44c0', 'c070e0', 'e0a8f4', 'f7d8ff'),
    emblem: (p) => p.m().disc(34, 58, 26).and(p.m().disc(34, 30, 26)),
    particles: (p) => {
      const rings = p.m()
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (Math.floor(Math.hypot(x - 34, y - 44) / 5) % 3 === 0) rings.add(x, y)
      p.tone(rings, 1)
    },
  },
  Kampf: {
    field: colors('3a1a0a', '5a2a12', '7c401c', 'a05a2a'),
    sym: colors('b05a24', 'd07a38', 'f0a860', 'ffe2b4'),
    emblem: (p) => {
      const m = p.m().rect(23, 33, 22, 24).ellipse(34, 57, 11, 4)
      for (let i = 0; i < 4; i++) m.disc(25.5 + i * 5.7, 33, 3.4)
      return m.ellipse(30, 47, 10, 3.6, -8)
    },
    particles: (p) => {
      for (const [x, y, s] of [[8, 10, 1], [52, 70, 2], [56, 14, 3], [10, 66, 4]] as const) lightning(p, [x, y], [x + 8, y + 10], hex('2a1008'), { seed: s, jag: 2 })
    },
  },
  Farblos: {
    field: colors('3a3a44', '55555f', '74747e', '9a9aa4'),
    sym: colors('a8a8b0', 'cfcfd6', 'ececf0', 'ffffff'),
    emblem: (p) => star(p, 34, 45, 19, 9, 6),
    particles: (p) => stars(p, rng(2), 22, colors('dcdce4'), { x: 2, y: 2, w: 64, h: 80 }),
  },
}

const RIM = hex('e8b428')

/** Medallion with a symbol: dark disc, golden ring, inner rays, glowing symbol. */
function medallion(e: Painter, look: EnergyLook, x: number, y: number, r: number, sym: Mask, rise = 1): RGB {
  const dark = mix(look.field[0] ?? INK, INK, 0.4)
  const disc = e.m().disc(x, y, r)
  e.fill(disc, dark)
  e.fill(disc.shrunk(1).minus(disc.shrunk(3)), RIM)
  e.fill(disc.shrunk(4), look.field[1] ?? dark)
  e.fill(disc.shrunk(4).and(rays(e, x, y, 8)), look.field[2] ?? dark)
  e.fill(sym.grown(1), dark)
  fire(e, sym, look.sym, { step: 2, dy: rise })
  return dark
}

/** Energy art: radial field, element particles and the emblem (two overlapping for `double`). */
export function energyArt(p: Painter, element: PokemonType, double = false): void {
  const look = ENERGY[element]
  p.dither(null, look.field, (x, y) => 1 - Math.hypot(x - 34, (y - 42) * 0.85) / 46, 0.8)
  p.register(look.field)
  p.tone(rays(p, 34, 42, 10, 0.03), -1)
  look.particles(p)
  const e = p.layer()
  let dark: RGB
  if (double) {
    medallion(e, look, 23, 36, 17, star(e, 23, 36, 11, 5, 6))
    dark = medallion(e, look, 45, 52, 17, star(e, 45, 52, 11, 5, 6))
  } else {
    dark = medallion(e, look, 34, 44, 24, look.emblem(e), element === 'Feuer' ? 2 : 1)
    const vein = look.sym[0] ?? dark
    if (element === 'Psycho') {
      e.fill(e.m().disc(34, 44, 7), look.field[1] ?? INK)
      e.fill(e.m().disc(34, 44, 3.5), dark)
      e.px(31, 41, WHITE).px(32, 41, WHITE).px(31, 42, WHITE)
    }
    if (element === 'Pflanze') e.fill(e.m().path([22, 58, 33, 43, 47, 30]), vein)
    if (element === 'Kampf') e.fill(e.m().path([31, 30, 31, 41]).path([37, 30, 37, 41]).path([25, 39, 40, 44]).path([43, 30, 43, 40]), vein)
  }
  p.subject(e, dark)
}
