import type { Mask, Painter, Pt, RGB, Ramp } from '../../toolkit/index.ts'
import { NONE, colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Glasdrache (Ultra, Flut). A dragon of green and brown bottle glass perches on a bottle bank in the rain
 * at blue hour. The full moon stands behind its spread left wing, a stained-glass wing of green and amber
 * panes, so the moonlight breaks through the glass; the body shows the sky and the containers behind it,
 * tinted. Its horns are bottle necks, its tail ends in a shard. Full art, 80×112.
 *
 * Composition: three igloo bottle banks along the bottom, the dragon on the middle one, the wing spread up
 * and left over the moon, the neck rising to the right with the head roaring at the top right. The frame's
 * plates cover rows 4–14 and 91–106, so the horns stay below row 16 and the containers stand at row 88.
 */
const SKY = colors('0a1028', '122046', '1c3266', '2c4a88', '4a6aa8', '8ab0e0')
const MOON = colors('a8c0e8', 'e8f0ff')
const GREEN = colors('0c3626', '18603e', '2e905a', '6cc890', 'c8f8dc')
const AMBER = colors('3a1a0a', '7a3e14', 'b8701e', 'f0b850', 'fff0c0')
const GREY = colors('5a6680', '8e9ab4', 'c4d0e2')
const OUTLINE = hex('050816')

const P = (x: number, y: number): Pt => [x, y]

// ── the bottle-bank yard ────────────────────────────────────────────────────

const MOON_AT = P(30, 25)

function night(p: Painter): void {
  p.dither(
    null,
    SKY,
    (x, y) => {
      const halo = Math.max(0, 1 - Math.hypot(x - MOON_AT[0], y - MOON_AT[1]) / 34)
      return 0.05 + (y / 112) * 0.42 + halo * halo * 0.55
    },
    0.55,
  )
  p.register(SKY)
  const moon = p.m().disc(MOON_AT[0], MOON_AT[1], 11)
  p.fill(moon, MOON[1])
  p.fill(moon.facing([1, 0, 0, 1]), MOON[0])
  for (const [x, y, r] of [
    [34.5, 21.5, 1.8],
    [27, 30, 2],
    [37, 29, 1.2],
  ] as const) {
    p.fill(p.m().ellipse(x, y, r + 0.4, r), MOON[0])
  }
  // rain falling slantwise
  const rand = rng(12)
  const rain = p.m()
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * 84)
    const y = 15 + Math.floor(rand() * 72)
    rain.path([x, y, x - 1, y + 3])
  }
  p.fill(rain.minus(moon), SKY[4])
  p.fill(rain.and(moon), MOON[0])
}

/** An igloo bottle bank: a bell with a round inlet and a lifting knob, in its own colour. */
function bank(p: Painter, cx: number, ramp: Ramp): void {
  const bell = p
    .m()
    .ellipse(cx, 70, 11.5, 13)
    .rect(cx - 12, 70, 24, 18)
  bell.minus(p.m().rect(0, 88, 80, 30))
  p.part(bell, ramp, { bevel: 6 })
  // ribs round the bell and the inlet with its rubber flaps
  p.fill(
    p
      .m()
      .rect(cx - 12, 77, 24, 1)
      .and(bell),
    ramp[0] ?? 0,
  )
  const inlet = p.m().disc(cx - 4, 70, 2.6)
  p.fill(inlet, OUTLINE)
  p.fill(
    p
      .m()
      .rect(cx - 5, 68, 1, 4)
      .rect(cx - 3, 68, 1, 4)
      .and(inlet),
    SKY[2],
  )
  p.part(p.m().rect(cx - 1.5, 55, 3, 3), GREY, { bevel: 1 })
}

function yard(p: Painter): void {
  bank(p, 12, GREEN.slice(0, 4))
  bank(p, 68, GREY)
  bank(p, 40, AMBER.slice(0, 4))
  // wet ground with puddles mirroring the moon and the glass
  const ground = p.m().rect(0, 86, 80, 26)
  p.fill(ground, SKY[0])
  p.fill(p.m().rect(0, 86, 80, 1), SKY[2])
  for (const [x, w, c] of [
    [6, 9, SKY[3]],
    [44, 12, SKY[3]],
    [22, 6, GREEN[2]],
    [60, 7, AMBER[2]],
  ] as const) {
    p.fill(p.m().rect(x, 88, w, 1), c)
  }
}

// ── glass ───────────────────────────────────────────────────────────────────

const lum = (c: RGB): number =>
  c === NONE ? 0 : ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.55 + (c & 255) * 0.15

/**
 * Paint a glass part: the brightness of whatever lies behind it picks the shade, so the moon and the sky
 * show through. The rim is darker (more glass to look through), a caustic gathers light inside the far
 * rim and a hard highlight sits inside the near one.
 */
function glass(d: Painter, p: Painter, m: Mask, ramp: Ramp, lift = 0): void {
  const top = ramp.length - 1
  // what lies behind, softened over a 3×3 window so the dithered sky does not speckle the glass
  const seen = (x: number, y: number): number => lum(d.get(x, y) !== NONE ? d.get(x, y) : p.get(x, y))
  const behind = new Map<number, number>()
  m.each((x, y) => {
    let sum = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += seen(x + dx, y + dy)
    behind.set(y * 80 + x, sum / 9)
  })
  const inner = m.shrunk(1)
  const near = inner
    .clone()
    .minus(inner.shrunk(1))
    .and(m.moved(1, 1))
    .minus(m.moved(-1, -1).and(inner.shrunk(1)))
  const far = inner.facing([1, 0, 0, 1])
  m.each((x, y) => {
    const l = behind.get(y * 80 + x) ?? 0
    let i = Math.floor((l / 255) * top * 1.5) + 1 + lift
    if (!inner.has(x, y)) i -= 1
    else if (far.has(x, y)) i += 1
    i = Math.max(0, Math.min(top, i))
    d.set(x, y, ramp[i] ?? 0)
  })
  d.fill(near.and(m.facing([-1, 0, 0, -1]).grown(1)).and(inner), ramp[Math.min(top, 3 + lift)] ?? 0)
  d.register(ramp)
}

// ── the dragon ──────────────────────────────────────────────────────────────

/** The spread left wing: bones and one arc as dark leading, panes of green and amber glass between them. */
function wing(d: Painter, p: Painter): void {
  const S = P(39, 44)
  const E = P(31, 30)
  const W = P(19, 17)
  const tips = [P(4, 19), P(4, 35), P(11, 48), P(24, 53), P(35, 54)] as const
  const membrane = d
    .m()
    .poly([S, E, W, tips[0], P(7, 27), tips[1], P(9, 41), tips[2], P(18, 49), tips[3], P(30, 52), tips[4]])
  const lead = d.m()
  for (const t of tips.slice(0, 4)) lead.path([W[0], W[1], t[0], t[1]])
  lead.path([E[0], E[1], tips[4][0], tips[4][1]])
  // the arc of leading that splits every sector into an inner and an outer pane
  membrane.each((x, y) => {
    if (Math.abs(Math.hypot(x + 0.5 - W[0], y + 0.5 - W[1]) - 16) < 0.55) lead.add(x, y)
  })
  lead.and(membrane)
  const bounds = [W, ...tips.slice(0, 4), S].map((t, i) =>
    i === 0 ? 0 : Math.atan2(t[1] - W[1], t[0] - W[0]),
  )
  const panes: [Mask, Mask] = [d.m(), d.m()]
  membrane
    .clone()
    .minus(lead)
    .each((x, y) => {
      const a = Math.atan2(y + 0.5 - W[1], x + 0.5 - W[0])
      let sector = 0
      for (let i = 1; i < bounds.length - 1; i++) if (a < (bounds[i] ?? 0)) sector = i
      const outer = Math.hypot(x + 0.5 - W[0], y + 0.5 - W[1]) > 16 ? 1 : 0
      panes[(sector + outer) % 2]?.add(x, y)
    })
  glass(d, p, panes[0], GREEN)
  glass(d, p, panes[1], AMBER)
  d.fill(lead, GREEN[0])
  // the arm along the leading edge: thick green glass
  glass(d, p, d.m().limb([S, E, W], [2.6, 2.2, 1.6]), GREEN, 1)
}

/** The right wing, half folded behind the neck. */
function farWing(d: Painter, p: Painter): void {
  const membrane = d.m().poly([45, 44, 58, 35, 70, 33, 75, 44, 70, 41, 69, 54, 63, 48, 58, 56, 52, 50])
  glass(d, p, membrane, AMBER, 1)
  d.fill(d.m().path([58, 35, 69, 54]).path([58, 35, 58, 56]).path([62, 34, 75, 44]).and(membrane), AMBER[0])
  glass(d, p, d.m().limb([45, 44, 58, 35, 70, 33], [2.4, 2, 1.4]), AMBER, 1)
}

function dragon(d: Painter, p: Painter): void {
  const m = (): Mask => d.m()
  farWing(d, p)

  // tail: a chain of bottle-glass segments curling down the left of the bank, a shard at its end
  const tail = m().limb([34, 58, 27, 64, 25, 73, 29, 80, 24, 85], [3.6, 3, 2.4, 1.8, 1.2])
  glass(d, p, tail, GREEN)
  d.fill(m().path([28, 61, 31, 63]).path([24, 70, 27, 70]).path([26, 78, 29, 77]).and(tail), GREEN[0])
  const shard = m().poly([25, 83, 21, 87, 16, 86, 19, 84])
  glass(d, p, shard, AMBER, 1)

  // body perched on the dome, hind leg and claws gripping it
  glass(d, p, m().ellipse(42, 50, 8.5, 10.5, -18), GREEN)
  glass(d, p, m().ellipse(48, 56, 4.5, 5.5, -20), GREEN, -1)
  for (const [x, y] of [
    [46, 60],
    [50, 61],
    [53, 60],
  ] as const) {
    d.stamp(['o', 'o'], x, y, { o: GREEN[4] })
  }
  // the foreleg reaching down to grip the front of the dome
  const leg = m().limb([40, 50, 36, 55, 37, 60], [2.6, 2.2, 1.9])
  glass(d, p, leg, GREEN, 1)
  for (const x of [35, 37, 39]) d.stamp(['o', 'o'], x, 61, { o: GREEN[4] })
  // the belly: a column of bottle bottoms, lighter rings
  for (const y of [45, 49, 53]) d.fill(m().ellipse(39, y, 3, 1.2, -18), GREEN[3])

  // neck: bottle necks stacked, amber and green, rising to the head at the top right
  const neck = m().limb([44, 44, 50, 35, 55, 28], [4.4, 3.6, 3])
  glass(d, p, neck, AMBER)
  d.fill(m().path([45, 41, 49, 43]).path([48, 36, 52, 38]).path([52, 31, 56, 32]).and(neck), AMBER[1])

  // the head roaring up and right: skull, upper jaw, open lower jaw, bottle-neck horns
  const skull = m().ellipse(58, 25, 5.2, 4.2, -15)
  const upper = m().poly([58, 21, 70, 18.5, 71, 21, 61, 26])
  const lower = m().poly([59, 27, 69, 26, 68, 28, 60, 30])
  for (const [a, b] of [
    [P(56, 22), P(50, 17)],
    [P(59, 21), P(56, 16)],
  ] as const) {
    const horn = m().capsule(a[0], a[1], b[0], b[1], 1.6, 0.9)
    glass(d, p, horn, AMBER, 1)
    d.px(Math.round(b[0]), Math.round(b[1]) - 1, AMBER[4])
  }
  glass(d, p, lower, GREEN, -1)
  glass(d, p, skull.or(upper), GREEN)
  d.fill(m().path([62, 25, 69, 22.5]), GREEN[0])
  // teeth and the glowing eye
  d.stamp(['o.o.o', '.....', 'o.o..'], 63, 23, { o: GREEN[4] })
  d.stamp(['ww', 'wa'], 58, 23, { w: AMBER[4], a: AMBER[3] })
  wing(d, p)
  // hard glints where the moonlight catches the glass
  for (const [x, y] of [
    [37, 42],
    [44, 41],
    [49, 34],
    [57, 22],
    [26, 63],
    [47, 52],
    [66, 36],
    [38, 50],
  ] as const) {
    d.px(x, y, MOON[1])
  }
}

export const glasdrache: CardDef = {
  id: 'emp4-021',
  number: 21,
  name: 'Glasdrache',
  tier: 'ultra',
  kind: 'monster',
  element: 'Flut',
  foil: 'art',
  draw(p) {
    night(p)
    yard(p)
    const d = p.layer()
    dragon(d, p)
    p.subject(d, OUTLINE)
  },
}
