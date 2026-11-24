import type { Mask, Painter, Points } from '../../toolkit/index.ts'
import { hex, rng, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Portgas.D.Ace (Manga-Art), the Grail of OP-02. Brief: a black-and-white manga page; Ace laughs
 * with his eyes shut, his right fist raised and swallowed by a flame that bursts out of the frame,
 * his bare back half-turned so the crew mark shows; inset panels of a burning ship and his hat.
 * Full art, 80×112, strictly black, white and four greys.
 */
const INK = hex('14121a')
const DARK = hex('46424e')
const TONE = hex('8c8792')
const LIGHT = hex('cdc7c8')
const PAPER = hex('f4eee0')
const WHITE = hex('fffcf3')

const GREY = [INK, DARK, TONE, LIGHT, PAPER, WHITE]
const HAT = [INK, TONE, LIGHT, PAPER]
const BEAD = [INK, DARK, TONE]
const INKS = { k: INK, d: DARK, t: TONE, l: LIGHT, s: PAPER, w: WHITE }

/** The fist, centre of the burst. */
const FX = 45
const FY = 24

/** Ace's head in profile, chin up, laughing with his eyes shut; freckles over the cheek. */
const HEAD = [
  '.....kkkkkkkkkkkkk........',
  '...kkkkkkkkkkkkkkkkk......',
  '..kkkkkkkkkkkkkkkkkkkk....',
  '.kkkkkkkkkkkkkkkkkkkkkk...',
  '.kkkkkkkkkkkkkkkkkkkkkkk..',
  'kkkkkkkkkkkkkkksssskkkkk..',
  'kkkkkdkkkkkkkssssssskkk...',
  'kkkkdkkkkkkkksssssskkkw...',
  'kkkdkkkkkkkkklsssskksssw..',
  'kkkkkkkkklllklsssksskssw..',
  'kkkkkkkkklsllklssssssssssw',
  'kkkkkkkkkltllklsksksssk...',
  'kkkkkkkkklllkklssksksssww.',
  'dkkkkkkkkkkkkklssssswwwww.',
  'kdkkkkkkkkkkkkllssskkkkkk.',
  'kkdkkkkkkkkkkkllsssktttk..',
  'kk.kkkkkkkkkkkkllsssskkkw.',
  'k...kkkkkkkkkkkllssssssw..',
  '.....kk.kkkkkkkklllsssk...',
  '.........kkk.kklllllll....',
  '.............klllllll.....',
  '..............llllll......',
]
const HX = 11
const HY = 31

/** The crew mark on his back: a cross behind a skull with a crescent moustache. */
const MARK = [
  '........kkk........',
  '........kkk........',
  '........kkk........',
  '......kkkkkkk......',
  '.....kkssssskk.....',
  'kkkkkksssssssskkkkk',
  'kkkkkskkksskkkskkkk',
  'kkkkkskkkskkkkskkkk',
  '.....kssskksssk....',
  '.kk..kkkkkkkkkkk.kk',
  'kkkkkkkkkkkkkkkkkkk',
  '.kkkk.ksksksk.kkkk.',
  '......kkkkkkk......',
  '........kkk........',
  '........kkk........',
  '........kkk........',
]

/** The raised fist from behind, dark against its own fire: knuckles on top, fingers curled. */
const FIST = [
  '..kkkkkk..',
  '.kllkllkk.',
  'kltlltlltk',
  'kttttttttk',
  'kdttkkkkkk',
  'kdtttttttk',
  'kddttkkkk.',
  '.kddtk....',
  '..kddk....',
]

/** Screentone dots: a staggered lattice of single dots that fills in towards a 50 % checkerboard. */
function dot(x: number, y: number, density: number): boolean {
  if (density > 0.3) return (x + y) % 2 === 0 && (density > 0.4 || y % 2 === 0 || x % 4 === 1)
  if (density > 0.18) return x % 2 === 0 && y % 2 === 0
  if (density > 0.06) return (x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)
  return false
}

/** The page behind him: a grey screentone, black smoke rolling round the fire, faint focus lines. */
function background(p: Painter): void {
  p.clear(TONE)
  for (let y = 0; y < 112; y++) for (let x = 0; x < 80; x++) if (dot(x, y, 0.2)) p.set(x, y, DARK)
  const rand = rng(21)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rand() * 0.07
    const r0 = 26 + rand() * 18
    p.fill(p.m().path([FX + Math.cos(a) * r0, FY + Math.sin(a) * r0, FX + Math.cos(a) * 150, FY + Math.sin(a) * 150]), LIGHT)
  }
  // smoke: round billows of ink, screentone along their lower rims
  const smoke = p.m().rect(0, 0, 80, 10)
  for (const [x, y, r] of [
    [6, 12, 9],
    [20, 14, 9],
    [34, 10, 11],
    [50, 12, 10],
    [64, 15, 9],
    [76, 22, 8],
    [62, 26, 6],
    [28, 26, 6],
    [14, 26, 7],
  ] as const)
    smoke.disc(x, y, r)
  const rim = smoke.clone().minus(smoke.moved(0, -2))
  p.fill(smoke, INK)
  rim.each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, DARK)
  })
}

/** A panel cut into the page: white gutter, ink border, then its own picture inside. */
function panel(p: Painter, x: number, y: number, w: number, h: number): Mask {
  const inner = p.m().rect(x, y, w, h)
  p.fill(inner.grown(3), WHITE)
  p.fill(inner.grown(1), INK)
  return inner
}

/** Inset top left: a ship burning, a black silhouette against its own fire, smoke rolling away. */
function shipPanel(p: Painter): void {
  const inner = panel(p, -2, -2, 28, 38)
  p.fill(inner, LIGHT)
  inner.each((x, y) => {
    if (dot(x, y, 0.42)) p.set(x, y, TONE)
  })
  const smoke = p.m().disc(6, 6, 6).disc(14, 4, 5).disc(21, 6, 4).and(inner)
  p.fill(smoke, INK)
  smoke.clone().minus(smoke.moved(0, -2)).each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, DARK)
  })
  // the blaze behind the ship
  p.shine(true)
  const blaze = p.m().ellipse(13.5, 22, 10.5, 7)
  for (const [x, y, r, tx, ty] of [
    [7, 18, 3.5, 5, 9],
    [13, 17, 4, 12, 6],
    [19, 18, 3.4, 22, 9],
  ] as const)
    blaze.limb([x, y, (x + tx) / 2 - 1, (y + ty) / 2, tx, ty], [r, r * 0.6, 0.4])
  blaze.and(inner)
  p.fill(blaze.outerEdge().and(inner), INK)
  p.fill(blaze, WHITE)
  blaze.each((x, y) => {
    if (y > 25 && (x + y) % 2 === 0) p.set(x, y, LIGHT)
  })
  p.shine(false)
  // sea, then the ship: hull with its high stern, masts, two square sails
  p.fill(p.m().rect(-2, 31, 28, 5).and(inner), DARK)
  p.fill(p.m().rect(2, 33, 5, 1).rect(12, 34, 6, 1).rect(20, 32, 4, 1), LIGHT)
  p.fill(p.m().poly([1, 22, 6, 22, 7, 25.5, 19, 25.5, 25.5, 22.5, 21, 31.5, 5.5, 31.5, 2, 27]), INK)
  p.fill(p.m().rect(9, 11, 1, 15).rect(17, 13, 1, 13), INK)
  p.fill(p.m().poly([5.5, 14, 13.5, 14, 13, 21.5, 6, 21.5, 7, 18]), INK)
  p.fill(p.m().poly([13.5, 16, 21, 16, 20.5, 23, 14, 23, 15, 19.5]), INK)
  p.fill(p.m().path([22, 23, 25, 20]), INK)
}

/** Inset bottom right: his hat in close-up, tipped to one side, two little badges on its band. */
function hatPanel(p: Painter): void {
  const inner = panel(p, 57, 55, 25, 40)
  p.fill(inner, LIGHT)
  inner.each((x, y) => {
    if (dot(x, y, 0.08 + Math.hypot(x - 67, y - 72) * 0.02)) p.set(x, y, TONE)
  })
  const turn = (pts: Points) => xf(pts, { ox: 67, oy: 74, rot: 16 })
  const brim = p.m().poly(turn([55, 71, 58, 72.5, 63, 73.5, 71, 73.5, 76, 72.5, 79, 70, 78, 74, 73, 77, 64, 77.5, 58.5, 75.5]))
  const crown = p.m().poly(turn([60.5, 74, 60.5, 67, 62, 63.5, 65, 62.6, 67, 63.6, 69.5, 62, 72.5, 63.5, 74, 67, 74, 74]))
  p.part(brim, HAT, { bevel: 2 })
  p.part(crown, HAT, { bevel: 4 })
  p.fill(p.m().poly(turn([60.3, 70.6, 74.2, 70.6, 74.2, 74, 60.3, 74])).and(crown), DARK)
  p.fill(p.m().path(turn([67, 63.6, 67, 67.5])), TONE)
  for (const [x, y] of turn([63.5, 72.3, 69.5, 72.3])) {
    p.stamp(['.k.', 'kwk', '.k.'], Math.round(x) - 1, Math.round(y) - 1, { k: INK, w: WHITE })
  }
}

function back(d: Painter): void {
  const m = (): Mask => d.m()
  const body = m().poly([
    20, 59, 31, 59.5, 37, 61.5, 44, 63, 49, 67, 50.5, 74, 48.5, 82, 47, 92, 46, 112, 0, 112, 0, 73, 3, 69, 10, 64.5,
  ])
  d.fill(body, PAPER)
  // lit from the fire above: shoulders bright, the far side and the small of the back in tone
  const lit = m().ellipse(31, 66, 21, 14).or(m().ellipse(13, 67, 11, 6))
  body.each((x, y) => {
    if (!lit.has(x, y) && (x + y) % 2 === 0) d.set(x, y, LIGHT)
  })
  d.fill(body.facing([0, -1]), WHITE)
  // spine, shoulder blades, the edge of the lats
  d.fill(m().path([24, 63, 24.5, 68]).path([24.5, 83, 23, 112]), TONE)
  d.fill(m().path([34, 69, 39, 73, 40, 80, 37, 86]), TONE)
  d.fill(m().path([11, 70, 8, 77, 9, 84]), TONE)
  d.fill(m().path([44, 84, 41, 96]), TONE)
  d.stamp(MARK, 15, 67, INKS)
}

function arm(d: Painter): void {
  const m = (): Mask => d.m()
  const upper = m().limb([45, 68, 50.5, 58, 54.5, 48.5], [5.2, 4.4, 3.8])
  const fore = m().limb([54.5, 48.5, 51.5, 39, 47, 30], [3.6, 3.4, 3])
  for (const limb of [upper, fore]) {
    d.contact(limb)
    d.fill(limb, PAPER)
    limb.each((x, y) => {
      if (!limb.has(x - 2, y) && (x + y) % 2 === 0) d.set(x, y, LIGHT)
    })
    d.fill(limb.facing([1, 0]), WHITE)
  }
  d.fill(m().path([51, 56, 49.5, 61]), TONE)
}

function head(d: Painter): void {
  const m = (): Mask => d.m()
  // neck and the beads round it
  d.fill(m().poly([21, 50, 28, 53, 33, 55, 34.5, 62, 19.5, 63, 18.5, 55]), PAPER)
  d.fill(m().poly([20, 52, 29, 55, 24, 62, 19, 62]), LIGHT)
  for (const [x, y] of [
    [18, 60],
    [22, 61.2],
    [26, 61.6],
    [30, 61.2],
    [34, 60],
  ] as const) {
    const bead = m().disc(x, y, 2)
    d.contact(bead)
    d.shade(bead, BEAD, { bevel: 1.5 })
    d.px(Math.floor(x) - 1, Math.floor(y) - 1, WHITE)
  }
  d.stamp(HEAD, HX, HY, INKS)
}

/** The hat, tipped back as he laughs: drawn flat, then turned about the back of the crown. */
function hat(d: Painter): void {
  const m = (): Mask => d.m()
  const turn = (pts: Points) => xf(pts, { ox: 0, oy: 0, rot: -20, dx: 15, dy: 36.5 })
  const crown = m().poly(turn([0, 0, -0.3, -6, 1.5, -8.5, 5, -9.3, 9, -8.4, 12.5, -9.2, 15, -7.5, 16.3, -3, 16.5, 0]))
  const band = m().poly(turn([-0.3, -2.4, 16.4, -2.4, 16.5, 0, 0, 0])).and(crown)
  const brim = m().limb(turn([-8, 2.4, -4, 0.8, 4, 0.2, 14, 0.2, 20.5, -0.2, 25, 0.9]), [0.9, 1.4, 1.7, 1.7, 1.4, 0.9])
  d.part(crown, HAT, { bevel: 4 })
  d.fill(band, DARK)
  d.part(brim, HAT, { bevel: 1.5 })
}

/** Flame strokes, back to front: a path that tapers from its root to a point, as [x, y, radius] triples. */
const FIRE: readonly (readonly number[])[] = [
  [45, 31, 10, 44, 18, 8, 40, 6, 5, 37, -6, 2],
  [52, 28, 5, 54, 19, 4, 52, 10, 2.5, 49, 2, 0.6],
  [38, 29, 5, 35, 20, 4, 31, 12, 2.4, 29, 3, 0.6],
  [49, 22, 5, 49, 12, 4, 46, 2, 2.4, 47, -6, 0.8],
  [57, 30, 3, 60, 24, 2.4, 61, 18, 1.4, 63, 13, 0.4],
  [34, 31, 3, 31, 26, 2.4, 29, 21, 1.4, 28, 16, 0.4],
  [43, 22, 4, 41, 14, 3, 38, 7, 1.8, 39, 1, 0.5],
  [31, 9, 1.4, 30, 6, 0.9, 31, 3, 0.4],
  [57, 18, 1.4, 58, 15, 0.9, 60, 13, 0.4],
]

function flames(d: Painter): void {
  const m = (): Mask => d.m()
  const fire = m()
  d.shine(true)
  // each stroke's ink outline stays as a line inside the fire where the next one overlaps it
  for (const s of FIRE) {
    const pts: number[] = []
    const radii: number[] = []
    for (let i = 0; i + 2 < s.length; i += 3) {
      pts.push(s[i] ?? 0, s[i + 1] ?? 0)
      radii.push(s[i + 2] ?? 1)
    }
    const t = m().limb(pts, radii)
    d.fill(t.outerEdge(), INK)
    d.fill(t, WHITE)
    d.fill(t.facing([-1, 0, 0, 1]), LIGHT)
    fire.or(t)
  }
  // screentone heat towards the fist; the tongues stay white at their tips
  fire.each((x, y) => {
    if (d.get(x, y) !== WHITE) return
    if (dot(x, y, (y - 14) * 0.02)) d.px(x, y, y > 28 ? TONE : LIGHT)
  })
  d.shine(false)
  d.stamp(FIST, FX - 5, FY - 4, INKS)
}

/** Sparks flung off the fire, white on the black page. */
function sparks(p: Painter): void {
  const rand = rng(4)
  p.shine(true)
  for (let i = 0; i < 16; i++) {
    const x = 20 + Math.floor(rand() * 40)
    const y = 2 + Math.floor(rand() * 36)
    if (p.subjectMask.grown(1).has(x, y) || p.get(x, y) !== INK) continue
    p.px(x, y, WHITE)
    if (rand() < 0.5) p.px(x, y + 1, TONE)
  }
  p.shine(false)
}

export const aceManga: CardDef = {
  id: 'op02-090',
  number: 90,
  name: 'Portgas.D.Ace (Manga-Art)',
  tier: 'grail',
  kind: 'character',
  element: 'Rot',
  print: { cost: 7, power: 7000, type: 'Whitebeard-Bande' },
  // the fire and its sparks shine; the ink drawing stays matt
  foil: 'painted',
  draw(p) {
    p.register(GREY)
    background(p)
    shipPanel(p)
    hatPanel(p)
    const d = p.layer()
    back(d)
    arm(d)
    head(d)
    hat(d)
    flames(d)
    p.subject(d, INK)
    sparks(p)
  },
}
