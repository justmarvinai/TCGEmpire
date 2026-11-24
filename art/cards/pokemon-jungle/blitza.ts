import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, lightning, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Blitza (Ultra). Brief: spiky yellow fox mid-leap towards the viewer, every spike bristled, a fan of
 * needle-like bolts shooting out; thunderstorm over the canopy at night, lightning striking the
 * tallest tree. Full art, 80×112.
 *
 * Composition: the fox flies straight at the viewer, seen from the front: head in the middle, the
 * white ruff spiking out under it, both front paws reaching out to the lower corners and the
 * bristled fur of its back fanning out behind the head like a star. Needles of light shoot out of
 * the fur in a fan. Behind it violet storm clouds; on the left a bolt strikes the tallest tree of
 * the canopy. The name plate covers rows 5–15, the attack plate 88–106.
 */
const NIGHT = colors('0a0614', '160c26', '24143c', '382252', '533872')
const BOLT = colors('5ad2f0', 'bff4ff', 'ffffff')
const CANOPY = colors('03050a', '0a1418', '15262c')
const YELLOW = colors('5c3a08', '9c6e10', 'd8a81c', 'f8d838', 'fff27a')
const WHITE = [hex('545878'), hex('a0a6c4'), hex('e0e4f2'), BOLT[2]] as const
const EMBER = hex('f08a30')
const OUTLINE = hex('0a0610')

const P = (x: number, y: number): Pt => [x, y]

/** Where the bolt hits the tallest tree. */
const STRIKE = P(12, 58)
/** Centre of the fur burst and of the needle fan. */
const CORE = P(40, 47)

function storm(p: Painter): void {
  // violet-black clouds, billowing, lit from below where the bolt comes down
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const billow = noise(x * 0.8, y, 4, 9) * 0.45 + noise(x, y * 1.3, 8, 4) * 0.12
      const flash = Math.max(0, 1 - Math.hypot(x - STRIKE[0] - 4, (y - 38) * 0.7) / 34) * 0.5
      const low = Math.max(0, 1 - Math.abs(y - 72) / 14) * 0.22
      return billow + flash + low - Math.max(0, y - 80) / 40
    },
    0.7,
  )
  p.register(NIGHT)

  // rain: thin slanted streaks in the dark
  const rand = rng(31)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * 84)
    const y = 16 + Math.floor(rand() * 60)
    p.fill(p.m().line(x, y, x - 2, y + 5), NIGHT[3])
  }

  // the canopy: ragged treetops along the bottom, the tallest tree on the left
  const trees = p.m()
  for (let x = 20; x < 88; x += 8) trees.blob(x, 76 + ((x * 3) % 5), 6.5, 5, x, 0.3)
  trees.rect(0, 79, 80, 40)
  const tall = p.m().limb([11, 92, 11.5, 76, 12, 64], [2.8, 2.2, 1.8])
  for (const [x, y, rx, ry, seed] of [
    [5, 66, 6, 3.4, 3],
    [19, 67, 6.5, 3.4, 7],
    [12, 61.5, 7.5, 4, 5],
    [8, 71, 5, 3, 2],
    [17, 72, 5, 3, 4],
  ] as const)
    tall.blob(x, y, rx, ry, seed, 0.3)
  p.fill(trees.clone().minus(tall), CANOPY[1])
  p.fill(trees.facing([0, -1]).minus(tall), CANOPY[2])
  p.fill(tall, CANOPY[0])
  p.fill(tall.facing([0, -1]).and(p.m().rect(0, 0, 30, 70)), CANOPY[2])

  // the bolt, a branch, and the flash where it hits the crown
  p.shine(true)
  const flash = p
    .m()
    .disc(STRIKE[0], STRIKE[1] + 1, 6)
    .minus(p.m().disc(STRIKE[0], STRIKE[1] + 1, 4.5))
  flash.each((x, y) => {
    if (bayer(x, y) < 0.5) p.set(x, y, BOLT[0])
  })
  p.fill(tall.facing([0, -1, -1, 0]).and(p.m().disc(STRIKE[0], STRIKE[1] + 3, 7)), BOLT[0])
  const bolt = lightning(p, P(17, 0), STRIKE, BOLT[2], { seed: 4, jag: 3, glow: BOLT[0] })
  lightning(p, bolt[4] ?? P(14, 30), P(27, 40), BOLT[1], { seed: 9, jag: 1.5 })
  lightning(p, bolt[2] ?? P(16, 18), P(4, 28), BOLT[1], { seed: 2, jag: 1.2 })
  for (const [x, y] of pts([9, 54, 15, 53, 7, 57, 17, 56])) p.px(x, y, BOLT[2])
  for (const [x, y] of pts([10, 60, 14, 61])) p.px(x, y, EMBER)
  p.shine(false)
}

/** A spike of fur from the root (x, y) out to (x + dx, y + dy), `w` wide at the root. */
function spike(m: Mask, x: number, y: number, dx: number, dy: number, w: number): Mask {
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * w
  const ny = (dx / len) * w
  return m.poly([x + nx, y + ny, x + dx, y + dy, x - nx, y - ny])
}

/** Spikes on a ring round (cx, cy) between two angles (degrees, 0 = right, 90 = down). */
function burst(
  m: Mask,
  cx: number,
  cy: number,
  from: number,
  to: number,
  n: number,
  r0: number,
  r1: number,
  w: number,
): Mask {
  for (let i = 0; i < n; i++) {
    const a = ((from + ((to - from) * (i + 0.5)) / n) * Math.PI) / 180
    const len = r1 * (i % 2 === 0 ? 1 : 0.82)
    spike(
      m,
      cx + Math.cos(a) * r0,
      cy + Math.sin(a) * r0,
      Math.cos(a) * (len - r0),
      Math.sin(a) * (len - r0),
      w,
    )
  }
  return m
}

/** Big dark eyes, narrowed for the attack: k = line, e = iris, w = glint. */
const EYE_L = ['kk....', '.kkkk.', 'kwkeek', 'keeeek', '.kkkk.']
const EYE_R = ['....kk', '.kkkk.', 'keekwk', 'keeeek', '.kkkk.']

function jolteon(d: Painter): void {
  const m = (): Mask => d.m()

  // the bristled fur of the back and rump, fanning out behind the head like a star
  const back = burst(
    m().ellipse(CORE[0], CORE[1] + 2, 13, 12),
    CORE[0],
    CORE[1] + 2,
    -172,
    12,
    11,
    9,
    25,
    3.6,
  )
  burst(back, CORE[0], CORE[1] + 4, 168, 196, 2, 9, 22, 3.4)
  d.part(back, YELLOW, { bias: -1, bevel: 4 })

  // the body behind the ruff, foreshortened, its rump spikes pointing down between the legs
  const body = m().ellipse(40, 64, 9, 8)
  burst(body, 40, 66, 60, 120, 3, 5, 15, 2.6)
  d.part(body, YELLOW, { bias: -1, bevel: 4 })

  // front paws reaching out at the viewer, big because they are closest
  for (const s of [-1, 1]) {
    const x = (v: number) => 40 + (v - 40) * s
    d.part(m().limb([x(34.5), 56, x(29), 62, x(24), 68], [3.4, 2.9, 2.7]), YELLOW, { bevel: 2.5 })
    const paw = m().ellipse(x(22.5), 70.5, 4.4, 3.2, -30 * s)
    d.part(paw, YELLOW, { bevel: 2.5 })
    for (const [dx, dy] of pts([-2, 0, 0.5, 1.5]))
      d.fill(
        m()
          .rect(x(22.5 + dx) - (s < 0 ? 1 : 0), 71.5 + dy, 1, 2)
          .and(paw),
        YELLOW[1],
      )
    // a tuft of spikes on the elbow
    d.part(spike(spike(m(), x(30.5), 59.5, -5 * s, -3.5, 1.6), x(28), 61.5, -5.5 * s, -0.5, 1.4), YELLOW, {
      bevel: 1.5,
    })
  }

  // the white ruff: a collar of long spikes under the head
  const ruff = burst(m().ellipse(40, 52, 11, 5.5), 40, 50, 8, 172, 9, 6, 17, 2.8)
  d.part(ruff, WHITE, { bevel: 3 })

  // ears: tall, pointed, flared outwards
  for (const s of [-1, 1]) {
    const x = (v: number) => 40 + (v - 40) * s
    const ear = m().poly([x(31), 37, x(23.5), 16.5, x(38.5), 31.5])
    d.part(ear, YELLOW, { bevel: 2.5 })
    d.fill(ear.shrunk(1).and(m().poly([x(32.5), 34, x(25.5), 20.5, x(36), 31.5])), YELLOW[1])
  }

  // head: round, spiky cheeks, a short muzzle pointing at the viewer
  const head = m().ellipse(40, 41, 9.6, 8.2)
  spike(head, 31.5, 43, -5.5, 2.5, 2)
  spike(head, 32, 46, -4, 4, 1.8)
  spike(head, 48.5, 43, 5.5, 2.5, 2)
  spike(head, 48, 46, 4, 4, 1.8)
  spike(head, 40, 33.5, 0, -5, 2.4)
  spike(head, 36, 34, -2, -4, 1.8)
  spike(head, 44, 34, 2, -4, 1.8)
  d.part(head, YELLOW, { bevel: 5 })
  d.part(m().ellipse(40, 46, 4.6, 3.2), YELLOW, { bevel: 2, line: 'shadow' })
  const mouth = m().poly([37, 47.5, 43, 47.5, 41.5, 50, 38.5, 50])
  d.contact(mouth).fill(mouth, YELLOW[0])
  d.stamp(['kk', 'kk'], 39, 45, { k: OUTLINE })
  const face = { k: OUTLINE, e: YELLOW[0], w: WHITE[3] }
  d.stamp(EYE_L, 32, 37, face)
  d.stamp(EYE_R, 42, 37, face)

  // the storm light catches the left-hand rims
  d.tone(d.mask().facing([-1, 0]), 1)
}

/** One needle of light: a white core, a yellow side and a cyan trail behind it. */
function needle(p: Painter, deg: number, from: number, len: number): void {
  const a = (deg * Math.PI) / 180
  const [ux, uy] = [Math.cos(a), Math.sin(a)]
  const at = (r: number): Pt => P(CORE[0] + ux * r, CORE[1] + uy * r)
  const [t0, t1, t2] = [at(from - 5), at(from), at(from + len)]
  const trail = p.m().line(t0[0], t0[1], t1[0], t1[1]).minus(p.subjectMask)
  const core = p.m().line(t1[0], t1[1], t2[0], t2[1])
  p.fill(trail, BOLT[0])
  p.fill(core.moved(Math.round(-uy), Math.round(ux)).minus(p.subjectMask), YELLOW[3])
  p.fill(core.minus(p.subjectMask), BOLT[2])
}

const NEEDLES = [
  [-150, 27, 7],
  [-128, 29, 6],
  [-52, 29, 6],
  [-30, 27, 7],
  [-8, 27, 8],
  [14, 29, 8],
  [34, 30, 7],
  [148, 30, 7],
  [166, 28, 8],
  [188, 28, 7],
] as const

export const blitza: CardDef = {
  id: 'pkm-jungle-074',
  number: 74,
  name: 'Blitza',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Elektro',
  hp: 70,
  attacks: [
    { name: 'Nadelrakete', cost: ['Elektro', 'Elektro', 'Farblos'], damage: '20×' },
    { name: 'Ruckzuckhieb', cost: ['Farblos', 'Farblos'], damage: '10+' },
  ],
  // the lightning, its flash and the needles shine; fox, clouds and canopy stay matt
  foil: 'painted',
  draw(p) {
    storm(p)
    const d = p.layer()
    jolteon(d)
    p.subject(d, OUTLINE)
    p.shine(true)
    for (const [deg, from, len] of NEEDLES) needle(p, deg, from, len)
    p.shine(false)
  },
}
