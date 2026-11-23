import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Stempelgott (Grail, Beton): a colossal golden rubber-stamp deity with a stern face on its handle,
 * descending from bright clouds and leaving a glowing seal mark on the ground; gold and white rays.
 * Full art, 80×112.
 *
 * Composition: the stamp hangs in the middle, seen from a little below: its knob is a stern god's face
 * with heavy brows, glowing eyes and an imperial moustache, a halo behind it; gold and white rays burst
 * between banks of cloud, and wisps of cloud still cling to its block. Below it the seal it has just
 * pressed glows in a concrete plaza, cracked by the blow; a tiny skyline under the god shows how big he
 * is. The name plate covers rows 4–14, the bottom plate rows 91–106.
 */
const OUTLINE = hex('140a04')
const SKY = colors('2a3450', '4a5878', '7a88a4', 'b8c0cc', 'ece6d6')
const CLOUD = colors('8e8a96', 'c8bfae', 'efe6d2', 'fffaf0')
const GOLD = colors('4a2a06', '8a5612', 'c8901c', 'f0c040', 'ffe48a', 'fffbe6')
const RUBBER = colors('4a141c', '7e2430')
const CONCRETE = colors('24262e', '3c3f48', '5a5d66', '828690')

/** Centre of the god's head and of the burst of rays behind it. */
const HEAD = [40, 30.5] as const
/** The horizon and the middle of the seal on the ground. */
const HORIZON = 77
const MARK = [40, 85] as const

function heaven(p: Painter): void {
  const m = (): Mask => p.m()
  const [hx, hy] = HEAD
  // glory: the sky burns from slate at the edges to white and gold round the god
  const glory = [SKY[0], SKY[1], SKY[2], SKY[3], SKY[4], GOLD[4], GOLD[5]]
  p.dither(m().rect(0, 0, 80, HORIZON), glory, (x, y) => 1.04 - Math.hypot(x - hx, (y - hy) * 0.85) / 38, 0.35)
  // thin rays of light reaching out from behind the head
  for (let i = 0; i < 14; i++) {
    const a = ((i + 0.5) / 14) * Math.PI * 2
    const [ux, uy] = [Math.cos(a), Math.sin(a)]
    const ray = m().capsule(hx + ux * 15, hy + uy * 15, hx + ux * 44, hy + uy * 44, 1.4, 0.5)
    p.fill(ray, i % 2 === 0 ? GOLD[5] : GOLD[4])
  }
  // halo behind the head
  p.fill(m().disc(hx, hy, 17.5).minus(m().disc(hx, hy, 16)), GOLD[3])
  // banks of cloud in the corners and at the sides, puffy and lit from above, gold towards the god
  const clouds = m()
  for (const [x, y, r] of [
    [0, 14, 10], [10, 17, 7], [18, 13, 6], [80, 14, 10], [70, 17, 7], [62, 13, 6],
    [0, 46, 8], [9, 49, 5], [80, 46, 8], [71, 49, 5], [1, 30, 5], [79, 30, 5],
  ] as const) {
    clouds.disc(x, y, r)
  }
  p.part(clouds, CLOUD, { bevel: 4, bias: 1, line: 'none' })
  clouds.facing([1, 0, -1, 0, 0, 1]).each((x, y) => {
    if (Math.hypot(x - hx, y - hy) < 36) p.set(x, y, GOLD[4])
  })
}

function plaza(p: Painter): void {
  const m = (): Mask => p.m()
  // tiny office towers on the horizon, so the god looks as big as he is
  const rand = rng(31)
  let x = 0
  while (x < 80) {
    const w = 3 + Math.floor(rand() * 4)
    const h = 3 + Math.floor(rand() * 6)
    p.fill(m().rect(x, HORIZON - h, w, h), CONCRETE[1])
    p.fill(m().rect(x, HORIZON - h, 1, h), CONCRETE[2])
    for (let wy = HORIZON - h + 1; wy < HORIZON - 1; wy += 2) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) p.px(wx, wy, (wx * 7 + wy) % 5 === 0 ? GOLD[3] : CONCRETE[0])
    }
    x += w + 1 + Math.floor(rand() * 2)
  }
  // the plaza: concrete slabs running towards the horizon
  const ground = m().rect(0, HORIZON, 80, 112 - HORIZON)
  p.dither(ground, CONCRETE, (x, y) => 0.8 - (y - HORIZON) / 30 + Math.max(0, 1 - Math.hypot(x - MARK[0], (y - MARK[1]) * 3) / 40) * 0.5, 0.35)
  for (const k of [-5, -3, -1, 1, 3, 5]) p.fill(m().path([[40 + k * 3, HORIZON], [40 + k * 24, 112]]).and(ground), CONCRETE[1])
  for (const y of [79, 82, 87, 94]) p.fill(m().rect(0, y, 80, 1), CONCRETE[1])
}

/** The seal the god has pressed into the plaza: rings and a star, glowing gold; cracks run from it. */
function mark(p: Painter): void {
  const [cx, cy] = MARK
  const m = (): Mask => p.m()
  // cracks in the concrete
  for (const pts of [
    [cx - 22, cy, cx - 28, cy - 2, cx - 33, cy - 1, cx - 40, cy - 4],
    [cx + 22, cy - 1, cx + 29, cy - 3, cx + 35, cy - 2, cx + 41, cy - 5],
    [cx - 14, cy + 5, cx - 19, cy + 9, cx - 22, cy + 14],
    [cx + 13, cy + 5, cx + 17, cy + 10, cx + 23, cy + 14],
  ]) {
    p.fill(m().path(pts), CONCRETE[0])
  }
  // dust thrown up round the seal
  const dust = m()
  for (const [x, y, r] of [[cx - 27, cy - 1, 2.6], [cx - 23, cy + 4, 2.2], [cx + 27, cy - 1, 2.6], [cx + 24, cy + 4, 2.2], [cx - 30, cy - 3, 1.6], [cx + 30, cy - 3, 1.6]] as const) {
    dust.disc(x, y, r)
  }
  p.fill(dust, CONCRETE[3])
  p.fill(dust.clone().minus(dust.moved(0, 1)), CONCRETE[2])
  const outer = m().ellipse(cx, cy, 23, 6.5)
  p.fill(m().ellipse(cx, cy, 26, 8).minus(outer), GOLD[1])
  p.fill(outer, GOLD[4])
  p.fill(m().ellipse(cx, cy, 21.5, 5.6), GOLD[2])
  p.fill(m().ellipse(cx, cy, 17, 4.4).minus(m().ellipse(cx, cy, 16, 3.8)), GOLD[4])
  p.fill(m().poly([cx, cy - 3.6, cx + 3, cy - 0.6, cx + 9, cy - 0.4, cx + 4, cy + 1.2, cx + 6, cy + 3.6, cx, cy + 2, cx - 6, cy + 3.6, cx - 4, cy + 1.2, cx - 9, cy - 0.4, cx - 3, cy - 0.6]), GOLD[5])
}

/** The god: knob with the stern face, turned neck, flared collar, the great block, the rubber seen from below. */
function god(d: Painter): void {
  const m = (): Mask => d.m()
  // block, its engraved border, and the inked rubber underneath, seen from below
  d.part(m().poly([9, 68, 71, 68, 68, 72, 12, 72]), RUBBER, { bevel: 1.5 })
  d.fill(m().rect(20, 70, 40, 1), GOLD[3])
  const block = m().rect(7, 55, 66, 13)
  d.part(block, GOLD, { bevel: 4 })
  d.fill(m().rect(9, 57, 62, 9).minus(m().rect(10, 58, 60, 7)), GOLD[1])
  d.fill(m().rect(10, 58, 60, 1), GOLD[4])
  for (let x = 12; x <= 68; x += 4) if (Math.abs(x - 40) > 6) d.px(x, 63, GOLD[5]).px(x, 64, GOLD[1])
  // the god's own seal engraved in the front of the block
  d.fill(m().disc(40, 61.5, 4).minus(m().disc(40, 61.5, 3)), GOLD[1])
  d.stamp(['..h..', '.hhh.', 'hhhhh', '.h.h.'], 38, 59, { h: GOLD[5] })
  // mount plate, flared collar, turned neck with a ring
  d.part(m().rect(15, 51.5, 50, 4), GOLD, { bevel: 2, bias: -1 })
  d.part(m().poly([35, 44, 45, 44, 51, 48, 59, 52, 21, 52, 29, 48]), GOLD, { bevel: 3 })
  d.part(m().rect(35.5, 40, 9, 5), GOLD, { bevel: 3, bias: -1 })
  d.part(m().ellipse(40, 44, 6.5, 1.8), GOLD, { bevel: 1.5, bias: 1 })
  // the knob: the god's head
  d.part(m().disc(HEAD[0], HEAD[1], 13), GOLD, { bevel: 9 })
  // furrowed brows, glowing eyes, the nose, an imperial moustache curling up, a stern mouth
  d.stamp(['dd...........dd', '.ddd.......ddd.', '..dddd...dddd..', '.....dd.dd.....'], 33, 24, { d: GOLD[0] })
  d.stamp(['ssss.....ssss', 'swwws...swwws', '.sss.....sss.'], 34, 27, { s: GOLD[1], w: CLOUD[3] })
  d.stamp(['n', 'n', 'n', 'nn'], 40, 28, { n: GOLD[1] })
  d.stamp([
    'd.................d',
    'dd...............dd',
    '.ddd...ddddd...ddd.',
    '..ddddddddddddddd..',
    '....dddd...dddd....',
  ], 31, 30, { d: GOLD[0] })
  d.stamp(['.ddddd.', 'd.....d'], 37, 36, { d: GOLD[1] })
}

/** Wisps of cloud drifting in front of the god's block. */
function wisps(p: Painter): void {
  const wisps = p.m()
  for (const [x, y, r] of [[5, 66, 4], [10, 69, 3.5], [1, 70, 3], [75, 66, 4], [70, 69, 3.5], [79, 70, 3]] as const) wisps.disc(x, y, r)
  p.part(wisps, CLOUD, { bevel: 3, bias: 1, line: 'none' })
}

export const stempelgott: CardDef = {
  id: 'emp3-015',
  number: 15,
  name: 'Stempelgott',
  tier: 'grail',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    heaven(p)
    plaza(p)
    mark(p)
    const d = p.layer()
    god(d)
    p.subject(d, OUTLINE)
    wisps(p)
  },
}
