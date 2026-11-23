import type { Mask, Painter, Points, Pt, Transform } from '../../toolkit/index.ts'
import { colors, fire, flameMask, hex, noise, rng, spline, xf } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Aktenhydra (Ultra, Spuk): a hydra whose heads are folded file folders with paper tongues, rising from
 * an avalanche of paper in a dark archive. Full art, 80×112.
 *
 * Composition: three pleated necks (expanding files) rise from the paper heap at the bottom and fan out;
 * the left head snaps down to the left, the middle one roars up to the left, the right one hisses to the
 * right. Each head is a manila folder opened like a beak, its tab a crest, paper sheets for teeth and a
 * forked paper tongue, ghost-green eyes. A violet glow behind them, shelves of the archive in the dark.
 * The name plate covers rows 4–14, the bottom plate rows 91–106.
 */
const OUTLINE = hex('0a0612')
const BG = colors('0d0818', '170f28', '231739', '332150', '47306c', '624494')
const PAPER = colors('4f4470', '7e72a0', 'b4aaca', 'e6e0f0', 'fdfbff')
const FOLDER = colors('5a3a1c', '94642e', 'c8944a', 'ecc27a', 'fde6a8')
const KRAFT = colors('2e1416', '5c2a26', '8a4434', 'b26446')
const GHOST = colors('2a7a44', '7cf05a', 'e4ffb8')

interface Head {
  /** The fold at the back of the folder, where the neck joins. */
  hinge: Pt
  /** Rotation in degrees (clockwise) and mirroring; the unturned head looks to the right. */
  rot: number
  flip: boolean
  scale: number
  /** Neck from the paper heap to the hinge. */
  neck: Points
  /** −1 for the head in the back. */
  bias: number
}

/** Painted back to front. */
const HEADS: readonly Head[] = [
  { hinge: [52, 51], rot: -22, flip: false, scale: 1.25, neck: [46, 92, 49, 78, 53, 66, 51, 58, 52, 51], bias: -1 },
  { hinge: [26, 55], rot: -18, flip: true, scale: 1.3, neck: [34, 92, 32, 80, 27, 70, 25, 62, 26, 55], bias: 0 },
  { hinge: [46, 39], rot: 46, flip: true, scale: 1.6, neck: [40, 92, 41, 76, 38, 62, 41, 49, 46, 39], bias: 0 },
]

function archive(p: Painter): void {
  // deep violet, glowing behind the heads
  p.dither(
    null,
    BG,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot(x - 41, (y - 36) * 0.8) / 44)
      return 0.05 + glow * 0.95 + noise(x, y, 4, 7) * 0.08
    },
    0.75,
  )
  // shelves of the archive at both edges, in the dark
  for (const s of [0, 1]) {
    const x0 = s === 0 ? 0 : 67
    p.fill(p.m().rect(x0, 15, 13, 75), BG[1])
    for (let y = 26; y < 90; y += 15) {
      p.fill(p.m().rect(x0, y, 13, 2), BG[0])
      // box files standing on the board
      const rand = rng(y + s * 50)
      let bx = x0
      while (bx < x0 + 12) {
        const w = 2 + Math.floor(rand() * 2)
        const h = 8 + Math.floor(rand() * 4)
        p.fill(p.m().rect(bx, y - h, w, h), rand() < 0.5 ? BG[2] : BG[3])
        bx += w + 1
      }
    }
    p.fill(p.m().rect(s === 0 ? 12 : 67, 15, 1, 75), BG[0])
  }
}

/** A sheet of paper turned by `deg`: shaded edge, two lines; `shade` 0 bright … 2 dark. */
function sheet(p: Painter, cx: number, cy: number, w: number, h: number, deg: number, shade: number): void {
  const a = (deg * Math.PI) / 180
  const at = (u: number, v: number): Pt => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]
  const page = p.m().poly([at(-w / 2, -h / 2), at(w / 2, -h / 2), at(w / 2, h / 2), at(-w / 2, h / 2)])
  const top = 4 - shade
  p.fill(page, PAPER[top] ?? PAPER[2])
  p.fill(page.facing([1, 0, 0, 1]), PAPER[top - 2] ?? PAPER[0])
  if (w > 6) {
    for (const v of [-h / 5, h / 5]) p.fill(p.m().path([at(-w / 2 + 1.5, v), at(w / 4, v)]).and(page.shrunk(1)), PAPER[top - 1] ?? PAPER[1])
  }
}

/** The avalanche of paper the necks rise from: big sheets piled from the back (dim) to the front (bright). */
function avalanche(p: Painter): void {
  const rand = rng(23)
  for (let i = 0; i < 40; i++) {
    const t = i / 40
    const y = 70 + t * 34 + rand() * 3
    const x = 40 + (rand() * 2 - 1) * (14 + t * 32)
    if (y < 71 + Math.abs(x - 40) * 0.3) continue
    const size = 9 + t * 5
    sheet(p, x, y, size, size * 0.7, (rand() * 2 - 1) * 30, y < 75 ? 2 : y < 82 ? 1 : 0)
  }
}

/** Loose sheets whirling round the heads, the far ones dimmer. */
function whirl(p: Painter, far: boolean): void {
  const spots: readonly (readonly [number, number, number, number])[] = far
    ? [[8, 30, 5, 30], [70, 26, 5, -20], [64, 70, 5, 40], [14, 72, 5, -35]]
    : [[6, 40, 7, -25], [73, 36, 7, 30], [66, 60, 6, -15], [11, 64, 6, 20]]
  for (const [x, y, w, deg] of spots) sheet(p, x, y, w, w * 0.72, deg, far ? 2 : 0)
}

/** Turns local head coordinates (looking right, hinge at 0, 0) into card space. */
function place(h: Head): (pts: Points) => Pt[] {
  const t: Transform = { rot: h.rot, flipX: h.flip, scale: h.scale, dx: h.hinge[0], dy: h.hinge[1] }
  return (pts) => xf(pts, t)
}

/** A pleated neck: an expanding file whose folds run across it as ridges and valleys. */
function neck(d: Painter, h: Head): void {
  const line = spline(h.neck, 10)
  const radii = line.map((_, i) => 4.2 - (i / line.length) * 1.5)
  const m = d.m().limb(line, radii)
  d.part(m, KRAFT, { bevel: 4, bias: h.bias })
  const lengths = [0]
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] ?? [0, 0]
    const b = line[i] ?? [0, 0]
    lengths.push((lengths[i - 1] ?? 0) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const valleys = d.m()
  m.each((x, y) => {
    let best = 0
    let bestD = Infinity
    line.forEach(([cx, cy], i) => {
      const dd = (cx - x - 0.5) ** 2 + (cy - y - 0.5) ** 2
      if (dd < bestD) [best, bestD] = [i, dd]
    })
    if (Math.floor((lengths[best] ?? 0) / 1.6) % 2 === 1) valleys.add(x, y)
  })
  d.tone(valleys, -1)
}

/** A head: a manila folder opened like a beak, tab for a crest, paper teeth, a forked paper tongue, an eye. */
function head(d: Painter, h: Head): void {
  const at = place(h)
  const m = (): Mask => d.m()
  // the inside of the folder, dark
  d.fill(m().poly(at([0, -0.5, 18, -4, 17, 5, 0, 1.5])), BG[0])
  // paper teeth along both jaws
  const teeth = m()
  for (const u of [6, 9.5, 13, 16.5]) {
    const v = (-4 * u) / 18
    teeth.poly(at([u - 1.2, v - 0.5, u + 1.2, v - 0.5, u, v + 2.2]))
    const w = 1.5 + (3.5 * u) / 17
    teeth.poly(at([u - 2.3, w + 0.5, u - 0.1, w + 0.5, u - 1.2, w - 1.8]))
  }
  d.fill(teeth, PAPER[4])
  // tongue: a strip of paper curling out, forked at the end
  const tongue = at([7, 1, 14, 1.8, 20, 0.5, 25, 3])
  d.part(m().limb(tongue, [1.2, 1.4, 1.3, 1.1]), PAPER, { bevel: 1.5, bias: 1 })
  const forks = at([24.5, 3, 28, 1.5, 24.5, 3, 27.5, 5.5])
  d.fill(m().path([forks[0] ?? [0, 0], forks[1] ?? [0, 0]]).path([forks[2] ?? [0, 0], forks[3] ?? [0, 0]]), PAPER[3])
  // lower flap (the jaw), then the tab and the upper flap (the skull) with its fold
  d.part(m().poly(at([0, 1.5, 17, 5, 15.5, 9, -1, 5.5])), FOLDER, { bevel: 2, bias: h.bias - 1 })
  const tab = m().poly(at([4.5, -6.5, 5.5, -10, 11.5, -11.5, 12.5, -8.2]))
  d.part(tab, FOLDER, { bevel: 1.5, bias: h.bias })
  d.fill(m().path(at([6.5, -9.2, 10.5, -10.2])).and(tab), PAPER[4])
  const skull = m().poly(at([-1, -6, 15, -9, 18, -4, 0, -0.5]))
  d.part(skull, FOLDER, { bevel: 2.5, bias: h.bias + 1 })
  d.fill(m().path(at([0.5, -5.5, 0.5, -1])).and(skull), FOLDER[1])
  // a lighter paper edge along the front of the skull, an angry crease, the ghost eye under it
  d.fill(m().path(at([15.5, -8.2, 17.5, -4.2])).and(skull), FOLDER[4])
  d.fill(m().path(at([2.5, -7, 8.5, -5.2])).and(skull), FOLDER[0])
  const [ex, ey] = at([5.5, -3.8])[0] ?? [0, 0]
  d.stamp(['.Gg.', 'GGOg', '.gg.'], Math.round(ex) - 2, Math.round(ey) - 1, { g: GHOST[1], G: GHOST[2], O: OUTLINE })
}

export const aktenhydra: CardDef = {
  id: 'emp3-012',
  number: 12,
  name: 'Aktenhydra',
  tier: 'ultra',
  kind: 'monster',
  element: 'Spuk',
  foil: 'art',
  draw(p) {
    archive(p)
    whirl(p, true)
    const d = p.layer()
    for (const h of HEADS) {
      neck(d, h)
      head(d, h)
    }
    p.subject(d, OUTLINE)
    avalanche(p)
    whirl(p, false)
    // ghost lights drifting round the heads
    for (const [x, y, size, lean, seed] of [[60, 26, 5, -1, 3], [63, 66, 4, 1, 4]] as const) {
      fire(p, flameMask(p, x, y, size, size * 1.8, { lean, tongues: 2, seed }), GHOST)
    }
  },
}
