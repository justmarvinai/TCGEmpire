import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Herbeigerufener Totenkopf, the Grail of MRD. Brief: skeletal fiend crouched forward, a lightning
 * arc jumping between its raised claws, leathery wings flared into a V round the horned skull; night
 * storm over a ruined duel arena. Full art, 80×112.
 *
 * Composition: the fiend squats on the arena floor, the skull pushed forward between hunched
 * shoulders. Its wings rise from the shoulder blades towards the upper corners in a V that frames the
 * horns, and two forked bolts strike down inside that V. Its claws hold an arc of lightning in front
 * of the ribcage: with the bolts the only bright light. Broken pillars stand low on both sides. Text
 * plates float over rows 0–13 and 90–111.
 */
const SKY = colors('030209', '090720', '120e34', '1c174a', '2a2264', '3c3282', '5446a4')
const BOLT = colors('9a86e0', 'fff08a', 'ffffff')
const BONE = colors('2a2030', '584852', '8a786c', 'c0ae90', 'ece2c2')
const WING = colors('170f22', '2e2042', '4a3664', '6a5288', '8a72a8')
const BLOOD = colors('5c0a1a', 'c42a38')
const STONE = colors('0a0812', '17131f', '262130', '3a3446', '544b62')
const VOID = hex('0c0612')
const OUTLINE = hex('040208')

const P = (x: number, y: number): Pt => [x, y]

/** The claws that hold the arc, and how far the arc sags between them. */
const LEFT_CLAW = P(26, 55)
const RIGHT_CLAW = P(54, 55)
const SAG = 3

/** A jagged bolt: a random walk across the straight line from `from` to `to`. */
function boltPath(from: Pt, to: Pt, rand: () => number, jag: number): Pt[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const n = Math.max(2, Math.round(len / 3.2))
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

/** Paint bolts: a dithered violet halo, a pale yellow sheath, white cores; forks stay pale yellow. */
function bolts(p: Painter, cores: Mask, forks: Mask): void {
  cores
    .grown(2)
    .or(forks.grown(1))
    .each((x, y) => {
      if ((x + y) % 2 === 0) p.set(x, y, BOLT[0])
    })
  p.fill(cores.grown(1), BOLT[1])
  p.fill(forks, BOLT[1])
  p.fill(cores, BOLT[2])
}

function storm(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      // black at the top corners, storm light behind the head and low over the arena rim
      const low = Math.max(0, 1 - Math.abs(y - 62) / 22) * 0.38
      const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 24) * 0.75) / 40)
      const cloud = noise(x * 0.6, y * 1.4, 21, 11) * 0.34 + noise(x, y, 5, 4) * 0.08
      return low + glow * glow * 0.55 + cloud - 0.16
    },
    0.7,
  )
  const rand = rng(88)
  const cores = p.m()
  const forks = p.m()
  for (const [from, to, fork] of [
    [P(11, -2), P(25, 36), P(5, 30)],
    [P(69, -2), P(55, 36), P(76, 31)],
  ] as const) {
    const path = boltPath(from, to, rand, 2)
    cores.path(path)
    const at = path[Math.floor(path.length * 0.5)] ?? from
    forks.path(boltPath(at, fork, rand, 1.4))
  }
  bolts(p, cores, forks)
  p.shine(false)

  // the ruined arena: stepped tiers on the horizon, silhouetted against the storm light
  const tiers = p
    .m()
    .poly([0, 54, 6, 54, 6, 57, 12, 57, 12, 60, 20, 60, 20, 62, 60, 62, 60, 60, 67, 60, 67, 57, 73, 57, 73, 53, 76, 52, 77, 54, 80, 54, 80, 66, 0, 66])
  p.fill(tiers, STONE[1])
  p.fill(tiers.facing([0, -1]), STONE[2])
  // the duel floor: dark flagstones, a pool of light from the arc round the feet, the ring of the field
  const floor = p.m().rect(0, 62, 80, 50)
  p.dither(
    floor,
    STONE.slice(0, 4),
    (x, y) => 0.95 - Math.hypot((x - 40) / 2.4, (y - 85) * 1.3) / 17 + noise(x, y, 3, 3) * 0.2 - Math.max(0, 70 - y) / 14,
    0.6,
  )
  p.fill(p.m().rect(0, 62, 80, 1), STONE[2])
  for (const [y0, y1] of [
    [66, 66],
    [71, 72],
  ] as const)
    p.fill(p.m().line(0, y0, 80, y1).and(floor), STONE[0])
  p.fill(
    p
      .m()
      .ellipse(40, 83, 31.5, 6.5)
      .minus(p.m().ellipse(40, 83, 30.5, 5.5))
      .and(floor),
    STONE[0],
  )
  for (const crack of [
    [11, 73, 15, 78, 13, 84],
    [67, 72, 70, 77, 73, 80],
  ])
    p.fill(p.m().path(crack).and(floor), STONE[0])
  pillar(p, 3, 12, [61, 60, 63, 64, 67, 66])
  pillar(p, 68, 77, [70, 68, 69, 66, 64, 66])
}

/** A broken column standing on the floor: round shading lit from the left, two flutes, a jagged break. */
function pillar(p: Painter, x0: number, x1: number, top: readonly number[]): void {
  const outline: number[] = [x0, 100]
  top.forEach((y, i) => outline.push(x0 + ((x1 - x0) * i) / (top.length - 1), y))
  outline.push(x1, 100)
  const shaft = p.m().poly(outline)
  p.dither(shaft, STONE.slice(1), (x) => 1 - ((x - x0) / (x1 - x0)) * 0.8, 0.35)
  for (const f of [0.38, 0.7]) {
    const x = Math.round(x0 + (x1 - x0) * f)
    p.fill(p.m().rect(x, 0, 1, 112).and(shaft.shrunk(1)).minus(shaft.facing([0, -1]).grown(1)), STONE[1])
  }
  // the joint between two drums of the column, curving with its round body
  const y = Math.max(...top) + 8
  const joint = p.m().path(quad(P(x0, y), P((x0 + x1) / 2, y + 2), P(x1, y))).and(shaft)
  p.fill(joint, STONE[0])
  p.fill(joint.moved(0, 1).and(shaft).minus(joint), STONE[3])
  p.fill(shaft.facing([0, -1]), STONE[4])
  p.fill(shaft.facing([1, 0]).minus(shaft.facing([0, -1])), STONE[0])
}

interface WingShape {
  /** Shoulder, elbow, wrist. */
  arm: readonly [Pt, Pt, Pt]
  /** Tip of the claw on the wrist. */
  claw: Pt
  /** Tips of the finger bones, from the outside in, and where the membrane meets the body. */
  tips: readonly [Pt, Pt, Pt, Pt]
  bias: number
}

/** A leathery wing: bony arm, three finger bones fanning from the wrist, membrane sagging between. */
function wing(d: Painter, s: WingShape): void {
  const [shoulder, elbow, wrist] = s.arm
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    const mid = P(((a[0] + b[0]) / 2) * 0.68 + wrist[0] * 0.32, ((a[1] + b[1]) / 2) * 0.68 + wrist[1] * 0.32)
    edge.push(...quad(a, mid, b, 6))
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.shade(membrane, WING, { bias: s.bias, bevel: 7 })
  for (let i = 0; i < 3; i++) {
    const a = s.tips[i] ?? wrist
    const b = s.tips[i + 1] ?? wrist
    d.tone(
      d
        .m()
        .poly([wrist, P(a[0] * 0.55 + b[0] * 0.45, a[1] * 0.55 + b[1] * 0.45), b])
        .and(membrane),
      -1,
    )
  }
  for (const tip of s.tips.slice(0, 3))
    d.part(d.m().limb([wrist, tip], [1.3, 0.5]), BONE, { bias: s.bias, line: 'shadow' })
  d.part(d.m().limb(s.arm, [2.8, 2.2, 1.7]), BONE, { bias: s.bias })
  const [wx, wy] = wrist
  d.part(d.m().poly([wx - 1.5, wy + 1, s.claw[0], s.claw[1], wx + 1.5, wy + 1]), BONE, { bias: s.bias })
  // crimson knuckles at the wrist and the elbow
  d.fill(d.m().disc(wx, wy, 1.6), BLOOD[1])
  d.fill(d.m().disc(elbow[0], elbow[1], 1.2), BLOOD[0])
}

const LEFT_WING: WingShape = {
  arm: [P(33, 44), P(21, 34), P(8, 24)],
  claw: P(6, 17),
  tips: [P(1, 33), P(3, 49), P(12, 59), P(28, 54)],
  bias: 0,
}
const RIGHT_WING: WingShape = {
  arm: [P(47, 44), P(58, 35), P(70, 26)],
  claw: P(72, 19),
  tips: [P(78, 35), P(76, 50), P(67, 58), P(52, 54)],
  bias: -1,
}

/**
 * The skull, hand-pixelled: big cranium, brows slanting down into the sockets, the jaw hanging open
 * on four fangs. W l m s k = bone from light to dark, o = the void in sockets, nose and mouth.
 */
const SKULL = [
  '......WWWWlll......',
  '....WWWWWWlllll....',
  '...WWWWWWWlllllm...',
  '..WWWWWWWllllllmm..',
  '.WWWWWWWllllllllms.',
  'lWWWWWllllllllllmms',
  'lWWWWlllllllllllmms',
  'llWllllllllllllmmss',
  'llsslllllllllssmmss',
  'lmkoossllllssookmss',
  'mlkooooklmkooookmss',
  'mlmkoookllkoookmmss',
  'smlmkkklmmlkkkmmmss',
  '.smllmlkookmlmmmss.',
  '..smllmkookmlmmss..',
  '..sWlWlWlWlWlWmss..',
  '..sWoooooooooWks...',
  '..mkooooooooooks...',
  '..lsWWlWlWlWWsks...',
  '...mlllllllllmks...',
  '....smmmmmmmmks....',
]
const SKULL_KEY = { W: BONE[4], l: BONE[3], m: BONE[2], s: BONE[1], k: BONE[0], o: VOID }
const SKULL_AT = P(30, 19)
/** The glow in each socket (top-left pixel of a 2×2 ember). */
const EYES = [P(SKULL_AT[0] + 4, SKULL_AT[1] + 10), P(SKULL_AT[0] + 12, SKULL_AT[1] + 10)]

/** A part that casts a short shadow down and to the right onto what lies behind it. */
function cast(d: Painter, part: Mask, dx = 1, dy = 2): void {
  d.tone(part.moved(dx, dy).minus(part), -1)
}

/** A clawed hand: a bony fist with three hooked claws reaching towards the arc. */
function hand(d: Painter, x: number, y: number, way: 1 | -1, bias: number): void {
  d.part(d.m().ellipse(x, y, 3, 2.8), BONE, { bias })
  const claws = ['www.', '...w', 'www.', '...w', 'www.', '...w']
  d.stamp(claws, Math.round(x) + (way > 0 ? 2 : -5), Math.round(y) - 3, { w: BONE[4] }, way < 0)
}

function fiend(d: Painter): void {
  const m = (): Mask => d.m()
  wing(d, RIGHT_WING)
  wing(d, LEFT_WING)

  // the tail, from behind the hips down behind the right leg (its end curls round the foot later)
  d.part(m().limb([44, 64, 55, 72, 62, 80], [2.2, 1.8, 1.5]), WING, { bias: -1 })

  // crouched legs: sinewy thighs out to bony knees, shins down to long splayed feet
  for (const [hip, knee, ankle, toe, bias] of [
    [P(36, 64), P(27, 70), P(28.5, 81), P(21.5, 86), 0],
    [P(44, 64), P(53, 70), P(51.5, 81), P(58.5, 86), -1],
  ] as const) {
    d.part(m().limb([hip, knee], [5, 4]), WING, { bias })
    d.part(m().limb([P(hip[0], hip[1] - 1.5), P(knee[0], knee[1] - 1.5)], [2, 1.6]), BONE, { bias: bias - 1, line: 'none' })
    d.part(m().limb([knee, ankle], [3, 2.2]), BONE, { bias: bias - 1 })
    d.part(m().disc(knee[0], knee[1], 3), BONE, { bias })
    d.part(m().limb([ankle, toe], [2.4, 1.4]), BONE, { bias: bias - 1 })
  }
  for (const [x, y] of [P(18, 85), P(21, 87), P(58, 85), P(61, 87)]) d.stamp(['ww', 'w.'], x, y, { w: BONE[4] })

  // the end of the tail curls round the right foot and ends in a bone barb
  d.part(m().limb([62, 80, 64, 86, 58, 88.5, 50, 87.5, 47, 84], [1.5, 1.4, 1.3, 1.1, 0.9]), WING)
  d.part(m().poly([44, 80, 48.5, 83, 46, 86]), BONE, { bevel: 1 })

  // torso: a dark sinewy barrel under the ribcage, spine and pelvis below
  const torso = m().ellipse(40, 51, 10.5, 9).poly([31, 53, 49, 53, 45.5, 63, 34.5, 63])
  d.part(torso, WING, { bias: -1 })
  for (let y = 58; y < 63; y += 2) d.part(m().ellipse(40, y + 0.5, 1.7, 1), BONE, { bias: -1, bevel: 1 })
  d.part(m().ellipse(40, 64.5, 7.5, 3), BONE, { bevel: 2 })

  // the ribcage worn like armour: four bony plates either side of a sternum
  for (let i = 0; i < 4; i++) {
    const y = 44.5 + i * 3.3
    const w = 9.6 - Math.abs(i - 1.2) * 1.1
    for (const side of [-1, 1]) {
      const rib = m().limb([40 + side * 1.5, y, 40 + side * w * 0.65, y - 0.6, 40 + side * w, y + 2.2], [1.5, 1.3, 0.9])
      d.part(rib, BONE, { bevel: 1.5, bias: side > 0 ? -1 : 0 })
    }
  }
  d.part(m().limb([40, 43, 40, 55.5], [1.5, 1.1]), BONE, { bevel: 1.5 })

  // arms: sinewy upper arms out to the elbows, bony forearms raised so the claws meet at chest height
  for (const [shoulder, elbow, wrist, way, bias] of [
    [P(29, 46), P(17, 60), P(21.5, 55.5), 1, 0],
    [P(51, 46), P(63, 60), P(58.5, 55.5), -1, -1],
  ] as const) {
    d.part(m().limb([shoulder, elbow], [3.6, 2.8]), WING, { bias: bias - 1 })
    d.part(m().limb([shoulder, elbow], [2, 1.6]), BONE, { bias: bias - 1, line: 'none' })
    d.part(m().limb([elbow, wrist], [2.8, 2.6]), BONE, { bias })
    hand(d, wrist[0], wrist[1], way, bias)
  }

  // hunched shoulders: bone pauldrons with a spike each
  for (const [x, y, sx, sy, bias] of [
    [28, 44, 21, 37, 0],
    [52, 44, 59, 37, -1],
  ] as const) {
    d.part(m().poly([x - 2.5, y - 2, sx, sy, x + 2, y - 3.5]), BONE, { bias, bevel: 1 })
    d.part(m().ellipse(x, y, 5.4, 4, x < 40 ? 20 : -20), BONE, { bias, bevel: 3 })
  }

  // neck and horns behind the skull, then the skull
  d.part(m().limb([40, 37, 40, 44], [3.6, 4.2]), WING, { bias: -1 })
  for (const [pts, bias] of [
    [[33, 24, 27, 22, 23.5, 17, 25, 13.5], 0],
    [[46, 24, 52, 22, 55.5, 17, 54, 13.5], -1],
  ] as const) {
    const horn = m().limb(pts, [2.8, 2.2, 1.4, 0.5])
    d.part(horn, BONE, { bias, bevel: 2 })
  }
  const skull = d.layer().stamp(SKULL, SKULL_AT[0], SKULL_AT[1], SKULL_KEY)
  d.contact(skull.mask()).blit(skull)
  cast(d, skull.mask(), 0, 2)

  // the arc lights everything near it from below
  d.tone(
    d
      .mask()
      .facing([0, 1, 1, 0, -1, 0])
      .and(m().ellipse(40, 56, 19, 9)),
    1,
  )
}

/** The arc between the claws, a few sparks round it, and the embers in the sockets. */
function arc(p: Painter): void {
  p.shine(true)
  const rand = rng(31)
  const cores = p.m()
  const forks = p.m()
  const mid = P((LEFT_CLAW[0] + RIGHT_CLAW[0]) / 2, LEFT_CLAW[1] + SAG)
  const path = [...boltPath(LEFT_CLAW, mid, rand, 2), ...boltPath(mid, RIGHT_CLAW, rand, 2).slice(1)]
  cores.path(path)
  for (const i of [2, 6]) {
    const from = path[i] ?? mid
    forks.path(boltPath(from, P(from[0] + 2, from[1] + 4), rand, 0.8))
  }
  p.fill(cores.grown(1), BOLT[1])
  p.fill(forks, BOLT[1])
  p.fill(cores, BOLT[2])
  for (const [x, y] of EYES) p.px(x, y, BOLT[2]).px(x + 1, y, BOLT[1]).px(x, y + 1, BOLT[1]).px(x + 1, y + 1, BOLT[1])
  for (const [x, y] of [P(24, 50), P(57, 51), P(33, 62), P(48, 61)]) p.px(x, y, BOLT[1])
  p.shine(false)
}

export const summonedSkull: CardDef = {
  id: 'ygo-mrd-088',
  number: 88,
  name: 'Herbeigerufener Totenkopf',
  tier: 'grail',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'normal',
  print: { level: 6, atk: 2500, def: 1200, type: 'Unterweltler' },
  // the storm, its bolts, the arc and the burning eyes shine; fiend, arena and pillars stay matt
  foil: 'painted',
  draw(p) {
    storm(p)
    const d = p.layer()
    fiend(d)
    p.subject(d, OUTLINE)
    arc(p)
  },
}
