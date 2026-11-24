import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rays, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Der Pünktliche (Grail, Strom), hand-made full art, 80×112. Brief (docs/sets/empiremon.md): the mythical
 * punctual train, a golden locomotive-dragon with a clock face on its chest (hands at twelve), arriving
 * in divine light on rails that curve up into the sky.
 *
 * Composition: the locomotive-dragon arrives square to the viewer like a temple idol: the golden prow of
 * a streamliner for a head, glowing lamp eyes under heavy brows, buffers for nostrils, the smokebox boss
 * as a jewel on its brow, a cowcatcher for a jaw, wide horns and a mane of golden frills. On its chest a
 * station clock shows twelve sharp; drive wheels turn in its shoulders and its claws grip the rails.
 * Behind its head the rest of the train climbs a swaying track into a gate of light, the sky is a dial
 * of light rays, clouds bank below. The frame's plates cover rows 4–14 and 91–106, so the head sits
 * at rows 19–64 and the clock at rows 60–78.
 */
const SKY = colors('101a44', '1e3274', '34529e', '5e82c4', '9cbce6')
const GOLD = colors('5c3008', '9c5c12', 'd99a26', 'f7cd50', 'fff2b0')
const LIGHT = hex('fffcf0')
const RAIL = colors('3a3f58', '8a92ac')
const RED = colors('7a1418', 'd8382a')
const INK = hex('20182a')
const OUTLINE = hex('2a1404')

/** The gate of light the track comes out of, and the centre of the dial behind the head. */
const GATE = { x: 40, y: 15 }
const DIAL = { x: 40, y: 50, r: 31 }
/** Points of a cheek frill: from its root at the cheek to its tip. */
const FRILLS: readonly (readonly [number, number, number, number, number])[] = [
  [30, 44, 14, 40, 2.8],
  [30, 51, 15, 53, 2.6],
  [32, 55, 21, 61, 2],
]

function heaven(p: Painter): void {
  // the sky brightens from deep blue in the corners to white round the gate
  const sky = [...SKY, GOLD[4], LIGHT]
  p.register(sky)
  p.dither(
    null,
    sky,
    (x, y) => {
      const near = 1 - Math.hypot(x - GATE.x, (y - GATE.y) * 1.1) / 50
      return near * 1.1 + 0.08 + noise(x, y, 30, 9) * 0.1
    },
    0.5,
  )
  // rays of light falling from the gate
  p.tone(rays(p, GATE.x, GATE.y, 14, 0.015).and(p.m().rect(0, GATE.y, 80, 80)), 1)

  // the dial: a ring of light round the head with a mark for every hour
  const ring = p
    .m()
    .disc(DIAL.x, DIAL.y, DIAL.r)
    .minus(p.m().disc(DIAL.x, DIAL.y, DIAL.r - 1))
  p.fill(ring, GOLD[4])
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2
    const [s, c] = [Math.sin(a), -Math.cos(a)]
    const long = h % 3 === 0 ? 4 : 2
    p.fill(
      p
        .m()
        .line(
          DIAL.x + s * (DIAL.r - 1),
          DIAL.y + c * (DIAL.r - 1),
          DIAL.x + s * (DIAL.r - long),
          DIAL.y + c * (DIAL.r - long),
        ),
      LIGHT,
    )
  }

  // cloud banks below, lit from above
  const clouds = p.m()
  for (const [x, y, rx, ry, seed] of [
    [6, 76, 12, 6, 1],
    [22, 82, 12, 5, 2],
    [74, 75, 12, 6, 3],
    [58, 82, 12, 5, 4],
    [2, 88, 10, 6, 5],
    [78, 88, 10, 6, 6],
  ] as const) {
    clouds.blob(x, y, rx, ry, seed, 0.25)
  }
  p.dither(
    clouds,
    [SKY[3], SKY[4], GOLD[4], LIGHT],
    (x, y) => 1 - (y - 68) / 22 + noise(x, y, 7, 3) * 0.2,
    0.4,
  )

  // stars glinting in the blue
  for (const [x, y] of [
    [8, 22],
    [70, 30],
    [13, 52],
    [73, 54],
    [62, 18],
  ] as const) {
    p.stamp(['.l.', 'lwl', '.l.'], x - 1, y - 1, { l: GOLD[3], w: LIGHT })
  }
  const rand = rng(30)
  for (let i = 0; i < 10; i++) p.px(3 + Math.floor(rand() * 74), 16 + Math.floor(rand() * 44), GOLD[4])
}

function rails(p: Painter): void {
  // the ground in front: ballast in the glow, sleepers, two rails converging under the dragon
  const ground = p.m().poly([0, 90, 30, 78, 50, 78, 80, 90, 80, 112, 0, 112])
  p.dither(ground, [SKY[1], SKY[2], RAIL[1]], (x, y) => (y - 78) / 40 + noise(x, y, 9, 2) * 0.35, 0.4)
  for (let k = 0; k < 7; k++) {
    const y = 78 + 34 / (1 + k * 0.5) ** 1.2
    const w = 12 + (y - 78) * 1.2
    p.fill(p.m().rect(40 - w, y, w * 2, Math.max(1, Math.round((y - 78) / 10))), GOLD[0])
  }
  for (const s of [-1, 1]) {
    const rail = p.m().poly([40 + s * 10, 78, 40 + s * 11, 78, 40 + s * 39, 112, 40 + s * 35, 112])
    p.fill(rail, RAIL[0])
    p.fill(p.m().path([40 + s * 10.5, 78, 40 + s * 37, 112]), GOLD[4])
  }
}

/** The carriages behind the head, from the nearest up to the farthest: [centre x, centre y, width, height]. */
const TRAIN: readonly (readonly [number, number, number, number])[] = [
  [40, 32, 13, 6],
  [43, 25.5, 9, 4],
  [41.5, 20.5, 6, 3],
]

/** The track rising into the gate behind the head: x of the left and right rail at row y. */
function railsAt(y: number): [number, number] {
  const k = Math.max(0, Math.min(1, (y - GATE.y) / (37 - GATE.y)))
  const sway = Math.sin(k * Math.PI * 1.15) * 3.4
  return [40 + sway - 1.5 - k * 9.5, 40 + sway + 1.5 + k * 9.5]
}

/**
 * The rest of the train, far behind the head in the glare: carriages with lit windows on a track that
 * climbs into the light. Painted into the scene with soft gold edges, not the dragon's dark outline.
 */
function train(p: Painter): void {
  for (let k = 0; k < 9; k++) {
    const y = Math.round(GATE.y + 22 * Math.pow(k / 8, 1.3))
    const [l, r] = railsAt(y)
    p.fill(p.m().rect(l - 1, y, r - l + 3, 1), GOLD[2])
  }
  const track = p.m()
  for (let y = GATE.y; y < 37; y++) {
    const [l, r] = railsAt(y)
    track.add(Math.floor(l), y).add(Math.floor(r), y)
  }
  p.fill(track, GOLD[1])
  for (let i = TRAIN.length - 1; i >= 0; i--) {
    const [cx, cy, w, h] = TRAIN[i] ?? [40, 30, 10, 5]
    const car = p.m().rect(cx - w / 2, cy - h / 2, w, h)
    car
      .del(Math.round(cx - w / 2), Math.round(cy - h / 2))
      .del(Math.round(cx + w / 2) - 1, Math.round(cy - h / 2))
    p.register(GOLD)
    p.shade(car, GOLD.slice(1), { bevel: 2 })
    p.edge(car, GOLD[1])
    p.fill(car.facing([0, -1]), GOLD[4])
    if (h >= 3) {
      p.fill(p.m().rect(cx - w / 2 + 1, cy - 0.5, w - 2, 1), LIGHT)
      for (let x = Math.round(cx - w / 2) + 3; x < cx + w / 2 - 1; x += 3)
        p.px(x, Math.round(cy - 0.5), GOLD[1])
    }
  }
}

/** A foreleg from the shoulder, where a drive wheel sits, to a claw of three talons on the rail. */
function leg(d: Painter, s: -1 | 1): void {
  const x = (v: number): number => 40 + (v - 40) * s
  d.part(d.m().limb([x(29), 66, x(25.5), 75, x(25), 84], [4.4, 3.6, 3.2]), GOLD, { bevel: 3 })
  for (const [tx, ty] of [
    [x(20.5), 88],
    [x(24.5), 89],
    [x(29), 88],
  ] as const) {
    d.part(d.m().capsule(x(25), 85.5, tx, ty, 1.5, 0.7), [GOLD[2], GOLD[3], LIGHT], { bevel: 1 })
  }
  const wheel = d.m().disc(x(27.5), 66, 5.5)
  d.part(wheel, GOLD, { bevel: 2 })
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + 0.4
    d.fill(
      d
        .m()
        .line(
          x(27.5) - Math.cos(a) * 4.5,
          66 - Math.sin(a) * 4.5,
          x(27.5) + Math.cos(a) * 4.5,
          66 + Math.sin(a) * 4.5,
        )
        .and(wheel.shrunk(1)),
      GOLD[1],
    )
  }
  d.fill(d.m().disc(x(27.5), 66, 1.6), RED[1])
}

/** The station clock on the chest: a gold bezel, a white face, hands at twelve. */
function clock(d: Painter): void {
  const [cx, cy] = [40, 69]
  d.part(d.m().disc(cx, cy, 8.5), GOLD, { bevel: 2 })
  d.fill(d.m().disc(cx, cy, 7.2), GOLD[0])
  d.fill(d.m().disc(cx, cy, 6.6), LIGHT)
  d.fill(
    d
      .m()
      .disc(cx, cy, 6.6)
      .minus(d.m().disc(cx - 0.6, cy - 0.6, 6.1)),
    GOLD[4],
  )
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2
    const [s, c] = [Math.sin(a), -Math.cos(a)]
    d.px(Math.floor(cx + s * 5.4), Math.floor(cy + c * 5.4), INK)
    if (h % 3 === 0) d.px(Math.floor(cx + s * 4.5), Math.floor(cy + c * 4.5), INK)
  }
  // both hands point straight up: the long minute hand and the broad hour hand on top of it
  d.fill(d.m().rect(cx - 0.5, cy - 5, 1, 6), INK)
  d.fill(d.m().rect(cx - 1, cy - 3, 2, 4), INK)
  d.px(cx - 1, cy, GOLD[2]).px(cx, cy, GOLD[3])
}

function dragon(d: Painter): void {
  const m = (): Mask => d.m()

  // horns: spread wide and swept back from the crown, a spur on each
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + (v - 40) * s
    d.part(
      m().limb([x(34), 35, x(27), 30, x(19), 27, x(12), 28.5, x(9), 32], [2.8, 2.3, 1.7, 1, 0.5]),
      GOLD,
      { bevel: 2 },
    )
    d.part(m().limb([x(23), 28.5, x(20), 22.5, x(21), 19], [1.2, 0.8, 0.5]), GOLD, {
      bevel: 1,
      line: 'shadow',
    })
  }
  // golden frills fanning out behind the cheeks
  for (const s of [-1, 1]) {
    const x = (v: number): number => 40 + (v - 40) * s
    for (const [rx, ry, tx, ty, w] of FRILLS) {
      const fin = m().limb([x(rx), ry, x((rx + tx) / 2 + 1), (ry + ty) / 2 + 1, x(tx), ty], [w, w * 0.7, 0.5])
      d.part(fin, GOLD, { bevel: 2, bias: -1 })
      d.fill(fin.facing([0, -1]).and(m().rect(0, 0, 80, 112)), GOLD[3])
    }
  }

  // the chest, broad and golden, the forelegs, the clock
  d.part(m().ellipse(40, 69, 13, 11.5), GOLD, { bevel: 6 })
  leg(d, -1)
  leg(d, 1)
  clock(d)

  // the jaw: the cowcatcher, its bars for teeth, under a dark open mouth with fangs
  d.fill(m().rect(32, 54, 16, 4), RED[0])
  const jaw = m().poly([30, 57, 50, 57, 45, 63.5, 35, 63.5])
  d.part(jaw, GOLD, { bevel: 2 })
  for (let x = 32; x < 49; x += 2)
    d.fill(
      m()
        .line(x, 58, 40 + (x - 40) * 0.6, 63)
        .and(jaw.shrunk(1)),
      GOLD[0],
    )

  // the head: a broad skull and snout, the prow of a golden streamliner
  const head = m().ellipse(40, 41, 11, 8.5).ellipse(40, 50, 10, 5.5)
  d.part(head, GOLD, { bevel: 7 })
  d.fill(m().poly([38.5, 33, 41.5, 33, 41.5, 46, 38.5, 46]).and(head), GOLD[3])
  d.fill(m().rect(39.5, 33, 1, 13).and(head), GOLD[4])
  // fangs hanging over the jaw
  for (const fx of [34, 37, 42, 45]) d.stamp(['w', 'w', 'l'], fx, 55, { w: LIGHT, l: GOLD[4] })
  // buffers for nostrils
  for (const s of [-1, 1]) {
    d.part(m().disc(40 + s * 4.5, 51, 1.8), GOLD, { bevel: 1 })
    d.px(40 + s * 4.5 - (s < 0 ? 1 : 0), 51, GOLD[0])
  }
  // the smokebox boss on the brow, like a jewel
  d.fill(m().disc(40, 36.5, 2), GOLD[1])
  d.fill(m().disc(40, 36.5, 1.2), RED[1])
  d.px(39, 36, LIGHT)
  // glowing lamp eyes with a dragon's slit pupils, under heavy brows
  for (const s of [-1, 1]) {
    const ex = 40 + s * 6.5
    d.fill(m().ellipse(ex, 43.5, 4, 3), GOLD[0])
    d.fill(m().ellipse(ex, 43.5, 3, 2), LIGHT)
    d.fill(m().ellipse(ex, 43.5, 2, 2), GOLD[3])
    d.fill(m().rect(Math.floor(ex), 42, 1, 3), GOLD[0])
    // heavy brows, slanting down towards the ridge of the prow
    const brow = m().poly([ex - s * 5, 41.5, ex + s * 5, 37.5, ex + s * 5, 39.5, ex - s * 5, 43.5])
    d.fill(brow, GOLD[1])
    d.fill(brow.facing([0, -1]), GOLD[3])
  }
}

/** Light round the eyes, steam hissing round the claws. */
function flourish(p: Painter): void {
  for (const s of [-1, 1]) {
    p.m()
      .disc(40 + s * 6.5, 43, 7)
      .minus(p.subjectMask)
      .each((x, y) => {
        if ((x + y) % 2 === 0) p.set(x, y, GOLD[4])
      })
  }
  const steam = p.m()
  for (const [x, y, rx, seed] of [
    [14, 88, 6, 11],
    [8, 84, 4, 12],
    [66, 88, 6, 13],
    [72, 84, 4, 14],
  ] as const) {
    steam.blob(x, y, rx, rx * 0.7, seed, 0.25)
  }
  p.dither(steam.minus(p.subjectMask), [SKY[4], LIGHT], (_x, y) => 1.2 - (y - 80) / 10, 0.5)
}

export const derPuenktliche: CardDef = {
  id: 'emp5-030',
  number: 30,
  name: 'Der Pünktliche',
  tier: 'grail',
  kind: 'monster',
  element: 'Strom',
  foil: 'art',
  draw(p) {
    // gold first, so contact lines and tones find the gold ramp for its pale tops, not the sky's
    p.register([...GOLD, LIGHT])
    heaven(p)
    rails(p)
    train(p)
    const d = p.layer()
    dragon(d)
    p.subject(d, OUTLINE)
    flourish(p)
  },
}
