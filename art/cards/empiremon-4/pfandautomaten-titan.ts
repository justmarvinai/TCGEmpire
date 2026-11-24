import type { Mask, Painter, Pt, Ramp } from '../../toolkit/index.ts'
import { colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Pfandautomaten-Titan (Ultra, Beton). A giant robot built from a reverse vending machine rises behind a
 * supermarket at dusk and grips the edge of its roof. The machine is its head and chest: two green displays
 * are its eyes, the bottle intake with its rubber flaps is a maw with a conveyor belt for a tongue, and
 * bottles tumble into it. The market's lit front and the car park in front of it give the scale.
 * Full art, 80×112.
 *
 * Composition: a kaiju looming over a building: the titan fills the upper two thirds, the roof line runs
 * across at row 66, the arms come down to it on both sides. The frame's plates cover rows 4–14 and 91–106,
 * so the header starts at row 16 and the market's front lies between rows 66 and 90.
 */
const SKY = colors('12151f', '1c2130', '2a3043', '3e4258', '62566c', '9a6a6c', 'd08a6a')
const METAL = colors('262b36', '444c5a', '6e7888', 'a4aebc', 'dce2ea')
const GREEN = colors('0a3016', '15843a', '46dc66', 'c4ffcc')
const RED = colors('5e1418', 'a42a2a', 'e0503e')
const BROWN = colors('4a2810', '8e5222')
const GOLD = hex('f0c050')
const LAMP = hex('ffe8a8')
const RUBBER = hex('101216')
const OUTLINE = hex('07080b')

const P = (x: number, y: number): Pt => [x, y]

const GREEN_GLASS: Ramp = [GREEN[0], GREEN[1], GREEN[2], GREEN[3]]
const BROWN_GLASS: Ramp = [BROWN[0], BROWN[1], METAL[3], METAL[4]]
const CLEAR_GLASS: Ramp = [METAL[1], METAL[2], METAL[3], METAL[4]]

// ── the sky behind ──────────────────────────────────────────────────────────

function dusk(p: Painter): void {
  // heavy clouds above, the last light low over the roofs
  p.dither(null, SKY, (_x, y) => 0.06 + Math.pow(Math.max(0, (y - 12) / 56), 1.3) * 0.98, 0.45)
  p.register(SKY)
  // a pale moon low at the top left, half behind the titan's shoulder
  const moon = p.m().disc(12, 19, 6.5)
  p.fill(moon, METAL[3])
  p.fill(moon.facing([-1, 0, 0, -1]), METAL[4])
  p.fill(
    p
      .m()
      .disc(14, 21, 1.6)
      .or(p.m().disc(10, 17.5, 1)),
    METAL[2],
  )
  const clouds = p.m()
  for (const [x, y, rx, ry, seed] of [
    [8, 27, 13, 3, 1],
    [74, 21, 15, 3.4, 2],
    [8, 44, 12, 2.6, 3],
    [73, 47, 11, 2.6, 4],
  ] as const) {
    clouds.blob(x, y, rx, ry, seed, 0.3)
  }
  p.fill(clouds, SKY[1])
  p.fill(clouds.facing([0, 1]), SKY[4])
  // the city far behind, dark against the afterglow, a few lit windows
  const city = p.m()
  for (const [x, top, w] of [
    [0, 54, 6],
    [5, 58, 5],
    [71, 56, 5],
    [75, 52, 5],
  ] as const) {
    city.rect(x, top, w, 70 - top)
  }
  p.fill(city, SKY[2])
  const rand = rng(9)
  city.each((x, y) => {
    if (x % 2 === 1 && y % 3 === 0 && city.has(x, y - 1) && rand() < 0.3) p.px(x, y, SKY[5])
  })
}

// ── the market in front ─────────────────────────────────────────────────────

function market(p: Painter): void {
  // roof parapet and the concrete front
  const front = p.m().rect(0, 66, 80, 22)
  p.fill(front, METAL[1])
  p.fill(p.m().rect(0, 66, 80, 2), METAL[3])
  p.fill(p.m().rect(0, 68, 80, 1), METAL[0])
  // a long band of shop windows lit from inside, the glass doors in the middle brightest
  const windows = p.m().rect(3, 73, 74, 8)
  p.fill(windows, LAMP)
  p.fill(p.m().rect(3, 77, 74, 4), SKY[6])
  // shelves seen through the glass, then the window frames
  for (let x = 5; x < 76; x += 8) p.fill(p.m().rect(x, 76, 5, 1).rect(x, 79, 5, 1), SKY[5])
  for (let x = 3; x < 77; x += 8) p.fill(p.m().rect(x, 73, 1, 8), METAL[0])
  const doors = p.m().rect(33, 72, 14, 10)
  p.fill(doors, GREEN[2])
  p.fill(p.m().rect(34, 73, 12, 1), GREEN[3])
  p.fill(p.m().rect(39.5, 72, 1, 10), GREEN[1])
  // sign over the doors: a green panel with a red stripe, no lettering
  p.fill(p.m().rect(30, 69, 20, 3), GREEN[1])
  p.fill(p.m().rect(30, 69, 6, 3), RED[1])
  // car park
  p.fill(p.m().rect(0, 82, 80, 30), METAL[0])
  p.fill(p.m().rect(0, 82, 80, 1), METAL[2])
  p.dither(p.m().rect(30, 83, 20, 3), [METAL[0], GREEN[0]], (x) => 0.6 - Math.abs(x - 40) / 16, 1)
  for (const x of [6, 18, 62, 74]) p.fill(p.m().rect(x, 85, 1, 3), METAL[2])
  // street lamps and a row of shopping carts
  for (const x of [11, 68]) {
    p.fill(p.m().rect(x, 74, 1, 13), METAL[0])
    p.fill(p.m().rect(x - 1, 73, 3, 1), METAL[2])
    p.px(x - 1, 74, LAMP).px(x + 1, 74, LAMP)
  }
  for (const x of [17, 21, 25]) {
    p.stamp(['kkkkk', 'kgkgk', '.kkk.', '.o.o.'], x, 84, { k: METAL[3], g: METAL[1], o: OUTLINE })
  }
}

// ── the titan ───────────────────────────────────────────────────────────────

/** A flat panel lit from the top left: light rim on the top and left, dark rim on the bottom and right. */
function panel(d: Painter, m: Mask, base: number, light: number, dark: number): void {
  d.fill(m, base)
  d.edge(m, light, [-1, 0, 0, -1])
  d.edge(m, dark, [1, 0, 0, 1])
}

/** One bottle as a tilted capsule with a neck and a cap; `deg` 0 points the neck straight up. */
function bottle(d: Painter, at: Pt, deg: number, ramp: Ramp): void {
  const a = (deg * Math.PI) / 180
  const ux = Math.sin(a)
  const uy = -Math.cos(a)
  const body = d.m().capsule(at[0], at[1], at[0] + ux * 3.5, at[1] + uy * 3.5, 1.7, 1.7)
  body.capsule(at[0] + ux * 3.5, at[1] + uy * 3.5, at[0] + ux * 6.2, at[1] + uy * 6.2, 0.8, 0.8)
  d.part(body, ramp, { bevel: 1.2 })
  d.px(Math.floor(at[0] + ux * 6.8), Math.floor(at[1] + uy * 6.8), GOLD)
}

/** An arm segment: a box between two joints, lit on its upper left side, with a groove down it. */
function segment(d: Painter, a: Pt, b: Pt, r: number): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const nx = (-(b[1] - a[1]) / len) * r
  const ny = ((b[0] - a[0]) / len) * r
  const box = d
    .m()
    .poly([a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny, b[0] - nx, b[1] - ny, a[0] - nx, a[1] - ny])
  panel(d, box, METAL[2], METAL[3], METAL[0])
  d.fill(d.m().path([a[0], a[1], b[0], b[1]]).and(box.shrunk(1)), METAL[1])
}

/** The back of a claw that grips the roof: a block of a hand just above the parapet. */
function hand(d: Painter, x: number): void {
  panel(d, d.m().rect(x - 5, 58, 11, 8), METAL[2], METAL[3], METAL[0])
}

/** The claw's three fingers, hooked over the parapet in front of the roof. */
function fingers(d: Painter, x: number): void {
  for (const fx of [x - 4.5, x - 1, x + 2.5]) {
    const finger = d
      .m()
      .rect(fx, 64, 3, 6)
      .del(Math.round(fx), 69)
      .del(Math.round(fx) + 2, 69)
    panel(d, finger, METAL[3], METAL[4], METAL[1])
  }
}

function titan(d: Painter): void {
  const m = (): Mask => d.m()

  // arms: shoulders down and out, forearms back in to the claws on the roof
  for (const s of [1, -1]) {
    const x = (v: number) => 40 + (v - 40) * s
    segment(d, P(x(26), 31), P(x(15), 45), 4)
    segment(d, P(x(15), 46), P(x(20), 60), 4.6)
    d.part(m().disc(x(15), 45.5, 2.8), [METAL[0], METAL[1], METAL[3], METAL[4]], { bevel: 1.5 })
    hand(d, x(20))
  }

  // the machine: front face and its darker right side, a little wider at the foot (we look up at it)
  const right = m().poly([56, 16, 60, 18, 62, 70, 58, 70])
  panel(d, right, METAL[1], METAL[2], METAL[0])
  const front = m().poly([23, 16, 56, 16, 58, 70, 21, 70])
  panel(d, front, METAL[3], METAL[4], METAL[1])
  d.register(METAL)
  // the market's light from below catches the lower edge of the casing
  d.fill(
    m()
      .rect(21, 62, 38, 4)
      .and(front)
      .minus(front.facing([-1, 0, 1, 0])),
    METAL[2],
  )
  // panel seams: under the header and round the lower door, rivets in the corners
  d.fill(m().rect(22, 26, 36, 1).rect(22, 54, 37, 1).and(front.shrunk(1)), METAL[2])
  d.fill(m().rect(22, 27, 36, 1).rect(22, 55, 37, 1).and(front.shrunk(1)), METAL[4])
  for (const [x, y] of [
    [25, 19],
    [54, 19],
    [24, 57],
    [55, 57],
    [24, 36],
    [55, 36],
  ] as const) {
    d.px(x, y, METAL[1])
  }

  // shoulder blocks with vents
  for (const [x, w] of [
    [10, 14],
    [56, 14],
  ] as const) {
    const block = m().rect(x, 22, w, 12)
    panel(d, block, METAL[2], METAL[4], METAL[0])
    for (const y of [26, 29]) d.fill(m().rect(x + 2, y, w - 4, 1), METAL[1])
  }

  // header: the lit sign panel with a bottle and a turning arrow, no lettering
  const header = m().rect(25, 17, 30, 8)
  panel(d, header, GREEN[1], GREEN[2], GREEN[0])
  d.stamp(
    ['..w....www..', '.www..w...w.', '.www..w...w.', '.www.....ww.', '.www..w.....', '.www...www..'],
    34,
    18,
    { w: GREEN[3] },
  )

  // eyes: two green displays with angry segment glyphs, their glow on the casing round them
  for (const [x, flip] of [
    [26, false],
    [44, true],
  ] as const) {
    const screen = m().rect(x, 28, 10, 7)
    d.fill(screen.grown(2).minus(screen.grown(1)), GREEN[1])
    d.fill(screen.grown(1), OUTLINE)
    d.fill(screen, GREEN[0])
    d.stamp(
      ['ggg.......', '.ggggggg..', '..gggwwgg.', '....ggggg.', '..........'],
      x,
      29,
      { g: GREEN[2], w: GREEN[3] },
      flip,
    )
  }

  // the maw: the bottle intake with rubber flaps for teeth, the belt running in, light at the back
  const maw = m().rect(26, 39, 28, 13)
  d.fill(maw.grown(2), METAL[1])
  d.fill(maw.grown(2).facing([0, -1]), METAL[2])
  d.fill(maw.grown(2).facing([0, 1]), GREEN[1])
  d.dither(
    maw,
    [RUBBER, GREEN[0], GREEN[1], GREEN[2]],
    (x, y) => 0.95 - Math.hypot(x - 40, (y - 44) * 1.6) / 13,
    0.4,
  )
  d.fill(m().rect(26, 48, 28, 4), METAL[0])
  for (let x = 27; x < 54; x += 3) d.fill(m().rect(x, 48, 1, 4), RUBBER)
  d.fill(m().rect(26, 48, 28, 1), METAL[2])
  for (let x = 27; x < 53; x += 3) d.fill(m().rect(x, 39, 2, x % 2 === 0 ? 5 : 4), OUTLINE)
  bottle(d, P(32, 47.3), 82, GREEN_GLASS)
  bottle(d, P(41, 47.3), 98, CLEAR_GLASS)
  bottle(d, P(48, 47.3), 84, BROWN_GLASS)

  // below the maw: the big green button and the receipt slot with a receipt sticking out
  d.fill(m().disc(29, 58.5, 4.4), METAL[1])
  d.part(m().disc(29, 58.5, 3.2), GREEN_GLASS, { bevel: 2 })
  d.fill(m().rect(47, 56, 8, 1), OUTLINE)
  d.fill(m().rect(48, 57, 6, 6), METAL[4])
  d.fill(m().rect(49, 58, 3, 1).rect(49, 60, 4, 1), METAL[2])
}

/** The conveyor belt runs out of the maw like a tongue and down to the roof, bottles riding up on it. */
function tongue(d: Painter): void {
  const belt = d.m().poly([34.5, 50, 45.5, 50, 48, 67, 32, 67])
  d.fill(belt, METAL[1])
  d.edge(belt, METAL[2], [-1, 0])
  d.edge(belt, METAL[0], [1, 0])
  for (let y = 52; y < 67; y += 3) d.fill(d.m().rect(0, y, 80, 1).and(belt.shrunk(1)), RUBBER)
  // the roller at its end, on the parapet
  const roller = d.m().rect(31, 66, 18, 3)
  d.fill(roller, METAL[2])
  d.fill(roller.facing([0, -1]), METAL[4])
  d.fill(roller.facing([0, 1]), METAL[0])
  bottle(d, P(36.5, 63.5), 90, BROWN_GLASS)
  bottle(d, P(37.5, 57.5), 90, GREEN_GLASS)
}

export const pfandautomatenTitan: CardDef = {
  id: 'emp4-020',
  number: 20,
  name: 'Pfandautomaten-Titan',
  tier: 'ultra',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    dusk(p)
    const d = p.layer()
    titan(d)
    p.subject(d, OUTLINE)
    market(p)
    const front = p.layer()
    tongue(front)
    fingers(front, 20)
    fingers(front, 60)
    p.subject(front, OUTLINE)
  },
}
