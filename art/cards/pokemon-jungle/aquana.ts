import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, pts, rays, rng, stars, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Aquana, a Grail of Dschungel. Brief: water fox on a mossy stone in a moonlit jungle lagoon, head
 * raised to the moon, frill collar spread, fin tail curling behind and melting into the water;
 * waterfall, fireflies, droplets hanging in the air, the moon's reflection rippling. Full art, 80×112.
 *
 * Composition: a big full moon hangs at the top left, where the house light comes from, and Aquana
 * stands on a mossy stone in the lagoon, three-quarter view to the left, its raised head set against
 * the moon so the backlight rims its silhouette. The tail arches up behind and its fin melts into the
 * water at the lower right, in front of the waterfall; the moon's reflection ripples on the left.
 * The name plate covers rows 5–15, the attack plate rows 88–106.
 */
const NIGHT = colors('070a22', '0e1438', '18224e', '263668', '3a5288')
const MOON = colors('8fa8d8', 'd6e2f6', 'ffffff')
const JUNGLE = colors('03070f', '081a22', '10302e', '1c4a38')
const MOSS = colors('2c6438', '5a9448')
const BODY = colors('173c78', '2266a8', '3a94d0', '66c2ec', 'b4f0ff')
const FRILL = colors('5e6f9a', 'a9b9d2', 'e8eadc', 'fffff2')
const GOLD = colors('b8862e', 'f2cf62', 'fff2b4')
const OUTLINE = hex('050816')

const P = (x: number, y: number): Pt => [x, y]
const MOON_AT = P(20, 28)
const MOON_R = 10.5
/** The far shore of the lagoon; the water starts below it. */
const SHORE = 60

function sky(p: Painter): void {
  const [mx, my] = MOON_AT
  p.register(NIGHT)
  p.shine(true)
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - mx, (y - my) * 1.1) / 40)
      return 0.04 + Math.min(1, y / SHORE) * 0.25 + glow * glow * 1.05
    },
    0.7,
  )
  // a faint crown of rays round the moon
  const crown = rays(p, mx, my, 11, 0.02).and(p.m().disc(mx, my, 30))
  crown.each((x, y) => {
    if (bayer(x, y) < 1.3 - Math.hypot(x - mx, y - my) / 26) p.tone(p.m().add(x, y), 1)
  })
  stars(p, rng(5), 12, [MOON[0], MOON[1]], { x: 42, y: 17, w: 22, h: 14 })
  // the full moon, big behind Aquana's head, with a soft rim and grey seas
  const moon = p.m().disc(mx, my, MOON_R)
  moon
    .grown(2)
    .minus(moon)
    .each((x, y) => {
      if ((x + y) % 2 === 0 || moon.grown(1).has(x, y)) p.set(x, y, MOON[0])
    })
  p.fill(moon, MOON[2])
  const seas = p
    .m()
    .blob(mx - 4, my - 3, 3.5, 2.5, 3, 0.3)
    .blob(mx + 3.5, my + 1, 3, 2.2, 5, 0.3)
    .blob(mx - 1, my + 5, 2.5, 1.6, 7, 0.3)
    .blob(mx + 4, my - 5.5, 1.5, 1.2, 9, 0.2)
  p.fill(seas.and(moon.shrunk(1)), MOON[1])
  p.fill(
    moon.facing([1, 0, 0, 1]).or(
      moon
        .shrunk(1)
        .facing([1, 0, 0, 1])
        .and(p.m().rect(mx + 4, my + 4, 20, 20)),
    ),
    MOON[1],
  )
  p.shine(false)
}

function shore(p: Painter): void {
  // a tall cliff on the right, crowned with jungle
  const cliff = p.m().poly([52, SHORE, 54, 46, 56, 34, 60, 25, 66, 21, 80, 17, 80, SHORE])
  p.dither(cliff, [JUNGLE[0], JUNGLE[1], NIGHT[2]], (x, y) => noise(x * 1.5, y, 3, 4) * 0.9, 0.4)
  for (const [x, y, w] of [
    [55, 40, 4],
    [54, 50, 4],
    [75, 31, 4],
    [76, 44, 4],
  ] as const)
    p.fill(p.m().rect(x, y, w, 1), NIGHT[3])
  p.fill(cliff.facing([-1, 0]), NIGHT[3])

  // waterfall: a curtain of silver streaks pouring out of the leaves, spreading into spray below
  p.shine(true)
  const top = 22
  for (let y = top; y < SHORE; y++) {
    const k = (y - top) / (SHORE - top)
    const left = Math.round(60 - k * 2.5 + noise(1, y, 3, 2) - 0.5)
    const right = Math.round(72 + k * 2 + noise(2, y, 3, 2) - 0.5)
    const mid = (left + right) / 2
    for (let x = left; x <= right; x++) {
      const n =
        noise(x * 1.7 + Math.sin(y * 0.4) * 0.6, y * 0.16, 8, 1.3) * 0.8 +
        (1 - Math.abs(x - mid) / ((right - left) / 2 + 1)) * 0.3
      p.set(x, y, n > 0.82 - k * 0.1 ? MOON[1] : n > 0.55 ? MOON[0] : n > 0.32 ? NIGHT[4] : NIGHT[3])
    }
  }
  const spray = p
    .m()
    .blob(66, SHORE - 2, 13, 4.5, 2, 0.35)
    .blob(55, SHORE - 0.5, 5, 2.2, 6, 0.3)
  p.dither(
    spray,
    [NIGHT[4], MOON[0], MOON[1], MOON[2]],
    (x, y) => 1.15 - Math.hypot(x - 66, (y - SHORE + 1) * 2.2) / 13,
    0.7,
  )
  p.shine(false)
  // jungle on the cliff top, hanging over the head of the fall
  const crown = p.m()
  for (const [x, y, r] of [
    [58, 28, 3.5],
    [62, 24, 4.5],
    [67, 22.5, 4.5],
    [72, 22, 4.5],
    [77, 20, 4.5],
  ] as const)
    crown.blob(x, y, r * 1.2, r * 0.8, x * 3, 0.3)
  crown.limb([61, 26, 61.5, 31, 61, 35], [1.4, 1, 0.6]).limb([70, 24, 71, 29, 70.5, 32], [1.2, 0.8, 0.5])
  p.fill(crown, JUNGLE[1])
  p.fill(crown.facing([-1, 0, 0, -1]), JUNGLE[3])

  // far shore: low jungle, its crowns caught by the moonlight; a tall tree on the left
  const bush = p.m()
  for (const [x, y, r] of [
    [3, 55, 6],
    [12, 54, 5],
    [21, 56, 5],
    [29, 55, 6],
    [38, 56, 5],
    [46, 55, 5],
    [53, 56, 4],
  ] as const)
    bush.blob(x, y, r, r * 0.7, x, 0.25)
  bush.rect(0, 56, 58, 4)
  p.fill(bush, JUNGLE[1])
  p.fill(bush.facing([-1, 0, 0, -1]), JUNGLE[2])
  const tree = p
    .m()
    .poly([0, 56, 0, 30, 2, 30, 3.5, 56])
    .blob(1.5, 32, 4, 5, 3, 0.3)
    .blob(3.5, 40, 4, 3.5, 8, 0.3)
  p.fill(tree, JUNGLE[0])
  p.fill(tree.facing([1, 0, 0, -1]), JUNGLE[2])
}

function water(p: Painter): void {
  p.shine(true)
  const lake = p.m().rect(0, SHORE, 80, p.h - SHORE)
  p.dither(
    lake,
    NIGHT.slice(0, 4),
    (x, y) => 0.4 + (y - SHORE) / 80 + 0.2 * Math.sin(x * 0.4 + y * 1.4) * Math.min(1, (y - SHORE) / 6),
    0.35,
  )
  // the shore reflected as a dark band, mist lying on the water in front of it
  p.fill(p.m().rect(0, SHORE, 60, 2), JUNGLE[1])
  p.dither(p.m().rect(0, SHORE - 2, 62, 4), [NIGHT[3], NIGHT[4]], (x, y) => noise(x, y, 6, 5) - 0.15, 0.9)

  // the moon's reflection: broken ripples that widen towards the viewer, silver in the middle,
  // a warm gold glint at their ends
  const rand = rng(12)
  for (let y = SHORE + 3; y < 88; y += rand() < 0.3 ? 3 : 2) {
    const k = (y - SHORE) / 28
    const centre = MOON_AT[0] - 4 + Math.round(Math.sin(y * 1.9) * (0.6 + k * 1.4))
    const half = Math.round(0.5 + k * 2.5 + rand() * 1.5)
    const gap = rand() < 0.6 ? centre + Math.round(rand() * 2 - 1) : -1
    for (let x = centre - half; x <= centre + half; x++)
      if (x !== gap) p.set(x, y, Math.abs(x - centre) < 2 && y < SHORE + 10 ? MOON[1] : MOON[0])
    if (rand() < 0.6) p.px(centre + half + 2, y, GOLD[1])
    if (rand() < 0.4) p.px(centre - half - 2, y, GOLD[0])
  }
  p.shine(false)
}

/** The mossy stone Aquana stands on, rising out of the water. */
function stone(p: Painter): void {
  const rock = p.m().blob(44, 86, 24, 9.5, 4, 0.1)
  p.shade(rock, NIGHT.slice(1), { bevel: 5 })
  const cap = rock.clone().and(p.m().blob(43, 79, 24, 4.5, 7, 0.35))
  p.shade(cap, [JUNGLE[2], JUNGLE[3], MOSS[0], MOSS[1]], { bevel: 3 })
  for (const [x, y] of pts([24, 82, 29, 83, 56, 83, 62, 82])) p.fill(p.m().rect(x, y, 1, 2), MOSS[0])
  // ripples where the stone meets the water
  p.shine(true)
  const ring = p
    .m()
    .ellipse(44, 90, 27, 3.5)
    .minus(p.m().ellipse(44, 90, 25.5, 2.5))
    .minus(rock)
  ring.each((x, y) => p.set(x, y, x % 7 < 2 ? GOLD[1] : MOON[0]))
  p.shine(false)
}

/** Navy stripe along the top edge of a part. */
function dorsal(d: Painter, part: Mask, depth = 2): void {
  d.fill(part.clone().minus(part.moved(0, depth)), BODY[1])
}

/** Aquana is drawn at this scale round its paws, moved left so it sits right of the centre. */
const SIZE = { ox: 48, oy: 78, scale: 1.12, dx: -5, dy: 0 }
const K = SIZE.scale
/** A point of the creature in picture coordinates. */
const at = (x: number, y: number): Pt => xf([P(x, y)], SIZE)[0] ?? P(x, y)

function vaporeon(d: Painter): void {
  const m = (): Mask => d.m()
  const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): Mask => {
    const [x, y] = at(cx, cy)
    return m().ellipse(x, y, rx * K, ry * K, rot)
  }
  const lim = (list: readonly number[], radii: readonly number[]): Mask =>
    m().limb(
      xf(list, SIZE),
      radii.map((r) => r * K),
    )
  const line = (list: readonly number[]): Mask => m().path(xf(list, SIZE))

  // tail: up from the rump in an arch behind the back, down again to the fin above the water
  const tail = lim(
    [56, 60, 62.5, 54.5, 68.5, 54, 71.5, 59.5, 70, 66, 67.3, 71],
    [4.6, 3.9, 3.5, 3.2, 2.8, 2.4],
  )
  d.part(tail, BODY)
  dorsal(d, tail)
  // the fin: two broad lobes forking from the end of the tail, with navy rays
  const lobes = ell(63, 76, 5.5, 2.4, -32)
    .or(ell(71.5, 76, 5.5, 2.4, 32))
    .or(ell(67.2, 73, 3, 2.6))
  d.part(lobes, BODY, { bevel: 2.5 })
  for (const ray of [
    [66, 73, 60, 78],
    [66.5, 74, 63.5, 77.5],
    [68, 74, 71, 77.5],
    [68.5, 73, 74.5, 78],
  ])
    d.fill(line(ray).and(lobes.shrunk(1)), BODY[1])

  // far legs, a step darker
  d.part(lim([33, 66, 32, 72, 31.5, 77], [3.2, 2.7, 2.5]), BODY, { bias: -1 })
  d.part(ell(30.5, 78, 3, 1.5), BODY, { bias: -1, bevel: 1.5 })
  d.part(lim([52, 66, 54, 72, 52, 77], [4, 2.7, 2.5]), BODY, { bias: -1 })
  d.part(ell(51.5, 78, 3, 1.5), BODY, { bias: -1, bevel: 1.5 })

  // body: a sleek back from the shoulders to the rump
  const torso = lim([37, 60, 47, 62.5, 56, 61], [7, 6.2, 6.6])
  d.part(torso, BODY)
  dorsal(d, torso)

  // near legs
  d.part(lim([57, 63, 60, 71, 57.5, 77], [5.4, 3, 2.7]), BODY, { line: 'shadow' })
  d.part(ell(57, 78, 3.4, 1.7), BODY, { bevel: 1.5 })
  d.part(lim([38, 65, 37, 72, 36.5, 77], [3.6, 2.9, 2.7]), BODY, { line: 'shadow' })
  d.part(ell(35.5, 78, 3.4, 1.7), BODY, { bevel: 1.5 })

  // neck rising to the raised head
  d.part(lim([37, 57, 33, 49, 30.5, 44], [5.6, 5, 4.6]), BODY)

  // frill: a ruff of rounded lobes spread round the base of the neck, three of them on the chest
  const ruff = ell(35.5, 54.5, 9, 4.6, -25)
  for (const [x, y, r] of [
    [27.5, 55, 3.4],
    [32, 58.5, 3.6],
    [38, 58.5, 3.6],
    [43, 54.5, 3.4],
  ] as const)
    ruff.or(ell(x, y, r, r))
  d.part(ruff, FRILL, { bevel: 4 })
  for (const crease of [
    [30, 54, 29.5, 58],
    [35, 55, 35, 61],
    [41, 54, 41.5, 58],
  ])
    d.fill(line(crease).and(ruff.shrunk(1)), FRILL[1])

  // head raised to the moon, drawn facing left round its centre and tilted up
  const T = { ox: 0, oy: 0, rot: 24, scale: K, dx: at(29, 42)[0], dy: at(29, 42)[1] }
  const local = (x: number, y: number): Pt => xf([P(x, y)], T)[0] ?? P(x, y)
  const oval = (x: number, y: number, rx: number, ry: number): Mask => {
    const [cx, cy] = local(x, y)
    return m().ellipse(cx, cy, rx * K, ry * K, T.rot)
  }
  // the fin ear on the near side fans out backwards from behind the eye, three points and two rays
  const ear = m().poly(
    xf([5, -5, 10.5, -8, 15.5, -10.5, 13, -5, 17.5, -3.5, 12.5, -1.5, 14.5, 1.5, 5, 1.5], T),
  )
  d.part(ear, FRILL, { bevel: 3 })
  d.fill(
    m()
      .path(xf([6, -3, 13.5, -8], T))
      .path(xf([6, -1, 15, -3.5], T))
      .and(ear.shrunk(1)),
    FRILL[1],
  )
  // skull, short muzzle
  d.part(oval(1, 0, 8, 7).or(oval(-6.5, 1.8, 4.2, 3.3)), BODY)
  // the navy crest rises from the brow and sweeps back like a dorsal fin
  const crest = m().poly(xf([-4.5, -5.5, -1, -8.5, 4, -10, 10, -10.5, 6, -7, 5, -5.5], T))
  d.part(crest, [OUTLINE, BODY[0], BODY[1], BODY[2]], { bevel: 2 })
  // eye, nose and mouth
  const [ex, ey] = local(-3, -1)
  d.stamp(['.kkk', 'kwkk', 'kkkk', '.kk.'], Math.round(ex - 2), Math.round(ey - 2), {
    k: OUTLINE,
    w: FRILL[3],
  })
  const [nx, ny] = local(-10.2, 0.6)
  d.px(Math.round(nx), Math.round(ny), BODY[0])
  d.fill(m().path(xf([-9.5, 3.2, -6, 4.2], T)), BODY[0])

  // backlight: the rim that faces the moon catches its light
  const rim = d
    .mask()
    .facing([-1, 0, 0, -1])
    .and(m().disc(MOON_AT[0], MOON_AT[1], 30))
  d.tone(rim, 1)
}

/** Fireflies: a warm dot, the bigger ones with a faint glow. */
function fireflies(p: Painter): void {
  p.shine(true)
  for (const [x, y] of pts([7, 47, 13, 55, 6, 36, 10, 66, 24, 64, 49, 34, 52, 45, 77, 46, 6, 78])) {
    if (p.subjectMask.has(x, y)) continue
    p.px(x, y, GOLD[2])
    if ((x + y) % 3 === 0)
      p.px(x - 1, y, GOLD[0])
        .px(x + 1, y, GOLD[0])
        .px(x, y - 1, GOLD[0])
        .px(x, y + 1, GOLD[0])
  }
  p.shine(false)
}

/** Droplets hanging in the air round the head and above the tail. */
function droplets(p: Painter): void {
  p.shine(true)
  for (const [x, y] of pts([13, 44, 9, 52, 15, 37, 40, 22, 47, 30, 52, 44, 61, 70, 77, 64, 64, 79])) {
    if (p.subjectMask.has(x, y) || p.subjectMask.has(x, y + 1)) continue
    p.px(x, y, MOON[2])
    p.px(x, y + 1, BODY[3])
  }
  p.shine(false)
}

/** The tips of the tail fin melt into the lagoon: water eats into them, ripples spread below. */
function melt(p: Painter): void {
  const [fx, fy] = at(67.3, 77)
  p.shine(true)
  const tips = p
    .m()
    .rect(fx - 12, fy, 24, 5)
    .and(p.subjectMask)
  tips.each((x, y) => {
    if (bayer(x, y) < (y - fy + 0.5) / 3.5) p.set(x, y, y % 2 === 0 ? BODY[3] : NIGHT[3])
  })
  for (const [dx, dy] of pts([-7, 4, 8, 4, -4, 6, 5, 6]))
    p.px(Math.round(fx + dx), Math.round(fy + dy), BODY[3])
  for (const [rx, ry] of pts([9, 2, 12.5, 3])) {
    const ring = p
      .m()
      .ellipse(fx, fy + 7.5, rx, ry)
      .minus(p.m().ellipse(fx, fy + 7.5, rx - 1.2, ry - 0.8))
    p.fill(ring.minus(p.subjectMask), rx < 10 ? MOON[1] : MOON[0])
  }
  p.shine(false)
}

/** Big jungle leaves in the foreground: hanging into the top right, rising at the bottom left. */
function leaves(p: Painter): void {
  const blade = p.m()
  for (const spine of [
    [80, 18, 74, 22, 70, 29, 69.5, 35],
    [78, 16, 79, 25, 77, 33],
    [0, 88, 3, 79, 8, 72, 11, 69],
    [0, 80, 2, 73, 1, 66],
  ])
    blade.limb(spine, [0.6, 2.6, 2.2, 0.4])
  p.fill(blade, JUNGLE[0])
  p.fill(blade.facing([-1, 0, 0, -1]), JUNGLE[2])
}

export const aquana: CardDef = {
  id: 'pkm-jungle-077',
  number: 77,
  name: 'Aquana',
  tier: 'grail',
  kind: 'pokemon',
  type: 'Wasser',
  hp: 80,
  attacks: [
    { name: 'Aquaknarre', cost: ['Wasser', 'Wasser', 'Farblos'], damage: '30+' },
    { name: 'Ruckzuckhieb', cost: ['Farblos', 'Farblos'], damage: '10+' },
  ],
  // sky, moon, waterfall, water, fireflies and droplets shine; Aquana, the stone and the jungle stay matt
  foil: 'painted',
  draw(p) {
    sky(p)
    shore(p)
    water(p)
    stone(p)
    const d = p.layer()
    vaporeon(d)
    p.subject(d, OUTLINE)
    melt(p)
    leaves(p)
    fireflies(p)
    droplets(p)
  },
}
