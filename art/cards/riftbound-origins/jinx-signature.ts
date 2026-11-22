import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Loose Cannon (Signature), Ultra. Our own demolition punk — spiky orange hair, goggles, a patched
 * teal jacket — rides a runaway antique cannon like a rodeo bull, waving a lit bomb, while the
 * cannon fires fireworks over the night city. Full art, 80×112.
 *
 * Composition: the barrel runs from the breech at the lower right up to the muzzle at the left; she
 * sits astride it right of the centre, the bomb raised into the top right corner. The shot climbs
 * from the muzzle into a big burst in the top left. The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('0c0820', '1c1240', '33205e', '4e2c78')
const PINK = colors('9c1c66', 'ee3e9e', 'ffb4e2')
const CYAN = colors('1fb4d6', 'bff8ff')
const FIRE = colors('c22a12', 'f0641a', 'fcb02c', 'fff2a0')
const IRON = colors('141828', '2a3048', '4a5474', '8090b4')
const BRONZE = colors('4a2210', '8a4c1c', 'c88a38', 'f4d27e')
const SKIN = colors('7a3a2c', 'c8785a', 'f0b08a', 'ffd8b8')
const JACKET = colors('0e3a48', '1e6a74', '3aa09a')
const OUTLINE = hex('08060f')

const P = (x: number, y: number): Pt => [x, y]

/** The barrel runs from the breech towards the muzzle; `UP` is across it, towards the sky. */
const BREECH = P(64, 69)
const DIR = P(-0.915, -0.403)
const UP = P(-0.403, -0.915)
const BARREL = 52
/** A point `t` pixels up the barrel from the breech and `off` pixels across it. */
const along = (t: number, off = 0): Pt => [
  BREECH[0] + DIR[0] * t + UP[0] * off,
  BREECH[1] + DIR[1] * t + UP[1] * off,
]

/** A firework: rays of dots from a centre, bright inside, with a twinkle at every tip. */
function burst(p: Painter, cx: number, cy: number, r: number, ramp: readonly number[], rays: number, seed: number): void {
  const rand = rng(seed)
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rand() * 0.2
    const reach = r * (0.75 + rand() * 0.25)
    for (let d = r * 0.3; d <= reach; d += 1.6) {
      const k = d / reach
      const c = ramp[Math.min(ramp.length - 1, Math.floor((1 - k) * ramp.length))] ?? 0
      p.px(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.95), c)
    }
  }
  p.px(Math.round(cx), Math.round(cy), ramp[ramp.length - 1] ?? 0)
}

function city(p: Painter): void {
  // night sky, lit pink around the big burst
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 22, y - 26) / 30) * 0.7
      return 0.15 + (y / 112) * 0.35 + glow + noise(x, y, 4, 8) * 0.1
    },
    0.7,
  )
  burst(p, 22, 26, 15, [PINK[0], PINK[1], PINK[2], CYAN[1]], 18, 3)
  burst(p, 73, 46, 6, [CYAN[0], CYAN[1]], 10, 5)
  burst(p, 7, 74, 6, [FIRE[1], FIRE[2], FIRE[3]], 10, 7)
  p.shine(false)

  // skyline with lit windows
  const rand = rng(9)
  let x = -2
  while (x < 80) {
    const w = 6 + Math.floor(rand() * 7)
    const top = 66 + Math.floor(rand() * 12)
    const house = p.m().rect(x, top, w, 112 - top)
    p.fill(house, NIGHT[1])
    p.fill(house.facing([-1, 0]).minus(p.m().rect(0, 100, 80, 12)), NIGHT[2])
    for (let wy = top + 2; wy < 88; wy += 3) {
      for (let wx = x + 2; wx < x + w - 1; wx += 2) if (rand() < 0.35) p.px(wx, wy, rand() < 0.5 ? FIRE[2] : FIRE[3])
    }
    x += w + (rand() < 0.4 ? 1 : 0)
  }

  // the street the cannon careers down
  const street = p.m().poly([0, 86, 80, 84, 80, 112, 0, 112])
  p.fill(street, IRON[0])
  p.fill(street.facing([0, -1]), IRON[2])
  for (let sx = 2; sx < 80; sx += 6) p.fill(p.m().rect(sx, 90 + (sx % 4), 3, 1), IRON[1])
}

/** The shot: a trail of sparks from the muzzle up into the big burst. */
function trail(p: Painter): void {
  const rand = rng(13)
  for (let t = 0; t < 1; t += 0.06) {
    const x = 9 + (20 - 9) * t + Math.sin(t * 9) * 1.5
    const y = 44 + (30 - 44) * t
    p.px(Math.round(x), Math.round(y), rand() < 0.5 ? FIRE[2] : FIRE[3])
  }
}

/** Antique bronze cannon on a field carriage: rings, a knob at the breech, a flared muzzle. */
function cannon(d: Painter): void {
  const m = (): Mask => d.m()
  const bar = (from: number, to: number, r0: number, r1 = r0): Mask =>
    m().poly([along(from, r0), along(to, r1), along(to, -r1), along(from, -r0)])

  // carriage: the trail runs back down to the street, the wheel sits under the breech
  d.part(m().poly([...along(2, -3), ...along(22, -3), 50, 80, 75, 87, 78, 84, 58, 72]), BRONZE.slice(0, 2), {
    bevel: 2,
  })
  const wheel = m().disc(50, 77, 10)
  d.part(wheel, IRON, { bevel: 2 })
  const inner = m().disc(50, 77, 8)
  d.fill(inner, OUTLINE)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    d.fill(m().line(50, 77, 50 + Math.cos(a) * 8, 77 + Math.sin(a) * 8), i % 2 === 0 ? BRONZE[1] : BRONZE[0])
  }
  d.part(m().disc(50, 77, 2.6), BRONZE, { bevel: 2 })

  // barrel: knob at the breech, a heavy base ring, rings along the chase, the swell of the muzzle
  d.part(m().disc(...along(-3.5), 2.6), BRONZE, { bevel: 2 })
  d.part(bar(-1.5, BARREL - 4, 7, 4.8), BRONZE, { bevel: 6 })
  d.part(bar(-1.5, 3, 7.6), BRONZE, { bevel: 3, line: 'shadow' })
  for (const t of [17, 31]) d.part(bar(t, t + 2, 6.6 - t * 0.05), BRONZE, { bevel: 2, line: 'shadow' })
  d.part(bar(BARREL - 4.5, BARREL, 5.2, 6.6), BRONZE, { bevel: 3, line: 'shadow' })
  const mouth = along(BARREL)
  d.fill(m().ellipse(mouth[0] + 0.3, mouth[1] + 0.2, 2.4, 5, 24), OUTLINE)
}

/** Grinning face, three quarters to the left, goggles pushed up on the forehead. */
const FACE = [
  '..gggg.gggg.',
  '.gccgg.gccg.',
  '..gggg..ggg.',
  '............',
  '..kk....kk..',
  '.kwpk..kwpk.',
  '..kk....kk..',
  '.........s..',
  '.k.......k..',
  '.kwwwwwwwk..',
  '..kmmmmmk...',
  '...kkkkk....',
]

function punk(d: Painter): void {
  const m = (): Mask => d.m()

  // far arm raised high, the bomb in her fist
  d.part(m().limb([56, 42, 62, 34, 63.5, 26], [2.6, 2.3, 2.1]), SKIN, { bias: -1 })
  d.part(m().limb([55.5, 41, 61.5, 34], [3.2, 2.8]), JACKET, { bias: -1 })
  d.part(m().disc(66.5, 20.5, 4.6), IRON, { bevel: 4 })
  d.part(m().disc(63.5, 25, 2.2), SKIN, { bevel: 1.5 })
  d.fill(m().path([68.5, 16.5, 69.5, 14.5, 71.5, 13.5]), BRONZE[2])

  // near leg astride the barrel, kicked forward along it, a chunky boot at the end
  d.part(m().limb([53, 58, 46, 62.5, 40, 65.5], [3.6, 3.2, 2.6]), NIGHT, { bevel: 3 })
  d.fill(m().path([46, 61, 48, 63]), SKIN[1])
  const boot = m().poly([41.5, 62, 41, 69, 34.5, 70.5, 32.5, 68.5, 35, 66, 36.5, 62.5])
  d.part(boot, IRON.slice(0, 3), { bevel: 2 })
  d.fill(m().path([32.5, 69, 41, 69.5]).and(boot.grown(1)), IRON[3])
  d.fill(m().path([38.5, 63, 40, 63]).path([38, 65, 39.5, 65]), PINK[1])

  // torso leaning back like a rodeo rider: striped top under an open jacket
  const top = m().poly([47, 42, 56, 41, 57, 50, 55.5, 58, 48, 58, 46.5, 50])
  d.part(top, PINK, { bevel: 4 })
  for (const y of [45, 49, 53]) d.fill(m().rect(40, y, 30, 1).and(top), PINK[0])
  const jacket = m()
    .poly([45, 41.5, 49.5, 41, 48.5, 50, 49.5, 57, 45.5, 57, 44.5, 49])
    .poly([54, 41, 57.5, 41, 58.5, 49, 57, 57, 54.5, 57, 55.5, 49])
  d.part(jacket, JACKET, { bevel: 3 })
  d.fill(m().rect(44, 55, 16, 2).and(jacket), JACKET[0])

  // near arm reaching down to grip the barrel band
  d.part(m().limb([47, 43, 43, 49, 41.5, 54.5], [3, 2.6, 2.3]), JACKET)
  d.part(m().limb([43, 50, 41.5, 55], [2.2, 2]), SKIN)
  d.part(m().ellipse(41, 56.5, 2.4, 2), SKIN, { bevel: 1.5 })

  // neck, head, spiky hair swept back by the wind
  d.part(m().limb([51, 37, 51.5, 41], 2.2), SKIN, { bias: -1 })
  const head = m().ellipse(50.5, 31.5, 5.6, 6).poly([45, 31, 45.5, 37, 48.5, 38.8, 53, 38, 55.5, 34])
  d.part(head, SKIN, { bevel: 4 })
  const hair = m()
    .poly([44.5, 29, 46, 23, 49, 21.5, 53, 22, 56.5, 25, 57, 30, 55.5, 33, 54, 27.5, 49, 26.5, 46, 28.5])
    .poly([53, 22, 59, 17, 57, 23])
    .poly([55.5, 24.5, 63, 22, 57.5, 28])
    .poly([56, 28, 62.5, 29.5, 56.5, 32])
    .poly([48.5, 22, 50, 15.5, 52.5, 22])
    .poly([45.5, 24, 43, 18.5, 48.5, 22.5])
  d.part(hair, FIRE.slice(0, 3), { bevel: 2.5 })
  d.stamp(FACE, 44, 25, { g: BRONZE[2], c: CYAN[0], k: OUTLINE, w: SKIN[3], p: CYAN[0], s: SKIN[1], m: PINK[0] })
  d.fill(m().rect(44, 25, 12, 1).and(head), BRONZE[1])
}

function blast(p: Painter): void {
  // smoke from the muzzle and the recoil, thinning out at its edges
  const smoke = p.m()
  for (const [x, y, rx, ry, seed] of [
    [3, 54, 5, 4.5, 1],
    [2, 43, 4, 4.5, 2],
    [17, 36, 3.5, 3, 3],
    [73, 73, 5, 3.5, 4],
    [77, 66, 3.5, 3.5, 5],
  ] as const) {
    smoke.blob(x, y, rx, ry, seed, 0.25)
  }
  smoke.minus(p.subjectMask)
  p.dither(smoke, [NIGHT[3], IRON[2], IRON[3]], (x, y) => 0.35 + noise(x, y, 6, 3) * 0.7, 0.6)
  // speed lines behind the runaway carriage
  for (const [x, y, w] of [
    [64, 52, 9],
    [67, 56, 12],
    [62, 60, 6],
  ] as const) {
    p.fill(p.m().rect(x, y, w, 1).minus(p.subjectMask), NIGHT[3])
  }

  // muzzle flash and the fizzing fuse
  p.shine(true)
  const [mx, my] = along(BARREL + 2)
  const flash = flameMask(p, mx + 1, my + 5, 10, 15, { lean: -7, tongues: 3, seed: 2 })
  flash
    .grown(2)
    .minus(flash)
    .minus(p.subjectMask)
    .each((x, y) => {
      if ((x + y) % 2 === 0) p.set(x, y, FIRE[0])
    })
  fire(p, flash.minus(p.subjectMask), FIRE)
  trail(p)
  for (const [x, y, c] of [
    [72, 12, FIRE[3]],
    [73, 14, FIRE[2]],
    [70, 11, FIRE[2]],
    [74, 11, CYAN[1]],
  ] as const) {
    p.px(x, y, c)
  }
  p.shine(false)
}

export const jinxSignature: CardDef = {
  id: 'rb-ogn-086',
  number: 86,
  name: 'Jinx, Loose Cannon (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { tag: 'Legende' },
  // the sky, the fireworks, the muzzle flash and the fuse shine; rider, cannon and city stay matt
  foil: 'painted',
  draw(p) {
    city(p)
    const d = p.layer()
    cannon(d)
    punk(d)
    p.subject(d, OUTLINE)
    blast(p)
  },
}
