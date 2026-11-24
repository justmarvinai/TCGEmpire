import type { Mask, Painter, Pt, RGB } from '../../toolkit/index.ts'
import { colors, hex, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Toon-Jungfrau (Ultra). Brief: cartoon mermaid with big eyes and a red bow, sitting on a rock and
 * waving, her tail flicking up a heart-shaped splash; cartoon sea with curly waves and a smiling sun.
 * Full art, 80×112, in the Toon look of the set: flat fills, one shadow step, thick ink, big eyes.
 *
 * Composition: she sits on a round rock left of the middle and waves at the viewer with her raised
 * hand; the tail drapes over the rock and flicks up on the right, and the water it throws up hangs
 * in the air as a big heart. The sun smiles from the top left, where the light comes from; curly
 * waves roll in front of the rock. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('5cc4ee', '8cdaf6', 'c4f0fc')
const SUN = colors('f0901e', 'ffd02e', 'fff4a0')
const SEA = colors('2160cc', '3a94ea')
const FOAM = hex('f6fdff')
const ROCK = colors('6a3c3c', 'a86048', 'd89068')
const SKIN = colors('ee9c80', 'ffd4b6', 'fff2e4')
const HAIR = colors('c2357e', 'f274b2', 'ffb4da')
const BOW = colors('a01428', 'e8323a', 'ff8c80')
const TAIL = colors('11747c', '20b2a4', '88ecd0')
const IRIS = hex('2a62d6')
const INK = hex('1c1232')

const P = (x: number, y: number): Pt => [x, y]

const HORIZON = 58
const SUN_AT = P(12, 23)
/** Centre of the heart the splash forms. */
const HEART = P(61, 31)

/** Ink line on earlier paint around a part: the toon's inner contour. */
function ink(d: Painter, m: Mask): void {
  d.fill(m.outerEdge().and(d.mask()), INK)
}

/** Toon fill: ink contour, flat base colour, a crescent of shadow on the side away from the light. */
function toon(d: Painter, m: Mask, ramp: readonly RGB[], shadow = 2): Mask {
  ink(d, m)
  d.fill(m, ramp[1] ?? INK)
  d.fill(m.clone().minus(m.moved(-shadow, -shadow)), ramp[0] ?? INK)
  return m
}

/** The heart curve, scaled by `s` round its centre. */
function heartMask(p: Painter, [cx, cy]: Pt, s: number): Mask {
  const pts: Pt[] = []
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2
    const x = 16 * Math.sin(t) ** 3
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    pts.push(P(cx + x * s, cy - y * s))
  }
  return p.m().poly(pts)
}

/**
 * A rolling wave seen from the side: a hump that rises to a crest and curls over into a hollow.
 * `dir` 1 curls to the right, -1 to the left.
 */
function wave(p: Painter, cx: number, cy: number, r: number, base: number, dir: 1 | -1): void {
  const x = (v: number): number => cx + v * dir
  const curl = p.m().disc(cx, cy, r)
  const body = p.m().poly([
    P(x(-r * 2.6), base),
    ...quad(P(x(-r * 2.6), base), P(x(-r * 1.2), cy + r * 0.2), P(x(-r * 0.2), cy - r)),
    P(x(r * 0.6), cy + r * 0.4),
    ...quad(P(x(r * 0.6), cy + r * 0.4), P(x(r * 0.3), base - 1), P(x(r * 2.2), base)),
  ])
  const all = curl.or(body)
  p.fill(all.outerEdge(), INK)
  p.fill(all, SEA[1])
  // the hollow under the curl, and the foam riding the crest
  const hollow = p.m().disc(x(r * 0.35), cy + 0.6, r - 2)
  p.fill(hollow.outerEdge().and(curl), FOAM)
  p.fill(hollow, SEA[0])
  p.fill(all.facing([0, -1, -dir, 0]).and(p.m().rect(0, 0, 80, cy + 1)), FOAM)
}

function seaside(p: Painter): void {
  p.shine(true)
  // sky in three bands, lighter towards the horizon, with soft dithered seams
  p.dither(p.m().rect(0, 0, 80, HORIZON), SKY, (_x, y) => (y - 6) / (HORIZON - 14), 0.25)

  // the sun: pointed rays round a smiling disc, inked in its own orange
  const [sx, sy] = SUN_AT
  const rays = p.m()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.35
    const at = (r: number, da: number): Pt => P(sx + Math.cos(a + da) * r, sy + Math.sin(a + da) * r)
    rays.poly([at(6, -0.3), at(10.5, 0), at(6, 0.3)])
  }
  const disc = p.m().disc(sx, sy, 6.4)
  p.fill(rays.or(disc).outerEdge(), SUN[0])
  p.fill(rays, SUN[1])
  p.fill(disc.outerEdge().and(rays), SUN[0])
  p.fill(disc, SUN[1])
  p.fill(disc.clone().minus(disc.moved(2, 2)), SUN[2])
  p.stamp(['k..k', 'k..k', '....', 'k..k', '.kk.'], sx - 2, sy - 2, { k: SUN[0] })
  p.shine(false)

  // the sea: light blue towards the horizon, deep blue in front, little wave marks between
  p.dither(p.m().rect(0, HORIZON, 80, 112 - HORIZON), SEA, (_x, y) => 1 - (y - HORIZON) / 16, 0.3)
  p.fill(p.m().rect(0, HORIZON, 80, 1), FOAM)
  const rand = rng(7)
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(rand() * 74)
    const y = HORIZON + 3 + Math.floor(rand() * 24)
    p.stamp(['f..f', '.ff.'], x, y, { f: y < HORIZON + 10 ? FOAM : SEA[1] })
  }

  // the rock she sits on: round and warm, inked like the toon
  const rock = p.m().blob(35, 85, 24, 14, 4, 0.1)
  p.fill(rock.outerEdge(), INK)
  p.fill(rock, ROCK[1])
  p.fill(rock.clone().minus(rock.moved(-2, -3)), ROCK[0])
  p.fill(rock.clone().minus(rock.moved(2, 2)).and(rock.shrunk(1)), ROCK[2])
  p.fill(p.m().path([22, 80, 25, 83, 24, 87]).and(rock.shrunk(2)), ROCK[0])
  p.fill(p.m().path([47, 79, 50, 81]).and(rock.shrunk(2)), ROCK[2])

  // curly waves rolling in front of the rock
  p.shine(true)
  wave(p, 9, 83, 4.6, 91, 1)
  wave(p, 70, 82, 4.8, 91, -1)
  p.shine(false)
}

/**
 * The face, straight on: big round eyes with blue irises and a glint, a wide open smile and rosy
 * cheeks. k = ink, W = white, b = iris, m = mouth, t = tongue, c = cheek.
 */
const FACE = [
  'kkkkk....kkkkk',
  'kWWWWk..kWWWWk',
  'kWbbbk..kbbbWk',
  'kbWkbk..kbWkbk',
  'kbkkbk..kbkkbk',
  'kWbbWk..kWbbWk',
  '.kkkk....kkkk.',
  'cc..........cc',
  '....kkkkkk....',
  '....kmmmmk....',
  '.....kttk.....',
]
const FACE_KEY = { k: INK, W: FOAM, b: IRIS, m: BOW[0], t: HAIR[1], c: HAIR[1] }

/** The waving hand, palm to the viewer: four fingers spread, the thumb out to the side. */
const HAND = [
  '.k.k.k..',
  'kSkSkSk.',
  'kSkSkSk.',
  'kSSSSSkk',
  'kSSSSkSk',
  'kSSSSSSk',
  '.kSSSdk.',
  '..kSdk..',
]
const HAND_KEY = { k: INK, S: SKIN[1], d: SKIN[0] }

function mermaid(d: Painter): void {
  const m = (): Mask => d.m()

  // long hair behind her, falling past the shoulders in two locks
  const hair = m()
    .ellipse(32, 34, 12.5, 12)
    .limb([22, 38, 19.5, 46, 21, 53, 18, 58], [4.5, 4.2, 3.4, 1.8])
    .limb([42, 38, 44.5, 46, 43, 53, 46.5, 58], [4.5, 4.2, 3.4, 1.8])
  toon(d, hair, HAIR)

  // the arm she rests on the tail, behind the body
  toon(d, m().limb([38.5, 50, 42.5, 56, 42, 62], [2, 1.8, 1.6]), SKIN, 1)

  // body: neck, shoulders and waist, two shells as a top
  toon(d, m().rect(30, 43, 5, 6), SKIN, 1)
  const torso = m().ellipse(32, 51.5, 7.2, 3.6).poly([25.5, 51, 38.5, 51, 36.5, 61, 28, 61])
  toon(d, torso, SKIN, 1)
  for (const x of [29.2, 35]) {
    const shell = m().ellipse(x, 54, 2.8, 2.2)
    toon(d, shell, SUN, 1)
    d.fill(m().line(x, 52, x, 55).and(shell.shrunk(1)), SUN[0])
  }

  // the tail: from the waist over the rock and up on the right, a frill of fins at the waist
  const tail = m().limb(
    [32.5, 63, 36, 68.5, 42, 72.5, 50, 74, 57, 71, 61.5, 64, 63.5, 56],
    [4.8, 5.8, 5.4, 4.6, 3.6, 2.8, 2],
  )
  toon(d, tail, TAIL)
  d.fill(m().path(quad(P(36, 64), P(44, 70), P(54, 69))).and(tail.shrunk(1)), TAIL[2])
  for (const [x, y] of [P(36, 69), P(41, 72), P(46, 73), P(51, 72), P(56, 69)])
    d.stamp(['k.k', '.k.'], x, y, { k: TAIL[0] })
  const frill = m().poly([27, 60, 29, 63, 31, 61, 33, 64, 35, 61, 37, 63, 38.5, 60, 37.5, 58.5, 28, 58.5])
  toon(d, frill, TAIL, 1)

  // the fluke flicks up: two lobes spreading from the tip of the tail
  const fluke = m().limb([63.5, 56, 60, 50, 56.5, 47], [1.8, 3, 1]).limb([63.5, 56, 68, 51, 72.5, 48.5], [1.8, 3, 1])
  toon(d, fluke, TAIL, 1)
  d.fill(m().path([63, 54, 60, 50]).path([64, 54, 68, 51]), TAIL[2])

  // the waving arm in front of the hair, the open hand by her head
  toon(d, m().limb([26, 50, 19.5, 51.5, 16.5, 44], [2, 1.8, 1.6]), SKIN, 1)
  d.stamp(HAND, 12, 35, HAND_KEY)

  // the face, the fringe across her forehead and the gloss on her hair
  const face = m().ellipse(32, 37, 9.4, 8.6)
  toon(d, face, SKIN, 1)
  const fringe = m()
    .ellipse(32, 34, 12.5, 12)
    .and(m().poly([19, 37, 23, 30, 25.5, 33, 28, 29.5, 31, 32.5, 34, 29.5, 37, 32.5, 40, 30, 45, 37, 45, 18, 19, 18]))
  toon(d, fringe, HAIR)
  d.fill(m().path(quad(P(23, 28), P(27, 23.5), P(33, 23))).and(fringe.shrunk(1)), HAIR[2])
  d.stamp(FACE, 25, 33, FACE_KEY)

  // the red bow on top of her head: two loops with a fold each, a knot and two short ends
  toon(d, m().limb([38, 25, 36, 29.5], [1.3, 1]).limb([40, 25, 42.5, 29], [1.3, 1]), BOW, 1)
  const bow = m().ellipse(34.5, 24, 4.4, 3.1, -18).ellipse(43.5, 23.5, 4.4, 3.2, 18)
  toon(d, bow, BOW, 1)
  d.fill(m().path([36, 24.5, 32, 23]).path([42, 24, 46, 22.5]).and(bow.shrunk(1)), BOW[0])
  d.fill(m().path([32, 22, 34, 21]).path([42, 21, 44, 20.5]).and(bow.shrunk(1)), BOW[2])
  toon(d, m().ellipse(39, 24.5, 1.7, 2), BOW, 1)
}

/** A water drop, inked: water with a glint. */
const DROP = ['.k.', 'kbk', 'kfk', '.k.']

/** The splash: water thrown up by the fluke rises as a column and hangs in the air as a heart. */
function splash(p: Painter): void {
  p.shine(true)
  // the heart: a body of water with a glossy middle, two drips hanging from it
  const heart = heartMask(p, HEART, 0.6)
    .disc(HEART[0] - 5.5, HEART[1] + 5.5, 1.2)
    .disc(HEART[0] + 5, HEART[1] + 6, 1.4)
  p.fill(heart.outerEdge(), INK)
  p.fill(heart, SEA[1])
  const glass = heartMask(p, HEART, 0.6).shrunk(2)
  p.fill(glass, SKY[2])
  p.fill(glass.clone().minus(glass.moved(1, 1)), FOAM)
  p.stamp(['ff', 'f.'], HEART[0] - 6, HEART[1] - 4, { f: FOAM })

  // the spray the fluke throws up: two streaks curving up to the heart, drops flying off
  for (const streak of [quad(P(59, 46), P(56, 43), P(57.5, 40.5)), quad(P(67, 46), P(70, 43), P(66, 41))])
    p.fill(p.m().path(streak).minus(p.subjectMask), SEA[1])
  for (const [x, y] of [P(50, 35), P(73, 34), P(52, 23), P(70, 21), P(61, 44), P(54, 41), P(72, 41)])
    p.stamp(DROP, x - 1, y - 1, { k: INK, b: SEA[1], f: FOAM })

  // waving lines beside the hand
  p.stamp(['.k', 'k.', 'k.', '.k'], 8, 37, { k: INK })
  p.stamp(['.k', 'k.', 'k.', 'k.', '.k'], 5, 36, { k: INK })
  p.shine(false)
}

export const toonMermaid: CardDef = {
  id: 'ygo-mrl-074',
  number: 74,
  name: 'Toon-Jungfrau',
  tier: 'ultra',
  kind: 'monster',
  element: 'WASSER',
  sub: 'effect',
  print: { level: 4, atk: 1400, def: 1500, type: 'Aqua/Toon' },
  // the sky, the sun, the wave crests and the splash heart shine; mermaid, rock and sea stay matt
  foil: 'painted',
  draw(p) {
    seaside(p)
    const d = p.layer()
    mermaid(d)
    // the toon's thick ink: one more pixel of outline on the shadow side
    const body = d.mask()
    d.fill(body.moved(1, 0).or(body.moved(0, 1)).minus(body), INK)
    p.subject(d, INK)
    splash(p)
  },
}
