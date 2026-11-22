import { colors, fire, flameMask } from '../toolkit/index.ts'
import type { Kit, Shape } from './shape.ts'
import { INK, MOUTH, WHITE } from './shape.ts'

/**
 * Creature archetypes and attachable parts. Every archetype is drawn in local units (ground point
 * at 0, 0, looking towards +x, about 40 units tall at scale 1) from back to front, and calls the
 * part painters at the right depth. Parts read the spec; an archetype ignores parts it has no
 * place for.
 */
export type Archetype =
  | 'biped'
  | 'quad'
  | 'serpent'
  | 'bird'
  | 'larva'
  | 'insect'
  | 'blob'
  | 'humanoid'
  | 'fish'
  | 'star'
  | 'cocoon'
  | 'block'
export type Ears = 'point' | 'round' | 'big' | 'long' | 'fluffy' | 'fin' | 'tuft'
export type Tail = 'plain' | 'flame' | 'leaf' | 'bolt' | 'fin' | 'ring' | 'curl' | 'fluff' | 'stinger' | 'fan6' | 'fan9' | 'club'
export type Horn = 'spike' | 'back' | 'nub'
export type Wings = 'bird' | 'bug' | 'small' | 'spiky'
export type Back = 'shell' | 'bulb' | 'bud' | 'spikes'
export type Crest = 'fins' | 'ridge' | 'plume' | 'curl' | 'spiky' | 'flame' | 'mane'
export type Antennae = 'fork' | 'two'
export type Belly = 'patch' | 'band' | 'spiral' | 'skull' | 'pouch'
export type Pattern = 'stripes' | 'spots' | 'bumps'
export type Eyes = 'round' | 'angry' | 'narrow' | 'closed' | 'vacant' | 'red' | 'cyclops'
export type Mouth = 'smile' | 'open' | 'fang' | 'none'
/** Props and special features: held items, gloves, markings. */
export type Extra =
  | 'gloves'
  | 'belt'
  | 'moustache'
  | 'spoon'
  | 'spoons'
  | 'star'
  | 'leek'
  | 'magnets'
  | 'whiskers'
  | 'cheeks'
  | 'claws'
  | 'aura'
  | 'fumes'
  | 'hands'
  | 'arms4'
  | 'nose'
  | 'mound'
  | 'lances'
  | 'split'
  | 'muzzle'

export interface CreatureArt {
  a: Archetype
  /** Hex colours 'body secondary belly accent'; the later ones are optional. */
  c: string
  /** 0 = calm, 1 = action (humanoid 2 = floating cross-legged; cocoon 0 pill, 1 crescent, 2 drop). */
  pose?: number
  /** Scale, 1 = medium (about 40 px tall). */
  s?: number
  /** Look left instead of right. */
  flip?: boolean
  /** Archetype number: build 0–1 (biped, humanoid), leg length (quad), count (blob, cocoon), double (star). */
  n?: number
  ears?: Ears
  tail?: Tail
  horn?: Horn
  wings?: Wings
  back?: Back
  crest?: Crest
  ant?: Antennae
  belly?: Belly
  pat?: Pattern
  eyes?: Eyes
  mouth?: Mouth
  x?: readonly Extra[]
}

type A = CreatureArt
type XY = readonly [number, number]

const WING = colors('8ea8c8', 'cfe2f2', 'f4fbff')
const DIRT = colors('4a2a1c', '7a4a2c', 'a2683a')
const GREEN = colors('2a6a2a', '4c9a38', '8acb5a')
const STEEL = colors('4e5870', '98a4bc', 'dfe6f2')

const rad = (deg: number) => (deg * Math.PI) / 180
/** Point `len` units from (x, y) in direction `deg` (0 = forward, 90 = down, 270 = up). */
const go = (x: number, y: number, deg: number, len: number): [number, number] => [
  x + Math.cos(rad(deg)) * len,
  y + Math.sin(rad(deg)) * len,
]
const has = (a: A, x: Extra) => a.x?.includes(x) ?? false

/** Triangle from a base of width `w` at (x, y) to a tip `len` away in direction `deg`. */
function cone(sh: Shape, x: number, y: number, deg: number, len: number, w: number): Shape {
  const [bx, by] = go(0, 0, deg + 90, w / 2)
  const [tx, ty] = go(x, y, deg, len)
  return sh.p(x + bx, y + by, tx, ty, x - bx, y - by)
}

/** Size class for hand-placed details: 0 small, 1 medium, 2 large. */
const size = (k: Kit) => (k.at.s < 0.85 ? 0 : k.at.s < 1.2 ? 1 : 2)

// ── face ────────────────────────────────────────────────────────────────────

const EYES: Readonly<Record<Eyes, readonly (readonly string[])[]>> = {
  round: [['wk', 'kk', 'kk'], ['.k.', 'kwk', 'kkk', '.k.'], ['.kk.', 'kwkk', 'kkkk', '.kk.']],
  angry: [['wk', 'kk'], ['kwk', 'kkk', '.k.'], ['kwkk', 'kkkk', '.kk.']],
  narrow: [['kk'], ['kkk', '.k.'], ['kkkk', '.kk.']],
  closed: [['kk'], ['kkk'], ['k..k', '.kk.']],
  vacant: [['kk', 'wk'], ['kkk', 'wwk', 'kkk'], ['.kkk.', 'kwwwk', 'kwwkk', '.kkk.']],
  red: [['wr', 'rr'], ['.k.', 'rwk', 'rrk', '.k.'], ['.kk.', 'krwk', 'krrk', '.kk.']],
  cyclops: [['.kkk.', 'kwwwk', 'kwkkk', '.kkk.'], ['.kkkk.', 'kwwwwk', 'kwwkkk', 'kwwkkk', '.kkkk.']],
}

const MOUTHS: Readonly<Record<Exclude<Mouth, 'none'>, readonly (readonly string[])[]>> = {
  smile: [['k.k', '.k.'], ['k..k', '.kk.'], ['k...k', '.kkk.']],
  open: [['kkk', 'krk'], ['kkkk', 'krrk', '.kk.'], ['kkkkk', 'krrrk', 'krttk', '.kkk.']],
  fang: [['kkk', 'wkw'], ['kkkk', 'wkkw', 'krrk'], ['kkkkk', 'wkkkw', 'krrrk', '.kkk.']],
}

/** Eyes at the given local points and a mouth. Angry brows slope down towards the snout (side view) or the middle. */
function face(k: Kit, a: A, eyes: readonly XY[], mouth?: XY, side = 1): void {
  const style = a.eyes ?? 'round'
  const sets = EYES[style]
  const grid = sets[Math.min(sets.length - 1, size(k))] ?? []
  const w = grid[0]?.length ?? 2
  const spots = eyes.map(([x, y]) => k.m().pt(x, y)).sort((p, q) => p[0] - q[0])
  spots.forEach(([px, py], i) => {
    const left = Math.round(px - w / 2)
    const top = Math.round(py - grid.length / 2)
    k.d.stamp(grid, left, top, { k: INK, w: WHITE, r: k.pal.acc[1] })
    if (style !== 'angry') return
    const down = side ? !k.at.flip : i === 0
    for (let j = 0; j <= w; j++) k.d.px(down ? left - 1 + j : left + w - j, top - 2 + Math.floor(j / 2), INK)
  })
  const m = a.mouth ?? 'smile'
  if (mouth && m !== 'none') {
    const ms = MOUTHS[m]
    k.stamp(ms[Math.min(ms.length - 1, size(k))] ?? [], mouth[0], mouth[1], {
      k: m === 'smile' ? k.pal.body[0] : INK,
      r: MOUTH[0],
      t: MOUTH[1],
      w: WHITE,
    })
  }
}

// ── head ────────────────────────────────────────────────────────────────────

export interface Head {
  x: number
  y: number
  rx: number
  ry: number
  /** Snout ellipse: x, y, rx, ry. */
  sn?: readonly [number, number, number, number]
  /** 1 = three-quarter view towards +x, 0 = front view. */
  side: 0 | 1
  turn?: number
}

function ears(k: Kit, a: A, h: Head): void {
  const { body, belly, acc } = k.pal
  const spots: readonly (readonly [number, number, number])[] = h.side
    ? [
        [h.x - 0.5 * h.rx, h.y - 0.62 * h.ry, -112],
        [h.x + 0.1 * h.rx, h.y - 0.82 * h.ry, -82],
      ]
    : [
        [h.x - 0.55 * h.rx, h.y - 0.68 * h.ry, -118],
        [h.x + 0.55 * h.rx, h.y - 0.68 * h.ry, -62],
      ]
  spots.forEach(([x, y, deg], i) => {
    const bias = h.side && i === 0 ? -1 : 0
    const outward = deg < -90 ? -1 : 1
    switch (a.ears) {
      case 'point':
        k.part(cone(k.m(), x, y + 1, deg, 7, 6), body, { bias, bevel: 2 })
        break
      case 'big':
        k.part(cone(k.m(), x, y + 1, deg, 10, 8), body, { bias, bevel: 2.5 })
        k.part(cone(k.m(), x, y + 0.5, deg, 6, 3.6), acc, { bevel: 1.5, line: 'none' })
        break
      case 'long': {
        const ear = cone(k.m(), x, y + 1, deg, 11, 5.5)
        k.part(ear, body, { bias, bevel: 2 })
        const [tx, ty] = go(x, y + 1, deg, 11)
        k.part(k.m().c(tx, ty, 4).and(ear), acc, { bevel: 1.5, line: 'none' })
        break
      }
      case 'round':
        k.part(k.m().c(...go(x, y, deg, 2.5), 3.4), body, { bias, bevel: 2 })
        break
      case 'fluffy': {
        const sh = k.m()
        for (let j = 0; j < 3; j++) sh.c(...go(x, y, deg + outward * (-12 - 22 * j), 3 + 2.6 * j), 3.4 - 0.4 * j)
        k.part(sh, belly, { bias, bevel: 2 })
        break
      }
      case 'fin':
        k.part(cone(k.m(), x, y + 2, h.side ? deg - 70 : deg + outward * 40, 7, 6), belly, { bias, bevel: 2 })
        break
      case 'tuft': {
        const sh = k.m()
        for (let j = 0; j < 3; j++) sh.c(h.x + outward * (h.rx + 0.5), h.y - 1 + j * 3.2, 2.2)
        k.part(sh, body, { bevel: 1.5 })
        break
      }
      default:
    }
  })
}

/** Crest and horn parts that sit behind the head. */
function behindHead(k: Kit, a: A, h: Head): void {
  const { body, belly, acc } = k.pal
  const top = h.y - h.ry
  if (a.crest === 'mane') {
    const sh = k.m()
    for (let i = 0; i < 7; i++) sh.c(...go(h.x - 1, h.y + 1, 90 + i * 30, h.rx * 0.95), h.rx * 0.48)
    k.part(sh, belly, { bevel: 2.5 })
  }
  if (a.crest === 'fins') {
    const sh = k.m()
    for (let i = 0; i < 3; i++) cone(sh, h.x - h.rx * (0.1 + 0.32 * i), top + 1 + i, 250 - i * 22, 7 - i, 4.5)
    k.part(sh, belly, { bevel: 1.5 })
  }
  if (a.crest === 'flame') {
    const [px, py] = k.m().pt(h.x - h.rx * 0.6, top + 3)
    const m = flameMask(k.d, px, py, 9 * k.at.s, 15 * k.at.s, { lean: k.at.flip ? 5 : -5, tongues: 2, seed: 3 })
    fire(k.d, m, acc, { step: 1, dy: 1 })
  }
  if (a.crest === 'plume') {
    const r = k.at.s > 1.1 ? 1 : 0.7
    k.part(k.m().l([h.x - 1, top + 1, h.x - 6 * r, top - 5 * r, h.x - 13 * r, top - 4 * r], [2, 1.8, 0.8]), acc, { bevel: 1.5 })
    k.part(k.m().l([h.x + 1, top + 1, h.x - 3 * r, top - 7 * r, h.x - 9 * r, top - 10 * r], [2, 1.6, 0.8]), acc, { bevel: 1.5 })
  }
  if (a.horn === 'back') k.part(cone(k.m(), h.x - h.rx * 0.45, h.y - h.ry * 0.55, 205, h.rx * 1.2, 5), body, { bevel: 2 })
  if (a.crest === 'spiky') {
    const sh = k.m()
    for (let i = 0; i < 4; i++) cone(sh, h.x - h.rx * (0.4 * i - 0.3), top + 2 + i * 0.8, 255 - i * 25, 8 - i, 4.5)
    k.part(sh, body, { bias: -1, bevel: 1.5 })
  }
}

/** Crest and horn parts on top of the head. */
function onHead(k: Kit, a: A, h: Head): void {
  const { body, sec, belly } = k.pal
  const top = h.y - h.ry
  if (a.horn === 'spike') k.part(cone(k.m(), h.x + h.rx * 0.25 * h.side, top + 2, h.side ? -70 : -90, 7, 4), belly, { bevel: 1.5 })
  if (a.horn === 'nub') k.part(cone(k.m(), h.x + h.rx * 0.3 * h.side, top + 1.5, -80, 4, 3), belly, { bevel: 1.5 })
  if (a.crest === 'ridge') {
    const sh = k.m()
    for (let i = -1; i <= 1; i++) sh.l([h.x + i * 2.6, top + 2, h.x + i * 3.2, top - 2 - (i === 0 ? 1 : 0)], 1.6)
    k.part(sh, body, { bevel: 1.5 })
  }
  if (a.crest === 'curl') {
    k.part(k.m().l([h.x + 1, top + 1, h.x + 1.5, top - 2, h.x + 4, top - 2.5, h.x + 4, top - 0.5], 1.2), sec, { bevel: 1 })
  }
  if (a.ant === 'fork') {
    const [mx, my] = [h.x + 0.2 * h.rx, top - 3]
    k.part(k.m().l([h.x, top + 1, mx, my], 1).l([mx, my, mx - 2.5, my - 3], 0.9).l([mx, my, mx + 2.5, my - 2.5], 0.9), k.pal.acc, { bevel: 1 })
  }
  if (a.ant === 'two') {
    const sh = k.m()
    for (const s of [-1, 1]) sh.l([h.x + s * 2, top + 1, h.x + s * 4, top - 4, h.x + s * 6.5, top - 6], 0.9)
    k.part(sh, sec, { bevel: 1 })
  }
}

/** Paint a head with its ears, crest, horn, antennae and face. Returns the head shape. */
export function head(k: Kit, a: A, h: Head, mouth = true): Shape {
  ears(k, a, h)
  behindHead(k, a, h)
  const sh = k.m().e(h.x, h.y, h.rx, h.ry, h.turn ?? 0)
  if (h.sn) sh.e(...h.sn)
  k.part(sh, k.pal.body)
  if (has(a, 'muzzle') && h.sn) k.part(k.m().e(h.sn[0] + 0.5, h.sn[1] + 0.8, h.sn[2], h.sn[3] * 0.8).and(sh), k.pal.belly, { line: 'none' })
  onHead(k, a, h)
  const eyes: XY[] = h.side
    ? [
        [h.x + 0.05 * h.rx, h.y - 0.15 * h.ry],
        [h.x + 0.62 * h.rx, h.y - 0.15 * h.ry],
      ]
    : [
        [h.x - 0.42 * h.rx, h.y - 0.1 * h.ry],
        [h.x + 0.42 * h.rx, h.y - 0.1 * h.ry],
      ]
  const mx = h.sn ? h.sn[0] + h.sn[2] * 0.45 : h.x + (h.side ? 0.45 * h.rx : 0)
  const my = h.sn ? h.sn[1] + h.sn[3] * 0.55 : h.y + 0.5 * h.ry
  if (has(a, 'cheeks')) for (const [x] of eyes) k.part(k.m().c(x + (h.side ? -1 : 0), h.y + 0.4 * h.ry, 2.2), k.pal.acc, { line: 'none', bevel: 1.5 })
  if (has(a, 'nose')) k.part(k.m().e(mx + (h.side ? 1 : 0), my - 2.5, 2.4, 1.8), k.pal.acc, { bevel: 1.5 })
  if (has(a, 'star')) k.stamp(['.r.', 'rrr', '.r.'], h.x + 0.2 * h.rx * h.side, h.y - 0.62 * h.ry, { r: k.pal.acc[1] })
  face(k, a, eyes, mouth ? [mx, my] : undefined, h.side)
  if (has(a, 'moustache')) {
    const sh = k.m()
    for (const s of [-1, 1]) sh.l([mx + s * 1, my - 1, mx + s * 4, my, mx + s * 6, my + 4, mx + s * 6.5, my + 9], [1.2, 1.1, 0.9, 0.6])
    k.part(sh, k.pal.sec, { bevel: 1 })
  }
  if (has(a, 'whiskers')) {
    const sh = k.m().l([mx, my, mx + 3, my + 2, mx + 6, my + 1, mx + 8, my + 3], 0.8)
    k.part(sh, k.pal.belly, { bevel: 1 })
  }
  return sh
}

// ── tails, wings, backs ─────────────────────────────────────────────────────

/** Tail from (x, y) in direction `deg` (180 = straight back, 270 = up) with length `len`. */
export function tail(k: Kit, a: A, x: number, y: number, deg: number, len: number): void {
  const { body, sec, belly, acc } = k.pal
  const kind = a.tail
  if (!kind) return
  const mid = go(x, y, deg - 18, len * 0.55)
  const tip = go(x, y, deg + 8, len)
  const plain = () => k.part(k.m().l([x, y, ...mid, ...tip], [2.8, 2.2, 1.4]), body, { bevel: 2 })
  switch (kind) {
    case 'plain':
      plain()
      break
    case 'club':
      k.part(k.m().l([x, y, ...go(x, y, deg - 5, len * 0.5), ...go(x, y, deg + 25, len)], [4.5, 3.4, 1.6]), body, { bevel: 3 })
      break
    case 'flame': {
      plain()
      const [px, py] = k.m().pt(...tip)
      const m = flameMask(k.d, px, py + 2 * k.at.s, 7 * k.at.s, 11 * k.at.s, { lean: 1, tongues: 1, seed: 2 })
      k.d.fill(m.grown(1).minus(m), acc[0])
      fire(k.d, m, acc, { step: 1, dy: 1 })
      break
    }
    case 'leaf':
      plain()
      k.part(k.m().e(...go(...tip, deg + 30, 3), 4.5, 2.4, deg + 30), sec, { bevel: 1.5 })
      break
    case 'bolt': {
      k.part(k.m().l([x, y, ...mid, ...tip], [1.4, 1.2, 1]), sec, { bevel: 1 })
      const [tx, ty] = tip
      k.part(k.m().p(tx - 2, ty + 1, tx + 3, ty - 5, tx + 0.5, ty - 5.5, tx + 5, ty - 12, tx - 4, ty - 4, tx - 1, ty - 3.5, tx - 4, ty + 1), body, { bevel: 2 })
      break
    }
    case 'fin':
      k.part(k.m().l([x, y, ...mid], [2.6, 1.8]).e(...go(...mid, deg + 5, 3.5), 5.5, 3.6, deg), belly, { bevel: 2 })
      break
    case 'ring':
      plain()
      k.part(k.m().c(...tip, 2).c(...go(...tip, deg - 30, 3.8), 1.6), acc, { bevel: 1.5 })
      break
    case 'curl': {
      const pts: number[] = [x, y]
      const [cx, cy] = go(x, y, deg - 25, len * 0.55)
      for (let i = 0; i <= 8; i++) pts.push(...go(cx, cy, deg + 150 - i * 40, (len * 0.45 * (10 - i)) / 10))
      k.part(k.m().l(pts, [2.6, 2.4, 2.2, 2, 1.8, 1.6, 1.4, 1.2, 1.1, 1]), body, { bevel: 2 })
      break
    }
    case 'fluff': {
      const sh = k.m()
      for (const [t, r] of [[0.3, 0.2], [0.55, 0.3], [0.8, 0.27], [1, 0.18]] as const) sh.c(...go(x, y, deg - 12 + t * 20, len * t), len * r)
      k.part(sh, belly, { bevel: 3 })
      break
    }
    case 'stinger':
      k.part(k.m().l([x, y, ...mid, ...tip], [2.6, 1.8, 1.2]), body, { bevel: 2 })
      k.part(cone(k.m(), ...tip, deg + 8, 5, 3), belly, { bevel: 1.5 })
      break
    case 'fan6':
    case 'fan9': {
      const n = kind === 'fan6' ? 6 : 9
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const d = deg - 70 + t * 110
        const end = go(x, y, d, len)
        k.part(k.m().l([x, y, ...go(x, y, d - 10, len * 0.5), ...end], [1.6, 2.8, 2.2]), body, { bevel: 2, bias: i % 2 === 0 ? -1 : 0 })
        k.part(k.m().c(...end, 2.3), acc, { bevel: 1.5 })
      }
      break
    }
    default:
  }
}

/** Wings at shoulder (x, y); `spread` raises them for flight. */
export function wings(k: Kit, a: A, x: number, y: number, spread: boolean, near: boolean): void {
  const { body, sec } = k.pal
  const bias = near ? 0 : -1
  const dx = near ? 0 : -3
  switch (a.wings) {
    case 'bird': {
      const sh = spread
        ? k.m().l([x + dx, y, x + dx - 6, y - 9, x + dx - 10, y - 18], [4.5, 4, 2.5]).e(x + dx - 7, y - 12, 4, 8, 35)
        : k.m().e(x - 2, y + 4, 7, 4.5, 15)
      k.part(sh, near ? sec : body, { bias, bevel: 2.5 })
      if (spread) {
        const tips = k.m()
        for (let i = 0; i < 3; i++) tips.l([x + dx - 6 - i * 2, y - 10 + i * 3, x + dx - 13 - i * 3, y - 16 + i * 4], [2, 1])
        k.part(tips, sec, { bias, bevel: 1.5 })
      }
      break
    }
    case 'spiky': {
      const sh = k.m()
      for (let i = 0; i < 4; i++) cone(sh, x + dx - i * 2, y + i, 240 - i * 18, 18 - i * 2.5, 6)
      k.part(sh, body, { bias, bevel: 2 })
      break
    }
    case 'bug':
      k.part(k.m().e(x + dx - 7, y - 7, 9, 4, -35).e(x + dx - 8, y - 1, 7, 3.2, -10), WING, { bias, bevel: 2 })
      break
    case 'small':
      k.part(cone(k.m(), x + dx, y, 215, 6, 6), body, { bias, bevel: 1.5 })
      break
    default:
  }
}

/** Turtle shell behind a body. */
function shell(k: Kit, x: number, y: number, rx: number, ry: number): void {
  const sh = k.part(k.m().e(x, y, rx, ry), k.pal.sec, { bevel: 4 })
  k.d.fill(sh.mask.clone().minus(sh.mask.shrunk(2)), k.pal.belly[1])
}

/** Bulb, bud or spikes on a back whose top is at (x, y). */
function back(k: Kit, a: A, x: number, y: number, w: number): void {
  const { sec, acc } = k.pal
  if (a.back === 'bulb') {
    const sh = k.part(k.m().e(x, y - 4, w * 0.62, w * 0.55).p(x - 3, y - 8, x, y - 4 - w * 0.95, x + 3, y - 8), sec, { bevel: 4 })
    k.d.fill(k.m().line(x - 3.5, y - 1, x - 2, y - 6, x, y - 9).line(x + 3.5, y - 1, x + 2.5, y - 6).and(sh).mask, sec[0])
  }
  if (a.back === 'bud') {
    const leaves = k.m()
    for (const d of [200, 240, 300, 340]) leaves.e(...go(x, y - 2, d, w * 0.55), w * 0.55, w * 0.22, d)
    k.part(leaves, GREEN, { bevel: 2 })
    k.part(k.m().e(x, y - 6, w * 0.38, w * 0.48).p(x - 2, y - 9, x, y - 6 - w * 0.85, x + 2, y - 9), acc, { bevel: 3 })
  }
  if (a.back === 'spikes') {
    const sh = k.m()
    for (let i = 0; i < 4; i++) cone(sh, x - w * 0.5 + i * w * 0.32, y + 2 + Math.abs(i - 1.5) * 1.2, 245 - i * 12, 5.5, 4.4)
    k.part(sh, sec, { bevel: 1.5 })
  }
}

/** Belly markings on a body ellipse. */
function belly(k: Kit, a: A, body: Shape, x: number, y: number, rx: number, ry: number): void {
  const { belly: B } = k.pal
  switch (a.belly) {
    case 'patch':
      k.part(k.m().e(x, y, rx, ry).and(body), B, { line: 'none', bevel: 3 })
      break
    case 'band':
      k.part(k.m().or(body).minus(body.mask.moved(0, -Math.round(3 * k.at.s))), B, { line: 'none', bevel: 2 })
      break
    case 'spiral': {
      k.part(k.m().e(x, y, rx, ry).and(body), B, { line: 'none', bevel: 3 })
      const pts: number[] = []
      for (let i = 0; i <= 14; i++) pts.push(...go(x, y, i * 50, (Math.min(rx, ry) * (i + 1)) / 16))
      k.fill(k.m().line(...pts), INK)
      break
    }
    case 'skull':
      k.stamp(['.www.', 'wkwkw', 'wwwww', '.w.w.', 'w...w'], x, y, { w: B[2], k: k.pal.body[0] })
      break
    case 'pouch':
      k.part(k.m().e(x, y + ry * 0.3, rx, ry * 0.6).and(body), B, { bevel: 2 })
      k.part(k.m().e(x, y - ry * 0.05, rx * 0.45, ry * 0.42), colors('c8c0b0', 'f4f0e6', 'ffffff'), { bevel: 2 })
      k.part(k.m().e(x, y + ry * 0.45, rx * 0.95, ry * 0.4).and(body), B, { bevel: 2 })
      break
    default:
  }
}

/** Body pattern clipped to a body shape. */
function pattern(k: Kit, a: A, body: Shape, x: number, y: number, rx: number): void {
  if (a.pat === 'stripes') {
    const sh = k.m()
    for (let i = -1; i <= 1; i++) sh.p(x + i * rx * 0.55 - 1.2, y - 20, x + i * rx * 0.55 + 1.2, y - 20, x + i * rx * 0.45 + 2, y - 3, x + i * rx * 0.45 - 0.4, y - 3)
    k.fill(sh.and(body.mask.shrunk(1)), k.pal.sec[1])
  }
  if (a.pat === 'spots') {
    const sh = k.m().e(x - rx * 0.4, y - 2, 2.6, 1.8).e(x + rx * 0.3, y - 4, 2, 1.5).e(x - rx * 0.05, y + 2, 2.2, 1.4)
    k.d.tone(sh.and(body).mask, -1)
  }
  if (a.pat === 'bumps') {
    const sh = k.m()
    for (const [dx, dy, r] of [[-0.55, -0.45, 0.22], [0.5, -0.55, 0.18], [0.6, 0.35, 0.2], [-0.5, 0.45, 0.16]] as const) sh.c(x + dx * rx, y + dy * rx, r * rx)
    k.part(sh.and(body.mask.grown(1)), k.pal.sec, { bevel: 2 })
  }
}

// ── limbs and props ─────────────────────────────────────────────────────────

/** Arm from the shoulder; `reach` 0 hangs forward, 1 raises the hand, 2 punches straight ahead. */
function arm(k: Kit, a: A, x: number, y: number, reach: number, far: boolean, r = 2.2, len = 8): XY {
  const elbow = reach === 1 ? go(x, y, -40, len * 0.55) : reach === 2 ? go(x, y, -5, len * 0.6) : go(x, y, 60, len * 0.55)
  const hand = reach === 1 ? go(...elbow, -80, len * 0.5) : reach === 2 ? go(...elbow, 0, len * 0.55) : go(...elbow, -10, len * 0.45)
  const o = { bias: far ? -1 : 0, bevel: 2 }
  k.part(k.m().l([x, y, ...elbow, ...hand], [r, r * 0.9, r * 0.85]), k.pal.body, o)
  if (has(a, 'gloves')) k.part(k.m().c(...hand, r * 1.45), k.pal.acc, o)
  else if (has(a, 'claws')) k.part(k.m().c(...hand, r * 0.9), k.pal.belly, o)
  return hand
}

/** Props held in a hand. */
function props(k: Kit, a: A, hands: readonly XY[]): void {
  const [h0, h1] = hands
  if ((has(a, 'spoon') || has(a, 'spoons')) && h1) spoon(k, h1, -60)
  if (has(a, 'spoons') && h0) spoon(k, h0, -120)
  if (has(a, 'leek') && h1) {
    k.part(k.m().l([h1[0] - 2, h1[1] + 5, h1[0] + 3, h1[1] - 6], 1.3), colors('c8c8b0', 'f0f0e0', 'ffffff'), { bevel: 1 })
    k.part(k.m().l([h1[0] + 3, h1[1] - 6, h1[0] + 5, h1[1] - 12, h1[0] + 9, h1[1] - 14], [1.5, 2, 1.2]), GREEN, { bevel: 1.5 })
  }
  if (has(a, 'lances')) for (const h of hands) k.part(cone(k.m(), ...h, -15, 11, 4), colors('7a7a90', 'c8c8d8', 'f4f4ff'), { bevel: 1.5 })
}

function spoon(k: Kit, [x, y]: XY, deg: number): void {
  const [tx, ty] = go(x, y, deg, 8)
  k.part(k.m().l([x, y, tx, ty], 0.7).e(...go(tx, ty, deg, 1.5), 1.7, 2.4, deg + 90), STEEL, { bevel: 1 })
}

// ── archetypes ──────────────────────────────────────────────────────────────

function biped(k: Kit, a: A): void {
  const P = k.pal
  const b = a.n ?? 0
  const up = a.pose === 1 ? 1 : 0
  const by = -12 - 3 * b
  const brx = 8.2 + 3.5 * b
  const bry = 9.5 + 4 * b
  tail(k, a, -5 - 2 * b, by + 5, a.tail === 'club' ? 175 : 200, 12 + 6 * b)
  wings(k, a, -3, by - 5, false, false)
  if (a.back === 'shell') shell(k, -3.5, by - 0.5, brx + 1.5, bry + 0.5)
  const h0 = arm(k, a, -3 - b, by - 5 - b, up, true, 2.2 + b, 8 + 3 * b)
  k.part(k.m().e(-3.5, -4 - b, 3.4 + b, 4.4 + b).e(-3, -1.6, 3.8 + b, 2), P.body, { bias: -1, bevel: 2 })
  const body = k.part(k.m().e(1, by, brx, bry), P.body)
  belly(k, a, body, 2.5 + b, by + 1, brx * 0.68, bry * 0.78)
  pattern(k, a, body, 1, by + 6, brx)
  back(k, a, -2 - b, by - bry + 2, brx)
  k.part(k.m().e(4.5, -4 - b, 3.6 + b, 4.6 + b).e(5.5, -1.6, 4 + b, 2.1), P.body, { bevel: 2 })
  if (has(a, 'claws')) k.part(k.m().e(8.5, -1.2, 1.5, 1.1), P.belly, { bevel: 1 })
  const h1 = arm(k, a, 6 + b, by - 5 - b, up, false, 2.3 + b, 8 + 3 * b)
  const hr = 9 - 3 * b
  head(k, a, { x: 3 - b, y: by - bry - hr * 0.62, rx: hr, ry: hr * 0.92, sn: [3 - b + hr * 0.72, by - bry - hr * 0.42, hr * 0.5, hr * 0.42], side: 1 })
  props(k, a, [h0, h1])
}

function quad(k: Kit, a: A): void {
  const P = k.pal
  const L = a.n ?? 6
  const run = a.pose === 1
  const by = -L - 7
  tail(k, a, -12, by - 2, a.tail === 'fluff' ? 195 : 210, 13)
  wings(k, a, -2, by - 4, false, false)
  const legs = (fx: number, sx: number, bias: number) => {
    const r = 2.6 + L * 0.05
    const f = run ? [fx + 2, by + 3, fx + 6, -L * 0.5, fx + 8, -1.5] : [fx, by + 3, fx + 0.5, -L * 0.45, fx + 1, -1.5]
    const s = run ? [sx - 1, by + 3, sx - 5, -L * 0.45, sx - 8, -1.5] : [sx, by + 3, sx - 0.5, -L * 0.45, sx - 1, -1.5]
    k.part(k.m().l(f, [r + 0.6, r, r * 0.9]).e(f[4] ?? 0, -1.4, r + 0.6, 1.6), P.body, { bias, bevel: 2 })
    k.part(k.m().l(s, [r + 1.2, r, r * 0.9]).e(s[4] ?? 0, -1.4, r + 0.6, 1.6), P.body, { bias, bevel: 2 })
  }
  legs(7, -7, -1)
  const body = k.part(k.m().e(0, by, 12.5, 7.2, run ? -8 : 0), P.body)
  belly(k, a, body, 1, by + 3.5, 9, 3.5)
  pattern(k, a, body, 0, by + 6, 12)
  back(k, a, -1, by - 5, 11)
  legs(10, -4, 0)
  if (a.crest === 'flame') {
    const [px, py] = k.m().pt(9, by - 4)
    fire(k.d, flameMask(k.d, px, py, 10 * k.at.s, 14 * k.at.s, { lean: k.at.flip ? 4 : -4, tongues: 2, seed: 5 }), P.acc, { step: 1 })
  }
  const hy = by - (run ? 10 : 8)
  head(k, { ...a, crest: a.crest === 'flame' ? undefined : a.crest }, { x: 13.5, y: hy, rx: 7, ry: 6.5, sn: [18.5, hy + 2, 4.4, 3.2], side: 1 })
}

function serpent(k: Kit, a: A): void {
  const P = k.pal
  const coil = a.pose === 1
  const path = coil
    ? [-20, -3, -6, -2, 8, -6, 9, -18, -2, -24, 0, -33, 8, -36]
    : [-22, -2, -10, -3, 2, -6, 6, -16, -2, -25, 4, -33, 11, -35]
  const radii = [1.6, 3.6, 4.6, 4.8, 4.4, 4, 3.8]
  const n = path.length / 2
  const hx = path[path.length - 2] ?? 0
  const hy = path[path.length - 1] ?? 0
  if (a.tail) tail(k, a, path[0] ?? 0, path[1] ?? 0, 190, 4)
  let body: Shape
  if (has(a, 'mound')) {
    // a chain of boulders
    body = k.m()
    for (let i = 0; i < n; i++) {
      const seg = k.m().c(path[i * 2] ?? 0, path[i * 2 + 1] ?? 0, (radii[i] ?? 3) + 0.8)
      k.part(seg, P.body, { bevel: 2.5 })
      body.or(seg)
    }
  } else {
    body = k.part(k.m().l(path, radii), P.body)
    belly(k, { ...a, belly: a.belly ?? 'band' }, body, 0, 0, 0, 0)
    if (has(a, 'split')) k.part(k.m().c(path[4] ?? 0, path[5] ?? 0, 1.8).c(path[8] ?? 0, (path[9] ?? 0) - 3, 1.8), P.acc, { bevel: 1.5 })
  }
  head(k, a, { x: hx, y: hy, rx: 5.6, ry: 5, sn: [hx + 4.5, hy + 1.5, 4, 3], side: 1, turn: coil ? 15 : 0 })
}

function bird(k: Kit, a: A): void {
  const P = k.pal
  const fly = a.pose === 1
  const by = fly ? -22 : -11
  if (fly) wings(k, a, -1, by - 3, true, false)
  k.part(k.m().p(-6, by - 1, -16, by + (fly ? 4 : 1), -15, by + (fly ? 8 : 6), -5, by + 4), P.sec, { bevel: 2 })
  if (!fly) k.part(k.m().l([-1, by + 5, -1.5, -0.5], 0.8).l([2, by + 5, 2.5, -0.5], 0.8).e(-1, -0.6, 2, 0.8).e(3, -0.6, 2, 0.8), P.acc, { bevel: 1 })
  const body = k.part(k.m().e(0, by, 8.5, 6.8, -12), P.body)
  belly(k, a, body, 3, by + 2, 5.5, 4.5)
  if (!fly) wings(k, a, -1, by - 3, false, true)
  const hx = 6
  const hy = by - 9
  head(k, a, { x: hx, y: hy, rx: 5.6, ry: 5.2, side: 1 }, false)
  k.part(k.m().p(hx + 4.5, hy - 1, hx + 10, hy + 1.2, hx + 4.5, hy + 2.5), P.acc, { bevel: 1.5 })
  if (fly) {
    wings(k, a, -1, by - 3, true, true)
    k.part(k.m().l([-1, by + 5, -3, by + 9], 0.9).l([2, by + 5, 0, by + 9], 0.9), P.acc, { bevel: 1 })
  }
  props(k, a, [[-1, by + 2], [7, by + 1]])
}

function larva(k: Kit, a: A): void {
  const P = k.pal
  const pts = a.pose === 1 ? [-15, -3.5, -9, -4, -3.5, -6, -1, -12, 1.5, -18] : [-17, -3.5, -11, -4, -5, -4.5, 0.5, -6.5, 4, -12]
  const r = [3.2, 3.8, 4.3, 4.6]
  tail(k, a, (pts[0] ?? 0) - 2, pts[1] ?? 0, 185, 5)
  const body = k.m()
  for (let i = 0; i < 4; i++) {
    const seg = k.m().c(pts[i * 2] ?? 0, pts[i * 2 + 1] ?? 0, r[i] ?? 4)
    k.part(seg, P.body, { bevel: 3 })
    body.or(seg)
    k.part(k.m().c((pts[i * 2] ?? 0) + 0.5, (pts[i * 2 + 1] ?? 0) + (r[i] ?? 4) * 0.45, (r[i] ?? 4) * 0.55).and(seg), P.belly, { line: 'none', bevel: 1.5 })
  }
  const hx = pts[8] ?? 0
  const hy = pts[9] ?? 0
  head(k, a, { x: hx, y: hy, rx: 6.2, ry: 6, side: 1 })
}

function insect(k: Kit, a: A): void {
  const P = k.pal
  wings(k, a, -2, -26, true, false)
  const abd = k.part(k.m().e(-6, -13, 5.2, 8.5, 28), P.body)
  const stripes = k.m()
  for (let i = 0; i < 3; i++) stripes.e(-5 + i * -1.5, -16 + i * 4, 6, 1.1, 28)
  k.fill(stripes.and(abd.mask.shrunk(1)), P.sec[0])
  k.part(cone(k.m(), -9.5, -6, 118, 6, 3.5), P.belly, { bevel: 1.5 })
  k.part(k.m().l([1, -18, 3, -12, 2, -8], 0.8).l([-1, -18, -1, -12, -3, -9], 0.8), P.sec, { bevel: 1 })
  k.part(k.m().e(0, -21, 4.2, 4.6), P.body, { bevel: 3 })
  wings(k, a, 0, -26, true, true)
  head(k, a, { x: 4, y: -28, rx: 5, ry: 4.6, side: 1 }, false)
  props(k, a, [[1, -19], [4, -18]])
}

function blob(k: Kit, a: A): void {
  const P = k.pal
  const count = a.n ?? 1
  const sit = a.pose === 1
  const spots: readonly (readonly [number, number, number])[] =
    count >= 3 ? [[-9, -14, 0.62], [9, -15, 0.62], [0, -30, 0.62]] : count === 2 ? [[-7, -20, 0.8], [8, -16, 0.8]] : [[0, sit ? -11 : -21, 1]]
  for (const [cx, cy, sc] of spots) {
    const r = 11 * sc
    if (has(a, 'aura')) {
      const gas = k.m()
      for (let i = 0; i < 9; i++) gas.c(...go(cx, cy, i * 40 + 10, r * 1.05), r * (i % 2 ? 0.42 : 0.55))
      k.part(gas, P.sec, { bevel: 3 })
    }
    if (has(a, 'fumes')) for (const s of [-1, 1]) k.part(k.m().c(cx + s * r * 0.95, cy - r * 0.8, r * 0.28).c(cx + s * r * 1.2, cy - r * 1.15, r * 0.2), P.acc, { bevel: 2 })
    tail(k, a, cx - r * 0.7, cy + r * 0.5, 160, r * 0.9)
    wings(k, a, cx - r * 0.6, cy - r * 0.3, false, false)
    if (sit) k.part(k.m().e(cx - r * 0.45, -1.8, r * 0.35, 2.2).e(cx + r * 0.5, -1.8, r * 0.35, 2.2), P.body, { bias: -1, bevel: 2 })
    if (has(a, 'magnets')) {
      for (const s of [-1, 1]) {
        const mx = cx + s * r * 1.25
        const u = k.m().e(mx, cy + 1, r * 0.42, r * 0.5).minus(k.m().e(mx, cy + 1 + r * 0.1, r * 0.18, r * 0.42)).minus(k.m().p(mx - r, cy + 1.5, mx + r, cy + 1.5, mx + r, cy + r, mx - r, cy + r))
        k.part(u, STEEL, { bevel: 1.5 })
        k.part(k.m().p(mx + s * r * 0.42, cy + 0.5, mx + s * r * 0.08, cy + 0.5, mx + s * r * 0.08, cy + 2.5, mx + s * r * 0.42, cy + 2.5), s < 0 ? colors('6a1824', 'd8384a', 'ff8a90') : colors('183a7a', '3a7ae0', '9ac4ff'), { bevel: 1 })
      }
      k.part(k.m().l([cx, cy - r * 0.9, cx, cy - r * 1.35], 1).e(cx, cy - r * 1.4, 1.8, 1), STEEL, { bevel: 1 })
    }
    const bodyShape = k.m().c(cx, cy, r)
    if (a.ears === 'long' || a.ears === 'point' || a.ears === 'tuft') ears(k, a, { x: cx, y: cy - r * 0.15, rx: r, ry: r, side: 0 })
    if (a.crest === 'spiky') {
      const sh = k.m()
      for (let i = 0; i < 5; i++) cone(sh, cx - r * 0.7 + i * r * 0.35, cy - r * 0.55, -150 + i * 30, r * 0.8, r * 0.5)
      k.part(sh, P.body, { bevel: 2 })
    }
    if (has(a, 'mound')) bodyShape.p(cx - r * 0.7, cy + r * 0.5, cx - r * 1.6, cy + r * 1.7, cx + r * 0.1, cy + r * 0.9)
    const body = k.part(bodyShape, P.body)
    if (has(a, 'split')) {
      k.part(k.m().c(cx, cy, r).and(k.m().p(cx - r - 2, cy + 0.5, cx + r + 2, cy + 0.5, cx + r + 2, cy + r + 2, cx - r - 2, cy + r + 2)), P.belly, { bevel: r * 0.7 })
    }
    pattern(k, a, body, cx, cy, r)
    belly(k, a, body, cx, cy + r * 0.3, r * 0.6, r * 0.55)
    if (a.crest === 'curl') onHead(k, a, { x: cx, y: cy, rx: r, ry: r, side: 0 })
    if (sit || has(a, 'gloves') || has(a, 'hands')) {
      const reach = has(a, 'hands') ? 2.6 : 1
      for (const s of [-1, 1]) {
        const hx = cx + s * r * (0.95 + (reach - 1) * 0.5)
        const hy = cy + r * (has(a, 'hands') ? -0.1 : 0.25)
        if (!has(a, 'hands')) k.part(k.m().l([cx + s * r * 0.75, cy + r * 0.1, hx, hy], r * 0.18), P.body, { bevel: 1.5 })
        if (has(a, 'gloves') || has(a, 'hands')) k.part(k.m().c(hx, hy, r * 0.28), has(a, 'hands') ? P.body : P.acc, { bevel: 2 })
      }
    }
    const eyeY = cy - r * (has(a, 'gloves') ? 0.55 : 0.15)
    const eyes: XY[] = a.eyes === 'cyclops' ? [[cx, cy - r * 0.05]] : [[cx - r * 0.36, eyeY], [cx + r * 0.36, eyeY]]
    face(k, a, eyes, [cx, cy + r * (has(a, 'gloves') ? -0.2 : 0.42)], 0)
  }
}

function humanoid(k: Kit, a: A): void {
  const P = k.pal
  const b = a.n ?? 0
  const pose = a.pose ?? 0
  const sit = pose === 2
  const lift = sit ? -8 : 0
  const ty = -18 - b * 2 + lift
  const sw = 6 + b * 3
  tail(k, a, -3, ty + 7, 160, 9)
  const four = has(a, 'arms4')
  const reach0 = pose === 1 ? 1 : 0
  const reach1 = pose === 1 ? 2 : 0
  const ar = 1.8 + b * 1.2
  const al = 9 + b * 2
  const hands: XY[] = []
  hands.push(arm(k, a, -sw + 1, ty - 4, reach0, true, ar, al))
  if (four) hands.push(arm(k, a, -sw + 2, ty + 1, reach1 === 2 ? 1 : 2, true, ar * 0.9, al))
  if (sit) {
    k.part(k.m().e(0, ty + 9, 9 + b * 2, 3.2).e(-7, ty + 9, 3, 2.2).e(7, ty + 9, 3, 2.2), P.body, { bias: -1, bevel: 2 })
  } else {
    const st = pose === 1 ? 2 : 0
    k.part(k.m().l([-2.5, ty + 5, -3.5 - st, -6, -4.5 - st, -1.5], [2.6 + b, 2.3 + b, 2 + b]).e(-4.5 - st, -1.2, 3 + b, 1.6), P.body, { bias: -1, bevel: 2 })
  }
  const torso = k.part(k.m().e(0, ty, sw, 8 + b).e(0, ty + 5, sw * 0.7, 5), P.body)
  belly(k, a, torso, 1, ty + 1, sw * 0.6, 5.5)
  pattern(k, a, torso, 0, ty + 8, sw)
  if (has(a, 'belt')) {
    k.part(k.m().e(0, ty + 7, sw * 0.75, 3).and(k.m().p(-20, ty + 6, 20, ty + 6, 20, ty + 20, -20, ty + 20)), P.sec, { bevel: 2 })
    k.part(k.m().p(-sw * 0.8, ty + 5, sw * 0.8, ty + 5, sw * 0.8, ty + 7, -sw * 0.8, ty + 7).and(k.m().e(0, ty + 5, sw * 0.9, 9)), P.acc, { bevel: 1 })
  }
  if (!sit) {
    const st = pose === 1 ? 2 : 0
    k.part(k.m().l([2.5, ty + 5, 3.5 + st, -6, 4.5 + st, -1.5], [2.6 + b, 2.3 + b, 2 + b]).e(5.5 + st, -1.2, 3 + b, 1.6), P.body, { bevel: 2 })
  }
  if (four) hands.push(arm(k, a, sw - 2, ty + 1, reach0 === 1 ? 2 : 1, false, ar * 0.9, al))
  hands.push(arm(k, a, sw - 1, ty - 4, reach1, false, ar, al))
  const hr = 6.2 - b
  const hy = ty - 8 - b - hr * 0.7
  head(k, a, { x: 1, y: hy, rx: hr, ry: hr * 0.95, sn: has(a, 'moustache') || a.ears === 'point' ? [4.5, hy + 2, 3, 2.4] : undefined, side: 1 })
  props(k, a, [hands[0] ?? [0, 0], hands[hands.length - 1] ?? [0, 0]])
}

function fish(k: Kit, a: A): void {
  const P = k.pal
  const flop = a.pose === 1
  const cy = flop ? -20 : -15
  k.part(k.m().p(-9, cy, -19, cy - 9, -16, cy, -19, cy + 9), P.acc, { bevel: 2 })
  const crown = k.m()
  for (let i = 0; i < 3; i++) cone(crown, -3 + i * 3.5, cy - 7.5, 250 + i * 15, 6, 4)
  k.part(crown, P.acc, { bevel: 1.5 })
  const body = k.part(k.m().e(0, cy, 12, 8.6), P.body)
  belly(k, { ...a, belly: a.belly ?? 'band' }, body, 0, 0, 0, 0)
  k.part(k.m().e(1, cy + 4, 3.6, 2.2, 30), P.acc, { bevel: 1.5 })
  face(k, a, [[6, cy - 2.5]], [11, cy + 1.5])
  if (has(a, 'whiskers')) k.part(k.m().l([10, cy + 1, 13, cy + 5, 12, cy + 10], 0.8).l([9, cy + 2, 10, cy + 7, 8, cy + 11], 0.8), P.belly, { bevel: 1 })
}

function star(k: Kit, a: A): void {
  const P = k.pal
  const turn = (a.pose === 1 ? 18 : 0) - 90
  const cy = -19
  const pts = (rOut: number, rIn: number, t: number) => {
    const out: number[] = []
    for (let i = 0; i < 10; i++) out.push(...go(0, cy, t + i * 36, i % 2 ? rIn : rOut))
    return out
  }
  if ((a.n ?? 1) > 1) k.part(k.m().p(...pts(17, 7.5, turn + 36)), P.sec, { bevel: 3 })
  k.part(k.m().p(...pts(16, 6.8, turn)), P.body, { bevel: 3 })
  k.part(k.m().c(0, cy, 4.6), P.belly, { bevel: 2 })
  k.part(k.m().c(0, cy, 3), P.acc, { bevel: 2, line: 'none' })
  k.d.px(...(k.m().pt(-1, cy - 1).map(Math.round) as [number, number]), WHITE)
}

function cocoon(k: Kit, a: A): void {
  const P = k.pal
  const pose = a.pose ?? 0
  const count = a.n ?? 1
  const spots: readonly (readonly [number, number])[] = count >= 3 ? [[-11, -2], [11, -1], [0, 2]] : [[0, 0]]
  for (const [cx, dy] of spots) {
    const s = count >= 3 ? 0.78 : 1
    const sh = k.m()
    if (pose === 1) sh.e(cx + 2, -17, 7.5, 14.5).minus(k.m().e(cx - 7, -19, 6.5, 12.5)).e(cx + 3, -17, 6, 12)
    else if (pose === 2) sh.e(cx, -12, 8, 10).p(cx - 6.5, -15, cx - 1, -31, cx + 6.5, -15)
    else sh.l([cx, dy - 3, cx, dy - 18 * s], 7 * s)
    k.part(sh, P.body, { bevel: pose === 0 ? 5 : 4 })
    if (pose === 2) k.part(k.m().e(cx - 7.5, -12, 2.4, 3.6, 20).e(cx + 7.5, -12, 2.4, 3.6, -20), P.body, { bias: -1, bevel: 1.5 })
    const ey = pose === 0 ? dy - 18 * s : pose === 1 ? -22 : -18
    const ex = pose === 1 ? cx + 4 : cx
    const eyes: XY[] = [[ex - 2.6 * s, ey], [ex + 2.6 * s, ey]]
    if (has(a, 'nose')) {
      face(k, { ...a, mouth: 'none' }, eyes, undefined, 0)
      k.part(k.m().e(cx, ey + 4 * s, 3 * s, 2.2 * s), P.acc, { bevel: 1.5 })
    } else face(k, a, eyes, [ex, ey + 4], 0)
    if (has(a, 'mound')) k.part(k.m().e(cx, dy + 0.5, 11 * s, 4).p(cx - 12 * s, dy + 1, cx + 12 * s, dy + 1, cx, dy + 4), DIRT, { bevel: 2 })
  }
}

function block(k: Kit, a: A): void {
  const P = k.pal
  const lean = a.pose === 1 ? 4 : 0
  k.part(k.m().p(-12, -16, -6, -19, -5, -12, -11, -9), P.sec, { bevel: 2 })
  k.part(k.m().p(-4, -6, 0, -6, 0, -1, -5, -1).p(4, -6, 8, -6, 9, -1, 4, -1), P.sec, { bias: -1, bevel: 1.5 })
  k.part(k.m().p(-8, -20, 6, -21, 8, -7, -7, -6), P.body, { bevel: 2.5 })
  k.part(k.m().p(1, -30 - lean, 11, -29 - lean, 11, -20, 1, -20), P.body, { bevel: 2.5 })
  k.part(k.m().p(10, -27 - lean, 17, -25 - lean, 17, -22, 10, -22), P.sec, { bevel: 1.5 })
  face(k, { ...a, mouth: 'none' }, [[6, -26 - lean / 2]])
}

const ARCHETYPES: Readonly<Record<Archetype, (k: Kit, a: A) => void>> = {
  biped,
  quad,
  serpent,
  bird,
  larva,
  insect,
  blob,
  humanoid,
  fish,
  star,
  cocoon,
  block,
}

/** Paint the creature of a spec onto the kit's layer. */
export function creature(k: Kit, a: A): void {
  ARCHETYPES[a.a](k, a)
}

