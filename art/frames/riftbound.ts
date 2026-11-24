import type { CardDef, RenderedCard, Tier } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import type { Font } from '../fonts.ts'
import { CONDENSED, MICRO, REGULAR, drawText, fit, measure, wrap } from '../fonts.ts'
import type { Pt, RGB, Ramp, Region } from '../toolkit/index.ts'
import { Mask, Painter, colors, fromHsl, hex, mix, noise, rng } from '../toolkit/index.ts'

/**
 * Card frames of Riftbound (League of Legends TCG). Our own design that evokes the modern layout: a
 * slim dark border, art reaching far down, the energy cost top left with the domain gem below it,
 * the might top right, a slim name bar (champion name, the epithet after the comma as a smaller
 * second line), the type line, and the collector line in the bottom border.
 *
 * Layouts and their art areas (card coordinates):
 * - unit        74×80  at (3, 3):  units Common to Rare; the bottom 17 px lie under the glass name bar
 * - showcase    74×100 at (3, 3):  Alternative units; name bar and text panel are glass over the art
 * - spell       74×56  at (3, 3):  spells and gear, text-forward (name band, type line, text box)
 * - legend      74×72  at (3, 3):  Legends: gold frame and crest plate (the Holo tier; Overnumbered
 *                                   Legends are Alternative and get the textured gold frame)
 * - rune        74×100 at (3, 3):  basic runes, minimal frame, a small name plate floats at the bottom
 * - battlefield 80×52  at (0, 18): a landscape strip that runs through the side borders
 * - full        80×112 at (0, 0):  Ultra and Grail, Legends or units: domain gems, number and tier float
 *                                   in the top 14 px; name, epithet and signature in the bottom 22 px (an
 *                                   "(Ultimate)" card is not signed)
 * On the framed layouts the top left corner (cost badge, gems) and the top right corner (might) are covered.
 * Epithets too long for one line: a Legend's wraps onto two lines in place of its type line; a unit's
 * takes two pixels of the left margin.
 *
 * Printed values come from `def.print`: `energy` (cost badge), `might` (might shield; full art prints
 * neither), `tag` (type line after the kind, e.g. 'Champion', 'Signatur'), `domain2` (second domain gem,
 * e.g. of Legends and Signature spells). Missing values are not printed. Rules text: `def.text`.
 */
export const CARD = { w: 80, h: 112 } as const

export type Layout = 'unit' | 'showcase' | 'spell' | 'legend' | 'rune' | 'battlefield' | 'full'

export const ART: Readonly<Record<Layout, Region>> = {
  unit: { x: 3, y: 3, w: 74, h: 80 },
  showcase: { x: 3, y: 3, w: 74, h: 100 },
  spell: { x: 3, y: 3, w: 74, h: 56 },
  legend: { x: 3, y: 3, w: 74, h: 72 },
  rune: { x: 3, y: 3, w: 74, h: 100 },
  battlefield: { x: 0, y: 18, w: 80, h: 52 },
  full: { x: 0, y: 0, w: 80, h: 112 },
}

export function layoutOf(def: CardDef): Layout {
  if (def.tier === 'ultra' || def.tier === 'grail') return 'full'
  switch (def.kind) {
    case 'legend':
      return 'legend'
    case 'rune':
      return 'rune'
    case 'battlefield':
      return 'battlefield'
    case 'spell':
    case 'gear':
      return 'spell'
    default:
      return def.tier === 'alternative' ? 'showcase' : 'unit'
  }
}

/** Where a card's artwork sits (card coordinates). Ultra and Grail are always full art, 80×112. */
export function artArea(def: CardDef): Region {
  return ART[layoutOf(def)]
}

// ── palette ─────────────────────────────────────────────────────────────────

const INK = hex('0b0c13')
const WHITE = hex('f7f4ec')
/** Border metal, darkest first. */
const GUN = colors('11121a', '1c1e29', '2c2f3e', '474c63')
/** Hextech gold, darkest first. */
const GOLD = colors('4e3a12', '86682a', 'c29a48', 'e9cd86', 'fff4cc')
const STEEL = colors('3e4659', '6e7a92', 'aab6ca', 'e8eff9')
const MUTED = hex('9298ae')
const PAPER = colors('d9cdb2', 'ece3cc', 'f8f2e2')

interface Look {
  /** Dark, mid, light, glint. */
  ramp: readonly [RGB, RGB, RGB, RGB]
  /** 5×5 symbol of our own. */
  glyph: readonly string[]
}

const DOMAINS: Readonly<Record<string, Look>> = {
  Fury: {
    ramp: colors('5e1218', 'b8262c', 'ee4c3c', 'ffb48c'),
    glyph: ['..#..', '..##.', '.###.', '#####', '.###.'],
  },
  Calm: {
    ramp: colors('133e27', '22824a', '4cc06c', 'c8f4b4'),
    glyph: ['...##', '..###', '.###.', '.##..', '#....'],
  },
  Mind: {
    ramp: colors('13265e', '2458c2', '4c90f0', 'b8dcff'),
    glyph: ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..'],
  },
  Body: {
    ramp: colors('5c260c', 'c25a1a', 'f28e2e', 'ffda9e'),
    glyph: ['.....', '..#..', '.###.', '#####', '#####'],
  },
  Chaos: {
    ramp: colors('36124f', '7432ac', 'a65ee2', 'e8c4ff'),
    glyph: ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
  },
  Order: {
    ramp: colors('5c400a', 'b88c16', 'eec43c', 'fff2aa'),
    glyph: ['#.#.#', '#.#.#', '#####', '#####', '#####'],
  },
}

/** Battlefields and cards without a domain. */
const NEUTRAL: Look = {
  ramp: colors('3c3428', '7c6a46', 'b89e66', 'f0dfae'),
  glyph: ['..#..', '..#..', '##.##', '..#..', '..#..'],
}

/** Marker colours of the tiers above Rare (the design tokens of the UI). */
const TIER_COLOR: Readonly<Partial<Record<Tier, RGB>>> = {
  holo: hex('4fe3e0'),
  alternative: hex('c79bff'),
  ultra: hex('ffcf5a'),
}

/** Printed card kinds (German like all player-facing text; the card names stay the official English ones). */
const KIND_LABEL: Readonly<Record<string, string>> = {
  unit: 'EINHEIT',
  spell: 'ZAUBER',
  gear: 'AUSRÜSTUNG',
  rune: 'RUNE',
  battlefield: 'SCHLACHTFELD',
  legend: 'LEGENDE',
}

/** Edge directions for bevels: lit from the top left, shaded at the bottom right. */
const TL = [-1, 0, 0, -1]
const BR = [1, 0, 0, 1]

/** Micro font with narrow spaces, the last resort for long epithets. */
const TIGHT: Font = { ...MICRO, name: 'micro-tight', space: 1 }

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

function str(v: string | number | undefined): string | undefined {
  return v === undefined ? undefined : String(v)
}

function domainsOf(def: CardDef): Look[] {
  return [def.element, str(def.print?.domain2)].flatMap((d) => (d !== undefined && DOMAINS[d] ? [DOMAINS[d]] : []))
}

/** Border metal: gunmetal, or for Alternative cards the domain's own dark tones (textured). */
function metalOf(def: CardDef, look: Look): Ramp {
  return def.tier === 'alternative' ? [mix(look.ramp[0], INK, 0.5), look.ramp[0], mix(look.ramp[0], look.ramp[1], 0.45)] : GUN
}

/** 'Kai'Sa, Daughter of the Void' → 'Kai'Sa' and 'Daughter of the Void'. A trailing '(…)' is not printed. */
function splitName(name: string): { head: string; tail: string } {
  const clean = name.replace(/\s*\([^)]*\)$/, '')
  const i = clean.indexOf(', ')
  return i < 0 ? { head: clean, tail: '' } : { head: clean.slice(0, i), tail: clean.slice(i + 2) }
}

function cardNumber(def: CardDef, setSize: number): string {
  const code = (def.id.split('-')[1] ?? '').toUpperCase()
  return `${code} ${String(def.number).padStart(3, '0')}/${String(setSize).padStart(3, '0')}`
}

/** Type line, e.g. 'EINHEIT · CHAMPION', in micro; the tag is dropped when the line does not fit `w`. */
function typeLine(p: Painter, def: CardDef, x: number, y: number, w: number, c: RGB, align: 'left' | 'center' = 'left'): void {
  const kind = KIND_LABEL[def.kind] ?? def.kind.toUpperCase()
  const tag = str(def.print?.tag)?.toUpperCase()
  const line = tag === undefined || tag === kind ? kind : `${kind} · ${tag}`
  const f = fit(line, w, [MICRO, TIGHT])
  drawText(p, measure(line, f) <= w ? line : kind, x, y, f, c, { align })
}

/**
 * Name block, centred in `h` rows from `y`: the champion in the regular font with the epithet below in
 * micro, or a plain name on one line, or wrapped onto two condensed lines.
 */
function nameLines(
  p: Painter,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  head: RGB,
  tail: RGB,
  align: 'left' | 'center' = 'left',
): void {
  const n = splitName(name)
  const at = align === 'center' ? x + Math.floor(w / 2) : x
  const o = { align, shadow: INK }
  const top = y + Math.floor((h - 14) / 2)
  if (n.tail !== '') {
    const hf = fit(n.head, w)
    const tf = fit(n.tail, w, [MICRO, TIGHT])
    // an epithet too long even in the tight font ('Protector of Dreams') takes two pixels of the margin
    const nudge = align === 'left' && measure(n.tail, tf) > w ? 2 : 0
    drawText(p, n.head, at - nudge, top + 7 - hf.cap, hf, head, o)
    drawText(p, n.tail, at - nudge, top + 9, tf, tail, o)
    return
  }
  const one = fit(n.head, w, [REGULAR, CONDENSED])
  if (measure(n.head, one) <= w) {
    drawText(p, n.head, at, y + Math.floor((h - one.cap) / 2), one, head, o)
    return
  }
  const lines = wrap(n.head, CONDENSED, w)
  if (lines.length <= 2) lines.forEach((line, i) => drawText(p, line, at, top + i * 8, CONDENSED, head, o))
  else wrap(n.head, MICRO, w).slice(0, 2).forEach((line, i) => drawText(p, line, at, top + 2 + i * 7, MICRO, head, o))
}

/** Up to `max` lines of rules text in micro. */
function rulesText(p: Painter, text: string, x: number, y: number, w: number, max: number, ink: RGB): void {
  wrap(text, MICRO, w)
    .slice(0, max)
    .forEach((line, i) => drawText(p, line, x, y + i * 6, MICRO, ink))
}

/** 13×13 energy cost: a dark disc in a silver ring. */
function costBadge(p: Painter, x: number, y: number, value: string): Mask {
  const disc = new Mask(CARD.w, CARD.h).disc(x + 6.5, y + 6.5, 6.5)
  p.fill(disc, STEEL[1])
  p.edge(disc, STEEL[3], TL)
  const inner = disc.shrunk(1)
  p.fill(inner, INK)
  p.edge(inner, GUN[2], TL)
  const f = value.length > 1 ? CONDENSED : REGULAR
  drawText(p, value, x + 6, y + 3 + (7 - f.cap), f, WHITE, { align: 'center' })
  return disc
}

/** 13×13 might: a shield in a gold rim. */
function mightBadge(p: Painter, x: number, y: number, value: string): Mask {
  const shield = new Mask(CARD.w, CARD.h).poly([x, y, x + 13, y, x + 13, y + 8, x + 6.5, y + 13.5, x, y + 8])
  p.fill(shield, GOLD[1])
  p.edge(shield, GOLD[3], TL)
  const inner = shield.shrunk(1)
  p.fill(inner, INK)
  p.edge(inner, GUN[2], TL)
  const f = value.length > 1 ? CONDENSED : REGULAR
  drawText(p, value, x + 6, y + 2 + (7 - f.cap), f, WHITE, { align: 'center' })
  return shield
}

const GEM = ['..#####..', '.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.', '..#####..']

/** 11×11 domain gem: a cut stone with its glyph, in a gold mount. */
function gem(p: Painter, x: number, y: number, look: Look): Mask {
  const stone = new Mask(CARD.w, CARD.h)
  GEM.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') stone.add(x + 1 + i, y + 1 + j)
  })
  const mount = stone.grown(1)
  p.fill(mount, GOLD[1])
  p.edge(mount, GOLD[3], TL)
  p.fill(stone, look.ramp[1])
  p.edge(stone, look.ramp[2], TL)
  p.edge(stone, look.ramp[0], BR)
  p.stamp(look.glyph, x + 3, y + 3, { '#': look.ramp[3] })
  return mount
}

const MARKS: Readonly<Record<'common' | 'uncommon' | 'rare' | 'sparkle', readonly string[]>> = {
  common: ['.......', '..###..', '.#####.', '.#####.', '.#####.', '..###..', '.......'],
  uncommon: ['.......', '...#...', '..###..', '..###..', '.#####.', '.#####.', '.......'],
  rare: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  sparkle: ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
}

/** Tier marker in a 7×7 cell: circle, triangle, diamond in ink; a coloured sparkle above Rare. */
function tierMark(p: Painter, x: number, y: number, tier: Tier, ink: RGB): void {
  if (tier === 'common' || tier === 'uncommon' || tier === 'rare') {
    p.stamp(MARKS[tier], x, y, { '#': ink })
    return
  }
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) p.stamp(MARKS.sparkle, x + dx, y + dy, { '#': INK })
  MARKS.sparkle.forEach((row, j) => {
    const c = tier === 'grail' ? fromHsl(10 + j * 50, 0.9, 0.66) : (TIER_COLOR[tier] ?? ink)
    p.stamp([row], x, y + j, { '#': c })
  })
  p.px(x + 3, y + 3, WHITE)
}

/**
 * A signature-like scribble seeded from the name, 9 rows from `y`: running loops (a trochoid) of
 * varying height, slanted forward, the first loop tall like a capital, ending in an underline.
 */
function signature(name: string, x: number, y: number, w: number): Mask {
  let seed = 7
  for (const ch of name) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0
  const rand = rng(seed)
  const base = y + 6.5
  const slant = 0.15 + rand() * 0.4
  const loop = 1 + rand() * 0.7
  const loops = Math.max(2, Math.floor((w - 6) / (3.4 + rand() * 1.8)))
  const heights = Array.from({ length: loops }, (_, k) => (k === 0 ? 6 : 2.2 + rand() * (rand() < 0.3 ? 3.8 : 1.6)))
  const v = (w - 7) / (loops * Math.PI * 2)
  const points: Pt[] = []
  for (let t = 0; t <= loops * Math.PI * 2; t += 0.2) {
    const k = Math.min(loops - 1, Math.floor(t / (Math.PI * 2)))
    const py = base - ((heights[k] ?? 3) * (1 - Math.cos(t))) / 2
    points.push([x + 1 + v * t - loop * Math.sin(t) + (base - py) * slant, py])
  }
  const end = points[points.length - 1] ?? [x + w, base]
  points.push([end[0] + 2, base + 0.5], [end[0] + 1, base + 1.6], [x + w * 0.45, base + 1.6], [x + 2, base + 1])
  return new Mask(CARD.w, CARD.h).path(points)
}

// ── framed layouts ──────────────────────────────────────────────────────────

interface Job {
  def: CardDef
  card: Painter
  art: Painter
  setSize: number
  looks: Look[]
}

interface FrameResult {
  /** Foil on the frame itself. */
  foil: Mask
  /** Where the artwork shows through the frame untouched. */
  visible: Mask
}

const INSIDE = box(3, 3, 74, 100)

/**
 * Border of the framed layouts: 3 px of metal on top and at the sides with a coloured hairline around
 * the interior, and a 9 px strip at the bottom that carries the collector line. Returns the ring.
 */
function border(p: Painter, metal: Ramp, rim: RGB, textured: boolean): Mask {
  const shape = cardShape()
  const ring = shape.clone().minus(INSIDE)
  p.fill(ring, metal[1] ?? 0)
  if (textured) {
    ring.each((x, y) => {
      if ((x + y) % 4 < 2) p.set(x, y, metal[2] ?? 0)
    })
  }
  p.edge(shape, metal[2] ?? 0, TL)
  p.edge(shape, metal[0] ?? 0, BR)
  p.fill(INSIDE.outerEdge(), rim)
  return ring
}

function collector(p: Painter, def: CardDef, setSize: number, ink: RGB, markInk: RGB): void {
  drawText(p, cardNumber(def, setSize), 5, 105, MICRO, ink)
  tierMark(p, 69, 104, def.tier, markInk)
}

/** Textured dark panel in the tone of the domain: its darkest shade sunk towards ink. */
function panel(p: Painter, m: Mask, look: Look, seed: number): void {
  p.dither(m, [mix(look.ramp[0], INK, 0.62), mix(look.ramp[0], INK, 0.48)], (x, y) => noise(x, y, seed, 6), 0.5)
}

/** Big faint glyph (×3) as a watermark where no rules text is printed. */
function watermark(p: Painter, look: Look, cx: number, cy: number, c: RGB): void {
  look.glyph.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (row[i] === '#') p.fill(box(cx - 7 + i * 3, cy - 7 + j * 3, 3, 3), c)
  })
}

/** Cost badge and the domain gems below it, top left. Returns what they cover. */
function costCorner(p: Painter, def: CardDef, looks: Look[]): Mask {
  const covered = new Mask(CARD.w, CARD.h)
  const energy = str(def.print?.energy)
  let y = 4
  if (energy !== undefined) {
    covered.or(costBadge(p, 4, 4, energy))
    y = 17
  }
  looks.forEach((look, i) => covered.or(gem(p, 5, y + i * 10, look)))
  return covered
}

function mightCorner(p: Painter, def: CardDef): Mask {
  const might = str(def.print?.might)
  return might === undefined ? new Mask(CARD.w, CARD.h) : mightBadge(p, 63, 4, might)
}

function drawUnit(job: Job, showcase: boolean): FrameResult {
  const { def, card: p, art, setSize } = job
  const look = job.looks[0] ?? NEUTRAL
  const shiny = def.tier === 'holo' || def.tier === 'alternative'
  const ring = border(p, metalOf(def, look), look.ramp[1], def.tier === 'alternative')
  panel(p, INSIDE, look, def.number)
  p.blit(art, 3, 3)

  // glass name bar over the foot of the artwork
  const bar = box(3, 66, 74, 17)
  const glass = mix(look.ramp[0], INK, 0.7)
  p.veil(bar, glass, 0.74)
  p.fill(box(3, 66, 74, 1), look.ramp[2])
  nameLines(p, def.name, 6, 67, 68, 16, WHITE, look.ramp[3])

  // type line and rules text (or the domain watermark)
  const low = box(3, 83, 74, 20)
  if (showcase) p.veil(low, glass, 0.84)
  p.fill(box(3, 83, 74, 1), mix(look.ramp[0], INK, 0.3))
  if (!def.text) watermark(p, look, 67, 93, mix(look.ramp[0], INK, showcase ? 0.15 : 0.3))
  typeLine(p, def, 6, 85, 70, GOLD[3])
  if (def.text) rulesText(p, def.text, 6, 91, 68, 2, WHITE)

  const covered = costCorner(p, def, job.looks).or(mightCorner(p, def)).or(bar).or(low)
  collector(p, def, setSize, MUTED, STEEL[3])
  const foil = new Mask(CARD.w, CARD.h)
  if (def.tier === 'alternative') foil.or(ring)
  else if (shiny) foil.or(INSIDE.outerEdge())
  if (shiny) foil.or(box(3, 66, 74, 1)).or(box(69, 104, 7, 7))
  return { foil, visible: box(3, 3, 74, showcase ? 100 : 80).minus(covered) }
}

function drawSpell(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const look = job.looks[0] ?? NEUTRAL
  const gear = def.kind === 'gear'
  const shiny = def.tier === 'holo' || def.tier === 'alternative'
  const ring = border(p, metalOf(def, look), look.ramp[1], def.tier === 'alternative')
  panel(p, INSIDE, look, def.number)
  p.blit(art, 3, 3)

  // name band under the artwork
  p.fill(box(3, 59, 74, 16), mix(look.ramp[0], INK, 0.35))
  p.fill(box(3, 59, 74, 1), look.ramp[2])
  p.fill(box(3, 74, 74, 1), look.ramp[0])
  nameLines(p, def.name, 5, 60, 70, 14, WHITE, look.ramp[3], 'center')
  typeLine(p, def, 6, 76, 70, GOLD[3])

  // text box: paper for spells, steel for gear
  const page = pill(5, 82, 70, 21)
  const tones = gear ? ([mix(STEEL[2], STEEL[3], 0.5), STEEL[3]] as const) : ([PAPER[1], PAPER[2]] as const)
  p.dither(page, tones, (x, y) => noise(x, y, def.number + 3, 7), 0.25)
  p.edge(page, gear ? STEEL[1] : look.ramp[1])
  if (def.text) rulesText(p, def.text, 8, 84, 64, 3, INK)
  else watermark(p, look, 40, 92, mix(tones[0], look.ramp[1], 0.25))

  const covered = costCorner(p, def, job.looks).or(mightCorner(p, def))
  collector(p, def, setSize, MUTED, STEEL[3])
  const foil = new Mask(CARD.w, CARD.h)
  if (def.tier === 'alternative') foil.or(ring)
  else if (shiny) foil.or(INSIDE.outerEdge())
  if (shiny) foil.or(box(3, 59, 74, 1)).or(box(69, 104, 7, 7))
  return { foil, visible: box(3, 3, 74, 56).minus(covered) }
}

function drawLegend(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const look = job.looks[0] ?? NEUTRAL
  const shiny = def.tier === 'holo' || def.tier === 'alternative'
  const ring = border(p, GOLD, INK, def.tier === 'alternative')
  panel(p, INSIDE, look, def.number)
  p.blit(art, 3, 3)

  // crest plate: gold double line with a diamond in the middle, then the names
  p.fill(box(3, 75, 74, 28), mix(look.ramp[0], INK, 0.55))
  p.fill(box(3, 75, 74, 1), GOLD[3])
  p.fill(box(3, 77, 74, 1), GOLD[1])
  const crest = new Mask(CARD.w, CARD.h).poly([40, 70, 45, 75.5, 40, 81, 35, 75.5])
  p.fill(crest, GOLD[2])
  p.edge(crest, GOLD[4], TL)
  p.edge(crest, GOLD[0], BR)
  p.fill(new Mask(CARD.w, CARD.h).poly([40, 73, 42.5, 75.5, 40, 78, 37.5, 75.5]), look.ramp[2])
  const n = splitName(def.name)
  const hf = fit(n.head, 70)
  drawText(p, n.head, 40, 82 + (7 - hf.cap), hf, GOLD[3], { align: 'center', shadow: INK })
  const tf = fit(n.tail, 70, [MICRO, TIGHT])
  if (measure(n.tail, tf) <= 72) {
    if (n.tail !== '') drawText(p, n.tail, 40, 91, tf, WHITE, { align: 'center', shadow: INK })
    typeLine(p, def, 40, 97, 70, GOLD[2], 'center')
  } else {
    // an epithet too long for one line ('Fire Below the Mountain') takes two, in place of the type line
    wrap(n.tail, MICRO, 70)
      .slice(0, 2)
      .forEach((line, i) => drawText(p, line, 40, 90 + i * 7, MICRO, WHITE, { align: 'center', shadow: INK }))
  }

  const covered = costCorner(p, def, job.looks).or(mightCorner(p, def)).or(crest)
  collector(p, def, setSize, INK, INK)
  const foil = new Mask(CARD.w, CARD.h)
  if (shiny) foil.or(ring).or(box(3, 75, 74, 1)).or(box(3, 77, 74, 1)).or(crest)
  return { foil, visible: box(3, 3, 74, 72).minus(covered) }
}

function drawRune(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const look = job.looks[0] ?? NEUTRAL
  const shiny = def.tier === 'holo' || def.tier === 'alternative'
  const ring = border(p, metalOf(def, look), look.ramp[1], def.tier === 'alternative')
  p.blit(art, 3, 3)

  const name = splitName(def.name).head
  const f = fit(name, 66, [REGULAR, CONDENSED])
  const w = Math.min(74, measure(name, f) + 12)
  const plate = pill(40 - Math.floor(w / 2), 88, w, 12)
  p.veil(plate, mix(look.ramp[0], INK, 0.7), 0.74)
  p.fill(plate.facing([0, -1]), look.ramp[2])
  drawText(p, name, 40, 91 + (7 - f.cap), f, WHITE, { align: 'center', shadow: INK })

  collector(p, def, setSize, MUTED, STEEL[3])
  const foil = new Mask(CARD.w, CARD.h)
  if (def.tier === 'alternative') foil.or(ring)
  else if (shiny) foil.or(INSIDE.outerEdge())
  return { foil, visible: box(3, 3, 74, 100).minus(plate) }
}

function drawBattlefield(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const look = job.looks[0] ?? NEUTRAL
  const shiny = def.tier === 'holo' || def.tier === 'alternative'
  const ring = border(p, metalOf(def, look), GOLD[1], def.tier === 'alternative')
  panel(p, INSIDE, look, def.number)

  nameLines(p, def.name, 5, 3, 70, 14, WHITE, GOLD[3], 'center')
  // landscape strip through the side borders, between gold rails
  p.blit(art, 0, 18)
  p.fill(box(0, 17, 80, 1), GOLD[2])
  p.fill(box(0, 70, 80, 1), GOLD[1])

  typeLine(p, def, 40, 74, 70, GOLD[3], 'center')
  const page = pill(5, 81, 70, 21)
  p.fill(page, mix(look.ramp[0], INK, 0.3))
  p.edge(page, GOLD[1])
  if (def.text) rulesText(p, def.text, 8, 84, 64, 3, WHITE)
  else watermark(p, look, 40, 91, mix(look.ramp[0], INK, 0.05))

  collector(p, def, setSize, MUTED, STEEL[3])
  const foil = new Mask(CARD.w, CARD.h)
  if (def.tier === 'alternative') foil.or(ring)
  if (shiny) foil.or(box(0, 17, 80, 1)).or(box(0, 70, 80, 1))
  return { foil, visible: box(0, 18, 80, 52) }
}

// ── full art: Ultra and Grail ───────────────────────────────────────────────

function drawFull(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const grail = def.tier === 'grail'
  const look = job.looks[0] ?? NEUTRAL
  const shape = cardShape()
  p.blit(art)

  // border: two pixels of gold; the Grail's three run through the rainbow
  const width = grail ? 3 : 2
  const ring = shape.clone().minus(cardShape(width))
  const inner = [cardShape(1), cardShape(2)] as const
  ring.each((x, y) => {
    const depth = inner[0].has(x, y) ? (inner[1].has(x, y) ? 2 : 1) : 0
    if (!grail) {
      p.set(x, y, depth === 0 ? GOLD[1] : GOLD[3])
      return
    }
    const turn = Math.atan2(y - CARD.h / 2, (x - CARD.w / 2) * 1.4) / (Math.PI * 2) + 0.5
    const base = mix(fromHsl(Math.floor(turn * 36) * 20, 0.9, 0.62), GOLD[3], 0.35)
    p.set(x, y, depth === 0 ? mix(base, GOLD[0], 0.5) : depth === 1 ? mix(base, WHITE, 0.55) : base)
  })
  p.fill(cardShape(width).minus(cardShape(width + 1)), INK)

  // top 14 rows: domain gems on the left, number and tier on the right (Legends print no cost or might)
  const top = new Mask(CARD.w, CARD.h)
  job.looks.forEach((l, i) => top.or(gem(p, 4 + i * 11, 3, l)))
  const num = cardNumber(def, setSize).split(' ')[1] ?? ''
  const numW = measure(num, MICRO)
  const tag = pill(62 - numW, 4, numW + 14, 9)
  p.veil(tag, INK, 0.72)
  p.fill(tag.facing([0, 1]), GOLD[2])
  drawText(p, num, 66 - numW, 6, MICRO, GOLD[3])
  tierMark(p, 67, 5, def.tier, GOLD[3])
  top.or(tag)

  // bottom 22 rows: plate with the champion, the signature beside it, the epithet below
  const plate = pill(4, 90, 72, 18)
  p.veil(plate, mix(look.ramp[0], INK, 0.75), 0.76)
  p.fill(box(5, 90, 70, 1), GOLD[3])
  const n = splitName(def.name)
  const hf = fit(n.head, 64)
  const headW = drawText(p, n.head, 7, 92 + (7 - hf.cap), hf, WHITE, { shadow: INK })
  const tailW =
    n.tail === '' ? 0 : drawText(p, n.tail, 7, 101, fit(n.tail, 66, [MICRO, TIGHT]), look.ramp[3], { shadow: INK })
  // the signature goes beside the name, or beside the epithet when that row has more room; an
  // Ultimate (Baron Nashor) is not signed
  const [sx, sy] = headW <= tailW ? [11 + headW, 91] : [11 + tailW, 99]
  const signed = 73 - sx >= 12 && !def.name.endsWith('(Ultimate)')
  const sig = signed ? signature(n.head, sx, sy, Math.min(73 - sx, 34)) : new Mask(CARD.w, CARD.h)
  p.fill(sig.moved(1, 1).minus(sig).and(plate), GOLD[0])
  p.fill(sig, GOLD[4])

  return {
    foil: ring.or(box(5, 90, 70, 1)).or(tag.facing([0, 1])).or(sig),
    visible: cardShape(width + 1).minus(top).minus(plate),
  }
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Paint the artwork of a card definition and set it into the frame of its layout and tier. */
export function renderCard(def: CardDef, setSize: number): RenderedCard {
  const layout = layoutOf(def)
  const area = ART[layout]
  const art = paintArtwork(def, area.w, area.h)
  const card = new Painter(CARD.w, CARD.h)
  const job: Job = { def, card, art, setSize, looks: domainsOf(def) }
  const frame =
    layout === 'full'
      ? drawFull(job)
      : layout === 'legend'
        ? drawLegend(job)
        : layout === 'spell'
          ? drawSpell(job)
          : layout === 'rune'
            ? drawRune(job)
            : layout === 'battlefield'
              ? drawBattlefield(job)
              : drawUnit(job, layout === 'showcase')

  // foil: the frame's own, plus what the card definition declares inside the visible artwork
  const artFoil = new Mask(CARD.w, CARD.h)
  if (def.foil === 'art') artFoil.rect(area.x, area.y, area.w, area.h)
  else if (def.foil === 'painted') art.foilMask().each((x, y) => artFoil.add(x + area.x, y + area.y))
  const shape = cardShape()
  const foil = frame.foil.or(artFoil.and(frame.visible)).and(shape)

  card.erase(shape.invert())
  return { card, foil, art }
}
