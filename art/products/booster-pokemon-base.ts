import { bisaflor } from '../cards/pokemon-base/bisaflor.ts'
import { glurak } from '../cards/pokemon-base/glurak.ts'
import { turtok } from '../cards/pokemon-base/turtok.ts'
import type { CardDef } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, REGULAR, drawText } from '../fonts.ts'
import { ART, layoutOf } from '../frames/pokemon.ts'
import type { Mask, Painter, Pt, Ramp, Region } from '../toolkit/index.ts'
import { colors, hex, rays } from '../toolkit/index.ts'
import type { ProductDef } from './index.ts'

/**
 * Booster pack of the Pokémon Basis-Set, 84×132: a foil wrapper with crimped seals, our own
 * "Pokémon" wordmark (yellow letters, blue outline, in the spirit of the logo but drawn from
 * scratch), the set ribbon, an "11 Karten" seal and a hero creature bursting out of the lower two
 * thirds. `boosterPack` builds one wrapper per hero; the three artworks differ only in their look.
 */
const W = 84
const H = 132
const CRIMP = 10
/** Height of one foil band of the wrapper. */
const BAND = 15

const YELLOW = colors('e8941c', 'ffd22e', 'fff27a')
const BLUE = colors('13216e', '2c5fd4', '86acff')
const SILVER = colors('4a4f66', '8a90a8', 'c4c9da', 'f6f8ff')
const WHITE = hex('ffffff')
const P = (x: number, y: number): Pt => [x, y]

export interface BoosterLook {
  id: string
  /** Paints the hero creature onto a transparent layer of the pack's size. */
  hero(layer: Painter): void
  /** Wrapper colours, from the foil in shadow to the heart of the burst behind the hero. */
  foil: Ramp
  /** Centre of the burst. */
  burst: Pt
}

/** Pixels of the given colours inside the regions: picks effects such as fire out of an artwork. */
export function pick(art: Painter, palette: Ramp, regions: readonly Region[]): Mask {
  const m = art.m()
  for (const r of regions)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) if (palette.includes(art.get(x, y))) m.add(x, y)
  return m.cleaned()
}

/**
 * A hero cut out of its card artwork and moved by (dx, dy): the subject of the card plus whatever
 * `effects` selects from the scene around it.
 */
export function heroFromCard(
  def: CardDef,
  dx: number,
  dy: number,
  effects?: (art: Painter) => Mask,
): (layer: Painter) => void {
  return (layer) => {
    const size = ART[layoutOf(def)]
    const art = paintArtwork(def, size.w, size.h)
    const cut = art.subjectMask.clone()
    if (effects) cut.or(effects(art))
    cut.each((x, y) => layer.set(x + dx, y + dy, art.get(x, y)))
  }
}

/** Bold lettering of the wordmark, 13 rows per glyph; lower-case letters start on row 4. */
const LOW = ['', '', '', '']
const O = [...LOW, '..####..', '.######.', ...Array<string>(5).fill('###..###'), '.######.', '..####..']
const WORDMARK: readonly (readonly string[])[] = [
  [
    '########',
    '#########',
    '###...####',
    ...Array<string>(2).fill('###....###'),
    '###...####',
    '#########',
    '########',
    ...Array<string>(5).fill('###'),
  ],
  O,
  [
    ...Array<string>(4).fill('###'),
    '###...###',
    '###..###',
    '###.###',
    '######',
    '#####',
    '######',
    '###.###',
    '###..###',
    '###...###',
  ],
  [
    '',
    '.....###',
    '....###',
    '',
    '..####..',
    '.######.',
    '###..###',
    '###..###',
    '########',
    '###',
    '###..###',
    '.######.',
    '..####..',
  ],
  [...LOW, '############', '#############', ...Array<string>(7).fill('###..###..###')],
  O,
  [...LOW, '#######', '########', ...Array<string>(7).fill('###..###')],
]

/** The wordmark as a mask, slanted to the right, with its left edge at x and its top at y. */
function wordmark(p: Painter, x: number, y: number): Mask {
  const m = p.m()
  let cx = x
  for (const glyph of WORDMARK) {
    glyph.forEach((row, j) => {
      const slant = j < 4 ? 2 : j < 9 ? 1 : 0
      for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(cx + i + slant, y + j)
    })
    cx += Math.max(...glyph.map((row) => row.length)) + 1
  }
  return m
}

/** Copy of a mask grown by one pixel in all eight directions (shared by every booster wrapper). */
export const thick = (m: Mask): Mask => m.grown(1).or(m.moved(1, 1).grown(1)).or(m.moved(-1, -1).grown(1))

/** A crimped seal: fine vertical ridges in silver foil and a zig-zag cut on the outer edge (any 84×132 wrapper). */
export function crimp(p: Painter, top: boolean, silver: Ramp = SILVER): void {
  const y0 = top ? 0 : H - CRIMP
  for (let j = 0; j < CRIMP; j++) {
    const fromEdge = top ? j : CRIMP - 1 - j
    for (let x = 0; x < W; x++) {
      const ridge = x % 3 === 0 ? 1 : 2
      const tone =
        fromEdge === CRIMP - 1 ? 0 : fromEdge === 4 ? ridge - 1 : fromEdge === 1 ? ridge + 1 : ridge
      p.set(x, y0 + j, silver[tone] ?? silver[1] ?? SILVER[1])
    }
  }
  const teeth = p.m()
  for (let x = 0; x < W; x++)
    for (let k = 0; k < ([0, 1, 2, 1][x % 4] ?? 0); k++) teeth.add(x, top ? k : H - 1 - k)
  p.erase(teeth)
}

export function boosterPack(look: BoosterLook): ProductDef {
  return {
    id: look.id,
    w: W,
    h: H,
    draw(p) {
      // wrapper: horizontal foil bands with a highlight line each, darker towards the sides, and a
      // burst of rays behind the hero
      const [bx, by] = look.burst
      const wedges = rays(p, bx, by, 10, 0.02)
      p.dither(
        null,
        look.foil,
        (x, y) => {
          const band = Math.sin((y * Math.PI * 2) / BAND) * 0.08
          const side = Math.pow(Math.abs(x - 41.5) / 42, 6) * 0.14
          const glow = Math.pow(Math.max(0, 1 - Math.hypot(x - bx, (y - by) * 0.9) / 70), 1.15)
          return 0.2 + band - side + glow * (wedges.has(x, y) ? 0.72 : 0.36)
        },
        0.55,
      )
      p.register(look.foil)
      const gloss = p.m()
      for (let y = 4; y < H; y += BAND) gloss.rect(0, y, W, 1)
      p.tone(gloss, 1)
      p.tone(
        p
          .m()
          .rect(0, 0, 1, H)
          .rect(W - 2, 0, 2, H)
          .rect(0, CRIMP, W, 2)
          .rect(0, H - CRIMP - 2, W, 2),
        -1,
      )

      // set ribbon with swallow tails
      const ribbon = p.m().poly([12, 31, 72, 31, 69, 36.5, 72, 42, 12, 42, 15, 36.5])
      p.fill(ribbon.moved(1, 1), look.foil[0] ?? BLUE[0])
      p.fill(ribbon, BLUE[1])
      p.fill(ribbon.facing([0, -1]), BLUE[2])
      p.fill(ribbon.facing([0, 1]), BLUE[0])
      drawText(p, 'Basis-Set', 42, 33, REGULAR, WHITE, { align: 'center', shadow: BLUE[0] })

      // ground for the hero to stand on, then the hero
      const ground = p.m().poly([0, 119.5, 22, 118, 50, 119.5, W, 118, W, H, 0, H])
      p.fill(ground, look.foil[0] ?? BLUE[0])
      p.edge(ground, look.foil[2] ?? BLUE[1], [0, -1])
      const hero = p.layer()
      look.hero(hero)
      p.blit(hero)

      // wordmark: yellow letters that darken towards the baseline, blue outline, navy shadow
      const letters = wordmark(p, 6, 14)
      const outline = thick(letters)
      p.fill(thick(outline).or(outline.moved(1, 2)), BLUE[0])
      p.fill(outline, BLUE[1])
      letters.each((x, y) => p.set(x, y, YELLOW[y < 18 ? 2 : y < 24 ? 1 : 0]))
      p.fill(letters.facing([-1, 0, 0, -1]).and(p.m().rect(0, 18, W, 6)), YELLOW[2])

      // seal: how many cards are inside
      const [sx, sy] = [67.5, 101]
      const star: Pt[] = []
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2
        const r = i % 2 === 0 ? 15.4 : 13.6
        star.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r])
      }
      const seal = p.m().poly(star)
      p.fill(seal.grown(1), BLUE[0])
      p.fill(seal, YELLOW[1])
      p.fill(seal.facing([-1, 0, 0, -1]), YELLOW[2])
      p.fill(seal.facing([1, 0, 0, 1]), YELLOW[0])
      drawText(p, '11', 67, 92, REGULAR, BLUE[0], { align: 'center' })
      drawText(p, '11', 68, 92, REGULAR, BLUE[0], { align: 'center' })
      drawText(p, 'Karten', 68, 103, MICRO, BLUE[0], { align: 'center' })

      // glints on the foil
      for (const [x, y] of [P(74, 11), P(2, 45), P(77, 81)])
        p.stamp(['..o..', '..w..', 'owwwo', '..w..', '..o..'], x, y, { w: WHITE, o: YELLOW[2] })

      crimp(p, true)
      crimp(p, false)
    },
  }
}

const FIRE = colors('c22a12', 'f0641a', 'fca82c', 'ffe45e', 'fffbd0')

/** Glurak wrapper: night-red foil, and the dragon keeps its torrent and tail flame from the card. */
export const boosterGlurak = boosterPack({
  id: 'booster-pkm-base-glurak',
  hero: heroFromCard(glurak, 4, 31, (art) =>
    pick(art, FIRE, [
      { x: 44, y: 12, w: 36, h: 34 },
      { x: 0, y: 44, w: 21, h: 28 },
    ]),
  ),
  foil: colors('13102e', '271447', '541a44', '86222e', 'b83222', 'f0641a', 'fca82c', 'ffe45e'),
  burst: [36, 92],
})

const WATER = colors('1a4a94', '2c86cc', '62c2ea', 'b8ecfa', 'ffffff')
/** Where Turtok's jets run in the card artwork; above it they would cross the set ribbon. */
const JETS = [{ x: 0, y: 12, w: 56, h: 26 }]

/** Turtok wrapper: storm-blue foil; the tortoise keeps its jets, which vanish behind the ribbon. */
export const boosterTurtok = boosterPack({
  id: 'booster-pkm-base-turtok',
  hero: heroFromCard(turtok, 4, 31, (art) => {
    // the jets with their dark rim, but not the mist dotted round them
    const core = pick(art, WATER.slice(1), JETS)
    return core
      .grown(1)
      .and(pick(art, WATER, JETS))
      .or(core)
  }),
  foil: colors('0a0f2a', '12204e', '183a86', '2156b8', '2c86cc', '62c2ea', 'b8ecfa', 'f4fdff'),
  burst: [44, 92],
})

/** Bisaflor wrapper: rainforest-green foil with the sun breaking through behind the flower. */
export const boosterBisaflor = boosterPack({
  id: 'booster-pkm-base-bisaflor',
  hero: heroFromCard(bisaflor, 4, 31),
  foil: colors('07150f', '0e2a18', '17442a', '256234', '3c8640', '6aac4c', 'b4d872', 'f6f8c8'),
  burst: [44, 84],
})
