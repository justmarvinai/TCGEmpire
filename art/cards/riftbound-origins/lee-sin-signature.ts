import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Blind Monk (Signature), Ultra. Our own blindfolded monk: shaven head, a saffron robe over one
 * shoulder, prayer beads, cloth wraps on the shins. He balances in a crane stance on a stone pillar
 * above the mist at dawn and "sees" the rain through rings of sound spreading out from him.
 * Full art, 80×112.
 *
 * Composition: the monk stands on the pillar in the middle, turned three quarters to the left, one
 * palm pushed out; the blindfold's long ends stream to the right. A pale sun behind his chest makes
 * the silhouette read; the rings fill the sky. The frame's plates cover rows 0–14 and 90–112.
 */
const SKY = colors('0d2230', '1a3d4a', '2e6363', '5b8b74', 'a9bf86', 'efe0a0')
const SUN = hex('fff6d0')
const ROCK = colors('161a22', '2c323a', '4a5052', '72766c')
const MOSS = hex('5f8a4a')
const SKIN = colors('5e2c20', '9c5434', 'd08858', 'f2bc8a')
const ROBE = colors('6e2410', 'b84c16', 'e8841e', 'fcbe48')
const MAROON = colors('3a0c18', '6c1a28', '9e2c36', 'c8503e')
const CLOTH = colors('8e93a6', 'd8dbe6', 'ffffff')
const BEAD = hex('3a1a14')
const RING = colors('7ccbb4', 'd2f6e8')
const OUTLINE = hex('0a0c12')

/** Dawn sky, the sun, far peaks and stone pillars sinking into the mist. */
function dawn(p: Painter): void {
  p.shine(true)
  p.dither(null, SKY, (x, y) => Math.pow(Math.min(1, y / 84), 1.3) + noise(x, y, 2, 10) * 0.08 - 0.04, 0.8)
  const sun = p.m().disc(40, 36, 19)
  p.fill(sun, SKY[5])
  p.fill(p.m().disc(39, 35, 16), SUN)
  p.shine(false)

  // far peaks
  const peaks = p.m().poly([0, 74, 6, 66, 10, 68, 16, 60, 22, 66, 27, 63, 31, 70, 50, 72, 56, 64, 61, 67, 67, 58, 73, 64, 80, 61, 80, 90, 0, 90])
  p.fill(peaks, SKY[3])
  p.fill(peaks.facing([0, -1]), SKY[4])

  // stone pillars in the distance, each with a little pine on top
  for (const [x0, top, w] of [
    [5, 62, 9],
    [64, 57, 10],
    [16, 73, 6],
  ] as const) {
    const pillar = p.m().poly([x0, top, x0 + w, top, x0 + w + 1, 96, x0 - 1, 96])
    p.fill(pillar, SKY[2])
    p.fill(pillar.facing([-1, 0]).minus(pillar.facing([0, -1])), SKY[3])
    const pine = p.m().poly([x0 + w / 2 - 3.5, top + 0.5, x0 + w / 2, top - 5, x0 + w / 2 + 3.5, top + 0.5])
    p.fill(pine, SKY[1])
  }

  // mist hiding the feet of the pillars
  const mist = p.m()
  for (const [x, y, rx, seed] of [
    [8, 84, 14, 1],
    [30, 88, 12, 2],
    [62, 83, 16, 3],
    [76, 90, 10, 4],
    [18, 96, 14, 5],
    [56, 98, 16, 6],
  ] as const) {
    mist.blob(x, y, rx, 4, seed, 0.25)
  }
  p.dither(mist, [SKY[3], SKY[4], SKY[5]], (x, y) => 0.3 + (96 - y) / 30 + noise(x, y, 6, 5) * 0.3, 0.7)
}

/** The pillar the monk stands on, with moss on its top. */
function pillar(p: Painter): void {
  const rock = p.m().poly([30, 84, 53, 84, 56, 112, 26, 112])
  p.shade(rock, ROCK, { bevel: 8 })
  for (const crack of [
    [36, 90, 38, 96, 37, 103],
    [48, 92, 47, 99, 49, 108],
    [31, 100, 34, 104],
  ]) {
    p.fill(p.m().path(crack).and(rock), ROCK[0])
  }
  const moss = p.m().blob(41.5, 84.5, 12.5, 1.8, 7, 0.3).and(p.m().rect(0, 82, 80, 4))
  p.fill(moss, MOSS)
  p.fill(moss.facing([0, -1]), SKY[4])
}

/** Rings of sound spreading from the monk; where they cross a raindrop it lights up. */
function rings(p: Painter): Mask {
  const ring = p.m()
  for (const r of [21, 29, 37]) {
    for (let a = 0; a < 360; a += 1) {
      const x = 39 + Math.cos((a * Math.PI) / 180) * r
      const y = 23 + Math.sin((a * Math.PI) / 180) * r * 0.92
      ring.add(Math.floor(x), Math.floor(y))
    }
  }
  return ring
}

function rain(p: Painter, ring: Mask): void {
  const rand = rng(17)
  p.shine(true)
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * 80)
    const y = 4 + Math.floor(rand() * 84)
    if (p.subjectMask.has(x, y) || p.subjectMask.has(x + 1, y + 2)) continue
    const hit = ring.grown(1).has(x, y)
    p.px(x, y, hit ? RING[1] : SKY[4]).px(x, y + 1, hit ? RING[1] : SKY[4])
    if (!hit) p.px(x + 1, y + 2, SKY[3])
  }
  ring
    .minus(p.subjectMask)
    .each((x, y) => {
      if ((x * 7 + y * 3) % 5 !== 0) p.px(x, y, RING[0])
    })
  p.shine(false)
}

function monk(d: Painter): void {
  const m = (): Mask => d.m()

  // blindfold ends streaming in the wind, behind the head: broad strips of cloth with a fold
  for (const [line, radii] of [
    [[44.5, 22.5, 50, 19, 56, 20.5, 62, 16.5, 69, 17.5], [1.8, 1.9, 1.8, 1.4, 0.7]],
    [[44.5, 24.5, 50, 27, 56, 25.5, 62, 28, 67, 26.5], [1.7, 1.8, 1.6, 1.2, 0.6]],
  ] as const) {
    const strip = m().limb(line, radii)
    d.part(strip, CLOTH, { bevel: 1.5 })
    d.fill(m().path(line).and(strip.shrunk(1)).moved(0, 1).and(strip.shrunk(1)), CLOTH[1])
  }

  // far arm swept back like a wing, the hand bent into a crane's beak
  d.part(m().limb([46.5, 35, 53.5, 37.5, 59.5, 35], [2.7, 2.3, 2]), SKIN)
  d.part(m().poly([58, 33.5, 61.5, 34, 62.5, 38, 61, 40.5, 59.5, 37.5]), SKIN, { bevel: 1.5 })

  // standing leg in its wraps, and the foot planted on the moss
  const shin = m().limb([44, 61, 44.5, 72, 44.5, 80], [2.8, 2.4, 2])
  d.part(shin, SKIN)
  for (const y of [67, 70, 73, 76]) d.fill(m().rect(40, y, 10, 2).and(shin), y % 2 === 0 ? CLOTH[1] : CLOTH[0])
  d.part(m().poly([41, 79.5, 46.5, 79.5, 48.5, 83.5, 40.5, 84]), SKIN, { bevel: 2 })

  // torso with the far shoulder bare; the robe drapes from the near shoulder across the chest
  const torso = m().poly([32.5, 32, 47.5, 31.5, 49, 36, 47.5, 43.5, 46.5, 48.5, 35, 48.5, 33.5, 43.5, 31.5, 36])
  d.part(torso, SKIN, { bevel: 5 })
  const drape = m().poly([32, 31.5, 38.5, 31, 48.5, 41.5, 46.5, 48.5, 35, 48.5, 33.5, 43.5, 31, 36])
  d.part(drape, MAROON, { bevel: 4 })
  d.fill(m().path([38.5, 31.5, 48, 42]).and(drape), MAROON[3])

  // the robe as a skirt, hitched over the raised thigh
  const skirt = m().poly([34, 47.5, 46.5, 47.5, 49, 54, 50.5, 63, 45, 64.5, 39.5, 63, 36, 58, 31, 55.5, 25, 52.5, 23, 48.5, 26.5, 45, 33, 47.5])
  d.part(skirt, ROBE, { bevel: 4 })
  for (const fold of [
    [44, 50, 46, 62],
    [40, 51, 39.5, 61],
    [33, 50, 26, 50],
  ]) {
    d.fill(m().path(fold).and(skirt.shrunk(1)), ROBE[1])
  }
  d.part(m().rect(34, 46.5, 12.5, 2), MAROON.slice(0, 3), { bevel: 1 })

  // raised leg: the shin hangs from the high knee, toes pointed
  const raised = m().limb([26.5, 52, 27.5, 57, 28.5, 61.5], [2.4, 2.1, 1.8])
  d.part(raised, SKIN)
  for (const y of [55, 58]) d.fill(m().rect(22, y, 10, 2).and(raised), CLOTH[1])
  d.part(m().poly([26.5, 61, 30.5, 61, 29, 66, 27.5, 65.5]), SKIN, { bevel: 1.5 })

  // near arm pushed out, palm open
  d.part(m().limb([34, 34.5, 27.5, 36.5, 21.5, 34.5], [2.9, 2.4, 2.1]), SKIN)
  d.part(m().poly([16.5, 29, 20.5, 29.5, 22, 33.5, 21.5, 37.5, 17.5, 37.5, 16.5, 34]), SKIN, { bevel: 2 })
  d.fill(m().path([18, 30, 18, 33]).path([20, 30, 20, 33]), SKIN[1])
  d.part(m().ellipse(33.5, 34.5, 3.3, 3), MAROON, { bevel: 3 })

  // neck, shaven head and ear
  d.part(m().limb([40, 27, 41, 32], 2.5), SKIN, { bias: -1 })
  const head = m().ellipse(39, 22.5, 5.4, 5.8).poly([33.8, 23, 34.2, 28, 36.2, 30.5, 40.5, 30, 43.8, 26])
  d.part(head, SKIN, { bevel: 4 })
  d.part(m().ellipse(42.8, 25, 1.3, 1.9), SKIN, { bevel: 1 })

  // blindfold band round the eyes, knotted at the back of the head
  const band = head.grown(1).and(m().rect(0, 21, 80, 3)).minus(m().rect(43.5, 0, 10, 112))
  d.part(band, CLOTH, { bevel: 1.5 })
  d.part(m().ellipse(44.5, 23, 1.7, 1.9), CLOTH, { bevel: 1.5 })
  d.px(33, 26, SKIN[1]).px(35, 29, SKIN[0]).px(36, 29, SKIN[0])

  // the sun behind him lights his top and right-hand rims
  d.tone(d.mask().facing([1, 0, 0, -1]), 1)

  // prayer beads hanging round the neck
  for (const [x, y] of [
    [37, 33],
    [38, 35],
    [39, 37],
    [41, 38],
    [43, 37],
    [44, 35],
    [45, 33],
  ] as const) {
    d.px(x, y, BEAD)
  }
}

export const leeSinSignature: CardDef = {
  id: 'rb-ogn-085',
  number: 85,
  name: 'Lee Sin, Blind Monk (Signature)',
  tier: 'ultra',
  kind: 'legend',
  element: 'Calm',
  print: { tag: 'Legende' },
  // the sky, the sun, the rain and the rings of sound shine; monk, pillars and mist stay matt
  foil: 'painted',
  draw(p) {
    dawn(p)
    pillar(p)
    const d = p.layer()
    monk(d)
    p.subject(d, OUTLINE)
    rain(p, rings(p))
  },
}
