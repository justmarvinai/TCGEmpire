import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Feierliches Urteil (Ultra, counter trap). Brief: an ancient robed elder with a long white beard,
 * seen slightly from below, arms raised high, palms open. Storm clouds part and a column of
 * white-gold light falls onto and through him; at his feet a monster and a few cards dissolve in the
 * light. Full art, 80×112.
 *
 * Composition: the column of light drops through a gap in grey-violet storm clouds and fills the
 * middle of the card. The elder stands in it, seen from below, robe flaring to the ground, arms and
 * wide sleeves raised in a V, palms open to the sky. Against the light he is a dark royal-blue
 * silhouette, rimmed in white-gold; only his beard and hands catch the glow. A crouching monster and
 * three cards crumble into motes of light at his feet. Text plates float over rows 0–13 and 90–111.
 */
const LIGHT = colors('d6a43c', 'f4d26c', 'ffeeae', 'fffbea')
const CLOUD = colors('0e0b18', '1a1528', '29223c', '3e3454', '584c70', '7c6f94')
const ROBE = colors('050820', '0c1440', '172670', '2840a4')
const SKIN = colors('5e3626', '9c6844', 'd8a47c')
const BEARD = colors('7a809e', 'b8bcd4', 'eceef8')
const CARD = colors('3a2410', '8a5a26')

const P = (x: number, y: number): Pt => [x, y]
const MID = 40

/** Half-width of the column of light at a row: it widens as it falls. */
const beam = (y: number): number => 11 + y * 0.15

function storm(p: Painter): void {
  // storm clouds, billowing and darker towards the edges, lit where they part round the column
  p.shine(true)
  p.dither(
    null,
    CLOUD,
    (x, y) => {
      const off = Math.abs(x + 0.5 - MID) - beam(y)
      const lit = Math.max(0, 1 - off / 16)
      const billow = noise(x * 0.8, y, 7, 7) * 0.5 + noise(x, y, 13, 3) * 0.12
      return 0.08 + billow + lit * lit * 0.5 - y / 400
    },
    0.6,
  )
  // the column itself: white at its heart, gold towards its edges, which fray into the clouds
  const column = p.m()
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const off = Math.abs(x + 0.5 - MID) / beam(y)
      if (off < 1 + (noise(x, y, 3, 2.5) - 0.5) * 0.25) column.add(x, y)
    }
  p.dither(
    column,
    LIGHT,
    (x, y) => {
      const off = Math.abs(x + 0.5 - MID) / beam(y)
      const streak = Math.sin(x * 1.3 + Math.sin(y * 0.05) * 2) * 0.06
      return 1.15 - off * 0.85 + streak
    },
    0.5,
  )
  // a pool of light on the ground where the column lands
  const pool = p.m().ellipse(MID, 87, 30, 5)
  p.dither(pool, LIGHT, (x, y) => 1 - Math.hypot((x - MID) / 30, (y - 87) / 5) * 0.8, 0.5)
  p.shine(false)
}

/** A face-down card as it dissolves: a pale rim, a dark back with an oval, its top corner gone to light. */
const CARD_GRID = ['..g..', 'gg.gg', 'gbbbg', 'gbobg', 'gbobg', 'gbbbg', 'ggggg']

/** At his feet: a crouching monster and three cards crumbling into motes of light. */
function judged(p: Painter): void {
  const m = (): Mask => p.m()
  const beast = m()
    .ellipse(64, 83, 7, 4, -8)
    .disc(58.5, 79, 3.4)
    .limb([56.5, 77, 54, 72.5], [1.2, 0.5])
    .limb([60, 76.5, 60.5, 72], [1.2, 0.5])
    .limb([60, 86, 58, 89], [1.4, 1.2])
    .limb([68, 86, 69, 89], [1.4, 1.2])
    .limb([70, 81, 75, 77, 75, 72], [1.5, 1, 0.5])
  // the light eats the beast from its back: there it has already crumbled, motes rise from it
  const gone = m()
  beast.each((x, y) => {
    if (noise(x, y, 5, 2) * 0.6 + (x - 62) / 14 + (78 - y) / 30 > 0.75) gone.add(x, y)
  })
  const body = beast.clone().minus(gone)
  p.fill(body, CLOUD[0])
  p.shine(true)
  p.fill(body.facing([-1, 0, 0, -1]), LIGHT[1])
  p.px(57, 79, LIGHT[3])
  const rand = rng(82)
  gone.each((x, y) => {
    if (rand() < 0.3) p.px(x, y - Math.floor(rand() * 6), rand() < 0.4 ? LIGHT[3] : LIGHT[1])
  })
  for (const [x, y] of [P(15, 77), P(22, 82), P(10, 66)]) {
    p.stamp(CARD_GRID, x - 2, y - 3, { g: LIGHT[1], b: CARD[0], o: CARD[1] })
    for (let k = 0; k < 5; k++)
      p.px(x - 2 + Math.floor(rand() * 5), y - 5 - Math.floor(rand() * 8), k % 2 === 0 ? LIGHT[3] : LIGHT[1])
  }
  p.shine(false)
}

/**
 * The elder's head, tilted back to the sky: white hair, a lined brow over sunken eyes, a strong nose
 * and a white moustache over the beard. h H = hair, S s d = skin light to dark, k = the eye sockets.
 */
const HEAD = [
  '..hhhhh..',
  '.hHHHHHh.',
  'hhsSSSshh',
  'hdkksskkh',
  'hdsSSSsdh',
  'hhdsSsddh',
  'hHHhshHHh',
  '.HHHHHHH.',
]
const HEAD_KEY = { h: BEARD[1], H: BEARD[2], S: SKIN[2], s: SKIN[1], d: SKIN[0], k: ROBE[0] }

/** The elder: a dark silhouette in the light, arms raised, the beard and the open palms aglow. */
function elder(d: Painter): void {
  const m = (): Mask => d.m()

  // the robe, seen from below: narrow shoulders, flaring wide to the ground
  const robe = m().poly([34, 42, 46, 42, 50, 52, 55, 70, 60, 87, 20, 87, 25, 70, 30, 52])
  d.part(robe, ROBE, { bevel: 8, bias: -1 })
  for (const fold of [
    [37, 52, 33, 70, 29, 86],
    [43, 52, 47, 70, 51, 86],
    [40, 60, 40, 86],
  ])
    d.fill(m().path(fold).and(robe.shrunk(1)), ROBE[0])
  d.part(m().rect(31, 58, 18, 2.4), LIGHT, { bevel: 1, bias: -1 })

  // wide sleeves on the raised arms, open palms at the top
  for (const flip of [1, -1]) {
    const x = (v: number): number => MID + (v - MID) * flip
    const sleeve = m().poly([x(35), 41, x(26), 24, x(20), 27, x(22), 33, x(31), 50])
    d.part(sleeve, ROBE, { bevel: 4, bias: flip > 0 ? -1 : -2 })
    const [hx, hy] = [x(23.5), 22]
    d.part(m().ellipse(hx, hy, 2.4, 2.6), SKIN)
    for (const deg of [-118, -100, -82, -64]) {
      const a = ((flip > 0 ? deg : -180 - deg) * Math.PI) / 180
      d.fill(
        m().line(hx + Math.cos(a) * 1.5, hy + Math.sin(a) * 1.5, hx + Math.cos(a) * 5, hy + Math.sin(a) * 5),
        SKIN[2],
      )
    }
    const thumb = ((flip > 0 ? -10 : -170) * Math.PI) / 180
    d.fill(m().line(hx, hy, hx + Math.cos(thumb) * 3.5, hy + Math.sin(thumb) * 3.5 - 1), SKIN[2])
  }

  // the head, tilted back to the sky; long white hair and a beard down to the belt
  d.part(m().poly([36, 30, 44, 30, 47, 44, 43, 41, 37, 41, 33, 44]), BEARD, { bevel: 2, bias: -1 })
  const beard = m().poly([35.5, 35, 44.5, 35, 45, 44, 42.5, 52, 40, 58, 37.5, 52, 35, 44])
  d.part(beard, BEARD, { bevel: 3 })
  for (const strand of [
    [38, 40, 38, 50],
    [42, 40, 42, 50],
  ])
    d.fill(m().path(strand).and(beard.shrunk(1)), BEARD[0])
  const face = d.layer().stamp(HEAD, 36, 28, HEAD_KEY)
  d.contact(face.mask()).blit(face)
}

export const solemnJudgment: CardDef = {
  id: 'ygo-mrd-082',
  number: 82,
  name: 'Feierliches Urteil',
  tier: 'ultra',
  kind: 'trap',
  sub: 'counter',
  text: 'Zahle halbe LP: Veto',
  // the clouds, the column of light, the motes and the dissolving cards shine; the elder stays matt
  foil: 'painted',
  draw(p) {
    storm(p)
    judged(p)
    const d = p.layer()
    elder(d)
    // the light behind him draws his outline: a bright rim round the dark figure
    p.subject(d, LIGHT[3])
  },
}
