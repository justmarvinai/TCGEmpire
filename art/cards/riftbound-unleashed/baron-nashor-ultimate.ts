import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, lightning, noise, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Baron Nashor (Ultimate), a Grail of Unleashed and the first Ultimate card. Our own void serpent: a
 * colossal violet worm rears out of its pit in the jungle, its armoured head crowned with bone horn
 * plates and set with seven green eyes, jaws wide open and dripping acid. Two clawed tentacles grip
 * broken stone pillars on either side; three tiny fighters stand at the rim of the pit for scale, and
 * green lightning cracks the purple sky. Full art, 80×112. It keeps its full name: the frame gives
 * "(Ultimate)" cards no signature scrawl.
 *
 * Composition: square to the viewer and nearly symmetric. The body rises out of the pit (rows 75–88)
 * in a gentle S to the head at rows 16–48; the horns stay below row 14, where the gem and the number
 * tag sit, and the pit's front rim disappears under the name plate at row 90.
 */
const SKY = colors('0c0512', '1a0a26', '2e1240', '4a1c5c', '6a2a78')
const BODY = colors('1c0a2c', '3c1660', '62288c', '9048b8', 'c07ce0')
const BONE = colors('3e3028', '8a7458', 'cdb890', 'f8ecd0')
const ACID = colors('0e3a14', '2c8a26', '72d83a', 'dcff90')
const GOLD = colors('c88a30', 'ffd884')
const ROCK = colors('120a14', '261c28', '403444', '625468')
const JUNGLE = colors('070e0c', '10221a')
const OUTLINE = hex('05020a')

const P = (x: number, y: number): Pt => [x, y]
/** Mirror x round the middle of the picture. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

function sky(p: Painter): void {
  // storm sky, lit violet behind the head so its outline reads
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 26) * 1.1) / 34)
      return 0.08 + (y / 90) * 0.3 + glow * 0.6 + noise(x, y, 51, 9) * 0.18
    },
    0.7,
  )
  // thin green cracks of lightning in the corners
  for (const [from, to, seed] of [
    [P(5, 15), P(15, 40), 3],
    [P(75, 17), P(66, 42), 5],
  ] as const) {
    const bolt = lightning(p, from, to, ACID[3], { seed, jag: 2.5, glow: ACID[0] })
    for (const k of [0.35, 0.65]) {
      const fork = bolt[Math.floor(bolt.length * k)] ?? from
      lightning(p, fork, P(fork[0] + (to[0] > from[0] ? 5 : -5) * (k < 0.5 ? 1 : -1), fork[1] + 6), ACID[2], { seed: seed + 1, jag: 1.5 })
    }
  }
  p.shine(false)

  // the jungle: dark crowns of trees behind the pit on both sides
  const trees = p.m()
  const rand = rng(53)
  for (let x = -4; x < 86; x += 7) {
    const y = 62 - Math.abs(x - 40) * 0.12 + rand() * 5
    trees.blob(x, y, 6 + rand() * 3, 5, Math.floor(rand() * 100), 0.35)
  }
  trees.rect(0, 66, 80, 46)
  p.fill(trees, JUNGLE[0])
  p.fill(trees.facing([0, -1]), JUNGLE[1])
}

/** The pit: a dark mouth in the ground, its rim of broken rock lit green from below. */
const PIT = { x: 40, y: 81, rx: 28, ry: 6.5 }

/** The near lip of the pit, painted over the body's base so the serpent rises out of the ground. */
function lip(p: Painter): void {
  const hole = p.m().ellipse(PIT.x, PIT.y, PIT.rx, PIT.ry)
  const front = hole.grown(2).minus(hole).and(p.m().rect(0, PIT.y + 1, 80, 20))
  const band = front.grown(1).and(p.m().rect(0, PIT.y + 2, 80, 20)).and(p.m().rect(PIT.x - 15, 0, 30, 112))
  p.fill(band, ROCK[2])
  p.fill(band.facing([0, -1]), ROCK[3])
  p.fill(p.m().rect(PIT.x - 15, PIT.y + PIT.ry + 3, 30, 20), ROCK[1])
}

function pit(p: Painter): void {
  const ground = p.m().rect(0, 74, 80, 38)
  p.fill(ground, ROCK[1])
  p.fill(ground.facing([0, -1]), ROCK[2])
  const hole = p.m().ellipse(PIT.x, PIT.y, PIT.rx, PIT.ry)
  p.fill(hole.grown(2), ROCK[2])
  p.fill(hole.grown(2).facing([0, -1]), ROCK[3])
  p.shine(true)
  p.dither(
    hole,
    [OUTLINE, ACID[0], ACID[1], ACID[2]],
    (x, y) => 0.95 - Math.abs(x - PIT.x) / PIT.rx * 0.75 - Math.abs(y - PIT.y - 1) / PIT.ry * 0.25 + noise(x, y, 57, 3) * 0.2,
    0.6,
  )
  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [22, 73, 7, 1],
    [58, 73, 7, 2],
    [14, 76, 5, 3],
    [67, 76, 5, 4],
  ] as const) {
    mist.blob(x, y, rx, 1.6, seed, 0.3)
  }
  mist.each((x, y) => {
    if ((x + y) % 2 === 0) p.set(x, y, ACID[0])
  })
  p.shine(false)
}

/** A broken column: fluted shaft, a jagged top, a square base. */
function pillar(p: Painter, x: number, top: number, seed: number): void {
  const rand = rng(seed)
  const jag: number[] = []
  for (let i = 0; i <= 5; i++) jag.push(x + i * 2, top + rand() * 4)
  const shaft = p.m().poly([x, 90, ...jag, x + 10, 90])
  p.register(ROCK)
  p.part(shaft, ROCK, { bevel: 4 })
  for (const fx of [x + 2.5, x + 5, x + 7.5]) p.fill(p.m().path([fx, top + 5, fx, 90]).and(shaft.shrunk(1)), ROCK[1])
  p.fill(shaft.facing([0, -1]), ROCK[3])
  p.part(p.m().rect(x - 1, 84, 12, 4), ROCK, { bevel: 2 })
  p.fill(p.m().path([x + 3, top + 12, x + 5, top + 16, x + 4, top + 20]).and(shaft.shrunk(1)), ROCK[0])
}

/** Tiny fighters on the near rim of the pit, for scale: black figures against the green glow. */
const FIGHTERS = [
  ['...s', '.k.s', 'kkks', '.k..', '.k..', 'k.k.'],
  ['.k..', 'kkk.', 'kkks', '.k.s', 'k.k.', 'k.k.'],
  ['s...', 's.k.', 'skkk', '..k.', '..k.', '.k.k'],
] as const

function fighters(p: Painter): void {
  for (const [i, [x, y]] of [
    [15, 80],
    [21, 81],
    [61, 80],
  ].entries()) {
    const grid = FIGHTERS[i] ?? FIGHTERS[0]
    p.stamp(grid, x ?? 0, y ?? 0, { k: OUTLINE, s: BONE[3] })
  }
}

/** The spine of the body, from the pit up to the head. */
const SPINE = [40, 90, 43.5, 78, 45, 67, 42, 57, 39.5, 49, 40, 40]
const GIRTH = [13, 12.5, 11.5, 10.8, 10.5, 10.5]

function serpent(d: Painter): void {
  const m = (): Mask => d.m()

  // tentacles first: from the flanks out and over onto the pillars, ridged, ending in hooked talons
  for (const s of [1, -1]) {
    const x = side(s)
    const line = [x(32), 64, x(23), 65, x(16), 59, x(12.5), 52, x(9), 47.5]
    const arm = m().limb(line, [4.2, 3.6, 3, 2.4, 2])
    d.part(arm, BODY, { bevel: 3.5, bias: -1 })
    for (const [rx, ry] of [
      [25, 65.5],
      [19.5, 63],
      [15.5, 58],
      [13, 54],
    ] as const) {
      d.fill(m().ellipse(x(rx), ry, 2.6, 0.8, s * (rx < 17 ? 60 : 20)).and(arm.shrunk(1)), BODY[3])
    }
    for (const [tx, ty, mx, my, ex, ey] of [
      [7.5, 46, 3.5, 46.5, 3.5, 50.5],
      [9, 47, 6.5, 49.5, 7, 53],
      [11, 47.5, 10.5, 50.5, 11.5, 53.5],
    ] as const) {
      d.part(m().limb([x(tx), ty, x(mx), my, x(ex), ey], [1.4, 1, 0.5]), BONE, { bevel: 1.5 })
    }
  }

  // the body: a thick column rising in a gentle S, ringed in segments, bone plates up its front
  const spine = spline(SPINE, 8)
  const trunk = m().limb(SPINE, GIRTH)
  d.part(trunk, BODY, { bevel: 8 })
  for (let i = 3; i < spine.length - 4; i += 5) {
    const [cx, cy] = spine[i] ?? [40, 60]
    const k = i / spine.length
    const r = GIRTH[Math.min(GIRTH.length - 1, Math.floor(k * GIRTH.length))] ?? 10
    const ring = m().ellipse(cx, cy + 2, r + 1, 2.4).minus(m().ellipse(cx, cy + 0.6, r + 1, 2.4)).and(trunk)
    d.fill(ring, BODY[0])
    const plate = m().ellipse(cx, cy - 0.4, r * 0.55, 1.5).and(trunk.shrunk(2))
    d.fill(plate, BONE[1])
    d.fill(plate.facing([0, -1]), BONE[2])
  }
  // spikes down both flanks
  for (let i = 5; i < spine.length - 8; i += 6) {
    const [cx, cy] = spine[i] ?? [40, 60]
    const k = i / spine.length
    const r = GIRTH[Math.min(GIRTH.length - 1, Math.floor(k * GIRTH.length))] ?? 10
    for (const s of [1, -1]) {
      d.part(m().poly([cx + s * (r - 2), cy - 2.5, cx + s * (r + 3.5), cy - 4.5, cx + s * (r - 2), cy + 1]), BONE, { bevel: 1.5 })
    }
  }

  // horn plates crowning the head: two great horns sweeping out, two smaller ones, a central crest
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(26), 25, x(19), 20, x(13.5), 18, x(10), 15], [3.6, 2.8, 1.8, 0.6]), BONE, { bevel: 2.5 })
    d.part(m().limb([x(31.5), 21.5, x(28.5), 17, x(26.5), 14.5], [2.4, 1.7, 0.6]), BONE, { bevel: 2, bias: -1 })
  }
  d.part(m().poly([36, 21.5, 40, 14.5, 44, 21.5]), BONE, { bevel: 2 })

  // the head: broad and flat, armoured cheeks flaring to the sides
  const head = m().poly([22, 26, 28, 20, 40, 18.5, 52, 20, 58, 26, 59, 31, 54, 36, 47, 37.5, 33, 37.5, 26, 36, 21, 31])
  d.part(head, BODY, { bevel: 7 })
  const brow = m().poly([22.5, 25.5, 30, 22, 40, 26, 50, 22, 57.5, 25.5, 53, 27.5, 46, 26, 40, 29.5, 34, 26, 27, 27.5])
  d.part(brow, BONE, { bevel: 2 })
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().poly([x(21.5), 30.5, x(27), 31, x(29), 35.5, x(25), 35]), BONE.slice(0, 3), { bevel: 1.5 })
  }

  // jaws gaping wide: rows of fangs, a throat glowing green, tusks at the corners
  const lower = m().poly([27, 44, 40, 43, 53, 44, 51, 50, 45, 53, 35, 53, 29, 50])
  d.part(lower, BODY, { bevel: 4 })
  const maw = m().poly([27.5, 35.5, 52.5, 35.5, 52, 44.5, 46, 47, 40, 47.5, 34, 47, 28, 44.5])
  d.fill(maw, BODY[0])
  d.fill(m().ellipse(40, 42.5, 8, 3.6).and(maw), ACID[0])
  d.fill(m().ellipse(40, 43, 4.5, 2).and(maw), ACID[1])
  for (const s of [1, -1]) {
    const x = side(s)
    for (const [fx, len] of [
      [29.5, 5.5],
      [32.5, 4.5],
      [35.5, 3.5],
      [38.5, 2.5],
    ] as const) {
      d.part(m().poly([x(fx - 1), 35.5, x(fx + 1.2), 35.5, x(fx + 0.2), 35.5 + len]), BONE.slice(1), { bevel: 1, line: 'none' })
      d.part(m().poly([x(fx - 0.8), 47.5, x(fx + 1.2), 47.5, x(fx + 0.4), 47.5 - len * 0.7]), BONE.slice(1), { bevel: 1, line: 'none' })
    }
    d.part(m().limb([x(26.5), 44, x(23.5), 47.5, x(24.5), 51], [1.6, 1.2, 0.5]), BONE, { bevel: 1.5 })
  }

  // gold rim light from the storm on the upper left edges of horns, head and body
  const all = d.mask()
  d.fill(all.facing([-1, 0, 0, -1]).and(trunk.minus(head)).and(m().rect(0, 0, 40, 112)), GOLD[0])
  d.fill(all.facing([0, -1]).and(head.minus(brow)), GOLD[0])
}

/** Seven eyes in three rows, glowing green out of dark sockets. */
const EYES = [
  [30.5, 28.5, 2, false],
  [44.5, 28.5, 2, true],
  [33.5, 25, 1, false],
  [44.5, 25, 1, true],
  [26.5, 31.5, 1, false],
  [51.5, 31.5, 1, true],
  [39, 20.5, 0, false],
] as const

/** Big eyes slant down towards the middle; small ones are two pixels under a dark lid. */
const BIG_EYE = ['kk...', 'kggk.', '.kghk', '..kk.']

function eyes(p: Painter): void {
  p.shine(true)
  for (const [x, y, size, flip] of EYES) {
    const key = { k: OUTLINE, g: ACID[2], h: ACID[3] }
    if (size === 2) p.stamp(BIG_EYE, x, y, key, flip)
    else if (size === 1) p.stamp(['kk', 'gh'], x, y, key, flip)
    else p.stamp(['.k.', 'kgk', '.h.'], x, y, key)
  }
  p.shine(false)
}

/** Acid drooling from the fangs in thin threads, hissing where it lands on the rocks. */
function acid(p: Painter): void {
  p.shine(true)
  // strings of drool between the fangs
  for (const [x, y0, y1, bend] of [
    [33, 39, 46, 1.5],
    [46.5, 38.5, 46, -1],
  ] as const) {
    p.fill(p.m().path([x, y0, x + bend, (y0 + y1) / 2 + 1, x + bend * 0.3, y1]), ACID[2])
  }
  // drips falling from the corners of the jaws
  for (const [x, y0, y1] of [
    [25, 51, 57],
    [55, 51, 59],
  ] as const) {
    p.fill(p.m().path([x, y0, x, y1]), ACID[2])
    p.px(x, y1 + 2, ACID[3]).px(x, y1 + 4, ACID[2])
  }
  for (const [x, y] of [
    [25, 76],
    [56, 76],
  ] as const) {
    p.fill(p.m().ellipse(x, y, 3.5, 1), ACID[1])
    p.fill(p.m().ellipse(x, y - 0.3, 1.5, 0.6), ACID[2])
    p.px(x - 1, y - 3, ACID[2]).px(x + 2, y - 5, ACID[3])
  }
  p.shine(false)
}

export const baronNashorUltimate: CardDef = {
  id: 'rb-unl-086',
  number: 86,
  name: 'Baron Nashor (Ultimate)',
  tier: 'grail',
  kind: 'unit',
  element: 'Chaos',
  // the sky, the lightning, the eyes and the acid shine; the serpent, the pillars and the pit stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    pit(p)
    pillar(p, 2, 47, 3)
    pillar(p, 68, 53, 4)
    fighters(p)
    const d = p.layer()
    serpent(d)
    p.subject(d, OUTLINE)
    lip(p)
    eyes(p)
    acid(p)
  },
}
