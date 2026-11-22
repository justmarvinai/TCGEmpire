import type { Painter, Ramp, RGB } from '../toolkit/index.ts'
import { colors, fire, flameMask, hex, lightning, mix, ramp, rays, rng, sparks } from '../toolkit/index.ts'
import type { Kit, Shape } from './shape.ts'
import { INK, WHITE } from './shape.ts'
import type { Box } from './stage.ts'

/**
 * Object template: the things on spell, trap, gear and event cards. Drawn in local units (about
 * 30 units big at scale 1). Standing objects sit on the ground line, floating ones are centred in
 * the picture.
 *
 * Spec:
 *
 *   obj  pot | potion | chest | coins | sword (planted) | swords (three falling blades) | fangs | axe |
 *        club (spiked) | fist | hand (open, offered) | book | scroll | cards | orb | vortex | bolt |
 *        fireball | flame | pit (trap hole with spikes) | coffin | ankh | fruit | cup | chains | eye |
 *        crystal | cannon | rocket | hourglass | disc | heart | wings | germs | smoke | gust | beam | slash
 *   c    'main accent' hex colours; every object has sensible defaults (pot green and gold, ...)
 *   x    on the object: face (eyes and grin), cards (popping out), coins, stone (pedestal), lid, flames;
 *        behind it: glow, rays, bolts (lightning), sparks, streak (speed lines), smoke
 *   n    count for fireball, swords, germs, cards (default 1 / 3 / 3 / 3)
 *   s    size (1 = medium), flip: mirror
 *
 * Example: { obj: 'pot', x: ['face', 'cards', 'rays'] }
 */
export type Obj =
  | 'pot'
  | 'potion'
  | 'chest'
  | 'coins'
  | 'sword'
  | 'swords'
  | 'fangs'
  | 'axe'
  | 'club'
  | 'fist'
  | 'hand'
  | 'book'
  | 'scroll'
  | 'cards'
  | 'orb'
  | 'vortex'
  | 'bolt'
  | 'fireball'
  | 'flame'
  | 'pit'
  | 'coffin'
  | 'ankh'
  | 'fruit'
  | 'cup'
  | 'chains'
  | 'eye'
  | 'crystal'
  | 'cannon'
  | 'rocket'
  | 'hourglass'
  | 'disc'
  | 'heart'
  | 'wings'
  | 'germs'
  | 'smoke'
  | 'gust'
  | 'beam'
  | 'slash'
export type ObjectExtra = 'face' | 'cards' | 'coins' | 'stone' | 'lid' | 'flames' | 'glow' | 'rays' | 'bolts' | 'sparks' | 'streak' | 'smoke'

export interface ObjectArt {
  obj: Obj
  c?: string
  x?: readonly ObjectExtra[]
  n?: number
  s?: number
  flip?: boolean
}

type XY = readonly [number, number]

const WOOD = colors('5a3a22', '8a5a32', 'b88450')
const GOLD = colors('8a5a10', 'd09a1c', 'f6d050')
const PAPER = colors('b8ac94', 'e8e0cc', 'fffaf0')
const EYE = colors('b8b0c0', 'f0ecf4', 'ffffff')
const GREEN = colors('2a6a2a', '4c9a38', '8acb5a')
const BACK = colors('1e2a6a', '3448a8', '6a8ae0')

/** Default 'main accent' colours of every object. */
const DEFAULTS: Readonly<Record<Obj, string>> = {
  pot: '4aa04a e8c050',
  potion: 'd83a3a a8d8e8',
  chest: '8a5a30 e8b830',
  coins: 'e0a828 f6d050',
  sword: '98a4bc d8a830',
  swords: 'f0e090 d8a830',
  fangs: 'f0e8d0 8a6a4a',
  axe: '98a4bc 8a5a32',
  club: '4a4658 98a4bc',
  fist: 'f0b888 d83030',
  hand: 'f0b888 3a5aa8',
  book: '8a3a2a e8c050',
  scroll: 'e8dcb8 8a5a30',
  cards: '3a5ab0 f0e8d0',
  orb: '6a3ab0 c090f0',
  vortex: '2a1a4a 8a5ae0',
  bolt: 'f8e040 fffbe0',
  fireball: 'f07020 ffd040',
  flame: 'f07020 ffd040',
  pit: '6a4a2a 98a4bc',
  coffin: 'c89a48 3a6ab0',
  ankh: 'e0a828 fff2a8',
  fruit: '7a4ac0 5aa040',
  cup: 'c83a30 e8c050',
  chains: '98a4bc 6a7088',
  eye: 'd83a3a f0ecf4',
  crystal: '4ab0e0 c0f0ff',
  cannon: '3a3644 8a5a32',
  rocket: '6a8aa8 f08ab0',
  hourglass: 'e0a828 e8c890',
  disc: 'e0a828 fff2a8',
  heart: 'f05a8a ffc0d8',
  wings: 'e8ecf4 b8c4d8',
  germs: '6ac048 f0f0a0',
  smoke: '8a96a8 4a5468',
  gust: 'c8e0f0 5aa040',
  beam: '8ad8f8 ffffff',
  slash: 'b8d8f8 ffffff',
}

/** Objects that float in the middle of the picture; all others stand on the ground. */
export const FLOATING: ReadonlySet<Obj> = new Set<Obj>([
  'swords',
  'fangs',
  'axe',
  'club',
  'fist',
  'hand',
  'book',
  'scroll',
  'cards',
  'orb',
  'vortex',
  'bolt',
  'fireball',
  'ankh',
  'fruit',
  'chains',
  'eye',
  'rocket',
  'disc',
  'heart',
  'wings',
  'germs',
  'smoke',
  'gust',
  'beam',
  'slash',
])

interface Pal {
  main: Ramp
  acc: Ramp
}

const go = (x: number, y: number, deg: number, len: number): [number, number] => [x + Math.cos((deg * Math.PI) / 180) * len, y + Math.sin((deg * Math.PI) / 180) * len]

/** Rectangle of w × h centred on (x, y), turned by `deg`. */
function box(sh: Shape, x: number, y: number, w: number, h: number, deg: number): Shape {
  const out: number[] = []
  for (const [dx, dy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const) {
    const [rx, ry] = go(0, 0, deg, dx)
    const [ux, uy] = go(0, 0, deg + 90, dy)
    out.push(x + rx + ux, y + ry + uy)
  }
  return sh.p(...out)
}

const on = (a: ObjectArt, x: ObjectExtra) => a.x?.includes(x) ?? false

/** Bulging eyes and a toothy grin on a round face centred at (x, y) with radius r. */
function grinFace(k: Kit, x: number, y: number, r: number): void {
  for (const dx of [-0.42, 0.42]) k.part(k.m().c(x + dx * r, y - 0.25 * r, r * 0.27), EYE, { bevel: 1.5 })
  for (const dx of [-0.36, 0.48]) k.fill(k.m().c(x + dx * r, y - 0.22 * r, Math.max(0.8, r * 0.1)), INK)
  const mouth = k.m().e(x, y + 0.28 * r, r * 0.62, r * 0.34).minus(k.m().e(x, y + 0.05 * r, r * 0.7, r * 0.3))
  k.fill(mouth, INK)
  k.fill(k.m().e(x, y + 0.28 * r, r * 0.62, r * 0.34).and(k.m().p(x - r, y + 0.33 * r, x + r, y + 0.33 * r, x + r, y + 0.43 * r, x - r, y + 0.43 * r)).and(mouth), WHITE)
}

/** A card seen from the back, centred on (x, y). */
function card(k: Kit, x: number, y: number, deg: number, back: Ramp, bias = 0): void {
  k.part(box(k.m(), x, y, 10, 14, deg), PAPER, { bias, bevel: 1 })
  k.part(box(k.m(), x, y, 7.2, 11, deg), back, { bevel: 1.5, line: 'none' })
  k.part(k.m().e(x, y, 2.2, 3, deg), back, { bias: 1, bevel: 1, line: 'none' })
}

const DRAW: Readonly<Record<Obj, (k: Kit, P: Pal, a: ObjectArt) => void>> = {
  pot(k, P, a) {
    if (on(a, 'cards')) {
      card(k, -7, -32, -30, BACK, -1)
      card(k, 6, -34, 18, BACK)
    }
    k.part(k.m().e(0, -2, 7.5, 2.2), P.main, { bias: -1, bevel: 1.5 })
    k.part(k.m().e(0, -13, 12.5, 11.5), P.main)
    k.part(k.m().p(-6, -21, 6, -21, 5.5, -26, -5.5, -26), P.main, { bevel: 2 })
    k.part(k.m().e(0, -26.5, 8.5, 2.4), P.acc, { bevel: 1.5 })
    if (on(a, 'lid')) k.part(k.m().e(0, -28.6, 7, 2.6).c(0, -31.6, 1.8), P.acc, { bevel: 1.5 })
    if (on(a, 'face')) grinFace(k, 0, -12, 11)
  },
  potion(k, P) {
    const glass = ramp(P.acc[1] ?? WHITE, 3)
    k.part(k.m().e(0, -9, 9, 9).p(-3, -16, 3, -16, 3, -24, -3, -24), glass, { bevel: 3 })
    k.part(k.m().e(0, -8, 8, 7.5).minus(k.m().p(-10, -13, 10, -13, 10, -20, -10, -20)), P.main, { bevel: 3, line: 'none' })
    k.part(k.m().p(-2.6, -24, 2.6, -24, 2.2, -28, -2.2, -28), WOOD, { bevel: 1.5 })
    k.fill(k.m().e(-4, -11, 1.2, 2.2, 20), glass[2] ?? WHITE)
  },
  chest(k, P, a) {
    if (on(a, 'coins')) DRAW.coins(k, { main: GOLD, acc: GOLD }, a)
    k.part(k.m().p(-14, -1, 14, -1, 14, -14, -14, -14), P.main, { bevel: 2 })
    k.part(k.m().e(0, -14, 14, 6).minus(k.m().p(-20, -14, 20, -14, 20, 0, -20, 0)), P.main, { bevel: 3 })
    for (const x of [-10, 10]) k.part(k.m().p(x - 1.2, -1, x + 1.2, -1, x + 1.2, -19.5, x - 1.2, -19.5).and(k.m().e(0, -14, 14, 6).p(-14, -1, 14, -1, 14, -14, -14, -14)), P.acc, { bevel: 1 })
    k.part(k.m().p(-2.4, -11, 2.4, -11, 2.4, -16, -2.4, -16), P.acc, { bevel: 1 })
  },
  coins(k, P) {
    for (let i = 0; i < 4; i++) k.part(k.m().e(-6, -2 - i * 2.6, 7, 2.4), P.main, { bevel: 1.5 })
    k.part(k.m().e(7, -2.2, 6, 2.2), P.main, { bevel: 1.5 })
    k.part(k.m().c(9, -8, 5), P.main, { bevel: 2 })
    k.fill(k.m().c(9, -8, 2.4).minus(k.m().c(9, -8, 1.4)), P.main[0] ?? INK)
  },
  sword(k, P, a) {
    if (on(a, 'stone')) k.part(k.m().e(0, -3, 12, 4.5).p(-10, -3, 10, -3, 8, -8, -7, -8.5), colors('5a5a68', '8a8a98', 'b8b8c4'), { bevel: 2 })
    k.part(k.m().l([0, -5, 0, -27], [2, 1.8]).p(-1.8, -27, 1.8, -27, 0, -30), P.main, { bevel: 1.2 })
    k.fill(k.m().line(0, -6, 0, -26), P.main[0] ?? INK)
    k.part(k.m().l([-6, -27, 6, -27], 1.3), P.acc, { bevel: 1 })
    k.part(k.m().l([0, -28, 0, -34], 1), WOOD, { bevel: 1 })
    k.part(k.m().c(0, -35, 1.7), P.acc, { bevel: 1 })
  },
  swords(k, P, a) {
    const n = a.n ?? 3
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5
      const x = t * 24
      const deg = 90 - t * 20
      const guard = go(x, -2, deg + 180, 9)
      k.part(k.m().l([...guard, ...go(...guard, deg + 180, 5)], 1), P.acc, { bevel: 1 })
      k.part(k.m().l([...guard, ...go(...guard, deg, 17)], [2.4, 2, 0.2]), P.main, { bevel: 1.5 })
      k.fill(k.m().line(...go(...guard, deg, 1), ...go(...guard, deg, 14)), P.main[2] ?? WHITE)
      k.part(k.m().l([...go(...guard, deg + 90, 4.5), ...go(...guard, deg - 90, 4.5)], 1.2), P.acc, { bevel: 1 })
    }
  },
  fangs(k, P) {
    for (const [s, bias] of [[-1, -1], [1, 0]] as const) {
      k.part(k.m().l([s * 9, -13, s * 4, -2, s * -1, 7, s * -4, 12], [3.4, 3, 1.8, 0.3]), P.main, { bias, bevel: 2 })
      k.part(k.m().e(s * 9, -13, 3.8, 2.4, s * 30), P.acc, { bias, bevel: 1.5 })
    }
  },
  axe(k, P) {
    k.part(k.m().l([-12, 12, 8, -10], 1.2), P.acc, { bevel: 1 })
    k.part(k.m().e(7, -6, 7, 9, 40).minus(k.m().e(14, -12, 5, 7, 40)), P.main, { bevel: 2 })
  },
  club(k, P) {
    k.part(k.m().l([-14, 11, -2, 0, 12, -12], [1.5, 3.2, 4.8]), P.main, { bevel: 3 })
    const studs = k.m()
    for (let i = 0; i < 6; i++) studs.c(...go(-1 + (i % 2) * 1.6, -0.5, -42, 2 + i * 3), 0.9)
    k.part(studs, P.acc, { bevel: 1 })
    k.part(k.m().l([-16, 13, -12, 9.4], 1.6), WOOD, { bevel: 1 })
  },
  fist(k, P, a) {
    if (on(a, 'flames')) {
      const m = flameMask(k.d, ...(k.m().pt(-4, 4) as [number, number]), 22 * k.at.s, 24 * k.at.s, { lean: k.at.flip ? 14 : -14, tongues: 2, seed: 3 })
      fire(k.d, m, colors('c02818', 'f07020', 'ffc040', 'fff0a0'), { step: 2, dy: 1 })
    }
    k.part(k.m().l([-18, 4, -10, 2, -3, 0], [2.8, 3.2, 3.6]), P.acc, { bevel: 2 })
    k.part(k.m().e(4, -1, 7.5, 6.5), P.main, { bevel: 3 })
    k.part(k.m().e(5, 3.2, 4, 2.2, -10), P.main, { bevel: 1.5 })
    const knuckles = k.m()
    for (let i = 0; i < 4; i++) knuckles.line(6 + i * 0.2, -5.5 + i * 3, 9.5, -5 + i * 3)
    k.fill(knuckles, P.main[0] ?? INK)
  },
  hand(k, P) {
    k.part(k.m().l([-18, 6, -10, 4, -4, 2], [2.8, 3, 3.2]), P.acc, { bevel: 2 })
    k.part(k.m().e(2, 0, 6.5, 4.2, -8), P.main, { bevel: 2.5 })
    for (let i = 0; i < 4; i++) k.part(k.m().l([6, -2 + i * 1.6, 11, -3.4 + i * 2.2], 1), P.main, { bevel: 1 })
    k.part(k.m().l([1, -3, 4, -7], 1.2), P.main, { bevel: 1 })
  },
  book(k, P) {
    k.part(k.m().p(-15, -6, 0, -2, 15, -6, 15, 3, 0, 7, -15, 3), P.main, { bevel: 2 })
    k.part(k.m().p(-14, -8, 0, -4, 0, 5, -14, 1), PAPER, { bias: -1, bevel: 2 })
    k.part(k.m().p(14, -8, 0, -4, 0, 5, 14, 1), PAPER, { bevel: 2 })
    const lines = k.m()
    for (let i = 0; i < 3; i++) lines.line(-11, -4 + i * 2.5, -3, -1.5 + i * 2.5).line(3, -1.5 + i * 2.5, 11, -4 + i * 2.5)
    k.fill(lines, PAPER[0] ?? INK)
    k.stamp(['.a.', 'aaa', '.a.'], 0, -13, { a: P.acc[2] ?? WHITE })
    k.stamp(['a.a', '.a.', 'a.a'], -8, -16, { a: P.acc[1] ?? WHITE })
    k.stamp(['aa', 'aa'], 8, -17, { a: P.acc[1] ?? WHITE })
  },
  scroll(k, P) {
    k.part(k.m().p(-12, -7, 12, -7, 12, 7, -12, 7), P.main, { bevel: 2 })
    for (const x of [-13, 13]) k.part(k.m().l([x, -9, x, 9], 1.8), P.acc, { bevel: 1 })
    const lines = k.m()
    for (let i = 0; i < 4; i++) lines.line(-8, -4 + i * 2.6, 8 - (i % 2) * 4, -4 + i * 2.6)
    k.fill(lines, P.main[0] ?? INK)
  },
  cards(k, P, a) {
    const n = a.n ?? 3
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5
      const deg = t * 50
      const [x, y] = go(0, 14, -90 + deg, 16)
      k.part(box(k.m(), x, y, 10, 14, deg), PAPER, { bevel: 1.5 })
      k.part(box(k.m(), x, y, 6.6, 10.4, deg), P.main, { bevel: 1, line: 'none' })
      k.stamp(['.a.', 'aaa', '.a.'], x, y, { a: P.acc[2] ?? WHITE })
    }
  },
  orb(k, P, a) {
    k.d.fill(k.m().c(0, 0, 11).mask, P.main[0] ?? INK)
    fire(k.d, k.m().c(0, 0, 10).mask, [P.main[0] ?? INK, P.main[1] ?? INK, P.main[2] ?? INK, P.acc[1] ?? WHITE, P.acc[2] ?? WHITE], { step: 2, dx: -1, dy: -1 })
    if (on(a, 'bolts')) for (const deg of [30, 150, 260]) lightning(k.d, k.m().pt(...go(0, 0, deg, 9)) as [number, number], k.m().pt(...go(0, 0, deg + 15, 17)) as [number, number], P.acc[2] ?? WHITE, { seed: deg, jag: 1.5 * k.at.s })
  },
  vortex(k, P) {
    k.part(k.m().c(0, 0, 15), P.main, { bevel: 6 })
    const arms = [P.acc, P.main] as const
    for (let j = 0; j < 3; j++) {
      const pts: number[] = []
      for (let i = 0; i <= 10; i++) pts.push(...go(0, 0, j * 120 + i * 26, 14 - i * 1.2))
      k.part(k.m().l(pts, [2.6, 2.2, 1.8, 1.5, 1.2, 1, 0.9, 0.8, 0.7, 0.6, 0.5]), arms[j % 2] ?? P.acc, { bevel: 1.5 })
    }
    k.fill(k.m().c(0, 0, 3.4), INK)
  },
  bolt(k, P) {
    k.part(k.m().p(4, -20, -9, 1, -1, 1, -6, 20, 10, -4, 2, -4, 9, -20), P.main, { bevel: 2 })
    k.part(k.m().p(4, -17, -5, -1, 0, -1, -2, 11, 6, -2.5, 0, -2.5, 5, -15), P.acc, { bevel: 1, line: 'none' })
  },
  fireball(k, P, a) {
    const n = a.n ?? 1
    for (let i = 0; i < n; i++) {
      const [x, y] = n === 1 ? [0, 0] : [(i - (n - 1) / 2) * 15, (i % 2) * 8 - 4]
      const [px, py] = k.m().pt(x, y)
      const r = (n === 1 ? 9 : 6) * k.at.s
      const m = flameMask(k.d, px, py + r, r * 2, r * 3.2, { lean: (k.at.flip ? 1 : -1) * r * 1.4, tongues: 2, seed: 7 + i })
      m.or(k.m().c(x, y, n === 1 ? 8 : 5.5).mask)
      fire(k.d, m, [P.main[0] ?? INK, P.main[1] ?? INK, P.acc[1] ?? WHITE, P.acc[2] ?? WHITE], { step: Math.max(1, Math.round(1.5 * k.at.s)), dx: 1, dy: 0 })
    }
  },
  flame(k, P) {
    const [px, py] = k.m().pt(0, 0)
    const m = flameMask(k.d, px, py, 18 * k.at.s, 32 * k.at.s, { lean: 3, tongues: 3, seed: 5 })
    fire(k.d, m, [P.main[0] ?? INK, P.main[1] ?? INK, P.acc[1] ?? WHITE, P.acc[2] ?? WHITE], { step: Math.max(1, Math.round(2 * k.at.s)), dy: 1 })
  },
  pit(k, P) {
    const dirt = P.main
    k.part(k.m().e(0, -4, 22, 6.5), dirt, { bias: -1, bevel: 2 })
    k.fill(k.m().e(0, -3.2, 19, 5), mix(dirt[0] ?? INK, INK, 0.6))
    const spikes = k.m()
    for (let i = 0; i < 6; i++) spikes.p(-14 + i * 5.6 - 1.6, -1, -14 + i * 5.6, -8 - (i % 2) * 2.5, -14 + i * 5.6 + 1.6, -1)
    k.part(spikes.and(k.m().e(0, -6, 19, 8)), P.acc, { bevel: 1 })
    k.part(k.m().e(0, -0.8, 21, 2.4).minus(k.m().e(0, -3.2, 19, 4.6)), dirt, { bevel: 1 })
    const leaves = k.m()
    for (const [x, y, d] of [[-14, -16, 30], [-4, -21, -20], [9, -18, 50], [16, -12, -40], [-19, -9, 10]] as const) leaves.e(x, y, 2.6, 1.3, d)
    k.part(leaves, GREEN, { bevel: 1 })
  },
  coffin(k, P) {
    k.part(k.m().p(-16, -1, 16, -1, 18, -6, 16, -11, -16, -11, -18, -6), P.main, { bevel: 2 })
    k.part(k.m().p(-14, -12, 14, -20, 16, -16, -12, -8), P.main, { bias: 1, bevel: 2 })
    k.part(k.m().p(-12, -4, 12, -4, 12, -7, -12, -7), P.acc, { bevel: 1, line: 'none' })
  },
  ankh(k, P) {
    k.part(k.m().e(0, -10, 6, 7.5).minus(k.m().e(0, -10, 3, 4.5)).p(-2, -3, 2, -3, 2.6, 16, -2.6, 16).p(-9, -3, 9, -3, 9, 1, -9, 1), P.main, { bevel: 2 })
  },
  fruit(k, P, a) {
    k.part(k.m().c(0, 0, 11), P.main, { bevel: 5 })
    const swirl = k.m()
    for (const [x, y] of [[-4, -4], [4, -3], [-3, 4], [5, 5]] as const) {
      const pts: number[] = []
      for (let i = 0; i <= 8; i++) pts.push(...go(x, y, i * 50, 0.4 + i * 0.32))
      swirl.line(...pts)
    }
    k.fill(swirl.and(k.m().c(0, 0, 10)), P.main[0] ?? INK)
    k.part(k.m().l([0, -10, 1, -14], 1), WOOD, { bevel: 1 })
    k.part(k.m().e(4.5, -13, 4, 2, -20), P.acc, { bevel: 1.5 })
    if (on(a, 'face')) grinFace(k, 0, 1, 8)
  },
  cup(k, P) {
    k.part(k.m().e(0, -2, 5, 1.8), P.main, { bias: -1, bevel: 1.5 })
    k.part(k.m().e(0, -7, 12, 5).minus(k.m().p(-14, -9, 14, -9, 14, -14, -14, -14)).p(-3, -2, 3, -2, 2, -5, -2, -5), P.main, { bevel: 2 })
    k.part(k.m().e(0, -9, 12, 2.4), P.acc, { bevel: 1 })
  },
  chains(k, P) {
    for (const dir of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const [x, y] = [i * 4.6, i * 4.6 * dir * 0.62]
        k.part(k.m().e(x, y, 3.4, 2, dir * 32 + (i % 2) * 90).minus(k.m().e(x, y, 1.6, 0.6, dir * 32 + (i % 2) * 90)), P.main, { bias: dir < 0 ? -1 : 0, bevel: 1 })
      }
    }
  },
  eye(k, P) {
    k.part(k.m().e(0, 0, 16, 9).and(k.m().c(0, 12, 17)).and(k.m().c(0, -12, 17)), EYE, { bevel: 3 })
    k.part(k.m().c(0, 0, 6), P.main, { bevel: 3, line: 'none' })
    k.fill(k.m().e(0, 0, 1.6, 4.4), INK)
    k.stamp(['ww', 'w.'], -2.5, -2.5, { w: WHITE })
  },
  crystal(k, P) {
    for (const [x, h, d, bias] of [[-7, 14, -14, -1], [7, 12, 16, -1], [0, 22, 0, 0]] as const) {
      const [tx, ty] = go(x, -1, -90 + d, h)
      k.part(k.m().l([x, -1, tx, ty], [3.4, 3.2]).p(...go(tx, ty, d - 90 - 90, 3.2), ...go(tx, ty, -90 + d, 4), ...go(tx, ty, d + 90 - 90, 3.2)), P.main, { bias, bevel: 1.5 })
    }
  },
  cannon(k, P) {
    k.part(k.m().l([-12, -10, 12, -16], [5, 4]).e(13, -16.5, 1.8, 4.2, -14), P.main, { bevel: 2 })
    k.part(k.m().c(-3, -6, 6), P.acc, { bevel: 2 })
    k.fill(k.m().line(-3, -11, -3, -1).line(-8, -6, 2, -6), P.acc[0] ?? INK)
  },
  rocket(k, P, a) {
    const [px, py] = k.m().pt(-16, 0)
    fire(k.d, flameMask(k.d, px, py + 5 * k.at.s, 9 * k.at.s, 14 * k.at.s, { lean: 0, tongues: 1, seed: 4 }), colors('c02818', 'f07020', 'ffd040'), { step: 1, dy: 0 })
    k.part(k.m().p(-14, -4, -18, -9, -9, -5).p(-14, 4, -18, 9, -9, 5), P.acc, { bias: -1, bevel: 1.5 })
    k.part(k.m().l([-14, 0, 6, 0], 5).e(9, 0, 6, 4.6), P.main, { bevel: 3 })
    if (on(a, 'face')) {
      k.stamp(['wkwkwkw', '.......', 'wkwkwkw'], 9, 2, { w: WHITE, k: INK })
      k.stamp(['kk', 'kw'], 6, -2, { k: INK, w: WHITE })
    }
  },
  hourglass(k, P) {
    for (const y of [-1.5, -27]) k.part(k.m().e(0, y, 10, 2.2), P.main, { bevel: 1.5 })
    for (const x of [-8, 8]) k.part(k.m().l([x, -2, x, -26], 1), P.main, { bevel: 1 })
    const glass = k.m().e(0, -21, 6, 6).e(0, -8, 6, 6).p(-1.4, -15, 1.4, -15, 1.4, -14, -1.4, -14)
    k.part(glass, colors('8ab0c0', 'd0e8f0', 'f8ffff'), { bevel: 2 })
    k.part(k.m().e(0, -6, 5.2, 3.6).or(k.m().e(0, -19, 5, 3).and(k.m().p(-6, -19, 6, -19, 6, -15, -6, -15))).p(-0.6, -15, 0.6, -15, 0.6, -8, -0.6, -8), P.acc, { bevel: 1, line: 'none' })
  },
  disc(k, P) {
    k.part(k.m().c(0, 0, 13), P.main, { bevel: 3 })
    k.fill(k.m().c(0, 0, 9).minus(k.m().c(0, 0, 8)), P.main[0] ?? INK)
    k.part(k.m().c(0, 0, 4.5), P.acc, { bevel: 2 })
  },
  heart(k, P) {
    k.part(k.m().c(-5, -4, 6.4).c(5, -4, 6.4).p(-11, -2, 11, -2, 0, 12), P.main, { bevel: 4 })
    k.stamp(['ww', 'w.'], -7, -7, { w: P.acc[2] ?? WHITE })
  },
  wings(k, P) {
    for (const [s, bias] of [[-1, -1], [1, 0]] as const) {
      const sh = k.m()
      for (let i = 0; i < 4; i++) sh.l([s * 2, 2, s * (8 + i * 2), -6 + i * 3, s * (16 + i * 2), -10 + i * 5], [2.6, 2.4, 0.8])
      k.part(sh, P.main, { bias, bevel: 2 })
    }
  },
  germs(k, P, a) {
    const n = a.n ?? 3
    const spots: readonly XY[] = [[0, -5], [-10, 5], [10, 6], [-3, 10], [12, -7]]
    spots.slice(0, n).forEach(([x, y], i) => {
      const r = i === 0 ? 7.5 : 5.5
      k.part(k.m().c(x, y, r), P.main, { bevel: 3 })
      for (const dx of [-0.35, 0.35]) k.part(k.m().c(x + dx * r, y - 0.2 * r, r * 0.26), EYE, { bevel: 1, line: 'none' })
      k.stamp(['k'], x - 0.3 * r, y - 0.15 * r, { k: INK })
      k.stamp(['k'], x + 0.4 * r, y - 0.15 * r, { k: INK })
      k.stamp(['kkk', 'w.w'], x, y + 0.45 * r, { k: INK, w: WHITE })
    })
  },
  smoke(k, P) {
    const sh = k.m()
    for (const [x, y, r] of [[-8, 2, 7], [3, -3, 9], [12, 3, 6], [-2, 8, 6], [7, 9, 5]] as const) sh.c(x, y, r)
    k.part(sh, P.main, { bevel: 4 })
    k.part(k.m().l([-3, 13, 2, 15], 2.6), P.acc, { bevel: 1.5 })
  },
  gust(k, P) {
    for (const [y, len, bend] of [[-8, 26, -4], [0, 30, 3], [8, 22, 5]] as const) {
      k.part(k.m().l([-15, y, -15 + len / 2, y + bend, -15 + len, y - bend, -15 + len + 3, y - bend - 4], [1.2, 1.6, 1, 0.6]), P.main, { bevel: 1 })
    }
    for (const [x, y] of [[-12, -14], [10, -12], [14, 12]] as const) k.part(k.m().e(x, y, 2.6, 1.3, -30), P.acc, { bevel: 1 })
  },
  beam(k, P) {
    k.part(k.m().l([-24, 0, 16, 0], [3, 5]).c(18, 0, 6), P.main, { bevel: 3 })
    k.part(k.m().l([-24, 0, 16, 0], [1, 2.4]).c(18, 0, 3.4), P.acc, { bevel: 1, line: 'none' })
  },
  slash(k, P) {
    k.part(k.m().c(0, 0, 15).minus(k.m().c(4, -3, 13.5)), P.main, { bevel: 1.5 })
    k.part(k.m().c(0, 0, 14).minus(k.m().c(3, -2, 13.5)), P.acc, { bevel: 1, line: 'none' })
  },
}

/** Paint the object of a spec onto the kit's layer. */
export function object(k: Kit, a: ObjectArt): void {
  const [main = 0, acc = 0] = (a.c ?? DEFAULTS[a.obj]).split(' ').map(hex)
  DRAW[a.obj](k, { main: ramp(main, 3), acc: ramp(acc, 3) }, a)
}

/** Outline colour of an object. */
export function objectLine(a: ObjectArt): RGB {
  const [main = 0] = (a.c ?? DEFAULTS[a.obj]).split(' ').map(hex)
  return mix(ramp(main, 3)[0] ?? INK, INK, 0.6)
}

/**
 * Effects behind an object: `brighten(mask)` lifts the scene one step (glow, rays); bolts, sparks,
 * speed lines and smoke are painted around the object's box.
 */
export function objectEffects(p: Painter, a: ObjectArt, box: Box, s: number, brighten: (m: ReturnType<Painter['m']>) => void): void {
  const cx = (box.x0 + box.x1 + 1) / 2
  const cy = (box.y0 + box.y1 + 1) / 2
  const r = Math.max(box.w, box.h) * 0.62
  const [, acc = WHITE] = (a.c ?? DEFAULTS[a.obj]).split(' ').map(hex)
  const light = ramp(acc, 3)
  if (on(a, 'glow')) {
    brighten(p.m().disc(cx, cy, r))
    brighten(p.m().disc(cx, cy, r * 0.72))
  }
  if (on(a, 'rays')) brighten(rays(p, cx, cy, 10, 0.02).and(p.m().disc(cx, cy, r * 1.3)))
  if (on(a, 'bolts')) {
    for (const [deg, seed] of [[200, 3], [320, 5], [80, 9]] as const) {
      const from = go(cx, cy, deg, r * 0.5)
      lightning(p, from, go(cx, cy, deg + 10, r * 1.25), light[2] ?? WHITE, { seed, jag: 2 * s, glow: light[0] })
    }
  }
  if (on(a, 'sparks')) sparks(p, rng(11), Math.round(14 * s), [light[1] ?? WHITE, light[2] ?? WHITE], { x: box.x0 - 6, y: box.y0 - 6, w: box.w + 12, h: box.h + 8 })
  if (on(a, 'streak')) {
    const lines = p.m()
    for (let i = 0; i < 6; i++) {
      const y = box.y0 + ((i + 0.5) / 6) * box.h
      const len = (6 + ((i * 5) % 7)) * s
      lines.rect(box.x0 - len - 2 - (i % 2) * 3, y, len, 1)
    }
    p.fill(lines, light[2] ?? WHITE)
  }
  if (on(a, 'smoke')) {
    const puff = p.m()
    for (let i = 0; i < 5; i++) puff.disc(box.x0 + ((i + 0.5) / 5) * box.w, box.y1 - 1 - (i % 2) * 2 * s, (3 + (i % 3)) * s)
    p.fill(puff, hex('8a8a98'))
    p.fill(puff.clone().minus(puff.moved(1, 1)), hex('b8b8c4'))
  }
}

