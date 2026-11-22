import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rays, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Exodia, die Verbotene (Ultra). Brief: golden colossus with pharaoh headdress straining against
 * chains, eyes igniting, emerging from a radiant stone seal. Full art, 80×112.
 *
 * Composition: square to the viewer and mirrored on the centre line, the colossus rises to the
 * waist out of a stone seal whose pentagram blazes with light. His fists are raised and clenched,
 * chained by the wrists to the rim of the seal; the chains are taut. His eyes ignite under the
 * striped nemes. Light streams up from the seal behind him. Text plates float over rows 0–13 and
 * 90–111.
 */
const VOID = colors('07050a', '120c14', '1f1520', '2e1f2a', '432c30')
const GOLD = colors('6b4416', 'b07a22', 'f0b838', 'ffe680', 'fffbe0')
const SKIN = colors('3a1d12', '6a3a1e', '9c5e2c', 'c88a44', 'e8b868')
const LAPIS = colors('0f1f4a', '1f3c86', '3a6ccc')
const IRON = colors('141218', '34323e', '5e5c70', '9c9cb4')
const STONE = colors('1a1618', '342c2e', '524648', '766a68')
const JEWEL = hex('c0202a')
const OUTLINE = hex('050304')

const P = (x: number, y: number): Pt => [x, y]
/** Everything is drawn for the left half and mirrored on the centre line (x = 40). */
const MID = 40

/** The seal: an ellipse lying on the ground; the colossus rises from its middle. */
const SEAL = { x: 40, y: 94, rx: 37, ry: 11 }

function temple(p: Painter): void {
  // dark hall, light streaming up from the seal in rays
  p.shine(true)
  const beams = rays(p, SEAL.x, SEAL.y, 18, 0.25)
  p.dither(
    null,
    VOID,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot((x - SEAL.x) * 0.9, (y - SEAL.y) * 0.55) / 64)
      const beam = beams.has(x, y) ? 0.32 : 0
      return glow * 0.7 + beam * glow + noise(x, y, 3, 6) * 0.1
    },
    0.7,
  )
  const rand = rng(17)
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(rand() * 76)
    const y = 16 + Math.floor(rand() * 70)
    p.px(x, y, rand() < 0.4 ? GOLD[3] : GOLD[1])
  }
  p.shine(false)

  // the seal: a stone disc with a raised rim
  const disc = p.m().ellipse(SEAL.x, SEAL.y, SEAL.rx, SEAL.ry)
  p.shade(disc, STONE, { bevel: 4 })
  p.fill(disc.facing([0, -1]), STONE[3])
  p.fill(p.m().ellipse(SEAL.x, SEAL.y + 1, SEAL.rx - 4, SEAL.ry - 2.5), STONE[1])

  // the carved pentagram and its ring blaze with light
  p.shine(true)
  const ring = p
    .m()
    .ellipse(SEAL.x, SEAL.y + 1, SEAL.rx - 6, SEAL.ry - 3)
    .minus(p.m().ellipse(SEAL.x, SEAL.y + 1, SEAL.rx - 7, SEAL.ry - 4))
  const star = p.m()
  const corner = (i: number): Pt => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
    return P(SEAL.x + Math.cos(a) * (SEAL.rx - 7), SEAL.y + 1 + Math.sin(a) * (SEAL.ry - 4))
  }
  for (let i = 0; i < 5; i++) {
    const [a, b] = [corner(i), corner(i + 2)]
    star.line(a[0], a[1], b[0], b[1])
  }
  p.fill(ring.or(star).grown(1).and(disc), GOLD[1])
  p.fill(ring.or(star), GOLD[3])
  p.shine(false)
}

/** Mirror a left-half mask onto the right half. */
const both = (m: Mask): Mask => m.or(m.mirrored(MID))

/** An iron chain from `a` down to `b`: links alternate between face-on rings and edge-on bars. */
function chain(d: Painter, a: Pt, b: Pt): void {
  const n = Math.floor((b[1] - a[1]) / 3)
  const key = { h: IRON[3], l: IRON[2], d: IRON[1] }
  for (let i = 0; i <= n; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / n)
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / n)
    if (i % 2 === 0) d.stamp(['.h.', 'h.d', 'l.d', '.d.'], x - 1, y - 2, key)
    else d.stamp(['h', 'l', 'd'], x, y - 1, key)
  }
}

/**
 * The face, mirrored on the centre line: 1–5 = gold from dark to light (the band of the nemes),
 * j = jewel, a b c d f = skin from dark to light. The eyes (4 5) burn.
 */
const FACE_HALF = [
  '...1234',
  '..1234j',
  '.112333',
  '.bcdddd',
  '.baaadd',
  '.b345ad',
  '.bc22cd',
  '.bcccdf',
  '.bcccdf',
  '..bccad',
  '..bccaa',
  '..bcccd',
  '...bccc',
  '....bbc',
  '.....bb',
]
const FACE = FACE_HALF.map((row) => row + [...row].reverse().join(''))
const FACE_KEY = {
  '1': GOLD[0],
  '2': GOLD[1],
  '3': GOLD[2],
  '4': GOLD[3],
  '5': GOLD[4],
  j: JEWEL,
  a: SKIN[0],
  b: SKIN[1],
  c: SKIN[2],
  d: SKIN[3],
  f: SKIN[4],
}
const FACE_AT = P(33, 21)

function colossus(d: Painter): void {
  const m = (): Mask => d.m()

  // nemes: the striped headcloth over the crown, its lappets falling onto the chest
  const nemes = both(
    m().poly([
      40, 13, 34, 14, 30, 17, 28, 23, 27, 31, 26, 39, 24, 47, 24, 55, 31, 57, 32, 49, 33, 41, 40, 41,
    ]),
  )
  d.part(nemes, GOLD, { bevel: 4 })
  for (let y = 17; y < 58; y += 4) d.shade(nemes.clone().and(m().rect(0, y, 80, 2)), LAPIS, { bevel: 2 })

  // shoulders, the broad chest, the body tapering to where it rises out of the seal
  const torso = both(m().poly([40, 40, 30, 43, 22, 48, 20, 55, 25, 62, 29, 72, 31, 84, 32, 92, 40, 92]))
  d.part(torso, SKIN, { bevel: 8 })
  d.part(both(m().ellipse(33, 59, 7, 5, 10)), SKIN, { bevel: 4, line: 'shadow' })
  for (const y of [67, 73, 79]) d.shade(both(m().ellipse(36.5, y, 2.8, 2.3)), SKIN, { bevel: 2 })

  // arms raised, fists clenched; gold cuffs; the chains pull them down to the rim of the seal
  const arm = both(m().limb([23, 51, 13, 56, 9.5, 47], [5.2, 4.4, 3.8]))
  d.part(arm, SKIN, { bevel: 4 })
  d.part(both(m().ellipse(16.5, 51.5, 4, 3.2, 25)), SKIN, { bevel: 3, line: 'shadow' })
  d.part(both(m().ellipse(9.5, 40.5, 4.4, 4.6)), SKIN, { bevel: 3 })
  d.fill(both(m().path([7, 39, 12, 38]).path([7, 42, 12, 41])), SKIN[1])
  d.part(both(m().rect(6, 45, 8, 3)), GOLD, { bevel: 1.5 })
  for (const flip of [1, -1]) {
    const x = (v: number): number => MID + (v - MID) * flip - (flip < 0 ? 1 : 0)
    chain(d, P(x(10), 50), P(x(5), 90))
  }

  // the broad collar over the shoulders: bands of gold, lapis and red
  const collar = (r0: number, r1: number): Mask =>
    m()
      .ellipse(MID, 40, r1, r1 * 0.8)
      .minus(m().ellipse(MID, 40, r0, r0 * 0.8))
      .and(m().rect(0, 41, 80, 20))
  d.part(collar(9, 17), GOLD, { bevel: 2 })
  d.shade(collar(11.5, 13.5), LAPIS, { bevel: 1 })
  d.fill(collar(15.5, 16.5), JEWEL)

  // neck and face
  d.part(m().rect(35, 33, 10, 8), SKIN, { bevel: 3 })
  const face = d.layer().stamp(FACE, FACE_AT[0], FACE_AT[1], FACE_KEY)
  d.contact(face.mask()).blit(face)
  // the burning eyes once more, so that they shine
  d.shine(true)
  d.stamp([(FACE[5] ?? '').replace(/[^345]/g, '.')], FACE_AT[0], FACE_AT[1] + 5, FACE_KEY)
  d.shine(false)

  // the seal lights him from below
  d.tone(
    d
      .mask()
      .facing([0, 1, -1, 0, 1, 0])
      .and(m().rect(0, 60, 80, 40)),
    1,
  )
}

/** The eyes ignite: sparks fly up from them. Light pours out where he rises from the seal. */
function ignite(p: Painter): void {
  const eye = FACE_AT[1] + 5
  p.shine(true)
  for (const flip of [1, -1]) {
    const x = (v: number): number => Math.round(MID + (v - MID) * flip - (flip < 0 ? 1 : 0))
    p.px(x(34), eye - 1, GOLD[3])
      .px(x(33), eye - 3, GOLD[4])
      .px(x(31), eye - 4, GOLD[3])
      .px(x(32), eye - 7, GOLD[2])
  }
  p.fill(p.m().ellipse(MID, 91.5, 13, 2.4), GOLD[3])
  p.fill(p.m().ellipse(MID, 91.5, 8, 1.2), GOLD[4])
  p.shine(false)
}

export const exodia: CardDef = {
  id: 'ygo-lob-084',
  number: 84,
  name: 'Exodia, die Verbotene',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'effect',
  print: { atk: '1000', def: '1000', level: 3, type: 'Hexer' },
  // the light from the seal, its pentagram, the dust and the burning eyes shine; the colossus,
  // his chains and the stone stay matt
  foil: 'painted',
  draw(p) {
    temple(p)
    const d = p.layer()
    colossus(d)
    p.subject(d, OUTLINE)
    ignite(p)
  },
}
