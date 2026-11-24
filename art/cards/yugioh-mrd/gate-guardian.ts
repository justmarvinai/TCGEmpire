import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Torwächter, the second Grail of MRD. Brief: a towering three-part titan barring a huge stone gate
 * at the heart of a labyrinth, seen from a low angle: the water spirit rising out of a whirlpool as its
 * base, the thunder giant as its torso with long arms crossed, the wind spirit as its head. Full art,
 * 80×112.
 *
 * Composition: three stacked colour bands from bottom to top, sea blue (Suijin), gold (Sanga) and jade
 * (Kazejin), narrowing upwards as the titan towers over the viewer. The arch of the gate rises behind
 * it and frames head and shoulders; the walls of the maze run in from the lower corners. Spray flies
 * round the base, lightning crackles round the crossed arms, a wind swirl circles the head. Text
 * plates float over rows 0–13 and 90–111.
 */
const SKY = colors('0b0514', '170a28', '25113e', '361a56')
const STONE = colors('1e1916', '38302a', '5a4f46', '7d7166', 'a39686')
const WATER = colors('0a1c3c', '113a6e', '1c5ea4', '3384c8')
const FOAM = colors('9ccced', 'f4fbff')
const GOLD = colors('40240a', '74460e', 'ae7a14', 'deae2a', 'fff07a')
const JADE = colors('0b3224', '185a3e', '2a885e', '50b682', '94e2b2')
const OUTLINE = hex('080410')

const P = (x: number, y: number): Pt => [x, y]

/** Centre of the gate arch and the radii of its opening and its outer edge. */
const GATE = P(40, 44)
const INNER = 29
const OUTER = 37
/** Centre of the whirlwind behind Kazejin's head. */
const WIND = P(40, 25)

/** A jagged bolt: a random walk across the straight line from `from` to `to`. */
function boltPath(from: Pt, to: Pt, rand: () => number, jag: number): Pt[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const n = Math.max(2, Math.round(len / 3))
  const nx = -(to[1] - from[1]) / len
  const ny = (to[0] - from[0]) / len
  let off = 0
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    off = i === 0 || i === n ? 0 : off * 0.45 + (rand() - 0.5) * 2 * jag
    out.push(P(from[0] + (to[0] - from[0]) * t + nx * off, from[1] + (to[1] - from[1]) * t + ny * off))
  }
  return out
}

function labyrinth(p: Painter): void {
  // dark violet sky with drifting cloud, a few stars
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => 0.1 + (y / 112) * 0.35 + noise(x * 0.6, y * 1.4, 9, 10) * 0.4 + noise(x, y, 2, 4) * 0.08,
    0.7,
  )
  const rand = rng(87)
  for (let i = 0; i < 14; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = 14 + Math.floor(rand() * 20)
    p.px(x, y, i % 3 === 0 ? FOAM[1] : FOAM[0])
  }
  p.shine(false)

  // the gate: a round arch of wedge stones on two jambs, lit from the top left
  const [gx, gy] = GATE
  const outer = p.m().disc(gx, gy, OUTER).rect(gx - OUTER, gy, OUTER * 2, 60)
  const inner = p.m().disc(gx, gy, INNER).rect(gx - INNER, gy, INNER * 2, 60)
  const arch = outer.clone().minus(inner)
  p.dither(arch, STONE.slice(1), (x, y) => 0.7 - (x - gx) / 90 - (y - 20) / 140 + noise(x, y, 4, 3) * 0.2, 0.5)
  for (let a = -180; a <= 0; a += 15) {
    const r = (a * Math.PI) / 180
    p.fill(
      p
        .m()
        .line(gx + Math.cos(r) * INNER, gy + Math.sin(r) * INNER, gx + Math.cos(r) * OUTER, gy + Math.sin(r) * OUTER)
        .and(arch),
      STONE[0],
    )
  }
  for (let y = gy + 6; y < 112; y += 7) p.fill(p.m().rect(0, y, 80, 1).and(arch), STONE[0])
  p.fill(arch.facing([0, -1, -1, 0]).minus(inner.grown(1)), STONE[4])
  p.fill(inner.outerEdge().and(arch), STONE[1])
  // the keystone over the titan's head
  const key = p.m().poly([gx - 4, gy - OUTER - 2, gx + 4, gy - OUTER - 2, gx + 3, gy - INNER + 1, gx - 3, gy - INNER + 1])
  p.dither(key, STONE.slice(2), (x) => 0.8 - (x - gx + 4) / 12, 0.4)
  p.fill(key.facing([0, -1, -1, 0]), STONE[4])
  p.fill(key.facing([1, 0]), STONE[1])
  // the closed doors in the opening, deep in shadow; they shine with the whirlwind in front of them
  p.shine(true)
  p.dither(inner, [SKY[0], STONE[0], SKY[1]], (x, y) => 0.25 + Math.abs(x - gx) / 60 + noise(x, y, 6, 5) * 0.2, 0.6)
  p.fill(p.m().rect(gx, gy - INNER, 1, 80).and(inner), SKY[0])
  for (const y of [40, 58, 76]) p.fill(p.m().rect(0, y, 80, 1).and(inner), STONE[1])
  // Kazejin's whirlwind fills the top of the opening behind the head: three arms spiralling out
  const [wx, wy] = WIND
  const swirl = p.m()
  const bright = p.m()
  for (let arm = 0; arm < 3; arm++) {
    for (let t = 0; t <= 1; t += 0.003) {
      const a = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.1
      const r = 5 + t * 21
      const x = Math.round(wx + Math.cos(a) * r)
      const y = Math.round(wy + Math.sin(a) * r * 0.72)
      swirl.add(x, y)
      if (t > 0.25 && t < 0.7) bright.add(x, y)
    }
  }
  const glow = p.m().ellipse(wx, wy, 24, 18).and(inner)
  p.dither(glow, [SKY[1], JADE[0], JADE[1]], (x, y) => 0.75 - Math.hypot(x - wx, (y - wy) * 1.3) / 26, 0.8)
  p.fill(swirl.grown(1).and(glow).minus(swirl), JADE[1])
  p.fill(swirl.and(inner), JADE[3])
  p.fill(bright.and(inner), JADE[4])
  p.shine(false)

  // the walls of the maze run in from the near corners towards the gate
  for (const side of [-1, 1]) {
    const x = (v: number): number => (side < 0 ? v : 80 - v)
    const wall = p.m().poly([x(0), 64, x(13), 74, x(13), 99, x(0), 112])
    p.dither(wall, STONE.slice(0, 4), (vx, vy) => 0.55 - Math.abs(vx - 40) / 120 + noise(vx, vy, 8, 3) * 0.25 - (vy - 50) / 140, 0.5)
    for (const y of [72, 81, 90]) p.fill(p.m().line(x(0), y, x(13), y + (84 - y) * 0.33).and(wall), STONE[0])
    p.fill(wall.facing([0, -1]), STONE[4])
    p.fill(wall.facing([side, 0]), STONE[0])
  }

  // the flooded floor: dark water swirling into the whirlpool round the titan's base
  const pool = p.m().ellipse(40, 94, 40, 12)
  p.shine(true)
  p.dither(pool, WATER, (x, y) => {
    const a = Math.atan2((y - 94) * 3, x - 40)
    const r = Math.hypot((x - 40) / 40, (y - 94) / 12)
    return 0.35 + Math.sin(a * 3 + r * 9) * 0.25 - r * 0.2
  }, 0.5)
  p.shine(false)
}

/**
 * Kazejin's face, hand-pixelled: a jade mask, brows slanting down over glowing eyes, a wide jaw of
 * fangs. J j g d k = jade from light to dark, e = eye glow, W = fangs.
 */
const FACE = [
  '....jJJJj....',
  '..jjJJJJjjg..',
  '.jjJJjjjjjgg.',
  '.jjjjjjjjjggd',
  'gkkjjjjjjjkkd',
  'gjkkkjjjkkkgd',
  'gjkeekjkeekgd',
  '.gjkkjjjkkgd.',
  '.gjjjjgjjjgd.',
  '.gkkkkkkkkkd.',
  '.gkWkWkWkWkd.',
  '..gkkkkkkkd..',
  '...ddddddd...',
]

function titan(d: Painter): void {
  const m = (): Mask => d.m()

  // the base: Suijin, a twisting column of water rising out of the whirlpool, breaking into foam
  const hem: Pt[] = []
  for (let i = 0; i <= 5; i++) {
    const x = 13 + i * 10.8
    hem.push(...quad(P(x, 87), P(x + 3, 91), P(x + 5.4, 88), 3), ...quad(P(x + 5.4, 88), P(x + 8, 84), P(x + 10.8, 87), 3))
  }
  const base = m().poly([P(30, 57), P(50, 57), P(58, 68), P(68, 87), ...hem.reverse(), P(12, 87), P(22, 68)])
  d.part(base, WATER, { bevel: 9 })
  // spiral currents winding up the column, lit on their upper edge
  for (let i = 0; i < 4; i++) {
    const y = 61 + i * 7.5
    const band = m()
      .path(quad(P(10, y + 12), P(36, y + 9), P(70, y - 6), 10))
      .and(base.shrunk(1))
    d.fill(band, WATER[3])
    d.fill(band.moved(0, 1).and(base.shrunk(1)).minus(band), WATER[0])
    band.each((x, y) => {
      if ((x + i * 4) % 9 < 2) d.px(x, y, FOAM[0])
    })
  }
  // foam on the crests of the hem
  const crest = base.facing([0, 1]).and(m().rect(0, 84, 80, 8))
  d.fill(crest.moved(0, -1).and(base), FOAM[0])

  // the torso: Sanga, broad and gold, tapering to a belted waist
  const chest = m().poly([20, 36, 60, 36, 54, 50, 50, 59, 30, 59, 26, 50])
  d.part(chest, GOLD, { bias: -1 })
  d.part(m().rect(29, 55, 22, 4), GOLD, { bias: -1, bevel: 1.5 })
  d.fill(m().rect(38, 55, 4, 4), GOLD[4])
  // the long arms hang to the elbows, then cross in an X over the chest: no one passes
  for (const [sx, ex, bias] of [
    [22, 16, 0],
    [58, 64, -1],
  ] as const)
    d.part(m().limb([sx, 42, ex, 58], [5, 4.4]), GOLD, { bias })
  d.part(m().limb([64, 58, 28, 42], [4.4, 3.8]), GOLD, { bias: -1 })
  d.part(m().ellipse(27, 41.5, 4.6, 4.2), GOLD, { bias: -1, bevel: 3 })
  d.part(m().limb([16, 58, 52, 42], [4.6, 4]), GOLD)
  d.part(m().ellipse(53, 41.5, 4.8, 4.4), GOLD, { bevel: 3 })
  // dark bracers at the wrists, the knuckles picked out on each fist
  for (const [x0, y0, x1, y1] of [
    [33, 46, 35, 50],
    [47, 46, 45, 50],
  ] as const)
    d.fill(m().line(x0, y0, x1, y1).or(m().line(x0 + 1, y0, x1 + 1, y1)), GOLD[1])
  for (const [x, y] of [P(24, 39), P(50, 39)]) d.stamp(['k.k.k'], x, y, { k: GOLD[1] })
  // huge shoulder plates, each with a forked spike like a thunderbolt
  for (const [x, rot, bias] of [
    [19, -14, 0],
    [61, 14, -1],
  ] as const) {
    d.part(m().ellipse(x, 37, 8.5, 5.6, rot), GOLD, { bias, bevel: 4 })
    const s = x < 40 ? -1 : 1
    d.part(m().poly([x - 3 * s, 33, x + 5 * s, 24, x + 4 * s, 29, x + 10 * s, 26, x + 6 * s, 35]), GOLD, { bias, bevel: 1 })
  }

  // the head: Kazejin, a jade mask under a crest, long wind fins sweeping up from its temples
  d.part(m().rect(34, 30, 12, 6), JADE, { bias: -1, bevel: 2 })
  for (const s of [-1, 1]) {
    const fin = m().poly([
      P(40 + s * 5, 28),
      ...quad(P(40 + s * 9, 24), P(40 + s * 16, 21), P(40 + s * 15, 11), 6),
      ...quad(P(40 + s * 15, 11), P(40 + s * 12, 17), P(40 + s * 6, 19), 6),
    ])
    d.part(fin, JADE, { bias: s > 0 ? -1 : 0, bevel: 2 })
  }
  d.part(m().ellipse(40, 23.5, 7.4, 8.4), JADE, { bevel: 4 })
  d.part(m().poly([38, 17, 40, 9, 42, 17]), JADE, { bevel: 1 })
  const face = d.layer().stamp(FACE, 34, 18, {
    J: JADE[4],
    j: JADE[3],
    g: JADE[2],
    d: JADE[1],
    k: JADE[0],
    e: FOAM[1],
    W: JADE[4],
  })
  d.contact(face.mask()).blit(face)
}

/** Wind round the head, lightning round the shoulders and fists, spray round the base. */
function elements(p: Painter): void {
  p.shine(true)
  // lightning leaps off the shoulder spikes and crackles between the fists
  const rand = rng(7)
  const cores = p.m()
  const forks = p.m()
  for (const [from, to] of [
    [P(10, 25), P(5, 12)],
    [P(70, 25), P(76, 13)],
  ] as const) {
    const path = boltPath(from, to, rand, 1.5)
    cores.path(path)
    const at = path[Math.floor(path.length / 2)] ?? from
    forks.path(boltPath(at, P(at[0] + (to[1] - from[1]) * 0.3, at[1] - (to[0] - from[0]) * 0.3), rand, 0.8))
  }
  p.fill(cores.grown(1).minus(p.subjectMask), GOLD[3])
  p.fill(forks, GOLD[4])
  p.fill(cores, FOAM[1])
  for (const [x, y] of [P(22, 37), P(31, 36), P(49, 36), P(58, 37), P(26, 47), P(54, 47)])
    p.stamp(['.a.', 'aba', '.a.'], x - 1, y - 1, { a: GOLD[4], b: FOAM[1] })

  // spray: two fans of droplets thrown up off the hem, foam caps on the crests
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      const x = Math.round(40 + side * (26 + t * 12))
      const y = Math.round(86 - Math.sin(t * Math.PI * 0.9) * 12 - t * 2)
      p.px(x, y, i % 3 === 0 ? FOAM[1] : FOAM[0])
      if (i % 2 === 0) p.px(x + side, y + 1, FOAM[0])
    }
  }
  for (let i = 0; i < 12; i++) {
    const x = 14 + Math.floor(rand() * 52)
    const y = 72 + Math.floor(rand() * 14)
    if (!p.subjectMask.has(x, y)) p.px(x, y, FOAM[1])
  }
  p.shine(false)
}

export const gateGuardian: CardDef = {
  id: 'ygo-mrd-087',
  number: 87,
  name: 'Torwächter',
  tier: 'grail',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'effect',
  print: { level: 11, atk: 3750, def: 3400, type: 'Krieger' },
  // sky, wind, lightning and spray shine; titan, gate and maze stay matt
  foil: 'painted',
  draw(p) {
    labyrinth(p)
    const d = p.layer()
    titan(d)
    p.subject(d, OUTLINE)
    elements(p)
  },
}
