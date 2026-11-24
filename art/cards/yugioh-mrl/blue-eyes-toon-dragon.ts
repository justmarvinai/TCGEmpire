import type { Mask, Painter, Pt, RGB } from '../../toolkit/index.ts'
import { colors, hex, quad, rays } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Blauäugiger Toon-Drache, the Grail of MRL. Brief: the white dragon as a goofy cartoon bursting out
 * of an open pop-up book towards the viewer: rubbery neck, huge sparkly blue eyes, a wide grin with
 * the tongue out, little wings flapping inside motion lines; clouds, starbursts and paper scraps on a
 * bright yellow sky. Full art, 80×112.
 *
 * Toon look: flat fills with one shadow step, thick ink outlines, exaggerated eyes, so it reads as the
 * cartoon twin of the LOB Grail. Composition: the book lies open across the bottom, torn at the
 * gutter; the dragon's belly bursts out of it and its neck bends up in an S to a big head that leans
 * out to the left over the reader, grinning. Rays burst from behind it. Text plates float over rows
 * 0–13 and 90–111.
 */
const INK = hex('1c1634')
const SKY = colors('f5b81e', 'ffd83c', 'ffeb8e')
const WHITE = colors('b8cdf0', 'ffffff')
/** Wing membranes: pale blue with a deeper blue shadow. */
const WING = colors('7c9ce2', 'b8cdf0')
const BLUE = colors('1e5ad8', '5ab6ff')
const RED = colors('b4182e', 'ee3a3a')
const TONGUE = colors('d0365a', 'ff7a96')
const MOUTH = hex('6e1830')
const PAGE = colors('e2cc9c', 'fff7e0')
const ORANGE = hex('ff8a1c')

const P = (x: number, y: number): Pt => [x, y]

/** Toon fill: ink line round the part, a flat fill, one shadow step along its lower right. */
function toon(d: Painter, m: Mask, ramp: readonly [RGB, RGB], depth = 2): void {
  d.fill(m.outerEdge(), INK)
  d.fill(m, ramp[1])
  d.fill(m.clone().minus(m.moved(-depth, -depth)), ramp[0])
}

/** A cartoon starburst: a spiky star with an ink rim. */
function burst(p: Painter, cx: number, cy: number, r: number, points: number, fill: RGB, turn = 0): void {
  const outline: Pt[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = ((i + turn) / (points * 2)) * Math.PI * 2
    const k = i % 2 === 0 ? r : r * 0.5
    outline.push(P(cx + Math.cos(a) * k, cy + Math.sin(a) * k))
  }
  const star = p.m().poly(outline)
  p.fill(star.outerEdge(), INK)
  p.fill(star, fill)
}

/** A puffy cartoon cloud: three lumps on a flat base. */
function cloud(p: Painter, x: number, y: number, w: number): void {
  const c = p
    .m()
    .ellipse(x + w * 0.3, y, w * 0.3, w * 0.22)
    .ellipse(x + w * 0.58, y - w * 0.12, w * 0.3, w * 0.28)
    .ellipse(x + w * 0.82, y + w * 0.02, w * 0.22, w * 0.18)
    .rect(x + w * 0.1, y, w * 0.85, w * 0.16)
  p.fill(c.outerEdge(), INK)
  p.fill(c, WHITE[1])
  p.fill(c.clone().minus(c.moved(0, -2)), WHITE[0])
}

/** A flying scrap of paper: a tilted page corner with two scribbled lines. */
function scrap(p: Painter, x: number, y: number, tilt: number): void {
  const s = p.m().poly([x, y, x + 7, y + tilt, x + 6 + tilt, y + 6 + tilt, x - 1 + tilt, y + 5])
  p.fill(s.outerEdge(), INK)
  p.fill(s, PAGE[1])
  for (const dy of [2, 4]) p.fill(p.m().line(x + 1, y + dy, x + 5, y + dy + tilt * 0.6).and(s.shrunk(1)), PAGE[0])
}

function sky(p: Painter): void {
  p.shine(true)
  p.fill(p.m().rect(0, 0, 80, 112), SKY[1])
  p.fill(rays(p, 40, 46, 11, 0.01), SKY[2])
  // halftone dots darkening the corners, the way a printed comic shades its sky
  for (let y = 0; y < 112; y += 3) {
    for (let x = (y / 3) % 2 === 0 ? 0 : 1.5; x < 80; x += 3) {
      const r = Math.hypot((x - 40) / 40, (y - 46) / 60)
      if (r > 0.95) p.set(Math.round(x), y, SKY[0])
      if (r > 1.15) p.set(Math.round(x) + 1, y, SKY[0])
    }
  }
  burst(p, 69, 22, 8, 8, RED[1], 0.5)
  burst(p, 69, 22, 4, 8, SKY[2], 0.5)
  burst(p, 8, 40, 6.5, 7, BLUE[1])
  burst(p, 8, 40, 3.2, 7, ORANGE)
  // sparkles
  for (const [x, y] of [P(12, 19), P(59, 41), P(15, 49), P(74, 55)])
    p.stamp(['.w.', 'www', '.w.'], x - 1, y - 1, { w: WHITE[1] })
  p.shine(false)
  cloud(p, 64, 41, 15)
  cloud(p, 1, 69, 14)
  scrap(p, 22, 15, 1)
  scrap(p, 3, 23, -2)
}

/** The eyes, hand-pixelled: big white ovals, blue irises looking at the reader, sparkles. */
const EYE = [
  '..kkkkk..',
  '.kwwwwwk.',
  'kwwwwwwwk',
  'kwwBBBBwk',
  'kwBbbbbBk',
  'kwBsspbBk',
  'kwBsppbBk',
  'kwBpppsBk',
  'kwBbbbbBk',
  '.kwBBBBk.',
  '..kkkkk..',
]
const EYE_KEY = { k: INK, w: WHITE[1], B: BLUE[0], b: BLUE[1], p: INK, s: WHITE[1] }

/** Root and tip of each little wing (left, right). */
const WINGS = [
  [P(36, 63), P(17, 56)],
  [P(46, 62), P(63, 49)],
] as const

function dragon(d: Painter): void {
  const m = (): Mask => d.m()
  const W = [WHITE[0], WHITE[1]] as const

  // little wings flapping up behind the shoulders, scalloped like the LOB dragon's, much smaller
  for (const s of [-1, 1]) {
    const [root, tip] = WINGS[s < 0 ? 0 : 1] ?? [P(0, 0), P(0, 0)]
    const along = (t: number, k: number): Pt =>
      P(root[0] + (tip[0] - root[0]) * t + s * k * 0.6, root[1] + (tip[1] - root[1]) * t + Math.abs(k))
    const wing = m().poly([
      root,
      ...quad(root, P((root[0] + tip[0]) / 2, tip[1] - 2), tip, 6),
      ...quad(tip, along(0.85, 3), along(0.78, 7), 4),
      ...quad(along(0.78, 7), along(0.6, 5), along(0.5, 9), 4),
      ...quad(along(0.5, 9), along(0.3, 6), along(0.15, 7), 4),
    ])
    toon(d, wing, WING)
    d.fill(m().path(quad(root, P((root[0] + tip[0]) / 2, tip[1] - 2), tip, 6)).grown(1).and(wing), WHITE[1])
  }

  // the belly bursting out of the book, with plates
  const belly = m().ellipse(40, 73, 12, 10)
  toon(d, belly, W)
  for (const y of [67, 71, 75]) d.fill(m().path(quad(P(33, y), P(40, y + 2), P(47, y))).and(belly.shrunk(1)), WHITE[0])

  // the rubbery neck: an S from the chest up to the back of the head
  const neck = m().limb([40, 65, 47, 58, 49, 51, 46, 44], [5, 4.4, 4.2, 4.6])
  toon(d, neck, W)
  for (const [x0, y0, x1, y1] of [
    [37, 62, 42, 64],
    [42, 55, 47, 57],
    [44, 49, 48, 51],
  ] as const)
    d.fill(m().line(x0, y0, x1, y1).and(neck.shrunk(1)), WHITE[0])

  // the open book across the bottom: red covers, two page blocks bulging up, a pop-up tower, the gutter torn open
  const cover = m().poly([1, 86, 39, 90, 41, 90, 79, 86, 79, 100, 1, 100])
  toon(d, cover, [RED[0], RED[1]])
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + s * v
    const page = m().poly([P(x(1), 81), ...quad(P(x(1), 81), P(x(20), 70), P(x(37), 80), 8), P(x(38), 87), P(x(1), 90)])
    toon(d, page, [PAGE[0], PAGE[1]])
    for (const dy of [4, 7]) d.fill(m().path(quad(P(x(6), 79 + dy), P(x(20), 71 + dy), P(x(32), 79 + dy), 8)).and(page.shrunk(1)), PAGE[0])
    d.fill(m().line(x(37), 84, x(2), 87).and(page), PAGE[0])
  }
  const tower = m().rect(64, 68, 7, 10)
  toon(d, tower, [PAGE[0], PAGE[1]], 1)
  toon(d, m().poly([62.5, 68, 67.5, 59, 72.5, 68]), [RED[0], RED[1]], 1)
  d.stamp(['k', 'k'], 67, 71, { k: INK })
  for (const flap of [
    [28, 80, 31, 71, 35, 79],
    [45, 79, 50, 70, 52, 80],
    [36, 81, 39, 75, 42, 81],
  ])
    toon(d, m().poly(flap), [PAGE[0], PAGE[1]], 1)
  toon(d, m().poly([56, 88, 59, 88, 59, 97, 57.5, 95, 56, 97]), [BLUE[0], BLUE[1]], 1)
  // stubby arms push down on the pages, hauling the dragon out of the book
  for (const s of [-1, 1]) {
    toon(d, m().limb([40 + s * 9, 70, 40 + s * 14, 72, 40 + s * 17, 76], [2.8, 2.5, 2.3]), W)
    const hand = m().ellipse(40 + s * 18, 77.5, 3.2, 2.4)
    toon(d, hand, W, 1)
    for (const k of [-1, 0, 1]) d.px(Math.round(40 + s * 18 + k * 2), 79, INK)
  }

  // the head: big round skull, long snout leaning out to the left, two horns swept back
  for (const [pts, r] of [
    [[55, 28, 62, 24, 68, 23, 72, 19], [3.2, 2.4, 1.4, 0.6]],
    [[57, 34, 64, 33, 70, 35, 74, 33], [2.8, 2.1, 1.2, 0.5]],
  ] as const)
    toon(d, m().limb(pts, r), W, 1)
  const skull = m().ellipse(46, 32, 12, 10.5)
  const snout = m().poly([P(20, 30), ...quad(P(20, 30), P(30, 25), P(40, 26), 6), P(44, 38), ...quad(P(36, 41), P(24, 41), P(16, 37), 6), ...quad(P(16, 37), P(13, 33), P(20, 30), 4)])
  const jaw = m().poly([P(19, 42), ...quad(P(19, 42), P(30, 54), P(47, 43), 8), P(47, 39), P(24, 41)])
  toon(d, jaw, W)
  toon(d, skull.clone().or(snout), W)
  // the grin: a dark mouth curving up to the cheek, a row of teeth, the tongue lolling out to the left
  const mouth = m().poly([P(20, 41), ...quad(P(20, 41), P(32, 44), P(46, 38), 6), ...quad(P(46, 38), P(34, 51), P(22, 44), 8)])
  d.fill(mouth.outerEdge().and(jaw.or(skull).or(snout)), INK)
  d.fill(mouth, MOUTH)
  const tongue = m().limb([33, 47, 25, 49, 18, 52, 14, 51], [2.6, 2.4, 2.2, 1.8])
  toon(d, tongue, [TONGUE[0], TONGUE[1]], 1)
  d.fill(m().line(30, 48, 22, 50).and(tongue), TONGUE[0])
  for (const x of [23, 27, 31, 35, 39]) d.stamp(['w', 'w'], x, 42 - Math.round(Math.max(0, x - 30) / 5), { w: WHITE[1] })
  // the nostril
  d.stamp(['kk'], 17, 32, { k: INK })
  // the eyes on top of the head, huge and goofy
  d.stamp(EYE, 31, 18, EYE_KEY)
  d.stamp(EYE, 41, 17, EYE_KEY)
}

/** Motion lines: two short arcs outside each flapping wing tip. */
function motion(p: Painter): void {
  for (const s of [-1, 1]) {
    const [[rx, ry], [tx, ty]] = WINGS[s < 0 ? 0 : 1] ?? [P(0, 0), P(0, 0)]
    const reach = Math.hypot(tx - rx, ty - ry)
    const aim = Math.atan2(ty - ry, tx - rx)
    for (const [dr, span] of [
      [3, 0.2],
      [6, 0.14],
    ] as const) {
      const arc = p.m()
      for (let t = -span; t <= span; t += 0.005)
        arc.add(Math.round(rx + Math.cos(aim + t) * (reach + dr)), Math.round(ry + Math.sin(aim + t) * (reach + dr)))
      p.fill(arc.minus(p.subjectMask), INK)
    }
  }
}

export const blueEyesToonDragon: CardDef = {
  id: 'ygo-mrl-080',
  number: 80,
  name: 'Blauäugiger Toon-Drache',
  tier: 'grail',
  kind: 'monster',
  element: 'LICHT',
  sub: 'effect',
  print: { level: 8, atk: 3000, def: 2500, type: 'Drache/Toon' },
  // the sky with its rays, starbursts and sparkles shines; dragon, book, clouds and scraps stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    const d = p.layer()
    dragon(d)
    p.subject(d, INK)
    motion(p)
  },
}
