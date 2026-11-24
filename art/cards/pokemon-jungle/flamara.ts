import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, quad, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Flamara (Ultra). Brief: fire fox sitting upright on a black volcanic rock, chest out, mane and tail
 * fluffed like flames, breathing a spiral of fire upwards; jungle edge at sunset, smoke drifting
 * through palm silhouettes, embers in the air. Full art, 80×112.
 *
 * Composition: the fox sits right of the centre on the rock, turned three quarters to the left, head
 * thrown back; the fire leaves its mouth and coils upwards through the top left corner. The tail
 * rises behind it on the right in front of a palm, the sun sinks behind the jungle on the left, so
 * the orange body reads against the dark tree line and the fire against the dusky upper sky. The
 * name plate covers rows 5–15, the attack plate 88–106.
 */
const SKY = colors('1c0a1c', '361028', '5e1830', '922a28', 'c64e22', 'ec8a30', 'f8c060')
const SUN = hex('fff0b4')
const JUNGLE = colors('0c050c', '1a0b14')
const ROCK = colors('0b080c', '1d1720', '332831', '4f414a')
const FUR = colors('561410', '96281a', 'cf4a1e', 'f07638', 'ffaa66')
const MANE = colors('9a6026', 'd8a044', 'f4d07a', 'fff2c2')
const FIRE = colors('e85a1a', 'fca42c', 'ffe45e', 'fffbd8')
const MOUTH = hex('5a1214')
const OUTLINE = hex('180608')

const P = (x: number, y: number): Pt => [x, y]

const SUN_AT = P(15, 61)
const HORIZON = 63
const MOUTH_AT = P(28, 42.5)

function sunset(p: Painter): void {
  // dusky violet overhead, glowing amber down at the horizon and round the sun
  p.dither(
    null,
    SKY,
    (x, y) => {
      const down = Math.pow(Math.min(1, Math.max(0, y - 10) / (HORIZON - 10)), 1.25) * 0.8
      const glow = Math.max(0, 1 - Math.hypot(x - SUN_AT[0], (y - SUN_AT[1]) * 1.4) / 44) * 0.45
      return Math.min(1, down + glow)
    },
    0.7,
  )
  p.register(SKY)

  // the sun, half sunk, veiled by streaks of smoke
  p.shine(true)
  const sun = p.m().disc(SUN_AT[0], SUN_AT[1], 7.5)
  p.fill(sun, SUN)
  p.fill(sun.facing([1, 0, 0, 1]), SKY[6])
  p.shine(false)
  const smoke = p.m()
  for (let y = 26; y < HORIZON; y++)
    for (let x = 0; x < 80; x++) {
      const band = Math.sin(y * 0.9 + noise(x, y, 7, 9) * 5 + x * 0.06)
      if (band > 0.55 && noise(x * 0.4, y, 3, 6) > 0.45) smoke.add(x, y)
    }
  p.tone(smoke, -1)
  p.tone(smoke.clone().and(sun), -1)

  // far jungle: a ragged tree line on the horizon with two little palms
  const far = p.m()
  for (let x = -4; x < 84; x += 6) far.blob(x, HORIZON + 2, 5, 3.5 + ((x * 7) % 3), x + 40, 0.3)
  far.rect(0, HORIZON + 2, 80, 50)
  for (const [x, top] of pts([4, 44, 27, 49])) {
    far.or(p.m().limb([x + 1, HORIZON + 2, x, (HORIZON + top) / 2, x + 1.5, top], 0.9))
    for (const deg of [200, 235, 305, 340, 270]) {
      const a = (deg * Math.PI) / 180
      far.or(
        p
          .m()
          .path(
            quad(
              P(x + 1.5, top),
              P(x + 1.5 + Math.cos(a) * 4, top + Math.sin(a) * 4 - 1),
              P(x + 1.5 + Math.cos(a) * 7, top + Math.sin(a) * 7 + 3),
            ),
          ),
      )
    }
  }
  p.fill(far, JUNGLE[1])

  // near palm on the right: a leaning trunk and drooping fronds, black against the sky
  const palm = p.m().limb([81, 92, 76, 64, 72, 40, 71, 26], [2.6, 2.2, 1.9, 1.6])
  const crown = P(71, 25)
  for (const [deg, len, droop] of [
    [188, 24, 10],
    [212, 19, 7],
    [244, 13, 4],
    [296, 14, 5],
    [330, 20, 9],
    [356, 16, 11],
    [160, 17, 9],
  ] as const) {
    const a = (deg * Math.PI) / 180
    const tip = P(crown[0] + Math.cos(a) * len, crown[1] + Math.sin(a) * len + droop)
    const mid = P(crown[0] + Math.cos(a) * len * 0.6, crown[1] + Math.sin(a) * len * 0.6 - 3)
    const spine = quad(crown, mid, tip, 12)
    palm.or(p.m().path(spine))
    spine.forEach(([x, y], i) => {
      if (i < 2) return
      const hang = 3.4 * (1 - i / 14)
      palm.or(p.m().line(x, y, x - 1, y + hang)).or(p.m().line(x, y, x + 1, y + hang))
    })
  }
  p.fill(palm, JUNGLE[0])
  p.fill(palm.facing([-1, 0]).and(p.m().rect(0, 30, 80, 40)), SKY[2])

  // near jungle below the horizon, darker
  const near = p.m()
  for (let x = -6; x < 86; x += 9) near.blob(x, 74 + ((x * 5) % 4), 7, 5, x + 11, 0.3)
  near.rect(0, 76, 80, 40)
  p.fill(near, JUNGLE[0])

  // the volcanic rock: black, porous, its top rim caught by the sunset
  const rock = p
    .m()
    .poly([8, 112, 11, 90, 16, 86.5, 26, 84.5, 38, 84.5, 52, 85, 64, 84, 71, 86, 76, 90, 78, 112])
  p.part(rock, ROCK, { bevel: 4, line: 'none' })
  p.fill(rock.facing([0, -1]).minus(rock.facing([1, 0])), SKY[3])
  for (const [x, y] of pts([20, 89, 27, 87.5, 58, 87.5, 67, 89]))
    p.fill(p.m().ellipse(x, y, 1.6, 0.8), ROCK[0])
}

/** A tuft of fur: a pointed lock from (x, y) out to (x + dx, y + dy), `w` wide at the root, its side bowed. */
function tuft(m: Mask, x: number, y: number, dx: number, dy: number, w: number): Mask {
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * w
  const ny = (dx / len) * w
  return m.poly([
    x + nx,
    y + ny,
    x + dx * 0.55 + nx * 0.8,
    y + dy * 0.55 + ny * 0.8,
    x + dx,
    y + dy,
    x - nx,
    y - ny,
  ])
}

/** The fox's eye looking up and left: k = line, e = dark iris, w = glint. */
const EYE = ['.kkk.', 'kwek.', 'keeek', 'keeek', '.kkk.']

function flareon(d: Painter): void {
  const m = (): Mask => d.m()

  // the bushy tail rising behind it on the right, tufted like a flame
  const tail = m().limb([58, 81, 66, 75, 71, 64, 70, 52, 64, 44], [4, 6.4, 7.4, 6.4, 4])
  for (const [x, y, dx, dy] of [
    [75, 71, 3.5, -1],
    [77.5, 62, 3, -3],
    [76.5, 52, 1.5, -4.5],
    [71, 44.5, -1.5, -4.5],
    [64, 41, -4, -3],
    [62.5, 52, -4, 0.5],
    [63, 62, -3.5, 1.5],
  ] as const)
    tuft(tail, x, y, dx, dy, 2.2)
  d.part(tail, MANE, { bevel: 5 })
  for (const strand of [
    [66, 76, 70, 66, 70, 57],
    [64, 68, 65, 58, 63, 49],
  ])
    d.fill(m().path(spline(strand, 4)).and(tail.shrunk(2)), MANE[1])

  // far ear behind the head
  const farEar = m().poly([32.5, 41, 37.5, 26.5, 40.5, 39])
  d.part(farEar, FUR, { bias: -1, bevel: 2.5 })
  d.fill(farEar.shrunk(1).and(m().poly([35, 39, 37.5, 30, 39, 38])), FUR[1])

  // body: the folded hind leg on the rock, the torso under the mane, the hind paw in front
  d.part(m().ellipse(54, 75, 10.5, 9, -10), FUR, { bevel: 7 })
  d.part(m().ellipse(46, 67, 10, 9), FUR, { bevel: 6 })
  d.part(m().ellipse(47.5, 84, 5.5, 2.5), FUR, { bevel: 2.5 })

  // front legs, straight down to the rock, the far one in shadow
  d.part(m().limb([44, 68, 44.5, 76, 44.5, 83], [3.2, 2.9, 2.8]), FUR, { bias: -1, bevel: 3 })
  d.part(m().ellipse(44, 84, 3.8, 2), FUR, { bias: -1, bevel: 2 })
  d.part(m().limb([36, 65, 35.5, 75, 35, 83], [3.6, 3.2, 3.1]), FUR, { bevel: 3 })
  d.part(m().ellipse(34, 84, 4.4, 2.2), FUR, { bevel: 2 })
  for (const x of [32, 34.5]) d.fill(m().rect(x, 84, 1, 2), FUR[1])

  // the mane: a ruff round the neck, its locks hanging over the chest like flames
  const mane = m().ellipse(40.5, 58.5, 9.5, 8)
  for (const [x, y, r] of [
    [31.5, 55, 3.4],
    [31.5, 61, 3.4],
    [35.5, 65, 3.6],
    [41, 66.5, 3.6],
    [46, 65, 3.4],
    [50, 60.5, 3.2],
    [50.5, 54, 3],
  ] as const)
    mane.disc(x, y, r)
  for (const [x, y, dx, dy] of [
    [34, 67, -1.5, 4],
    [40.5, 69, 0.5, 4],
    [46.5, 67, 2, 3.5],
    [29, 58, -3.5, 1.5],
  ] as const)
    tuft(mane, x, y, dx, dy, 1.8)
  d.part(mane, MANE, { bevel: 5 })
  for (const strand of [
    [36, 58, 36.5, 63, 35, 66],
    [41.5, 59, 41.5, 64, 40.5, 67],
    [46, 57, 46.5, 62, 48, 64],
  ])
    d.fill(m().path(spline(strand, 4)).and(mane.shrunk(2)), MANE[1])

  // head thrown back, muzzle up to the left, jaws open
  d.part(m().ellipse(41.5, 47.5, 9.5, 8.5, -25), FUR, { bevel: 7 })
  d.part(m().ellipse(32.5, 44, 5.8, 4, -38), FUR, { bevel: 3, line: 'shadow' })
  const mouth = m().poly([27.5, 43.5, 31.5, 45.5, 34, 49, 30, 48.5, 28, 46])
  d.contact(mouth).fill(mouth, MOUTH)
  d.fill(m().ellipse(30.5, 47.2, 1.8, 0.9).and(mouth), FUR[1])
  d.px(27, 41, OUTLINE).px(28, 41, FUR[0])

  // near ear, tall and pointed, laid back
  const ear = m().poly([43, 41, 56, 28, 50.5, 44.5])
  d.part(ear, FUR, { bevel: 2.5 })
  d.fill(ear.shrunk(1).and(m().poly([46, 41, 54, 31, 49.5, 42.5])), FUR[1])

  // the cream tuft on the forehead
  const fringe = m().ellipse(41, 39.5, 4.6, 3, -20).disc(38, 37.5, 2.4).disc(42.5, 36.5, 2.2)
  tuft(fringe, 36.5, 36.5, -2.5, -2.5, 1.4)
  d.part(fringe, MANE, { bevel: 2.5 })

  d.stamp(EYE, 35, 40, { k: OUTLINE, e: FUR[0], w: MANE[3] })

  // the sun warms the left-hand rims
  d.tone(d.mask().facing([-1, 0]), 1)
}

const SWIRL_AT = P(15.5, 27)
const SWIRL_R = 9.5

/** The fire's centre line and thickness: up out of the mouth, then 1.4 turns curling in over the top. */
function swirlPath(): { line: Pt[]; radii: number[] } {
  const line: Pt[] = []
  const radii: number[] = []
  const entry = P(SWIRL_AT[0] + SWIRL_R, SWIRL_AT[1])
  quad(MOUTH_AT, P(29.5, 33), entry, 6).forEach((pt, i) => {
    line.push(pt)
    radii.push(1.6 + (i / 6) * 2.6)
  })
  const n = 24
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const a = -t * Math.PI * 2 * 1.4
    const r = SWIRL_R * (1 - t * 0.8)
    line.push(P(SWIRL_AT[0] + Math.cos(a) * r, SWIRL_AT[1] + Math.sin(a) * r))
    radii.push(4.2 * (1 - t) + 0.7)
  }
  return { line, radii }
}

/** The fire as a mask, scaled in thickness; inner layers sit towards the hot side. */
function fireLayer(p: Painter, scale: number): Mask {
  const { line, radii } = swirlPath()
  return p.m().limb(
    line,
    radii.map((r) => r * scale),
  )
}

export const flamara: CardDef = {
  id: 'pkm-jungle-073',
  number: 73,
  name: 'Flamara',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Feuer',
  hp: 70,
  attacks: [
    { name: 'Flammenwerfer', cost: ['Feuer', 'Feuer', 'Farblos', 'Farblos'], damage: '60' },
    { name: 'Ruckzuckhieb', cost: ['Farblos', 'Farblos'], damage: '10+' },
  ],
  // the sun, the fire spiral and the embers shine; fox, rock and jungle stay matt
  foil: 'painted',
  draw(p) {
    sunset(p)
    const flame = fireLayer(p, 1)
    const d = p.layer()
    flareon(d)
    d.tone(d.mask().and(flame.grown(4)), 1)
    p.subject(d, OUTLINE)

    p.shine(true)
    // glow on the dusk air round the fire, then the fire itself and the embers
    flame
      .grown(2)
      .minus(flame)
      .minus(p.subjectMask)
      .each((x, y) => {
        if (bayer(x, y) < 0.5) p.set(x, y, SKY[3])
      })
    p.fill(flame, FIRE[0])
    p.fill(fireLayer(p, 0.72), FIRE[1])
    p.fill(fireLayer(p, 0.46), FIRE[2])
    p.fill(fireLayer(p, 0.2), FIRE[3])
    // embers drift up in the air round the fox, never on it
    const rand = rng(9)
    for (let i = 0; i < 26; i++) {
      const x = 4 + Math.floor(rand() * 72)
      const y = 18 + Math.floor(rand() * 48)
      const c = rand() < 0.5 ? FIRE[1] : FIRE[2]
      if (p.subjectMask.grown(1).has(x, y) || flame.has(x, y)) continue
      p.px(x, y, c)
      if (rand() < 0.35 && !p.subjectMask.grown(1).has(x, y + 1)) p.px(x, y + 1, FIRE[0])
    }
    p.shine(false)
  },
}
