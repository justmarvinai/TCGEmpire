import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Scorn of the Moon (Signature), a Grail of Unleashed. Our own moon huntress: in dark violet armour
 * with silver plates, she dives head first out of the night sky like a swan, arms swept back, a
 * crescent blade in her trailing hand, her long silver hair streaming along her back. A huge full
 * moon is her halo and crescent shards circle her; far below, a jungle temple waits in the mist.
 * Full art, 80×112.
 *
 * Composition: she lies across the moon's disc on a diagonal, toes at the upper right, so her dark
 * armour reads as a silhouette on the brightest part of the card; her head leads at the lower left,
 * where it breaks out of the disc. Hair on her back, blade on her front side, so the two never cross. The frame's plates cover rows 0–13 (two gems up to
 * column 25, the number tag from column 35) and 90–112.
 */
const NIGHT = colors('07061a', '110e2c', '1d1844', '2c2560', '41377e')
const MOON = colors('8c9cd0', 'b8c6ea', 'e2eafa', 'ffffff')
const HAIR = colors('4c4878', '8e88bc', 'cfcdec', 'fbfaff')
const ARMOUR = colors('15112e', '2a2252', '453a80', '6a5cae')
const SKIN = colors('8a5866', 'd69c98', 'f8d6c8')
const GLOW = hex('9ee4ff')
const JUNGLE = colors('04080c', '0a1618', '13282a')
const OUTLINE = hex('04030c')

const P = (x: number, y: number): Pt => [x, y]
const MOON_C = P(40, 44)
const MOON_R = 27

/** Body coordinates: `t` runs from the crown of her head towards her toes, `s` across to her front. */
const CROWN = P(21, 71)
const U = P(0.55, -0.835)
const N = P(0.835, 0.55)
const A = (t: number, s: number): Pt => [CROWN[0] + U[0] * t + N[0] * s, CROWN[1] + U[1] * t + N[1] * s]
/** A flat list of (t, s) pairs as canvas points. */
const body = (...ts: number[]): number[] => {
  const out: number[] = []
  for (let i = 0; i + 1 < ts.length; i += 2) out.push(...A(ts[i] ?? 0, ts[i + 1] ?? 0))
  return out
}

function sky(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const halo = Math.max(0, 1 - (Math.hypot(x - MOON_C[0], y - MOON_C[1]) - MOON_R) / 20)
      return 0.1 + (y / 112) * 0.2 + halo * halo * 0.75 + noise(x, y, 5, 9) * 0.08
    },
    0.7,
  )
  stars(p, rng(41), 22, [MOON[3], MOON[1], HAIR[2]], { x: 2, y: 2, w: 76, h: 70 })

  // the full moon: bright, with soft grey seas and a cool rim
  const moon = p.m().disc(MOON_C[0], MOON_C[1], MOON_R)
  p.dither(
    moon,
    MOON.slice(1),
    (x, y) => 0.9 - Math.max(0, Math.hypot(x - 34, y - 36) - 14) / 30 - Math.max(0, noise(x, y, 12, 7) - 0.55) * 1.6,
    0.4,
  )
  p.fill(moon.facing([1, 0, 0, 1]), MOON[0])
  p.fill(moon.outerEdge(), NIGHT[4])
  p.shine(false)
}

/** Far below: a stepped temple in the jungle, its top catching the moon, mist between the trees. */
function jungle(p: Painter): void {
  const temple = p.m()
  for (let i = 0; i < 5; i++) temple.rect(43 + i * 3.5, 84 - i * 3, 34 - i * 7, 3)
  temple.rect(56, 66, 8, 3).poly([54.5, 66.5, 60, 62.5, 65.5, 66.5])
  p.fill(temple, JUNGLE[1])
  p.fill(temple.facing([0, -1]), JUNGLE[2])
  p.fill(temple.facing([-1, 0]), JUNGLE[2])
  p.fill(p.m().poly([54.5, 66.5, 60, 62.5, 65.5, 66.5]).facing([0, -1]), MOON[0])
  // a stair up the middle and a dark doorway at the top
  p.fill(p.m().rect(58.5, 69, 3, 15), JUNGLE[0])
  for (let y = 70; y < 84; y += 2) p.fill(p.m().rect(58.5, y, 3, 1), JUNGLE[2])
  p.fill(p.m().rect(59, 66.5, 2, 2.5), JUNGLE[0])

  const canopy = p.m()
  const rand = rng(43)
  for (let x = -4; x < 86; x += 6) {
    const y = 84 + rand() * 3 - (x < 30 ? 2 : 0)
    canopy.blob(x, y, 5 + rand() * 2, 4, Math.floor(rand() * 100), 0.3)
  }
  canopy.rect(0, 86, 80, 26)
  p.fill(canopy, JUNGLE[0])
  p.fill(canopy.facing([0, -1]), JUNGLE[2])
  // two eyes in the dark
  p.px(12, 85, GLOW).px(14, 85, GLOW)

  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [8, 79, 12, 1],
    [34, 81, 10, 2],
    [70, 83, 11, 3],
  ] as const) {
    mist.blob(x, y, rx, 1.8, seed, 0.3)
  }
  p.dither(mist, [NIGHT[2], NIGHT[3], NIGHT[4]], (x, y) => 0.5 + noise(x, y, 9, 4) * 0.4, 0.6)
}

/** Her hair: one long silver mane streaming back along her back, splitting into two locks at its end. */
function hair(d: Painter): void {
  const mane = d.m().limb(body(4, -2, 10, -5.5, 18, -7.5, 27, -8, 35, -10.5, 42, -11, 48, -14), [3.4, 3.9, 3.7, 3.3, 2.6, 1.7, 0.7])
  mane.limb(body(29, -8.5, 35, -14.5, 39, -19), [1.9, 1.4, 0.6])
  d.part(mane, HAIR, { bevel: 3 })
  // strands
  d.fill(d.m().path(body(8, -4, 18, -6, 28, -6.5, 38, -8.5)).and(mane.shrunk(1)), HAIR[1])
  d.fill(d.m().path(body(10, -7.5, 20, -9.5, 30, -10.5)).and(mane.shrunk(1)), HAIR[1])
}

/** The crescent blade: a thick arc of cold steel glowing pale blue, pointed at both ends, held at its middle. */
function crescentBlade(d: Painter, hand: Pt): void {
  const [cx, cy] = [hand[0] - 3, hand[1] - 2]
  const pts: number[] = []
  const radii: number[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const a = ((-60 + (i / n) * 170) * Math.PI) / 180
    pts.push(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11)
    radii.push(0.5 + 2.1 * Math.sin((Math.PI * i) / n))
  }
  const blade = d.m().limb(pts, radii)
  d.contact(blade)
  d.fill(blade, GLOW)
  d.fill(blade.facing([1, 0, 0, 1, 1, 1]), MOON[3])
  d.fill(blade.shrunk(1).facing([-1, 0, 0, -1]), MOON[0])
  const mid = P(cx + Math.cos((25 * Math.PI) / 180) * 11, cy + Math.sin((25 * Math.PI) / 180) * 11)
  d.part(d.m().limb([hand[0], hand[1], mid[0] - 1.5, mid[1] - 0.8], 1), ARMOUR, { bevel: 1 })
}

function huntress(d: Painter): void {
  const m = (): Mask => d.m()

  // far arm swept back along her back, under the hair
  d.part(m().limb(body(13, -4, 19, -8.5, 25, -10.5), [2.1, 1.8, 1.6]), ARMOUR, { bevel: 2, bias: -1 })
  hair(d)

  // legs together, knees soft, toes pointed; silver greaves
  const legs = m()
    .limb(body(30, -1.8, 42, -1.4, 53, -2.6, 57.5, -3), [3.6, 2.7, 1.8, 0.8])
    .limb(body(30, 1.8, 42, 2, 54, 1.2, 59, 0.8), [3.8, 2.8, 1.9, 0.8])
  d.part(legs, ARMOUR, { bevel: 3.5 })
  d.fill(m().path(body(34, 0.2, 52, -0.6)).and(legs.shrunk(1)), ARMOUR[0])
  d.part(m().limb(body(44, 2, 53.5, 1.2), [2.6, 1.9]), HAIR, { bevel: 2, line: 'shadow' })

  // body: dark suit, silver breastplate and belt
  const torso = m().poly(body(12, -4.6, 12, 4.6, 18, 5.4, 24, 4, 30, 4.6, 31.5, -4.4, 24, -3.8, 18, -4.8))
  d.part(torso, ARMOUR, { bevel: 4 })
  d.part(m().ellipse(...A(30, 0.2), 4.5, 4.5), ARMOUR, { bevel: 3 })
  const plate = m().poly(body(12.5, -3.6, 12.5, 4.3, 18, 5, 22, 3.4, 22, -3, 18, -3.8))
  d.part(plate, [MOON[0], MOON[1], MOON[2], MOON[3]], { bevel: 3 })
  d.part(m().poly(body(26.8, -4.2, 26.8, 4.6, 28.8, 4.7, 28.8, -4.2)), [MOON[0], MOON[1], MOON[2]], { bevel: 1, line: 'shadow' })

  // near arm swept back down her front, the blade in its hand
  const hand = A(27.5, 12)
  d.part(m().limb([...A(13.5, 4.6), ...A(20.5, 9.8), ...hand], [2.3, 1.9, 1.6]), ARMOUR, { bevel: 2 })
  d.part(m().ellipse(...A(14, 4.4), 3.4, 3), [MOON[0], MOON[1], MOON[2], MOON[3]], { bevel: 2 })
  crescentBlade(d, hand)
  d.part(m().disc(hand[0], hand[1], 1.8), SKIN, { bevel: 1.5 })

  // neck and head leading the dive: face looking ahead, the back of the head under the hair
  d.part(m().limb(body(8.5, 0.6, 13, 0.6), 2), SKIN, { bias: -1 })
  const head = m().ellipse(...A(4.8, 1), 4.8, 4.8)
  d.part(head, SKIN, { bevel: 5 })
  const cap = m().poly(body(-0.6, -1.2, 1.2, -4.4, 6, -5.6, 10, -3.4, 9, 0.6, 5, -0.2, 2.2, 0.4))
  d.part(cap.and(head.grown(1)), HAIR, { bevel: 2 })
  for (const [t, sv, c] of [
    [3.2, 2.6, OUTLINE],
    [4.2, 2.6, OUTLINE],
    [2.4, 2, HAIR[0]],
    [3.4, 1.8, HAIR[0]],
    [6.8, 4, SKIN[0]],
  ] as const) {
    const [x, y] = A(t, sv).map(Math.round) as [number, number]
    d.px(x, y, c)
  }

  // the moon behind her rims the dark armour with light
  const all = d.mask()
  const armour = m()
  all.each((x, y) => {
    if (ARMOUR.includes(d.get(x, y))) armour.add(x, y)
  })
  d.fill(all.facing([0, -1, 1, 0]).and(armour), ARMOUR[3])
}

/** Crescent shards circling her: small new moons, lit side out. */
const SHARDS = [
  [13, 31, 3.2, 200],
  [68, 27, 3.6, -30],
  [71, 61, 3.2, 20],
  [12, 60, 3.6, 160],
  [30, 20, 2.6, -110],
  [55, 72, 2.8, 70],
] as const

function shards(p: Painter): void {
  p.shine(true)
  for (const [x, y, r, deg] of SHARDS) {
    const a = (deg * Math.PI) / 180
    const shard = p
      .m()
      .disc(x, y, r)
      .minus(p.m().disc(x - Math.cos(a) * r * 0.55, y - Math.sin(a) * r * 0.55, r * 0.9))
      .minus(p.subjectMask)
    p.fill(shard.grown(1).minus(shard).minus(p.subjectMask), NIGHT[1])
    p.fill(shard, MOON[3])
    p.fill(shard.facing().and(p.m().disc(x + Math.cos(a) * r, y + Math.sin(a) * r, r)), GLOW)
  }
  p.shine(false)
}

export const dianaSignature: CardDef = {
  id: 'rb-unl-085',
  number: 85,
  name: 'Diana, Scorn of the Moon (Signature)',
  tier: 'grail',
  kind: 'legend',
  element: 'Mind',
  print: { domain2: 'Chaos' },
  // the sky, the moon and the shards shine; the huntress, the jungle and the temple stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    jungle(p)
    const d = p.layer()
    huntress(d)
    p.subject(d, OUTLINE)
    shards(p)
  },
}
