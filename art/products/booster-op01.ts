import { luffyLeader } from '../cards/onepiece-op01/luffy-leader.ts'
import { shanks } from '../cards/onepiece-op01/shanks.ts'
import { zoroAlt } from '../cards/onepiece-op01/zoro.ts'
import type { CardDef } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, REGULAR, drawText, fit } from '../fonts.ts'
import { artArea } from '../frames/onepiece.ts'
import type { Mask, Painter, Pt, Ramp } from '../toolkit/index.ts'
import { colors, hex, rays } from '../toolkit/index.ts'
import { crimp, pick, thick } from './booster-pokemon-base.ts'
import type { ProductDef } from './index.ts'

/**
 * Booster pack of the One Piece game, 84×132, shared by every set (OP-01 Romance Dawn here, the
 * later sets in their own folders): a foil wrapper in the hero's colour with crimped seals, our own
 * chunky, arched "ONE PIECE" lettering (in the spirit of the game, not the official logo), a
 * parchment scroll with the set name, a gold doubloon "12 Karten" seal, and the hero of a card rising
 * out of the waves. The hero is cut out of its card artwork, so wrapper and card always match.
 */
const W = 84
const H = 132
const CRIMP = 10
/** Height of one foil band of the wrapper. */
const BAND = 15

const INK = hex('1a0f16')
const WHITE = hex('ffffff')
/** Parchment: shadow, base, light. */
const PARCHMENT = colors('a8865a', 'e6cfa0', 'fbefd2')
const BROWN = hex('4a2614')
const ROLL_SHADE = hex('8a6a44')
/** Letters: cream at the top to warm yellow at the baseline. */
const LETTER = colors('ffd25a', 'ffe9a0', 'fffbe8')
const RED = colors('5c0a12', 'b81c22', 'ec4a30')
const GOLD = colors('5a3a0c', '9a6a1c', 'd8a238', 'f6d26a', 'fff4c0')

export interface PackLook {
  id: string
  /** Set name on the scroll; long names step down to a narrower font. */
  title: string
  hero: CardDef
  /** Effects of the card artwork that belong to the hero, e.g. his phantom arms. */
  effects?: (art: Painter) => Mask
  /** Where the artwork's top left corner lands on the pack. */
  at: Pt
  /** Wrapper foil in the hero's colour, from shadow to the heart of the burst. */
  foil: Ramp
  /** Centre of the burst behind the hero. */
  burst: Pt
}

/** Chunky capitals of the wordmark, 12 rows each, three-pixel strokes. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  O: ['..####..', '.######.', ...Array<string>(8).fill('###..###'), '.######.', '..####..'],
  N: [
    '###...###',
    '####..###',
    '#####.###',
    '#########',
    '###.#####',
    '###..####',
    '###...###',
    ...Array<string>(5).fill('###...###'),
  ],
  E: [
    '#######',
    '#######',
    '###....',
    '###....',
    '######.',
    '######.',
    '###....',
    '###....',
    '###....',
    '###....',
    '#######',
    '#######',
  ],
  P: [
    '#######.',
    '########',
    '###..###',
    '###..###',
    '###..###',
    '########',
    '#######.',
    ...Array<string>(5).fill('###.....'),
  ],
  I: Array<string>(12).fill('###'),
  C: ['..#####', '.######', ...Array<string>(8).fill('###....'), '.######', '..#####'],
  ' ': Array<string>(12).fill('...'),
}

/** The wordmark as a mask, centred on the pack, its top at y; the letters ride a gentle arch. */
function wordmark(p: Painter, text: string, y: number): Mask {
  const glyphs = [...text].map((ch) => GLYPHS[ch] ?? [])
  const width = glyphs.reduce((w, g) => w + Math.max(...g.map((r) => r.length)) + 1, -1)
  const m = p.m()
  let cx = Math.floor((W - width) / 2)
  for (const glyph of glyphs) {
    const gw = Math.max(...glyph.map((r) => r.length))
    const lift = Math.round(3 * Math.pow((cx + gw / 2 - W / 2) / (width / 2), 2))
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(cx + i, y + j + lift)
    })
    cx += gw + 1
  }
  return m
}

/** The doubloon seal: a gold coin with a milled rim and the number of cards. */
function seal(p: Painter, cx: number, cy: number): void {
  const coin = p.m().disc(cx, cy, 14.5)
  const face = p.m().disc(cx, cy, 12)
  p.fill(coin.grown(1), INK)
  coin.each((x, y) => p.set(x, y, (x + y) % 2 === 0 ? GOLD[3] : GOLD[1]))
  p.fill(p.m().disc(cx, cy, 13).minus(face), GOLD[0])
  p.fill(face, GOLD[2])
  p.fill(face.facing([-1, 0, 0, -1]), GOLD[3])
  p.fill(coin.facing([-1, 0, 0, -1]), GOLD[4])
  p.fill(coin.facing([1, 0, 0, 1]), GOLD[0])
  drawText(p, '12', cx - 1, cy - 9, REGULAR, INK, { align: 'center' })
  drawText(p, '12', cx, cy - 9, REGULAR, INK, { align: 'center' })
  drawText(p, 'Karten', cx + 1, cy + 1, MICRO, INK, { align: 'center' })
}

export function boosterPack(look: PackLook): ProductDef {
  return {
    id: look.id,
    w: W,
    h: H,
    draw(p) {
      // wrapper: foil bands with a highlight line each, darker towards the sides, and a sunburst
      // behind the hero
      const [bx, by] = look.burst
      const wedges = rays(p, bx, by, 11, 0.02)
      p.dither(
        null,
        look.foil,
        (x, y) => {
          const band = Math.sin((y * Math.PI * 2) / BAND) * 0.08
          const side = Math.pow(Math.abs(x - 41.5) / 42, 6) * 0.14
          const glow = Math.pow(Math.max(0, 1 - Math.hypot(x - bx, (y - by) * 0.9) / 68), 1.15)
          return 0.18 + band - side + glow * (wedges.has(x, y) ? 0.74 : 0.36)
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

      // the hero is cut out of its card artwork: its effects stay behind the scroll, the hero in front
      const area = artArea(look.hero)
      const art = paintArtwork(look.hero, area.w, area.h)
      const [dx, dy] = look.at
      look
        .effects?.(art)
        .minus(art.subjectMask)
        .each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // set name on a parchment scroll with rolled ends
      const scroll = p.m().rect(6, 31, 72, 11)
      p.fill(scroll.grown(1).or(scroll.moved(1, 2)), INK)
      p.fill(scroll, PARCHMENT[1])
      p.fill(scroll.facing([0, -1]), PARCHMENT[2])
      p.fill(scroll.facing([0, 1]), PARCHMENT[0])
      for (const x of [3, 77]) {
        const roll = p.m().rect(x, 30, 4, 13)
        p.fill(roll.grown(1), INK)
        p.fill(roll, PARCHMENT[0])
        p.fill(p.m().rect(x + 1, 30, 1, 13), PARCHMENT[2])
        p.fill(p.m().rect(x + 3, 30, 1, 13), ROLL_SHADE)
      }
      const font = fit(look.title, 70)
      drawText(p, look.title, 42, 33 + Math.round((REGULAR.cap - font.cap) / 2), font, BROWN, { align: 'center' })

      // the hero, then the sea in front of him
      art.subjectMask.each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))
      const sea = p.m()
      for (let x = 0; x < W; x++) {
        const crest = Math.round(
          113 + Math.sin((x * Math.PI * 2) / 21) * 1.6 + Math.sin((x * Math.PI * 2) / 9) * 0.7,
        )
        sea.rect(x, crest, 1, H - crest)
      }
      p.fill(sea, look.foil[1] ?? INK)
      p.fill(sea.clone().minus(sea.moved(0, 3)), look.foil[3] ?? INK)
      p.fill(sea.facing([0, -1]), look.foil[7] ?? WHITE)
      for (const [x, y] of [
        [10, 119],
        [36, 121],
        [60, 118],
        [74, 120],
      ] as const)
        p.fill(p.m().rect(x, y, 5, 1), look.foil[4] ?? WHITE)

      // wordmark: cream letters warming towards the baseline, red rim, ink outline and shadow
      const letters = wordmark(p, 'ONE PIECE', 13)
      const rim = thick(letters)
      p.fill(thick(rim).or(rim.moved(1, 2)), INK)
      p.fill(rim, RED[1])
      p.fill(rim.facing([1, 0, 0, 1]), RED[0])
      letters.each((x, y) => p.set(x, y, LETTER[y < 18 ? 2 : y < 23 ? 1 : 0]))

      seal(p, 66, 98)

      // glints on the foil
      for (const [x, y] of [
        [75, 11],
        [2, 47],
        [77, 76],
      ] as const)
        p.stamp(['..o..', '..w..', 'owwwo', '..w..', '..o..'], x, y, { w: WHITE, o: GOLD[3] })

      crimp(p, true)
      crimp(p, false)
    },
  }
}

/** Zoro's phantom: the green faces, arms and blades around him. */
const AURA = colors('1d6a46', '3aa070', '7ae0a8', 'd8ffe8')
/** Shanks' bonfire on the beach. */
const FIRE = colors('8a1c10', 'd8401a', 'f88a24', 'ffd04a', 'fff6c8')

/** Luffy wrapper: sunrise-red foil; the captain on the lion figurehead, the sun bursting behind him. */
const boosterLuffy = boosterPack({
  id: 'booster-op01-luffy',
  title: 'Romance Dawn',
  hero: luffyLeader,
  at: [2, 30],
  foil: colors('14060e', '2e0a16', '561020', '861a26', 'b42c26', 'de5a2a', 'f8963c', 'ffd878'),
  burst: [42, 88],
})

/** Zoro wrapper: dark jade foil, like the void of his card, so the phantom arms and blades shine out. */
const boosterZoro = boosterPack({
  id: 'booster-op01-zoro',
  title: 'Romance Dawn',
  hero: zoroAlt,
  effects: (art) => {
    const core = pick(art, AURA, [{ x: 0, y: 10, w: 80, h: 90 }])
    return core
      .grown(1)
      .and(pick(art, [...AURA, hex('03060a')], [{ x: 0, y: 10, w: 80, h: 90 }]))
      .or(core)
  },
  at: [2, 28],
  foil: colors('020806', '04120c', '081c12', '0c281a', '123622', '1a482c', '265e38', '3a7a4a'),
  burst: [42, 76],
})

/** Shanks wrapper: night-violet foil; the red-haired captain raises his cup beside the bonfire. */
const boosterShanks = boosterPack({
  id: 'booster-op01-shanks',
  title: 'Romance Dawn',
  hero: shanks,
  effects: (art) => pick(art, FIRE, [{ x: 0, y: 50, w: 36, h: 50 }]),
  at: [4, 30],
  foil: colors('07061a', '100e30', '1c184c', '2a2268', '3e3088', '5c48aa', '8e72d0', 'dccaff'),
  burst: [44, 80],
})

/** Booster wrappers of this set (ids as in content/catalog.ts `wrappers`). */
export const OP01_BOOSTERS: readonly ProductDef[] = [boosterLuffy, boosterShanks, boosterZoro]
