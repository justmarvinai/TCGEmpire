import type { Mask, Painter, RGB } from '../../toolkit/index.ts'
import { NONE, colors, hex, rays, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Pfandkönig (Grail, Beton). A stocky boar king sits square to the viewer on a throne of stacked beer
 * crates in a concrete hall. His crown is a giant crown cork worn upside down, so its crimped skirt makes
 * the points; a mantle of clear shrink-wrap film hangs from his shoulders with a bubble-wrap collar for
 * ermine, a chain of office carries a cap as its medallion, and he holds a golden bottle opener as his
 * sceptre and a beer in the other fist. Light falls in from the top left; a gold glow and rays stand
 * behind his head. Full art, 80×112.
 *
 * Composition: frontal and nearly symmetric like a coin portrait. The frame's plates cover rows 4–14 and
 * 91–106: the crown starts at row 15, the hooves rest on the footstool crate at row 86.
 */
const WALL = colors('121420', '1e2130', '2c3042', '40465c', '5c6478', '8a92a6')
const GOLD = colors('4a2a08', '8c5a14', 'c88e28', 'eeba44', 'ffe286')
const CRATE = colors('0a2214', '163e24', '246236', '3e8c4e')
const FUR = colors('140e10', '2a2022', '443632', '645246', '8a745e')
const SNOUT = colors('6a3e3c', 'a87068')
const FILM = colors('6a7a92', 'b4c2d4', 'e4eef8', 'ffffff')
const RED = colors('3a0c14', '7a1a24', 'b8303a')
const IVORY = hex('ece0c0')
const OUTLINE = hex('0c0a0e')

// ── the hall ────────────────────────────────────────────────────────────────

const HALO = { x: 40, y: 29 }

function hall(p: Painter): void {
  // concrete wall in big cast panels, a little brighter towards the throne
  p.dither(null, WALL, (x, y) => 0.36 - y / 400 - Math.abs(x - 40) / 300, 0.5)
  p.register(WALL)
  const seams = p.m()
  for (const y of [34, 62]) seams.rect(0, y, 80, 1)
  for (const [x, y0, y1] of [
    [20, 0, 34],
    [59, 0, 34],
  ] as const) {
    seams.rect(x, y0, 1, y1 - y0)
  }
  p.tone(seams, -1)
  // shafts of light falling from a high window at the top left
  const beam = p.m()
  for (let y = 0; y < 90; y++) {
    for (let x = 0; x < 80; x++) {
      const u = x - y * 0.55
      if ((u > -16 && u < -6) || (u > 5 && u < 11)) beam.add(x, y)
    }
  }
  p.tone(beam, 1)
  // gold glow and rays behind the king's head: bright rings round him, rays in alternate wedges
  const wedges = rays(p, HALO.x, HALO.y, 10, 0.03)
  const glow = p.m().ellipse(HALO.x, HALO.y, 37, 31)
  p.dither(
    glow,
    [WALL[3], GOLD[1], GOLD[2], GOLD[3], GOLD[4]],
    (x, y) => {
      const d = Math.hypot(x - HALO.x, (y - HALO.y) * 1.2) / 37
      return 1.18 - d * 1.22 + (wedges.has(x, y) ? 0.12 : -0.08)
    },
    0.2,
  )
  p.register(GOLD)
  // dust in the light
  const rand = rng(7)
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rand() * 80)
    const y = 15 + Math.floor(rand() * 70)
    if (beam.has(x, y) && !glow.has(x, y)) p.px(x, y, WALL[5])
  }
  // floor: concrete with a red runner to the throne and a few caps lying about
  p.fill(p.m().rect(0, 84, 80, 28), WALL[1])
  p.fill(p.m().rect(0, 84, 80, 1), WALL[3])
  const carpet = p.m().poly([26, 85, 54, 85, 62, 112, 18, 112])
  p.fill(carpet, RED[1])
  p.fill(carpet.facing([-1, 0, 1, 0]), GOLD[2])
  p.fill(p.m().rect(0, 85, 80, 1).and(carpet), RED[2])
  p.register(RED)
  for (const [x, y] of [
    [8, 88],
    [14, 86],
    [66, 87],
    [72, 89],
  ] as const) {
    p.stamp(['.l.', 'lmd', '.d.'], x, y, { l: GOLD[4], m: GOLD[3], d: GOLD[1] })
  }
}

// ── the throne ──────────────────────────────────────────────────────────────

/** A beer crate seen from the front: ribbed green plastic with a handle hole; bottle tops if `full`. */
function crate(p: Painter, x: number, y: number, w: number, h: number, full: boolean): void {
  const box = p.m().rect(x, y, w, h)
  if (full) {
    for (let bx = x + 2; bx < x + w - 1; bx += 4) {
      p.fill(p.m().rect(bx, y - 4, 2, 4), GOLD[0])
      p.fill(p.m().rect(bx, y - 4, 1, 4), GOLD[1])
      p.fill(p.m().rect(bx, y - 5, 2, 1), GOLD[3])
    }
  }
  p.fill(box, CRATE[2])
  p.fill(box.facing([0, -1]), CRATE[3])
  p.fill(box.facing([0, 1, 1, 0]), CRATE[1])
  // ribs and the handle hole
  for (let rx = x + 3; rx < x + w - 2; rx += 4) p.fill(p.m().rect(rx, y + 5, 1, h - 6), CRATE[1])
  p.fill(p.m().rect(x + Math.floor(w / 2) - 3, y + 2, 6, 2), CRATE[0])
  p.register(CRATE)
}

function throne(p: Painter): void {
  // two towers of crates frame the king, the backrest between them, then the seat and the footstool
  for (const x of [5, 60]) {
    for (const [y, full] of [
      [30, true],
      [41, false],
      [52, false],
      [63, false],
      [74, false],
    ] as const) {
      crate(p, x, y, 15, 11, full)
    }
  }
  crate(p, 20, 42, 20, 11, true)
  crate(p, 40, 42, 20, 11, true)
  crate(p, 20, 53, 20, 11, false)
  crate(p, 40, 53, 20, 11, false)
  crate(p, 18, 66, 22, 10, false)
  crate(p, 40, 66, 22, 10, false)
  crate(p, 19, 76, 21, 9, false)
  crate(p, 40, 76, 21, 9, false)
  crate(p, 26, 85, 28, 10, false)
  // the side towers stand in the shadow of the king's glow
  p.tone(
    p
      .m()
      .rect(5, 30, 15, 55)
      .rect(60, 30, 15, 55)
      .and(p.m().rect(0, 50, 80, 40)),
    -1,
  )
  // a red cushion on the seat
  const cushion = p.m().ellipse(40, 66.5, 21, 2.6)
  p.fill(cushion, RED[1])
  p.fill(cushion.facing([0, -1]), RED[2])
  p.fill(cushion.facing([0, 1]), RED[0])
}

// ── the king ────────────────────────────────────────────────────────────────

/** Mirror x round the middle of the king. */
const side = (s: number) => (v: number) => 40 + (v - 40) * s

/** Clear film over whatever lies behind it: the brightness of the colour beneath picks a cool grey. */
function film(d: Painter, p: Painter, m: Mask): void {
  m.each((x, y) => {
    const under: RGB = d.get(x, y) !== NONE ? d.get(x, y) : p.get(x, y)
    const lum =
      under === NONE ? 0 : ((under >> 16) & 255) * 0.3 + ((under >> 8) & 255) * 0.55 + (under & 255) * 0.15
    d.set(x, y, lum < 34 ? WALL[2] : lum < 62 ? WALL[3] : lum < 100 ? WALL[4] : FILM[1])
  })
}

function mantle(d: Painter, p: Painter): void {
  // it hangs behind him, so the seat shows between his knees
  const cape = d
    .m()
    .poly([27, 46, 53, 46, 63, 58, 71, 86, 58, 88, 40, 85, 22, 88, 9, 86, 17, 58])
    .minus(d.m().poly([34, 66, 46, 66, 49, 88, 31, 88]))
  film(d, p, cape)
  // the film is brightest where we look through it at a slant: along its edges and in its folds
  d.fill(cape.facing([-1, 0, 1, 0, 0, 1]), FILM[1])
  const folds = d.m()
  const glare = d.m()
  for (const s of [1, -1]) {
    const x = side(s)
    folds.path([x(25), 52, x(19), 70, x(16), 85]).path([x(31), 55, x(28), 72, x(28), 86])
    glare
      .path([x(24), 53, x(18), 69])
      .path([x(30), 60, x(28), 70])
      .path([x(15), 74, x(13), 82])
  }
  d.fill(folds.and(cape), FILM[0])
  d.fill(glare.moved(1, 0).and(cape), FILM[2])
  d.fill(glare.and(cape), FILM[3])
  d.register(FILM)
}

function boar(d: Painter, p: Painter): void {
  const m = (): Mask => d.m()
  mantle(d, p)

  // seated: the thighs come forward to the knees, the shins hang down to split hooves on the footstool
  for (const s of [1, -1]) {
    const x = side(s)
    d.part(m().limb([x(30), 76.5, x(29.5), 84.5], [3.5, 3.1]), FUR, { bevel: 3 })
    d.part(m().ellipse(x(29.5), 86.5, 4, 1.9), FUR, { bevel: 1.5, bias: -1 })
    d.fill(m().rect(x(29.5) - 0.5, 85.5, 1, 3), FUR[0])
    d.part(m().ellipse(x(30.5), 72.5, 7.2, 5), FUR, { bevel: 4 })
  }

  // round belly, broad shoulders with bristles standing off them
  const shoulders = m().ellipse(40, 52, 15.5, 6.5)
  for (const s of [1, -1]) {
    const x = side(s)
    shoulders.poly([x(25), 47, x(21), 49, x(24.5), 50.5, x(21.5), 53, x(26), 54])
  }
  d.part(shoulders, FUR, { bevel: 5 })
  d.part(m().ellipse(40, 60.5, 12, 9.5), FUR, { bevel: 7 })
  // bristles in the fur
  d.fill(
    m().path([31, 57, 32, 59]).path([49, 57, 48, 59]).path([34, 64, 35, 66]).path([46, 64, 45, 66]),
    FUR[1],
  )

  // the sceptre arm: the fist grips the opener's shaft beside the throne
  d.part(m().limb([26, 51, 21.5, 57, 21, 61], [4, 3.5, 3.2]), FUR, { bevel: 3 })
  sceptre(d)
  d.part(m().ellipse(20.5, 62, 3.6, 3), FUR, { bevel: 2 })
  d.fill(m().path([18, 62, 22, 62]), FUR[1])
  // the other arm rests on the throne, a beer in the fist
  d.part(m().limb([54, 51, 58.5, 57, 59, 61], [4, 3.5, 3.2]), FUR, { bevel: 3 })
  beer(d)
  d.part(m().ellipse(59.5, 62, 3.6, 3), FUR, { bevel: 2 })
  d.fill(m().path([58, 62, 62, 62]), FUR[1])

  // chain of office over the belly, a crown cork as its medallion
  const chain = m()
  for (const s of [1, -1]) {
    const x = side(s)
    chain.path([x(28), 50, x(31), 54, x(35), 56.5, x(38), 57])
  }
  d.fill(chain, GOLD[3])
  chain.each((x, y) => {
    if ((x + y) % 3 === 0) d.set(x, y, GOLD[1])
  })
  d.stamp(['.d.d.d.', 'dllllmd', '.llmmm.', 'dlmrmmd', '.mmmmm.', 'dmmmmmd', '.d.d.d.'], 36.5, 56, {
    d: GOLD[1],
    l: GOLD[4],
    m: GOLD[3],
    r: RED[2],
  })

  // collar of bubble wrap round the shoulders
  const collar = m().ellipse(40, 47, 15.5, 4.3)
  d.part(collar, FILM, { bevel: 2 })
  for (let y = 44; y < 51; y += 2) {
    for (let x = 26 + (y % 4 === 0 ? 1 : 0); x < 55; x += 3) {
      if (collar.shrunk(1).has(x, y) && collar.shrunk(1).has(x + 1, y + 1))
        d.px(x, y, FILM[3]).px(x + 1, y + 1, FILM[0])
    }
  }

  head(d)
}

function head(d: Painter): void {
  const m = (): Mask => d.m()
  // ears, tall and bristly, pointing up and out
  for (const s of [1, -1]) {
    const x = side(s)
    const ear = m().poly([x(30.5), 30, x(22), 15.5, x(35.5), 24])
    d.part(ear, FUR, { bevel: 2 })
    d.fill(
      m()
        .poly([x(30.5), 27, x(25), 19, x(33.5), 24.5])
        .and(ear.shrunk(1)),
      SNOUT[0],
    )
  }
  // a wedge of a head: broad skull, heavy jowls with bristles standing out of the cheeks
  const skull = m().ellipse(40, 30, 12.5, 9.5)
  const jowls = m().ellipse(40, 38.5, 15, 7.5)
  for (const s of [1, -1]) {
    const x = side(s)
    jowls.poly([x(27), 33, x(21.5), 36, x(26), 38, x(22), 42, x(27.5), 42, x(25.5), 45, x(31), 44])
  }
  d.part(skull.or(jowls), FUR, { bevel: 6 })
  // the glow behind him catches the top edges of ears, skull and cheek bristles
  const ears = m()
  for (const s of [1, -1]) ears.poly([side(s)(30.5), 30, side(s)(22), 15.5, side(s)(35.5), 24])
  d.fill(
    ears
      .or(skull)
      .or(jowls)
      .facing([0, -1])
      .and(m().rect(0, 0, 80, 40)),
    GOLD[2],
  )
  // the snout, foreshortened, with the flat nose disc at its end
  const snout = m().poly([34, 32, 46, 32, 45.5, 42, 34.5, 42])
  d.part(snout, FUR, { bevel: 4, bias: 1, line: 'shadow' })
  d.fill(m().path([36.5, 36, 43.5, 36]).path([37, 39, 43, 39]), FUR[2])
  const nose = m().ellipse(40, 44.5, 6.6, 3.6)
  d.part(nose, SNOUT, { bevel: 2 })
  d.stamp(['kk...kk', 'kk...kk'], 36.5, 44, { k: FUR[0] })
  // tusks curving up and out from beside the snout
  for (const s of [1, -1]) {
    const x = side(s)
    const tusk = m().limb([x(34), 47, x(30), 45.5, x(27.5), 39.5], [1.9, 1.5, 0.8])
    d.part(tusk, [FILM[0], FILM[1], IVORY, FILM[3]], { bevel: 1.5 })
  }
  // fierce little eyes under heavy brows
  d.stamp(['kkkk.....kkkk', '.kkkk...kkkk.', '...rw...wr...'], 33.5, 29, { k: FUR[0], r: RED[2], w: GOLD[4] })
  crown(d)
}

/** A giant crown cork worn upside down: the crimped skirt flares up into the points of the crown. */
function crown(d: Painter): void {
  const shape = d.m()
  for (let y = 15; y < 24; y++) {
    const half = 7.5 + (23 - y) * 0.3
    for (let x = Math.round(40 - half); x < Math.round(40 + half); x++) {
      if (y < 17 && (x % 2 === 0) === (y === 15)) continue
      shape.add(x, y)
    }
  }
  shape.each((x, y) => {
    const pleat = x % 3
    const c = y >= 21 ? GOLD[2] : pleat === 0 ? GOLD[4] : pleat === 1 ? GOLD[3] : GOLD[1]
    d.set(x, y, c)
  })
  d.fill(shape.facing([0, 1]), GOLD[0])
  d.fill(d.m().rect(32, 21, 16, 1).and(shape), GOLD[3])
  d.stamp(['.r.', 'rwr', '.r.'], 39, 20, { r: RED[2], w: FILM[3] })
  d.register(GOLD)
}

/** The sceptre: a golden bottle opener on a long shaft, a ball at its foot. */
function sceptre(d: Painter): void {
  const shaft = d.m().rect(19, 30, 2, 56)
  d.fill(shaft, GOLD[2])
  d.fill(shaft.facing([-1, 0]), GOLD[3])
  // the opener: a flat head with a D-shaped opening; its flat top edge is the lip that lifts the cap
  const head = d.m().ellipse(20, 23, 6, 6.5).rect(17.5, 27, 5, 4)
  const hole = d
    .m()
    .ellipse(20, 22.5, 3.6, 3.6)
    .minus(d.m().rect(0, 0, 80, 22))
  d.part(head.minus(hole), GOLD, { bevel: 2 })
  d.fill(hole, WALL[1])
  d.fill(d.m().rect(17, 21, 6, 1), GOLD[4])
  d.part(d.m().disc(20, 86, 2.3), GOLD, { bevel: 1.5 })
}

/** A brown beer bottle with a gold cap in the resting fist. */
function beer(d: Painter): void {
  const glass = d.m().rect(57, 52, 5, 9).rect(58, 46, 3, 6)
  d.part(glass, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], { bevel: 1.5, bias: -1 })
  d.fill(d.m().rect(57.5, 45, 4, 1), GOLD[3])
  d.fill(d.m().rect(58, 53, 1, 5), GOLD[3])
}

export const pfandkoenig: CardDef = {
  id: 'emp4-024',
  number: 24,
  name: 'Pfandkönig',
  tier: 'grail',
  kind: 'monster',
  element: 'Beton',
  foil: 'art',
  draw(p) {
    hall(p)
    throne(p)
    const d = p.layer()
    boar(d, p)
    p.subject(d, OUTLINE)
  },
}
