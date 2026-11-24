import { blauaeugigerDrache } from '../cards/yugioh-lob/blauaeugiger-drache.ts'
import { dunklerMagier } from '../cards/yugioh-lob/dunkler-magier.ts'
import { rotaeugigerDrache } from '../cards/yugioh-lob/rotaeugiger-drache.ts'
import type { CardDef } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, REGULAR, drawText } from '../fonts.ts'
import { artArea } from '../frames/yugioh.ts'
import type { Mask, Painter, Pt, Ramp } from '../toolkit/index.ts'
import { colors, hex, rays } from '../toolkit/index.ts'
import { crimp, pick, thick } from './booster-pokemon-base.ts'
import type { ProductDef } from './index.ts'

/**
 * Booster pack of Legend of Blue Eyes, 84×132: a foil wrapper in the colours of its hero with crimped
 * seals, our own "Yu-Gi-Oh!" wordmark (bold, slanted letters running from pale gold to fire orange
 * with a dark red rim, in the spirit of the game but drawn from scratch, not the official logo), the
 * "Legend of Blue Eyes" ribbon, a "9 Karten" seal in the colours of a level star and the hero of an
 * Ultra or Grail card bursting out of the lower two thirds in front of a summoning circle. The hero
 * is cut out of its card artwork, so wrapper and card always match.
 *
 * Every Yu-Gi-Oh! set shares this painter: `boosterPack` builds one wrapper from a `BoosterLook`; the
 * later sets call it from their folder (e.g. art/cards/yugioh-mrd/booster.ts) with their own set name.
 */
const W = 84
const H = 132
/** Height of one foil band of the wrapper. */
const BAND = 15

/** Wordmark and seal gold, from the dark red rim to the pale top of the letters. */
const GOLD = colors('6a1606', 'd8561a', 'f59a1c', 'ffd23c', 'fff2a8')
const INK = hex('1c0504')
/** Ribbon: shadow, cloth, light. */
const NAVY = colors('070b24', '15235e', '2a4496')
/** Seal disc: shadow, disc, light. */
const RED = colors('4a060c', 'a8141c', 'd83a26')
const WHITE = hex('ffffff')

export interface BoosterLook {
  id: string
  hero: CardDef
  /** The set name on the ribbon: a small line over a big one, e.g. ['Legend of', 'Blue Eyes']. */
  title: readonly [string, string]
  /** Effects of the card artwork that belong to the hero, e.g. its lightning; painted behind the hero. */
  effects?: (art: Painter) => Mask
  /** Where the artwork's top left corner lands on the pack. */
  at: Pt
  /** Wrapper foil in the hero's colours, from shadow to the heart of the burst. */
  foil: Ramp
  /** Centre of the burst and of the summoning circle behind the hero. */
  burst: Pt
}

/** Bold glyphs of the wordmark "Yu-Gi-Oh!", 13 rows each; lower-case letters start on row 4. */
const LOW = ['', '', '', '']
const DASH = [...LOW, '', '', '', '####', '####', '####']
const GLYPHS: readonly (readonly string[])[] = [
  ['###...###', '###...###', '###...###', '.###.###.', '..#####..', ...Array<string>(8).fill('...###...')],
  [...LOW, ...Array<string>(7).fill('###..###'), '########', '.#######'],
  DASH,
  [
    '..######..',
    '.########.',
    '###....###',
    '###.......',
    '###.......',
    '###..#####',
    '###..#####',
    ...Array<string>(4).fill('###....###'),
    '.########.',
    '..######..',
  ],
  ['', '###', '###', '', ...Array<string>(9).fill('###')],
  DASH,
  ['..######..', '.########.', ...Array<string>(9).fill('###....###'), '.########.', '..######..'],
  [...Array<string>(4).fill('###'), '#######.', '########', ...Array<string>(7).fill('###..###')],
  [...Array<string>(9).fill('###'), '', '###', '###', '###'],
]

const glyphWidth = (glyph: readonly string[]): number => Math.max(...glyph.map((row) => row.length))

/** The wordmark as a mask, slanted to the right and centred on the pack, its top at y. */
function wordmark(p: Painter, y: number): Mask {
  const width = GLYPHS.reduce((w, g) => w + glyphWidth(g) + 1, -1) + 2
  const m = p.m()
  let cx = Math.floor((W - width) / 2)
  for (const glyph of GLYPHS) {
    glyph.forEach((row, j) => {
      const slant = j < 4 ? 2 : j < 9 ? 1 : 0
      for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(cx + i + slant, y + j)
    })
    cx += glyphWidth(glyph) + 1
  }
  return m
}

/** Summoning circle: two rings and a six-pointed star, as thin lines. */
function summoningCircle(p: Painter, [cx, cy]: Pt, r: number): Mask {
  const m = p.m().disc(cx, cy, r).minus(p.m().disc(cx, cy, r - 1))
  m.or(p.m().disc(cx, cy, r - 3).minus(p.m().disc(cx, cy, r - 4)))
  for (const turn of [-0.25, 0.25]) {
    const corners = [0, 1, 2].map((i) => {
      const a = (turn + i / 3) * Math.PI * 2
      return [cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)] as const
    })
    corners.forEach(([x0, y0], i) => {
      const [x1, y1] = corners[(i + 1) % 3] ?? corners[0] ?? [cx, cy]
      m.line(x0, y0, x1, y1)
    })
  }
  return m
}

export function boosterPack(look: BoosterLook): ProductDef {
  return {
    id: look.id,
    w: W,
    h: H,
    draw(p) {
      // wrapper: foil bands with a highlight line each, darker towards the sides, and a burst of rays
      // behind the hero, with a summoning circle pressed into the foil
      const [bx, by] = look.burst
      const wedges = rays(p, bx, by, 8, 0.04)
      p.dither(
        null,
        look.foil,
        (x, y) => {
          const band = Math.sin((y * Math.PI * 2) / BAND) * 0.08
          const side = Math.pow(Math.abs(x - 41.5) / 42, 6) * 0.14
          const glow = Math.pow(Math.max(0, 1 - Math.hypot(x - bx, (y - by) * 0.9) / 66), 1.15)
          return 0.16 + band - side + glow * (wedges.has(x, y) ? 0.74 : 0.38)
        },
        0.55,
      )
      p.register(look.foil)
      const gloss = p.m()
      for (let y = 4; y < H; y += BAND) gloss.rect(0, y, W, 1)
      p.tone(gloss, 1)
      p.tone(summoningCircle(p, look.burst, 33), 1)
      p.tone(p.m().rect(0, 0, 1, H).rect(W - 2, 0, 2, H).rect(0, 10, W, 2).rect(0, H - 12, W, 2), -1)

      // the hero is cut out of its card artwork; its effects go first, behind the hero
      const area = artArea(look.hero)
      const art = paintArtwork(look.hero, area.w, area.h)
      const [dx, dy] = look.at
      look.effects?.(art).minus(art.subjectMask).each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // ground, then the hero
      const ground = p.m().poly([0, 119.5, 22, 118, 50, 119.5, W, 118, W, H, 0, H])
      p.fill(ground, look.foil[0] ?? INK)
      p.edge(ground, look.foil[2] ?? NAVY[1], [0, -1])
      art.subjectMask.each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // set ribbon with swallow tails in front of the hero (horns and hat tips tuck behind it): the
      // set name, e.g. "Legend of" small over "Blue Eyes"
      const ribbon = p.m().poly([7, 29, 77, 29, 72.5, 38.5, 77, 48, 7, 48, 11.5, 38.5])
      p.fill(ribbon.moved(1, 1), look.foil[0] ?? INK)
      p.fill(ribbon, NAVY[1])
      p.fill(ribbon.facing([0, -1]), GOLD[3])
      p.fill(ribbon.facing([0, 1]), GOLD[1])
      const [small, big] = look.title
      drawText(p, small, 42, 31, MICRO, GOLD[3], { align: 'center' })
      drawText(p, big, 42, 38, REGULAR, WHITE, { align: 'center', shadow: NAVY[0] })

      // wordmark: gold letters that turn to fire orange towards the baseline, dark red rim, black
      // outline and a shadow that gives them depth
      const letters = wordmark(p, 13)
      const rim = thick(letters)
      p.fill(thick(rim).or(rim.moved(1, 2)), INK)
      p.fill(rim, GOLD[0])
      letters.each((x, y) => p.set(x, y, GOLD[y < 17 ? 4 : y < 20 ? 3 : y < 23 ? 2 : 1]))
      p.fill(letters.facing([-1, 0, 0, -1]).and(p.m().rect(0, 17, W, 6)), GOLD[4])

      // seal: a red disc in a gold ring, like a level star, with the number of cards inside
      const [sx, sy] = [67.5, 101]
      const seal = p.m().disc(sx, sy, 13.5)
      const disc = p.m().disc(sx, sy, 11.5)
      p.fill(seal.grown(1), INK)
      p.fill(seal, GOLD[3])
      p.fill(seal.facing([1, 0, 0, 1]), GOLD[1])
      p.fill(seal.facing([-1, 0, 0, -1]), GOLD[4])
      p.fill(disc, RED[1])
      p.fill(disc.facing([-1, 0, 0, -1]), RED[0])
      p.fill(disc.facing([1, 0, 0, 1]), RED[2])
      drawText(p, '9', 67, 92, REGULAR, GOLD[4], { shadow: RED[0] })
      drawText(p, '9', 68, 92, REGULAR, GOLD[4])
      drawText(p, 'Karten', 68, 102, MICRO, GOLD[4], { align: 'center', shadow: RED[0] })

      // glints on the foil
      for (const [x, y] of [[76, 52], [2, 50], [77, 79]] as const)
        p.stamp(['..o..', '..w..', 'owwwo', '..w..', '..o..'], x, y, { w: WHITE, o: GOLD[3] })

      crimp(p, true)
      crimp(p, false)
    },
  }
}

const LOB = ['Legend of', 'Blue Eyes'] as const
const LIGHTNING = colors('8cc4ff', 'd4ecff', 'ffffff')
const EMBERS = colors('ec6a1c', 'ff9a2a', 'ffd462', 'fff4c0')

/** Blue-Eyes wrapper: storm-blue foil; the white dragon keeps its lightning from the Grail artwork. */
const boosterBlueEyes = boosterPack({
  id: 'booster-ygo-lob-blue-eyes',
  hero: blauaeugigerDrache,
  title: LOB,
  effects: (art) => pick(art, LIGHTNING, [{ x: 0, y: 0, w: 80, h: 112 }]),
  at: [2, 35],
  foil: colors('02040f', '050b26', '0a1748', '12286e', '1c3e96', '2e60c0', '5e94e8', 'c8e4ff'),
  burst: [49, 66],
})

/** Dark Magician wrapper: indigo foil with a magenta burst, so the violet robe stands out from it. */
const boosterDarkMagician = boosterPack({
  id: 'booster-ygo-lob-dark-magician',
  hero: dunklerMagier,
  title: LOB,
  at: [0, 35],
  foil: colors('04020c', '0a0420', '140a34', '200e48', '34125a', '5a1a6e', 'a03c8c', 'f4a6d8'),
  burst: [40, 70],
})

/** Red-Eyes wrapper: black-red foil; the dragon keeps the embers drifting round it on its card. */
const boosterRedEyes = boosterPack({
  id: 'booster-ygo-lob-red-eyes',
  hero: rotaeugigerDrache,
  title: LOB,
  effects: (art) => pick(art, EMBERS, [{ x: 0, y: 0, w: 80, h: 70 }]),
  at: [4, 33],
  foil: colors('080102', '180306', '2c060a', '480a0e', '6e1010', '9c1e12', 'd2461c', 'ffb060'),
  burst: [44, 78],
})

/** Booster wrappers of this set (ids as in content/catalog.ts `wrappers`). */
export const YGO_LOB_BOOSTERS: readonly ProductDef[] = [boosterBlueEyes, boosterDarkMagician, boosterRedEyes]
