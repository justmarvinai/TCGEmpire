import type { Mask, Painter } from '../../toolkit/index.ts'
import { hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Sogeking (Manga-Art), the Grail of OP-03. Brief: a black-and-white manga page; the masked sniper
 * kneels on the edge of a rooftop, cape snapping, the sun mask with its long nose in profile, a
 * giant slingshot drawn to the cheek, a flaming shot just gone; across the chasm a huge banner on a
 * tower catches fire. One inset: the mask in close-up, a drop of sweat running out from under it.
 * Full art, 80×112, strictly black, white and four greys.
 */
const INK = hex('14121a')
const DARK = hex('46424e')
const TONE = hex('8c8792')
const LIGHT = hex('cdc7c8')
const PAPER = hex('f4eee0')
const WHITE = hex('fffcf3')

const GREY = [INK, DARK, TONE, LIGHT, PAPER, WHITE]
const GOLD = [INK, LIGHT, PAPER, WHITE]
const CAPE = [INK, DARK, TONE]
const CLOTH = [INK, DARK, TONE, LIGHT]
const SKIN = [INK, TONE, LIGHT, PAPER]
const INKS = { k: INK, d: DARK, t: TONE, l: LIGHT, s: PAPER, w: WHITE }

/** Where the shot flies: from the slingshot's fork to the banner. */
const FROM = { x: 48, y: 35 }
const TO = { x: 62, y: 29 }

/** Screentone dots: a staggered lattice of single dots that fills in towards a 50 % checkerboard. */
function dot(x: number, y: number, density: number): boolean {
  if (density > 0.3) return (x + y) % 2 === 0 && (density > 0.4 || y % 2 === 0 || x % 4 === 1)
  if (density > 0.18) return x % 2 === 0 && y % 2 === 0
  if (density > 0.06) return (x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)
  return false
}

/** A tapered stroke through [x, y, radius] triples: flame tongues, the tail of the shot. */
function stroke(m: Mask, s: readonly number[]): Mask {
  const pts: number[] = []
  const radii: number[] = []
  for (let i = 0; i + 2 < s.length; i += 3) {
    pts.push(s[i] ?? 0, s[i + 1] ?? 0)
    radii.push(s[i + 2] ?? 1)
  }
  return m.limb(pts, radii)
}

/** Sun rays round a disc: pointed triangles from angle `from` to `to` (radians, y down), `half` wide at the root. */
function rays(m: Mask, cx: number, cy: number, inner: number, outer: number, n: number, from: number, to: number, half = 0.2): Mask {
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * i) / Math.max(1, n - 1)
    const at = (r: number, da: number) => [cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r]
    m.poly([...at(inner, -half), ...at(outer, 0), ...at(inner, half)])
  }
  return m
}

/** A panel cut into the page: white gutter, ink border; returns its inside. */
function panel(p: Painter, x: number, y: number, w: number, h: number): Mask {
  const inner = p.m().rect(x, y, w, h)
  p.fill(inner.grown(3), WHITE)
  p.fill(inner.grown(1), INK)
  return inner
}

/** Sky in screentone, darker overhead; speed lines along the line of the shot. */
function sky(p: Painter): void {
  p.clear(PAPER)
  for (let y = 0; y < 112; y++)
    for (let x = 0; x < 80; x++) if (dot(x, y, 0.5 - y * 0.006)) p.set(x, y, y < 30 && (x + y) % 4 === 0 ? TONE : LIGHT)
  const dx = TO.x - FROM.x
  const dy = TO.y - FROM.y
  const len = Math.hypot(dx, dy)
  const rand = rng(9)
  for (let i = 0; i < 26; i++) {
    const off = (rand() - 0.5) * 110
    const at = rand() * 90 - 70
    const sx = FROM.x - (dy / len) * off + (dx / len) * at
    const sy = FROM.y + (dx / len) * off + (dy / len) * at
    const l = 10 + rand() * 24
    p.fill(p.m().path([sx, sy, sx + (dx / len) * l, sy + (dy / len) * l]), i % 3 === 0 ? INK : TONE)
  }
}

/** The tower across the chasm, the huge banner on it burning from its lower corner. */
function tower(p: Painter): void {
  const m = (): Mask => p.m()
  const wall = m().poly([67, 0, 80, 0, 80, 112, 68, 112])
  p.fill(wall, TONE)
  wall.each((x, y) => {
    if (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 4) % 8 === 0) p.set(x, y, DARK)
  })
  p.fill(wall.facing([-1, 0]), INK)
  p.fill(m().rect(71, 44, 3, 6), INK)
  // chasm: below the roof's edge everything falls away into black
  const gap = m().poly([47, 56, 66, 50, 66, 112, 47, 112])
  gap.each((x, y) => p.set(x, y, dot(x, y, 0.16 + (y - 50) * 0.02) ? INK : DARK))
  // black smoke pouring up from the burning corner, driven off by the wind
  const smoke = m().disc(60, 41, 4.5).disc(56, 33, 5).disc(53, 24, 5.5).disc(55, 14, 5.5).disc(59, 5, 5).disc(49, 6, 4)
  p.fill(smoke, INK)
  smoke.clone().minus(smoke.moved(1, -2)).each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, DARK)
  })
  // the banner on its pole, its lower corner burnt away to a charred edge
  p.fill(m().rect(59, 11, 9, 2), INK)
  const cloth = m()
    .poly([61, 13, 74, 13, 74, 44, 70, 41.5, 66, 44.5, 62.5, 42, 59.5, 31, 61.5, 21])
    .minus(m().poly([55, 27, 67, 36, 71, 48, 55, 48]))
  p.fill(cloth.outerEdge(), INK)
  p.fill(cloth, WHITE)
  p.fill(cloth.clone().minus(cloth.shrunk(2)), TONE)
  p.fill(m().rect(63, 17, 9, 1), DARK)
  const char = cloth.clone().and(m().poly([55, 25, 69, 35, 72, 48, 55, 48]))
  p.fill(char, DARK)
  p.fill(char.facing([-1, 0, 0, 1]), INK)
  // the fire climbs off the charred edge, leaning into the smoke
  p.shine(true)
  const fire = m()
  for (const s of [
    [60.5, 33, 3.2, 57, 28, 2.4, 54, 24, 1.4, 50, 21, 0.4],
    [64, 38, 3, 60, 33, 2.2, 57, 30, 1.2, 53, 28, 0.3],
    [67.5, 43, 2.6, 64, 39, 1.8, 61, 37, 1, 58, 36, 0.3],
    [59, 29, 2.2, 56, 24, 1.5, 54, 19, 0.8, 52, 15, 0.3],
  ])
    stroke(fire, s)
  p.fill(fire.outerEdge(), INK)
  p.fill(fire, WHITE)
  p.fill(fire.facing([-1, 0, 0, 1]), LIGHT)
  fire.each((x, y) => {
    if (p.get(x, y) === WHITE && dot(x, y, 0.06 + (y - 18) * 0.014)) p.set(x, y, y > 34 ? TONE : LIGHT)
  })
  p.shine(false)
}

/** The roof he kneels on: a stone ledge, its face in shadow. */
function roof(p: Painter): void {
  const m = (): Mask => p.m()
  const ledge = m().poly([0, 78, 47, 76, 48, 81, 46, 112, 0, 112])
  p.fill(ledge, DARK)
  ledge.each((x, y) => {
    if (y > 82 && (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 3) % 7 === 0)) p.set(x, y, INK)
  })
  p.fill(m().poly([0, 78, 47, 76, 48, 79, 0, 81]), LIGHT)
  p.fill(m().path([0, 78, 47, 76]), WHITE)
  p.fill(ledge.facing([1, 0]), INK)
}

/** Inset bottom right: the mask in close-up, a drop of sweat running out from under it. */
function insetPanel(p: Painter): void {
  const inner = panel(p, 55, 53, 27, 42)
  p.fill(inner, PAPER)
  inner.each((x, y) => {
    if (dot(x, y, 0.1 + Math.hypot(x - 67, y - 68) * 0.025)) p.set(x, y, TONE)
  })
  const cx = 67
  const cy = 68
  const sun = rays(p.m(), cx, cy, 8, 12.5, 15, 0, Math.PI * 2 * (14 / 15)).and(inner)
  p.fill(sun.outerEdge().and(inner), INK)
  p.shade(sun, GOLD, { bevel: 2 })
  const face = p.m().ellipse(cx, cy, 8.5, 9)
  p.fill(face.outerEdge(), INK)
  p.shade(face, GOLD, { bevel: 6 })
  // two eye holes, small worried eyes in them; the long nose pointing off to one side
  p.stamp(['.kkk.', 'kwwwk', 'kwwkk', 'kwwwk', '.kkk.'], 60, 63, INKS)
  p.stamp(['.kkk.', 'kwwwk', 'kwwkk', 'kwwwk', '.kkk.'], 67, 63, INKS)
  const nose = p.m().poly([66, 68.5, 66.5, 71, 80, 67.5, 80, 66.5]).and(inner)
  p.fill(nose.outerEdge().and(inner), INK)
  p.shade(nose, GOLD, { bevel: 1.5 })
  p.fill(p.m().rect(63, 74, 4, 1), INK)
  // the drop of sweat
  p.shine(true)
  p.stamp(['..k...', '.kwk..', 'kwwlk.', 'kwwwlk', 'kwwwlk', '.kkkk.'], 57, 74, INKS)
  p.shine(false)
}

function body(d: Painter): void {
  const m = (): Mask => d.m()
  // the cape, snapping out behind him in four tails
  const cape = m().poly([
    24, 41, 14, 38, 3, 33, 9, 42, 2, 48, 10, 53, 3, 62, 13, 62, 8, 74, 19, 66, 22, 58, 26, 46,
  ])
  d.part(cape, CAPE, { bevel: 5 })
  d.fill(m().path([20, 42, 8, 38]).path([21, 49, 8, 50]).path([22, 56, 11, 66]).and(cape.shrunk(1)), INK)
  // far arm drawing the bands: only the elbow shows, high behind his head
  d.part(m().limb([23, 44, 15, 36, 11, 28], [2.8, 2.5, 2.3]), SKIN, { bevel: 2, bias: -1 })
  d.part(m().limb([11, 28, 15, 30, 19, 32], [2.3, 2.1, 2]), SKIN, { bevel: 2, bias: -1 })
  // legs: the back knee on the ledge, the front foot planted at the very edge
  d.part(m().limb([25, 60, 23, 68, 22, 76], [4.3, 3.8, 3.4]), CLOTH, { bevel: 3, bias: -1 })
  d.part(m().limb([22, 76, 11, 76.5], [3, 2.4]), CLOTH, { bevel: 2, bias: -1 })
  d.part(m().ellipse(8.5, 76, 3.2, 1.9), [INK, DARK], { bevel: 1 })
  d.part(m().limb([30, 59, 39, 56.5, 42, 65, 43, 73], [4.4, 4, 3.4, 3]), CLOTH, { bevel: 3 })
  d.part(m().ellipse(45, 75, 4, 2.2), [INK, DARK, TONE], { bevel: 1.5 })
  // body leaning into the shot, an overall strap
  const torso = m().poly([20, 43, 29, 42, 33, 51, 32, 61, 23, 62, 19, 52])
  d.part(torso, CLOTH, { bevel: 4 })
  d.fill(m().path([24, 43, 29, 55]).and(torso), DARK)
}

/** The giant slingshot, held out at arm's length: a thick wooden fork, its bands drawn back. */
function slingshot(d: Painter): void {
  const m = (): Mask => d.m()
  const wood = m()
    .limb([47.5, 52, 47, 40], [1.7, 2])
    .limb([47, 40, 43.5, 35.5, 42, 29.5], [2, 1.7, 1.6])
    .limb([47, 40, 51, 35.5, 52.5, 30], [2, 1.7, 1.6])
  d.part(wood, [INK, DARK, TONE, LIGHT], { bevel: 1.5 })
  d.fill(m().path([42, 29.5, 31, 34.5]).path([52.5, 30, 31, 34.5]), INK)
  // near arm, straight out, the fist round the handle
  d.part(m().limb([26, 46, 36, 45.5, 45, 45], [2.7, 2.4, 2.2]), SKIN, { bevel: 2 })
  d.part(m().ellipse(47, 45.5, 2.6, 2.5), SKIN, { bevel: 1.5 })
}

/** The sun mask in profile: rays round the back, a bright face plate, the long nose, the eye hole. */
function head(d: Painter): void {
  const m = (): Mask => d.m()
  const cx = 24
  const cy = 29
  d.part(m().disc(18, 36.5, 2.8).disc(21.5, 38.5, 2.4).disc(15.5, 32.5, 2.4), [INK, DARK], { bevel: 1.5 })
  const sun = rays(m(), cx, cy, 7, 12, 6, -1.35, -4.1, 0.3)
  d.part(sun, [INK, TONE, LIGHT, LIGHT, PAPER], { bevel: 1.5 })
  const face = m().ellipse(cx + 0.5, cy, 7.5, 8)
  d.part(face, GOLD, { bevel: 4 })
  face.each((x, y) => {
    if (y > cy + 3 && x < cx + 2 && (x + y) % 2 === 0) d.set(x, y, LIGHT)
  })
  d.part(m().poly([30.5, 27, 45.5, 28, 45.5, 29, 31, 32.5]), GOLD, { bevel: 2 })
  d.stamp(['.kkkk.', 'kkwwkk', 'kwwkkk', 'kkwwkk', '.kkkk.'], 25, 24, INKS)
  d.stamp(['kkkk'], 26, 34, INKS)
}

/** The shot just gone: a ball of fire streaking for the banner, its tail flaring back. */
function shot(p: Painter): void {
  const ball = p.m()
  const dx = TO.x - FROM.x
  const dy = TO.y - FROM.y
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const hx = TO.x - dx * 0.18
  const hy = TO.y - dy * 0.18
  for (const side of [-2.2, 0, 2.2]) {
    stroke(ball, [
      FROM.x + nx * side * 0.4, FROM.y + ny * side * 0.4, 0.4,
      (FROM.x + hx) / 2 + nx * side, (FROM.y + hy) / 2 + ny * side, 1.1,
      hx, hy, 2.2,
    ])
  }
  ball.disc(hx + dx * 0.04, hy + dy * 0.04, 3)
  p.shine(true)
  p.fill(ball.outerEdge().minus(p.subjectMask), INK)
  p.fill(ball, WHITE)
  p.fill(ball.facing([-1, 0, 0, 1]), LIGHT)
  // screentone along the tail, the head of the shot white hot
  ball.each((x, y) => {
    const along = ((x - FROM.x) * dx + (y - FROM.y) * dy) / (len * len)
    if (p.get(x, y) === WHITE && dot(x, y, 0.42 - along * 0.5)) p.set(x, y, LIGHT)
  })
  p.shine(false)
}

export const sogekingManga: CardDef = {
  id: 'op03-090',
  number: 90,
  name: 'Sogeking (Manga-Art)',
  tier: 'grail',
  kind: 'character',
  element: 'Blau',
  print: { cost: 7, power: 6000, counter: 1000, type: 'Sniper Island' },
  // the shot, the fire on the banner and the sweat drop shine; the ink drawing stays matt
  foil: 'painted',
  draw(p) {
    p.register(GREY)
    sky(p)
    tower(p)
    roof(p)
    insetPanel(p)
    const d = p.layer()
    body(d)
    slingshot(d)
    head(d)
    p.subject(d, INK)
    shot(p)
  },
}
