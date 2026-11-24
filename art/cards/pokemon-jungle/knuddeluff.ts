import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rays, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Knuddeluff (Ultra). Brief: pink balloon rabbit standing on a mossy log, both arms thrown up
 * mid-cheer, ears bouncing, big open smile; behind it a row of small jungle animal silhouettes doing
 * a stadium wave one after another; sunny clearing full of flowers. Full art, 80×112.
 *
 * Composition: the rabbit stands square to the viewer in the middle of the clearing, arms and ears
 * up in a V. The sun stands top left and throws rays over the sky. Along the edge of the jungle
 * behind it the animals do the wave from left to right: crouched on the left, rising, then leaping
 * up on the right. Flowers in front of the log. The name plate covers rows 5–15, the attack plate
 * 88–106.
 */
const SKY = colors('5aaee6', '92d0f2', 'ceecf8')
const SUN = colors('fff2a8', 'fffbe2')
const GREEN = colors('0e3a1c', '1e5e26', '398a2f', '6ab844', 'b2e272')
const CROWD = hex('1c4636')
const LOG = colors('3a2016', '6a4026', '9a6436')
const PINK = colors('7a2a4c', 'c4507c', 'ee84a8', 'ffb4cc', 'ffe2ec')
const CREAM = colors('dcc0b0', 'f6e8dc', 'fffaf2')
const BLUE = colors('1a3a8c', '3c7ce0', '9cd4ff')
const EAR = hex('3a1a2c')
const MOUTH = colors('6a1430', 'ff6a8a')
const FLOWER = hex('f05a4a')
const OUTLINE = hex('240c1c')

const P = (x: number, y: number): Pt => [x, y]

const SUN_AT = P(12, 18)
const RIDGE = 70

/** One animal of the wave: `up` from 0 (crouched, arms down) to 1 (leaping, arms up). */
function fan(m: Mask, x: number, up: number, kind: number): void {
  const by = RIDGE - 4.5 - up * 5
  m.ellipse(x, by, 2.6, 3.6)
  const hy = by - 5.5
  m.disc(x, hy, 2.5)
  if (kind === 0) m.disc(x - 2.3, hy - 0.8, 1.1).disc(x + 2.3, hy - 0.8, 1.1)
  if (kind === 1)
    m.poly([x - 2, hy - 1, x - 1.4, hy - 6, x - 0.2, hy - 1.5]).poly([
      x + 2,
      hy - 1,
      x + 1.4,
      hy - 6,
      x + 0.2,
      hy - 1.5,
    ])
  if (kind === 2) m.poly([x - 1, hy - 2, x + 3.2, hy - 4.5, x + 1.8, hy - 0.5])
  for (const s of [-1, 1]) {
    const hx = x + s * (2.8 + (1 - up) * 1.2)
    const hand = by - 1.5 + (1 - up) * 4.5 - up * 9
    m.capsule(x + s * 2, by - 2, hx, hand, 0.8)
  }
  if (up < 0.5) m.ellipse(x, by + 3.2, 3.2, 1.8)
  else
    m.capsule(x - 1.2, by + 2.5, x - 1.6, RIDGE + 1, 0.8).capsule(x + 1.2, by + 2.5, x + 1.6, RIDGE + 1, 0.8)
}

function clearing(p: Painter): void {
  // sunny sky with soft rays from the sun in the top left
  p.dither(
    null,
    SKY,
    (x, y) => {
      const near = Math.max(0, 1 - Math.hypot(x - SUN_AT[0], y - SUN_AT[1]) / 70)
      return 0.15 + near * 0.9 + y / 300
    },
    0.6,
  )
  p.register(SKY)
  p.shine(true)
  p.tone(rays(p, SUN_AT[0], SUN_AT[1], 9, 0.03).and(p.m().rect(0, 0, 80, RIDGE)), 1)
  const sun = p.m().disc(SUN_AT[0], SUN_AT[1], 7)
  sun
    .grown(2)
    .minus(sun)
    .each((x, y) => {
      if (bayer(x, y) < 0.5) p.set(x, y, SUN[0])
    })
  p.fill(sun, SUN[0])
  p.fill(sun.shrunk(2), SUN[1])
  p.shine(false)

  // the edge of the jungle: tree crowns with a few palms, the clearing's back row
  const wood = p.m()
  for (let x = -6; x < 88; x += 7) wood.blob(x, 66 + ((x * 7) % 3), 6, 3.4, x + 3, 0.3)
  wood.rect(0, 67, 80, 10)
  p.fill(wood, GREEN[3])
  p.fill(wood.facing([0, -1, -1, 0]), GREEN[4])

  // the wave: crouched on the left, rising, leaping up on the right
  const crowd = p.m()
  for (const [x, up, kind] of [
    [7, 0, 0],
    [16.5, 0.3, 1],
    [26, 0.6, 2],
    [55, 1, 1],
    [64.5, 0.75, 0],
    [74, 0.4, 2],
  ] as const)
    fan(crowd, x, up, kind)
  p.fill(crowd, CROWD)

  // the clearing: sunlit grass, darker towards us, tufts and flowers
  const grass = p.m().poly([0, RIDGE, 20, RIDGE - 1, 40, RIDGE, 60, RIDGE - 1, 80, RIDGE, 80, 112, 0, 112])
  p.dither(grass, GREEN.slice(1, 5).reverse(), (x, y) => (y - RIDGE) / 30 + noise(x, y, 6, 4) * 0.25, 0.6)
  p.register(GREEN)
  const rand = rng(17)
  for (let i = 0; i < 20; i++) {
    const x = 2 + Math.floor(rand() * 76)
    const y = RIDGE + 3 + Math.floor(rand() * 16)
    p.fill(p.m().line(x, y, x + 1, y - 2), GREEN[4])
  }
  for (let i = 0; i < 18; i++) {
    const x = 3 + Math.floor(rand() * 74)
    const y = RIDGE + 2 + Math.floor(rand() * 16)
    const c = [SUN[0], CREAM[2], FLOWER, PINK[3]][i % 4] ?? SUN[0]
    p.stamp(['.c.', 'coc', '.c.'], x - 1, y - 1, { c, o: SUN[0] === c ? FLOWER : SUN[0] })
  }

  // the mossy log it stands on
  const log = p.m().capsule(10, 83, 70, 82, 5)
  p.part(log, LOG, { bevel: 3, line: 'none' })
  p.fill(p.m().ellipse(10, 83, 3.2, 4.4).and(log), LOG[2])
  p.fill(p.m().ellipse(10, 83, 1.6, 2.4).and(log), LOG[0])
  const moss = log.clone().and(p.m().rect(0, 76, 80, 4))
  for (let x = 12; x < 72; x += 5)
    moss.or(
      p
        .m()
        .ellipse(x + ((x * 3) % 4), 79, 2.6, 1.6)
        .and(log.grown(1)),
    )
  p.fill(moss, GREEN[3])
  p.fill(moss.facing([0, -1]), GREEN[4])
}

/** Big blue eye: k = rim, b = blue, l = light blue, w = glint. */
const EYE = ['..kkkk..', '.kkbbkk.', 'kbwwbbbk', 'kbwwbbbk', 'kbbbbbbk', 'kbbbllbk', '.kblllk.', '..kkkk..']

function wigglytuff(d: Painter): void {
  const m = (): Mask => d.m()
  const mirror = (s: number) => (v: number) => 40 + (v - 40) * s

  // ears: long, flared out, bouncing; dark inside
  for (const s of [-1, 1]) {
    const x = mirror(s)
    const ear = m().poly(spline([x(33), 40, x(27), 30, x(21.5), 17.5, x(26), 21, x(32), 28, x(38.5), 37], 4))
    d.part(ear, PINK, { bevel: 3 })
    d.fill(ear.shrunk(2).and(m().poly([x(31), 35, x(25), 24, x(28.5), 25.5, x(35), 34])), EAR)
  }

  // arms thrown up in a cheer
  for (const s of [-1, 1]) {
    const x = mirror(s)
    d.part(m().limb([x(26), 52, x(20), 43, x(16), 34], [3.8, 3.3, 3.2]), PINK, { bevel: 3 })
    d.part(m().disc(x(15.5), 32.5, 3.6), PINK, { bevel: 3 })
  }

  // feet planted on the log
  for (const s of [-1, 1]) {
    const x = mirror(s)
    const foot = m().ellipse(x(32), 76.5, 5.5, 3.4)
    d.part(foot, PINK, { bevel: 2.5 })
    d.fill(m().ellipse(x(32), 77.5, 2.4, 1.4).and(foot), PINK[4])
  }

  // the balloon body
  d.part(m().ellipse(40, 56, 17.5, 19), PINK, { bevel: 12 })
  const belly = m().ellipse(40, 66, 10.5, 8.5)
  d.part(belly, CREAM, { bevel: 6, line: 'none' })

  // the curl on the forehead
  const curl = m().disc(40, 38.5, 5.2).disc(44.5, 36, 3.2)
  d.part(curl, PINK, { bevel: 3 })
  d.fill(
    m()
      .path(spline([44.5, 36, 42, 34.5, 38.5, 36.5, 39.5, 40.5, 43, 40, 42.5, 38], 4))
      .and(curl.shrunk(1)),
    PINK[1],
  )

  // big blue eyes and a wide open smile
  const face = { k: BLUE[0], b: BLUE[1], l: BLUE[2], w: CREAM[2] }
  d.stamp(EYE, 29, 45, face)
  d.stamp(EYE, 43, 45, face)
  const mouth = m().poly([34, 56, 46, 56, 45.5, 58.5, 43, 61, 37, 61, 34.5, 58.5])
  d.contact(mouth).fill(mouth, MOUTH[0])
  d.fill(m().ellipse(40, 61, 4, 2).and(mouth), MOUTH[1])
  for (const [x, y] of pts([27, 56, 53, 56])) d.fill(m().ellipse(x, y, 2.4, 1.3), PINK[3])

  // the sun lights the top-left rims
  d.tone(d.mask().facing([-1, 0, 0, -1]), 1)
}

export const knuddeluff: CardDef = {
  id: 'pkm-jungle-076',
  number: 76,
  name: 'Knuddeluff',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Farblos',
  hp: 80,
  attacks: [
    { name: 'La-Ola', cost: ['Farblos', 'Farblos', 'Farblos'], damage: '10×' },
    { name: 'Schlaflied', cost: ['Farblos'] },
  ],
  // the sun and its rays shine; the rabbit, the crowd and the clearing stay matt
  foil: 'painted',
  draw(p) {
    clearing(p)
    const d = p.layer()
    wigglytuff(d)
    p.subject(d, OUTLINE)
  },
}
