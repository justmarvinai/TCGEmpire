import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Yone, Blademaster (Signature), Ultra. Our own masked swordsman: a white horned spirit mask with red
 * markings, long black hair, a black kimono and hakama with a blood-red sash. He stands square on
 * the crown of a red arched bridge with two swords drawn and crossed in front of him, one bright
 * steel, one a spectral red. A torii gate rises out of the mist behind him; petals fall cut in half.
 * Full art, 80×112.
 *
 * Composition: nearly symmetric. The blades form a big X from his hips to above his shoulders, the
 * mask just above where they cross; a ghostly glow behind his head makes the black figure read. The
 * torii's beams frame his head, the bridge arches under his feet. The frame's plates cover rows 0–14
 * and 90–112.
 */
const NIGHT = colors('08060c', '140c18', '221424', '34202e')
const MIST = colors('5a5268', '9a94aa', 'dcd8e6')
const BLOOD = colors('3a0a10', '7a141c', 'b8202a', 'e8483c')
const BLACK = colors('0c0a10', '1e1a26', '363044')
const SKIN = colors('7a4a3a', 'c8907a', 'f0c4a8')
const STEEL = colors('5a6478', 'a8b4c8', 'f2f6ff')
const SPECTRE = colors('ff3a4e', 'ff9a9a', 'ffe2e2')
const PINK = colors('d86a92', 'ffbcd2')
const WHITE = hex('ffffff')
const OUTLINE = hex('050308')

/** Height of the bridge deck at x: an arch with its crown in the middle. */
const deck = (x: number): number => 76 + 9 * ((x - 40) / 40) ** 2

function backdrop(p: Painter): void {
  // night, with a ghostly glow behind his head and shoulders
  p.shine(true)
  p.dither(
    null,
    [NIGHT[0], NIGHT[1], NIGHT[2], NIGHT[3], MIST[0]],
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 40, (y - 30) * 0.9) / 30)
      return 0.08 + glow * 1.1 + noise(x, y, 6, 8) * 0.12
    },
    0.7,
  )
  p.shine(false)

  // the torii: two pillars, the black-capped top beam with upturned ends, the tie beam, the strut
  const torii = p.m()
  torii.poly([10, 24, 14, 24, 14.5, 84, 9.5, 84]).poly([66, 24, 70, 24, 70.5, 84, 65.5, 84])
  torii.rect(6, 29, 68, 3).rect(38, 22, 4, 7)
  const shimaki = p.m().poly([3, 20, 77, 20, 76, 23, 4, 23])
  const kasagi = p.m().poly([0, 14.5, 4, 17, 40, 18, 76, 17, 80, 14.5, 80, 18.5, 76, 20.5, 40, 21, 4, 20.5, 0, 18.5])
  p.register(BLOOD)
  p.fill(torii.or(shimaki), BLOOD[1])
  p.fill(torii.facing([-1, 0]), BLOOD[2])
  p.fill(torii.facing([0, 1]), BLOOD[0])
  p.fill(kasagi, BLOOD[2])
  p.fill(kasagi.facing([0, 1]), BLOOD[1])
  p.fill(kasagi.facing([0, -1]), BLACK[1])
  p.fill(kasagi.facing([0, -1]).moved(0, 1).and(kasagi).minus(kasagi.facing([0, -1])), BLACK[2])

  // mist drifting in thin bands round the feet of the gate
  const mist = p.m()
  for (const [x, y, rx, ry, seed] of [
    [12, 57, 16, 1.8, 1],
    [68, 55, 16, 1.8, 2],
    [20, 63, 22, 2.2, 3],
    [62, 62, 22, 2.2, 4],
    [8, 69, 14, 2.4, 5],
    [74, 68, 14, 2.4, 6],
    [40, 69, 26, 2.6, 7],
  ] as const) {
    mist.blob(x, y, rx, ry, seed, 0.35)
  }
  p.shine(true)
  p.dither(mist, [NIGHT[3], MIST[0], MIST[1]], (x, y) => 0.2 + (y - 52) / 34 + noise(x, y, 9, 6) * 0.5, 0.8)
  p.shine(false)
}

/** The red arched bridge: the far railing with its posts and knobs, the deck, the side beam. */
function bridge(p: Painter): void {
  const rail = p.m()
  for (let x = 0; x < 80; x++) rail.rect(x, deck(x) - 8, 1, 2)
  const posts = p.m()
  for (let x = 2; x < 80; x += 9) {
    posts.rect(x, deck(x) - 8, 2, 8)
    posts.rect(x - 0.5, deck(x) - 10.5, 3, 2.5)
  }
  p.fill(rail.or(posts), BLOOD[2])
  p.fill(rail.facing([0, 1]).minus(posts), BLOOD[1])
  p.fill(posts.facing([1, 0]), BLOOD[1])
  for (let x = 2; x < 80; x += 9) p.px(x, Math.round(deck(x) - 10.5), BLOOD[3])

  const side = p.m()
  for (let x = 0; x < 80; x++) side.rect(x, deck(x), 1, 112)
  p.fill(side, BLOOD[1])
  const top = side.facing([0, -1])
  p.fill(top, BLOOD[3])
  p.fill(top.moved(0, 1).and(side).minus(top), BLOOD[2])
  for (let x = 0; x < 80; x++) {
    p.fill(p.m().rect(x, deck(x) + 5, 1, 1), BLOOD[0])
  }
  // planks of the side beam and the dark arch below it
  for (let x = 4; x < 80; x += 8) p.fill(p.m().rect(x, deck(x) + 1, 1, 4), BLOOD[0])
  const under = p.m()
  for (let x = 0; x < 80; x++) under.rect(x, deck(x) + 6, 1, 112)
  p.fill(under, NIGHT[1])
}

/** A sword from the guard `a` to the tip `b`, its blade bowing a little; returns the blade mask. */
function blade(d: Painter, a: Pt, b: Pt, bow: number): Mask {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
  const mid: Pt = [(a[0] + b[0]) / 2 + nx * bow, (a[1] + b[1]) / 2 + ny * bow]
  return d.m().limb([...a, ...mid, ...b], [1.4, 1.2, 0.5])
}

function swordsman(d: Painter): void {
  const m = (): Mask => d.m()

  // the long ponytail falling behind his right shoulder, a few strands lifting
  d.part(m().limb([43, 21, 48, 23.5, 51, 29, 52.5, 36, 52, 42], [2.4, 2.6, 2.4, 1.8, 0.7]), BLACK, { bias: -1, bevel: 2 })

  // hakama: wide black trousers, split between the legs, a red hem
  const hakama = m().poly([31.5, 53, 48.5, 53, 51.5, 62, 55.5, 77.5, 45.5, 77.5, 40.5, 63, 39.5, 63, 34.5, 77.5, 24.5, 77.5, 28.5, 62])
  d.part(hakama, BLACK, { bevel: 4 })
  for (const fold of [
    [34, 56, 30, 76],
    [46, 56, 50, 76],
    [37, 57, 37, 64],
    [43, 57, 43, 64],
  ]) {
    d.fill(m().path(fold).and(hakama.shrunk(1)), BLACK[0])
  }
  d.fill(hakama.clone().minus(hakama.moved(0, -1)), BLOOD[2])

  // feet in pale socks on the deck
  d.part(m().ellipse(30, 78.5, 3.2, 1.6).ellipse(50, 78.5, 3.2, 1.6), MIST, { bevel: 1.5 })

  // the black kimono with its red under-collar, wide sleeves reaching down to the hilts
  const kimono = m().poly([30.5, 37, 49.5, 37, 50.5, 46, 48.5, 53, 31.5, 53, 29.5, 46])
  d.part(kimono, BLACK, { bevel: 4 })
  d.fill(m().path([36.5, 36.5, 40, 45, 43.5, 36.5]).path([37.5, 36.5, 40, 43, 42.5, 36.5]).and(kimono), BLOOD[2])
  d.part(m().limb([31.5, 39, 28.5, 46.5, 27.5, 53], [3.4, 3.8, 3.4]), BLACK)
  d.part(m().limb([48.5, 39, 51.5, 46.5, 52.5, 53], [3.4, 3.8, 3.4]), BLACK)
  d.fill(m().path([26, 50, 29.5, 52.5]).path([54, 50, 50.5, 52.5]), BLOOD[1])

  // the blood-red sash
  const sash = m().rect(30.5, 50.5, 19, 4)
  d.part(sash, BLOOD, { bevel: 1.5 })
  d.fill(m().path([41, 51, 39, 54]), BLOOD[0])

  // the swords: grips in the fists at his hips, the blades crossing in front of his chest
  const grips = m().limb([25, 59, 28.5, 54], 1.4).limb([55, 59, 51.5, 54], 1.4)
  d.part(grips, BLACK, { bevel: 1 })
  d.fill(m().path([25, 58, 28, 55]).path([55, 58, 52, 55]).and(grips), BLOOD[1])
  d.part(m().disc(27.5, 56.5, 2.2).disc(52.5, 56.5, 2.2), SKIN, { bevel: 1.5 })
  d.part(m().ellipse(29.2, 52.8, 1.8, 1.4).ellipse(50.8, 52.8, 1.8, 1.4), STEEL.slice(0, 2), { bevel: 1 })

  const steel = blade(d, [29.8, 51.8], [65.5, 16.5], -1.2)
  d.part(steel, STEEL, { bevel: 1.2 })
  d.fill(steel.facing([-1, 0, 0, -1]), WHITE)

  d.shine(true)
  const spectre = blade(d, [50.2, 51.8], [14.5, 16.5], 1.2)
  d.contact(spectre)
  d.fill(spectre, SPECTRE[0])
  d.fill(spectre.facing([1, 0, 0, -1]), SPECTRE[1])
  d.fill(m().path([47, 48.5, 39, 40.5, 30, 31.5, 21, 22.5]).and(spectre.grown(1).shrunk(2)), SPECTRE[2])
  d.shine(false)

  // neck and head
  d.part(m().limb([40, 33, 40, 36.5], 2.2), SKIN, { bias: -1 })
  const head = m().ellipse(40, 27.5, 4.6, 5.4).poly([35.6, 28, 36.4, 31.5, 38.6, 33.6, 41.4, 33.6, 43.6, 31.5, 44.4, 28])
  d.part(head, SKIN, { bevel: 3 })

  // hair swept back, loose strands framing the face
  const hair = m()
    .ellipse(40, 23.6, 5.4, 3.8)
    .limb([35.4, 24, 34.4, 29, 34.6, 34], [1.3, 1.1, 0.5])
    .limb([44.6, 24, 45.6, 29, 45.4, 34], [1.3, 1.1, 0.5])
  d.part(hair, BLACK, { bevel: 2 })
  d.fill(m().path([37.5, 21, 39.5, 23.5]).path([42.5, 21, 44, 23.5]).and(hair.shrunk(1)), BLACK[0])

  // the spirit mask over the upper face: white, two little horns, red markings, glowing eyes
  const mask = m()
    .ellipse(40, 27, 4.6, 3.3)
    .and(head.grown(1))
    .poly([36.8, 24, 35.8, 19.5, 38.2, 23])
    .poly([43.2, 24, 44.2, 19.5, 41.8, 23])
  d.part(mask, [MIST[0], MIST[1], MIST[2], WHITE], { bevel: 2, bias: 1 })
  d.stamp(['rr.....rr', '.kkk.kkk.', '.kek.kek.', '..r...r..', '..r...r..'], 35.5, 25, { r: BLOOD[2], k: BLACK[0], e: SPECTRE[0] })
  d.px(40, 24, BLOOD[2])
  d.stamp(['.mm.'], 38, 31, { m: SKIN[0] })

  // the red blade lights his right-hand rims, the mist his left
  const body = d.mask()
  body.facing([1, 0]).each((x, y) => {
    if (BLACK.includes(d.get(x, y))) d.set(x, y, BLOOD[1])
  })
  body.facing([-1, 0]).each((x, y) => {
    if (BLACK.includes(d.get(x, y))) d.set(x, y, BLACK[2])
  })
}

/** Petals cut in half by the blades: two halves drifting apart along a white slash. */
function petals(p: Painter): void {
  p.shine(true)
  const near = p.subjectMask.grown(1)
  const rand = rng(17)
  let placed = 0
  for (let i = 0; i < 80 && placed < 9; i++) {
    const x = 4 + Math.floor(rand() * 70)
    const y = 16 + Math.floor(rand() * 58)
    if (near.has(x, y) || near.has(x + 4, y + 3) || near.has(x, y + 3) || near.has(x + 4, y)) continue
    if (placed % 3 === 0) {
      // a whole petal still falling
      p.stamp(['pp.', 'ppl', '.l.'], x, y, { p: PINK[0], l: PINK[1] })
    } else {
      p.stamp(['ll..', 'pl..', '...w', '..pl', '..pp'], x, y, { p: PINK[0], l: PINK[1], w: WHITE })
    }
    placed++
  }
  // sparks where the blades cross
  for (const [x, y] of [
    [40, 39],
    [43, 41],
    [37, 42],
  ] as const) {
    p.px(x, y, SPECTRE[2])
  }
  p.shine(false)
}

/** Ghostly wisps trailing off the red blade. */
function wisps(p: Painter): void {
  p.shine(true)
  const trail = p.m()
  for (const [x0, y0, x1, y1] of [
    [21, 23, 11, 31],
    [28, 30, 18, 38],
    [35, 37, 25, 45],
  ] as const) {
    trail.path([x0, y0, (x0 + x1) / 2 - 1, (y0 + y1) / 2 + 1, x1, y1])
  }
  trail.minus(p.subjectMask.grown(1)).each((x, y) => {
    if (bayer(x, y) < 0.75) p.px(x, y, SPECTRE[1])
  })
  p.shine(false)
}

export const yoneSignature: CardDef = {
  id: 'rb-sfd-084',
  number: 84,
  name: 'Yone, Blademaster (Signature)',
  tier: 'ultra',
  kind: 'unit',
  element: 'Body',
  // the night glow, the mist, the spectral blade, its wisps and the cut petals shine; the swordsman,
  // the gate and the bridge stay matt
  foil: 'painted',
  draw(p) {
    backdrop(p)
    bridge(p)
    const d = p.layer()
    swordsman(d)
    p.subject(d, OUTLINE)
    wisps(p)
    petals(p)
  },
}
