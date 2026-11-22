import type { CardDef, RenderedCard, Tier } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import type { Font } from '../fonts.ts'
import { MICRO, REGULAR, drawText, fit, measure } from '../fonts.ts'
import type { RGB, Region } from '../toolkit/index.ts'
import { Mask, Painter, colors, fromHsl, hex, mix, pts } from '../toolkit/index.ts'

/**
 * Card frames of the One Piece game. Our own design that evokes the real layout: near full-bleed
 * artwork in a thin dark border, a round cost badge top left, the power top right, a counter tab on
 * the left edge, the card colour(s) in the tray at the bottom (dual colours split behind a slanted
 * seam), a paper name plate with the type line, number, card kind and tier marker below. Leaders show
 * their life in an octagonal badge and get a gilded banner plate; events show their text in a box
 * under the artwork, with [keywords] as dark tags.
 *
 * Layouts and their art areas (card coordinates):
 * - character 76×78 at (2, 2): characters and leaders of the tiers Common to Alternative
 * - event     76×50 at (2, 2): events of the tiers Common to Alternative
 * - full      80×112 at (0, 0): Ultra and Grail; badges and plates float on the artwork, inside the
 *   top 14 and the bottom 22 rows
 *
 * Printed values come from `def.print`: cost, power, life, counter and type, all optional.
 */
export const CARD = { w: 80, h: 112 } as const

type Layout = 'character' | 'event' | 'full'

const ART: Readonly<Record<Layout, Region>> = {
  character: { x: 2, y: 2, w: 76, h: 78 },
  event: { x: 2, y: 2, w: 76, h: 50 },
  full: { x: 0, y: 0, w: 80, h: 112 },
}

function layoutOf(def: CardDef): Layout {
  if (def.tier === 'ultra' || def.tier === 'grail') return 'full'
  return def.kind === 'event' ? 'event' : 'character'
}

/** Where a card's artwork sits (card coordinates). Ultra and Grail are always full art, 80×112. */
export function artArea(def: CardDef): Region {
  return ART[layoutOf(def)]
}

// ── palette ─────────────────────────────────────────────────────────────────

const INK = hex('16121c')
const WHITE = hex('fffbea')
/** Name plate paper: shadow, base, light. */
const PAPER = colors('c9bc9f', 'ebe2cc', 'f9f4e6')
const TYPE_INK = hex('5e5446')
/** Gold, darkest first. */
const GOLD = colors('7c5410', 'b98216', 'e8b428', 'f8d552', 'fff2a8')
const SILVER = colors('4e5872', '8a96b2', 'c4cee2', 'f2f6ff')
const GLASS = hex('0c0816')

interface Hue {
  /** Shadow, base, light, highlight. */
  ramp: readonly [RGB, RGB, RGB, RGB]
  /** Text on the base colour. */
  text: RGB
}

/** The card colours of the game (`element` in the catalog; dual colours as 'Rot/Grün'). */
const HUES: Readonly<Record<string, Hue>> = {
  Rot: { ramp: colors('6a1018', 'c4252b', 'e8503c', 'ff9478'), text: WHITE },
  Grün: { ramp: colors('0f4027', '1f7a43', '35a35a', '86d882'), text: WHITE },
  Blau: { ramp: colors('0f2a5c', '1d5bb5', '3a86e0', '8cc4ff'), text: WHITE },
  Lila: { ramp: colors('35124f', '6a2a9e', '9150cc', 'c79af0'), text: WHITE },
  Gelb: { ramp: colors('7a5508', 'd8a816', 'f2cc34', 'fff09a'), text: INK },
  Schwarz: { ramp: colors('101014', '2c2c36', '4a4a58', '8a8a9a'), text: WHITE },
}
const NEUTRAL: Hue = { ramp: colors('3a3a44', '6e6e7a', '9a9aa6', 'd0d0d8'), text: WHITE }

/** Marker colours of the tiers above Rare (the design tokens of the UI). */
const TIER_COLOR: Readonly<Partial<Record<Tier, RGB>>> = {
  holo: hex('4fe3e0'),
  alternative: hex('c79bff'),
  ultra: hex('ffcf5a'),
}

function huesOf(def: CardDef): readonly [Hue, Hue] {
  const [a = '', b = ''] = (def.element ?? '').split('/').map((s) => s.trim())
  const first = HUES[a] ?? NEUTRAL
  return [first, HUES[b] ?? first]
}

/** Hue of a pixel: a dual-coloured card splits behind a slanted seam through (cx, cy). */
function hueAt(hues: readonly [Hue, Hue], x: number, y: number, cx: number, cy: number): Hue {
  return x + 0.5 - cx + (y + 0.5 - cy) * 0.5 < 0 ? hues[0] : hues[1]
}

/** The printed name: without our catalog suffixes like " (Leader, Alt-Art)"; "Mr.1(Daz.Bonez)" stays. */
function printedName(def: CardDef): string {
  return def.name.replace(/\s+\([^)]*\)$/, '')
}

/** Printed value of the card (`def.print`), or undefined. */
function printed(def: CardDef, key: string): string | undefined {
  const v = def.print?.[key]
  return v === undefined || v === '' ? undefined : String(v)
}

// ── geometry ────────────────────────────────────────────────────────────────

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

/** Box with its corners cut diagonally by `c` pixels (c = 1: the four corner pixels). */
function chamfer(x: number, y: number, w: number, h: number, c = 1): Mask {
  const m = box(x, y, w, h)
  for (let j = 0; j < c; j++) {
    for (let i = 0; i < c - j; i++) {
      m.del(x + i, y + j).del(x + w - 1 - i, y + j)
      m.del(x + i, y + h - 1 - j).del(x + w - 1 - i, y + h - 1 - j)
    }
  }
  return m
}

/** Banner with pointed ends: the leader plate. */
function banner(x: number, y: number, w: number, h: number): Mask {
  const [l, r, m, b] = [x + 4, x + w - 4, y + h / 2, y + h]
  return new Mask(CARD.w, CARD.h).poly([x, m, l, y, r, y, x + w, m, r, b, l, b])
}

/** Text turned by 90° anticlockwise (reading upwards); (x, y) is the top left of the turned text. */
function drawUp(p: Painter, text: string, x: number, y: number, f: Font, c: RGB): void {
  const w = measure(text, f)
  const t = new Painter(w, f.cap)
  drawText(t, text, 0, 0, f, c)
  t.mask().each((tx, ty) => p.set(x + ty, y + w - 1 - tx, t.get(tx, ty)))
}

// ── text layout ─────────────────────────────────────────────────────────────

interface Atom {
  t: string
  /** A space separates it from the atom before. */
  gap: boolean
}

/** Pieces a name may break between: at spaces, after '-' and '.', before '(' and an inner '"'. */
function atoms(text: string): Atom[] {
  return text
    .split(' ')
    .flatMap((word, i) =>
      word.split(/(?<=[-.])(?=[^-.])|(?<=\S)(?=[("])/).map((t, j) => ({ t, gap: i > 0 && j === 0 })),
    )
}

function joined(list: readonly Atom[]): string {
  return list.map((a, i) => (i > 0 && a.gap ? ' ' : '') + a.t).join('')
}

/** The split into at most `n` lines whose widest line is narrowest; undefined if none fits. */
function balanced(text: string, f: Font, maxWidth: number, n: number): string[] | undefined {
  const list = atoms(text)
  let best: string[] | undefined
  let bestWidth = Infinity
  const search = (from: number, left: number, acc: string[]) => {
    for (let to = from + 1; to <= list.length; to++) {
      if (left === 1 && to < list.length) continue
      const line = joined(list.slice(from, to))
      const width = measure(line, f)
      if (width > maxWidth) break
      const lines = [...acc, line]
      if (to === list.length) {
        const widest = Math.max(...lines.map((l) => measure(l, f)))
        if (widest < bestWidth) [best, bestWidth] = [lines, widest]
      } else if (left > 1) search(to, left - 1, lines)
    }
  }
  search(0, n, [])
  return best
}

interface NameLines {
  font: Font
  lines: string[]
}

/** A name on one line in the first font that fits, else on up to `maxLines` lines in the micro font. */
function nameLines(name: string, maxWidth: number, maxLines: number): NameLines | undefined {
  const font = fit(name, maxWidth)
  if (measure(name, font) <= maxWidth) return { font, lines: [name] }
  for (let n = 2; n <= maxLines; n++) {
    const lines = balanced(name, MICRO, maxWidth, n)
    if (lines) return { font: MICRO, lines }
  }
  return undefined
}

/**
 * Type line: the whole line if it fits, else its last part between slashes that fits (the most
 * specific one, usually the crew: 'Supernovae/Strohhutbande' → 'Strohhutbande'), else nothing.
 */
function typeLine(def: CardDef, maxWidth: number): string | undefined {
  const type = printed(def, 'type')
  if (type === undefined || measure(type, MICRO) <= maxWidth) return type
  return type
    .split('/')
    .map((s) => s.trim())
    .filter((s) => measure(s, MICRO) <= maxWidth)
    .pop()
}

/** Rules text with [keywords] drawn as dark tags: three lines of 7 pixels, 66 pixels wide. */
function rulesText(p: Painter, text: string, x: number, y: number, hue: Hue): void {
  const maxWidth = 66
  const words = text.match(/\[[^\]]*\]|\S+/g) ?? []
  const width = (w: string) => (w.startsWith('[') ? measure(w.slice(1, -1), MICRO) + 4 : measure(w, MICRO))
  let row = 0
  let cx = x
  for (const w of words) {
    if (cx > x && cx + width(w) > x + maxWidth) {
      row += 1
      cx = x
    }
    if (row >= 3) return
    const ty = y + row * 7
    if (w.startsWith('[')) {
      const tag = chamfer(cx, ty - 1, width(w), 7, 1)
      p.fill(tag, hue.ramp[0])
      drawText(p, w.slice(1, -1), cx + 2, ty, MICRO, WHITE)
    } else drawText(p, w, cx, ty, MICRO, INK)
    cx += width(w) + MICRO.space + 1
  }
}

// ── small parts ─────────────────────────────────────────────────────────────

const STAR5 = ['..#..', '#####', '.###.', '.#.#.', '#...#']
const STAR7 = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##']
const MARKS: Readonly<Record<'common' | 'uncommon', readonly string[]>> = {
  common: ['.###.', '#####', '#####', '#####', '.###.'],
  uncommon: ['..#..', '.###.', '#####', '.###.', '..#..'],
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

/**
 * Cost badge (round) or, for leaders, life badge (octagon with a gold rim) of `size` pixels in the
 * top left corner, in the card colour(s). Returns the badge's mask including its outline.
 */
function badge(p: Painter, def: CardDef, hues: readonly [Hue, Hue], size: number): Mask {
  const [x, y] = [2, 2]
  const leader = def.kind === 'leader'
  const c = size / 2
  const body = leader ? chamfer(x, y, size, size, 3) : new Mask(CARD.w, CARD.h).disc(x + c, y + c, c)
  const outline = body.outerEdge()
  p.fill(outline, INK)
  body.each((px, py) => p.set(px, py, hueAt(hues, px, py, x + c, y + c).ramp[1]))
  const lit = body.facing([-1, 0, 0, -1])
  const dark = body.facing([1, 0, 0, 1]).minus(lit)
  if (leader) {
    p.fill(body.facing(), GOLD[2])
    p.fill(lit, GOLD[4])
    p.fill(dark, GOLD[0])
  } else {
    lit.each((px, py) => p.set(px, py, hueAt(hues, px, py, x + c, y + c).ramp[3]))
    dark.each((px, py) => p.set(px, py, hueAt(hues, px, py, x + c, y + c).ramp[0]))
  }
  const value = printed(def, leader ? 'life' : 'cost')
  if (value !== undefined) {
    const f = fit(value, size - 4)
    const top = y + Math.floor((size - f.cap) / 2)
    drawText(p, value, x + Math.floor(c), top, f, WHITE, { align: 'center', shadow: hues[0].ramp[0] })
  }
  return body.or(outline)
}

/**
 * A leader has no cost: "LIFE" next to its badge says what the number is. Ink with a white outline
 * on framed cards, gold on glass on full art. Returns the label's mask.
 */
function lifeLabel(p: Painter, size: number, full: boolean): Mask {
  const x = 2 + size + 2
  const y = 2 + Math.floor((size - MICRO.cap) / 2)
  const w = measure('LIFE', MICRO)
  const plate = chamfer(x - 2, y - 2, w + 4, MICRO.cap + 4, 1)
  if (full) {
    p.veil(plate, GLASS, 0.72)
    drawText(p, 'LIFE', x, y, MICRO, GOLD[4], { shadow: INK })
  } else drawText(p, 'LIFE', x, y, MICRO, INK, { outline: WHITE })
  return plate
}

/** Counter value on a tab along the left edge, reading upwards. Returns the tab's mask. */
function counterTab(p: Painter, value: string, hue: Hue, top: number): Mask {
  const text = value.startsWith('+') ? value : `+${value}`
  const w = measure(text, MICRO)
  const tab = chamfer(0, top, 9, w + 6, 1).and(box(2, 0, 7, CARD.h))
  p.fill(tab, INK)
  p.fill(box(8, top + 1, 1, w + 4), hue.ramp[2])
  drawUp(p, text, 3, top + 3, MICRO, WHITE)
  return tab
}

// ── frames ──────────────────────────────────────────────────────────────────

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

/** Border of the framed layouts: ink; silver for Holo; a twisted gold rope for Alternative. */
function border(p: Painter, tier: Tier, ring: Mask, foil: Mask): void {
  if (tier === 'holo') {
    p.fill(ring, SILVER[1])
    p.edge(ring, SILVER[3], [-1, 0, 0, -1])
    p.edge(ring, SILVER[0], [1, 0, 0, 1])
    foil.or(ring)
  } else if (tier === 'alternative') {
    const rope = [GOLD[4], GOLD[3], GOLD[2], GOLD[1]] as const
    ring.each((x, y) => p.set(x, y, rope[(x + y) % 4] ?? GOLD[2]))
    foil.or(ring)
  } else {
    p.fill(ring, INK)
  }
}

/** Rows of the framed layouts: colour band 80–81, plate 83–101 inside its outline, number row 103–109. */
const PLATE_TOP = 83

function drawFramed(job: Job, layout: 'character' | 'event'): FrameResult {
  const { def, card: p, art, setSize } = job
  const area = ART[layout]
  const hues = huesOf(def)
  const leader = def.kind === 'leader'
  const shape = cardShape()
  const foil = new Mask(CARD.w, CARD.h)

  // border and artwork
  p.fill(shape, INK)
  p.blit(art, area.x, area.y)
  border(p, def.tier, shape.clone().minus(box(2, 2, 76, 108)), foil)
  const visible = box(area.x, area.y, area.w, area.h)

  // tray: the card colour(s) from under the artwork to the bottom border
  const trayTop = area.y + area.h
  const tray = box(2, trayTop, 76, 110 - trayTop)
  tray.each((x, y) => {
    const h = hueAt(hues, x, y, 40, 96)
    const lit = def.tier === 'alternative' && (x - y + 200) % 4 === 0
    p.set(x, y, lit ? h.ramp[2] : h.ramp[1])
  })
  tray.facing([0, -1]).each((x, y) => p.set(x, y, hueAt(hues, x, y, 40, 96).ramp[3]))
  tray.facing([0, 1]).each((x, y) => p.set(x, y, hueAt(hues, x, y, 40, 96).ramp[0]))
  if (def.tier === 'alternative') foil.or(tray)

  // event text box
  if (layout === 'event') {
    const panel = chamfer(4, trayTop + 3, 72, 23, 1)
    p.fill(panel.outerEdge(), INK)
    p.fill(panel, PAPER[2])
    p.edge(panel, PAPER[0], [1, 0, 0, 1])
    rulesText(p, def.text ?? '', 7, trayTop + 5, hues[0])
  }

  // name plate: paper; leaders get a gilded banner with pointed ends
  const top = PLATE_TOP
  const plate = leader ? banner(3, top, 74, 19) : chamfer(4, top, 72, 19, 1)
  p.fill(plate.outerEdge(), leader ? GOLD[1] : INK)
  p.fill(plate, PAPER[1])
  p.edge(plate, PAPER[2], [0, -1])
  p.edge(plate, PAPER[0], [0, 1])
  if (leader) {
    p.edge(plate, GOLD[3], [-1, 0, 0, -1])
    p.edge(plate, GOLD[0], [1, 0, 0, 1])
    if (def.tier === 'holo' || def.tier === 'alternative') foil.or(plate.facing()).or(plate.outerEdge())
  }
  const width = leader ? 62 : 70
  // the type line gives way when the name needs three lines
  const title = printedName(def)
  let type = typeLine(def, width)
  let name = nameLines(title, width, type === undefined ? 3 : 2)
  if (!name && type !== undefined) {
    type = undefined
    name = nameLines(title, width, 3)
  }
  const lines = name?.lines ?? [title]
  const font = name?.font ?? MICRO
  if (lines.length === 1) {
    const y = type === undefined ? top + Math.floor((19 - font.cap) / 2) : top + 2 + REGULAR.cap - font.cap
    drawText(p, title, 40, y, font, INK, { align: 'center' })
  } else {
    const y = type === undefined ? top + Math.floor((20 - lines.length * 6) / 2) : top + 1
    lines.forEach((line, i) => drawText(p, line, 40, y + i * 6, MICRO, INK, { align: 'center' }))
  }
  if (type !== undefined)
    drawText(p, type, 40, lines.length === 1 ? top + 12 : top + 13, MICRO, TYPE_INK, { align: 'center' })

  // number row on the tray: number, card kind, tier marker
  const ink = hues[1].text
  drawText(p, cardNumber(def, setSize), 5, 104, MICRO, ink)
  const kind = leader ? 'LEADER' : def.kind === 'event' ? 'EVENT' : undefined
  if (kind !== undefined) drawText(p, kind, 66, 104, MICRO, ink, { align: 'right' })
  tierMark(p, 69, 103, def.tier, ink)
  if (def.tier === 'holo' || def.tier === 'alternative') foil.or(box(68, 102, 9, 9))

  // cost or life, power, counter
  visible.minus(badge(p, def, hues, 13))
  if (leader) visible.minus(lifeLabel(p, 13, false))
  const power = printed(def, 'power')
  if (power !== undefined && def.kind !== 'event') {
    const w = drawText(p, power, 75, 4, REGULAR, INK, { align: 'right', outline: WHITE })
    visible.minus(box(75 - w, 3, w + 2, 9))
  }
  const counter = printed(def, 'counter')
  if (counter !== undefined && def.kind === 'character') visible.minus(counterTab(p, counter, hues[0], 18))

  return { foil, visible }
}

// ── full art: Ultra and Grail ───────────────────────────────────────────────

function drawFull(job: Job): FrameResult {
  const { def, card: p, art, setSize } = job
  const grail = def.tier === 'grail'
  const hues = huesOf(def)
  const leader = def.kind === 'leader'
  const shape = cardShape()
  p.blit(art)

  // border: three pixels of gold, for the Grail running through the rainbow, and an ink line inside
  const ring = shape.clone().minus(cardShape(3))
  const depth = [cardShape(1), cardShape(2)] as const
  ring.each((x, y) => {
    const d = depth[0].has(x, y) ? (depth[1].has(x, y) ? 2 : 1) : 0
    const turn = Math.atan2(y - CARD.h / 2, (x - CARD.w / 2) * 1.4) / (Math.PI * 2) + 0.5
    const hue = Math.floor(turn * 2 * 18) * 20
    const base = grail ? mix(fromHsl(hue, 0.9, 0.62), GOLD[3], 0.35) : GOLD[2]
    const light = grail ? mix(base, WHITE, 0.55) : GOLD[4]
    const dark = grail ? mix(base, GOLD[0], 0.5) : GOLD[1]
    p.set(x, y, d === 0 ? dark : d === 1 ? light : base)
  })
  p.fill(cardShape(3).minus(cardShape(4)), INK)
  const visible = cardShape(4)
  const foil = ring.clone()

  // top: cost or life badge, power on glass
  const mark = badge(p, def, hues, 11)
  visible.minus(mark)
  foil.or(mark.facing())
  if (leader) visible.minus(lifeLabel(p, 11, true))
  const power = printed(def, 'power')
  if (power !== undefined) {
    const w = measure(power, REGULAR)
    const plate = chamfer(73 - w - 3, 4, w + 6, 9, 1)
    p.veil(plate, GLASS, 0.72)
    const line = box(73 - w - 2, 12, w + 4, 1)
    p.fill(line, GOLD[3])
    drawText(p, power, 73, 5, REGULAR, GOLD[4], { align: 'right', shadow: INK })
    visible.minus(plate)
    foil.or(line)
  }

  // bottom plate: the name, below it number, card kind (or type line, if it fits) and tier marker
  const plate = leader ? banner(3, 90, 74, 18) : chamfer(4, 90, 72, 18, 1)
  p.veil(plate, GLASS, 0.76)
  const line = plate.clone().and(box(0, 90, CARD.w, 1))
  p.fill(line, GOLD[3])
  if (leader) p.fill(plate.facing().minus(line), GOLD[1])
  visible.minus(plate)
  foil.or(line)
  const title = printedName(def)
  const name = nameLines(title, leader ? 62 : 68, 2) ?? { font: MICRO, lines: [title] }
  if (name.lines.length === 1) {
    drawText(p, title, 40, 92 + REGULAR.cap - name.font.cap, name.font, WHITE, {
      align: 'center',
      shadow: INK,
    })
  } else {
    name.lines.forEach((l, i) =>
      drawText(p, l, 40, 92 + i * 6, MICRO, WHITE, { align: 'center', shadow: INK }),
    )
  }
  const number = cardNumber(def, setSize)
  drawText(p, number, 7, 102, MICRO, GOLD[3])
  const middle = leader ? 'LEADER' : typeLine(def, 64 - 7 - measure(number, MICRO) - 6)
  if (middle !== undefined) drawText(p, middle, 63, 102, MICRO, mix(GOLD[4], WHITE, 0.4), { align: 'right' })
  tierMark(p, 66, 101, def.tier, GOLD[3])
  foil.or(box(65, 100, 9, 9))
  return { foil, visible }
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Paint the artwork of a card definition and set it into the frame of its layout and tier. */
export function renderCard(def: CardDef, setSize: number): RenderedCard {
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
