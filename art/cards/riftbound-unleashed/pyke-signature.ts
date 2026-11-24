import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Bloodharbor Ripper (Signature), Ultra. Our own drowned harpooner: sea-green skin, a dark cowl with a
 * rust-red rag over the mouth, eyes burning teal in the shadow, chains and kelp hanging off a rotten
 * coat. He rises waist-deep out of black harbour water at night, a barbed harpoon raised high, in
 * front of a pale moon; a wrecked ship lists in the mist behind, its lanterns still swinging.
 * Full art, 80×112.
 *
 * Composition: square to the viewer in the middle, the moon behind his head and shoulders; the
 * harpoon is raised over his head along the top of the moon, ready to throw, the wreck and its
 * lanterns hold the left side. The water line runs at row 72. The frame's plates cover rows 0–14 and 90–112.
 */
const NIGHT = colors('040a0c', '0a1a1e', '12292c', '1e3c3c')
const MOON = colors('3a5a54', '6e9a84', 'a8c8b0', 'e0f0e0')
const WRECK = colors('0e1416', '1a1614', '2c241e')
const LAMP = colors('6a1e10', 'b0401a', 'f08a2a', 'ffd47a')
const SKIN = colors('162a2c', '2a4a48', '467066', '74a08c')
const CLOTH = colors('0e1416', '1e2a2c', '34443e')
const RAG = colors('4a1410', '8e2e1e', 'b0401a')
const IRON = colors('2a2e34', '5a6470', '9aa6b2')
const KELP = colors('162a2c', '1e4a2a', '3a6a32')
const GLOW = colors('2ac0b0', '7af0e0', 'e0fff8')
const OUTLINE = hex('020405')

const P = (x: number, y: number): Pt => [x, y]

/** The harpoon, raised over his head: from the butt on the right through the fist to the barbed head. */
const BUTT = P(68.5, 26)
const TIP = P(27, 14.5)
const spear = (t: number, off = 0): [number, number] => {
  const len = Math.hypot(TIP[0] - BUTT[0], TIP[1] - BUTT[1])
  const [ux, uy] = [(TIP[0] - BUTT[0]) / len, (TIP[1] - BUTT[1]) / len]
  return [BUTT[0] + ux * len * t - uy * off, BUTT[1] + uy * len * t + ux * off]
}

function harbour(p: Painter): void {
  // night sky with drifting mist, the moon low behind the harpooner
  p.shine(true)
  p.dither(p.m().rect(0, 0, 80, 72), NIGHT, (x, y) => {
    const halo = Math.max(0, 1 - Math.hypot(x - 41, y - 36) / 34) * 0.7
    return 0.15 + halo + noise(x, y, 2, 9) * 0.25 - 0.1
  }, 0.75)
  const moon = p.m().disc(41, 36, 17)
  p.dither(moon, MOON, (x, y) => 0.95 - Math.hypot(x - 36, y - 30) / 30 + noise(x, y, 9, 4) * 0.25, 0.6)
  p.shine(false)

  // mist banks across the moon and over the water
  const mist = p.m()
  for (const [x, y, rx, ry, seed] of [
    [18, 52, 16, 2.5, 1],
    [62, 46, 18, 2.2, 2],
    [40, 64, 26, 3, 3],
  ] as const) {
    mist.blob(x, y, rx, ry, seed, 0.35)
  }
  p.dither(mist, [NIGHT[2], NIGHT[3], MOON[0]], (x, y) => 0.35 + noise(x, y, 5, 4) * 0.6, 0.7)

  // the wreck listing on the left: a dark hull, a broken mast, a torn sail and its yard
  const hull = p.m().poly([-2, 58, 8, 61, 22, 66, 30, 72, -2, 72])
  const mast = p.m().limb([10, 62, 12, 40, 15, 22], [1.6, 1.3, 1])
  const yard = p.m().limb([2, 31, 26, 37], 0.9)
  const sail = p.m().poly([5, 32.5, 23, 37, 21, 45, 17, 43, 14, 49, 9, 44, 5, 46])
  p.fill(sail, NIGHT[2])
  p.fill(sail.facing([0, 1]), NIGHT[3])
  p.fill(hull.or(mast).or(yard), WRECK[1])
  p.fill(hull.facing([0, -1]), WRECK[2])
  for (const x of [4, 10, 16, 22]) p.fill(p.m().path([x, 62 + x * 0.3, x + 1, 72]).and(hull), WRECK[0])

  // a pier of old posts on the right
  for (const [x, top] of [
    [64, 56],
    [71, 54],
    [78, 57],
  ] as const) {
    const post = p.m().rect(x, top, 3, 72 - top)
    p.fill(post, WRECK[1])
    p.fill(post.facing([-1, 0]), WRECK[2])
  }
  p.fill(p.m().rect(60, 57, 20, 2), WRECK[1])

  // black water: long swells, the moon's broken reflection, the lanterns' red in it
  const water = p.m().rect(0, 72, 80, 40)
  p.dither(water, [NIGHT[0], NIGHT[1], NIGHT[2]], (x, y) => 0.55 - (y - 72) / 40 + noise(x, y, 4, 6) * 0.3, 0.6)
  const rand = rng(11)
  for (let y = 74; y < 92; y += 2) {
    for (let i = 0; i < 3; i++) {
      const w = 2 + Math.floor(rand() * 6)
      const x = Math.floor(rand() * 76)
      p.fill(p.m().rect(x, y, w, 1), NIGHT[2])
    }
  }
  p.shine(true)
  for (let y = 73; y < 90; y += 2) {
    const w = 10 - (y - 73) * 0.35
    const x = 41 - w / 2 + (rand() - 0.5) * 4
    p.fill(p.m().rect(x, y, Math.max(2, w * (0.5 + rand() * 0.5)), 1), y < 80 ? MOON[2] : MOON[1])
  }
  p.shine(false)
  for (const [x, y, w] of [
    [12, 76, 4],
    [10, 80, 6],
    [21, 78, 3],
    [20, 83, 5],
  ] as const) {
    p.fill(p.m().rect(x, y, w, 1), LAMP[1])
  }
}

/** Two lanterns swinging on chains from the wreck's yard, their light glowing round them. */
function lanterns(p: Painter): void {
  for (const [x, y, top, tilt] of [
    [11, 44, 33, 1],
    [21.5, 47, 36, -1],
  ] as const) {
    p.fill(p.m().line(x - tilt * 1.5, top, x, y - 3), IRON[0])
    p.shine(true)
    p.m()
      .disc(x, y, 5)
      .minus(p.m().disc(x, y, 3.2))
      .each((gx, gy) => {
        if (bayer(gx, gy) < 0.45) p.set(gx, gy, LAMP[0])
      })
    p.fill(p.m().ellipse(x, y, 2, 2.6), LAMP[2])
    p.fill(p.m().ellipse(x, y + 0.5, 1, 1.4), LAMP[3])
    p.shine(false)
    p.fill(p.m().rect(x - 2, y - 3, 4, 1).rect(x - 2, y + 2.5, 4, 1), WRECK[0])
  }
}

function harpooner(d: Painter): void {
  const m = (): Mask => d.m()

  // shoulders hunched forward, a rotten coat hanging off them in rags
  const coat = m().poly([
    24.5, 44, 32, 39.5, 48, 39.5, 55.5, 44, 53, 54, 49, 63, 49.5, 74, 46, 71, 43, 75, 39, 71.5, 35.5, 75, 32.5, 71, 30.5, 74, 31, 63, 27, 54,
  ])
  d.part(coat, CLOTH, { bevel: 6 })
  // the bare chest in the gap of the coat, ribs showing
  const chest = m().poly([35, 41, 45, 41, 44, 56, 40, 61, 36, 56])
  d.part(chest, SKIN, { bevel: 3 })
  for (const y of [47, 50, 53]) d.fill(m().path([36.5, y, 39, y + 1]).path([41, y + 1, 43.5, y]).and(chest.shrunk(1)), SKIN[1])
  // a rust-red sash knotted on the hip, its end hanging into the water
  d.part(m().poly([31, 60, 49, 57.5, 49.5, 61.5, 31.5, 64]), RAG, { bevel: 1.5 })
  d.part(m().poly([45, 60, 48.5, 60, 50, 70, 47.5, 72, 46, 66]), RAG, { bevel: 1.5 })
  d.part(m().disc(46.5, 60, 2), RAG, { bevel: 1.5 })
  const chain = m().path([26, 45, 33, 50, 40, 56, 47, 53, 54, 46])
  d.fill(chain.grown(1).and(coat.or(chest)), IRON[0])
  d.fill(chain, IRON[2])
  chain.each((x, y) => {
    if ((x + y) % 3 === 0) d.set(x, y, IRON[1])
  })

  // the near arm hanging down into the water, a chain wound round the fist
  d.part(m().limb([28, 45, 23, 56, 22, 67], [3.6, 3, 2.6]), CLOTH)
  d.part(m().limb([22.5, 62, 22, 69], 2.4), SKIN)
  d.part(m().ellipse(22, 69.5, 2.6, 2.4), SKIN, { bevel: 2 })
  d.fill(m().path([19.5, 68, 24.5, 67]).path([19.5, 70.5, 24.5, 69.5]), IRON[1])

  // the far arm thrust up, the fist round the harpoon
  d.part(m().limb([52, 45, 58.5, 35, 55.5, 25], [3.6, 3, 2.6]), CLOTH)
  d.part(m().limb([57.5, 30, 55, 23.5], 2.4), SKIN)

  // the harpoon: an iron-bound shaft, a barbed head, a rope coiling off the butt
  const shaft = m().limb([...spear(-0.02), ...spear(0.76)], 1.1)
  d.part(shaft, [WRECK[2], MOON[0], MOON[1]], { bevel: 1 })
  for (const t of [0.04, 0.58]) d.part(m().disc(...spear(t), 1.5), IRON, { bevel: 1 })
  const head = m().poly([...spear(0.74, -1.8), ...spear(1.02), ...spear(0.74, 1.8)])
  head.poly([...spear(0.83, 1.2), ...spear(0.75, 4.6), ...spear(0.9, 1.2)])
  head.poly([...spear(0.83, -1.2), ...spear(0.75, -4.6), ...spear(0.9, -1.2)])
  d.part(head, [IRON[0], IRON[1], IRON[2], MOON[3]], { bevel: 1.5 })
  d.fill(m().path([...spear(0.76), ...spear(0.98)]).and(head), MOON[3])
  d.part(m().ellipse(54.5, 21.5, 2.6, 2.5), SKIN, { bevel: 2 })

  // the cowl: a dark hood with a ragged hem over the shoulders, the face in its shadow
  const hood = m()
    .ellipse(40, 31, 8, 8.5)
    .poly([31, 33, 33, 41, 40, 43.5, 47, 41, 49, 33, 46, 27, 34, 27])
  d.part(hood, CLOTH, { bevel: 4 })
  const face = m().ellipse(40, 33, 4.6, 5)
  d.fill(face, NIGHT[0])
  d.part(m().poly([35.5, 33, 44.5, 33, 44, 38, 40, 40, 36, 38]), RAG, { bevel: 2 })
  d.fill(m().path([36, 36, 44, 35]).and(face), RAG[0])
  d.part(m().poly([36, 29.5, 44, 29.5, 43.5, 32, 36.5, 32]), SKIN.slice(0, 2), { bevel: 1 })

  // kelp hanging off the shoulders and the arms
  for (const [line, radii] of [
    [[29, 43, 27.5, 50, 29.5, 56, 28, 61], [1.4, 1.2, 1, 0.6]],
    [[50, 42, 52, 49, 50.5, 54], [1.3, 1, 0.6]],
    [[56, 38, 59, 43, 58, 47], [1.2, 0.9, 0.5]],
  ] as const) {
    d.part(m().limb(line, radii), KELP, { bevel: 1 })
  }

  // the moon behind him rims his shoulders and the top of the hood
  d.tone(d.mask().facing([0, -1, 1, 0]).minus(face).minus(head), 1)
}

/** The burning eyes, a ring of water round his waist, drops falling off the arm. */
function finish(p: Painter): void {
  p.shine(true)
  p.stamp(['g.....g', 'wg...gw', 'g.....g'], 37, 29, { g: GLOW[0], w: GLOW[2] })
  p.px(38, 30, GLOW[1]).px(42, 30, GLOW[1])
  p.shine(false)
  const ring = p.m().ellipse(40, 73, 17, 2.6).minus(p.m().ellipse(40, 72.2, 14.5, 1.6))
  p.fill(ring, MOON[1])
  p.fill(ring.clone().and(p.m().rect(0, 74, 80, 2)), NIGHT[3])
  for (const [x, y] of [
    [24, 76],
    [57, 76],
    [21, 74],
  ] as const) {
    p.px(x, y, MOON[2])
  }
}

export const pykeSignature: CardDef = {
  id: 'rb-unl-081',
  number: 81,
  name: 'Pyke, Bloodharbor Ripper (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Fury',
  print: { domain2: 'Chaos' },
  // the sky, the moon and its reflection, the lanterns and the burning eyes shine; the rest stays matt
  foil: 'painted',
  draw(p) {
    harbour(p)
    lanterns(p)
    const d = p.layer()
    harpooner(d)
    p.subject(d, OUTLINE)
    finish(p)
  },
}
