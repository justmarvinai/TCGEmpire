import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, quad, rng, sparks, spline, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Vulkanwolf (Ultra, Glut). Brief: a charcoal-black wolf, its fur cracked with glowing lava, howling
 * on a volcanic ridge; embers rise into an orange-red sky. Full art, 80×112.
 *
 * Composition: the wolf sits on the crest of a basalt ridge, side on and facing right, head thrown
 * back in a howl. A volcano erupts far behind on the left, so the brightest sky sits behind the
 * wolf's back and the dark body reads against it; the ridge breaks off on the right above a valley
 * of lava rivers. The frame's plates cover rows 4–14 and 91–106, so the head sits at rows 16–40.
 */
const SKY = colors('2a0818', '4c0e1e', '78161e', 'a62818', 'd04a1a', 'f07e26', 'ffb84c')
const ASH = colors('1e0a12', '34121a', '521c1e')
const DUSK = colors('2a1026', '46182e')
const ROCK = colors('0c0608', '1c0e10', '30171a', '4e2622')
const FUR = colors('0a080c', '17131a', '241e24', '382e30', '5a4844')
const LAVA = colors('6e1a10', 'd8481a', 'ffa030', 'ffec90')
const OUTLINE = hex('080406')

const P = (x: number, y: number): Pt => [x, y]

function sky(p: Painter): void {
  // orange-red sky: deep red at the top, glowing towards the horizon and round the crater on the left
  p.dither(
    null,
    SKY,
    (x, y) => {
      const down = Math.pow(Math.min(1, Math.max(0, (y - 4) / 78)), 1.2) * 0.8 + 0.08
      const crater = Math.max(0, 1 - Math.hypot((x - 15) * 0.75, y - 55) / 36) * 0.7
      return Math.max(down, crater, Math.min(1, down + crater * 0.4)) + (noise(x, y, 4, 6) - 0.5) * 0.08
    },
    0.7,
  )
}

function volcano(p: Painter): void {
  // the ash plume billows up from the crater and leans off to the left; every puff is lit from below
  // by the eruption, so its ramp runs from the glow (shadow side) to dark ash (top left)
  const underlit = [SKY[4], SKY[3], ASH[2], ASH[1]]
  for (const [x, y, rx, ry, seed] of [
    [3, 16, 8, 6.5, 4],
    [12, 21, 7, 5.5, 3],
    [4, 27, 6.5, 5.5, 5],
    [14, 31, 6, 5, 2],
    [9, 37, 5, 4.5, 6],
    [17, 42, 4.5, 4, 1],
    [14, 47, 3.5, 3, 8],
  ] as const)
    p.shade(p.m().blob(x, y, rx, ry, seed, 0.2), underlit, { bevel: 3 })

  // the cone far behind on the left, a lava fountain in the crater, streams running down its flanks
  const cone = p.m().poly([0, 62, 8, 57, 14, 52, 22, 52, 28, 56, 36, 62, 46, 70, 56, 78, 0, 82])
  p.fill(cone, SKY[2])
  p.fill(cone.clone().minus(cone.moved(1, 1)), SKY[4])
  for (const s of [
    [15, 53, 13, 57, 14, 61, 11, 66, 12, 72, 9, 78],
    [21, 53, 24, 58, 23, 63, 28, 68, 30, 76],
  ]) {
    const stream = p.m().path(spline(s, 3)).and(cone)
    p.fill(stream.moved(1, 0).and(cone).minus(stream), SKY[3])
    p.fill(stream, LAVA[1])
  }
  fire(p, flameMask(p, 18, 54, 8, 14, { lean: -1, tongues: 2, seed: 7 }), LAVA.slice(1))
  const arcs = [quad(P(15, 45), P(8, 34), P(4, 47), 7), quad(P(21, 44), P(28, 33), P(33, 45), 7)]
  for (const arc of arcs) arc.slice(2).forEach(([x, y], i) => p.px(Math.round(x), Math.round(y), i % 2 ? LAVA[1] : LAVA[2]))

  // a distant range on the right with a lava river winding through its valley
  const range = p.m().poly([40, 74, 48, 68, 55, 70, 63, 64, 70, 67, 76, 63, 80, 64, 80, 112, 40, 112])
  p.fill(range, DUSK[0])
  p.fill(range.clone().minus(range.moved(2, 2)), DUSK[1])
  p.fill(range.facing([0, -1]), SKY[3])
  const river = p.m().path(spline([57, 73, 62, 75, 66, 78, 65, 82, 68, 86, 74, 90], 4)).and(range)
  p.fill(river.moved(-1, 0).or(river.moved(1, 0)).and(range).minus(river), LAVA[0])
  p.fill(river, LAVA[2])
}

/** The basalt ridge the wolf sits on: it rises from the left and breaks off on the right. */
function ridge(p: Painter): void {
  const rock = p.m().poly([0, 88, 10, 86.5, 20, 85, 30, 84.5, 44, 84, 54, 84.5, 59, 86, 62, 89, 63, 96, 66, 112, 0, 112])
  p.register(ROCK)
  p.fill(rock, ROCK[1])
  p.fill(rock.clone().and(rock.moved(0, 2)).minus(rock.moved(0, 3)), ROCK[2])
  p.fill(rock.facing([0, -1]), ROCK[3])
  p.fill(rock.facing([1, 0]), ROCK[2])
  // glowing seams in the rock
  for (const c of [
    [4, 89, 9, 92, 8, 97],
    [24, 87, 28, 90, 27, 95, 32, 99],
    [47, 87, 51, 90, 57, 93],
  ]) {
    const crack = p.m().path(c).and(rock.shrunk(1))
    p.fill(crack.moved(0, 1).and(rock).minus(crack), LAVA[0])
    p.fill(crack, LAVA[1])
  }
}

/** Little triangles of fur along a line, pointing in (dx, dy). */
function tufts(m: Mask, from: Pt, to: Pt, n: number, dx: number, dy: number, size = 2.2): Mask {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = from[0] + (to[0] - from[0]) * t
    const y = from[1] + (to[1] - from[1]) * t
    const ax = (to[0] - from[0]) / Math.hypot(to[0] - from[0], to[1] - from[1])
    const ay = (to[1] - from[1]) / Math.hypot(to[0] - from[0], to[1] - from[1])
    m.poly([x - ax * size, y - ay * size, x + dx, y + dy, x + ax * size * 0.6, y + ay * size * 0.6])
  }
  return m
}

function wolf(d: Painter): void {
  const m = (): Mask => d.m()

  // far legs first, a step darker
  d.part(m().limb([38, 58, 37.5, 70, 37.5, 80.5], [3.4, 2.7, 2.3]).ellipse(39, 81.5, 3, 1.6), FUR, { bevel: 3, bias: -1 })

  // bushy tail lying along the ridge behind
  const tail = m().limb([22, 75, 14, 80, 8, 81.5, 2.5, 79], [4.2, 4.6, 3.4, 1.4])
  tufts(tail, P(20, 74), P(5, 77), 4, -2.5, -2.6, 2)
  tufts(tail, P(18, 84), P(6, 84), 3, -2.5, 1.6, 1.6)
  d.part(tail, FUR, { bevel: 3 })

  // body rising from the haunch to the shoulders, hackles along the back of the neck
  const body = m().limb([27, 71, 31.5, 58, 37, 46], [9.5, 9, 7.8]).ellipse(43, 54, 7, 9, -10)
  tufts(body, P(38, 33), P(22, 58), 6, -3.8, -1.6, 2.6)
  d.part(body, FUR, { bevel: 5 })

  // the near haunch, with a fringe of fur at the back, and the hind foot
  const haunch = m().ellipse(25.5, 71, 9, 10.5, -18)
  tufts(haunch, P(18, 64), P(17, 79), 3, -2.4, 1.2, 1.8)
  d.part(haunch, FUR, { bevel: 5 })
  d.part(m().limb([29, 79.5, 35, 81.5], [2.8, 2.4]).ellipse(37, 82, 3.2, 1.7), FUR, { bevel: 3 })

  // the near front leg, straight and braced, under a rounded shoulder
  d.part(m().limb([43, 59, 43.5, 70, 44, 81], [4, 3, 2.5]).ellipse(45.5, 82, 3.4, 1.7), FUR, { bevel: 3 })
  d.part(m().ellipse(40.5, 54, 5.5, 7.5, 12), FUR, { bevel: 4, line: 'shadow' })

  // neck stretched up; three big locks of the ruff hang off the chest
  const neck = m().limb([35, 48, 40.5, 38, 46, 31], [7.6, 6.6, 5.8])
  for (const [x, y] of [
    [48, 38],
    [48.5, 43],
    [48, 48],
  ] as const)
    neck.poly([x - 3, y - 2.5, x + 2.5, y + 2.5, x - 2, y + 2])
  d.part(neck, FUR, { bevel: 4 })
  // locks of fur running down the neck: dark in the shade, light where the glow catches them
  for (const l of [
    [44, 35, 42, 40, 42.5, 44],
    [39, 41, 37.5, 45],
    [47.5, 37, 46.5, 41],
  ])
    d.fill(m().path(spline(l, 2)).and(neck.shrunk(1)), FUR[1])
  for (const l of [
    [37, 41, 35, 45],
    [40, 37, 38.5, 40],
  ])
    d.fill(m().path(spline(l, 2)).and(neck.shrunk(1)), FUR[3])

  head(d)
}

/** The head has its own frame (origin under the ear, scale) so its size can be tuned against the body. */
const HEAD = { ox: 46, oy: 30, scale: 1.15 }
const h = (...xy: number[]): Pt[] => xf(xy, HEAD)
const at = (x: number, y: number): Pt => h(x, y)[0] ?? P(x, y)

/** Thrown back in the howl: ears laid flat, the lower jaw dropped, the mouth glowing like a furnace. */
function head(d: Painter): void {
  const m = (): Mask => d.m()
  const s = HEAD.scale
  d.part(m().poly(h(42, 25.5, 38, 16.5, 46, 22.5)), FUR, { bevel: 2, bias: -1 })
  const mouth = m().poly(h(50, 26.5, 59, 17, 58.5, 26.5, 49.5, 29))
  d.fill(mouth, LAVA[1])
  d.fill(m().poly(h(50, 27.5, 55.5, 22, 55.5, 26.5)).and(mouth), LAVA[2])
  d.part(m().poly(h(47, 30, 50, 28.5, 57.5, 25.5, 59, 26.5, 58, 28.5, 51, 32.5, 47, 33.5)), FUR, { bevel: 2, bias: -1 })
  const [cx, cy] = at(46.5, 29)
  const skull = m()
    .ellipse(cx, cy, 5.6 * s, 5 * s, -30)
    .poly(h(45, 24, 55.5, 15, 58.5, 15.5, 59, 17.5, 50.5, 26.5, 47.5, 29.5))
    .poly(h(42, 30, 46, 31, 44, 36.5))
  d.part(skull, FUR, { bevel: 3 })
  d.part(m().poly(h(42.5, 28, 39.5, 18, 47.5, 24.5)), FUR, { bevel: 2 })
  d.fill(m().poly(h(43.5, 25.5, 41.5, 20.5, 45.5, 24)), FUR[0])

  // fangs in the glowing mouth, the hottest point deep in the throat, a burning slit of an eye under a
  // dark brow, the nose
  const dot = (x: number, y: number, c: number) => {
    const [px, py] = at(x, y)
    d.px(Math.round(px - 0.5), Math.round(py - 0.5), c)
  }
  dot(56.5, 20.5, LAVA[3])
  dot(58.5, 25, LAVA[3])
  dot(51.5, 27.5, LAVA[3])
  const [ex, ey] = at(47, 25)
  d.stamp(['kkk.', '.yww'], Math.round(ex - 1.5), Math.round(ey - 1.5), { k: FUR[0], y: LAVA[2], w: LAVA[3] })
  const [nx, ny] = at(58.5, 16)
  d.stamp(['.kk', 'kkk'], Math.round(nx - 2), Math.round(ny - 1.5), { k: OUTLINE })
}

/** Cracks of glowing lava in the fur, following the form: an ember-red halo, an orange seam, hot spots. */
function lava(d: Painter): void {
  // the eruption behind backlights the top and left edges of the body with a hot rim
  const body = d.mask()
  d.fill(body.facing([-1, 0, 0, -1]).minus(d.m().rect(36, 0, 44, 40)), LAVA[0])
  // and the lava in the valley catches the front of the chest and the near leg
  d.fill(body.facing([1, 0]).and(d.m().rect(44, 46, 12, 36)), LAVA[0])
  const inner = body.shrunk(1)
  const seams = d.m()
  for (const l of [
    [17, 64, 21, 66, 22, 70, 25, 74, 24, 78],
    [22, 70, 27, 68],
    [29, 50, 32, 54, 31, 59],
    [32, 54, 36, 55],
    [43, 63, 42, 68, 44, 73],
    [12, 80, 8, 81],
  ])
    seams.path(spline(l, 2))
  seams.and(inner)
  d.fill(seams.moved(1, 0).or(seams.moved(0, 1)).and(inner).minus(seams), LAVA[0])
  d.fill(seams, LAVA[1])
  for (const [x, y] of [
    [22, 70],
    [32, 54],
    [42, 68],
  ] as const)
    d.px(x, y, LAVA[2])
}

export const vulkanwolf: CardDef = {
  id: 'emp1-016',
  number: 16,
  name: 'Vulkanwolf',
  tier: 'ultra',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    sky(p)
    volcano(p)
    ridge(p)
    const d = p.layer()
    wolf(d)
    lava(d)
    // the wolf is drawn 3 px higher than it sits, clear of the name plate
    p.subject(p.layer().blit(d, 0, 3), OUTLINE)
    sparks(p, rng(9), 30, [LAVA[1], LAVA[2], LAVA[3]], { x: 4, y: 16, w: 72, h: 66 })
  },
}
