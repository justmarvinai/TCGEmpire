import type { CardDef, RenderedCard, Tier } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import type { Font } from '../fonts.ts'
import { CONDENSED, MICRO, REGULAR, drawText, measure, wrap } from '../fonts.ts'
import type { RGB, Ramp, Region } from '../toolkit/index.ts'
import { Mask, Painter, colors, fromHsl, hex, mix, noise, pts } from '../toolkit/index.ts'

/**
 * Card frames of the Yu-Gi-Oh! game. Our own design that evokes the classic layout: a frame in the
 * colour of the card kind, a name bar with the attribute orb on the right, level stars, a square-ish
 * art window, a paper text box with type line and ATK/DEF, and the number and tier marker in the
 * bottom border (where the real card has its passcode and hologram sticker).
 *
 * Layouts and their art areas (card coordinates):
 * - framed 62×56 at (9, 24): every card of the tiers Common to Alternative; a name that needs three
 *   lines pushes the art window down to 62×50 at (9, 30)
 * - full   80×112 at (0, 0): Ultra and Grail; the text plates float on the artwork inside the top
 *   14 and the bottom 22 pixels
 *
 * Printed values read from `def.print`: `level` (stars), `atk`, `def` and `type` (the monster type for
 * the type line, e.g. 'Drache'; effect, fusion and ritual monsters get '/Effekt', '/Fusion' and
 * '/Ritual' appended).
 *
 * Subtypes (`def.sub`): monsters normal, effect, fusion and ritual (each with its frame colour);
 * spells equip, field, continuous, quickplay and ritual, traps continuous and counter (each with an
 * icon in the stars row; normal spells and traps have none).
 */
export const CARD = { w: 80, h: 112 } as const

const FRAMED: Region = { x: 9, y: 24, w: 62, h: 56 }
const FULL: Region = { x: 0, y: 0, w: 80, h: 112 }
/** Height of one micro text line: five rows of capitals plus one for the descender. */
const LINE = 6

// ── palette ─────────────────────────────────────────────────────────────────

const INK = hex('1e1722')
const WHITE = hex('fffbea')
/** Text box paper: shadow, fill, light. */
const PAPER = colors('cdbb8c', 'efe5c8', 'faf4e2')
const GOLD = colors('7c5410', 'b98216', 'e8b428', 'f8d552', 'fff2a8')
const SILVER = colors('56607c', '8e9ab6', 'c8d2e6', 'f4f8ff')
const GLASS = hex('0c0816')
/** Lettering pressed into the gold footer. */
const ENGRAVED = hex('3c2410')

type Look = 'normal' | 'effect' | 'fusion' | 'ritual' | 'spell' | 'trap'

interface KindLook {
  /** Frame ramp, darkest first: shadow, three texture tones, highlight. */
  frame: readonly [RGB, RGB, RGB, RGB, RGB]
  /** Name bar fill and the colour of the name on it. */
  bar: RGB
  name: RGB
  /** Colour of the number and the plain tier marks on the frame. */
  print: RGB
}

const LOOKS: Readonly<Record<Look, KindLook>> = {
  normal: {
    frame: colors('7a5326', 'b98a4c', 'c59757', 'd0a463', 'eccb8e'),
    bar: hex('e3c083'),
    name: INK,
    print: INK,
  },
  effect: {
    frame: colors('7a2f14', 'c2602c', 'cc6d36', 'd67b42', 'f2a870'),
    bar: hex('eb9a5e'),
    name: INK,
    print: INK,
  },
  fusion: {
    frame: colors('42205c', '7a4a9c', '8556a7', '9062b1', 'c59ce0'),
    bar: hex('b78ed4'),
    name: INK,
    print: WHITE,
  },
  ritual: {
    frame: colors('1e3a78', '4a72c0', '557dca', '6088d4', 'a8c6f4'),
    bar: hex('94b4ec'),
    name: INK,
    print: INK,
  },
  spell: {
    frame: colors('0b4c40', '178a6d', '1d9777', '25a481', '66d4ae'),
    bar: hex('0f6a56'),
    name: WHITE,
    print: INK,
  },
  trap: {
    frame: colors('5c1340', 'a52f72', 'b13a7e', 'bd4689', 'e88dc0'),
    bar: hex('7c1e57'),
    name: WHITE,
    print: WHITE,
  },
}

function lookOf(def: CardDef): Look {
  if (def.kind === 'spell') return 'spell'
  if (def.kind === 'trap') return 'trap'
  return def.sub === 'effect' || def.sub === 'fusion' || def.sub === 'ritual' ? def.sub : 'normal'
}

interface Orb {
  /** Rim, shadow side, lit side, glyph. */
  colors: readonly [RGB, RGB, RGB, RGB]
  /** 5×5 pictogram of our own. */
  glyph: readonly string[]
}

/** Attribute orbs, plus the orbs of spells and traps. */
const ORBS: Readonly<Record<string, Orb>> = {
  FINSTERNIS: {
    colors: [hex('25103a'), hex('5e2687'), hex('8a4cbc'), hex('f2dcff')],
    glyph: ['.oo..', 'oo...', 'oo...', 'oo...', '.oo..'],
  },
  LICHT: {
    colors: [hex('6a4400'), hex('d7a312'), hex('f6d24a'), hex('fffbe6')],
    glyph: ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'],
  },
  ERDE: {
    colors: [hex('3a2210'), hex('7f5227'), hex('ab7a44'), hex('f8e6c4')],
    glyph: ['.....', '..o..', '.ooo.', 'ooooo', '.....'],
  },
  FEUER: {
    colors: [hex('580a06'), hex('c42a18'), hex('ee5a32'), hex('ffe28c')],
    glyph: ['..o..', '.oo..', '.ooo.', 'ooooo', '.ooo.'],
  },
  WASSER: {
    colors: [hex('0a275e'), hex('2160c2'), hex('4b92ea'), hex('e2f4ff')],
    glyph: ['..o..', '.ooo.', 'ooooo', 'ooooo', '.ooo.'],
  },
  WIND: {
    colors: [hex('0e4417'), hex('2b9036'), hex('5cc458'), hex('eaffdc')],
    glyph: ['oooo.', '.....', '.ooo.', '.....', '..oo.'],
  },
  ZAUBER: {
    colors: [hex('053a33'), hex('1fae8e'), hex('6ee0c2'), hex('f4fffb')],
    glyph: ['..o..', '.o.o.', 'o...o', '.o.o.', '..o..'],
  },
  FALLE: {
    colors: [hex('4a0934'), hex('cc3a96'), hex('f282c6'), hex('fff0f8')],
    glyph: ['o.o.o', 'ooooo', '.....', 'ooooo', 'o.o.o'],
  },
}
const UNKNOWN_ORB: Orb = {
  colors: [hex('3c3a44'), hex('7a7884'), hex('a8a6b2'), hex('f4f2fa')],
  glyph: ['.ooo.', '...o.', '..o..', '.....', '..o..'],
}

function orbOf(def: CardDef): Orb {
  if (def.kind === 'spell') return ORBS.ZAUBER ?? UNKNOWN_ORB
  if (def.kind === 'trap') return ORBS.FALLE ?? UNKNOWN_ORB
  return ORBS[def.element ?? ''] ?? UNKNOWN_ORB
}

/** Level star: rim, disc, star. */
const STAR = colors('6a1408', 'dc4a1e', 'ffd84a')

/** Marker colours of the tiers above Rare (the design tokens of the UI). */
const TIER_COLOR: Readonly<Partial<Record<Tier, RGB>>> = {
  holo: hex('4fe3e0'),
  alternative: hex('c79bff'),
  ultra: hex('ffcf5a'),
}

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
/**
 * Subtype icons of spells and traps, 5×5: equip (cross), field (compass), continuous (loop),
 * quickplay (lightning), ritual (flame) and counter (an arrow making a U-turn).
 */
const ICONS: Readonly<Record<string, readonly string[]>> = {
  equip: ['..#..', '..#..', '#####', '..#..', '..#..'],
  field: ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..'],
  continuous: ['.....', '##.##', '#.#.#', '##.##', '.....'],
  quickplay: ['..##.', '.##..', '####.', '..##.', '.##..'],
  ritual: ['..#..', '.##..', '.###.', '##.##', '.###.'],
  counter: ['.###.', '....#', '.#..#', '####.', '.#...'],
}

const CORNER_CUTS: readonly (readonly number[])[] = [[3, 1, 1], [2, 1], [1], [1]]

/** The rounded card silhouette (the same as the card back), optionally moved inwards by `inset`. */
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

/** 7×7 attribute orb: a small sphere lit from the top left with our own pictogram. */
function orb(p: Painter, x: number, y: number, def: CardDef): void {
  const { colors: c, glyph } = orbOf(def)
  p.stamp(DISC7, x, y, { '#': c[0] })
  p.stamp(['.###.', '#####', '#####', '#####', '.###.'], x + 1, y + 1, { '#': c[1] })
  p.stamp(['.##..', '##...', '#....'], x + 1, y + 1, { '#': c[2] })
  p.stamp(glyph, x + 1, y + 1, { o: c[3] })
}

/**
 * Spacing of a row of level stars whose first star sits `room` pixels right of where the last may
 * start: eight pixels, closer together when more than nine stars would not fit (Torwächter has 11).
 */
function starStep(level: number, room: number): number {
  return level <= 1 ? 8 : Math.min(8, Math.floor(room / (level - 1)))
}

/** 7×7 level star: a red disc with a yellow star. */
function levelStar(p: Painter, x: number, y: number): void {
  p.stamp(DISC7, x, y, { '#': STAR[0] })
  p.stamp(['.###.', '#####', '#####', '#####', '.###.'], x + 1, y + 1, { '#': STAR[1] })
  p.stamp(STAR5, x + 1, y + 1, { '#': STAR[2] })
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

/** Print on the frame: lettering with a one-pixel halo of the frame's base tone, so it reads on texture. */
function imprint(p: Painter, paint: (layer: Painter) => void, color: RGB, halo: RGB): void {
  const layer = new Painter(CARD.w, CARD.h)
  paint(layer)
  const m = layer.mask()
  p.fill(m.grown(1).minus(m), halo)
  p.fill(m, color)
}

function cardNumber(def: CardDef, setSize: number): string {
  return `${String(def.number).padStart(3, '0')}/${String(setSize).padStart(3, '0')}`
}

// ── printed values ──────────────────────────────────────────────────────────

function printed(def: CardDef, key: string): string | undefined {
  const v = def.print?.[key]
  return v === undefined || v === '' ? undefined : String(v)
}

function levelOf(def: CardDef): number {
  const n = Number(printed(def, 'level') ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.min(12, Math.round(n))) : 0
}

/** What effect, fusion and ritual monsters append to their type. */
const KIND_SUFFIX: Readonly<Record<string, string>> = { effect: '/Effekt', fusion: '/Fusion', ritual: '/Ritual' }

/**
 * The type line, e.g. 'Drache' or 'Krieger/Fusion' (printed in brackets): effect and fusion monsters get
 * their kind appended where it fits, a type too long for one row wraps onto a second. Empty if no type
 * is printed.
 */
function typeRows(def: CardDef, width: number): string[] {
  const type = printed(def, 'type')
  if (type === undefined) return []
  const kind = KIND_SUFFIX[def.sub ?? ''] ?? ''
  for (const t of [type.includes('/') ? type : type + kind, type]) if (bracketedWidth(t, MICRO, false) <= width) return [t]
  return wrap(type, MICRO, width - 3).slice(0, 2)
}

function statLine(def: CardDef): string {
  return `ATK/${printed(def, 'atk') ?? '?'} DEF/${printed(def, 'def') ?? '?'}`
}

/** Stars row text of spells and traps. */
function kindLine(def: CardDef): string {
  return def.kind === 'trap' ? 'FALLENKARTE' : 'ZAUBERKARTE'
}

/** A square bracket as tall as the font's capitals (the fonts have none). */
function bracket(p: Painter, x: number, y: number, f: Font, color: RGB, closing = false): void {
  p.stamp(['##', ...Array.from({ length: f.cap - 2 }, () => '#.'), '##'], x, y, { '#': color }, closing)
}

/** Text in square brackets, optionally with a subtype icon before the closing bracket. */
function bracketed(p: Painter, text: string, x: number, y: number, f: Font, color: RGB, icon?: readonly string[]): void {
  const width = bracketedWidth(text, f, icon !== undefined)
  bracket(p, x, y, f, color)
  drawText(p, text, x + 3, y, f, color)
  if (icon) p.stamp(icon, x + width - 8, y + f.cap - 5, { '#': color })
  bracket(p, x + width - 2, y, f, color, true)
}

/** Brackets take two pixels and a gap on either side; an icon takes five pixels and a gap. */
function bracketedWidth(text: string, f: Font, icon: boolean): number {
  return measure(text, f) + 6 + (icon ? 6 : 0)
}

// ── names ───────────────────────────────────────────────────────────────────

interface NameLayout {
  font: Font
  lines: string[]
}

const VOWELS = 'aeiouäöüy'
const DIPHTHONGS = ['ai', 'au', 'ei', 'eu', 'ie', 'äu']
/** Consonant pairs that start a syllable together (Menschen-fresser, Stolper-draht). */
const ONSETS = ['bl', 'br', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr']

/**
 * Where a German word may be hyphenated, by the simple syllable rules: one consonant between vowels
 * starts the next syllable, of several the last one does; sch, ch, ck, ph and th stay together, and so
 * do pairs like 'fr' or 'dr' that usually begin the second part of a compound. At least two letters
 * stay on either side.
 */
function syllableBreaks(word: string): number[] {
  const w = word.toLowerCase()
  const vowel = (i: number) => VOWELS.includes(w[i] ?? '-')
  const nuclei: [number, number][] = []
  for (let i = 0; i < w.length; ) {
    if (!vowel(i)) {
      i++
      continue
    }
    let end = i + 1
    while (end < w.length && vowel(end) && DIPHTHONGS.includes(w.slice(end - 1, end + 1))) end++
    nuclei.push([i, end])
    i = end
  }
  const breaks: number[] = []
  for (let n = 1; n < nuclei.length; n++) {
    const from = nuclei[n - 1]?.[1] ?? 0
    const to = nuclei[n]?.[0] ?? 0
    const cluster = w.slice(from, to)
    let tail = 1
    if (cluster.length === 0) tail = 0
    else if (/sch[lmnrw]$/.test(cluster)) tail = 4
    else if (cluster.endsWith('sch')) tail = 3
    else if (/(ch|ck|ph|th)$/.test(cluster) || ONSETS.some((o) => cluster.endsWith(o))) tail = 2
    const at = to - Math.min(tail, cluster.length)
    if (at >= 2 && w.length - at >= 2 && /[a-zäöüß]/.test(w.slice(at - 1, at + 1))) breaks.push(at)
  }
  return breaks
}

/**
 * The syllable break for a hyphenated head that fits: the longest head that leaves at least four
 * letters for the next line (Stolperdraht-bestie, not Stolperdrahtbes-tie), else the longest head.
 */
function bestBreak(word: string, fits: (head: string) => boolean): number | undefined {
  const ok = syllableBreaks(word).filter((i) => fits(word.slice(0, i) + '-'))
  return ok.filter((i) => word.length - i >= 4).pop() ?? ok.pop()
}

/** Width of a name line: names set their spaces one pixel narrower than running text. */
function nameWidth(text: string, f: Font): number {
  return measure(text, f) - (text.split(' ').length - 1)
}

/**
 * Break a name into micro lines of at most `width` pixels: at spaces and existing hyphens first; a
 * part that does not fit a line on its own is hyphenated by syllables.
 */
function breakName(name: string, width: number): string[] {
  const fits = (s: string) => nameWidth(s, MICRO) <= width
  const lines: string[] = []
  let line = ''
  const chunks = name.split(' ').flatMap((word) => word.split(/(?<=-)/).map((chunk, i) => ({ chunk, space: i === 0 })))
  for (const { chunk, space } of chunks) {
    const glue = line === '' || !space ? '' : ' '
    if (fits(line + glue + chunk)) {
      line += glue + chunk
      continue
    }
    let rest = chunk
    if (line !== '' && !fits(rest)) {
      // fill the current line with the best syllable head that fits
      const at = bestBreak(rest, (head) => fits(line + glue + head))
      if (at !== undefined) {
        line += glue + rest.slice(0, at) + '-'
        rest = rest.slice(at)
      }
    }
    if (line !== '') lines.push(line)
    line = ''
    while (!fits(rest)) {
      const at = bestBreak(rest, fits)
      if (at === undefined) break
      lines.push(rest.slice(0, at) + '-')
      rest = rest.slice(at)
    }
    line = rest
  }
  if (line !== '') lines.push(line)
  return lines
}

/** One line in the first font that fits (regular → condensed → micro), else micro lines. */
function layoutName(name: string, width: number): NameLayout {
  const font = [REGULAR, CONDENSED, MICRO].find((f) => nameWidth(name, f) <= width)
  return font ? { font, lines: [name] } : { font: MICRO, lines: breakName(name, width) }
}

/** Mask of one name line drawn at (x, y), with the narrow name spaces. */
function lineMask(text: string, x: number, y: number, f: Font): Mask {
  const t = new Painter(CARD.w, CARD.h)
  let cx = x
  for (const word of text.split(' ')) cx += drawText(t, word, cx, y, f, WHITE) + f.space + 1
  return t.mask()
}

/**
 * Paint a name: flat in one colour, or as metal (a ramp, darkest first) that is light on top and dark
 * at the baseline. Adds the inked pixels to `foil` if given.
 */
function paintName(
  p: Painter,
  name: NameLayout,
  x: number,
  ys: readonly number[],
  ink: RGB | Ramp,
  shadow: RGB | undefined,
  foil?: Mask,
): void {
  name.lines.forEach((line, i) => {
    const y = ys[i] ?? 0
    const m = lineMask(line, x, y, name.font)
    if (shadow !== undefined) p.fill(m.moved(1, 1).minus(m), shadow)
    m.each((px, py) => {
      if (typeof ink === 'number') p.set(px, py, ink)
      else {
        const t = (py - y) / Math.max(1, name.font.cap - 1)
        const step = Math.round((1 - Math.min(1, t)) * (ink.length - 1) * 0.85 + 0.4)
        p.set(px, py, ink[Math.max(0, Math.min(ink.length - 1, step))] ?? ink[0] ?? INK)
      }
    })
    if (foil) foil.or(m)
  })
}

/** Tops of the name lines inside a block that starts at `top`, centred on row `middle` for one line. */
function nameRows(name: NameLayout, top: number, middle: number): number[] {
  if (name.lines.length === 1) return [middle - Math.floor(name.font.cap / 2)]
  return name.lines.map((_, i) => top + i * LINE)
}

// ── framed layout: Common to Alternative ────────────────────────────────────

/** Name bar geometry of the framed layout. */
const BAR = { x: 3, y: 3, w: 74, h: 13 }
const ORB_X = 69
/** The name runs from x = 5 to the pixel before the gap left of the orb. */
const NAME_X = 5
const NAME_W = ORB_X - 1 - NAME_X

function framedName(def: CardDef): NameLayout {
  return layoutName(def.name, NAME_W)
}

interface Job {
  def: CardDef
  card: Painter
  art: Painter
  area: Region
  setSize: number
}

interface FrameResult {
  /** Foil on the frame itself. */
  foil: Mask
  /** Where the artwork shows through the frame untouched. */
  visible: Mask
}

function drawFramed(job: Job): FrameResult {
  const { def, card: p, art, area, setSize } = job
  const look = LOOKS[lookOf(def)]
  const [shadow, , base, , light] = look.frame
  const shape = cardShape()
  const foil = new Mask(CARD.w, CARD.h)
  const holo = def.tier === 'holo'
  const textured = def.tier === 'alternative'

  // frame body: a cloudy texture of three close tones, bevelled at the card edge
  p.dither(shape, look.frame.slice(1, 4), (x, y) => noise(x, y, def.number * 7, 9), 0.7)
  if (textured) {
    // Alternative: an embossed diamond lattice over the whole frame, which shines
    shape.each((x, y) => {
      const a = (x + y) % 8
      const b = (x - y + 800) % 8
      if (a === 0 || b === 0) p.set(x, y, light)
      else if (a === 1 || b === 1) p.set(x, y, shadow)
    })
  }
  p.edge(shape, light, TL)
  p.edge(shape, shadow, BR)

  // name bar, sunk into the frame
  const name = framedName(def)
  const barH = BAR.h + Math.max(0, name.lines.length - 2) * LINE
  const bar = box(BAR.x, BAR.y, BAR.w, barH)
  p.fill(bar, holo ? mix(shadow, INK, 0.45) : look.bar)
  p.edge(bar, shadow, TL)
  p.edge(bar, light, BR)
  const middle = BAR.y + Math.floor(barH / 2)
  orb(p, ORB_X, middle - 3, def)
  const nameTops = nameRows(name, BAR.y + 1, middle)
  if (holo) paintName(p, name, NAME_X, nameTops, SILVER, INK, foil)
  else paintName(p, name, NAME_X, nameTops, look.name, look.name === WHITE ? INK : undefined)

  // stars row: level stars of monsters, the card kind of spells and traps
  const starsY = BAR.y + barH
  if (def.kind === 'spell' || def.kind === 'trap') {
    const icon = ICONS[def.sub ?? '']
    const kind = kindLine(def)
    const f = bracketedWidth(kind, CONDENSED, icon !== undefined) <= 66 ? CONDENSED : MICRO
    const x = BAR.x + BAR.w - 1 - bracketedWidth(kind, f, icon !== undefined)
    imprint(p, (q) => bracketed(q, kind, x, starsY + 7 - f.cap, f, INK, icon), INK, base)
  } else {
    const level = levelOf(def)
    const first = BAR.x + BAR.w - 8
    const step = starStep(level, first - BAR.x - 1)
    for (let i = 0; i < level; i++) levelStar(p, first - i * step, starsY)
  }

  // art window
  const frame = box(area.x - 1, area.y - 1, area.w + 2, area.h + 2)
  p.fill(frame.moved(1, 1), mix(shadow, INK, 0.3))
  if (holo) {
    p.fill(frame, SILVER[1])
    p.edge(frame, SILVER[3], TL)
    p.edge(frame, SILVER[0], BR)
    foil.or(frame.clone().minus(box(area.x, area.y, area.w, area.h)))
  } else {
    p.fill(frame, shadow)
  }
  p.blit(art, area.x, area.y)

  // text box: type line, a short text, ATK/DEF
  const text = box(BAR.x, 82, BAR.w, 21)
  p.fill(text, PAPER[1])
  p.edge(text, PAPER[0], TL)
  p.edge(text, PAPER[2], BR)
  const left = BAR.x + 2
  const right = BAR.x + BAR.w - 3
  const width = right - left + 1
  const lines = wrap(def.text ?? '', MICRO, width)
  if (def.kind === 'monster') {
    // two rows above the rule: the type line in brackets, then the text
    const type = typeRows(def, width)
    const rows = [...type, ...lines].slice(0, 2)
    rows.forEach((row, i) => {
      const y = 84 + i * LINE
      const open = i === 0 && type.length > 0
      if (open) bracket(p, left, y, MICRO, INK)
      const end = (open ? left + 3 : left) + drawText(p, row, open ? left + 3 : left, y, MICRO, INK)
      if (i === type.length - 1) bracket(p, end + 1, y, MICRO, INK, true)
    })
    p.fill(box(left, 96, width, 1), PAPER[0])
    drawText(p, statLine(def), right, 97, MICRO, INK, { align: 'right' })
  } else {
    lines.slice(0, 3).forEach((line, i) => drawText(p, line, left, 84 + i * LINE, MICRO, INK))
  }

  // bottom border: number on the left, tier marker on the right
  imprint(p, (q) => drawText(q, cardNumber(def, setSize), BAR.x + 2, 105, MICRO, INK), look.print, base)
  if (def.tier === 'common' || def.tier === 'uncommon' || def.tier === 'rare')
    imprint(p, (q) => tierMark(q, 68, 104, def.tier, INK), look.print, base)
  else tierMark(p, 68, 104, def.tier, look.print)
  if (holo) foil.or(box(67, 103, 9, 9))
  if (textured) foil.or(shape.clone().minus(bar).minus(frame).minus(text))
  return { foil, visible: box(area.x, area.y, area.w, area.h) }
}

// ── full art: Ultra and Grail ───────────────────────────────────────────────

/** First row of the gold footer band of the full-art layout (the real card's bottom margin). */
const FOOTER = 105
const FULL_ORB_X = 69
const FULL_NAME_W = FULL_ORB_X - 1 - 4

function drawFull(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const grail = def.tier === 'grail'
  const shape = cardShape()
  p.blit(art)

  // border: two pixels of gold that widen into a footer band at the bottom; for the Grail running
  // through the rainbow. A line of ink separates it from the artwork.
  const window = cardShape(2).and(box(0, 0, CARD.w, FOOTER - 1))
  const ring = shape.clone().minus(window)
  const lit = ring.facing(TL).and(shape.facing(TL))
  const dark = ring.facing(BR).and(shape.facing(BR))
  ring.each((x, y) => {
    const turn = Math.atan2(y - CARD.h / 2, (x - CARD.w / 2) * 1.4) / (Math.PI * 2) + 0.5
    const hue = Math.floor(turn * 2 * 18) * 20
    const base = grail ? mix(fromHsl(hue, 0.9, 0.62), GOLD[3], 0.35) : GOLD[2]
    if (lit.has(x, y) || y === FOOTER) p.set(x, y, grail ? mix(base, WHITE, 0.5) : GOLD[4])
    else if (dark.has(x, y)) p.set(x, y, grail ? mix(base, GOLD[0], 0.45) : GOLD[1])
    else p.set(x, y, base)
  })
  const line = window.clone().minus(cardShape(3)).or(box(2, FOOTER - 1, 76, 1)).and(window)
  p.fill(line, INK)

  // name plate: name and orb inside the top 14 pixels (a name of three lines would need more)
  const name = layoutName(def.name, FULL_NAME_W)
  const top = pill(2, 2, 76, 12 + Math.max(0, name.lines.length - 2) * LINE)
  p.veil(top, GLASS, 0.74)
  orb(p, FULL_ORB_X, 5, def)
  const tops = name.lines.length === 1 ? nameRows(name, 3, 8) : name.lines.map((_, i) => 3 + i * LINE)
  const foil = new Mask(CARD.w, CARD.h)
  paintName(p, name, 4, tops, GOLD.slice(1), INK, foil)

  // stat plate: stars, then ATK/DEF (or the card kind and a line of text)
  const bottom = pill(2, 90, 76, FOOTER - 1 - 90)
  p.veil(bottom, GLASS, 0.74)
  const right = 75
  if (def.kind === 'spell' || def.kind === 'trap') {
    const icon = ICONS[def.sub ?? '']
    const text = kindLine(def)
    bracketed(p, text, right - bracketedWidth(text, MICRO, icon !== undefined) + 1, 92, MICRO, WHITE, icon)
    const first = wrap(def.text ?? '', MICRO, 70)[0]
    if (first !== undefined) drawText(p, first, 5, 98, MICRO, WHITE, { shadow: INK })
  } else {
    const level = levelOf(def)
    const step = starStep(level, right - 6 - 4)
    for (let i = 0; i < level; i++) levelStar(p, right - 6 - i * step, 91)
    drawText(p, statLine(def), right, 98, MICRO, WHITE, { align: 'right', shadow: INK })
  }

  // footer: the number engraved into the gold, the tier marker pinned over its edge
  drawText(p, cardNumber(def, setSize), 5, FOOTER + 1, MICRO, ENGRAVED)
  p.fill(pill(68, FOOTER - 2, 9, 9), INK)
  tierMark(p, 69, FOOTER - 1, def.tier, ENGRAVED)
  return {
    foil: foil.or(ring).or(box(68, FOOTER - 2, 9, 9)),
    visible: window.clone().minus(line).minus(top).minus(bottom),
  }
}

// ── entry points ────────────────────────────────────────────────────────────

function isFull(def: CardDef): boolean {
  return def.tier === 'ultra' || def.tier === 'grail'
}

/** Where a card's artwork sits (card coordinates). Ultra and Grail are always full art, 80×112. */
export function artArea(def: CardDef): Region {
  if (isFull(def)) return { ...FULL }
  const push = Math.max(0, framedName(def).lines.length - 2) * LINE
  return { x: FRAMED.x, y: FRAMED.y + push, w: FRAMED.w, h: FRAMED.h - push }
}

/** Paint the artwork of a card definition and set it into the frame of its kind and tier. */
export function renderCard(def: CardDef, setSize: number): RenderedCard {
  const area = artArea(def)
  const art = paintArtwork(def, area.w, area.h)
  const card = new Painter(CARD.w, CARD.h)
  const job: Job = { def, card, art, area, setSize }
  const frame = isFull(def) ? drawFull(job) : drawFramed(job)

  // foil: the frame's own, plus what the card definition declares inside the visible artwork
  const artFoil = new Mask(CARD.w, CARD.h)
  if (def.foil === 'art') artFoil.rect(area.x, area.y, area.w, area.h)
  else if (def.foil === 'painted') art.foilMask().each((x, y) => artFoil.add(x + area.x, y + area.y))
  const shape = cardShape()
  const foil = frame.foil.or(artFoil.and(frame.visible)).and(shape)

  card.erase(shape.invert())
  return { card, foil, art }
}
