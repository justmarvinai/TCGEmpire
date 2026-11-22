import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, pts, quad, rng, stars, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Pikachu (Rote Wangen), the Alternative of the Basis-Set. Brief: mouse close-up with bright red
 * cheeks sparking, cheeky wink, festival lanterns glowing behind. Classic art window, 68×48.
 *
 * Composition: the head fills the right two thirds, tilted towards the lanterns that hang on a
 * string in the upper left. Evening sky from indigo to a warm horizon, so the yellow face and the
 * red cheeks are the brightest things in the picture.
 */
const SKY = colors('191445', '33206c', '6a2b7c', 'b2447c', 'ee7a66')
const LAMP = colors('8a1a2e', 'd4352c', 'f77a2e', 'ffc94e', 'fff7bc')
const ROOF = colors('120e30', '241a4c')
const YELLOW = colors('8c4a22', 'cf8a20', 'f2b82e', 'fbd844', 'fff3a4')
const BLACK = colors('1c1420', '3c3448')
const RED = colors('a81a30', 'ea3a36', 'ff8f7c')
const MOUTH = colors('7a1e30', 'f28a94')
const WHITE = hex('fffdf0')
const OUTLINE = hex('2c1420')

/** Centre and tilt of the head; face features are placed relative to it. */
const HEAD: Pt = [40, 27.5]
const TILT = -8
const at = (dx: number, dy: number): Pt =>
  xf([[HEAD[0] + dx, HEAD[1] + dy]], { ox: HEAD[0], oy: HEAD[1], rot: TILT })[0] ?? HEAD
const cell = (dx: number, dy: number): Pt => {
  const [x, y] = at(dx, dy)
  return [Math.round(x), Math.round(y)]
}

/** A paper lantern with its glow on the evening air. */
function lantern(p: Painter, cx: number, cy: number, rx: number, ry: number): void {
  const body = p.m().ellipse(cx, cy, rx, ry)
  const halo = p.m().ellipse(cx, cy, rx + 5, ry + 5)
  p.tone(
    p
      .m()
      .ellipse(cx, cy, rx + 2.5, ry + 2.5)
      .minus(body),
    1,
  )
  halo.minus(body).each((x, y) => {
    if ((x + y) % 2 === 0) p.tone(p.m().add(x, y), 1)
  })
  p.fill(body, LAMP[1])
  p.fill(body.clone().minus(body.moved(-1, -1)), LAMP[0])
  p.fill(p.m().ellipse(cx - 0.3, cy - 0.2, rx - 1.2, ry - 1.4), LAMP[2])
  p.fill(p.m().ellipse(cx - 0.5, cy - 0.4, rx - 2.4, ry - 2.8), LAMP[3])
  if (rx >= 4) p.fill(p.m().ellipse(cx - 0.6, cy - 0.6, rx - 3.6, ry - 4.2), LAMP[4])
  // caps and tassel
  const cap = Math.max(2, Math.round(rx * 0.8))
  p.fill(p.m().rect(cx - cap / 2, cy - ry - 1, cap, 2), ROOF[0])
  p.fill(p.m().rect(cx - cap / 2, cy + ry - 1, cap, 2), ROOF[0])
  p.fill(p.m().rect(cx - 0.5, cy + ry + 1, 1, Math.max(1, Math.round(rx / 2))), LAMP[1])
}

function festival(p: Painter): void {
  p.shine(true)
  p.dither(null, SKY, (_x, y) => Math.pow(y / 47, 1.25) * 0.98, 0.8)
  p.register(SKY).register(LAMP)
  stars(p, rng(21), 9, [LAMP[4], SKY[3]], { x: 0, y: 0, w: 68, h: 14 })

  // string of lanterns sagging from the top left corner towards the ears
  const string = quad([-1, 1], [12, 9], [30, 0], 12)
  p.fill(p.m().path(string), ROOF[0])
  lantern(p, 8, 14, 5.5, 6.5)
  lantern(p, 20.5, 8, 3.5, 4)

  // lights of the stalls far away
  for (const [x, y] of pts([2, 31, 13, 34, 19, 29, 63, 33, 66, 27, 6, 37])) {
    p.px(x, y, LAMP[3])
      .px(x + 1, y, LAMP[2])
      .px(x - 1, y, LAMP[2])
      .px(x, y - 1, LAMP[2])
      .px(x, y + 1, LAMP[2])
  }
  p.shine(false)

  // roofs of the festival stalls
  const roofs = p.m().poly([0, 40, 5, 36, 11, 40, 15, 38, 21, 42, 26, 41, 26, 48, 0, 48])
  roofs.poly([56, 48, 58, 42, 62, 39, 66, 42, 68, 41, 68, 48])
  p.fill(roofs, ROOF[1])
  p.fill(roofs.clone().minus(roofs.moved(0, 1)), SKY[2])
  p.fill(roofs.clone().and(p.m().rect(0, 44, 68, 4)), ROOF[0])
}

/** Pointed ear from `base` to `tip`, `w` wide at its belly. */
function ear(d: Painter, base: Pt, tip: Pt, w: number): void {
  const len = Math.hypot(tip[0] - base[0], tip[1] - base[1])
  const u: Pt = [(tip[0] - base[0]) / len, (tip[1] - base[1]) / len]
  const n: Pt = [-u[1], u[0]]
  const along = (t: number, side: number): Pt => [
    base[0] + u[0] * len * t + n[0] * w * side,
    base[1] + u[1] * len * t + n[1] * w * side,
  ]
  const shape = d
    .m()
    .poly([
      ...quad(along(0, -0.45), along(0.42, -1.05), tip),
      ...quad(tip, along(0.42, 1.05), along(0, 0.45)),
    ])
  d.part(shape, YELLOW, { bevel: 3 })
  const tipMask = d
    .m()
    .disc(tip[0], tip[1], len * 0.42)
    .and(shape)
  d.shade(tipMask, BLACK, { bevel: 2 })
}

function mouse(d: Painter): void {
  const m = (): Mask => d.m()

  // lightning-bolt tail behind the right shoulder
  const tail = m().poly([52, 48, 57.5, 48, 60.5, 40, 55.5, 40])
  tail.poly([55.5, 42, 62.5, 42, 66, 32, 59.5, 32]).poly([58.5, 34.5, 68, 34.5, 68, 20, 62, 20])
  d.part(tail, YELLOW, { bevel: 3 })

  ear(d, at(-8, -8), at(-15, -27), 6.2)
  ear(d, at(9, -8), at(25, -19), 6.2)

  // shoulders and arms: one paw waves next to the cheek
  d.part(m().ellipse(41, 47, 12.5, 9.5), YELLOW)
  d.part(m().capsule(51.5, 43.5, 55, 47.5, 2.8, 2.6), YELLOW, { bevel: 2.5 })

  // head: skull and wider jowls as one shape
  const [sx, sy] = at(0, -1.5)
  const [jx, jy] = at(0, 2.6)
  const head = m().ellipse(sx, sy, 14.5, 10.5, TILT).ellipse(jx, jy, 16.5, 9.4, TILT)
  d.part(head, YELLOW)
  d.part(m().capsule(30.5, 44, 24.5, 39.5, 2.9, 3.1), YELLOW, { bevel: 2.8 })

  // red cheeks, the reason this card exists
  d.shine(true)
  for (const side of [-1, 1]) {
    const [cx, cy] = at(side * 12, 5.2)
    const cheek = m().disc(cx, cy, 4.1).and(head)
    d.fill(cheek, RED[1])
    d.fill(cheek.clone().minus(cheek.moved(-1, -1)), RED[0])
    d.fill(
      m()
        .disc(cx - 1.2, cy - 1.4, 1.5)
        .and(cheek),
      RED[2],
    )
  }
  d.shine(false)

  // face: one eye wide open, the other one winking
  const open = ['.kkk.', 'kwwkk', 'kwwkk', 'kkkkk', 'kkkkk', '.kkk.']
  const [ex, ey] = cell(-8.5, -2)
  d.stamp(open, ex - 2, ey - 3, { k: BLACK[0], w: WHITE })
  const wink = ['..kkk..', '.kk.kk.', 'kk...kk', 'k.....k']
  const [wx, wy] = cell(8.5, -1.5)
  d.stamp(wink, wx - 3, wy - 2, { k: BLACK[0] })
  const [nx, ny] = cell(0, 0.8)
  d.px(nx, ny, BLACK[0]).px(nx - 1, ny, BLACK[0])
  const grin = ['k.......k', '.kkkkkkk.', '.krrrrrk.', '..krttk..', '...kkk...']
  const [gx, gy] = cell(0.5, 3.4)
  d.stamp(grin, gx - 4, gy, { k: YELLOW[0], r: MOUTH[0], t: MOUTH[1] })
}

/** Sparks jumping off the cheeks. */
function charge(p: Painter): void {
  const big = ['.....y', '....y.', '..yyy.', '..y...', '.y....', 'y.....']
  const small = ['...y', '.yy.', '.y..', 'y...']
  const spark = (grid: readonly string[], x: number, y: number, flip: boolean) => {
    const shape = p.layer().stamp(grid, x, y, { y: LAMP[4] }, flip)
    p.fill(shape.mask().moved(1, 1), YELLOW[0])
    p.blit(shape)
  }
  spark(big, 16, 24, true)
  spark(small, 17, 32, true)
  spark(small, 57, 22, false)
  for (const [x, y] of pts([14, 31, 23, 27, 59, 28, 56, 19])) p.px(x, y, LAMP[4])
}

export const pikachuRoteWangen: CardDef = {
  id: 'pkm-base-084',
  number: 84,
  name: 'Pikachu',
  tier: 'alternative',
  kind: 'pokemon',
  type: 'Elektro',
  hp: 40,
  attacks: [
    { name: 'Nagen', cost: ['Farblos'], damage: '10' },
    { name: 'Donnerschock', cost: ['Elektro', 'Farblos'], damage: '30' },
  ],
  // sky, lanterns, cheeks and sparks shine; the mouse and the roofs stay matt
  foil: 'painted',
  draw(p) {
    festival(p)
    const d = p.layer()
    mouse(d)
    p.subject(d, OUTLINE)
    p.shine(true)
    charge(p)
    p.shine(false)
  },
}
