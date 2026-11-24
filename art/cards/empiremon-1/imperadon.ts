import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, quad, rays, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Imperadon (Grail, Glut), the mascot of Empiremon. Brief: the golden emperor dragon: crown-shaped
 * crest, crimson wing membranes like a royal cape, coiled round a pillar in front of a gold sunburst.
 * Full art, 80×112.
 *
 * Composition: an emblem. The pillar stands in the middle (indigo stone with gold bands, the house
 * colours of the card frame); the dragon rests its chest and claws on the capital, turns its crowned
 * head proudly to the left and winds its body down round the shaft. The wings rise behind it like a
 * heraldic beast's, crimson velvet with an ermine hem. A gold sunburst blazes behind it; a dark
 * nimbus keeps the gold dragon apart from the gold rays. The frame's plates cover rows 4–14 and
 * 91–106. The booster cuts the dragon and pillar out of this artwork.
 */
const GOLD = colors('4e2008', '8e4c10', 'cc8420', 'f0b83c', 'fff0a0')
const CREAM = colors('c08a50', 'ecd29a', 'fff8e0')
const CRIMSON = colors('3a0614', '6e0e22', 'a81e30', 'd63c44')
const NIGHT = colors('1c030c', '360816')
const SUNLIGHT = colors('c24a22', 'eaa040', 'f8d878', 'fff6cc')
const STONE = colors('120e2a', '221a4a', '362a6e', '52449a')
const ERMINE = hex('f8f0e6')
const GEM = colors('1a3494', '4c8cf2')
const INK = hex('1a0a10')
const OUTLINE = hex('1a0806')

const P = (x: number, y: number): Pt => [x, y]

/** The dragon is drawn this far above its place in the picture (it sits lower, clear of the name plate). */
const DROP = 3
/** Centre of the sunburst, behind the dragon's chest. */
const SUN = P(40, 42)

function sunburst(p: Painter): void {
  // dark crimson ground; a burst of rays, red at the edges, turning gold towards the heart
  p.dither(
    null,
    [NIGHT[0], NIGHT[1], CRIMSON[1]],
    (x, y) => 0.95 - Math.hypot(x - SUN[0], (y - SUN[1]) * 0.75) / 58,
    0.8,
  )
  const wedge = rays(p, SUN[0], SUN[1], 16, 0.015)
  p.dither(
    wedge,
    [CRIMSON[2], SUNLIGHT[0], SUNLIGHT[1], SUNLIGHT[2], SUNLIGHT[3]],
    (x, y) => 1.1 - Math.hypot(x - SUN[0], (y - SUN[1]) * 0.85) / 50,
    0.7,
  )
  p.fill(p.m().disc(SUN[0], SUN[1], 16), SUNLIGHT[2])
  p.fill(p.m().disc(SUN[0], SUN[1], 12), SUNLIGHT[3])
}

/** A wing raised behind the shoulder, `s` = −1 left, 1 right: gold bones, crimson membrane, ermine hem. */
function wing(d: Painter, s: number): void {
  const X = (v: number, y: number): Pt => [40 + v * s, y]
  const shoulder = X(6, 38)
  const elbow = X(14, 31)
  const wrist = X(21, 20)
  const tips = [X(37, 14.5), X(38, 31), X(27, 45)]
  const pulls = [X(31, 23), X(30, 39), X(15, 45)]
  const end = X(8, 46)
  const edge: Pt[] = [...quad(wrist, X(29, 13), tips[0] ?? wrist, 6)]
  for (let i = 0; i < 3; i++) edge.push(...quad(tips[i] ?? wrist, pulls[i] ?? wrist, tips[i + 1] ?? end, 8))
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.part(membrane, CRIMSON, { bevel: 8 })
  // the ermine hem: a white band along the scalloped edge, black tails spaced along it
  const hem = membrane.clone().minus(membrane.moved(0, -2)).and(d.m().rect(0, 22, 80, 30))
  d.fill(hem, ERMINE)
  for (const [hx, hy] of [X(36, 25), X(33, 38), X(25, 42), X(17, 44)]) {
    const x = Math.round(hx)
    const y = Math.round(hy)
    if (hem.has(x, y)) d.px(x, y, INK)
  }
  // arm and finger bones
  const bones = d.m().limb([shoulder, elbow, wrist], [2.3, 1.9, 1.5])
  for (const tip of tips) bones.limb([wrist, tip], [1.3, 0.7])
  d.part(bones, GOLD, { bevel: 1.5, line: 'shadow', bias: -1 })
  d.part(d.m().poly([X(20, 21), X(22, 14.5), X(23.5, 20)]), GOLD, { bevel: 1 })
}

/** The pillar: an indigo shaft with fluting and gold bands under a gold capital. */
function pillar(d: Painter): void {
  const shaft = d.m().rect(33, 52, 14, 60)
  d.part(shaft, STONE, { bevel: 5 })
  for (const x of [36, 39, 42]) d.fill(d.m().rect(x, 55, 1, 57).and(shaft), STONE[0])
  for (const y of [71, 90]) d.part(d.m().rect(32, y, 16, 3), GOLD, { bevel: 1.5 })
  d.part(d.m().poly([28, 47, 52, 47, 50.5, 50, 48, 53, 32, 53, 29.5, 50]), GOLD, { bevel: 2 })
  d.part(d.m().rect(27, 45, 26, 3), GOLD, { bevel: 1.5 })
}

/** The body winds down round the shaft: points along a helix, and whether each lies in front. */
interface Turn {
  x: number
  y: number
  r: number
  front: boolean
}
function helix(n: number): Turn[] {
  const out: Turn[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = Math.PI / 2 + t * 3.7 * Math.PI
    out.push({
      x: 40 + 11 * Math.sin(a),
      y: 50 + t * 36 + 2.8 * Math.cos(a),
      r: 5.2 - t * 2.6,
      front: Math.cos(a) > -0.08,
    })
  }
  return out
}

/** Stretches of the helix on one side of the shaft, each as its own limb, a little overlapping. */
function stretches(turns: readonly Turn[], front: boolean): Turn[][] {
  const out: Turn[][] = []
  let cur: Turn[] = []
  turns.forEach((t, i) => {
    const near = turns.slice(Math.max(0, i - 1), i + 2).some((u) => u.front === front)
    if (near) cur.push(t)
    else if (cur.length) {
      out.push(cur)
      cur = []
    }
  })
  if (cur.length) out.push(cur)
  return out
}

/** A stretch of the body: gold scales, a cream belly along the lower edge, crimson spines along the top. */
function coil(d: Painter, stretch: readonly Turn[], front: boolean): void {
  if (stretch.length < 2) return
  const body = d.m().limb(
    stretch.flatMap((t) => [t.x, t.y]),
    stretch.map((t) => t.r),
  )
  d.part(body, GOLD, { bevel: 3, bias: front ? 0 : -1 })
  d.fill(body.clone().minus(body.moved(0, -2)), front ? CREAM[1] : CREAM[0])
  if (!front) return
  const spines = d.m()
  for (let i = 3; i + 3 < stretch.length; i += 6) {
    const a = stretch[i]
    const b = stretch[i + 1]
    if (!a || !b) continue
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len]
    // the normal that points up, away from the belly
    const [nx, ny] = ux > 0 ? [uy, -ux] : [-uy, ux]
    const [bx, by] = [a.x + nx * (a.r - 1.5), a.y + ny * (a.r - 1.5)]
    spines.poly([bx - ux * 2, by - uy * 2, bx + nx * 4.5 - ux * 1.2, by + ny * 4.5 - uy * 1.2, bx + ux * 2, by + uy * 2])
  }
  d.part(spines.minus(body.shrunk(1)), CRIMSON, { bevel: 1, line: 'shadow' })
}

function dragon(d: Painter): void {
  const m = (): Mask => d.m()

  wing(d, -1)
  wing(d, 1)

  const turns = helix(90)
  for (const s of stretches(turns, false)) coil(d, s, false)
  pillar(d)
  for (const s of stretches(turns, true)) coil(d, s, true)
  // the tail ends in a crimson spade
  const last = turns[turns.length - 1] ?? { x: 50, y: 86, r: 2 }
  const { x: tx, y: ty } = last
  d.part(m().poly([tx - 1, ty - 2, tx + 4, ty - 4, tx + 8, ty + 0.5, tx + 4, ty + 3, tx, ty + 2]), CRIMSON, { bevel: 1.5 })

  // a broad chest resting on the capital
  const chest = m().ellipse(40, 40.5, 9.5, 7).ellipse(40, 45, 7, 3)
  d.part(chest, GOLD, { bevel: 4 })

  // forelegs: a strong upper arm out from the shoulder, the forearm down to a hand that grips the rim
  // of the capital, three white claws hooked over its edge
  for (const s of [-1, 1]) {
    d.part(m().limb([40 + s * 7, 37.5, 40 + s * 11, 41, 40 + s * 11, 44.5], [3.2, 2.6, 2.3]), GOLD, { bevel: 2.5 })
    d.part(m().ellipse(40 + s * 11, 45.5, 3, 1.8), GOLD, { bevel: 1.5, line: 'shadow' })
    d.stamp(['w.w.w', 'w.w.w'], Math.round(40 + s * 11 - 2), 46.5, { w: CREAM[2] })
  }

  head(d)
}

/** The head in three-quarter view, looking out to the left: crown crest, swept horns, a proud smirk. */
function head(d: Painter): void {
  const m = (): Mask => d.m()
  // horns sweeping back behind the crown, the far one darker
  d.part(m().limb([46, 23, 51.5, 18, 56, 16], [2, 1.4, 0.6]), GOLD, { bevel: 1.5, bias: -1 })
  d.part(m().limb([47.5, 26, 53.5, 22.5, 58.5, 21.5], [2.2, 1.6, 0.7]), GOLD, { bevel: 1.5 })
  // the neck rising from the chest, cream plates down its front
  const neck = m().limb([40, 42, 43, 36, 44.5, 31], [5.6, 5, 4.8])
  d.part(neck, GOLD, { bevel: 3 })
  const throat = m()
    .limb([37, 44, 37.5, 40, 38.5, 36, 40, 31.5], [3.2, 2.8, 2.5, 2.2])
    .and(neck.clone().or(m().ellipse(40, 40.5, 9.5, 7)))
  d.fill(throat, CREAM[1])
  d.fill(throat.facing([-1, 0]), CREAM[2])
  d.fill(throat.facing([1, 0]), CREAM[0])
  for (const y of [34, 37, 40, 43]) d.fill(m().rect(33, y, 10, 1).and(throat), CREAM[0])
  // lower jaw, a little open, then skull and the long muzzle
  d.part(m().poly([40, 31, 29, 31.5, 25, 32.5, 26.5, 34.5, 38, 36, 42.5, 34]), GOLD, { bevel: 2, bias: -1 })
  const skull = m().ellipse(44, 26.5, 7, 6.2).poly([39.5, 21.5, 33, 23, 27.5, 25, 24, 27.5, 23.5, 29.5, 25.5, 31, 39, 31.5])
  d.part(skull, GOLD, { bevel: 3.5 })
  // spiked frill behind the jaw
  d.part(m().poly([46.5, 28.5, 53.5, 27.5, 50, 30.5, 53.5, 33.5, 47, 33.5]), GOLD, { bevel: 1, line: 'shadow' })
  // the crown crest: a band across the brow with three points, pearls on the tips, a sapphire
  const crown = m().poly([36.5, 21, 49.5, 19.5, 50, 22.5, 37, 24])
  for (const [x, y, h] of [
    [38.5, 22, 3.5],
    [43.5, 21, 5.5],
    [48.5, 20, 4],
  ] as const)
    crown.poly([x - 2.2, y, x - 0.3, y - h, x + 2.2, y])
  d.part(crown, GOLD, { bevel: 1.5 })
  d.stamp(['ww', 'wc'], 42, 13.5, { w: ERMINE, c: CREAM[1] })
  d.stamp(['w', 'c'], 37, 16.5, { w: ERMINE, c: CREAM[1] })
  d.stamp(['w', 'c'], 48, 14.5, { w: ERMINE, c: CREAM[1] })
  d.stamp(['.gg.', 'gGGg', '.gg.'], 41, 20, { g: GEM[0], G: GEM[1] })
  // a fierce sapphire eye under a heavy brow, the nostril, fangs over the lip, the mouth line
  d.stamp(['aaaaa.', '.kbbwk', '..kkk.'], 33, 24, { a: GOLD[1], k: INK, b: GEM[1], w: ERMINE })
  d.stamp(['kk'], 25, 27, { k: GOLD[0] })
  d.stamp(['kkkkkkkkkkk', '.w.....w...'], 27, 31, { k: GOLD[0], w: ERMINE })
}

export const imperadon: CardDef = {
  id: 'emp1-019',
  number: 19,
  name: 'Imperadon',
  tier: 'grail',
  kind: 'monster',
  element: 'Glut',
  foil: 'art',
  draw(p) {
    sunburst(p)
    const art = p.layer()
    dragon(art)
    const d = p.layer().blit(art, 0, DROP)
    // a dark nimbus keeps the gold dragon apart from the gold rays
    p.fill(d.mask().grown(2), CRIMSON[0])
    p.subject(d, OUTLINE)
    // gold sparkles in the rays
    stars(p, rng(3), 12, [SUNLIGHT[3], ERMINE], { x: 4, y: 52, w: 72, h: 36 })
  },
}
