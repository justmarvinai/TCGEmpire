import type { Painter, Pt } from '../../toolkit/index.ts'
import { Mask, colors, hex, noise, quad, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Überläufer (Ultra, spell). Brief: a young woman, waist-up, split exactly down the middle: the left
 * half an angel (white wing, halo, white dress, soft smile, blonde hair), the right half a devil
 * (black bat wing, small horn, black dress, smirk, dark violet hair). One hand beckons; a ribbon of
 * light leads from it to a small captured monster. The background splits along the same line: pale
 * sky with clouds on the left, dark crimson with embers on the right. Full art, 80×112.
 *
 * Composition: she faces the viewer in the middle; the split runs through the parting of her hair, her
 * face, her dress and the sky behind her. The wings mirror each other up to the top corners. The devil
 * arm reaches out to the right, palm up, fingers curling, and the ribbon runs from its fingertips
 * down to a little horned imp, collared and caught. Text plates float over rows 0–13 and 90–111.
 */
const SKY = colors('9cc8ec', 'c4e2f8', 'eaf6ff')
const CRIMSON = colors('16030a', '320812', '56101a', '842026')
const SKIN = colors('a8604c', 'dc9c7c', 'f6caa8', 'ffeadb')
const GOLD = colors('a0681c', 'e0b040', 'fbe896')
const VIOLET = colors('1a0c2a', '361a52', '5a2e80', '8458ac')
const WHITE = colors('7e8cb2', 'bcc8e4', 'eef2fc', 'ffffff')
const BLACK = colors('09060d', '1a1222', '2c2038', '453652')
const EYE = colors('4a90d8', 'e0203a')
const LIPS = hex('c4505e')
const OUTLINE = hex('140a14')

const P = (x: number, y: number): Pt => [x, y]
/** The split runs between column 39 and column 40. */
const MID = 40

/** The part of a mask on the angel (left) or the devil (right) side of the split. */
const left = (m: Mask): Mask => m.and(new Mask(m.w, m.h).rect(0, 0, MID, m.h))
const right = (m: Mask): Mask => m.and(new Mask(m.w, m.h).rect(MID, 0, m.w - MID, m.h))

function heavenAndHell(p: Painter): void {
  const sky = left(p.m().rect(0, 0, 80, 112))
  const hell = right(p.m().rect(0, 0, 80, 112))
  p.shine(true)
  // pale sky on the left, a few soft clouds
  p.dither(sky, SKY, (x, y) => 0.55 - (y - 14) / 110 + noise(x, y, 4, 6) * 0.25, 0.7)
  for (const [x, y, rx, ry, seed] of [
    [8, 30, 9, 4, 3],
    [24, 76, 12, 5, 7],
    [6, 66, 7, 3.5, 11],
    [30, 22, 7, 3, 5],
  ] as const) {
    const cloud = p.m().blob(x, y, rx, ry, seed, 0.25).and(sky)
    p.fill(cloud, WHITE[3])
    p.fill(cloud.clone().minus(cloud.moved(0, -2)), SKY[1])
  }
  // dark crimson on the right, glowing up from below
  p.dither(hell, CRIMSON, (x, y) => 0.1 + (y - 10) / 85 + noise(x, y, 8, 6) * 0.25, 0.7)
  p.shine(false)
}

/** The angel wing: long white feathers hanging from a bone that arches up to the top left corner. */
function featherWing(d: Painter): void {
  const bone = [P(37, 47), P(25, 33.5), P(13, 22), P(5, 17.5)] as const
  const along = (t: number): Pt => {
    const seg = Math.min(2, Math.floor(t * 3))
    const k = t * 3 - seg
    const a = bone[seg] ?? bone[0]
    const b = bone[seg + 1] ?? bone[3]
    return P(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
  }
  // primaries at the tip, secondaries towards the body; the inner ones overlap the outer ones
  for (let i = 13; i >= 0; i--) {
    const t = 0.04 + i * 0.07
    const [x, y] = along(t)
    const angle = ((96 + t * 34) * Math.PI) / 180
    const len = 11 + t * 22
    const feather = d.m().capsule(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, 2.4, 1.6)
    d.part(feather, WHITE, { bevel: 2, bias: i % 2 === 0 ? 0 : -1, line: 'shadow' })
  }
  // coverts: a band of short, rounded feathers along the bone
  const coverts = d.m().limb([...bone], [5, 4.6, 3.6, 1.6])
  d.part(coverts, WHITE, { bevel: 3 })
  for (let i = 0; i < 7; i++) {
    const [x, y] = along(0.08 + i * 0.13)
    d.fill(
      d
        .m()
        .ellipse(x - 1.5, y + 3.5, 2.2, 1.3, -40)
        .and(coverts),
      WHITE[1],
    )
  }
}

/** The devil wing: a bony arm up to the top right corner, a black membrane scalloped below. */
function batWing(d: Painter): void {
  const shoulder = P(43, 47)
  const elbow = P(55, 33)
  const wrist = P(67, 21)
  const tips = [P(79, 25), P(78, 42), P(70, 54), P(46, 60)] as const
  const edge: Pt[] = []
  for (let i = 0; i < 3; i++) {
    const a = tips[i] ?? wrist
    const b = tips[i + 1] ?? wrist
    edge.push(
      ...quad(
        a,
        P(((a[0] + b[0]) / 2) * 0.68 + wrist[0] * 0.32, ((a[1] + b[1]) / 2) * 0.68 + wrist[1] * 0.32),
        b,
        6,
      ),
    )
  }
  const membrane = d.m().poly([shoulder, elbow, wrist, ...edge])
  d.part(membrane, BLACK, { bevel: 5, bias: -1 })
  for (const tip of tips.slice(0, 3)) d.part(d.m().limb([wrist, tip], [1.2, 0.5]), BLACK, { line: 'shadow' })
  d.part(d.m().limb([shoulder, elbow, wrist], [2.6, 2, 1.5]), BLACK)
  d.part(d.m().poly([wrist[0] - 1.5, wrist[1] + 1, 70.5, 16.5, wrist[0] + 1.5, wrist[1] + 1]), BLACK, {
    bevel: 1,
  })
}

/**
 * The face, hand-pixelled and split down the middle: the left half angelic, the right devilish.
 * Y y z = blonde hair light to dark, V v w = violet hair light to dark, H S s d = skin from the
 * highlight to the shadow, l = lashes and brows, B b = the blue eye, r R = the crimson eye,
 * e = eye glint, m M = the mouth: a soft smile on the left, a smirk on the right.
 */
const FACE = [
  '......zyYYVVvw......',
  '....zyYYYYVVVVvw....',
  '...zyYYYYYVVVVVvw...',
  '..zyYYYYyyvvVVVVvw..',
  '.zyYYYyySSssvvVVVvw.',
  '.zyYYySSSSsssssVVvw.',
  '.zyYySHSSSssssdlVvw.',
  '.zyySlllSSssllldvvw.',
  '.zyySSSSSSsssssdvvw.',
  '.zyylllSSSsslllldvw.',
  '.zyylbBeSSserRldvvw.',
  '.zyySlbBSSssrRlsdvw.',
  '.zyySSSSSSsssssddvw.',
  '.zyySSSSSSdssssddvw.',
  '.zyyySSSSSdsssddvvw.',
  '.zyyySmSSSsssMddvvw.',
  '.zyyyySmmmMMMsdvvvw.',
  '.zyyyyySSSssddvvvvw.',
  '..zyyyyySSsdvvvvvw..',
  '..zyyyyyySdvvvvvvw..',
]
const FACE_KEY = {
  Y: GOLD[2],
  y: GOLD[1],
  z: GOLD[0],
  V: VIOLET[3],
  v: VIOLET[2],
  w: VIOLET[1],
  H: SKIN[3],
  S: SKIN[2],
  s: SKIN[1],
  d: SKIN[0],
  l: VIOLET[0],
  B: EYE[0],
  b: SKY[0],
  r: EYE[1],
  R: CRIMSON[2],
  e: WHITE[3],
  m: LIPS,
  M: CRIMSON[3],
}
const FACE_AT = P(30, 21)

function woman(d: Painter): void {
  const m = (): Mask => d.m()

  featherWing(d)
  batWing(d)

  // long hair falling behind the shoulders: gold on the left, violet on the right
  const hair = m().poly([31, 30, 27, 44, 25, 62, 33, 64, 40, 58, 47, 64, 55, 62, 53, 44, 49, 30])
  d.part(left(hair.clone()), GOLD, { bevel: 4, bias: -1 })
  d.part(right(hair.clone()), VIOLET, { bevel: 4 })

  // the dress: round shoulders, a narrow waist, the skirt flaring below; white left, black right
  const dress = m().poly([28, 48, 52, 48, 55, 53, 51, 63, 48, 74, 51, 92, 29, 92, 32, 74, 29, 63, 25, 53])
  d.part(left(dress.clone()), WHITE, { bevel: 6 })
  d.part(right(dress.clone()), BLACK, { bevel: 6 })
  // skin of the neck and a low neckline
  const skin = m().rect(37, 38, 6, 10).poly([33, 47, 47, 47, 40, 58])
  d.part(skin, SKIN, { bevel: 3 })
  // trim along the neckline and the waist: gold on the angel side, crimson on the devil side
  const trim = m().path([33, 47, 40, 58, 47, 47]).path([32, 73, 48, 73])
  d.fill(left(trim.clone()), GOLD[1])
  d.fill(right(trim.clone()), CRIMSON[3])

  // the angel hand rests on her breast
  d.part(m().limb([28, 51, 26, 63, 33, 62], [3, 2.6, 2.2]), SKIN, { bias: -1 })
  d.part(m().ellipse(35, 60, 2.8, 2.2, -20), SKIN)
  d.fill(m().path([34, 59, 37, 58]), SKIN[1])

  // the devil arm reaches out to the right, palm up, the fingers curling: come here
  d.part(m().limb([52, 51, 60, 61, 66, 57], [3, 2.6, 2.2]), SKIN)
  d.part(m().ellipse(68.5, 56.5, 3, 1.8), SKIN)
  d.stamp(['.d.d', 'd.d.'], 68, 53, { d: SKIN[1] })

  // locks falling over the shoulders in front
  d.part(m().limb([32, 38, 30, 48, 31, 57], [2.6, 2.3, 1.4]), GOLD)
  d.part(m().limb([48, 38, 50, 48, 49, 57], [2.6, 2.3, 1.4]), VIOLET)

  const face = d.layer().stamp(FACE, FACE_AT[0], FACE_AT[1], FACE_KEY)
  d.contact(face.mask()).blit(face)

  // a small horn on the devil side
  d.part(m().limb([47, 26, 49, 21, 52, 17.5], [1.7, 1.1, 0.5]), CRIMSON, { bevel: 1 })
}

/** The halo over the angel half, the ribbon of light to the captured imp, embers on the devil side. */
function charms(p: Painter): void {
  p.shine(true)
  const halo = p
    .m()
    .ellipse(MID, 18.5, 10, 2.6)
    .minus(p.m().ellipse(MID, 18.5, 8.4, 1.4))
  p.fill(left(halo), GOLD[2])

  // the imp: a little horned devil with bat wings, collared by the ribbon
  const imp = p
    .m()
    .disc(66, 76, 3.4)
    .ellipse(66, 82, 3, 3.4)
    .limb([64, 73.5, 62, 69.5], [1.1, 0.4])
    .limb([68, 73.5, 70, 69.5], [1.1, 0.4])
    .poly([63, 79, 57, 75, 58, 80, 60, 79, 61, 82])
    .poly([69, 79, 75, 75, 74, 80, 72, 79, 71, 82])
    .limb([68, 84, 72, 86, 74, 83], [1, 0.8, 0.4])
    .limb([64.5, 85, 64, 88], [1.1, 1])
    .limb([67.5, 85, 68, 88], [1.1, 1])
  p.fill(imp, CRIMSON[0])
  p.px(65, 76, GOLD[2])
  p.px(67, 76, GOLD[2])
  const ribbon = p.m().path(quad(P(71, 53), P(78, 66), P(67, 79), 14))
  p.fill(
    ribbon
      .outerEdge()
      .and(p.m().rect(MID, 0, 40, 112))
      .minus(imp),
    CRIMSON[3],
  )
  p.fill(ribbon, GOLD[2])
  p.fill(
    p
      .m()
      .ellipse(66, 79, 3.4, 1.2)
      .minus(p.m().ellipse(66, 79, 2.3, 0.4)),
    GOLD[2],
  )

  const rand = rng(84)
  for (let i = 0; i < 26; i++) {
    const x = MID + 1 + Math.floor(rand() * 38)
    const y = 14 + Math.floor(rand() * 76)
    if (p.subjectMask.has(x, y) || imp.grown(1).has(x, y)) continue
    p.px(x, y, i % 3 === 0 ? GOLD[2] : GOLD[1])
  }
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(rand() * 36)
    const y = 14 + Math.floor(rand() * 70)
    if (!p.subjectMask.has(x, y)) p.px(x, y, WHITE[3])
  }
  p.shine(false)
}

export const changeOfHeart: CardDef = {
  id: 'ygo-mrd-084',
  number: 84,
  name: 'Überläufer',
  tier: 'ultra',
  kind: 'spell',
  sub: 'normal',
  text: 'Kapere 1 Monster',
  // both skies, the halo, the ribbon, the embers and the glints shine; the woman and the imp stay matt
  foil: 'painted',
  draw(p) {
    heavenAndHell(p)
    const d = p.layer()
    woman(d)
    p.subject(d, OUTLINE)
    charms(p)
  },
}
