import type { CardDef, RenderedCard, Tier } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import type { RGB, Region } from '../toolkit/index.ts'
import { Mask, Painter, colors, fromHsl, hex, mix } from '../toolkit/index.ts'
import type { Slot } from './empiremon-layout.ts'
import { EMP_ART_WINDOW, EMP_CLASSIC, EMP_FULL } from './empiremon-layout.ts'

/**
 * Card frames of Empiremon, the game's own TCG (docs/sets/empiremon.md). Our own design: a dark indigo
 * border with a thin gold line, a name bar and a bottom strip in the element colour, the element emblem
 * right of the name, the set symbol and the rarity mark at the right of the number row.
 *
 * No text is baked in (decision 065): the client writes name, type line and number into the slots of
 * `empiremon-layout.ts`, so every slot lies on a calm, dark, flat plate made for light text.
 *
 * - Common: classic layout; the artwork fills the art window (EMP_ART_WINDOW, 72×72). No foil.
 * - Ultra and Grail: full art, the artwork is the whole card (80×112). The plates under the EMP_FULL
 *   slots are tinted by the artwork behind them, so they read as smoked glass. Ultra has a silver-prism
 *   border, Grail a gold one; the border and the whole visible artwork shine.
 */
export const CARD = { w: 80, h: 112 } as const

const FULL: Region = { x: 0, y: 0, w: CARD.w, h: CARD.h }

const isFull = (def: CardDef): boolean => def.tier === 'ultra' || def.tier === 'grail'

/** Where a card's artwork sits (card coordinates). */
export function artArea(def: CardDef): Region {
  return isFull(def) ? FULL : EMP_ART_WINDOW
}

// ── palette ─────────────────────────────────────────────────────────────────

const INK = hex('0a0816')
const WHITE = hex('fbf8ee')
/** Border indigo, darkest first. */
const INDIGO = colors('0c0a1c', '17132f', '241d48', '362d66')
const GOLD = colors('5a3a10', 'a8782a', 'e0b244', 'fbe08c', 'fff6d6')
const SILVER = colors('4a4e62', '8e94aa', 'c8cddc', 'f4f6ff')
/** Set symbols on the dark plates of the full-art layout. */
const CREAM = hex('efe6cc')

interface Element {
  /** Dark, mid, light, glint. */
  ramp: readonly [RGB, RGB, RGB, RGB]
  /** 7×7 emblem of our own: '#' light, 'o' glint. */
  glyph: readonly string[]
}

const ELEMENTS: Readonly<Record<string, Element>> = {
  Glut: {
    ramp: colors('701c0e', 'd4431c', 'f8853a', 'ffd08a'),
    glyph: ['...#...', '..##...', '.###.#.', '.##o##.', '##ooo##', '.#ooo#.', '..###..'],
  },
  Flut: {
    ramp: colors('133a86', '2a6ad2', '62acf6', 'd2ecff'),
    glyph: ['...#...', '...#...', '..###..', '.#####.', '.o####.', '.o####.', '..###..'],
  },
  Kraut: {
    ramp: colors('1a5422', '3a9636', '7cca52', 'd6f6a6'),
    glyph: ['....###', '..#####', '.####o#', '.###o##', '.#o###.', '.o###..', 'o......'],
  },
  Strom: {
    ramp: colors('7a5a06', 'deae14', 'ffdc48', 'fff8c4'),
    glyph: ['...###.', '..###..', '.###...', '######.', '..###..', '.###...', '.#.....'],
  },
  Beton: {
    ramp: colors('383c48', '7a808e', 'b0b5c0', 'eceef2'),
    glyph: ['##.####', '##.####', '.......', '####.##', '####.##', '.......', '##.####'],
  },
  Spuk: {
    ramp: colors('3c1a68', '7a3cc2', 'ac7cee', 'e8d4ff'),
    glyph: ['..###..', '.#####.', '##.#.##', '##.#.##', '#######', '#######', '#.#.#.#'],
  },
}

/** 7×7 set symbols of our own, keyed by the set code in the card id. */
const SYMBOLS: Readonly<Record<string, readonly string[]>> = {
  // Grundauflage: a paw print
  emp1: ['.##.##.', '.##.##.', '#.....#', '#.###.#', '.#####.', '.#####.', '..###..'],
  // Spätschicht: a crescent moon with a star
  emp2: ['..####.', '.###...', '###....', '###..#.', '###....', '.###...', '..####.'],
  // Amt & Elend: a rubber stamp
  emp3: ['..###..', '..###..', '...#...', '...#...', '.#####.', '#######', '#######'],
  // Pfandland: a deposit bottle
  emp4: ['..###..', '...#...', '...#...', '..###..', '.#####.', '.#####.', '.#####.'],
  // Abstellgleis: a train seen from the front
  emp5: ['.#####.', '#.....#', '#.....#', '#######', '#.###.#', '#######', '.#...#.'],
}

/** Rarity marks: Common a white dot, Ultra a silver diamond, Grail a gold crown ('l' light, 'm' mid, 'd' dark). */
const MARKS: Readonly<Partial<Record<Tier, { grid: readonly string[]; key: Readonly<Record<string, RGB>> }>>> = {
  common: { grid: ['.lll.', 'lllll', 'lllll', 'lllll', '.lll.'], key: { l: WHITE } },
  ultra: {
    grid: ['...l...', '..llm..', '.lllmm.', 'lllmmmd', '.lmmmd.', '..mmd..', '...d...'],
    key: { l: SILVER[3], m: SILVER[2], d: SILVER[1] },
  },
  grail: {
    grid: ['l..l..l', 'll.l.ll', 'lllllll', 'mmmmmmm', 'ddddddd'],
    key: { l: GOLD[4], m: GOLD[3], d: GOLD[2] },
  },
}

/** Edge directions for bevels: lit from the top left, shaded at the bottom right. */
const TL = [-1, 0, 0, -1]
const BR = [1, 0, 0, 1]

// ── small parts ─────────────────────────────────────────────────────────────

const CORNER_CUTS: readonly (readonly number[])[] = [[3, 1, 1], [2, 1], [1], [1]]

/** The rounded card silhouette (the same as every other game's), optionally moved inwards. */
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

/** A text slot widened by one pixel on the left and right: the plate under it. */
function plateOf(s: Slot): Mask {
  return box(s.x - 1, s.y, s.w + 2, s.h)
}

function elementOf(def: CardDef): Element {
  const el = ELEMENTS[def.element ?? '']
  if (!el) throw new Error(`empiremon frame: unknown element ${def.element} on ${def.id}`)
  return el
}

/** Average colour of the painted pixels under a mask. */
function average(p: Painter, m: Mask): RGB {
  let [r, g, b, n] = [0, 0, 0, 0]
  m.each((x, y) => {
    const c = p.get(x, y)
    r += (c >> 16) & 255
    g += (c >> 8) & 255
    b += c & 255
    n++
  })
  if (n === 0) return INDIGO[1]
  return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)
}

/** Element band: mid colour, a light top row and a dark bottom row. */
function band(p: Painter, m: Mask, el: Element): void {
  p.fill(m, el.ramp[1])
  p.edge(m, el.ramp[2], [0, -1])
  p.edge(m, el.ramp[0], [0, 1])
}

/** Element emblem with its top left corner at (x, y), on a dark 9×9 socket when `socket` is set. */
function emblem(p: Painter, el: Element, x: number, y: number, socket: RGB | undefined): void {
  if (socket !== undefined) p.fill(pill(x - 1, y - 1, 9, 9), socket)
  p.stamp(el.glyph, x, y, { '#': el.ramp[2], o: el.ramp[3] })
}

/** Set symbol (7×7) of the card's set in one colour, top left at (x, y). */
function setSymbol(p: Painter, def: CardDef, x: number, y: number, c: RGB): void {
  const grid = SYMBOLS[def.id.split('-')[0] ?? '']
  if (!grid) throw new Error(`empiremon frame: no set symbol for ${def.id}`)
  p.stamp(grid, x, y, { '#': c })
}

/** Rarity mark centred in a 7×7 cell at (x, y), with a dark ring so it reads on any background. */
function rarityMark(p: Painter, tier: Tier, x: number, y: number, ring: RGB): void {
  const mark = MARKS[tier]
  if (!mark) return
  const w = mark.grid[0]?.length ?? 0
  const left = x + Math.floor((7 - w) / 2)
  const top = y + Math.floor((7 - mark.grid.length) / 2)
  const shape = new Mask(CARD.w, CARD.h)
  mark.grid.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') shape.add(left + i, top + j)
  })
  p.fill(shape.outerEdge(), ring)
  p.stamp(mark.grid, left, top, mark.key)
}

// ── layouts ─────────────────────────────────────────────────────────────────

/** Common: indigo border, element name bar, art window, element bottom strip with type and number plates. */
function classic(p: Painter, def: CardDef, art: Painter): Mask {
  const el = elementOf(def)
  const plate = mix(el.ramp[0], INDIGO[0], 0.45)

  const shape = cardShape()
  p.fill(shape, INDIGO[2])
  p.edge(shape, INDIGO[3], TL)
  p.edge(shape, INDIGO[0], BR)
  p.fill(cardShape(2), GOLD[2])
  p.fill(cardShape(3), INDIGO[1])

  // name bar: the name plate, the emblem in its socket on the right
  band(p, box(3, 3, 74, 11), el)
  p.fill(plateOf(EMP_CLASSIC.name), plate)
  emblem(p, el, 67, EMP_CLASSIC.name.y + 1, plate)

  p.blit(art, EMP_ART_WINDOW.x, EMP_ART_WINDOW.y)

  // bottom strip: type plate, number plate, set symbol and rarity mark
  band(p, box(3, 88, 74, 21), el)
  p.fill(plateOf(EMP_CLASSIC.type), plate)
  p.fill(plateOf(EMP_CLASSIC.number), plate)
  setSymbol(p, def, 57, 99, plate)
  rarityMark(p, def.tier, 67, 99, plate)

  return new Mask(CARD.w, CARD.h)
}

/** A plate over the artwork: flat, tinted by what lies behind it, with a light top edge. */
function glass(p: Painter, m: Mask): void {
  const behind = average(p, m)
  p.fill(m, mix(behind, INDIGO[0], 0.78))
  p.edge(m, mix(behind, WHITE, 0.2), [0, -1])
}

/** Ultra and Grail: the artwork is the card; glass plates under the slots; silver-prism or gold border. */
function full(p: Painter, def: CardDef, art: Painter): Mask {
  const el = elementOf(def)
  const grail = def.tier === 'grail'
  p.blit(art)

  const top = pill(4, EMP_FULL.name.y - 1, 72, EMP_FULL.name.h + 2)
  const bottom = pill(4, EMP_FULL.type.y - 1, 72, EMP_FULL.number.y + EMP_FULL.number.h + 2 - EMP_FULL.type.y)
  glass(p, top)
  glass(p, bottom)
  emblem(p, el, 67, EMP_FULL.name.y + 1, undefined)
  setSymbol(p, def, 57, EMP_FULL.number.y - 1, CREAM)
  rarityMark(p, def.tier, 67, EMP_FULL.number.y - 1, INK)

  // border: Grail three pixels of gold, Ultra two of silver that run through the colours of a prism
  const width = grail ? 3 : 2
  const ring = cardShape().minus(cardShape(width))
  const inner = [cardShape(1), cardShape(2)] as const
  ring.each((x, y) => {
    const depth = inner[0].has(x, y) ? (inner[1].has(x, y) ? 2 : 1) : 0
    if (grail) {
      p.set(x, y, depth === 0 ? GOLD[1] : depth === 1 ? GOLD[3] : GOLD[2])
      return
    }
    const turn = Math.atan2(y - CARD.h / 2, (x - CARD.w / 2) * 1.4) / (Math.PI * 2) + 0.5
    const prism = mix(fromHsl(Math.floor(turn * 18) * 20, 0.9, 0.7), SILVER[2], 0.3)
    p.set(x, y, depth === 0 ? mix(prism, SILVER[0], 0.4) : mix(prism, WHITE, 0.3))
  })
  p.fill(cardShape(width).minus(cardShape(width + 1)), INK)

  const visible = cardShape(width + 1).minus(top).minus(bottom)
  return ring.or(visible)
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Paint the artwork of a card and set it into its frame. The number is written by the client, not here. */
export function renderCard(def: CardDef, _setSize: number): RenderedCard {
  const area = artArea(def)
  const art = paintArtwork(def, area.w, area.h)
  const card = new Painter(CARD.w, CARD.h)
  const shape = cardShape()
  const foil = (isFull(def) ? full(card, def, art) : classic(card, def, art)).and(shape)
  card.erase(shape.invert())
  return { card, foil, art }
}
