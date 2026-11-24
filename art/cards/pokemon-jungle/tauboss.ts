import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rng, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Tauboss (Ultra). Brief: great bird hovering in a mighty downstroke, talons forward, the long
 * red-and-yellow crest plume streaming back; above the canopy, a hurricane spiral of leaves and wind
 * lines below it, a river winding into the distance. Full art, 80×112.
 *
 * Composition: the bird hovers high above the jungle, turned three quarters to the left, both wings
 * driven down so they arch over the whole width of the card; the crest streams back to the right.
 * Far below, the canopy runs to a hazy horizon behind its shoulders, a river winds into the distance
 * and the downdraught whips the treetops into a spiral of wind and leaves. The name plate covers
 * rows 5–15, the attack plate 88–106.
 */
const SKY = colors('3a74c4', '5a98dc', '8ec0ee', 'c8e4f8')
const HAZE = hex('7eaab8')
const CANOPY = colors('143a24', '22582c', '377a34', '5e9e44')
const WIND = hex('ffffff')
const BROWN = colors('3a2014', '683e24', '9a6236', 'c8905a', 'ecc48a')
const CREAM = colors('b08e5e', 'e6d2a0', 'fff4d8')
const CREST = colors('9e1c26', 'e0403a', 'f8c434', 'fff08a')
const BEAK = colors('7a4a4e', 'c49090', 'ecc8c0')
const OUTLINE = hex('1c0e0a')

const P = (x: number, y: number): Pt => [x, y]

const HORIZON = 52
/** Eye of the spiral the wings blow into the treetops. */
const VORTEX = P(42, 80)

function aerial(p: Painter): void {
  // clear sky, paler down towards the haze on the horizon
  p.dither(
    p.m().rect(0, 0, 80, HORIZON),
    SKY.slice().reverse(),
    (_x, y) => 1 - Math.pow(y / HORIZON, 1.4),
    0.6,
  )
  // a few thin clouds
  for (const [x, y, w] of [
    [4, 24, 18],
    [52, 30, 22],
    [60, 40, 14],
  ] as const) {
    p.fill(p.m().rect(x, y, w, 1), SKY[3])
    p.fill(p.m().rect(x + 3, y - 1, w - 7, 1), SKY[3])
  }

  // jungle seen from high above: hazy far away, the crowns getting bigger and darker towards us
  const land = p.m().rect(0, HORIZON, 80, 60)
  p.dither(
    land,
    [HAZE, CANOPY[3], CANOPY[2], CANOPY[1]],
    (x, y) => (y - HORIZON) / 26 + noise(x, y * 2, 5, 3) * 0.25,
    0.5,
  )
  p.register(CANOPY)
  const rand = rng(12)
  for (let i = 0; i < 70; i++) {
    const y = HORIZON + 4 + Math.pow(rand(), 0.8) * 56
    const x = rand() * 84 - 2
    const r = 0.8 + ((y - HORIZON) / 56) * 3.2
    const crown = p.m().ellipse(x, y, r * 1.3, r)
    p.tone(crown.facing([1, 0, 0, 1]), -1)
    p.tone(crown.facing([-1, 0, 0, -1]), 1)
  }

  // the river winding out of the distance towards us
  const bank = (t: number) =>
    P(40 + Math.sin(t * 7 + 0.6) * (4 + t * 22) - t * 6, HORIZON + 1 + Math.pow(t, 1.6) * 64)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= 30; i++) {
    const t = i / 30
    const [x, y] = bank(t)
    const half = 0.5 + t * 6
    left.push(P(x - half, y))
    right.push(P(x + half, y))
  }
  const river = p.m().poly([...left, ...right.reverse()])
  p.fill(river, SKY[1])
  p.fill(river.facing([-1, 0]), SKY[2])
  p.fill(river.facing([1, 0]), CANOPY[0])
  for (const [x, y] of pts([40, 62, 31, 70, 46, 78, 38, 90]))
    p.fill(p.m().rect(x, y, 2, 1).and(river), SKY[3])
}

/** The downdraught: spiral arms of wind in perspective round the vortex, leaves caught in them. */
function hurricane(p: Painter): void {
  p.shine(true)
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i <= 90; i++) {
      const t = i / 90
      const a = (k * Math.PI * 2) / 3 + t * Math.PI * 2.1
      const r = 3 + t * 30
      const x = Math.round(VORTEX[0] + Math.cos(a) * r)
      const y = Math.round(VORTEX[1] - 2 + Math.sin(a) * r * 0.34)
      const front = Math.sin(a) > -0.2
      p.set(x, y, front ? WIND : SKY[3])
      if (t > 0.45 && front) p.set(x, y + 1, SKY[3])
    }
  }
  p.shine(false)
  const rand = rng(8)
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2
    const r = 6 + rand() * 26
    const x = VORTEX[0] + Math.cos(a) * r
    const y = VORTEX[1] - 4 - rand() * 6 + Math.sin(a) * r * 0.34
    const leaf = p.m().ellipse(x, y, 1.8, 0.9, (a * 180) / Math.PI + 90)
    p.fill(leaf, CANOPY[3])
    p.fill(leaf.facing([1, 0, 0, 1]), CANOPY[1])
  }
}

/** One wing: the arm along the leading edge, coverts, and a fan of long flight feathers. */
function wing(d: Painter, shoulder: Pt, wrist: Pt, tips: readonly Pt[], root: Pt, bias: number): void {
  const m = (): Mask => d.m()
  // flight feathers, outermost first, each a long blade with a pale edge
  tips.forEach((tip, i) => {
    const base = P(
      wrist[0] + (root[0] - wrist[0]) * (i / tips.length),
      wrist[1] + (root[1] - wrist[1]) * (i / tips.length),
    )
    const feather = m().limb([base, P((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2), tip], [2.6, 2.2, 0.9])
    d.part(feather, BROWN, { bias: bias - 1, bevel: 2 })
    d.fill(feather.facing([-1, 0]).and(feather.shrunk(0)), BROWN[3])
  })
  // coverts: the broad upper wing from the shoulder to the wrist and back to the body
  const coverts = m().poly(
    spline(
      [
        shoulder,
        P((shoulder[0] + wrist[0]) / 2, shoulder[1] - 3),
        wrist,
        P((wrist[0] + root[0]) / 2 + 2, (wrist[1] + root[1]) / 2 + 6),
        root,
      ],
      4,
    ),
  )
  d.part(coverts, BROWN, { bias, bevel: 5 })
  // a row of scalloped feather edges across the coverts
  for (let t = 0.15; t < 1; t += 0.2) {
    const x = wrist[0] + (root[0] - wrist[0]) * t
    const y = wrist[1] + (root[1] - wrist[1]) * t + 4
    d.fill(m().ellipse(x, y, 2.6, 1.6).and(coverts).facing([0, 1]), BROWN[1])
  }
  // the arm along the leading edge
  d.part(
    m().limb([shoulder, P((shoulder[0] + wrist[0]) / 2, shoulder[1] - 3.5), wrist], [3.6, 3, 2.2]),
    BROWN,
    { bias, bevel: 3 },
  )
}

/** Black eye with the dark streak running back from it: k = streak, w = glint. */
const EYE = ['..kkkkkk', '.kwkkkk.', 'kkkkk...', '.kk.....']

function pidgeot(d: Painter): void {
  const m = (): Mask => d.m()

  // far wing, behind the body, driven down to the right
  wing(d, P(48, 40), P(66, 38), [P(79, 56), P(77, 62), P(73, 66), P(68, 68), P(62, 67)], P(52, 52), -1)

  // tail: a fan of long feathers below the body
  for (const [x, y] of pts([47, 79, 51, 80, 55, 78, 58.5, 75])) {
    const feather = m().limb([46, 60, (46 + x) / 2, (60 + y) / 2, x, y], [2.4, 2.3, 1.4])
    d.part(feather, BROWN, { bias: -1, bevel: 2 })
  }

  // body: brown back, cream breast facing us
  d.part(m().ellipse(45, 50, 9, 12, 10), BROWN, { bevel: 6 })
  const breast = m().ellipse(40.5, 51, 8, 10.5, 8)
  d.part(breast, CREAM, { bevel: 6, line: 'shadow' })
  for (const [x, y] of pts([38, 46, 42, 50, 37, 54, 41, 58, 44, 46]))
    d.fill(m().rect(x, y, 2, 1).and(breast.shrunk(1)), CREAM[0])

  // legs thrust forward, talons spread
  for (const [hip, ankle, toes] of [
    [P(44, 59), P(39, 68), [P(34.5, 71), P(36, 73.5), P(39, 74)]],
    [P(38, 58), P(31, 65), [P(26.5, 67), P(27.5, 70), P(30.5, 71)]],
  ] as const) {
    d.part(m().limb([hip, ankle], [3.2, 1.6]), CREAM, { bevel: 2 })
    for (const toe of toes) {
      d.part(m().limb([ankle, toe], [1.3, 0.9]), BEAK, { bevel: 1 })
      d.px(Math.round(toe[0] - 1), Math.round(toe[1]), BEAK[0])
    }
  }

  // near wing, driven down to the left over the whole width
  wing(d, P(34, 40), P(15, 37), [P(1, 55), P(3, 61), P(7, 66), P(12, 69), P(18, 69)], P(31, 52), 0)

  // the crest streaming back from the crown: red plumes over yellow ones
  for (const [path, ramp] of [
    [
      [40, 27, 52, 24, 63, 25, 72, 29, 78, 26],
      [CREST[2], CREST[3]],
    ],
    [
      [40, 26, 50, 21, 60, 21, 69, 24, 77, 20],
      [CREST[0], CREST[1]],
    ],
    [
      [39, 24.5, 47, 19, 56, 18, 65, 20, 72, 17],
      [CREST[0], CREST[1]],
    ],
  ] as const) {
    const plume = m().limb(path, [2.4, 2.1, 1.8, 1.3, 0.6])
    d.part(plume, [ramp[0], ramp[1], ramp[1], ...(ramp[1] === CREST[3] ? [WIND] : [CREST[2]])], {
      bevel: 1.6,
    })
  }

  // head, three quarters to the left: cream face, brown crown, hooked beak
  const head = m().ellipse(37, 31, 7.5, 6.6, -10)
  d.part(head, CREAM, { bevel: 5 })
  d.fill(head.clone().and(m().poly([30, 20, 46, 20, 46, 29, 40, 27, 33, 27.5])), BROWN[3])
  d.fill(
    head
      .clone()
      .and(m().poly([30, 20, 46, 20, 46, 29, 40, 27, 33, 27.5]))
      .facing([0, -1]),
    BROWN[4],
  )
  const beak = m().poly([31.5, 29.5, 26, 31, 23, 34, 25.5, 34.5, 27.5, 36, 31.5, 35])
  d.part(beak, BEAK, { bevel: 2, line: 'shadow' })
  d.fill(m().line(26, 33, 31, 33.5).and(beak), BEAK[0])
  d.stamp(EYE, 32, 29, { k: OUTLINE, w: WIND })

  // the sky lights the top-left rims
  d.tone(d.mask().facing([-1, 0, 0, -1]), 1)
}

export const tauboss: CardDef = {
  id: 'pkm-jungle-075',
  number: 75,
  name: 'Tauboss',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Farblos',
  hp: 80,
  attacks: [
    { name: 'Orkan', cost: ['Farblos', 'Farblos', 'Farblos'], damage: '30' },
    { name: 'Flügelschlag', cost: ['Farblos', 'Farblos'], damage: '20' },
  ],
  // the wind spirals shine; bird, sky and jungle stay matt
  foil: 'painted',
  draw(p) {
    aerial(p)
    hurricane(p)
    const d = p.layer()
    pidgeot(d)
    p.subject(d, OUTLINE)
    // gusts streaming past the wing tips
    p.shine(true)
    for (const [x, y, w] of [
      [2, 46, 7],
      [72, 44, 6],
      [4, 76, 9],
      [70, 74, 8],
    ] as const) {
      const gust = p.m().rect(x, y, w, 1).minus(p.subjectMask)
      gust.each((gx, gy) => {
        if (bayer(gx, gy) < 0.8) p.set(gx, gy, WIND)
      })
    }
    p.shine(false)
  },
}
