import type { Attack, CardDef, PokemonType, RenderedCard, Tier } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, REGULAR, drawText, fit, fitLines, measure, wrap } from '../fonts.ts'
import type { RGB, Region } from '../toolkit/index.ts'
import { Mask, Painter, colors, fromHsl, hex, mix, noise, pts } from '../toolkit/index.ts'

/**
 * Card frames of the Pokémon game. Our own design that evokes the classic layout: yellow border,
 * type-coloured body, name and KP on top, art window, attacks, number and tier marker below.
 *
 * Layouts and their art areas (card coordinates):
 * - classic  68×48 at (6, 14): Pokémon of the tiers Common to Alternative
 * - trainer  68×48 at (6, 24)
 * - energy   68×84 at (6, 16)
 * - full     80×112 at (0, 0): Ultra and Grail; text plates float on the artwork
 */
export const CARD = { w: 80, h: 112 } as const

export type Layout = 'classic' | 'trainer' | 'energy' | 'full'

export const ART: Readonly<Record<Layout, Region>> = {
  classic: { x: 6, y: 14, w: 68, h: 48 },
  trainer: { x: 6, y: 24, w: 68, h: 48 },
  energy: { x: 6, y: 16, w: 68, h: 84 },
  full: { x: 0, y: 0, w: 80, h: 112 },
}

export function layoutOf(def: CardDef): Layout {
  if (def.kind === 'energy') return 'energy'
  if (def.kind === 'trainer') return 'trainer'
  return def.tier === 'ultra' || def.tier === 'grail' ? 'full' : 'classic'
}

// ── palette ─────────────────────────────────────────────────────────────────

const INK = hex('1e1722')
const PAPER = hex('f6f0de')
const WHITE = hex('fffbea')
/** Border gold, darkest first. */
const GOLD = colors('7c5410', 'b98216', 'e8b428', 'f8d552', 'fff2a8')
const SILVER = colors('56607c', '8e9ab6', 'c8d2e6', 'f4f8ff')
const TRAINER_BODY = colors('7d90ad', '90a3bd', 'a5b6cb')

interface TypeLook {
  /** Body texture, three close tones, darkest first. */
  body: readonly [RGB, RGB, RGB]
  /** Symbol disc: rim, fill, glyph. */
  symbol: readonly [RGB, RGB, RGB]
  glyph: readonly string[]
}

const TYPES: Readonly<Record<PokemonType, TypeLook>> = {
  Feuer: {
    body: colors('e25a2e', 'ee7239', 'f58d4a'),
    symbol: [hex('7e160c'), hex('e2331a'), hex('ffd447')],
    glyph: ['..o..', '.oo..', '.ooo.', '.ooo.', '..o..'],
  },
  Wasser: {
    body: colors('4590dc', '5ba6ea', '7bbdf4'),
    symbol: [hex('123f86'), hex('2f7fe0'), hex('d8f1ff')],
    glyph: ['..o..', '..o..', '.ooo.', '.ooo.', '..o..'],
  },
  Pflanze: {
    body: colors('62ae3e', '79c34e', '97d768'),
    symbol: [hex('1c541f'), hex('3e9e36'), hex('e6f8a8')],
    glyph: ['...o.', '.ooo.', '.ooo.', '.oo..', 'o....'],
  },
  Elektro: {
    body: colors('f3d646', 'fae76c', 'fff49c'),
    symbol: [hex('7a5200'), hex('f2b90f'), hex('fffbe0')],
    glyph: ['...o.', '..o..', '.ooo.', '..o..', '.o...'],
  },
  Psycho: {
    body: colors('a25cc2', 'b575d5', 'c891e4'),
    symbol: [hex('501a6e'), hex('9a44c0'), hex('f7d8ff')],
    glyph: ['.....', '.ooo.', 'o.o.o', '.ooo.', '.....'],
  },
  Kampf: {
    body: colors('b9652d', 'c97b3d', 'd9945b'),
    symbol: [hex('5e2a0c'), hex('b05a24'), hex('ffe2b4')],
    glyph: ['o...o', '.o.o.', '..o..', '.o.o.', 'o...o'],
  },
  Farblos: {
    body: colors('c3bfb3', 'd5d1c7', 'e6e2da'),
    symbol: [hex('6e6a60'), hex('ecebe4'), hex('8e8a80')],
    glyph: ['..o..', '..o..', 'ooooo', '..o..', '..o..'],
  },
}

/** Marker colours of the tiers above Rare (the design tokens of the UI). */
const TIER_COLOR: Readonly<Partial<Record<Tier, RGB>>> = {
  holo: hex('4fe3e0'),
  alternative: hex('c79bff'),
  ultra: hex('ffcf5a'),
}

/** Edge directions for bevels: lit from the top left, shaded at the bottom right. */
const TL = [-1, 0, 0, -1]
const BR = [1, 0, 0, 1]

// ── small parts ─────────────────────────────────────────────────────────────

const DISC7 = ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..']
const STAR5 = ['..#..', '#####', '.###.', '.#.#.', '#...#']
const STAR7 = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##']
const MARKS: Readonly<Record<'common' | 'uncommon', readonly string[]>> = {
  common: ['.###.', '#####', '#####', '#####', '.###.'],
  uncommon: ['..#..', '.###.', '#####', '.###.', '..#..'],
}

const CORNER_CUTS: readonly (readonly number[])[] = [[3, 1, 1], [2, 1], [1], [1]]

/** The rounded card silhouette, optionally moved inwards by `inset` pixels. */
function cardShape(inset = 0): Mask {
  const w = CARD.w - inset * 2
  const h = CARD.h - inset * 2
  const m = new Mask(CARD.w, CARD.h).rect(inset, inset, w, h)
  ;(CORNER_CUTS[inset] ?? []).forEach((cut, row) => {
    for (let i = 0; i < cut; i++) {
      m.del(inset + i, inset + row).del(inset + w - 1 - i, inset + row)
      m.del(inset + i, inset + h - 1 - row).del(inset + w - 1 - i, inset + h - 1 - row)
    }
  })
  return m
}

function box(x: number, y: number, w: number, h: number): Mask {
  return new Mask(CARD.w, CARD.h).rect(x, y, w, h)
}

/** Box with its four corner pixels removed. */
function pill(x: number, y: number, w: number, h: number): Mask {
  return box(x, y, w, h)
    .del(x, y)
    .del(x + w - 1, y)
    .del(x, y + h - 1)
    .del(x + w - 1, y + h - 1)
}

/** 7×7 type symbol: a disc with a small pictogram of our own. */
function typeSymbol(p: Painter, x: number, y: number, type: PokemonType): void {
  const [rim, fill, glyph] = TYPES[type].symbol
  p.stamp(DISC7, x, y, { '#': rim })
  p.stamp(['.###.', '#####', '#####', '#####', '.###.'], x + 1, y + 1, { '#': fill })
  p.stamp(TYPES[type].glyph, x + 1, y + 1, { o: glyph })
}

/** 5×5 energy dot for attack costs. */
function costDot(p: Painter, x: number, y: number, type: PokemonType): void {
  const [rim, fill, glyph] = TYPES[type].symbol
  p.stamp(['.###.', '#ooo#', '#ooo#', '#ooo#', '.###.'], x, y, { '#': rim, o: fill })
  p.set(x + 1, y + 1, glyph)
}

/** Tier marker in a 7×7 cell: circle, diamond and star in ink; coloured stars above Rare. */
function tierMark(p: Painter, x: number, y: number, tier: Tier, ink: RGB): void {
  if (tier === 'common' || tier === 'uncommon') p.stamp(MARKS[tier], x + 1, y + 1, { '#': ink })
  else if (tier === 'rare') p.stamp(STAR5, x + 1, y + 1, { '#': ink })
  else {
    for (const [dx, dy] of pts([-1, 0, 1, 0, 0, -1, 0, 1])) p.stamp(STAR7, x + dx, y + dy, { '#': INK })
    if (tier === 'grail')
      STAR7.forEach((row, j) => p.stamp([row], x, y + j, { '#': fromHsl(20 + j * 42, 0.95, 0.68) }))
    else p.stamp(STAR7, x, y, { '#': TIER_COLOR[tier] ?? ink })
  }
}

function cardNumber(def: CardDef, setSize: number): string {
  return `${String(def.number).padStart(3, '0')}/${String(setSize).padStart(3, '0')}`
}

/** Attack block, 15 rows: name on the first line, energy cost and damage on the second. */
function attackBlock(p: Painter, a: Attack, x: number, y: number, w: number, ink: RGB): void {
  const f = fit(a.name, w)
  drawText(p, a.name, x, y + 7 - f.cap, f, ink)
  a.cost.forEach((t, i) => costDot(p, x + i * 6, y + 9, t))
  if (a.damage !== undefined) drawText(p, a.damage, x + w - 1, y + 8, REGULAR, ink, { align: 'right' })
}

// ── framed layouts: classic, trainer, energy ────────────────────────────────

interface Job {
  def: CardDef
  card: Painter
  art: Painter
  setSize: number
}

interface FrameResult {
  /** Foil on the frame itself. */
  foil: Mask
  /** Where the artwork shows through the frame untouched. */
  visible: Mask
}

function drawFramed(job: Job, layout: Exclude<Layout, 'full'>): FrameResult {
  const { def, card: p, art, setSize } = job
  const area = ART[layout]
  const shape = cardShape()
  const foil = new Mask(CARD.w, CARD.h)
  const textured = def.tier === 'alternative'

  // border
  p.fill(shape, GOLD[2])
  if (textured) {
    shape.each((x, y) => {
      if ((x + y) % 4 < 2) p.set(x, y, GOLD[3])
    })
    foil.or(shape)
  }
  p.edge(shape, GOLD[3], TL)
  p.edge(shape, GOLD[1], BR)

  // body
  const body = box(3, 3, 74, 106)
  const tone = def.kind === 'trainer' ? TRAINER_BODY : TYPES[def.type ?? 'Farblos'].body
  p.fill(body.outerEdge(), GOLD[1])
  p.dither(body, tone, (x, y) => noise(x, y, def.number, 12), 0.6)
  if (textured) {
    body.each((x, y) => {
      if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) p.set(x, y, tone[2])
    })
  }
  foil.minus(body)

  // art window
  const frame = box(area.x - 1, area.y - 1, area.w + 2, area.h + 2)
  const shadow = mix(tone[0], INK, 0.4)
  p.fill(frame.moved(1, 1), shadow)
  if (def.tier === 'holo') {
    p.fill(frame, SILVER[1])
    p.edge(frame, SILVER[3], TL)
    p.edge(frame, SILVER[0], BR)
    foil.or(frame.clone().minus(box(area.x, area.y, area.w, area.h)))
  } else {
    p.fill(frame, GOLD[0])
  }
  p.blit(art, area.x, area.y)

  // texts
  const left = 6
  const width = 68
  if (layout === 'classic') {
    let nameWidth = width
    if (def.type) {
      typeSymbol(p, 67, 4, def.type)
      nameWidth = 59
    }
    if (def.hp !== undefined) {
      drawText(p, 'KP', 65, 6, MICRO, INK, { align: 'right' })
      const kp = String(def.hp)
      drawText(p, kp, 57, 4, REGULAR, INK, { align: 'right' })
      nameWidth = 57 - measure(kp, REGULAR) - 1 - (left - 1)
    }
    const f = fit(def.name, nameWidth)
    drawText(p, def.name, left - 1, 4 + 7 - f.cap, f, INK)

    const attacks = def.attacks ?? []
    const first = attacks[0]
    const second = attacks[1]
    if (first && second) {
      attackBlock(p, first, left, 65, width, INK)
      p.fill(box(left, 81, width, 1), shadow)
      attackBlock(p, second, left, 83, width, INK)
    } else if (first) {
      attackBlock(p, first, left, 74, width, INK)
    }
  } else if (layout === 'trainer') {
    const name = fitLines(def.name, width)
    if (name.lines.length === 1) {
      drawText(p, 'TRAINER', left + 1, 4, REGULAR, GOLD[3], { outline: INK })
      drawText(p, def.name, left, 14 + 7 - name.font.cap, name.font, INK)
    } else {
      drawText(p, 'TRAINER', left + 1, 4, MICRO, GOLD[3], { outline: INK })
      name.lines.forEach((line, i) => drawText(p, line, left, 11 + i * 6, MICRO, INK))
    }
    const panel = box(5, 76, 70, 24)
    p.fill(panel, PAPER)
    p.edge(panel, GOLD[0])
    wrap(def.text ?? '', MICRO, 64)
      .slice(0, 3)
      .forEach((line, i) => drawText(p, line, 8, 79 + i * 7, MICRO, INK))
  } else {
    const name = fitLines(def.name, 70)
    if (name.lines.length === 1) {
      drawText(p, def.name, 40, 5 + 7 - name.font.cap, name.font, INK, { align: 'center' })
    } else {
      name.lines.forEach((line, i) => drawText(p, line, 40, 3 + i * 6, MICRO, INK, { align: 'center' }))
    }
  }

  drawText(p, cardNumber(def, setSize), left, 102, MICRO, INK)
  tierMark(p, 67, 100, def.tier, INK)
  if (def.tier === 'holo' || def.tier === 'alternative') foil.or(box(67, 100, 7, 7))
  return { foil, visible: box(area.x, area.y, area.w, area.h) }
}

// ── full art: Ultra and Grail ───────────────────────────────────────────────

function drawFull(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const grail = def.tier === 'grail'
  const shape = cardShape()
  p.blit(art)

  // border: three pixels of gold, for the Grail running through the rainbow
  const ring = shape.clone().minus(cardShape(3))
  const inner = [cardShape(1), cardShape(2)] as const
  ring.each((x, y) => {
    const depth = inner[0].has(x, y) ? (inner[1].has(x, y) ? 2 : 1) : 0
    const turn = Math.atan2(y - CARD.h / 2, (x - CARD.w / 2) * 1.4) / (Math.PI * 2) + 0.5
    const hue = Math.floor(turn * 2 * 18) * 20
    const base = grail ? mix(fromHsl(hue, 0.9, 0.62), GOLD[3], 0.35) : GOLD[2]
    const light = grail ? mix(base, WHITE, 0.55) : GOLD[4]
    const dark = grail ? mix(base, GOLD[0], 0.5) : GOLD[1]
    p.set(x, y, depth === 0 ? dark : depth === 1 ? light : base)
  })
  p.fill(cardShape(3).minus(cardShape(4)), INK)

  // name plate
  const glass = hex('0c0816')
  const top = pill(5, 5, 70, 11)
  p.veil(top, glass, 0.72)
  p.fill(box(6, 15, 68, 1), GOLD[3])
  let nameWidth = 64
  if (def.type) {
    typeSymbol(p, 66, 7, def.type)
    nameWidth = 56
  }
  if (def.hp !== undefined) {
    drawText(p, 'KP', 64, 9, MICRO, GOLD[3], { align: 'right' })
    const kp = String(def.hp)
    drawText(p, kp, 56, 7, REGULAR, GOLD[4], { align: 'right' })
    nameWidth = 56 - measure(kp, REGULAR) - 2 - 8
  }
  const nf = fit(def.name, nameWidth)
  drawText(p, def.name, 8, 7 + 7 - nf.cap, nf, WHITE, { shadow: INK })

  // attack plate with number line
  const bottom = pill(5, 88, 70, 19)
  p.veil(bottom, glass, 0.72)
  p.fill(box(6, 88, 68, 1), GOLD[3])
  const attack = def.attacks?.[0]
  if (attack) {
    const damage = attack.damage ?? ''
    const af = fit(attack.name, 64 - (damage === '' ? 0 : measure(damage, REGULAR) + 3))
    drawText(p, attack.name, 8, 91 + 7 - af.cap, af, WHITE, { shadow: INK })
    drawText(p, damage, 71, 91, REGULAR, GOLD[4], { align: 'right', shadow: INK })
    attack.cost.forEach((t, i) => costDot(p, 38 + i * 6, 101, t))
  }
  drawText(p, cardNumber(def, setSize), 8, 101, MICRO, GOLD[3])
  tierMark(p, 65, 99, def.tier, GOLD[3])
  return {
    foil: ring
      .or(box(6, 15, 68, 1))
      .or(box(6, 88, 68, 1))
      .or(box(65, 99, 7, 7)),
    visible: cardShape(4).minus(top).minus(bottom),
  }
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Paint the artwork of a card definition and set it into the frame of its layout and tier. */
export function renderPokemonCard(def: CardDef, setSize: number): RenderedCard {
  const layout = layoutOf(def)
  const area = ART[layout]
  const art = paintArtwork(def, area.w, area.h)
  const card = new Painter(CARD.w, CARD.h)
  const job: Job = { def, card, art, setSize }
  const frame = layout === 'full' ? drawFull(job) : drawFramed(job, layout)

  // foil: the frame's own, plus what the card definition declares inside the visible artwork
  const artFoil = new Mask(CARD.w, CARD.h)
  if (def.foil === 'art') artFoil.rect(area.x, area.y, area.w, area.h)
  else if (def.foil === 'painted') art.foilMask().each((x, y) => artFoil.add(x + area.x, y + area.y))
  const shape = cardShape()
  const foil = frame.foil.or(artFoil.and(frame.visible)).and(shape)

  card.erase(shape.invert())
  return { card, foil, art }
}
