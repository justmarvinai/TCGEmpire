import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, pts, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Aerodactyl (Ultra). Brief: winged fossil reptile bursting out of a cliff face full of fossils,
 * wings spread, jaws wide showing its fangs, rubble and amber chunks flying; prehistoric canyon at
 * sunset, ferns, spiral fossils in the rock layers. Full art, 80×112.
 *
 * Composition: the cliff fills the card below a strip of sunset sky; Aerodactyl breaks out of it
 * towards the viewer, wings spread to the edges over the hole it tore, head turned to the left with
 * the jaws wide open. Rubble and amber fly out of the burst, ammonites sit in the strata below the
 * wings, ferns frame the foot of the cliff. The name plate covers rows 5–15, the attack plate 88–106.
 */
const SKY = colors('3c1a3c', '7c2c40', 'c24a2e', 'f08c32', 'fcc85c')
const ROCK = colors('28140e', '4a2a1a', '6e4426', '9a6438', 'c68e56')
const AMBER = colors('a4500e', 'e8942a', 'ffd470', 'fff6dc')
const SKIN = colors('342a4a', '584e74', '847aa0', 'b2aaca', 'e0daee')
const MOUTH = colors('6e1424', 'b42434')
const FERN = colors('1c3216', '38602a')
const OUTLINE = hex('120a12')

const P = (x: number, y: number): Pt => [x, y]
const MID = 40
const CLIFF_TOP = 27
/** Where Aerodactyl tore through the rock. */
const HOLE = P(40, 57)

function canyon(p: Painter): void {
  // sunset over the canyon: violet high up, burning orange at the cliff edge
  p.shine(true)
  p.dither(p.m().rect(0, 0, 80, CLIFF_TOP + 2), SKY, (x, y) => 0.1 + (y / CLIFF_TOP) * 0.85 + Math.max(0, 1 - Math.hypot(x - 58, y - 26) / 14) * 0.4, 0.5)
  p.shine(false)
  // far mesas on the horizon
  p.fill(p.m().poly([0, 22, 9, 22, 11, 19, 20, 19, 22, 24, 34, 25, 36, 21.5, 44, 21.5, 46, 26, 80, 26, 80, 30, 0, 30]), SKY[1])

  // the cliff: warm strata, each layer a band with a wavy seam and some grain
  const cliff = p.m().poly([0, CLIFF_TOP, 14, CLIFF_TOP - 1, 30, CLIFF_TOP + 1, 52, CLIFF_TOP - 1, 66, CLIFF_TOP + 1, 80, CLIFF_TOP, 80, 112, 0, 112])
  p.register(ROCK)
  p.dither(
    cliff,
    ROCK.slice(1, 4),
    (x, y) => {
      const layer = Math.floor((y + Math.sin(x * 0.12) * 2.5) / 7)
      return [0.55, 0.85, 0.3, 0.7, 0.45, 0.9, 0.25, 0.65, 0.5, 0.8, 0.35, 0.75][layer % 12] ?? 0.5
    },
    0.15,
  )
  cliff.each((x, y) => {
    if ((y + Math.round(Math.sin(x * 0.12) * 2.5)) % 7 === 0 && noise(x, y, 3, 4) > 0.3) p.set(x, y, ROCK[1])
  })
  p.tone(cliff.clone().and(p.m().rect(0, 0, 80, CLIFF_TOP + 6)), 1)
  p.edge(cliff, ROCK[4], [0, -1])

  // ammonites in the strata
  for (const [x, y, r] of [
    [9, 71, 6],
    [71, 68, 5.5],
    [62, 84, 3.5],
  ] as const)
    ammonite(p, x, y, r)

  // the hole: dark inside, its broken rim lit where it faces the sunset, cracks running out of it
  const hole = p.m().blob(HOLE[0], HOLE[1], 25, 20, 12, 0.3)
  p.fill(hole, ROCK[0])
  p.fill(hole.clone().minus(hole.moved(-3, -3)), ROCK[1])
  p.fill(hole.clone().minus(hole.moved(-1, -1)), ROCK[4])
  p.fill(hole.outerEdge().and(hole.moved(1, 1)), ROCK[0])
  for (const crack of [
    [17, 66, 9, 63, 2, 66],
    [62, 67, 70, 63, 78, 65],
    [27, 74, 24, 80, 26, 87],
    [53, 74, 57, 80, 55, 87],
    [16, 52, 9, 54, 4, 50],
    [64, 50, 71, 53, 77, 49],
  ])
    p.fill(p.m().path(crack).minus(hole), ROCK[0])
}

/** A spiral shell fossil: a pale coiled ridge with a dark groove. */
function ammonite(p: Painter, x: number, y: number, r: number): void {
  const coil: Pt[] = []
  for (let a = 0; a < Math.PI * 5; a += 0.25) {
    const k = r * (1 - a / (Math.PI * 5.6))
    coil.push(P(x + Math.cos(a) * k, y + Math.sin(a) * k * 0.9))
  }
  p.fill(p.m().disc(x, y, r + 0.5), ROCK[2])
  p.fill(p.m().path(coil.map(([cx, cy]) => P(cx + 0.6, cy + 0.6))), ROCK[1])
  p.fill(p.m().path(coil), ROCK[4])
}

/** One wing on the viewer's left; `side` -1 mirrors it to the right. */
function wing(d: Painter, side: 1 | -1): void {
  const Q = (x: number, y: number): Pt => P(side === 1 ? x : 2 * MID - x, y)
  const shoulder = Q(35, 46)
  const elbow = Q(26, 40.5)
  const wrist = Q(15, 32)
  const tip = Q(3, 24.5)
  // membrane from the long finger down to the hip, its trailing edge scalloped between the struts
  const edge = [
    ...quad(tip, Q(7, 33), Q(5.5, 41)),
    ...quad(Q(5.5, 41), Q(13, 45), Q(12, 51)),
    ...quad(Q(12, 51), Q(20, 52), Q(22, 58)),
    ...quad(Q(22, 58), Q(30, 57), Q(35, 61)),
  ]
  const membrane = d.m().poly([shoulder, elbow, wrist, tip, ...edge])
  d.part(membrane, SKIN, { bias: -2, bevel: 7 })
  d.tone(membrane.clone().and(d.m().limb([shoulder, elbow, wrist, tip], 4)), 1)
  for (const strut of [Q(5.5, 41), Q(12, 51), Q(22, 58)])
    d.fill(d.m().path(quad(wrist, P((wrist[0] + strut[0]) / 2 + side, (wrist[1] + strut[1]) / 2), strut)).and(membrane.shrunk(1)), SKIN[0])
  d.part(d.m().limb([wrist, tip], [1.8, 0.8]), SKIN, { bevel: 1.5 })
  d.part(d.m().limb([shoulder, elbow, wrist], [3.2, 2.6, 2.1]), SKIN, { bevel: 2.5 })
  // the clawed thumb on the wrist
  d.stamp(side === 1 ? ['w.w', '.w.'] : ['w.w', '.w.'], Math.round(wrist[0]) - 1, Math.round(wrist[1]) - 3, { w: AMBER[3] })
}

/** Eye under a heavy brow: k = brow, r = iris, w = glint. */
const EYE = ['kkk.', '.wrk', '..k.']

function beast(d: Painter): void {
  const m = (): Mask => d.m()

  // wings first, the tail and legs behind the body
  wing(d, 1)
  wing(d, -1)
  d.part(m().limb([44, 62, 51, 70, 57, 75, 62, 77], [3, 2.4, 1.8, 1.3]), SKIN, { bias: -1 })
  d.part(m().poly([60.5, 74, 67, 76.5, 62, 80.5]), SKIN, { bias: -1, bevel: 1.5 })
  for (const s of [1, -1] as const) {
    const x = (v: number) => MID + (v - MID) * s
    d.part(m().limb([x(36.5), 61, x(34.5), 66, x(35), 70.5], [3, 2.4, 1.8]), SKIN)
    d.stamp(['w.w.w', 'w.w.w'], Math.round(x(35)) - 2, 71, { w: AMBER[3] })
  }

  // body: lean chest, a pale belly
  d.part(m().ellipse(MID, 53, 7, 10), SKIN)
  d.part(m().ellipse(39.5, 55, 4.2, 7), SKIN, { line: 'none', bias: 1, bevel: 3 })

  // neck and head turned to the left, the jaws torn wide open
  d.part(m().limb([MID, 46, 38.5, 41, 37.5, 37], [4, 3.6, 3.6]), SKIN)
  d.part(m().poly([41, 30, 50, 23.5, 43.5, 33.5]), SKIN, { bias: -1, bevel: 1.5 })
  d.part(m().poly([42, 33.5, 51, 31, 43, 36.5]), SKIN, { bias: -1, bevel: 1.5 })
  const mouth = m().poly([33.5, 32, 20, 27.5, 21.5, 39.5, 34, 37])
  d.contact(mouth).fill(mouth, MOUTH[1])
  d.fill(m().poly([33.5, 33, 24, 31, 24.5, 36.5, 33.5, 36]), MOUTH[0])
  const lower = m().poly([34, 36, 21.5, 39, 21.5, 41.5, 35, 41])
  d.part(lower, SKIN, { bevel: 2 })
  const upper = m().poly([35, 27.5, 21, 24.5, 19.5, 27, 21, 28.5, 33.5, 33])
  d.part(upper, SKIN, { bevel: 2 })
  d.part(m().ellipse(37.5, 32, 5.5, 5, -15), SKIN)
  // fangs: down from the upper jaw, up from the lower one
  d.stamp(['w...w...w', 'w...w....', 'w........'], 21, 28, { w: AMBER[3] })
  d.stamp(['.......w', '..w...w.', '.ww..ww.'], 23, 36, { w: AMBER[3] })
  d.px(21, 25, SKIN[0])
  d.stamp(EYE, 35, 28, { k: SKIN[0], r: MOUTH[1], w: AMBER[3] })
}

/** Rubble and amber chunks thrown out of the burst. */
function debris(p: Painter): void {
  const rand = rng(23)
  for (const [x, y, amber] of [
    [8, 21, 0],
    [71, 19, 1],
    [18, 18, 1],
    [60, 18, 0],
    [7, 60, 1],
    [73, 58, 0],
    [27, 70, 1],
    [52, 78, 0],
    [44, 74, 1],
    [15, 79, 0],
    [19, 57, 0],
    [62, 60, 1],
    [31, 66, 0],
  ] as const) {
    const r = 1.6 + rand() * 1.3
    const chunk = p.m().poly([x - r, y, x - r * 0.3, y - r, x + r, y - r * 0.4, x + r * 0.6, y + r, x - r * 0.4, y + r * 0.8])
    if (amber) {
      p.shine(true)
      p.fill(chunk, AMBER[1])
      p.fill(chunk.facing([1, 0, 0, 1]), AMBER[0])
      p.fill(chunk.facing([-1, 0, 0, -1]), AMBER[2])
      p.px(Math.round(x - r * 0.3), Math.round(y - r * 0.3), AMBER[3])
      p.shine(false)
    } else {
      p.fill(chunk, ROCK[2])
      p.fill(chunk.facing([1, 0, 0, 1]), ROCK[0])
      p.fill(chunk.facing([-1, 0, 0, -1]), ROCK[4])
    }
  }
  // grit spraying out of the hole
  for (const [x, y] of pts([25, 63, 56, 64, 30, 22, 50, 21, 64, 66, 16, 64])) p.px(x, y, ROCK[3])
}

/** Ferns at the foot of the cliff: arching fronds with paired leaflets. */
function ferns(p: Painter): void {
  for (const [root, tipPt, ctrl] of [
    [P(-1, 90), P(13, 74), P(1, 76)],
    [P(4, 90), P(20, 80), P(10, 80)],
    [P(81, 90), P(67, 74), P(79, 76)],
    [P(76, 90), P(60, 81), P(70, 80)],
  ] as const) {
    const stem = quad(root, ctrl, tipPt, 10)
    p.fill(p.m().path(stem), FERN[0])
    stem.forEach(([x, y], i) => {
      if (i === 0 || i % 2 === 1) return
      const size = 1 + (10 - i) * 0.22
      p.fill(p.m().ellipse(x - size * 0.6, y - size * 0.7, size, size * 0.45, 45), FERN[1])
      p.fill(p.m().ellipse(x + size * 0.6, y - size * 0.7, size, size * 0.45, -45), FERN[0])
    })
  }
}

export const aerodactyl: CardDef = {
  id: 'pkm-fossil-073',
  number: 73,
  name: 'Aerodactyl',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Kampf',
  hp: 60,
  attacks: [
    { name: 'Flügelschlag', cost: ['Farblos', 'Farblos', 'Farblos'], damage: '30' },
    { name: 'Urkraft', cost: [] },
  ],
  // the sunset and the amber shine; the beast, the cliff and the rubble stay matt
  foil: 'painted',
  draw(p) {
    canyon(p)
    const d = p.layer()
    beast(d)
    p.subject(d, OUTLINE)
    debris(p)
    ferns(p)
  },
}
