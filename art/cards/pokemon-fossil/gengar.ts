import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, fire, flameMask, hex, noise, pts, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Gengar, a Grail of Fossil. Brief: shadow ghost leaning half out of a cracked full-length mirror,
 * one clawed hand gripping the frame, enormous toothy grin, red eyes glowing, spiky silhouette;
 * abandoned mansion hallway at night, moonlight through a broken window, a candelabra with guttering
 * green flames, shadows that do not match their objects. Full art, 80×112.
 *
 * Composition: the gilded mirror stands against the wall right of the centre. Gengar bursts out of
 * the glass towards the viewer: ears and spikes over the arch, one hand clamped on the frame, the
 * other clawing at the viewer; its lower half is still behind the cracked glass. Moonlight falls in
 * through the broken window at the top left, the candelabra burns green below it, and on the wall
 * right of the mirror Gengar's shadow does something else entirely. The name plate covers rows
 * 5–15, the attack plate rows 88–106.
 */
const WALL = colors('08060f', '120e20', '1e1832', '2c2448')
const MOON = colors('646c94', 'b4bcdc', 'f2f4ff')
const GLASS = hex('1c2440')
const BRASS = colors('34200e', '684418', 'a2742a', 'd8ae4c')
const BODY = colors('1c0c34', '341858', '50287e', '7040a6', '9466cc')
const EYE = colors('6a0818', 'e01c34', 'ff8a8a')
const TEETH = colors('aca4c8', 'f6f0ff')
const GREEN = colors('1e4a1a', '4aa02a', 'a8f048', 'eaffb8')
const OUTLINE = hex('07040c')

const P = (x: number, y: number): Pt => [x, y]

/** The mirror: outer edge of the frame and the glass, an arch on two straight sides. */
const ARCH = P(42, 40)
const frameOuter = (p: Painter): Mask => p.m().rect(21, ARCH[1], 42, 80).disc(ARCH[0], ARCH[1], 21)
const glassOf = (p: Painter): Mask => p.m().rect(25, ARCH[1], 34, 80).disc(ARCH[0], ARCH[1], 17)
/** Where Gengar passes through the glass. */
const WAIST = 61
/** The candle flames: base points. */
const FLAMES = [P(5.5, 55), P(11.5, 51.5), P(17.5, 55)]

function hallway(p: Painter): void {
  p.register(WALL)
  // striped wallpaper, a dark wainscot with a rail, floorboards
  p.dither(
    p.m().rect(0, 0, 80, 72),
    WALL.slice(1),
    (x, y) => 0.25 + (x % 6 < 3 ? 0.25 : 0) + noise(x, y, 2, 5) * 0.2 - y / 400,
    0.4,
  )
  for (let y = 18; y < 70; y += 6) for (let x = 1; x < 80; x += 6) p.set(x + ((y / 6) % 2) * 3, y, WALL[3])
  p.fill(p.m().rect(0, 72, 80, 9), WALL[1])
  p.fill(p.m().rect(0, 72, 80, 1), WALL[3])
  p.fill(p.m().rect(0, 73, 80, 1), WALL[0])
  for (const x of [4, 18, 66]) p.fill(p.m().rect(x, 75, 9, 1).rect(x, 75, 1, 4), WALL[0])
  const floor = p.m().rect(0, 81, 80, 31)
  p.fill(floor, WALL[0])
  for (const [x0, x1] of pts([10, -14, 26, 10, 42, 40, 58, 72, 74, 98]))
    p.fill(p.m().line(x0, 81, x1, 112), WALL[1])
}

/** The broken window at the top left: the moon behind cracked panes, one pane smashed. */
function brokenWindow(p: Painter): void {
  const opening = p.m().rect(5, 26, 13, 18).disc(11.5, 26, 6.5)
  p.fill(opening.grown(1), WALL[0])
  p.shine(true)
  p.dither(opening, [WALL[1], WALL[2], MOON[0]], (x, y) => 1 - Math.hypot(x - 14, y - 24) / 14, 0.8)
  const moon = p.m().disc(14, 24, 3)
  p.fill(moon, MOON[2])
  p.fill(moon.facing([1, 0, 0, 1]), MOON[1])
  // the smashed pane: a jagged hole with the night showing through, the rest of the glass grey
  p.fill(p.m().poly([6, 36, 10, 33, 9, 38, 12, 37, 10, 43, 6, 43]), WALL[0])
  p.shine(false)
  p.fill(p.m().rect(11, 20, 1, 24).rect(5, 33, 13, 1), WALL[0])
}

/** The moonlight falling in through the window: it lifts the wall and the floor one step. */
function moonbeam(p: Painter): void {
  const beam = p.m().poly([6, 44, 18, 44, 46, 112, 24, 112])
  const lit = p.m()
  beam.each((x, y) => {
    if (bayer(x, y) < Math.min(1, (y - 43) / 8) * 0.85) lit.add(x, y)
  })
  p.tone(lit, 1)
  // dust drifting in the light, and the shards of the window on the floor
  p.shine(true)
  const rand = rng(5)
  for (let i = 0; i < 14; i++) {
    const y = 46 + Math.floor(rand() * 40)
    const x = Math.round(6 + ((y - 44) / 68) * 18 + rand() * 12)
    p.px(x, y, MOON[0])
  }
  for (const [x, y] of pts([20, 85, 24, 86, 27, 84, 31, 86])) p.px(x, y, MOON[1]).px(x + 1, y, MOON[0])
  p.shine(false)
}

/** The mirror: gilded frame with a crest on the arch, dark glass with a sheen. */
function mirror(p: Painter): void {
  const outer = frameOuter(p)
  const glass = glassOf(p)
  p.shade(outer.clone().minus(glass), BRASS, { bevel: 2 })
  p.fill(glass.outerEdge().and(outer), BRASS[0])
  // the crest on top of the arch and two rosettes
  const crest = p.m().poly([37, 21, 42, 15.5, 47, 21, 42, 20])
  p.shade(crest, BRASS, { bevel: 1.5 })
  for (const [x, y] of pts([23, 52, 61, 52])) p.shade(p.m().disc(x, y, 1.6), BRASS, { bevel: 1.5 })
  p.shine(true)
  p.dither(glass, [WALL[0], WALL[1], GLASS], (x, y) => 0.4 + (x - 25) / 60 - (y - 23) / 140, 0.8)
  // a sheen across the glass, from the top left
  p.fill(glass.clone().and(p.m().poly([25, 46, 40, 23, 44, 23, 25, 52])), MOON[0])
  p.fill(glass.clone().and(p.m().poly([25, 55, 46, 25, 47, 26, 25, 57])), WALL[3])
  p.shine(false)
}

/** The candelabra on the left: a brass stand with three melting candles and guttering green flames. */
function candelabra(p: Painter): void {
  const stand = p
    .m()
    .rect(10.5, 58, 2, 28)
    .poly([7, 87, 16, 87, 14, 84, 9, 84])
    .limb([5.5, 56, 6.5, 60, 11.5, 61.5, 16.5, 60, 17.5, 56], 0.9)
  for (const [x, y] of FLAMES) stand.rect(x - 1.5, y + 1, 3, 1)
  p.shade(stand, BRASS, { bevel: 1.5 })
  for (const [x, y] of FLAMES) {
    const wax = p.m().rect(x - 1, y - 3, 2, 4)
    p.fill(wax, TEETH[1])
    p.fill(wax.facing([1, 0]), TEETH[0])
    p.px(x - 1, y + 1, TEETH[1])
  }
  // guttering green flames with a sickly halo on the wall around them
  p.shine(true)
  FLAMES.forEach(([x, y], i) => {
    const flame = flameMask(p, x, y - 3, 2.8, 7 + (i % 2) * 2, {
      lean: i === 1 ? 1.5 : -1.5,
      tongues: 0,
      seed: i + 3,
    })
    const halo = flame
      .grown(2)
      .minus(flame)
      .minus(p.m().rect(x - 1, y - 3, 2, 5))
    halo.each((hx, hy) => {
      if ((hx + hy) % 2 === 0) p.set(hx, hy, GREEN[0])
    })
    fire(p, flame, GREEN.slice(1))
  })
  p.shine(false)
}

/**
 * The shadow on the wall right of the mirror does not match: Gengar's hand reaches for the viewer,
 * but its shadow climbs the wall, huge, three long claws spread towards the ceiling.
 */
function wrongShadow(p: Painter): void {
  const hand = p
    .m()
    .limb([66, 70, 68, 56, 70, 45], [3.2, 3.6, 4.2])
    .limb([69, 45, 66, 34, 63.5, 23], [2, 1.6, 0.6])
    .limb([71, 44, 71.5, 31, 72, 19], [2, 1.6, 0.6])
    .limb([72.5, 46, 76, 36, 79, 28], [1.8, 1.4, 0.6])
  const free = (m: Mask): Mask => m.minus(frameOuter(p).grown(1))
  // the candlelight reaches the wall here, so the shadow has something to fall on
  const lit = free(p.m().ellipse(71, 42, 13, 26))
  lit.each((x, y) => {
    const d = Math.hypot((x - 71) / 13, (y - 42) / 26)
    if (bayer(x, y) > d * 1.1 - 0.15) p.set(x, y, d < 0.55 ? WALL[3] : WALL[2])
  })
  p.fill(free(hand), WALL[0])
}

/** Left eye: k = glowing rim, r = red, h = hot core; the right eye is its mirror image. */
const EYE_L = ['kk......', 'krrkk...', '.krhrrk.', '..krrrrk', '...kkkk.']

function ghost(d: Painter): void {
  const m = (): Mask => d.m()

  // ears and the spikes along the head, behind the body
  for (const ear of [
    [25, 43, 23.5, 23, 35, 37],
    [49, 37, 60.5, 23, 59, 43],
  ])
    d.part(m().poly(ear), BODY, { bevel: 3 })
  for (const spike of [
    [32.5, 39, 31, 29, 38.5, 36.5],
    [38.5, 36, 40.5, 28.5, 44, 36],
    [45, 36.5, 52.5, 30, 51, 39],
    [24.5, 50, 16.5, 47, 25, 45],
    [59, 45, 67.5, 47, 59.5, 50],
  ])
    d.part(m().poly(spike), BODY, { bevel: 2, bias: -1 })

  // the round body, its lower half still inside the mirror
  const body = m().ellipse(42, 52, 18, 15.5)
  d.part(body, BODY, { bevel: 11 })
  d.part(m().ellipse(34, 67, 5, 3).ellipse(50, 67, 5, 3), BODY, { bias: -1, bevel: 2 })

  // the arm on the left clamps three claws round the frame
  d.part(m().limb([27, 56, 23.5, 57], [3.6, 3.2]), BODY)
  for (const [x, y] of pts([20.5, 53.5, 19.5, 57, 20.5, 60.5]))
    d.part(m().limb([23, y + 0.5, x, y], [1.6, 1]), BODY)

  // the arm on the right reaches out at the viewer, claws spread
  d.part(m().limb([57, 57, 62, 62, 64, 67.5], [3.6, 3.2, 3]), BODY)
  for (const [x, y] of pts([61, 73.5, 65, 74.5, 68.5, 71.5]))
    d.part(m().limb([64, 68.5, x, y], [1.6, 0.8]), BODY)

  // the grin: a wide crescent of teeth, upper and lower rows meeting in a zigzag
  const grin = m().poly([
    27, 51.5, 33, 56, 42, 58, 51, 56, 57, 51.5, 54, 58, 48, 62.5, 42, 63.5, 36, 62.5, 30, 58,
  ])
  d.contact(grin)
  d.fill(grin, TEETH[1])
  d.fill(grin.facing([0, 1]), TEETH[0])
  const bite = [
    29, 53.5, 32, 56, 34, 55.5, 36, 58, 38, 57.5, 40, 60, 42, 59.5, 44, 60, 46, 57.5, 48, 58, 50, 55.5, 52,
    56, 55, 53.5,
  ]
  d.fill(m().path(bite).and(grin), BODY[0])
  for (const x of [35, 39, 45, 49]) d.fill(m().rect(x, 59, 1, 3).and(grin), TEETH[0])

  // the glowing eyes under a heavy brow
  d.stamp(EYE_L, 28, 43, { k: EYE[0], r: EYE[1], h: EYE[2] })
  d.stamp(EYE_L, 48, 43, { k: EYE[0], r: EYE[1], h: EYE[2] }, true)

  // inside the mirror the body is two steps darker
  d.tone(d.mask().and(m().rect(0, WAIST, 80, 40)), -1)
  // moonlight from the top left catches the rim
  d.tone(
    d
      .mask()
      .facing([-1, 0, 0, -1])
      .and(m().rect(0, 0, 50, 48)),
    1,
  )
}

/** The cracks: jagged lines from where Gengar broke through, across the glass and its hidden half. */
function cracks(p: Painter): void {
  const glass = glassOf(p).minus(p.subjectMask.clone().minus(p.m().rect(0, WAIST + 1, 80, 40)))
  const rand = rng(17)
  const centre = P(42, WAIST + 3)
  const web = p.m()
  for (const [x1, y1] of pts([24, 64, 25, 76, 31, 90, 46, 90, 56, 86, 60, 72, 59, 62])) {
    const line: Pt[] = [centre]
    for (let k = 1; k <= 4; k++) {
      const t = k / 4
      const jag = k === 4 ? 0 : (rand() - 0.5) * 3.5
      line.push(P(centre[0] + (x1 - centre[0]) * t + jag, centre[1] + (y1 - centre[1]) * t + jag * 0.6))
    }
    web.path(line)
    const [bx, by] = line[2] ?? centre
    if (rand() < 0.6) web.path([P(bx, by), P(bx + (rand() - 0.5) * 8, by + 3 + rand() * 4)])
  }
  // one ring of cracks round the hole
  const ring: Pt[] = []
  for (let a = 0; a <= 12; a++) {
    const t = Math.PI * (a / 12)
    const r = 9 + (rand() - 0.5) * 2.5
    ring.push(P(centre[0] + Math.cos(t) * r * 1.4, centre[1] + Math.sin(t) * r))
  }
  web.path(ring)
  p.shine(true)
  p.fill(web.and(glass), WALL[3])
  p.fill(web.and(glass).and(p.m().disc(centre[0], centre[1], 13)), MOON[0])
  p.shine(false)
}

export const gengar: CardDef = {
  id: 'pkm-fossil-074',
  number: 74,
  name: 'Gengar',
  tier: 'grail',
  kind: 'pokemon',
  type: 'Psycho',
  hp: 80,
  attacks: [
    { name: 'Finsterblick', cost: ['Psycho', 'Psycho', 'Psycho'], damage: '30' },
    { name: 'Fluch', cost: [] },
  ],
  // moonlight, the mirror glass, its cracks and the green flames shine; Gengar and the hall stay matt
  foil: 'painted',
  draw(p) {
    hallway(p)
    brokenWindow(p)
    wrongShadow(p)
    mirror(p)
    moonbeam(p)
    candelabra(p)
    const d = p.layer()
    ghost(d)
    p.subject(d, OUTLINE)
    cracks(p)
  },
}
