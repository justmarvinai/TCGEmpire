import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, distanceField, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Dunkler Magier (Ultra). Brief: purple-robed mage with tall pointed hat, green staff levelled at
 * viewer, cape swirling, arcane violet void. Full art, 80×112.
 *
 * Composition: the mage stands in the middle and glares straight out of the card. His right arm
 * levels the staff at the viewer, its curled head charged with dark magic out in the void on the
 * left; his raised left hand cradles a flame. The cape billows out to the right, the hat bends back
 * to the right, a ring of runes hangs behind his head and a dark aura clings to him. Text plates
 * float over rows 0–13 and 90–111.
 */
const VOID = colors('05030e', '0c0620', '160b32', '221248', '331a62', '4a2684')
const ARCANE = colors('8a5cff', 'cfb2ff', 'fbf2ff')
const ROBE = colors('1e0d44', '3a1a74', '5c2ca6', '8550d4', 'b58cf2')
const LINING = colors('0e1236', '1c2668', '2e3f9c')
const SKIN = colors('6a5890', 'b4a6d6', 'ece6f8')
const STAFF = colors('0c3426', '1a6644', '34a062', '86dc86')
const OUTLINE = hex('050210')

const P = (x: number, y: number): Pt => [x, y]

/** Centre of the rune ring behind the head. */
const HALO = P(40, 36)
/** The staff: where the hand grips it and the direction it points. */
const GRIP = P(26, 65)
const AIM = P(-0.86, 0.51)
const along = (t: number): Pt => P(GRIP[0] + AIM[0] * t, GRIP[1] + AIM[1] * t)
/** The head of the staff: a spiral that curls up and back from the end of the shaft, like a crook. */
const CURL: Pt[] = (() => {
  const out: Pt[] = []
  let [x, y] = along(11)
  let heading = Math.atan2(AIM[1], AIM[0])
  for (let i = 0; i < 15; i++) {
    out.push(P(x, y))
    heading += 0.37
    x += Math.cos(heading) * (2.6 - i * 0.09)
    y += Math.sin(heading) * (2.6 - i * 0.09)
  }
  return out
})()
/** Centre of the spiral, where the charge sits. */
const TIP = P(
  CURL.reduce((a, q) => a + q[0], 0) / CURL.length,
  CURL.reduce((a, q) => a + q[1], 0) / CURL.length,
)

function arcane(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    VOID,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - HALO[0], (y - HALO[1]) * 0.85) / 44)
      const a = Math.atan2(y - HALO[1], x - HALO[0])
      const r = Math.hypot(x - HALO[0], y - HALO[1])
      const swirl = Math.max(0, Math.sin(a * 2 + r * 0.22)) * 0.16
      return glow * 0.6 + swirl + noise(x, y, 6, 7) * 0.12
    },
    0.7,
  )
  // the rune ring: two thin circles with runes between them
  const ring = (r: number): Mask =>
    p
      .m()
      .disc(HALO[0], HALO[1], r + 0.5)
      .minus(p.m().disc(HALO[0], HALO[1], r - 0.5))
  p.fill(ring(19), ARCANE[0])
  p.fill(ring(24), ARCANE[0])
  const runes = [
    ['a.', 'aa'],
    ['.a', 'a.', '.a'],
    ['aa', '.a'],
    ['a', 'a', 'a'],
  ]
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.1
    const x = Math.round(HALO[0] + Math.cos(a) * 21.5)
    const y = Math.round(HALO[1] + Math.sin(a) * 21.5)
    p.stamp(runes[i % runes.length] ?? ['a'], x - 1, y - 1, { a: ARCANE[1] })
  }
  const rand = rng(9)
  for (let i = 0; i < 30; i++) {
    const x = 2 + Math.floor(rand() * 76)
    const y = 14 + Math.floor(rand() * 76)
    p.px(x, y, rand() < 0.3 ? ARCANE[2] : ARCANE[0])
  }
  p.shine(false)
}

/** Dark aura clinging to the mage: dithered violet that fades a few pixels out from his outline. */
function aura(p: Painter, body: Mask): void {
  const dist = distanceField(body.clone().invert())
  const ramp = [VOID[3], VOID[4], VOID[5], ARCANE[0]]
  p.shine(true)
  body
    .grown(7)
    .minus(body)
    .each((x, y) => {
      const d = dist[y * p.w + x] ?? 0
      const reach = 3.5 + noise(x, y, 13, 4) * 4
      const i = Math.floor((1 - (d - 1) / reach) * 4 + bayer(x, y) - 0.5)
      if (i >= 0) p.set(x, y, ramp[Math.min(3, i)] ?? VOID[3])
    })
  p.shine(false)
}

/** The cape billows out to the right from the shoulders; its blue lining shows where it turns. */
function cape(d: Painter): void {
  const m = (): Mask => d.m()
  const outer = m().poly([
    ...quad(P(46, 46), P(64, 38), P(80, 18), 8),
    ...quad(P(80, 18), P(72, 46), P(80, 64), 8),
    ...quad(P(80, 64), P(68, 80), P(74, 100), 8),
    P(56, 100),
    ...quad(P(60, 86), P(62, 70), P(52, 56), 6),
  ])
  d.part(outer, ROBE, { bevel: 4, bias: -2 })
  d.shade(m().poly([...quad(P(80, 18), P(71, 36), P(73, 50), 6), P(67, 44), P(70, 30)]), LINING, { bevel: 2 })
  d.shade(m().poly([...quad(P(74, 100), P(66, 92), P(62, 84), 6), P(66, 100)]), LINING, { bevel: 2 })
  for (const [a, b, c] of [
    [P(57, 50), P(66, 64), P(64, 90)],
    [P(64, 46), P(72, 60), P(71, 84)],
  ] as const)
    d.fill(
      m()
        .path(quad(a, b, c))
        .and(outer.shrunk(1)),
      ROBE[0],
    )
  d.fill(outer.facing([-1, 0]).and(m().rect(50, 46, 30, 54)), ROBE[2])
}

/**
 * Face, straight on and glaring, inside the hood of the hat: p P L H = hat from dark to light,
 * d s W = skin, k = brows, lids and mouth, i = violet iris, e = glint.
 */
const FACE = [
  '.pPPLLLLPPp.',
  'pPLLHHHHLLPp',
  'pPddddddddPp',
  'PdkkkddkkkdP',
  'PddskddksddP',
  'PsWkiedeikdP',
  'PsWssssssddP',
  'PsWsssdsdddP',
  '.PsssddsddP.',
  '.PssssssddP.',
  '..PskkkkdP..',
  '..PsssssdP..',
  '...PsdddP...',
  '....PddP....',
]
const FACE_KEY = {
  p: ROBE[1],
  P: ROBE[2],
  L: ROBE[3],
  H: ROBE[4],
  d: SKIN[0],
  s: SKIN[1],
  W: SKIN[2],
  k: ROBE[0],
  i: ARCANE[0],
  e: SKIN[2],
}

function mage(d: Painter): void {
  const m = (): Mask => d.m()
  cape(d)

  // the coat falls from the belt in two panels that sway back from the thrust, dark under-robe between
  const sway = (y: number): number => -((y - 64) / 36) * 4
  d.part(m().poly([36, 66, 44, 66, 47 + sway(100), 100, 33 + sway(100), 100]), ROBE, { bias: -2, bevel: 3 })
  for (const flip of [1, -1]) {
    const x = (v: number, y: number) => 40 + (v - 40) * flip + sway(y)
    const corners = [P(40.5, 64), P(49, 64), P(53, 80), P(56, 90), P(57.5, 100), P(44, 100), P(41, 76)]
    const panel = m().poly(corners.map(([v, y]) => P(x(v, y), y)))
    d.part(panel, ROBE, { bevel: 4, bias: flip > 0 ? 0 : -1 })
    d.fill(
      m()
        .path([x(46, 68), 68, x(48, 84), 84, x(51, 100), 100])
        .and(panel.shrunk(1)),
      ROBE[1],
    )
    d.fill(panel.facing([-flip, 0]), ROBE[4])
  }

  // left arm raised at his side, the palm turned up to cradle a flame
  const left = m().limb([50, 53, 59, 58, 63.5, 50], [3.6, 3.2, 2.8])
  d.part(left, ROBE, { bias: -1 })
  d.fill(m().path([56, 55, 58, 61]).and(left), ROBE[3])
  d.part(m().ellipse(64.5, 47.5, 2.6, 2), SKIN, { bias: -1 })

  // breastplate: a V of lighter plates down to the belt
  const chest = m().ellipse(40, 55, 9, 9.5).rect(31, 55, 18, 10)
  d.part(chest, ROBE)
  d.fill(m().poly([33, 47, 40, 59, 47, 47, 44, 47, 40, 54, 36, 47]).and(chest), ROBE[3])
  d.part(m().rect(31, 64, 18, 2), ROBE, { bias: -1, bevel: 1 })

  // shoulder plates, two layers each; the casting side is raised
  for (const [x, y, rot] of [
    [29, 50.5, -10],
    [51, 48.5, 22],
  ] as const) {
    d.part(m().ellipse(x + (x < 40 ? -1 : 1), y + 3.5, 6, 4.4, rot), ROBE, { bias: -1, bevel: 3 })
    d.part(m().ellipse(x, y, 6.4, 4.8, rot), ROBE, { bevel: 3 })
  }

  // the staff, thicker towards the viewer, then the right arm levelling it
  d.part(m().limb([along(-16), along(0), along(13)], [0.9, 1.3, 1.7]), STAFF, { bevel: 1.5 })
  const right = m().limb([28.5, 52, 23.5, 57.5, 25.5, 63.5], [4, 3.6, 3.5])
  d.part(right, ROBE)
  d.fill(m().path([22, 58, 27, 57]).and(right), ROBE[3])
  d.part(m().ellipse(GRIP[0], GRIP[1], 3.2, 2.8), SKIN)

  // the crook: the staff curls into a thick green spiral round the charge, close to the viewer
  d.part(
    m().limb(
      CURL,
      CURL.map((_, i) => 1.9 - i * 0.07),
    ),
    STAFF,
    { bevel: 2 },
  )

  // face in its hood, then the cone of the hat rising and bending back into a drooping tip
  const face = d.layer().stamp(FACE, 34, 30, FACE_KEY)
  d.contact(face.mask()).blit(face)
  const crown = m().poly([
    P(35, 31),
    ...quad(P(36, 22), P(39, 14), P(46, 12), 6),
    ...quad(P(46, 12), P(58, 10), P(65, 22), 8),
    ...quad(P(60, 17), P(53, 15), P(48, 20), 6),
    P(46, 31),
  ])
  d.part(crown, ROBE, { bevel: 4 })
  d.fill(
    m()
      .path(quad(P(37.5, 28), P(39.5, 18), P(46, 14)))
      .and(crown.shrunk(1)),
    ROBE[4],
  )
  d.fill(m().rect(35, 27, 12, 1).and(crown), ROBE[1])
  d.part(m().poly([38, 30.5, 40, 27.5, 42, 30.5, 40, 32.5]), ROBE, { bevel: 1.5 })

  // the magic lights the near rims
  d.tone(
    d
      .mask()
      .facing([-1, 0, 0, 1])
      .and(m().disc(TIP[0], TIP[1], 16)),
    1,
  )
}

/** Dark magic: a spell circle round the crook, the charge in it, a flame in the open hand, sparks. */
function spell(p: Painter): void {
  const [x, y] = TIP
  p.shine(true)
  const ring = (rx: number, ry: number): Mask =>
    p
      .m()
      .ellipse(x, y, rx + 0.5, ry + 0.5, 50)
      .minus(p.m().ellipse(x, y, rx - 0.5, ry - 0.5, 50))
  p.fill(ring(12.5, 6).minus(p.subjectMask), ARCANE[1])
  p.fill(p.m().disc(x, y, 3.4), ARCANE[0])
  p.fill(p.m().disc(x, y, 2.3), ARCANE[1])
  p.fill(p.m().disc(x, y, 1.1), ARCANE[2])
  const flame = p.m().poly([61.5, 46, 63, 39, 64.5, 42.5, 66, 36, 68, 46])
  p.fill(flame, ARCANE[0])
  p.fill(flame.shrunk(1), ARCANE[1])
  const rand = rng(4)
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2
    const r = 9 + rand() * 8
    p.px(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), i % 3 === 0 ? STAFF[3] : ARCANE[1])
  }
  p.shine(false)
}

export const dunklerMagier: CardDef = {
  id: 'ygo-lob-085',
  number: 85,
  name: 'Dunkler Magier',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'normal',
  print: { atk: '2500', def: '2100', level: 7, type: 'Hexer' },
  // the void with its runes, the aura and the spells shine; mage, cape and staff stay matt
  foil: 'painted',
  draw(p) {
    arcane(p)
    const d = p.layer()
    mage(d)
    aura(p, d.mask())
    p.subject(d, OUTLINE)
    spell(p)
  },
}
