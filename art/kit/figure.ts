import type { RGB, Ramp } from '../toolkit/index.ts'
import { colors, fromHsl, hex, mix, ramp, toHsl } from '../toolkit/index.ts'
import type { Kit, Shape } from './shape.ts'
import { INK, MOUTH, WHITE } from './shape.ts'

/**
 * Figure template: an anime-style person for One Piece characters, Riftbound champions and
 * Yu-Gi-Oh! warriors and spellcasters. Drawn in local units (ground point 0, 0, looking towards
 * +x in a three-quarter view, about 40 units tall at scale 1) from back to front.
 *
 * Spec (every field but `fig` and `wear` is optional; colours are hex codes without '#'):
 *
 *   fig    build: slim | normal | broad | small (yordles, children) | giant
 *   skin   skin colour, default 'f1b688'
 *   hair   'style colour': short | spiky | long | pony | braids | bun | wild | mohawk | bald | slick | afro
 *   hat    'kind [colour]': straw | bandana | tricorn | hood | helmet | horns | fox | bunny | cap | crown |
 *          tophat | wide | pointed (default colours: straw yellow, steel helmet, bone horns, gold crown,
 *          fox ears in hair colour, hood in the outfit colour, others in the accent colour)
 *   face   extras: scar | eyepatch | goggles | beard | moustache | mask | blindfold | nose (long) |
 *          saw (saw nose) | shades | glasses | elf (pointed ear)
 *   wear   'outfit main [accent] [legs]': shirt | open (open shirt or vest) | bare (shirtless) | coat |
 *          robe | armour | dress | kimono | suit; legs default to the main colour, a shade darker
 *   cape   cape colour (flows behind the shoulders)
 *   prop   held in the near hand, 'kind [colour]': katana | katana2 | katana3 (one per hand, one in the
 *          mouth) | sword | greatsword | axe | spear | scythe | staff | club | pistol | pistols | rifle |
 *          minigun | launcher | bow | slingshot | book | cup | fan | shield | orb | fists
 *   prop2  the same for the far hand (pistols, katana2 and katana3 fill both hands themselves)
 *   pose   stand (default) | action (lunge, weapon forward) | cross (arms crossed) | cast (arms up)
 *   eyes   round (default) | angry | narrow | closed | glow (accent colour)
 *   mouth  smile (default) | grin | open | flat | fang | none
 *   x      extras: tails (fox tails) | wings | aura | tank (back pack)
 *   s      size (1 = fills the window), flip: look left
 *
 * Example: { fig: 'slim', skin: 'c08850', hair: 'wild 1c1418', face: ['nose', 'goggles'],
 *            wear: 'shirt e8d8b0 8a5a30 6a4a30', prop: 'slingshot', pose: 'action' }
 */
export type Build = 'slim' | 'normal' | 'broad' | 'small' | 'giant'
export type Hair = 'short' | 'spiky' | 'long' | 'pony' | 'braids' | 'bun' | 'wild' | 'mohawk' | 'bald' | 'slick' | 'afro'
export type Hat = 'straw' | 'bandana' | 'tricorn' | 'hood' | 'helmet' | 'horns' | 'fox' | 'bunny' | 'cap' | 'crown' | 'tophat' | 'wide' | 'pointed'
export type FaceExtra = 'scar' | 'eyepatch' | 'goggles' | 'beard' | 'moustache' | 'mask' | 'blindfold' | 'nose' | 'saw' | 'shades' | 'glasses' | 'elf'
export type Outfit = 'shirt' | 'open' | 'bare' | 'coat' | 'robe' | 'armour' | 'dress' | 'kimono' | 'suit'
export type Prop =
  | 'katana'
  | 'katana2'
  | 'katana3'
  | 'sword'
  | 'greatsword'
  | 'axe'
  | 'spear'
  | 'scythe'
  | 'staff'
  | 'club'
  | 'pistol'
  | 'pistols'
  | 'rifle'
  | 'minigun'
  | 'launcher'
  | 'bow'
  | 'slingshot'
  | 'book'
  | 'cup'
  | 'fan'
  | 'shield'
  | 'orb'
  | 'fists'
export type Pose = 'stand' | 'action' | 'cross' | 'cast'
export type FigureEyes = 'round' | 'angry' | 'narrow' | 'closed' | 'glow'
export type FigureMouth = 'smile' | 'grin' | 'open' | 'flat' | 'fang' | 'none'
export type FigureExtra = 'tails' | 'wings' | 'aura' | 'tank'

type Coded<T extends string> = T | `${T} ${string}`

export interface FigureArt {
  fig: Build
  skin?: string
  hair?: Coded<Hair>
  hat?: Coded<Hat>
  face?: readonly FaceExtra[]
  wear: Coded<Outfit>
  cape?: string
  prop?: Coded<Prop>
  prop2?: Coded<Prop>
  pose?: Pose
  eyes?: FigureEyes
  mouth?: FigureMouth
  x?: readonly FigureExtra[]
  s?: number
  flip?: boolean
}

type XY = readonly [number, number]

const STEEL = colors('4e5870', '98a4bc', 'dfe6f2')
const WOOD = colors('5a3a22', '8a5a32', 'b88450')
const GOLD = colors('8a5a10', 'd09a1c', 'f6d050')
const BONE = colors('a8987a', 'e0d4b8', 'fff8e8')
const STRAW = colors('b0802c', 'e8c060', 'fff0a8')
const BAND = colors('7a1420', 'c82c30', 'f06a5a')
const GUN = colors('1c1a24', '3a3644', '6a6478')
const LENS = hex('f0c040')

/** Proportions of a build, in local units. */
interface Body {
  leg: number
  torso: number
  /** Half widths of shoulders and hips. */
  sw: number
  hw: number
  /** Head radius, leg and arm radius. */
  hr: number
  lr: number
  ar: number
}

const BODY: Readonly<Record<Build, Body>> = {
  slim: { leg: 15, torso: 10.5, sw: 4.8, hw: 3.3, hr: 5.6, lr: 1.6, ar: 1.35 },
  normal: { leg: 14, torso: 11, sw: 5.6, hw: 3.8, hr: 5.8, lr: 1.9, ar: 1.6 },
  broad: { leg: 14, torso: 12, sw: 7.4, hw: 4.8, hr: 5.6, lr: 2.4, ar: 2.2 },
  small: { leg: 7.5, torso: 8, sw: 4.2, hw: 3.2, hr: 6.6, lr: 1.7, ar: 1.4 },
  giant: { leg: 15, torso: 15, sw: 10, hw: 6.4, hr: 5.4, lr: 3.2, ar: 3.2 },
}

const r3 = (c: RGB): Ramp => ramp(c, 3)

function coded<T extends string>(s: string | undefined): [T | undefined, RGB[]] {
  if (!s) return [undefined, []]
  const [kind = '', ...cs] = s.split(' ')
  return [kind as T, cs.map(hex)]
}

/** A darker, slightly cooler shade of a colour (trousers under a coat of the same colour). */
const deeper = (c: RGB) => {
  const [h, s, l] = toHsl(c)
  return fromHsl(h, s * 0.9, l * 0.62)
}

interface Fig {
  k: Kit
  a: FigureArt
  B: Body
  outfit: Outfit
  pose: Pose
  skin: Ramp
  hair: Ramp
  main: Ramp
  acc: Ramp
  legs: Ramp
  hipY: number
  shY: number
  /** Head centre and radius. */
  hx: number
  hy: number
  hr: number
  /** Shoulder points: near (front) and far. */
  sn: XY
  sf: XY
  /** Size class for hand-placed details: 0 small, 1 medium, 2 large. */
  z: 0 | 1 | 2
}

const has = (f: Fig, x: FigureExtra) => f.a.x?.includes(x) ?? false
const face = (f: Fig, x: FaceExtra) => f.a.face?.includes(x) ?? false
const go = (x: number, y: number, deg: number, len: number): [number, number] => [x + Math.cos((deg * Math.PI) / 180) * len, y + Math.sin((deg * Math.PI) / 180) * len]

// ── hands and arms ──────────────────────────────────────────────────────────

interface Arm {
  elbow: XY
  hand: XY
  /** Direction a held prop points to (degrees, 0 = forward, -90 = up). */
  aim: number
}

/** Elbow, hand and aim of both arms for a pose; `holds` bends the near arm to present a prop. */
function arms(f: Fig, holds: boolean): { near: Arm; far: Arm } {
  const [nx, ny] = f.sn
  const [fx, fy] = f.sf
  const L = f.B.torso / 11
  switch (f.pose) {
    case 'action':
      return {
        near: { elbow: [nx + 3.6 * L, ny + 1.6 * L], hand: [nx + 7.6 * L, ny + 1.2 * L], aim: -12 },
        far: { elbow: [fx - 2.6 * L, ny + 4 * L], hand: [fx - 4.6 * L, ny + 7.6 * L], aim: -150 },
      }
    case 'cross':
      return {
        near: { elbow: [nx + 0.8 * L, ny + 5.4 * L], hand: [-f.B.sw * 0.45, ny + 4.6 * L], aim: 180 },
        far: { elbow: [fx - 0.8 * L, fy + 5.4 * L], hand: [f.B.sw * 0.5, fy + 3.6 * L], aim: 0 },
      }
    case 'cast':
      return {
        near: { elbow: [nx + 2.6 * L, ny - 1.6 * L], hand: [nx + 4.4 * L, ny - 6.4 * L], aim: -90 },
        far: { elbow: [fx - 2.4 * L, fy - 1.2 * L], hand: [fx - 3.6 * L, fy - 6 * L], aim: -100 },
      }
    default:
      return {
        near: holds
          ? { elbow: [nx + 1.4 * L, ny + 5 * L], hand: [nx + 4 * L, ny + 7 * L], aim: -62 }
          : { elbow: [nx + 0.9 * L, ny + 5 * L], hand: [nx + 1.3 * L, ny + 10 * L], aim: 95 },
        far: { elbow: [fx - 0.9 * L, fy + 5 * L], hand: [fx - 1.3 * L, fy + 10 * L], aim: 100 },
      }
  }
}

/** Sleeve colour of an outfit, or skin for bare arms. */
function sleeve(f: Fig): Ramp {
  return f.outfit === 'open' || f.outfit === 'bare' || f.outfit === 'dress' ? f.skin : f.main
}

function paintArm(f: Fig, from: XY, arm: Arm, far: boolean, part: 'all' | 'upper' | 'lower' = 'all'): void {
  const { k, B } = f
  const r = B.ar
  const wide = f.outfit === 'robe' || f.outfit === 'kimono'
  const o = { bias: far ? -1 : 0, bevel: 2 }
  if (part !== 'lower') k.part(k.m().l([from[0], from[1], arm.elbow[0], arm.elbow[1]], [r + 0.4, r]), sleeve(f), o)
  if (part !== 'upper') {
    k.part(k.m().l([arm.elbow[0], arm.elbow[1], arm.hand[0], arm.hand[1]], wide ? [r, r + 1.2] : [r, r * 0.9]), sleeve(f), o)
    const fist = f.a.prop?.startsWith('fists') ?? false
    k.part(k.m().c(arm.hand[0], arm.hand[1], fist ? r * 1.9 + 0.6 : r * 0.95 + 0.3), fist ? f.acc : f.skin, { ...o, bevel: 1.5 })
  }
}

// ── props ───────────────────────────────────────────────────────────────────

/** A blade from the hand along `aim`; grip and guard take the outfit's accent colour. */
function blade(f: Fig, [x, y]: XY, aim: number, len: number, w: number, curve: number, metal: Ramp): void {
  const { k } = f
  const tip = go(x, y, aim + curve, len)
  const mid = go(x, y, aim + curve * 0.3, len * 0.55)
  k.part(k.m().l([...go(x, y, aim + 180, 2.4), x, y], 0.9), f.acc, { bevel: 1 })
  k.part(k.m().l([x, y, ...mid, ...tip], [w, w * 0.95, 0.35]), metal, { bevel: 1 })
  k.part(k.m().l([...go(x, y, aim + 90, 1.5), ...go(x, y, aim - 90, 1.5)], 0.75), f.acc, { bevel: 1 })
}

function prop(f: Fig, kind: Prop, c: RGB | undefined, hand: XY, aim: number, far: boolean): void {
  const { k } = f
  const [x, y] = hand
  const own = (base: Ramp) => (c === undefined ? base : r3(c))
  const o = { bias: far ? -1 : 0, bevel: 1.5 }
  /** Guns are held level unless the pose aims them. */
  const fwd = f.pose === 'action' || far ? aim : -6
  switch (kind) {
    case 'katana':
    case 'katana2':
    case 'katana3':
      blade(f, hand, aim, 14, 0.75, -6, own(STEEL))
      break
    case 'sword':
      blade(f, hand, aim, 12, 1.2, 0, own(STEEL))
      break
    case 'greatsword':
      blade(f, hand, aim, 19, 2.1, 0, own(STEEL))
      break
    case 'axe': {
      const top = go(x, y, aim, 12)
      k.part(k.m().l([...go(x, y, aim + 180, 3), ...top], 0.8), WOOD, o)
      k.part(k.m().e(...go(...top, aim + 90, 2.5), 3.2, 4.4, aim), own(STEEL), o)
      break
    }
    case 'spear': {
      const tip = go(x, y, aim, 15)
      k.part(k.m().l([...go(x, y, aim + 180, 8), ...tip], 0.7), WOOD, o)
      k.part(k.m().p(...go(...tip, aim + 90, 1.6), ...go(...tip, aim, 4.5), ...go(...tip, aim - 90, 1.6)), own(STEEL), o)
      break
    }
    case 'scythe': {
      const top = go(x, y, -90, 14)
      k.part(k.m().l([x, y + 8, ...top], 0.8), WOOD, o)
      k.part(k.m().l([...top, top[0] - 5, top[1] - 1, top[0] - 10, top[1] + 4], [1.8, 1.4, 0.3]), own(STEEL), o)
      break
    }
    case 'staff': {
      const top = go(x, y, aim, 13)
      k.part(k.m().l([...go(x, y, aim + 180, 11), ...top], 0.75), own(WOOD), o)
      k.part(k.m().c(...top, 1.8), c === undefined ? GOLD : own(WOOD), o)
      break
    }
    case 'club': {
      const top = go(x, y, aim, 15)
      k.part(k.m().l([...go(x, y, aim + 180, 2.5), x, y, ...top], [0.9, 1.4, 2.6]), own(GUN), o)
      const studs = k.m()
      for (let i = 0; i < 3; i++) studs.c(...go(x, y, aim, 7 + i * 3), 0.7)
      k.part(studs, STEEL, { bevel: 1, line: 'none' })
      break
    }
    case 'pistol':
    case 'pistols':
      k.part(k.m().l([x, y, ...go(x, y, fwd, 4.5)], 0.9).l([x, y, ...go(x, y, fwd + 100, 2.2)], 0.8), own(GUN), o)
      break
    case 'rifle':
      k.part(k.m().l([...go(x, y, fwd + 180, 5), ...go(x, y, fwd, 13)], [1.4, 1, 0.7]), own(GUN), o)
      k.part(k.m().l([...go(x, y, fwd + 180, 5), ...go(x, y, fwd + 180, 2)], 1.5), WOOD, o)
      break
    case 'minigun': {
      const end = go(x, y, fwd, 12)
      k.part(k.m().l([...go(x, y, fwd + 180, 3), ...end], [2.4, 1.8]), own(GUN), o)
      k.part(k.m().e(...go(x, y, fwd, 1), 2.6, 2.4), own(GUN), o)
      k.fill(k.m().line(...go(x, y, fwd, 4), ...end), (c === undefined ? GUN : r3(c))[0] ?? INK)
      break
    }
    case 'launcher': {
      const back = go(x, y, fwd + 180, 8)
      const front = go(x, y, fwd, 9)
      k.part(k.m().l([...back, ...front], [2.4, 3.3]), own(colors('2a6a5a', '3aa08a', '8ae0c0')), o)
      k.part(k.m().e(...go(...front, fwd, 0.6), 1.4, 3.2, fwd), GUN, { bevel: 1 })
      k.stamp(['w.w.', '....', '.w.w'], ...go(...front, fwd + 180, 1.6), { w: WHITE })
      k.stamp(['k'], ...go(...front, fwd - 120, 2.2), { k: INK })
      break
    }
    case 'bow':
      k.part(k.m().l([x - 1, y - 9, x + 2.5, y - 4, x + 3, y, x + 2.5, y + 4, x - 1, y + 9], 0.8), own(WOOD), o)
      k.fill(k.m().line(x - 1, y - 9, x - 1, y + 9), WHITE)
      break
    case 'slingshot': {
      const top = go(x, y, aim, 5)
      k.part(k.m().l([x, y, ...top], 0.8).l([...top, ...go(...top, aim - 35, 4)], 0.7).l([...top, ...go(...top, aim + 35, 4)], 0.7), own(WOOD), o)
      k.fill(k.m().line(...go(...top, aim - 35, 4), ...go(x, y, aim + 180, 4), ...go(...top, aim + 35, 4)), BAND[1])
      break
    }
    case 'book':
      k.part(k.m().p(x - 1, y - 4, x + 4, y - 3, x + 4, y + 3, x - 1, y + 2), own(colors('5a2a1a', '8a3a2a', 'c06a4a')), o)
      k.fill(k.m().line(x, y - 3, x + 3, y - 2).line(x, y - 1, x + 3, y), WHITE)
      break
    case 'cup':
      k.part(k.m().e(x + 0.5, y - 2, 2.6, 1.2).e(x + 0.5, y - 1, 1.6, 1.2), own(colors('6a1a1a', 'c83a30', 'f08070')), o)
      break
    case 'fan':
      k.part(k.m().p(x, y, ...go(x, y, aim - 35, 7), ...go(x, y, aim - 10, 7.6), ...go(x, y, aim + 15, 7.6), ...go(x, y, aim + 35, 7)), own(colors('8a2a4a', 'e05a8a', 'ffb0c8')), o)
      break
    case 'shield':
      k.part(k.m().e(x + 1.5, y - 1, 4.6, 6), own(STEEL), { ...o, bevel: 3 })
      k.part(k.m().c(x + 1.8, y - 1, 1.4), GOLD, { bevel: 1 })
      break
    case 'orb':
      k.part(k.m().c(x + 0.5, y - 3.5, 2.6), own(colors('3a5ad8', '7ab0ff', 'e0f0ff')), { bevel: 2, line: 'none' })
      break
    default:
  }
}

/** The props of both hands. */
function props(f: Fig, side: 'near' | 'far', a: { near: Arm; far: Arm }): void {
  const [kind, cs] = coded<Prop>(f.a.prop)
  const [kind2, cs2] = coded<Prop>(f.a.prop2)
  const twin = kind === 'katana2' || kind === 'katana3' || kind === 'pistols'
  if (f.pose === 'cross') return
  if (side === 'near' && kind) prop(f, kind, cs[0], a.near.hand, a.near.aim, false)
  if (side === 'far' && (kind2 || twin)) {
    const k2 = kind2 ?? kind
    if (k2) prop(f, k2, (kind2 ? cs2 : cs)[0], a.far.hand, a.far.aim, true)
  }
}

// ── body ────────────────────────────────────────────────────────────────────

function leg(f: Fig, near: boolean): void {
  const { k, B, hipY } = f
  const side = near ? 1 : -1
  const x = side * B.hw * 0.48
  const pts =
    f.pose === 'action'
      ? near
        ? [x, hipY + 1, x + 4, hipY * 0.45, x + 5.5, -1.4]
        : [x, hipY + 1, x - 3.4, hipY * 0.42, x - 7, -1.4]
      : [x, hipY + 1, x + side * 0.2, hipY * 0.48, x + side * 0.3, -1.4]
  const bias = near ? 0 : -1
  k.part(k.m().l(pts, [B.lr + 0.5, B.lr, B.lr * 0.85]), f.legs, { bias: bias - (f.legs === f.main ? 1 : 0), bevel: 2 })
  const fx = pts[4] ?? 0
  const boot = f.outfit === 'armour' ? k.m().e(fx + 1, -1.3, B.lr + 1, 1.5).l([fx, -1.5, fx, hipY * 0.3], B.lr + 0.4) : k.m().e(fx + 1, -1.3, B.lr + 1, 1.5)
  const shoe = f.outfit === 'armour' || f.legs === f.skin || f.legs[1] === f.skin[1]
  k.part(boot, shoe ? f.acc : f.legs, { bias: shoe ? bias : bias - 1, bevel: 1.5 })
}

/** Skirts and coat tails hang over the legs. */
function skirt(f: Fig): void {
  const { k, B, hipY } = f
  const w = B.hw + 0.8
  const lunge = f.pose === 'action' ? 2 : 0
  switch (f.outfit) {
    case 'robe':
    case 'kimono':
      k.part(k.m().p(-w, hipY - 1, w, hipY - 1, w + 3 + lunge, -1.5, -w - 3 - lunge, -1.5), f.main, { bevel: 3 })
      k.part(k.m().p(w - 1.5, hipY, w + 0.2, hipY, w + 3 + lunge, -1.5, w + 1 + lunge, -1.5), f.acc, { bevel: 1, line: 'none' })
      break
    case 'dress':
      k.part(k.m().p(-w, hipY - 1.5, w, hipY - 1.5, w + 3.5 + lunge, hipY * 0.4, -w - 3.5 - lunge, hipY * 0.4), f.main, { bevel: 3 })
      break
    default:
  }
}

function coatTails(f: Fig): void {
  const { k, B, hipY } = f
  if (f.outfit !== 'coat') return
  const w = B.hw + 1.2
  const lunge = f.pose === 'action' ? 3 : 0
  k.part(k.m().p(-w, hipY - 2, w, hipY - 2, w + 1.5, hipY * 0.32, -w - 2.5 - lunge, hipY * 0.25), f.main, { bias: -1, bevel: 2 })
}

function torso(f: Fig): Shape {
  const { k, B, hipY, shY } = f
  const lean = f.pose === 'action' ? 1.2 : 0
  const sh = k.m().p(-B.sw + lean, shY + 1.8, -B.sw + 1.4 + lean, shY, B.sw - 1.4 + lean, shY, B.sw + lean, shY + 1.8, B.hw + 0.6, hipY + 1.5, -B.hw - 0.6, hipY + 1.5)
  const body = f.outfit === 'bare' ? f.skin : f.main
  k.part(sh, body, { bevel: f.outfit === 'armour' ? 2 : B.sw * 0.7 })
  const top = shY
  const waist = hipY + 0.5
  const cx = lean * 0.5
  const clip = (s: Shape) => s.and(sh)
  switch (f.outfit) {
    case 'open':
      k.part(clip(k.m().p(cx - 1.6, top - 1, cx + 2.6, top - 1, cx + 1.2, waist - 1, cx - 0.2, waist - 1)), f.skin, { bevel: 2 })
      break
    case 'coat':
      k.part(clip(k.m().p(cx - 0.6, top - 1, cx + 2.4, top - 1, cx + 1.6, waist + 1, cx + 0.4, waist + 1)), f.acc, { bevel: 1.5 })
      break
    case 'suit':
      k.part(clip(k.m().p(cx - 1.2, top - 1, cx + 2.2, top - 1, cx + 0.5, top + B.torso * 0.55)), colors('c8c8d0', 'f0f0f4', 'ffffff'), { bevel: 1.5 })
      k.part(clip(k.m().p(cx + 0.1, top + 0.5, cx + 0.9, top + 0.5, cx + 1, top + B.torso * 0.5, cx + 0.5, top + B.torso * 0.6, cx, top + B.torso * 0.5)), f.acc, { bevel: 1, line: 'none' })
      break
    case 'kimono':
    case 'robe':
      k.part(clip(k.m().l([cx - 1.6, top - 0.5, cx + 0.6, top + B.torso * 0.55], 0.9).l([cx + 2.4, top - 0.5, cx + 0.6, top + B.torso * 0.55], 0.9)), f.acc, { bevel: 1 })
      break
    case 'armour':
      k.part(clip(k.m().p(-B.sw, top + B.torso * 0.52, B.sw + 1, top + B.torso * 0.52, B.sw + 1, top + B.torso * 0.64, -B.sw, top + B.torso * 0.64)), f.acc, { bevel: 1, line: 'none' })
      k.fill(clip(k.m().line(cx + 0.6, top + 1, cx + 0.6, top + B.torso * 0.5)), f.main[0] ?? INK)
      break
    default:
  }
  if (f.outfit !== 'dress' && f.outfit !== 'armour') {
    k.part(clip(k.m().p(-B.hw - 2, waist - 1.6, B.hw + 2, waist - 1.6, B.hw + 2, waist, -B.hw - 2, waist)), f.outfit === 'kimono' || f.outfit === 'robe' ? f.acc : f.outfit === 'suit' || f.outfit === 'coat' ? f.main : f.acc, {
      bevel: 1,
    })
  }
  return sh
}

// ── head ────────────────────────────────────────────────────────────────────

/** Eye grids per size class: k = iris, w = glint, b = brow. */
const EYES: Readonly<Record<FigureEyes, readonly (readonly string[])[]>> = {
  round: [['k', 'k'], ['kk', 'wk', 'kk'], ['.kk.', 'kwkk', 'kkkk', '.kk.']],
  angry: [['k', 'k'], ['kk', 'wk', 'kk'], ['.kk.', 'kwkk', 'kkkk', '.kk.']],
  narrow: [['k'], ['kk'], ['kkkk']],
  closed: [['k'], ['.k.', 'k.k'], ['.kk.', 'k..k']],
  glow: [['k', 'k'], ['kk', 'wk', 'kk'], ['.kk.', 'kwkk', 'kkkk', '.kk.']],
}

const MOUTHS: Readonly<Record<Exclude<FigureMouth, 'none'>, readonly (readonly string[])[]>> = {
  smile: [['l'], ['ll'], ['l..l', '.ll.']],
  grin: [['kk', 'ww'], ['kkkk', 'kwwk', '.kk.'], ['kkkkk', 'kwwwk', 'krrrk', '.kkk.']],
  open: [['k'], ['kk', 'kr'], ['kkk', 'krk', '.k.']],
  flat: [['l'], ['ll'], ['lll']],
  fang: [['kk', 'ww'], ['kkkk', 'wkwk'], ['kkkkk', 'wkwkw', '.kkk.']],
}

function headShape(f: Fig): Shape {
  const { k, hx, hy, hr } = f
  return k.m().e(hx, hy, hr * 0.96, hr).p(hx - hr * 0.86, hy + 0.8, hx + hr * 0.92, hy + 0.4, hx + hr * 0.55, hy + hr * 1.06, hx - hr * 0.1, hy + hr * 1.12)
}

/** Region of the face (no hair grows there): forehead line down to below the chin. */
function faceZone(f: Fig, high = false): Shape {
  const { k, hx, hy, hr } = f
  const top = high ? hy - hr * 0.62 : hy - hr * 0.3
  return k.m().p(hx + hr * 1.6, top, hx - hr * 0.3, top - hr * 0.12, hx - hr * 0.52, hy + hr * 0.35, hx - hr * 0.42, hy + hr * 1.6, hx + hr * 1.6, hy + hr * 1.6)
}

/** Hair behind the head and body. */
function backHair(f: Fig, style: Hair | undefined): void {
  const { k, hx, hy, hr, hair } = f
  const u = hr / 6
  switch (style) {
    case 'long':
      k.part(k.m().p(hx - hr * 0.95, hy - hr * 0.2, hx + hr * 0.2, hy - hr * 0.4, hx + hr * 0.3, f.shY + f.B.torso * 0.75, hx - hr * 1.25, f.shY + f.B.torso * 0.8), hair, { bias: -1, bevel: 2.5 })
      break
    case 'pony':
      k.part(k.m().l([hx - hr * 0.7, hy - hr * 0.7, hx - hr * 1.6, hy - hr * 0.4, hx - hr * 2.1, hy + hr * 0.8, hx - hr * 1.8, hy + hr * 2], [1.6 * u, 2.2 * u, 1.8 * u, 0.6 * u]), hair, { bias: -1, bevel: 2 })
      break
    case 'braids':
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? hx - hr * 0.75 : hx + hr * 0.45
        const pts = [x0, hy + hr * 0.4, x0 + side * 1.6 - 1, f.shY + 3, x0 + side * 2.2 - 2, f.hipY, x0 + side * 1.4 - 3, f.hipY * 0.45]
        const sh = k.m()
        for (let i = 0; i <= 10; i++) {
          const t = i / 10
          const seg = Math.min(2, Math.floor(t * 3))
          const lt = t * 3 - seg
          const px = (pts[seg * 2] ?? 0) + ((pts[seg * 2 + 2] ?? 0) - (pts[seg * 2] ?? 0)) * lt
          const py = (pts[seg * 2 + 1] ?? 0) + ((pts[seg * 2 + 3] ?? 0) - (pts[seg * 2 + 1] ?? 0)) * lt
          sh.c(px, py, (1.5 - t * 0.5) * u)
        }
        k.part(sh, hair, { bias: side < 0 ? -1 : 0, bevel: 1.5 })
      }
      break
    case 'wild':
      {
        const sh = k.m().e(hx - hr * 0.35, hy - hr * 0.05, hr * 1.25, hr * 1.2)
        for (let i = 0; i < 6; i++) sh.p(...go(hx - hr * 0.3, hy, 120 + i * 32, hr * 0.9), ...go(hx - hr * 0.3, hy, 136 + i * 32, hr * 1.9), ...go(hx - hr * 0.3, hy, 152 + i * 32, hr * 0.9))
        k.part(sh, hair, { bias: -1, bevel: 2.5 })
      }
      break
    case 'afro':
      k.part(k.m().c(hx - hr * 0.2, hy - hr * 0.45, hr * 1.55), hair, { bevel: 4 })
      break
    default:
  }
}

/** Hair on the head: a cap over crown and back of the head, bangs over the forehead, style parts. */
function frontHair(f: Fig, style: Hair | undefined): void {
  const { k, hx, hy, hr, hair } = f
  if (!style || style === 'bald') return
  if (style === 'mohawk') {
    const sh = k.m()
    for (let i = 0; i < 5; i++) sh.p(...go(hx, hy, -70 - i * 25, hr * 0.8), ...go(hx, hy, -82 - i * 25, hr * 1.55), ...go(hx, hy, -94 - i * 25, hr * 0.8))
    k.part(sh.or(k.m().e(hx - hr * 0.2, hy - hr * 0.7, hr * 0.38, hr * 0.5, -30)), hair, { bevel: 1.5 })
    return
  }
  const slick = style === 'slick'
  const cap = k.m().e(hx - 0.2, hy - (slick ? 0.6 : 0.4), hr * 1.04, hr * 1.02).minus(faceZone(f, slick))
  if (!slick) {
    for (let i = 0; i < 3; i++) {
      const bx = hx + hr * (0.15 + 0.32 * i)
      cap.p(bx - hr * 0.3, hy - hr * 0.42, bx + hr * 0.22, hy - hr * 0.42, bx + hr * 0.05, hy - hr * (i === 1 ? 0.02 : 0.12))
    }
  }
  if (slick) cap.p(hx - hr * 0.8, hy - hr * 0.5, hx - hr * 1.5, hy + hr * 0.05, hx - hr * 0.85, hy + hr * 0.25)
  if (style === 'spiky' || style === 'wild') {
    for (let i = 0; i < 5; i++) cap.p(...go(hx - 0.4, hy, -40 - i * 30, hr * 0.7), ...go(hx - 0.4, hy, -55 - i * 30, hr * 1.55), ...go(hx - 0.4, hy, -70 - i * 30, hr * 0.7))
  }
  if (style === 'bun') cap.c(hx - hr * 0.35, hy - hr * 1.05, hr * 0.46)
  if (style === 'afro') cap.c(hx - hr * 0.1, hy - hr * 0.75, hr * 0.9)
  k.part(cap, hair, { bevel: 2 })
}

function hat(f: Fig): void {
  const { k, hx, hy, hr } = f
  const [kind, cs] = coded<Hat>(f.a.hat)
  if (!kind) return
  const c = cs[0]
  const own = (base: Ramp) => (c === undefined ? base : r3(c))
  const top = hy - hr
  switch (kind) {
    case 'straw': {
      const crown = k.m().e(hx - 0.2, top + hr * 0.15, hr * 0.92, hr * 0.62).minus(k.m().p(hx - 20, top + hr * 0.42, hx + 20, top + hr * 0.42, hx + 20, top + 20, hx - 20, top + 20))
      k.part(k.m().e(hx, top + hr * 0.5, hr * 1.62, hr * 0.3, -4), own(STRAW), { bevel: 1.5 })
      k.part(crown, own(STRAW), { bevel: 2 })
      k.part(k.m().or(crown).and(k.m().p(hx - 20, top + hr * 0.08, hx + 20, top + hr * 0.08, hx + 20, top + hr * 0.42, hx - 20, top + hr * 0.42)), BAND, { bevel: 1, line: 'none' })
      break
    }
    case 'bandana': {
      const cloth = k.m().e(hx - 0.2, hy - hr * 0.35, hr * 1.06, hr * 0.85).minus(k.m().p(hx - 20, hy - hr * 0.2, hx + 20, hy - hr * 0.45, hx + 20, hy + 20, hx - 20, hy + 20))
      k.part(cloth, own(f.acc), { bevel: 2 })
      k.part(k.m().p(hx - hr * 0.9, hy - hr * 0.3, hx - hr * 1.7, hy + hr * 0.2, hx - hr * 1.2, hy - hr * 0.6), own(f.acc), { bias: -1, bevel: 1 })
      break
    }
    case 'tricorn': {
      const ramp = c === undefined ? GUN : r3(c)
      k.part(k.m().e(hx - 0.3, top + hr * 0.1, hr * 0.85, hr * 0.55), ramp, { bevel: 2 })
      k.part(k.m().p(hx - hr * 1.7, top - hr * 0.2, hx, top + hr * 0.55, hx + hr * 1.7, top - hr * 0.2, hx + hr * 1.3, top + hr * 0.75, hx - hr * 1.3, top + hr * 0.75), ramp, { bevel: 1.5 })
      k.fill(k.m().line(hx - hr * 1.3, top + hr * 0.62, hx + hr * 1.3, top + hr * 0.62), GOLD[1])
      break
    }
    case 'hood': {
      const hood = k.m().e(hx - hr * 0.2, hy - hr * 0.1, hr * 1.25, hr * 1.25).minus(k.m().e(hx + hr * 0.35, hy + hr * 0.3, hr * 0.9, hr * 1.05))
      k.part(hood, own(f.main), { bevel: 2.5 })
      break
    }
    case 'helmet': {
      const dome = k.m().e(hx - 0.2, hy - hr * 0.3, hr * 1.08, hr * 0.95).minus(k.m().p(hx - 20, hy - hr * 0.05, hx + 20, hy - hr * 0.2, hx + 20, hy + 20, hx - 20, hy + 20))
      dome.p(hx - hr * 1.05, hy - hr * 0.2, hx - hr * 0.4, hy - hr * 0.2, hx - hr * 0.55, hy + hr * 0.7, hx - hr * 1.0, hy + hr * 0.6)
      k.part(dome, own(STEEL), { bevel: 2 })
      k.part(k.m().p(hx - hr * 0.3, top - hr * 0.1, hx + hr * 0.3, top - hr * 0.1, hx - hr * 0.1, top - hr * 0.6), own(STEEL), { bevel: 1 })
      break
    }
    case 'horns':
      for (const [side, bias] of [[-1, -1], [1, 0]] as const) {
        const x0 = hx + side * hr * 0.45 + 0.4
        k.part(k.m().l([x0, top + hr * 0.4, x0 + side * hr * 0.35, top - hr * 0.3, x0 + side * hr * 0.15, top - hr * 0.95], [hr * 0.22, hr * 0.16, 0.3]), own(BONE), { bias, bevel: 1 })
      }
      break
    case 'fox':
    case 'bunny':
      for (const [side, bias] of [[-1, -1], [1, 0]] as const) {
        const x0 = hx + side * hr * 0.5
        const ear =
          kind === 'fox'
            ? k.m().p(x0 - hr * 0.32, top + hr * 0.45, x0 + side * hr * 0.25, top - hr * 0.75, x0 + hr * 0.32, top + hr * 0.35)
            : k.m().e(x0 + side * hr * 0.15, top - hr * 0.6, hr * 0.26, hr * 0.85, side * 12)
        k.part(ear, c === undefined ? f.hair : r3(c), { bias, bevel: 1.5 })
      }
      break
    case 'cap':
      k.part(k.m().e(hx - 0.2, top + hr * 0.32, hr * 0.98, hr * 0.62).minus(k.m().p(hx - 20, top + hr * 0.5, hx + 20, top + hr * 0.5, hx + 20, top + 20, hx - 20, top + 20)), own(f.acc), { bevel: 2 })
      k.part(k.m().e(hx + hr * 0.95, top + hr * 0.5, hr * 0.7, hr * 0.18), own(f.acc), { bias: -1, bevel: 1 })
      break
    case 'crown': {
      const sh = k.m().p(hx - hr * 0.75, top + hr * 0.25, hx + hr * 0.75, top + hr * 0.25, hx + hr * 0.75, top - hr * 0.3)
      sh.p(hx + hr * 0.75, top + hr * 0.25, hx + hr * 0.75, top - hr * 0.3, hx + hr * 0.35, top - hr * 0.05, hx, top - hr * 0.45, hx - hr * 0.35, top - hr * 0.05, hx - hr * 0.75, top - hr * 0.3, hx - hr * 0.75, top + hr * 0.25)
      k.part(sh, own(GOLD), { bevel: 1.5 })
      break
    }
    case 'tophat':
      k.part(k.m().e(hx, top + hr * 0.3, hr * 1.25, hr * 0.25), own(GUN), { bevel: 1.5 })
      k.part(k.m().p(hx - hr * 0.7, top + hr * 0.3, hx + hr * 0.7, top + hr * 0.3, hx + hr * 0.75, top - hr * 1.1, hx - hr * 0.75, top - hr * 1.1), own(GUN), { bevel: 2 })
      k.part(k.m().p(hx - hr * 0.7, top + hr * 0.05, hx + hr * 0.7, top + hr * 0.05, hx + hr * 0.7, top - hr * 0.2, hx - hr * 0.7, top - hr * 0.2), f.acc, { bevel: 1, line: 'none' })
      break
    case 'wide':
      k.part(k.m().e(hx - 0.2, top + hr * 0.05, hr * 0.85, hr * 0.5), own(f.acc), { bevel: 2 })
      k.part(k.m().e(hx, top + hr * 0.4, hr * 1.9, hr * 0.28, -5), own(f.acc), { bevel: 1.5 })
      break
    case 'pointed':
      k.part(k.m().p(hx - hr * 1.0, top + hr * 0.35, hx + hr * 1.0, top + hr * 0.35, hx - hr * 0.2, top - hr * 1.4, hx - hr * 1.3, top - hr * 1.9), own(f.main), { bevel: 2 })
      k.part(k.m().e(hx, top + hr * 0.38, hr * 1.45, hr * 0.24), own(f.main), { bevel: 1 })
      break
    default:
  }
}

/** Eyes, mouth and face extras. */
function features(f: Fig): void {
  const { k, hx, hy, hr, z } = f
  const style = f.a.eyes ?? 'round'
  const glow = style === 'glow'
  const iris = glow ? (f.acc[2] ?? WHITE) : INK
  const grid = EYES[style][z] ?? []
  const ey = hy + hr * 0.22
  const eyes: XY[] = [[hx - hr * 0.3, ey], [hx + hr * 0.42, ey]]
  const covered = face(f, 'blindfold') || face(f, 'goggles') || face(f, 'shades')
  if (!covered) {
    eyes.forEach(([x, y], i) => {
      if (i === 1 && face(f, 'eyepatch')) return
      k.stamp(grid, x, y, { k: iris, w: WHITE })
      if (style === 'angry') {
        const w = grid[0]?.length ?? 2
        const brow = i === 0 ? ['k..', '.kk'] : ['..k', 'kk.']
        k.stamp(w > 2 ? brow.map((r) => r + r[r.length - 1]) : brow, x, y - grid.length / 2 - 1.2, { k: f.hair[0] ?? INK })
      }
    })
  }
  const mouth = f.a.mouth ?? 'smile'
  if (mouth !== 'none' && !face(f, 'mask')) {
    k.stamp(MOUTHS[mouth][z] ?? [], hx + hr * 0.2, hy + hr * 0.7, { k: INK, l: f.skin[0] ?? INK, w: WHITE, r: MOUTH[0] })
  }
  const skinDark = f.skin[0] ?? INK
  for (const x of f.a.face ?? []) {
    switch (x) {
      case 'scar':
        k.fill(k.m().line(hx + hr * 0.3, hy - hr * 0.38, hx + hr * 0.56, hy + hr * 0.7), mix(skinDark, BAND[0], 0.7))
        break
      case 'eyepatch':
        k.fill(k.m().line(hx - hr * 0.95, hy - hr * 0.45, hx + hr * 0.95, hy + hr * 0.05), INK)
        k.fill(k.m().e(hx + hr * 0.42, hy + hr * 0.2, hr * 0.26, hr * 0.26), INK)
        break
      case 'goggles':
        k.fill(k.m().line(hx - hr * 0.95, hy + hr * 0.1, hx + hr * 0.95, hy + hr * 0.1), INK)
        for (const [ex, ey2] of eyes) {
          k.fill(k.m().c(ex, ey2, hr * 0.3 + 0.7), INK)
          k.fill(k.m().c(ex, ey2, hr * 0.3), LENS)
          k.stamp(['w'], ex - hr * 0.1, ey2 - hr * 0.1, { w: WHITE })
        }
        break
      case 'shades':
        k.fill(k.m().p(hx - hr * 0.62, hy + hr * 0.02, hx + hr * 0.82, hy + hr * 0.02, hx + hr * 0.7, hy + hr * 0.42, hx - hr * 0.55, hy + hr * 0.42), INK)
        break
      case 'glasses':
        for (const [ex, ey2] of eyes) k.fill(k.m().c(ex, ey2, hr * 0.32).minus(k.m().c(ex, ey2, hr * 0.32 - 0.9)), INK)
        break
      case 'blindfold':
        k.part(k.m().p(hx - hr * 0.95, hy - hr * 0.05, hx + hr * 0.98, hy - hr * 0.05, hx + hr * 0.98, hy + hr * 0.42, hx - hr * 0.95, hy + hr * 0.42).and(headShape(f)), f.acc, { bevel: 1 })
        k.part(k.m().l([hx - hr * 0.9, hy + hr * 0.2, hx - hr * 1.6, hy + hr * 0.7, hx - hr * 1.8, hy + hr * 1.3], 0.7), f.acc, { bevel: 1 })
        break
      case 'beard':
        k.part(headShape(f).and(k.m().p(hx - hr, hy + hr * 0.55, hx + hr * 1.2, hy + hr * 0.75, hx + hr * 1.2, hy + hr * 2, hx - hr, hy + hr * 2)).or(k.m().e(hx + hr * 0.25, hy + hr * 1.15, hr * 0.5, hr * 0.35)), f.hair, { bevel: 1.5 })
        break
      case 'moustache':
        k.stamp(z === 0 ? ['hhh'] : z === 1 ? ['.hhh.', 'hh.hh'] : ['.hhhhh.', 'hhh.hhh', 'h.....h'], hx + hr * 0.25, hy + hr * 0.6, { h: f.hair[1] ?? INK })
        break
      case 'mask':
        k.part(headShape(f).and(k.m().p(hx - hr, hy + hr * 0.38, hx + hr * 1.2, hy + hr * 0.38, hx + hr * 1.2, hy + hr * 2, hx - hr, hy + hr * 2)), f.acc, { bevel: 1.5 })
        break
      case 'nose':
        k.part(k.m().l([hx + hr * 0.7, hy + hr * 0.45, hx + hr * 1.9, hy + hr * 0.38], [0.8, 0.6]), f.skin, { bevel: 1 })
        break
      case 'saw': {
        const sh = k.m().p(hx + hr * 0.7, hy + hr * 0.25, hx + hr * 2.4, hy + hr * 0.3, hx + hr * 2.4, hy + hr * 0.55, hx + hr * 0.7, hy + hr * 0.75)
        for (let i = 0; i < 4; i++) sh.p(hx + hr * (0.9 + i * 0.38), hy + hr * 0.28, hx + hr * (1.1 + i * 0.38), hy + hr * 0.02, hx + hr * (1.28 + i * 0.38), hy + hr * 0.28)
        k.part(sh, f.skin, { bevel: 1 })
        break
      }
      case 'elf':
        k.part(k.m().p(hx - hr * 0.55, hy + hr * 0.05, hx - hr * 1.55, hy - hr * 0.75, hx - hr * 0.62, hy + hr * 0.55), f.skin, { bias: -1, bevel: 1 })
        break
      default:
    }
  }
}

function head(f: Fig, hairStyle: Hair | undefined): void {
  const { k, hx, hy, hr, B } = f
  k.part(k.m().l([hx - 0.6, f.shY + 1, hx - 0.4, hy + hr * 0.6], hr * 0.3 + B.ar * 0.2), f.skin, { bias: -1, bevel: 1.5 })
  k.part(headShape(f), f.skin, { bevel: 1.2 + k.at.s })
  if (!face(f, 'elf')) k.part(k.m().e(hx - hr * 0.6, hy + hr * 0.25, hr * 0.2, hr * 0.28), f.skin, { bias: -1, bevel: 1 })
  frontHair(f, hairStyle)
  features(f)
  hat(f)
  if (f.a.prop?.startsWith('katana3') && f.pose !== 'cross') {
    blade(f, [hx + hr * 0.2, hy + hr * 0.7], 4, 12, 0.7, -4, STEEL)
  }
}

// ── extras behind the body ──────────────────────────────────────────────────

function behind(f: Fig): void {
  const { k, B, shY, hipY } = f
  if (has(f, 'wings')) {
    for (const [dx, bias] of [[-1, -1], [1.5, 0]] as const) {
      const sh = k.m()
      for (let i = 0; i < 4; i++) sh.l([dx, shY + 3, dx - 6 - i * 2, shY - 6 + i * 3, dx - 12 - i * 2.5, shY - 10 + i * 4.5], [2.2, 2, 0.6])
      k.part(sh, f.acc, { bias, bevel: 2 })
    }
  }
  if (has(f, 'tails')) {
    const sh = k.m()
    for (let i = 0; i < 5; i++) sh.l([-1, hipY, ...go(-1, hipY, 150 + i * 24, 7), ...go(-1, hipY, 158 + i * 24, 13)], [1.4, 2.6, 0.6])
    k.part(sh, f.hair, { bevel: 2 })
  }
  if (has(f, 'tank')) k.part(k.m().l([-B.sw - 0.5, shY + 1, -B.sw - 1, hipY], B.ar + 1.4), colors('2a6a3a', '4aa858', 'a8f0a0'), { bias: -1, bevel: 2 })
  if (f.a.cape) {
    const c = r3(hex(f.a.cape))
    const lunge = f.pose === 'action' ? 4 : 0
    k.part(k.m().p(-B.sw + 0.5, shY, B.sw - 1, shY, B.sw - 0.5, hipY * 0.3, -B.sw - 5 - lunge, -1, -B.sw - 2 - lunge, hipY * 0.15), c, { bias: -1, bevel: 2.5 })
  }
}

/** Paint the figure of a spec onto the kit's layer. */
export function figure(k: Kit, a: FigureArt): void {
  const B = BODY[a.fig]
  const [outfit = 'shirt', wc] = coded<Outfit>(a.wear)
  const [hairStyle, hc] = coded<Hair>(a.hair)
  const main = r3(wc[0] ?? hex('8a8a9a'))
  const acc = r3(wc[1] ?? deeper(wc[0] ?? hex('8a8a9a')))
  const pose = a.pose ?? 'stand'
  const hipY = -B.leg + (pose === 'action' ? 1.5 : 0)
  const shY = hipY - B.torso
  const lean = pose === 'action' ? 1.2 : 0
  const s = k.at.s
  const f: Fig = {
    k,
    a,
    B,
    outfit,
    pose,
    skin: ramp(hex(a.skin ?? 'f1b688'), 3, 6),
    hair: r3(hc[0] ?? hex('4a3428')),
    main,
    acc,
    legs: wc[2] !== undefined ? r3(wc[2]) : outfit === 'dress' ? ramp(hex(a.skin ?? 'f1b688'), 3, 6) : main,
    hipY,
    shY,
    hx: 0.7 + lean,
    hy: shY - 1.1 - B.hr * 0.95,
    hr: B.hr,
    sn: [B.sw - 1.1 + lean, shY + 1.6],
    sf: [-B.sw + 1.1 + lean, shY + 1.6],
    z: s < 0.9 ? 0 : s < 1.45 ? 1 : 2,
  }
  const [kind] = coded<Prop>(a.prop)
  const pa = arms(f, kind !== undefined && kind !== 'fists' && kind !== 'orb')
  behind(f)
  backHair(f, hairStyle)
  if (pose === 'cross') paintArm(f, f.sf, pa.far, true, 'upper')
  else {
    props(f, 'far', pa)
    paintArm(f, f.sf, pa.far, true)
  }
  coatTails(f)
  leg(f, false)
  leg(f, true)
  skirt(f)
  torso(f)
  head(f, hairStyle)
  if (pose === 'cross') {
    paintArm(f, f.sf, pa.far, true, 'lower')
    paintArm(f, f.sn, pa.near, false)
  } else {
    paintArm(f, f.sn, pa.near, false)
    props(f, 'near', pa)
  }
  if (outfit === 'armour') {
    for (const [sx, sy] of [f.sf, f.sn]) k.part(k.m().e(sx + 0.3, sy - 0.2, B.ar + 2.1, B.ar + 1.3, -8), acc, { bevel: 2 })
  }
  if (has(f, 'aura')) {
    const m = k.d.mask()
    k.d.fill(m.grown(1).minus(m), f.acc[2] ?? WHITE)
  }
}
