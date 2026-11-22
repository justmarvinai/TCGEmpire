import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Shanks (Manga-Art), the Grail of OP-01. Brief: black-and-white ink panel, the captain lowers his
 * straw hat onto a crying boy; screentone sea, gold foil. Full art, 80×112.
 *
 * Composition: a close-up manga panel in ink and screentone. Shanks leans in from the right, his
 * black cloak hanging open over both shoulders, flat on the side where the arm is missing, and
 * presses the hat onto the boy's head with his one hand, smiling, the three scars over his left
 * eye. The boy below on the left howls with his eyes squeezed shut, tears streaming and flying
 * off. The hat is the only colour in the picture: gold, and it shines. Behind them the ship waits
 * on the horizon over a screentone sea. The frame covers the outer 4 pixels and its plates rows
 * 1–13 and 90–108.
 */
const INK = hex('14121a')
const DARK = hex('46424e')
const TONE = hex('8c8792')
const LIGHT = hex('cdc7c8')
const PAPER = hex('f4eee0')
const WHITE = hex('fffcf3')
const GOLD = colors('5a3a10', '966a1e', 'cf9f36', 'efcf68', 'fff0b4')

const SKIN = [INK, LIGHT, PAPER, WHITE]
const CLOAK = [INK, DARK]
const HAIR = [INK, DARK, TONE]
const SHIRT = [INK, TONE, LIGHT]
const INKS = { k: INK, d: DARK, t: TONE, l: LIGHT, s: PAPER, w: WHITE }

const HORIZON = 47

/**
 * Shanks' head, hand-pixelled: three-quarter view to the left, looking down at the boy with a
 * quiet smile. The face first, then the hair over it, then the three scars across the left eye.
 */
const FACE = [
  '....ssssssss..........',
  '...ssssssssssss.......',
  '...sssssssssssss......',
  '...ssssssssssssss.....',
  '...ssssssssssssss.....',
  '..skksskkkkkksssl.....',
  '...ssssssssssllks.....',
  '..skksssskkkklllksl...',
  '..ssksssssskkslllksl..',
  '.sssssssssssssllksl...',
  '..lsssssssssslll......',
  '..sssskssssslll.......',
  '..kkkssssssllll.......',
  '..sssssssslllll.......',
  '..sttsssssllll........',
  '...ttsssklll..........',
  '....ssskllll..........',
  '.....kkksllll.........',
  '.......sssllll........',
  '.......sssllll........',
  '.......ssslllll.......',
  '......ssssllllll......',
]
const HAIR_GRID = [
  '..........dddd........',
  '........ddttdddd......',
  '.......dttttddddd.....',
  '......dttdddddkddd....',
  '.....dtdddddkddddkd...',
  '.....ddddddkdddddkdd..',
  '....dddddkdddddddkddd.',
  '....ddddkddddddddkddd.',
  '...dddd......ddddkdddd',
  '...ddd........dddkdddd',
  '...dd..........ddkdddd',
  '...d............dkdddd',
  '.................ddddd',
  '.................dtddd',
  '.................dtdkd',
  '.................dddkd',
  '................ddddkd',
  '...............dddkd..',
  '..............dddkd...',
  '.............dddkd....',
  '............dddd......',
  '............ddd.......',
]
const SCARS = [
  '.......t.t.t',
  '.......t.t.t',
  '........t.t.t',
  '',
  '.........t.t.t',
  '',
  '',
  '..........t.t.t',
  '..........t.t.t',
]
/** Where the head grid sits: its top left corner. */
const HX = 49
const HY = 16

/** The boy's face under the brim: brows up, eyes squeezed shut, tears down both cheeks, howling. */
const BOY = [
  'kkklllkklkllkklllkkk',
  'kkksssskssssksssskkk',
  '.kksssksssssskssskk.',
  '.ksskksssssssskkslk.',
  '.ssssksssssssskssll.',
  '.sstwskksssskkswtll.',
  '.sstwksssssssskwtll.',
  '.stwtssssslskkstwtl.',
  '..twtsssssssssstwt..',
  '..twtssskkkkssstwt..',
  '..swtsskwwwwksstwl..',
  '...ssskkkkkkkkssl...',
  '...llskkkttkkksll...',
  '....llkkttttkkll....',
  '.....llkkkkkkll.....',
  '......llllllll......',
]
/** Shanks' hand, palm down on the crown, the fingers curling over its front. */
const HAND = [
  '....ssssss.',
  '..ssssssss.',
  '.ssssssssss',
  'ssssssssss.',
  'slslsssss..',
  'slslslll...',
  '.k.k.k.....',
]
const BX = 15
const BY = 64

/** Screentone dots: a staggered lattice of single dots that fills in towards a 50 % checkerboard. */
function dot(x: number, y: number, density: number): boolean {
  if (density > 0.3) return (x + y) % 2 === 0 && (density > 0.4 || y % 2 === 0 || x % 4 === 1)
  if (density > 0.18) return x % 2 === 0 && y % 2 === 0
  if (density > 0.06) return (x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)
  return false
}

/** A cumulus in ink: round puffs on a flat base, hatched underneath. */
function cloud(p: Painter, puffs: readonly number[], base: number): void {
  const m = p.m()
  for (let i = 0; i + 2 < puffs.length; i += 3) m.disc(puffs[i] ?? 0, puffs[i + 1] ?? 0, puffs[i + 2] ?? 0)
  m.minus(p.m().rect(0, base, 80, 40))
  p.fill(m, WHITE)
  m.each((x, y) => {
    if (y >= base - 2 && (x + y) % 2 === 0) p.set(x, y, LIGHT)
  })
  p.fill(m.outerEdge(), INK)
}

function background(p: Painter): void {
  p.clear(PAPER)
  // sky: a light tone at the top that fades out
  for (let y = 0; y < HORIZON; y++)
    for (let x = 0; x < 80; x++) if (dot(x, y, 0.26 - y * 0.008)) p.set(x, y, TONE)
  cloud(p, [69, 27, 3.5, 75, 23, 5, 81, 26, 4.5], 30)
  for (const [x, y] of pts([22, 22, 30, 18])) p.stamp(['k...k', '.k.k.', '..k..'], x, y, { k: INK })
  p.stamp(['k.k', '.k.'], 37, 27, { k: INK })

  // the ship waiting on the horizon: hull, bowsprit, a bellied sail, the flag
  p.fill(p.m().poly([3, 42, 19, 42, 17, 46, 5.5, 46]), INK)
  p.fill(p.m().path([18, 42, 23, 39.5]).rect(11, 26, 1, 16), INK)
  const sails = p.m().poly([6, 29, 16, 29, 17, 33, 6.8, 33]).poly([5, 34.5, 17, 34.5, 18, 39.5, 5.8, 39.5])
  p.fill(sails.outerEdge(), INK)
  p.fill(sails, WHITE)
  p.fill(sails.clone().and(sails.moved(-2, 0)).facing([1, 0]), LIGHT)
  p.fill(p.m().rect(12, 23, 4, 3), INK)
  p.px(13, 24, WHITE)

  // sea: screentone, denser towards the viewer, white glints scratched into it
  p.fill(p.m().rect(0, HORIZON - 1, 80, 1), INK)
  for (let y = HORIZON; y < 112; y++)
    for (let x = 0; x < 80; x++) if (dot(x, y, 0.15 + ((y - HORIZON) / 30) * 0.35)) p.set(x, y, INK)
  const rand = rng(12)
  p.shine(true)
  for (let i = 0; i < 30; i++) {
    const y = HORIZON + 2 + Math.floor(rand() * 40)
    const x = Math.floor(rand() * 76)
    p.fill(p.m().rect(x, y, 2 + Math.floor(rand() * (y - HORIZON) * 0.25), 1), WHITE)
  }
  p.shine(false)
}

function shanks(d: Painter): void {
  const m = (): Mask => d.m()
  // the cloak behind him, blowing out to the right
  d.part(m().poly([45, 47, 52, 43, 64, 42, 72, 45, 78, 52, 82, 62, 82, 112, 40, 112, 42, 70]), CLOAK)
  // white shirt, open over the chest, with a screentone shadow on the side away from the light
  const shirt = m().poly([49, 46, 56, 43, 63, 43, 64, 48, 62, 70, 60, 112, 49, 112, 47, 70])
  d.part(shirt, SKIN, { bevel: 4 })
  d.part(m().poly([55, 43, 62.5, 43, 58.5, 59]), SKIN, { bevel: 3 })
  d.fill(m().path([55, 44, 58, 58]).path([62, 44, 59, 58]), LIGHT)
  shirt.each((x, y) => {
    if (x > 54 && y > 58 && (x + y) % 2 === 0) d.set(x, y, LIGHT)
  })
  d.fill(m().path([52, 62, 52, 78]).and(shirt.shrunk(1)), LIGHT)
  // a sash round the waist
  const sash = m().poly([46, 79, 62, 77, 62, 84, 46, 86])
  d.part(sash, HAIR, { bevel: 2 })
  d.fill(m().path([47, 82, 61, 80]).and(sash), INK)
  // the cloak hangs open over both shoulders: the near side flat where the arm is missing
  const near = m().poly([
    61, 44, 70, 45, 76, 51, 78, 62, 76, 82, 72, 112, 57, 112, 59, 82, 59.5, 62, 60.5, 50,
  ])
  d.part(near, CLOAK)
  d.fill(m().path([66, 52, 69, 66, 67, 84]).and(near.shrunk(1)), DARK)
  const far = m().poly([42, 53, 46, 47, 54, 44, 56, 46.5, 53, 56, 51, 70, 49.5, 90, 49, 112, 40, 112, 42, 80])
  d.part(far, CLOAK)
  d.fill(m().path([47, 58, 45, 74, 45, 90]).and(far.shrunk(1)), DARK)
  // the head
  d.stamp(FACE, HX, HY + 6, INKS)
  d.stamp(HAIR_GRID, HX, HY, INKS)
  d.stamp(SCARS, HX, HY + 8, INKS)
}

function luffy(d: Painter): void {
  const m = (): Mask => d.m()
  // bare arms hanging at his sides, a sleeveless shirt (red, so it prints as tone)
  d.part(m().limb([14, 87, 12, 98, 11, 110], [2.8, 2.6, 2.4]), SKIN, { bias: -1 })
  d.part(m().limb([36, 87, 38, 98, 39, 110], [2.8, 2.6, 2.4]), SKIN)
  d.part(m().poly([14, 87, 20, 82.5, 30, 82.5, 36, 87, 37, 112, 13, 112]), SHIRT, { bevel: 4 })
  d.part(m().poly([20, 82.5, 30, 82.5, 25, 88]), SKIN, { bevel: 2 })
  d.part(m().rect(21, 77, 8, 6), SKIN, { bevel: 2 })
  d.tone(m().rect(21, 79, 8, 2), -1)
  d.stamp(BOY, BX, BY, INKS)
}

/** Tears flung off his cheeks, drawn on the scene with a clear halo so they read on the screentone. */
function tears(p: Painter): void {
  const drops = p.m()
  const list = [12.5, 71, 1.4, 10, 74.5, 1.8, 7.5, 79, 1.5, 37.5, 71, 1.4, 39.5, 74.5, 1.6]
  for (let i = 0; i + 2 < list.length; i += 3) {
    const r = list[i + 2] ?? 1
    drops.ellipse(list[i] ?? 0, list[i + 1] ?? 0, r, r * 1.25)
  }
  drops.minus(p.subjectMask)
  p.fill(drops.grown(2).minus(p.subjectMask), PAPER)
  p.fill(drops.outerEdge().minus(p.subjectMask), INK)
  p.shine(true)
  p.fill(drops, WHITE)
  p.fill(drops.facing([1, 0, 0, 1]), LIGHT)
  p.shine(false)
}

function hat(d: Painter): void {
  const m = (): Mask => d.m()
  d.shine(true)
  d.part(m().ellipse(25, 62, 16, 4.2, -4), GOLD, { bevel: 3 })
  d.part(
    m()
      .ellipse(25, 58.5, 8.6, 9)
      .minus(m().rect(0, 60, 80, 10)),
    GOLD,
    { bevel: 4 },
  )
  d.fill(m().ellipse(25, 59.4, 8.5, 1.6, -4), INK)
  d.shine(false)
}

function arm(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().limb([48, 49, 41, 55, 33, 51.5], [3.6, 3.1, 2.6]), SKIN)
  d.fill(m().path([41, 53, 45, 54]), LIGHT)
  const hand = d.layer().stamp(HAND, 21, 46, INKS)
  d.contact(hand.mask()).blit(hand)
}

export const shanksManga: CardDef = {
  id: 'op01-089',
  number: 89,
  name: 'Shanks (Manga-Art)',
  tier: 'grail',
  kind: 'character',
  element: 'Rot',
  print: { cost: 9, power: 10000, type: 'Rothaar-Piraten' },
  // the gold hat, the tears and the glints on the sea shine; the ink drawing stays matt
  foil: 'painted',
  draw(p) {
    for (const r of [SKIN, CLOAK, HAIR, SHIRT, GOLD]) p.register(r)
    background(p)
    const d = p.layer()
    shanks(d)
    luffy(d)
    hat(d)
    arm(d)
    p.subject(d, INK)
    tears(p)
  },
}
