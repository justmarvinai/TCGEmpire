import type { Mask, Painter, Points } from '../../toolkit/index.ts'
import { colors, hex, noise, pts, rng, stars } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Zugausfall-Hydra (Ultra, Spuk), hand-made full art, 80×112. Brief (docs/sets/empiremon.md): a
 * three-headed hydra whose heads are split-flap departure boards with red eyes, on an empty platform
 * at night.
 *
 * Composition: seen across the track, the hydra coils on the empty platform; three violet necks rise
 * to three departure boards. Each board's flaps are blank; two flaps of the eye row glow red with a
 * dark split through them (slit pupils), and the bottom of the board hangs open as a fanged jaw. The
 * side heads turn inwards (their side panels show). A full moon hangs over the town, a lamp lights an
 * empty bench, ghost lights drift. The frame's plates cover rows 4–14 and 91–106, so the heads sit at
 * rows 17–57.
 */
const SKY = colors('0a0716', '150e2a', '211740', '312056', '452c6e')
const MOON = colors('5c4e7e', '8a7cb2', 'b8acd8')
const WHITE = hex('f2ecfc')
/** Platform concrete and board housings. */
const STONE = colors('1b1727', '2e2840', '48405e', '6a6286')
const SCALE = colors('120a20', '261739', '3e2758', '5e3e84', '8a66b4')
const RED = colors('5a0a1a', 'b8162e', 'ff3c3c', 'ffb4a4')
const GLOW = colors('4e2696', '9060e8', 'dac2ff')
const OUTLINE = hex('06030c')

const MOON_AT = { x: 61, y: 21, r: 11 }
/** Back edge of the platform, the white line along its front edge, the front edge itself. */
const BACK = 62
const LINE = 82
const FRONT = 85

function night(p: Painter): void {
  // sky: dark at the top, a violet haze over the horizon and a wide glow round the moon
  p.dither(
    p.m().rect(0, 0, 80, BACK),
    SKY,
    (x, y) => {
      const haze = Math.pow(Math.max(0, (y - 20) / 42), 1.5) * 0.62
      const glow = Math.max(0, 1 - Math.hypot(x - MOON_AT.x, y - MOON_AT.y) / 30) * 0.8
      const lamp = Math.max(0, 1 - Math.hypot(x - 11, (y - 20) * 1.4) / 12) * 0.7
      const aura = Math.max(0, 1 - Math.hypot(x - 40, (y - 46) * 0.8) / 30) * 0.55
      return 0.04 + Math.max(haze, glow, lamp, aura) + noise(x, y, 4, 7) * 0.06
    },
    0.5,
  )
  stars(p, rng(26), 14, [MOON[2], WHITE, GLOW[2]], { x: 3, y: 2, w: 74, h: 22 })

  // the moon: a dim disc with grey seas and a pale rim on the upper left
  const moon = p.m().disc(MOON_AT.x, MOON_AT.y, MOON_AT.r)
  p.fill(moon, MOON[1])
  const seas = p.m().blob(65, 23, 3, 2.5, 3, 0.3).blob(58, 27, 2, 1.5, 5, 0.3).blob(65, 15, 2, 1.5, 7, 0.3)
  p.fill(seas.and(moon.shrunk(1)), MOON[0])
  p.fill(
    moon.facing([-1, 0, 0, -1]).or(
      p
        .m()
        .disc(MOON_AT.x - 3, MOON_AT.y - 3, 6)
        .and(moon)
        .minus(seas),
    ),
    MOON[2],
  )

  // the town behind the station: roofs, a church spire, masts of the overhead line
  const town = p
    .m()
    .poly([
      0, 62, 0, 55, 5, 55, 5, 52, 11, 49, 17, 52, 17, 56, 24, 56, 24, 53, 30, 53, 30, 57, 50, 57, 50, 52, 54,
      49, 58, 52, 58, 55, 63, 55, 63, 46, 64, 41, 65, 46, 65, 54, 72, 54, 72, 51, 80, 51, 80, 62,
    ])
  p.fill(town, SKY[1])
  for (const [x, y] of [
    [13, 52],
    [26, 55],
    [55, 52],
    [75, 53],
  ] as const)
    p.px(x, y, SKY[4])
  for (const [x, top] of [
    [21, 46],
    [71, 44],
  ] as const) {
    p.fill(
      p
        .m()
        .rect(x, top, 1, BACK - top)
        .rect(x - 2, top + 1, 5, 1),
      SKY[0],
    )
  }
  p.fill(p.m().path([0, 47, 21, 46.5, 46, 47.5, 71, 45, 80, 45.5]), SKY[0])
  p.px(71, 43, RED[2])
}

function platform(p: Painter): void {
  // the platform: dark at the back, lighter towards its edge, a few joints between the slabs
  const top = p.m().rect(0, BACK, 80, LINE - BACK)
  p.register(STONE)
  p.dither(top, [STONE[1], STONE[2], STONE[3]], (_x, y) => (y - BACK) / (LINE - BACK) - 0.1, 0.3)
  for (const y of [66, 73]) p.fill(p.m().rect(0, y, 80, 1), STONE[1])
  // white line, tactile strip, the coping stone and the dark face of the platform above the track
  p.fill(p.m().rect(0, LINE, 80, 1), WHITE)
  p.fill(p.m().rect(0, LINE + 1, 80, 2), STONE[2])
  p.fill(p.m().rect(0, FRONT - 1, 80, 1), STONE[3])
  p.fill(p.m().rect(0, FRONT, 80, 112 - FRONT), SKY[0])
  p.fill(p.m().rect(0, FRONT, 80, 1), STONE[1])
  // the rail of the empty track, glinting below the plate
  p.fill(p.m().rect(0, 107, 80, 1), STONE[3]).fill(p.m().rect(0, 108, 80, 2), STONE[1])

  // a lamp post on the left: its cold light falls in a pool on the platform
  const pool = p.m().ellipse(13, 72, 14, 4.5).and(top)
  p.fill(pool, STONE[2])
  p.fill(p.m().ellipse(13, 72, 9, 2.5).and(top), STONE[3])
  const post = p.m().rect(3, 17, 2, 58).rect(3, 16, 12, 2).rect(8, 18, 7, 2)
  p.fill(post, SKY[0])
  p.fill(p.m().rect(4, 18, 1, 57).rect(4, 16, 10, 1), STONE[2])
  p.fill(p.m().rect(9, 20, 5, 1), WHITE)
  p.fill(p.m().rect(8, 21, 7, 1).rect(7, 20, 1, 1).rect(14, 20, 1, 1), GLOW[2])

  // an empty bench in the light
  const bench = p
    .m()
    .rect(6, 67, 13, 3)
    .rect(5, 72, 15, 2)
    .rect(7, 74, 1, 4)
    .rect(17, 74, 1, 4)
    .rect(7, 70, 1, 2)
    .rect(17, 70, 1, 2)
  p.fill(bench.moved(1, 1).minus(bench), STONE[1])
  p.fill(bench, SKY[0])
  p.fill(p.m().rect(6, 67, 13, 1).rect(5, 72, 15, 1), MOON[2])
}

interface Board {
  /** Top left corner of the housing. */
  x: number
  y: number
  /** Flap cells per row; the housing is cells × 4 + 3 pixels wide. */
  cells: number
  /** Rows of blank flaps above the eye row. */
  rows: number
  /** The two cells of the eye row that glow red. */
  eyes: readonly [number, number]
  /** How far the jaw hangs open, in pixels. */
  gape: number
  /** Side panel that shows: −1 left (the head turns right), 1 right, 0 none. */
  side: -1 | 0 | 1
}

/** One head: a split-flap departure board with a fanged jaw, bent mounting rods for horns, red flap eyes. */
function board(d: Painter, b: Board): void {
  const w = b.cells * 4 + 3
  const h = (b.rows + 1) * 4 + 4
  const { x, y } = b
  const lip = y + h
  const jawTop = lip + b.gape
  const m = (): Mask => d.m()

  // mouth: violet glow deep inside, the lower jaw hanging open
  d.fill(m().rect(x + 2, lip - 1, w - 4, b.gape + 2), GLOW[0])
  d.fill(m().ellipse(x + w / 2, lip + b.gape / 2 + 0.5, w / 2 - 4, b.gape / 2 - 0.5), GLOW[1])
  d.fill(
    m()
      .ellipse(x + w / 2, lip + b.gape / 2 + 0.5, w / 2 - 7, 1)
      .and(m().rect(0, lip, 80, b.gape)),
    GLOW[2],
  )
  const jaw = m().poly([x + 1, jawTop, x + w - 1, jawTop, x + w - 2, jawTop + 4, x + 2, jawTop + 4])
  d.part(jaw, STONE, { bevel: 2 })
  d.fill(m().rect(x + 2, jawTop + 1, w - 4, 1), STONE[0])

  // side panel: the housing is a deep box turned towards the middle
  if (b.side !== 0) {
    const sx = b.side > 0 ? x + w : x - 3
    const panel =
      b.side > 0
        ? m().poly([sx, y + 1, sx + 3, y - 1, sx + 3, y + h - 2, sx, y + h])
        : m().poly([sx, y - 1, sx + 3, y + 1, sx + 3, y + h, sx, y + h - 2])
    d.part(panel, STONE, { bias: -1, bevel: 1.5 })
  }

  // the mounting rods, bent outwards like horns
  for (const s of [-1, 1]) {
    const rx = s < 0 ? x + 3 : x + w - 3
    d.part(m().limb([rx, y + 1, rx + s * 1, y - 3, rx + s * 3.5, y - 6], [1.3, 1, 0.6]), STONE, { bevel: 1 })
  }

  // housing with a dark face panel
  const box = m().rect(x, y, w, h)
  d.part(box, STONE, { bevel: 2 })
  d.fill(m().rect(x + 2, y + 2, w - 4, h - 3), STONE[0])

  // flap cells: light upper half, dark split, greyer lower half; the eye row glows red under a scowl
  for (let r = 0; r <= b.rows; r++) {
    for (let c = 0; c < b.cells; c++) {
      const cx = x + 2 + c * 4
      const cy = y + 3 + r * 4
      if (r < b.rows) {
        d.stamp(['fff', 'kkk', 'ggg'], cx, cy, { f: WHITE, k: STONE[0], g: MOON[1] })
        continue
      }
      const eye = b.eyes.indexOf(c)
      if (eye < 0) {
        d.stamp(['fff', 'kkk', 'ggg'], cx, cy, { f: STONE[2], k: STONE[0], g: STONE[1] })
        continue
      }
      // red light spilling into the gaps round the eye, the inner top corner cut away
      d.stamp(['.rrr.', 'r...r', 'r...r', 'r...r', '.rrr.'], cx - 1, cy - 1, { r: RED[0] })
      d.stamp(eye === 0 ? ['dd.', 'kkk', 'bbb'] : ['.dd', 'kkk', 'bbb'], cx, cy, {
        d: RED[2],
        k: RED[0],
        b: RED[1],
      })
      d.px(eye === 0 ? cx : cx + 2, cy, RED[3])
    }
  }

  // fangs: long ones hanging from the lip, short ones standing on the jaw
  for (let i = x + 3; i + 1 < x + w - 2; i += 4) {
    d.px(i, lip - 1, WHITE)
      .px(i + 1, lip - 1, WHITE)
      .px(i, lip, WHITE)
      .px(i + 1, lip, MOON[1])
    if (b.gape > 4) d.px(i, lip + 1, MOON[2])
    d.px(i + 2, jawTop - 1, WHITE).px(i + 2, jawTop, MOON[2])
  }
}

/** A neck: violet scales with a band of pale belly plates down its front and moonlight on its right rim. */
function neck(d: Painter, line: Points, radius: number): void {
  const curve = pts(line)
  const body = d.m().limb(line, [radius, radius * 0.95, radius * 1.1, radius * 1.25])
  d.part(body, SCALE.slice(0, 4), { bevel: 3 })
  d.fill(body.facing([-1, 0, 0, -1]), SCALE[3])
  d.fill(body.facing([1, 0]), SCALE[3])
  const belly = d
    .m()
    .limb(line, radius * 0.4)
    .and(body.shrunk(1))
  d.fill(belly, SCALE[3])
  d.fill(belly.facing([-1, 0]), SCALE[4])
  // plates: a dark seam every third pixel along the neck
  for (let i = 0; i + 1 < curve.length; i++) {
    const [ax, ay] = curve[i] ?? [0, 0]
    const [bx, by] = curve[i + 1] ?? [0, 0]
    const len = Math.hypot(bx - ax, by - ay)
    for (let t = 1; t < len; t += 3) {
      const cx = ax + ((bx - ax) * t) / len
      const cy = ay + ((by - ay) * t) / len
      const nx = -(by - ay) / len
      const ny = (bx - ax) / len
      d.fill(
        d
          .m()
          .line(cx - nx * radius, cy - ny * radius, cx + nx * radius, cy + ny * radius)
          .and(belly),
        SCALE[2],
      )
    }
  }
}

const HEADS: readonly Board[] = [
  { x: 7, y: 37, cells: 4, rows: 1, eyes: [0, 3], gape: 5, side: -1 },
  { x: 54, y: 32, cells: 4, rows: 1, eyes: [0, 3], gape: 4, side: 1 },
  { x: 29, y: 19, cells: 5, rows: 2, eyes: [1, 3], gape: 6, side: 0 },
]

function hydra(d: Painter): void {
  // the body: a heavy coil on the platform, the tail curling up on the right
  const back = d.m().blob(40, 72, 18, 6.5, 9, 0.1)
  d.part(back, SCALE.slice(0, 4), { bevel: 4, bias: -1 })
  const tail = d.m().limb([56, 79, 66, 80, 73, 76, 74, 70, 71, 66.5], [4.4, 3.6, 2.6, 1.6, 0.8])
  d.part(tail, SCALE.slice(0, 4), { bevel: 3 })
  const coil = [20, 77, 30, 81, 44, 81.5, 56, 79]
  d.part(d.m().limb(coil, [3.8, 4.4, 4.4, 4.2]), SCALE.slice(0, 4), { bevel: 3 })
  d.fill(
    d
      .m()
      .limb([22, 76.5, 30, 79.5, 44, 80, 56, 77.5, 65, 78.5, 71, 75.5], 1)
      .and(d.m().rect(0, 0, 80, 84)),
    SCALE[3],
  )

  // necks, the outer ones first
  neck(d, [15, 44, 17, 57, 26, 66, 35, 72], 3.4)
  neck(d, [63, 40, 62, 53, 54, 63, 46, 71], 3.4)
  neck(d, [40, 30, 41.5, 46, 38.5, 57, 40, 70], 3.9)

  for (const b of HEADS) board(d, b)
}

/** Will-o'-the-wisps: small violet ghost lights drifting round the heads. */
function ghostLights(p: Painter): void {
  for (const [x, y] of [
    [53, 21],
    [24, 58],
    [72, 58],
  ] as const) {
    p.stamp(['.o.', 'olo', 'owo', '.o.'], x - 1, y - 2, { o: GLOW[0], l: GLOW[1], w: GLOW[2] })
    p.px(x, y - 3, GLOW[0])
  }
}

export const zugausfallHydra: CardDef = {
  id: 'emp5-026',
  number: 26,
  name: 'Zugausfall-Hydra',
  tier: 'ultra',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    night(p)
    platform(p)
    const d = p.layer()
    hydra(d)
    p.subject(d, OUTLINE)
    ghostLights(p)
  },
}
