import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Gloomist (Signature), Ultra. Our own little gloom sprite: a tiny pale creature lost in a lilac hood
 * with a floppy tip, half-closed eyes and a flat mouth. She slouches on a mossy rock in a sunny jungle
 * clearing, chin on her fist, utterly unimpressed, while her shadow rises behind her as a giant
 * hooded shape with glowing eyes and a huge grin, swallowing the sunshine. Full art, 80×112.
 *
 * Composition: the shadow fills the middle and the top of the picture, its tendrils reaching out
 * over the clearing; the sprite sits small on the rock at the bottom, square to the viewer, and the
 * sunlight survives only in the corners. The frame's plates cover rows 0–14 and 90–112.
 */
const SUN = colors('8a8a2a', 'c8c440', 'f0ec7a', 'fffcc8')
const LEAF = colors('1e4a2a', '3a7a32', '6aa83a', 'a8d050')
const GLOOM = colors('0e0618', '1e0c30', '30164a', '4a2268')
const TEAL = colors('1a8a8a', '4ae8d0', 'c8fff4')
const ROCK = colors('2a2838', '4a4658', '6e6a7a')
const MOSS = colors('2e5a2a', '5a8a34')
const HOOD = colors('2e2440', '4e4068', '74639a', 'a28ec8')
const SKIN = colors('5a6a8a', '9aa8c8', 'd0d8ec')
const OUTLINE = hex('05020a')

function clearing(p: Painter): void {
  // sickly sunshine pouring into the clearing
  p.shine(true)
  p.dither(null, SUN, (x, y) => 0.95 - Math.hypot(x - 8, y - 6) / 70 - y / 300 + noise(x, y, 2, 8) * 0.08, 0.8)
  p.shine(false)

  // jungle round the edges: big leaves, sunlit on their tops
  for (const [x, y, rx, ry, rot] of [
    [3, 34, 9, 4, -30],
    [76, 30, 10, 4, 35],
    [2, 60, 10, 4.5, 20],
    [78, 58, 9, 4, -25],
    [8, 22, 7, 3, -60],
    [72, 46, 8, 3.5, 50],
  ] as const) {
    const leaf = p.m().ellipse(x, y, rx, ry, rot)
    p.fill(leaf, LEAF[1])
    p.fill(leaf.facing([0, -1, -1, 0]), LEAF[3])
    p.fill(leaf.facing([0, 1]), LEAF[0])
    const vein = p.m().line(x - Math.cos((rot * Math.PI) / 180) * rx * 0.8, y - Math.sin((rot * Math.PI) / 180) * rx * 0.8, x + Math.cos((rot * Math.PI) / 180) * rx * 0.8, y + Math.sin((rot * Math.PI) / 180) * rx * 0.8)
    p.fill(vein.and(leaf.shrunk(1)), LEAF[2])
  }

  // sunny ground with grass tufts
  const ground = p.m().poly([0, 80, 20, 77, 60, 77, 80, 80, 80, 112, 0, 112])
  p.dither(ground, LEAF, (x, y) => 0.85 - (y - 77) / 40 + noise(x, y, 4, 4) * 0.2, 0.6)
  for (let x = 2; x < 80; x += 5) p.fill(p.m().path([x, 80, x + 1, 77, x + 2, 80]), LEAF[3])
}

/** The shadow: a giant hooded shape rising behind her, wisps and tendrils eating the sunshine. */
function shadowShape(p: Painter): Mask {
  const shape = p.m()
    .ellipse(40, 31, 25, 19)
    .poly([17, 36, 63, 36, 70, 82, 10, 82])
    .limb([56, 17, 68, 16, 75, 22, 76, 31], [5, 4, 3, 2])
    .disc(76, 32.5, 3)
  // tendril arms reaching out over the clearing on both sides
  shape.limb([20, 56, 10, 52, 4, 44, 1, 40], [6, 4.5, 3, 2])
  shape.limb([60, 54, 70, 50, 75, 42, 79, 39], [6, 4.5, 3, 2])
  shape.limb([16, 72, 6, 74, 1, 70], [5, 3.5, 2])
  shape.limb([64, 70, 73, 73, 79, 69], [5, 3.5, 2])
  for (let i = 0; i < 7; i++) shape.blob(18 + i * 6.5, 15 + Math.abs(i - 3) * 3, 4, 4, i + 3, 0.4)
  return shape.cleaned()
}

function gloom(d: Painter, shape: Mask): void {
  const m = (): Mask => d.m()
  d.dither(shape, GLOOM, (x, y) => 0.2 + noise(x, y, 5, 6) * 0.45 + Math.max(0, 1 - Math.hypot(x - 40, y - 72) / 20) * 0.3, 0.6)
  d.fill(shape.facing(), GLOOM[3])

  // two slanted glowing eyes and a huge crescent grin full of teeth
  d.shine(true)
  // slanted almond eyes, cut flat on top like a frown, with a white-hot core
  for (const s of [1, -1]) {
    const cx = 40 + s * 11
    const eye = m().ellipse(cx, 22.5, 6, 3.2, -s * 16).minus(m().poly([cx - 7, 17, cx + 7, 17, cx + 7, 21 + s * 2.4, cx - 7, 21 - s * 2.4]))
    d.fill(eye.grown(1), GLOOM[3])
    d.fill(eye, TEAL[1])
    d.fill(m().ellipse(cx + s * 1.5, 23.2, 1.8, 1.1).and(eye), TEAL[2])
  }
  const grin = m().ellipse(40, 30.5, 18, 8.5).minus(m().ellipse(40, 26.5, 19, 7.5))
  d.fill(grin.grown(1), TEAL[0])
  d.fill(grin, GLOOM[0])
  for (let x = 24; x <= 54; x += 3.5) {
    d.fill(m().poly([x, 32.5, x + 2.6, 32.5, x + 1.3, 36]).and(grin), TEAL[2])
    d.fill(m().poly([x + 1.6, 39.5, x + 4, 39.5, x + 2.8, 36.5]).and(grin), TEAL[1])
  }
  d.shine(false)
}

function sprite(d: Painter): void {
  const m = (): Mask => d.m()

  // the mossy rock she sits on
  const rock = m().poly([22, 89, 24, 81, 30, 77, 50, 76.5, 57, 80, 59, 89])
  d.part(rock, ROCK, { bevel: 4 })
  const moss = m().blob(40, 77.5, 17, 2.6, 4, 0.35).and(rock.grown(1))
  d.fill(moss, MOSS[1])
  d.fill(moss.facing([0, 1]), MOSS[0])
  for (const [x, y] of [
    [27, 81],
    [54, 82],
  ] as const) {
    d.fill(m().rect(x, y, 2, 3), MOSS[0])
  }

  // little legs dangling over the edge, boots kicking
  for (const [x, lean] of [
    [36, -1.5],
    [44, 1.5],
  ] as const) {
    d.part(m().limb([x, 75, x + lean, 83], 1.7), HOOD.slice(0, 3), { bevel: 1.5 })
    d.part(m().ellipse(x + lean * 1.4, 84.5, 2.4, 1.8), GLOOM.slice(1), { bevel: 1.5 })
  }

  // the cloak, slumped and spread over the top of the rock
  const cloak = m().poly([31, 62, 35, 58.5, 45, 58.5, 49, 62, 51, 72, 54.5, 77.5, 25.5, 77.5, 29, 72])
  d.part(cloak, HOOD, { bevel: 5 })
  d.fill(m().path([40, 61, 40, 76]).and(cloak.shrunk(1)), HOOD[0])

  // the far arm hanging limp, the near one propping her chin up on a fist
  d.part(m().limb([33, 62, 30.5, 68, 31, 73], [2, 1.8, 1.6]), HOOD, { bias: -1, bevel: 1.5 })
  d.part(m().disc(31.5, 73.5, 1.6), SKIN, { bevel: 1 })
  d.part(m().limb([47, 62, 49.5, 67.5, 46, 62], [2.2, 2, 1.8]), HOOD, { bevel: 1.5 })
  d.part(m().rect(44, 60.5, 4, 2), HOOD.slice(0, 2), { bevel: 1 })

  // the head lost in the hood, a floppy tip falling to the side
  const hood = m().ellipse(40, 51, 9, 8.6).poly([43, 43.5, 49, 41, 54, 43.5, 56.5, 49, 54, 50.5, 51.5, 46.5, 47, 47.5])
  d.part(hood, HOOD, { bevel: 5 })
  d.part(m().disc(55.5, 51.5, 2), HOOD.slice(1), { bevel: 1.5 })
  const face = m().ellipse(40, 53, 6, 5.4)
  d.fill(face.grown(1).and(hood), HOOD[0])
  d.part(face, SKIN, { bevel: 3 })
  // half-closed eyes, a flat unimpressed mouth
  d.stamp(
    [
      'kkkk.kkkk',
      '.ek...ek.',
      '.........',
      '.........',
      '...kkk...',
    ],
    35.5,
    51,
    { k: OUTLINE, e: TEAL[1] },
  )
  d.part(m().ellipse(44.5, 59.2, 2.3, 1.9), SKIN, { bevel: 1.5 })

  // the glow of the shadow's eyes rims the top of her hood
  d.fill(hood.facing([0, -1]).and(m().rect(30, 40, 20, 8)), TEAL[0])
}

export const vexSignature: CardDef = {
  id: 'rb-unl-083',
  number: 83,
  name: 'Vex, Gloomist (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Calm',
  print: { domain2: 'Chaos' },
  // the sunshine and the shadow's eyes and grin shine; the shadow's body, the sprite and the rock stay matt
  foil: 'painted',
  draw(p) {
    clearing(p)
    const g = p.layer()
    gloom(g, shadowShape(p))
    p.subject(g, OUTLINE)
    const d = p.layer()
    sprite(d)
    p.subject(d, OUTLINE)
  },
}
