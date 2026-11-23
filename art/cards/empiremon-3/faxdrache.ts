import type { Mask, Painter, Points, Pt } from '../../toolkit/index.ts'
import { colors, hex, lightning, noise, spline } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Faxdrache (Ultra, Strom): a dragon of curling fax paper streaming out of an old fax machine, sparks and
 * beeping waves. Full art, 80×112.
 *
 * Composition: the fax machine sits at the bottom left; the printed paper streams out of its slot as one
 * long twisting ribbon that curls up to the left, sweeps back across the card and rises into the dragon's
 * head at the top right: paper horns, a serrated frill, a mane of streamers, lightning roaring from its
 * jaws to the left. The beep of the machine rings out through the night as rings of signal; sparks
 * crackle round the paper. The name plate covers rows 4–14, the bottom plate rows 91–106.
 */
const OUTLINE = hex('05070e')
const NIGHT = colors('070a16', '0d1326', '15203a', '1f3052', '2c4470')
const VOLT = colors('f0c828', 'fff27a', 'fffbd8')
const PAPER = colors('5c6078', '9aa0b4', 'd0d4de', 'f6f6ee')
const BEIGE = colors('4a4234', '7e735c', 'b4a98c', 'e0d8bc')
const LCD = colors('4c9c64', 'b8f0a0')
const LED = hex('e8483c')

/** The speaker of the machine: the beep spreads from here. */
const SPEAKER: Pt = [38, 86]
/** Lines of text across the paper: where each word starts and ends, as shares of the half width. */
const WORDS = [[0.75, 0.25], [0.05, -0.35], [-0.5, -0.65]] as const
/** The paper's way from the slot of the machine to the back of the head. */
const BODY: Points = [28, 68, 23, 60, 18, 51, 22, 43, 35, 44, 49, 52, 62, 53, 69, 46, 66, 39]

/** The beep: bright arcs right next to the speaker. */
function beep(p: Painter): void {
  for (const [r, c] of [[7, VOLT[2]], [12, VOLT[1]], [17, VOLT[0]], [22, NIGHT[4]]] as const) {
    const ring = p.m().disc(SPEAKER[0], SPEAKER[1], r).minus(p.m().disc(SPEAKER[0], SPEAKER[1], r - 1))
    p.fill(ring.and(p.m().poly([SPEAKER[0] + 4, SPEAKER[1], 80, SPEAKER[1] - 40, 80, SPEAKER[1] + 40])), c)
  }
}

function night(p: Painter): void {
  // the beep rings out as wide rings of signal, brighter towards the dragon
  p.dither(
    null,
    NIGHT,
    (x, y) => {
      const r = Math.hypot(x - SPEAKER[0], y - SPEAKER[1])
      const ring = ((r % 9) + 9) % 9 < 1.6 ? 0.22 : 0
      const glow = Math.max(0, 1 - Math.hypot(x - 46, (y - 40) * 0.9) / 48)
      return 0.04 + glow * 0.72 + ring + noise(x, y, 6, 8) * 0.06
    },
    0.6,
  )
}

/**
 * A twisting strip along a path: `width` is the half width, `twist` the turn of the strip at each point
 * (cos > 0 shows the printed front). Returns the masks of front, back and the printed rows.
 */
function strip(p: Painter, path: Points, width: (t: number) => number, twist: (t: number) => number): { front: Mask; back: Mask; lines: Mask } {
  const line = spline(path, 10)
  const front = p.m()
  const back = p.m()
  const lines = p.m()
  const n = line.length - 1
  for (let i = 0; i < n; i++) {
    const a = line[i] ?? [0, 0]
    const b = line[i + 1] ?? [0, 0]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
    const ca = Math.cos(twist(i / n))
    const wa = width(i / n) * Math.max(0.18, Math.abs(ca))
    const wb = width((i + 1) / n) * Math.max(0.18, Math.abs(Math.cos(twist((i + 1) / n))))
    const quad = p.m().poly([a[0] + nx * wa, a[1] + ny * wa, b[0] + nx * wb, b[1] + ny * wb, b[0] - nx * wb, b[1] - ny * wb, a[0] - nx * wa, a[1] - ny * wa])
    ;(ca >= 0 ? front : back).or(quad)
    // printed rows across the paper: short words with gaps, ragged at the end like lines of text
    if (ca > 0.4 && i % 2 === 0) {
      for (const [s0, s1] of WORDS.slice(0, 1 + ((i * 5) % 3))) {
        lines.path([
          [a[0] + nx * wa * s0, a[1] + ny * wa * s0],
          [a[0] + nx * wa * s1, a[1] + ny * wa * s1],
        ])
      }
    }
  }
  back.minus(front)
  return { front, back, lines: lines.and(front.shrunk(1)) }
}

/** The old fax machine: body, sloped panel with keys and display, paper tray, handset with its cord. */
function machine(p: Painter): void {
  const m = (): Mask => p.m()
  p.register(BEIGE)
  // paper tray at the back with a stack of blank sheets
  p.fill(m().poly([14, 66, 23, 55, 35, 55, 27, 66]), PAPER[2])
  p.fill(m().poly([14, 66, 23, 55, 24, 55, 15, 66]), PAPER[3])
  // body: top, front, side
  const body = m().poly([10, 70, 18, 64, 44, 64, 46, 70, 46, 92, 10, 92])
  p.shade(body, BEIGE, { bevel: 3 })
  p.fill(m().poly([10, 70, 18, 64, 44, 64, 46, 70]), BEIGE[3])
  p.fill(m().rect(10, 77, 36, 1), BEIGE[1])
  p.fill(body.facing([1, 0]), BEIGE[0])
  // the slot the paper comes out of
  p.fill(m().rect(19, 68, 19, 2), OUTLINE)
  // display and keys on the front panel
  p.fill(m().rect(13, 80, 11, 5), OUTLINE)
  p.fill(m().rect(14, 81, 9, 3), LCD[0])
  p.fill(m().rect(15, 82, 5, 1), LCD[1])
  for (const [x, y] of [[27, 80], [30, 80], [33, 80], [27, 83], [30, 83], [33, 83], [27, 86], [30, 86], [33, 86]] as const) {
    p.fill(m().rect(x, y, 2, 2), BEIGE[3])
    p.fill(m().rect(x, y + 1, 2, 1), BEIGE[1])
  }
  p.px(41, 81, LED)
  // speaker grille
  for (const y of [84, 86, 88]) p.fill(m().rect(37, y, 6, 1), BEIGE[0])
  // the handset lying in its cradle on the left, its coiled cord hanging down the side
  const handset = m().limb([11, 68.5, 14, 66.5, 17, 64], [2.4, 1.8, 2.3])
  p.contact(handset)
  p.shade(handset, BEIGE, { bevel: 2 })
  for (let y = 71; y < 92; y += 2) p.fill(m().rect(7, y, 3, 1), BEIGE[2]).fill(m().rect(8, y + 1, 2, 1), BEIGE[0])
  p.fill(m().rect(9, 69, 1, 2), BEIGE[1])
}

/** The head, looking left: horns of rolled paper, a serrated frill, skull, snout, open jaw, printed lines. */
function head(out: Painter): void {
  const d = out.layer()
  const m = (): Mask => d.m()
  // mane of paper streamers fluttering back, horns of rolled paper curling at the tips
  for (const [pts, r] of [
    [[46, 29, 54, 26, 60, 27, 66, 24], 1.1],
    [[47, 33, 55, 32, 61, 35, 67, 33], 1],
  ] as const) {
    d.part(m().limb(pts, [r, r, r * 0.9, r * 0.7]), PAPER, { bevel: 1, bias: -1 })
  }
  d.part(m().limb([40, 24, 44, 20.5, 49, 19.5, 52, 17, 50, 15.5], [2.2, 1.7, 1.3, 1, 0.8]), PAPER, { bevel: 1.5, bias: -1 })
  d.part(m().poly([48, 30, 57, 27, 51, 34, 58, 35, 50, 39, 56, 42, 47, 42]), PAPER, { bevel: 2, bias: -1 })
  // the jaw dropped open, the mouth with paper fangs
  d.part(m().poly([27, 42.5, 40, 39.5, 44, 43, 33, 46, 28, 45]), PAPER, { bevel: 2, bias: -1 })
  d.fill(m().poly([24, 37.5, 40, 37, 40, 40, 27, 42.5]), NIGHT[0])
  // skull and snout, nose
  d.part(m().ellipse(42, 31, 8, 7.5).poly([37, 25.5, 26, 29.5, 22.5, 31.5, 21.5, 35, 23, 37.5, 40, 37.5]), PAPER, { bevel: 5 })
  d.part(m().ellipse(24.5, 31.5, 2.6, 2), PAPER, { bevel: 2, bias: 1, line: 'none' })
  d.part(m().limb([44, 25, 50, 22, 56, 21.5, 59, 19, 58, 16.5], [2.6, 2, 1.6, 1.2, 0.9]), PAPER, { bevel: 1.5 })
  d.part(m().poly([28, 27.5, 39, 23.5, 41.5, 26, 31, 30]), PAPER, { bevel: 2, bias: 1, line: 'shadow' })
  // printed lines of text on the paper of the snout and the skull
  for (const [x, y, w] of [[28, 34, 3], [32, 34, 4], [27, 36, 5], [33, 36, 2], [41, 33, 3], [45, 33, 2], [42, 35, 4]] as const) {
    d.fill(m().rect(x, y, w, 1), PAPER[1])
  }
  // glowing eye, nostril, fangs
  d.stamp(['yyvv', 'vvv.'], 32, 28, { v: VOLT[0], y: VOLT[2] })
  d.px(23, 31, OUTLINE).px(24, 31, OUTLINE)
  d.stamp(['w..w..w..w', 'w..w..w...', '..........', '.......w..', '...w...w..'], 25, 38, { w: PAPER[3] })
  // whiskers hanging from the snout
  d.part(m().limb([24, 37, 20, 40, 18, 45, 20, 49], [0.9, 0.8, 0.7, 0.6]), PAPER, { bevel: 1, line: 'none' })
  // drawn in the coordinates of its first sketch, then moved to the top right of the card
  const placed = out.layer()
  placed.blit(d, 12, 1)
  out.contact(placed.mask())
  out.blit(placed)
}

export const faxdrache: CardDef = {
  id: 'emp3-013',
  number: 13,
  name: 'Faxdrache',
  tier: 'ultra',
  kind: 'monster',
  element: 'Strom',
  foil: 'art',
  draw(p) {
    night(p)
    beep(p)
    machine(p)
    const d = p.layer()
    const body = strip(d, BODY, (t) => (t < 0.18 ? 8.5 - t * 18 : 5.3 - t * 2), (t) => (t < 0.12 ? 0 : (t - 0.12) * Math.PI * 2.6))
    d.fill(body.back, PAPER[2])
    d.fill(body.back.facing([1, 0, 0, 1]), PAPER[1])
    d.fill(body.front, PAPER[3])
    d.fill(body.front.facing([1, 0, 0, 1]), PAPER[2])
    d.fill(body.lines, PAPER[1])
    head(d)
    p.subject(d, OUTLINE)
    // lightning roaring out of the jaws, sparks jumping off the paper
    lightning(p, [38, 41], [6, 27], VOLT[2], { seed: 3, jag: 2.2, glow: VOLT[0] })
    lightning(p, [70, 50], [76, 43], VOLT[1], { seed: 5, jag: 1.2 })
    lightning(p, [36, 62], [42, 70], VOLT[1], { seed: 8, jag: 1.2 })
    for (const [x, y] of [[54, 72], [12, 20], [8, 45], [72, 60], [40, 56]] as const) {
      if (p.subjectMask.has(x, y)) continue
      p.px(x, y, VOLT[2]).px(x - 1, y, VOLT[0]).px(x + 1, y, VOLT[0]).px(x, y - 1, VOLT[0]).px(x, y + 1, VOLT[0])
    }
  },
}
