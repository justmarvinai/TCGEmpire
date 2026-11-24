import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Lapras (Ultra). Brief: sea serpent swimming from left to right, long neck raised, mouth open
 * mid-song, rings of sound in the air; misty sea at dawn, islands on the horizon, a few seabirds,
 * its reflection broken by soft waves. Full art, 80×112.
 *
 * Composition: Lapras swims to the right low in the water, the knobbed shell filling the lower
 * left, the neck rising in a slow S so the singing head sits high in the middle. Ahead of it the
 * sun rises out of the mist and the rings of its song drift towards it; seabirds circle over the
 * shell. The name plate covers rows 5–15, the attack plate 88–106.
 */
const SKY = colors('2d2a55', '5b4577', '9a5b85', 'd77f7f', 'f3a883', 'fbd39f', 'fff1c9')
const SEA = colors('16284f', '223f74', '35609a', '5b86b8')
const BLUE = colors('1d3a7a', '2f63b4', '4b93dc', '7fc2f2', 'c0e8fc')
const CREAM = colors('a88a5c', 'dcc38c', 'f6eac4')
const SHELL = colors('4a4462', '7b7393', 'aba4c0', 'dad5e6')
const MOUTH = hex('c0405a')
const OUTLINE = hex('0e1530')

const P = (x: number, y: number): Pt => [x, y]
const SUN = P(65, 45)
/** Lapras floats with its body cut by the water here. */
const WATER = 72
const HORIZON = 56

function dawn(p: Painter): void {
  p.shine(true)
  p.dither(
    null,
    SKY,
    (x, y) => {
      const up = Math.min(1, Math.max(0, (y - 8) / (HORIZON - 8)))
      const glow = Math.max(0, 1 - Math.hypot(x - SUN[0], (y - SUN[1]) * 1.3) / 38)
      return 0.1 + up * 0.52 + glow * 0.42 + (noise(x * 0.4, y * 2, 4, 7) - 0.5) * 0.1
    },
    0.35,
  )
  const sun = p.m().disc(SUN[0], SUN[1], 8.5)
  p.fill(sun, SKY[5])
  p.fill(p.m().disc(SUN[0] - 0.5, SUN[1] - 0.5, 7), SKY[6])
  // mist drifting across the lower half of the sun
  for (const [y, h] of [
    [46, 1],
    [49, 2],
    [53, 1],
  ] as const)
    p.fill(p.m().rect(0, y, 80, h).and(sun), SKY[4])
  p.shine(false)

  // islands on the horizon, the far one paler
  p.fill(p.m().poly([0, HORIZON, 0, 50, 6, 48, 12, 50, 20, 54, 27, HORIZON]), SKY[2])
  p.fill(p.m().poly([66, HORIZON, 71, 51, 74, 49.5, 77, 50.5, 80, 50, 80, HORIZON]), SKY[2])
  p.fill(p.m().poly([52, HORIZON, 56, 53.5, 60, 53, 63, HORIZON]), SKY[3])

  // sea: pale where it mirrors the dawn, deep blue in front
  p.register(SEA)
  p.shine(true)
  p.dither(
    p.m().rect(0, HORIZON, 80, 112 - HORIZON),
    [SKY[3], SEA[3], SEA[2], SEA[1], SEA[0]],
    (x, y) => (y - HORIZON) / 30 + 0.12 * Math.sin(x * 0.7 + y * 1.3),
    0.5,
  )
  // the sun's glitter on the swell, and soft wave crests
  const rand = rng(8)
  for (let y = HORIZON + 1; y < 88; y += 1 + Math.floor(rand() * 2.4)) {
    const width = 1 + Math.floor(rand() * (2 + (y - HORIZON) / 5))
    const x = Math.round(SUN[0] - width / 2 + (rand() - 0.5) * (3 + (y - HORIZON) / 5))
    p.fill(p.m().rect(x, y, width, 1), y < 64 || rand() < 0.3 ? SKY[6] : SKY[5])
  }
  for (const [x, y, w] of [
    [30, 58, 6],
    [44, 61, 5],
    [2, 77, 8],
    [52, 76, 7],
    [12, 84, 7],
    [40, 83, 6],
  ] as const)
    p.fill(p.m().rect(x, y, w, 1), SEA[3])
  p.shine(false)

  // a few seabirds circling over the shell
  for (const [x, y] of pts([12, 27, 22, 22, 6, 36]))
    p.stamp(['k...k', '.k.k.', '..k..'], x, y, { k: SKY[1] })
}

/** A blunt knob on the shell: a rounded cone from (x, y) in the direction (dx, dy). */
function knob(d: Painter, x: number, y: number, dx: number, dy: number, r: number, len: number): void {
  const tip = P(x + dx * len, y + dy * len)
  const side = (k: number): number[] => [x - dy * r * k, y + dx * r * k]
  const cone = d
    .m()
    .poly([...side(1), tip[0] - dy * r * 0.6, tip[1] + dx * r * 0.6, tip[0] + dy * r * 0.6, tip[1] - dx * r * 0.6, ...side(-1)])
    .disc(tip[0], tip[1], r * 0.68)
  d.part(cone, SHELL, { bevel: 2.5 })
}

/** Eye: big and dark with a glint. */
const EYE = ['.kk.', 'kwkk', 'kkkk', 'kkkk', '.kk.']
/** The ear, a rolled-up flap behind the eye. */
const EAR = ['.dd.', 'd..d', 'd.d.', '.d..']

function serpent(d: Painter): void {
  const m = (): Mask => d.m()

  // tail flipper trailing at the back
  d.part(m().poly([8, 70, -1, 65, 2, 73]), BLUE, { bias: -1 })

  // body under the shell, broad and low in the water
  d.part(m().ellipse(30, 72, 27, 8), BLUE, { bevel: 5 })

  // shell: a grey dome with a hard rim, blunt knobs fanning out along its crest
  const dome = m().ellipse(22, 64, 20, 13.5, -3)
  d.part(dome, SHELL, { bevel: 5 })
  for (const [deg, r, len] of [
    [205, 3, 3],
    [234, 3.7, 4.2],
    [262, 4.3, 5],
    [291, 3.9, 4.4],
  ] as const) {
    const a = (deg * Math.PI) / 180
    const [dx, dy] = [Math.cos(a), Math.sin(a)]
    knob(d, 22 + dx * 17.5, 64 + dy * 11.5, dx * 0.7 - 0.15, dy * 0.7 - 0.3, r, len)
  }
  d.fill(dome.clone().minus(dome.moved(0, -2)).and(m().rect(0, 66, 80, 10)), SHELL[0])
  d.fill(dome.clone().minus(dome.moved(0, -2)).moved(0, -2).and(dome).and(m().rect(0, 66, 80, 10)), SHELL[2])

  // front flipper paddling, breaking the surface
  d.part(m().ellipse(50, 70, 7.5, 3, -25), BLUE, { bevel: 2 })

  // neck rising in a slow S, the cream throat in front
  const neck = m().limb([40, 70, 45.5, 61, 43.5, 51, 44, 42, 47, 34], [8.5, 7.2, 6.2, 5.6, 5.4])
  d.part(neck, BLUE)
  const throat = m()
    .limb([45.5, 72, 50.5, 61, 48.5, 52, 49.5, 43, 52.5, 35], [5, 4.3, 3.6, 3.2, 3])
    .and(neck)
  d.shade(throat, CREAM, { bevel: 3 })

  // head tilted up to sing: a short horn, the ear, the mouth open between snout and cream jaw
  d.part(m().limb([45, 22, 43.5, 18.5, 42, 15.5], [2.3, 1.5, 0.8]), BLUE, { bevel: 2 })
  const mouth = m().poly([50, 30.5, 62.5, 23.5, 63, 29.5, 55.5, 33.5])
  d.contact(mouth).fill(mouth, MOUTH)
  d.part(m().ellipse(56, 32, 6.5, 2.4, -12), CREAM, { bevel: 2 })
  d.part(m().ellipse(48, 27, 8.5, 7, -15).ellipse(56, 24, 6.5, 4, -20), BLUE)
  d.stamp(EAR, 40, 25, { d: BLUE[0] })
  d.stamp(EYE, 48, 22, { k: OUTLINE, w: BLUE[4] })
  d.px(60, 21, BLUE[0])

  // the sun ahead lights every rim that faces it
  d.tone(d.mask().facing([1, 0]).and(m().rect(40, 16, 36, 60)), 1)
}

/** Rings of the song: arcs widening away from the open mouth. */
const MOUTH_AT = P(62, 27)
function song(p: Painter): void {
  p.shine(true)
  const dir = (-28 * Math.PI) / 180
  for (const r of [4, 7, 10]) {
    const arc = p.m()
    for (let y = 14; y < 44; y++) {
      for (let x = 50; x < 80; x++) {
        const dx = x + 0.5 - MOUTH_AT[0]
        const dy = y + 0.5 - MOUTH_AT[1]
        const off = Math.abs(Math.atan2(dy, dx) - dir)
        if (Math.abs(Math.hypot(dx, dy) - r) < 0.55 && off < 0.62 - r * 0.012) arc.add(x, y)
      }
    }
    p.fill(arc.minus(p.subjectMask), SKY[6])
  }
  p.shine(false)
}

/** The reflection: the subject's own colours mirrored a step darker, broken into bands by the swell. */
function reflection(p: Painter): void {
  const mirror = p.layer()
  p.subjectMask.each((x, y) => {
    const to = 2 * WATER + 1 - y
    if (to <= WATER || to > WATER + 14 || (to - WATER) % 3 === 0 || (to > WATER + 8 && to % 2 === 0)) return
    const c = p.get(x, y)
    const shift = Math.round(Math.sin(to * 1.9) * Math.min(2, (to - WATER) / 4))
    mirror.set(x + shift, to, c === OUTLINE ? SEA[0] : c)
  })
  mirror.tone(mirror.mask(), -1)
  mirror.erase(p.subjectMask)
  p.blit(mirror)
}

/** Foam where the body meets the water, and the ripples it pushes ahead and leaves behind. */
function wake(p: Painter): void {
  p.shine(true)
  const foam = p.m()
  for (let x = 0; x < 64; x++) if (Math.sin(x * 0.8) > -0.2) foam.add(x, WATER - (Math.sin(x * 0.4) > 0.6 ? 1 : 0))
  p.fill(foam.and(p.subjectMask.grown(1)), SEA[3])
  for (const [x, y, w] of [
    [57, WATER - 1, 4],
    [60, WATER + 1, 7],
    [64, WATER + 3, 6],
    [0, WATER + 2, 5],
    [1, WATER + 5, 4],
  ] as const)
    p.fill(p.m().rect(x, y, w, 1), SKY[5])
  p.shine(false)
}

export const lapras: CardDef = {
  id: 'pkm-fossil-070',
  number: 70,
  name: 'Lapras',
  tier: 'ultra',
  kind: 'pokemon',
  type: 'Wasser',
  hp: 80,
  attacks: [
    { name: 'Aquaknarre', cost: ['Wasser', 'Farblos'], damage: '10+' },
    { name: 'Konfusstrahl', cost: ['Wasser', 'Wasser'], damage: '10' },
  ],
  // the dawn sky, the sun, the glittering sea and the song shine; Lapras and the islands stay matt
  foil: 'painted',
  draw(p) {
    dawn(p)
    const d = p.layer()
    serpent(d)
    d.erase(d.m().rect(0, WATER + 1, 80, 112))
    p.subject(d, OUTLINE)
    reflection(p)
    wake(p)
    song(p)
  },
}
