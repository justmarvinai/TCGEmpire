import { SETS } from '../../content/catalog.ts'
import { BOOSTER as GRUNDAUFLAGE } from '../cards/empiremon-1/booster.ts'
import { BOOSTER as SPAETSCHICHT } from '../cards/empiremon-2/booster.ts'
import { BOOSTER as AMT } from '../cards/empiremon-3/booster.ts'
import { BOOSTER as PFANDLAND } from '../cards/empiremon-4/booster.ts'
import { BOOSTER as ABSTELLGLEIS } from '../cards/empiremon-5/booster.ts'
import type { CardDef } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { CONDENSED, MICRO, REGULAR, drawText, fit } from '../fonts.ts'
import { artArea } from '../frames/empiremon.ts'
import type { Mask, Painter, Pt, Ramp } from '../toolkit/index.ts'
import { colors, hex, rays } from '../toolkit/index.ts'
import { crimp, thick } from './booster-pokemon-base.ts'
import type { ProductDef } from './index.ts'

/**
 * Booster pack of Empiremon, 84×132, one painter for all five sets: a crimped foil wrapper in the set
 * colour, our own heavy gold "EMPIREMON" wordmark with a little crown over the first M, the plate with
 * the set name, a gold "5 Karten" seal, and the set's first Grail bursting out of the lower two thirds.
 * The Grail is cut out of its card artwork, so wrapper and card always match. The per-set look lives
 * next to the hero, in art/cards/empiremon-N/booster.ts.
 */
export interface EmpiremonBooster {
  /** Product id as in content/catalog.ts, e.g. 'booster-emp1'. */
  id: string
  /** Set id, e.g. 'empiremon-1'; the plate shows its name from the content catalog. */
  set: string
  /** The set's first Grail. */
  hero: CardDef
  /** Where the top left corner of the hero's card artwork lands on the pack. */
  at: Pt
  /** Wrapper foil in the set colour, from shadow to the heart of the burst (8 steps). */
  foil: Ramp
  /** Centre of the burst behind the hero. */
  burst: Pt
}

const W = 84
const H = 132
/** Height of one foil band of the wrapper. */
const BAND = 15

const GOLD = colors('4a2a08', '8c5a14', 'c88e28', 'eeba44', 'ffe286', 'fff8d8')
const NIGHT = colors('0a0612', '1c1228', '2e2040')
const WHITE = hex('ffffff')

/** Heavy capitals of the wordmark, 11 rows, two-pixel strokes. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  E: ['######', '######', '##....', '##....', '#####.', '#####.', '##....', '##....', '##....', '######', '######'],
  M: [
    '##.....##',
    '###...###',
    '####.####',
    '##.###.##',
    '##..#..##',
    ...Array<string>(6).fill('##.....##'),
  ],
  P: ['######.', '#######', '##...##', '##...##', '##...##', '#######', '######.', '##.....', '##.....', '##.....', '##.....'],
  I: Array<string>(11).fill('##'),
  R: ['######.', '#######', '##...##', '##...##', '##...##', '#######', '######.', '##..##.', '##..##.', '##...##', '##...##'],
  O: ['.#####.', '#######', ...Array<string>(7).fill('##...##'), '#######', '.#####.'],
  N: ['##...##', '###..##', '###..##', '####.##', '##.####', '##.####', '##..###', '##..###', '##...##', '##...##', '##...##'],
}
const CROWN = ['#...#...#', '#...#...#', '##.###.##', '#########', '#########']

/** "EMPIREMON" as a mask, centred on the pack with the top of its letters at y; the crown sits over the first M. */
function wordmark(p: Painter, y: number): Mask {
  const glyphs = [...'EMPIREMON'].map((ch) => GLYPHS[ch] ?? [])
  const width = glyphs.reduce((w, g) => w + (g[0]?.length ?? 0) + 1, -1)
  const m = p.m()
  const put = (grid: readonly string[], x: number, top: number) =>
    grid.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(x + i, top + j)
    })
  let x = Math.floor((W - width) / 2)
  glyphs.forEach((glyph, i) => {
    put(glyph, x, y)
    if (i === 1) put(CROWN, x, y - CROWN.length - 1)
    x += (glyph[0]?.length ?? 0) + 1
  })
  return m
}

function boosterPack(look: EmpiremonBooster): ProductDef {
  const name = SETS.find((s) => s.id === look.set)?.name
  if (name === undefined) throw new Error(`booster-empiremon: unknown set ${look.set}`)
  return {
    id: look.id,
    w: W,
    h: H,
    draw(p) {
      // wrapper: foil bands with a highlight line each, darker towards the sides, a burst behind the hero
      const [bx, by] = look.burst
      const wedges = rays(p, bx, by, 9, 0.03)
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
      p.tone(p.m().rect(0, 0, 1, H).rect(W - 2, 0, 2, H), -1)

      // plate with the set name, pointed ends, in a gold rim
      const plate = p.m().poly([12, 34, 72, 34, 77, 39.5, 72, 45, 12, 45, 7, 39.5])
      p.fill(plate.moved(1, 1), look.foil[0] ?? NIGHT[0])
      p.fill(plate.grown(1), GOLD[2])
      p.fill(plate, NIGHT[1])
      p.fill(plate.facing([0, -1]), NIGHT[2])
      const f = fit(name, 62, [REGULAR, CONDENSED, MICRO])
      drawText(p, name, 42, 36 + Math.floor((7 - f.cap) / 2), f, GOLD[4], { align: 'center', shadow: NIGHT[0] })

      // ground, then the hero, cut out of its card artwork, bursting over the plate
      const ground = p.m().poly([0, 118.5, 26, 117, 54, 118.5, W, 117, W, H, 0, H])
      p.fill(ground, look.foil[0] ?? NIGHT[0])
      p.edge(ground, look.foil[2] ?? NIGHT[1], [0, -1])
      const area = artArea(look.hero)
      const art = paintArtwork(look.hero, area.w, area.h)
      const [dx, dy] = look.at
      art.subjectMask.each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // wordmark: gold capitals that darken towards the baseline, a bronze rim, a dark outline and shadow
      const top = 18
      const letters = wordmark(p, top)
      const rim = thick(letters)
      p.fill(thick(rim).or(rim.moved(1, 2)), NIGHT[0])
      p.fill(rim, GOLD[0])
      // the crown (above the letters) goes from pale tips to a gold band
      letters.each((x, y) =>
        p.set(x, y, GOLD[y < top - 4 ? 5 : y < top ? 3 : y < top + 2 ? 5 : y < top + 5 ? 4 : y < top + 8 ? 3 : 2]),
      )
      p.fill(letters.facing([1, 0, 0, 1]).and(p.m().rect(0, top + 6, W, 6)), GOLD[1])

      // seal: a gold disc with the number of cards
      const seal = p.m().disc(67.5, 103.5, 14)
      p.fill(seal.grown(1), NIGHT[0])
      p.fill(seal, GOLD[2])
      p.fill(seal.facing([-1, 0, 0, -1]), GOLD[4])
      p.fill(seal.facing([1, 0, 0, 1]), GOLD[1])
      drawText(p, '5', 67, 92, REGULAR, NIGHT[0], { align: 'center' })
      drawText(p, '5', 68, 92, REGULAR, NIGHT[0], { align: 'center' })
      drawText(p, 'Karten', 68, 101, MICRO, NIGHT[0], { align: 'center' })

      // glints on the foil
      for (const [x, y] of [[3, 50], [76, 66], [10, 96]] as const)
        p.stamp(['..o..', '..w..', 'owwwo', '..w..', '..o..'], x, y, { w: WHITE, o: GOLD[4] })

      crimp(p, true, GOLD.slice(1, 5))
      crimp(p, false, GOLD.slice(1, 5))
    },
  }
}

/** Booster wrappers of the five sets (ids as in content/catalog.ts `wrappers`). */
export const EMPIREMON_BOOSTERS: readonly ProductDef[] = [GRUNDAUFLAGE, SPAETSCHICHT, AMT, PFANDLAND, ABSTELLGLEIS].map(
  boosterPack,
)
