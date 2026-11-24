import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { bayer, colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Aufgegeben (Ultra), the cover card of Spell Ruler. Brief: small bone-white humanoid crouched on a
 * dark altar, leathery wings folded; its face is a single large stylised eye with a tear line (our
 * own glyph); one clawed hand outstretched, pulling a ghostly captured monster into its body.
 * Black-violet void with a giant faint eye glyph behind the figure, a few ritual candles. Full art,
 * 80×112.
 *
 * Composition: the giant eye fills the top of the void and stares straight out; its tear line falls
 * onto the head of the tiny figure that crouches under it on the altar, wings folded up behind it
 * like a closed cloak. Its right hand reaches out and has hooked a ghostly beast that streams in
 * from the top right; teal wisps run up the arm into its chest, and the ghost light catches its
 * right side. Candles burn at both ends of the altar. Text plates float over rows 0–13 and 90–111.
 */
const VOID = colors('05030a', '0d0617', '170b26', '221036', '30164a')
const GLYPH = colors('4a3414', '7c5a20', 'b88a30', 'f0c860')
const STONE = colors('0a0710', '181022', '281c36', '3e2e50')
const BONE = colors('3a2e48', '74687e', 'b4aab6', 'e6e0d6', 'fffaee')
const LEATHER = colors('22162a', '44324a', '6c5470')
const GHOST = colors('0e3a42', '1c7472', '3cb8a4', 'a2f2de')
const OUTLINE = hex('030106')

const P = (x: number, y: number): Pt => [x, y]

/** The giant eye behind the figure: centre, half width and half height of the almond. */
const EYE = { x: 40, y: 29, rx: 34, ry: 12 }
/** Where the clawed hand grips the ghost. */
const GRIP = P(55, 52)

/** An almond (the shape of the eye): two circle arcs meeting in sharp corners. */
function almond(p: Painter, cx: number, cy: number, rx: number, ry: number): Mask {
  const r = (rx * rx + ry * ry) / (2 * ry)
  return p
    .m()
    .disc(cx, cy + r - ry, r)
    .and(p.m().disc(cx, cy - r + ry, r))
}

function void_(p: Painter): void {
  // black-violet void, a little lighter round the eye, with slow mist
  p.dither(
    null,
    VOID,
    (x, y) => {
      const glow = Math.max(0, 1 - Math.hypot((x - EYE.x) * 0.6, y - EYE.y) / 34)
      return glow * 0.55 + noise(x, y, 3, 8) * 0.28 + 0.05 - y / 400
    },
    0.75,
  )

  // the giant eye glyph: almond rim, iris ring, the pupil a hole into the void, rays above and the
  // tear line falling from the lower lid
  p.shine(true)
  const { x, y, rx, ry } = EYE
  const lid = almond(p, x, y, rx, ry)
  const rim = lid.clone().minus(almond(p, x, y + 0.3, rx - 3, ry - 1.6))
  rim.each((px, py) => {
    const fade = Math.abs(px - x) / rx
    p.set(px, py, fade > 0.7 && bayer(px, py) < (fade - 0.7) * 2.5 ? VOID[4] : GLYPH[1])
  })
  const iris = p.m().disc(x, y, 10.5).minus(p.m().disc(x, y, 8.5))
  p.fill(iris, GLYPH[2])
  p.fill(p.m().disc(x, y, 8.5).minus(p.m().disc(x, y, 5)), VOID[3])
  p.dither(p.m().disc(x, y, 8.5).minus(p.m().disc(x, y, 5)), [VOID[3], GLYPH[0]], (px, py) => 1 - Math.hypot(px - x, py - y) / 9, 1)
  p.fill(p.m().disc(x, y, 5), VOID[0])
  p.fill(p.m().disc(x, y, 5).minus(p.m().disc(x, y, 4)), GLYPH[1])
  p.stamp(['gg', 'g.'], x - 3, y - 3, { g: GLYPH[3] })
  for (const a of [-2.2, -1.85, -1.57, -1.29, -0.94]) {
    const from = P(x + Math.cos(a) * 15.5, y + 3 + Math.sin(a) * 15.5)
    const to = P(x + Math.cos(a) * 19.5, y + 3 + Math.sin(a) * 19.5)
    p.fill(p.m().line(from[0], from[1], to[0], to[1]), GLYPH[1])
  }
  p.fill(p.m().rect(x - 0.5, y + ry - 1, 1, 6), GLYPH[2])
  p.shine(false)

  // the altar: a dark slab lit along its top edge, the faint glyph carved into its face
  const top = p.m().rect(14, 73, 52, 3)
  const block = p.m().rect(17, 76, 46, 36)
  p.fill(block, STONE[1])
  p.fill(block.facing([-1, 0]), STONE[2])
  p.fill(p.m().rect(17, 76, 46, 1), STONE[0])
  p.fill(top, STONE[2])
  p.fill(top.facing([0, -1]), STONE[3])
  p.fill(top.facing([0, 1]), STONE[1])
  p.fill(almond(p, 40, 83, 7, 3).minus(almond(p, 40, 83, 5, 1.6)), STONE[0])
  p.fill(p.m().disc(40, 83, 1.2), GLYPH[0])
}

/** A ritual candle standing on (x, y): a short bone-white stub with a flame and a glow. */
function candle(p: Painter, x: number, y: number, h: number): void {
  const wax = p.m().rect(x, y - h, 3, h)
  p.fill(wax, BONE[3])
  p.fill(wax.facing([1, 0]), BONE[2])
  p.fill(p.m().rect(x, y - h, 3, 1), BONE[4])
  p.shine(true)
  p.dither(p.m().disc(x + 1.5, y - h - 3, 4.5).minus(wax), [VOID[2], GLYPH[0]], (px, py) => 1.2 - Math.hypot(px - x - 1.5, py - y + h + 3) / 4.5, 1)
  p.stamp(['.g.', 'gfg', '.f.'], x, y - h - 4, { g: GLYPH[3], f: BONE[4] })
  p.shine(false)
}

/** The ghost's body streams in from the top right and thins out into the void. */
function wisps(p: Painter): void {
  p.shine(true)
  const tail = p
    .m()
    .limb([72, 44, 76, 40, 80, 36], [3.2, 2.6, 2])
    .limb([74, 46, 77, 48, 80, 47], [1.6, 1.2, 0.8])
    .limb([73, 34, 76, 27, 78, 19], [1.5, 1.1, 0.6])
  tail.each((x, y) => {
    const fade = (x - 70) / 12
    if (bayer(x, y) < fade * 0.7) return
    p.set(x, y, tail.has(x - 1, y - 1) ? GHOST[1] : GHOST[2])
  })
  p.shine(false)
}

/** The captured monster: a horned beast's head howling as the claws drag it in by the jaw. */
function ghost(g: Painter): void {
  const m = (): Mask => g.m()
  // neck and swept-back horns behind the head
  g.part(m().limb([67, 45, 72, 43.5, 77, 41], [4.2, 3.6, 3]), GHOST, { bias: -1 })
  g.part(m().limb([66, 38.5, 70, 34.5, 75, 32.5], [1.8, 1.3, 0.5]), GHOST, { bias: -1 })
  // the lower jaw hangs wide open, then the skull with its long snout
  const jaw = m().poly([60.5, 47.5, 54, 52, 55.5, 54.5, 64.5, 49.5])
  g.part(jaw, GHOST, { bias: -1 })
  const skull = m().ellipse(65, 43, 6.4, 5, -18).poly([61, 39.5, 53.5, 43, 53.5, 46, 61.5, 47])
  g.part(skull, GHOST)
  g.part(m().limb([64, 38.5, 68, 33.5, 72.5, 30.5], [1.9, 1.3, 0.5]), GHOST)
  // the howling mouth, fangs, and a hollow eye with a cold light in it
  g.fill(m().poly([54.5, 46.5, 61.5, 46.5, 62.5, 48.5, 56, 51.5]), GHOST[0])
  g.stamp(['w.w.w.'], 55, 46, { w: GHOST[3] })
  g.stamp(['w.w'], 56, 51, { w: GHOST[3] })
  g.stamp(['kkk', 'kee', '.kk'], 60, 40, { k: GHOST[0], e: GHOST[3] })
}

/**
 * The face: one big eye, our own glyph (almond lid, gold iris round the pupil, a tear line running
 * down the cheek). k = lid and tear, g G = iris, p = pupil.
 */
const FACE = ['..kkk..', '.kgGgk.', 'kgGpGgk', '.kgGgk.', '..kkk..', '...k...', '...k...']

function figure(d: Painter): void {
  const m = (): Mask => d.m()

  // leathery wings folded up behind it like a closed cloak, the wrist joints sticking up
  for (const flip of [1, -1]) {
    const x = (v: number): number => 40 + (v - 40) * flip
    const wing = m().poly([
      P(x(37), 55),
      P(x(31), 44),
      P(x(27.5), 35.5),
      P(x(25), 43),
      P(x(22), 49.5),
      P(x(24), 55),
      P(x(21.5), 61),
      P(x(30), 63.5),
    ])
    d.part(wing, LEATHER, { bias: -1, bevel: 3 })
    d.fill(m().path([x(27.5), 37, x(25.5), 48, x(25), 58]).and(wing.shrunk(1)), LEATHER[0])
    d.fill(m().path([x(28.5), 38, x(30), 50]).and(wing.shrunk(1)), LEATHER[2])
    d.part(m().poly([x(26.5), 37, x(27.5), 32.5, x(29), 37]), BONE, { bevel: 1 })
  }

  // crouched legs, knees up and apart, clawed feet gripping the altar
  for (const flip of [1, -1]) {
    const x = (v: number): number => 40 + (v - 40) * flip
    d.part(m().limb([x(37.5), 66, x(32.5), 62.5], [2.8, 2.3]), BONE, { bias: -1 })
    d.part(m().limb([x(32.5), 62.5, x(34), 70, x(34.5), 72.5], [2.3, 1.8, 1.6]), BONE)
    d.stamp(['b.b.b'], Math.round(x(34.5)) - 2 - (flip > 0 ? 1 : -1), 73, { b: BONE[3] })
  }

  // the bony body hunched between the knees, ribs showing
  const torso = m().ellipse(40, 59.5, 4.4, 6.2).ellipse(40, 65.5, 2.6, 2)
  d.part(torso, BONE)
  for (const y of [56.5, 59, 61.5])
    d.fill(m().path([36, y, 39, y + 1]).path([41, y + 1, 44, y]).and(torso.shrunk(1)), BONE[1])
  d.fill(m().rect(39.5, 55, 1, 8).and(torso.shrunk(1)), BONE[2])

  // left arm resting on the knee
  d.part(m().limb([35.5, 55, 30.5, 59, 32.5, 61.5], [1.9, 1.5, 1.3]), BONE)
  d.stamp(['b.b', '.b.'], 31, 62, { b: BONE[3] })

  // the head, low between the shoulders: one eye and a tear line
  d.part(m().disc(40, 50.5, 4.9), BONE)
  d.stamp(FACE, 37, 48, { k: OUTLINE, g: GLYPH[2], G: GLYPH[3], p: OUTLINE })

  // right arm reaching out, long claws hooked into the ghost
  d.part(m().limb([44.5, 55, 49, 53.5, GRIP[0] - 3, GRIP[1]], [1.9, 1.5, 1.3]), BONE)
  for (const [tx, ty] of [P(58.5, 49.5), P(59.5, 52), P(58, 54.5)])
    d.part(m().limb([GRIP[0] - 2, GRIP[1], tx, ty], [0.9, 0.5]), BONE, { line: 'shadow' })

  // the ghost light catches its right side
  d.tone(
    d
      .mask()
      .facing([1, 0, 0, -1])
      .and(m().rect(40, 30, 40, 50)),
    1,
  )
}

/** Teal wisps run from the ghost up the arm into the body, where the soul is swallowed. */
function absorb(p: Painter): void {
  p.shine(true)
  const rand = rng(6)
  for (let i = 0; i < 9; i++) {
    const t = i / 9
    const x = Math.round(GRIP[0] - 2 - t * 14 + (rand() - 0.5) * 2)
    const y = Math.round(GRIP[1] - 3 + t * 6 + (rand() - 0.5) * 3)
    p.px(x, y, i % 2 === 0 ? GHOST[3] : GHOST[2])
  }
  p.fill(p.m().disc(40, 59, 1.6), GHOST[2])
  p.px(40, 59, GHOST[3])
  p.shine(false)
}

export const relinquished: CardDef = {
  id: 'ygo-mrl-079',
  number: 79,
  name: 'Aufgegeben',
  tier: 'ultra',
  kind: 'monster',
  element: 'FINSTERNIS',
  sub: 'ritual',
  print: { level: 1, atk: 0, def: 0, type: 'Hexer' },
  // the giant eye, the candle flames, the ghost and the stolen soul shine; figure and altar stay matt
  foil: 'painted',
  draw(p) {
    void_(p)
    candle(p, 17, 73, 6)
    candle(p, 22, 73, 3)
    candle(p, 60, 73, 5)
    wisps(p)
    const g = p.layer()
    ghost(g)
    p.subject(g, GHOST[0])
    const d = p.layer()
    figure(d)
    p.subject(d, OUTLINE)
    absorb(p)
  },
}
