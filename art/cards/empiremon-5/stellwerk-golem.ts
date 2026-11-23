import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Stellwerk-Golem (Ultra, Beton), hand-made full art, 80×112. Brief (docs/sets/empiremon.md): a golem
 * built from an old signal box, levers for arms and signal lights for eyes, standing in gravel between
 * rails.
 *
 * Composition: the golem stands square in the gravel between two tracks that run away to a vanishing
 * point behind its legs, overhead-line masts marching along them into a pale band of dusk. Its head is
 * the gabled top of the signal box with two hooded red signal lamps for eyes; its chest is the lit
 * window band of the lever room; its body and legs are brick. Each forearm is a steel lever bar, each
 * hand the quadrant of a lever frame with four red and blue lever handles for claws: the left hand's
 * levers dug into the gravel, the right hand raised. The frame's plates cover rows 4–14 and 91–106, so
 * the head sits at rows 15–31.
 */
const SKY = colors('181c2a', '2a3042', '454b5e', '8a8078', 'e2c88e')
const STONE = colors('2a2a32', '4a4a54', '72727c', 'a2a2a8', 'd6d4cc')
const BRICK = colors('3e2220', '6e3a2e', '9e5a44')
const RED = colors('641010', 'c42222', 'ff5a3a', 'ffd2a0')
const BLUE = colors('1e3466', '3e6cb4')
const LIGHT = colors('e8b04a', 'fff0b4')
const GREEN = hex('6af0a0')
const OUTLINE = hex('0b0b11')

const VP = { x: 40, y: 58 }
/** x on the line through the vanishing point that crosses the bottom edge (y = 112) at x0. */
const along = (x0: number, y: number): number => VP.x + ((x0 - VP.x) * (y - VP.y)) / (112 - VP.y)
/** Screen row of a point at distance d along the tracks (d = 1 is the bottom edge). */
const rowAt = (d: number): number => VP.y + (112 - VP.y) / d

/** Inner and outer rail of each track where they cross the bottom edge. */
const RAILS = [-16, 10, 70, 96] as const

function dusk(p: Painter): void {
  // overcast sky, a pale band of dusk light on the horizon, ragged clouds
  p.dither(
    p.m().rect(0, 0, 80, VP.y),
    SKY,
    (x, y) => {
      const band = Math.pow(Math.max(0, (y - 16) / (VP.y - 16)), 2)
      const cloud = noise(x * 0.5, y * 1.6, 12, 8) > 0.6 ? 0.12 : 0
      return band * 0.98 + 0.05 + cloud
    },
    0.3,
  )

  // ground: gravel bed, darker towards the horizon
  const ground = p.m().rect(0, VP.y, 80, 112 - VP.y)
  p.register(STONE)
  p.dither(
    ground,
    [SKY[1], STONE[0], STONE[1], STONE[2]],
    (x, y) => 0.25 + ((y - VP.y) / 54) * 0.75 + (noise(x, y, 5, 2) - 0.5) * 0.5,
    0.6,
  )
  // pebbles catching the light in the foreground
  const rand = rng(27)
  for (let i = 0; i < 70; i++) {
    const y = VP.y + 8 + Math.floor(rand() * 46)
    const x = Math.floor(rand() * 80)
    const size = (y - VP.y) / 18
    if (size < 1) continue
    p.fill(p.m().rect(x, y, Math.round(size + 0.4), 1), STONE[3])
    p.fill(p.m().rect(x, y + 1, Math.round(size + 0.4), 1), STONE[0])
  }

  // overhead-line masts along both tracks, getting shorter towards the horizon, and their wires
  for (const side of [-1, 1]) {
    const x0 = VP.x + side * 70
    for (const d of [1.9, 2.8, 4.4, 7.5]) {
      const f = 1 / d
      const x = Math.round(along(x0, rowAt(d)))
      const base = Math.round(rowAt(d))
      const top = Math.round(VP.y - 62 * f)
      const wide = f > 0.4 ? 2 : 1
      p.fill(p.m().rect(x, top, wide, base - top), SKY[0])
      p.fill(p.m().line(x, top + 2, Math.round(x - side * 16 * f), top + 2), SKY[0])
    }
    p.fill(
      p.m().path([along(x0, rowAt(1.9)) - (side * 16) / 1.9, VP.y - 62 / 1.9 + 3, VP.x + side * 2, VP.y - 2]),
      SKY[1],
    )
  }

  // a distant signal showing green on the right
  p.fill(p.m().rect(66, 47, 1, 11).rect(65, 45, 3, 3), SKY[0])
  p.px(66, 46, GREEN)

  // the two tracks: sleepers, then the rails, running into the gravel
  for (let k = 0; k < 14; k++) {
    const d = 1 + k * 0.42
    const y = rowAt(d)
    const t = Math.max(1, Math.round(3 / d))
    for (const [a, b] of [
      [RAILS[0], RAILS[1]],
      [RAILS[2], RAILS[3]],
    ] as const) {
      const sleeper = p
        .m()
        .poly([
          along(a - 4, y),
          y,
          along(b + 4, y),
          y,
          along(b + 4, y + t),
          y + t,
          along(a - 4, y + t),
          y + t,
        ])
      p.fill(sleeper, BRICK[0])
      p.fill(sleeper.facing([0, -1]), BRICK[1])
    }
  }
  for (const x0 of RAILS) {
    const rail = p
      .m()
      .poly([along(x0 - 1.5, 112), 112, along(x0 + 1.5, 112), 112, VP.x + (x0 - VP.x) * 0.02, VP.y])
    p.fill(rail, STONE[1])
    p.fill(p.m().path([x0, 112, VP.x + (x0 - VP.x) * 0.02, VP.y]), STONE[4])
  }
}

/**
 * An arm: a concrete upper arm, a steel lever bar for the forearm, and for a hand the quadrant of a
 * lever frame with four levers sticking out of it like claws, each with a red or blue grip.
 */
function arm(d: Painter, shoulder: Pt, elbow: Pt, wrist: Pt, claws: readonly Pt[]): void {
  d.part(d.m().capsule(shoulder[0], shoulder[1], elbow[0], elbow[1], 4.6, 3.8), STONE, { bevel: 3 })
  d.part(d.m().capsule(elbow[0], elbow[1], wrist[0], wrist[1], 2.4, 2.1), STONE, { bevel: 2 })
  d.part(d.m().disc(elbow[0], elbow[1], 3.4), STONE, { bevel: 2 })
  d.px(Math.floor(elbow[0]), Math.floor(elbow[1]), OUTLINE)
  claws.forEach(([cx, cy], i) => {
    const [dx, dy] = [cx - wrist[0], cy - wrist[1]]
    const len = Math.hypot(dx, dy)
    const grip: Pt = [wrist[0] + (dx * (len - 2.2)) / len, wrist[1] + (dy * (len - 2.2)) / len]
    d.part(d.m().capsule(wrist[0], wrist[1], grip[0], grip[1], 0.9, 0.8), STONE, { bevel: 1 })
    d.part(d.m().capsule(grip[0], grip[1], cx, cy, 1.5, 1.3), i % 2 === 0 ? RED : BLUE, { bevel: 1.5 })
  })
  d.part(d.m().disc(wrist[0], wrist[1], 3.2), STONE, { bevel: 2 })
}

/** Brick courses on a mask: mortar every third row, joints staggered. */
function bricks(d: Painter, m: Mask, top: number): void {
  d.shade(m, BRICK, { bevel: 4 })
  m.each((x, y) => {
    const row = y - top
    if (row % 3 === 2) d.set(x, y, BRICK[0])
    else if ((x + (Math.floor(row / 3) % 2) * 3) % 6 === 0) d.set(x, y, BRICK[0])
  })
}

function golem(d: Painter): void {
  const m = (): Mask => d.m()

  // legs: short brick pillars on concrete feet
  bricks(d, m().poly([24.5, 61, 37, 61, 36.5, 82, 25.5, 82]), 61)
  bricks(d, m().poly([43, 61, 55.5, 61, 54.5, 82, 43.5, 82]), 61)
  d.part(m().rect(23, 80, 15, 6), STONE, { bevel: 2 })
  d.part(m().rect(42, 80, 15, 6), STONE, { bevel: 2 })

  // the lower storey: a brick block with an arched door and two small arched windows
  bricks(d, m().poly([21, 44, 59, 44, 57, 64, 23, 64]), 44)
  d.fill(m().rect(36, 52, 8, 12).disc(40, 52, 4), OUTLINE)
  d.fill(m().rect(37, 53, 6, 11).disc(40, 52.5, 3), SKY[0])
  for (const x of [28, 52]) {
    d.fill(
      m()
        .rect(x - 2, 49, 4, 6)
        .disc(x, 49, 2),
      OUTLINE,
    )
    d.fill(m().rect(x - 1, 50, 2, 4), LIGHT[0])
  }

  // arms: the left one hanging, its levers dug into the gravel; the right one raised, levers up like claws
  arm(
    d,
    [15, 37],
    [9, 51],
    [9.5, 65],
    [
      [4.5, 71.5],
      [7.5, 73.5],
      [11.5, 73.5],
      [14.5, 71.5],
    ],
  )
  arm(
    d,
    [65, 36],
    [72.5, 32],
    [71, 25],
    [
      [65.5, 20],
      [69, 18],
      [73, 18],
      [76, 20.5],
    ],
  )

  // the lever room: concrete walls, a band of lit windows across the chest, heavy shoulders, eaves
  d.part(m().poly([17, 29, 63, 29, 60, 45, 20, 45]), STONE, { bevel: 3 })
  d.fill(m().rect(21, 32, 38, 8), OUTLINE)
  d.fill(m().rect(22, 33, 36, 6), LIGHT[0])
  d.fill(m().rect(22, 33, 36, 2), LIGHT[1])
  for (let x = 26; x < 58; x += 5) d.fill(m().rect(x, 33, 1, 6), STONE[0])
  d.fill(m().rect(20, 40, 40, 1), STONE[3])
  d.fill(m().rect(19, 44, 42, 1), STONE[3])
  for (const s of [-1, 1]) {
    d.part(m().ellipse(40 + s * 25, 36, 7, 6.5), STONE, { bevel: 4 })
    d.part(m().disc(40 + s * 25, 36, 2.6), STONE, { bevel: 2, bias: -1 })
    d.px(40 + s * 25, 36, OUTLINE)
  }
  d.part(m().poly([15, 27, 65, 27, 63, 30, 17, 30]), SKY.slice(0, 3), { bevel: 2 })

  // the head, sunk between the shoulders: the gable of the signal box, a slate roof, a stove chimney
  d.part(m().rect(46, 14, 3, 6), BRICK, { bevel: 1 })
  d.part(m().rect(31, 19, 18, 9), STONE, { bevel: 3 })
  d.part(m().poly([29.5, 20.5, 40, 13, 50.5, 20.5]), SKY.slice(0, 3), { bevel: 2, line: 'none' })
  d.part(m().poly([27.5, 21, 40, 12.5, 52.5, 21, 49.5, 21, 40, 15.5, 30.5, 21]), SKY.slice(1, 4), {
    bevel: 1,
  })
  for (const x of [35.5, 44.5]) {
    d.fill(m().disc(x, 24, 3), OUTLINE)
    d.fill(m().disc(x, 24, 2), RED[1])
    d.fill(m().disc(x - 0.5, 23.5, 1.2), RED[2])
    d.px(x - 1, 23, RED[3])
    // the hood over the lamp, slanted into a scowl
    d.fill(
      m().poly([x - 3.5, x < 40 ? 20 : 21.5, x + 3.5, x < 40 ? 21.5 : 20, x + 3.5, 22, x - 3.5, 22]),
      OUTLINE,
    )
  }
  d.fill(m().rect(37, 27, 6, 1), STONE[0])

  // the dusk behind it catches every outer edge below the eaves
  const body = d.mask()
  d.tone(body.facing([-1, 0, 1, 0]).and(m().rect(0, 31, 80, 50)), 1)
}

/** The red eyes cast a glow on the air round the head. */
function glow(p: Painter): void {
  for (const x of [35.5, 44.5]) {
    p.m()
      .disc(x, 24, 5)
      .minus(p.subjectMask)
      .each((gx, gy) => {
        if ((gx + gy) % 2 === 0) p.set(gx, gy, RED[0])
      })
  }
}

export const stellwerkGolem: CardDef = {
  id: 'emp5-027',
  number: 27,
  name: 'Stellwerk-Golem',
  tier: 'ultra',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    dusk(p)
    const d = p.layer()
    golem(d)
    p.subject(d, OUTLINE)
    glow(p)
  },
}
