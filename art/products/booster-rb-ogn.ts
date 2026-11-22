import { ahriSignature } from '../cards/riftbound-origins/ahri-signature.ts'
import { jinxSignature } from '../cards/riftbound-origins/jinx-signature.ts'
import { kaisaSignature } from '../cards/riftbound-origins/kaisa-signature.ts'
import type { CardDef } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, REGULAR, drawText } from '../fonts.ts'
import { artArea } from '../frames/riftbound.ts'
import type { Mask, Painter, Pt, Ramp } from '../toolkit/index.ts'
import { colors, hex, rays } from '../toolkit/index.ts'
import { crimp as crimpWith, pick, thick } from './booster-pokemon-base.ts'
import type { ProductDef } from './index.ts'

/**
 * Booster pack of Riftbound Origins, 84×132: a foil wrapper in the colour of the hero's domain with
 * crimped seals, our own angular "RIFTBOUND" wordmark in hextech gold (not the official logo), the
 * "Origins" plate, a gold "14 Karten" medallion and the hero of a Signature card bursting out of the
 * lower two thirds. The hero is cut out of its card artwork, so wrapper and card always match.
 */
const W = 84
const H = 132
const CRIMP = 10
/** Height of one foil band of the wrapper. */
const BAND = 15

const GOLD = colors('4a3410', '9a6e24', 'd8a848', 'f4d27a', 'fff4c8')
const NAVY = colors('07081a', '141a3a', '26305e')
const SILVER = colors('3e4258', '7e849e', 'bcc2d6', 'f4f6ff')
const WHITE = hex('ffffff')

interface Look {
  id: string
  hero: CardDef
  /** Effects of the card artwork that belong to the hero, e.g. its flames. */
  effects?: (art: Painter) => Mask
  /** Where the artwork's top left corner lands on the pack. */
  at: Pt
  /** Wrapper foil in the domain colour, from shadow to the heart of the burst. */
  foil: Ramp
  /** Centre of the burst behind the hero. */
  burst: Pt
}

/** Angular capitals of the wordmark, 12 rows each, two-pixel strokes. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  R: ['#######.', '########', '##....##', '##....##', '##....##', '#######.', '######..', '##..##..', '##...##.', '##...##.', '##....##', '##....##'],
  I: Array<string>(12).fill('##'),
  F: ['#######', '#######', '##.....', '##.....', '##.....', '######.', '######.', '##.....', '##.....', '##.....', '##.....', '##.....'],
  T: ['########', '########', ...Array<string>(10).fill('...##...')],
  B: ['#######.', '########', '##....##', '##....##', '##...##.', '######..', '#######.', '##....##', '##....##', '##....##', '########', '#######.'],
  O: ['.######.', '########', ...Array<string>(8).fill('##....##'), '########', '.######.'],
  U: [...Array<string>(10).fill('##....##'), '########', '.######.'],
  N: ['###...##', '###...##', '####..##', '####..##', '##.##.##', '##.##.##', '##..####', '##..####', '##...###', '##...###', '##....##', '##....##'],
  D: ['######..', '#######.', '##...###', ...Array<string>(6).fill('##....##'), '##...###', '#######.', '######..'],
}

/** The wordmark as a mask, centred on the pack, its top at y. */
function wordmark(p: Painter, text: string, y: number): Mask {
  const glyphs = [...text].map((ch) => GLYPHS[ch] ?? [])
  const width = glyphs.reduce((w, g) => w + (g[0]?.length ?? 0) + 1, -1)
  const m = p.m()
  let cx = Math.floor((W - width) / 2)
  for (const glyph of glyphs) {
    glyph.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') m.add(cx + i, y + j)
    })
    cx += (glyph[0]?.length ?? 0) + 1
  }
  return m
}

/** The shared crimped seal in Riftbound's silver. */
const crimp = (p: Painter, top: boolean): void => crimpWith(p, top, SILVER)

/** Regular polygon with `n` corners around (cx, cy), turned by `turn` of a full circle. */
function polygon(p: Painter, cx: number, cy: number, r: number, n: number, turn = 0): Mask {
  const corners: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n + turn) * Math.PI * 2
    corners.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return p.m().poly(corners)
}

function boosterPack(look: Look): ProductDef {
  return {
    id: look.id,
    w: W,
    h: H,
    draw(p) {
      // wrapper: foil bands with a highlight line each, darker towards the sides, and a burst of rays
      // behind the hero
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
      p.tone(p.m().rect(0, 0, 1, H).rect(W - 2, 0, 2, H).rect(0, CRIMP, W, 2).rect(0, H - CRIMP - 2, W, 2), -1)

      // the hero is cut out of its card artwork: its effects stay behind the plate, the hero bursts over it
      const area = artArea(look.hero)
      const art = paintArtwork(look.hero, area.w, area.h)
      const [dx, dy] = look.at
      look.effects?.(art).minus(art.subjectMask).each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // "Origins" plate with pointed ends
      const plate = p.m().poly([12, 30, 72, 30, 77, 35.5, 72, 41, 12, 41, 7, 35.5])
      p.fill(plate.moved(1, 1), look.foil[0] ?? NAVY[0])
      p.fill(plate.grown(1), GOLD[1])
      p.fill(plate, NAVY[1])
      p.fill(plate.facing([0, -1]), NAVY[2])
      drawText(p, 'Origins', 42, 32, REGULAR, GOLD[3], { align: 'center', shadow: NAVY[0] })

      // ground, then the hero
      const ground = p.m().poly([0, 118.5, 26, 117, 54, 118.5, W, 117, W, H, 0, H])
      p.fill(ground, look.foil[0] ?? NAVY[0])
      p.edge(ground, look.foil[2] ?? NAVY[1], [0, -1])
      art.subjectMask.each((x, y) => p.set(x + dx, y + dy, art.get(x, y)))

      // wordmark: gold letters that darken towards the baseline, bronze rim, navy outline and shadow
      const letters = wordmark(p, 'RIFTBOUND', 14)
      const rim = thick(letters)
      p.fill(thick(rim).or(rim.moved(1, 2)), NAVY[0])
      p.fill(rim, GOLD[0])
      letters.each((x, y) => p.set(x, y, GOLD[y < 18 ? 4 : y < 22 ? 3 : 2]))
      p.fill(letters.facing([1, 0, 0, 1]).and(p.m().rect(0, 20, W, 6)), GOLD[1])

      // seal: a twelve-sided gold medallion with the number of cards inside
      const seal = polygon(p, 68, 102, 13.5, 12, 1 / 24)
      p.fill(seal.grown(1), NAVY[0])
      p.fill(seal, GOLD[2])
      p.fill(seal.facing([-1, 0, 0, -1]), GOLD[4])
      p.fill(seal.facing([1, 0, 0, 1]), GOLD[1])
      drawText(p, '14', 67, 92, REGULAR, NAVY[0], { align: 'center' })
      drawText(p, '14', 68, 92, REGULAR, NAVY[0], { align: 'center' })
      drawText(p, 'Karten', 68, 102, MICRO, NAVY[0], { align: 'center' })

      // glints on the foil
      for (const [x, y] of [[74, 11], [2, 47], [77, 80]] as const)
        p.stamp(['..o..', '..w..', 'owwwo', '..w..', '..o..'], x, y, { w: WHITE, o: GOLD[3] })

      crimp(p, true)
      crimp(p, false)
    },
  }
}

const FOXFIRE = colors('0f5a60', '20a090', '68e0c0', 'd8fff0')
const FIRE = colors('c22a12', 'f0641a', 'fcb02c', 'fff2a0')

/** Ahri wrapper (Calm): teal-green foil; the fox keeps her spirit flames from the Grail artwork. */
const boosterAhri = boosterPack({
  id: 'booster-rb-ogn-ahri',
  hero: ahriSignature,
  effects: (art) =>
    pick(art, FOXFIRE, [
      { x: 0, y: 20, w: 18, h: 80 },
      { x: 62, y: 20, w: 18, h: 80 },
    ]),
  at: [2, 31],
  foil: colors('04110f', '08221e', '0d362c', '14503c', '1e6e4c', '33925e', '6cc082', 'ccf0c8'),
  burst: [42, 80],
})

/** Jinx wrapper (Fury): red foil; Jinx rides her cannon with its burning fuse. */
const boosterJinx = boosterPack({
  id: 'booster-rb-ogn-jinx',
  hero: jinxSignature,
  effects: (art) =>
    pick(art, FIRE, [
      { x: 0, y: 30, w: 30, h: 40 },
      { x: 60, y: 0, w: 20, h: 24 },
    ]),
  at: [0, 31],
  foil: colors('12040a', '280814', '440c1a', '6a1220', '96202a', 'c43c34', 'ec7448', 'ffcf98'),
  burst: [46, 82],
})

const RIFT = colors('4a1458', '7a1e78', 'b0389a', 'ff6ab0', '0c4a56', '13848a', '3cc8b8', 'a8fff0', 'ffffff')

/** Kai'Sa wrapper (Mind): deep blue foil; she dives out of the magenta void rift of her Signature artwork. */
const boosterKaisa = boosterPack({
  id: 'booster-rb-ogn-kaisa',
  hero: kaisaSignature,
  effects: (art) => pick(art, RIFT, [{ x: 0, y: 0, w: 80, h: 112 }]),
  at: [2, 31],
  foil: colors('04061a', '080e34', '0e1650', '15206c', '1c2e8c', '2a44ac', '4a6cd0', '9ab4f4'),
  burst: [42, 80],
})

/** Booster wrappers of this set (ids as in content/catalog.ts `wrappers`). */
export const RB_OGN_BOOSTERS: readonly ProductDef[] = [boosterAhri, boosterJinx, boosterKaisa]
