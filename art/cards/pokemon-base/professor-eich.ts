import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors, hex } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Professor Eich (Uncommon trainer). Brief: kind grey-haired professor in a lab coat, three
 * starter capsules on the table. Trainer art window, 68×48.
 */
const WALL = colors('2c4856', '3c6170', '558491')
const WOOD = colors('54301a', '86522a', 'b47638', 'd69c5a')
const SKIN = colors('9a5238', 'd48c60', 'f1b688', 'fcd8b2')
const HAIR = colors('474450', '77737f', 'a6a2ae', 'd2ced8')
const COAT = colors('7f8aa6', 'bcc5dc', 'edf1f9', 'ffffff')
const SHIRT = colors('6c1a2c', 'a82c3e')
const RED = colors('9c1a2a', 'dc3a40', 'ff938a')
const BOOKS = [hex('d8a43c'), hex('4f9a58'), RED[1], COAT[1], hex('5a78c8')]
const SCREEN = hex('7fe08a')
const INK = hex('1e1826')
const OUTLINE = hex('241a26')

function lab(p: Painter): void {
  p.dither(null, [WALL[2], WALL[1]], (_x, y) => y / 40, 0.5)

  // two shelves of books on the right
  for (const y of [9, 21]) {
    let x = 43
    for (let i = y; x < 66; i++) {
      const w = 2 + (i % 2)
      const h = 7 + ((i * 3) % 3)
      p.fill(p.m().rect(x, y - h, w, h), BOOKS[i % BOOKS.length] ?? INK)
      p.fill(p.m().rect(x + w - 1, y - h, 1, h), WALL[0])
      x += w + (i % 4 === 0 ? 2 : 0)
    }
    p.fill(p.m().rect(41, y, 27, 2), WOOD[1])
    p.fill(p.m().rect(41, y, 27, 1), WOOD[3])
  }

  // monitor with a growth curve on the left
  const screen = p.m().rect(3, 5, 13, 11)
  p.fill(screen.grown(1), INK)
  p.fill(screen, WALL[0])
  p.fill(p.m().path([4, 13, 7, 11, 9, 12, 12, 8, 15, 7]), SCREEN)
  p.fill(p.m().rect(8, 17, 3, 2), INK)

  // table
  p.fill(p.m().rect(0, 39, 68, 9), WOOD[1])
  p.fill(p.m().rect(0, 39, 68, 3), WOOD[2])
  p.fill(p.m().rect(0, 39, 68, 1), WOOD[3])
  p.fill(p.m().rect(0, 42, 68, 1), WOOD[0])
}

function professor(d: Painter): void {
  const m = (): Mask => d.m()

  // coat over a dark red shirt
  d.part(m().poly([10, 40, 12, 29, 18, 25, 35, 25, 41, 29, 43, 40]), COAT, { bevel: 6 })
  const shirt = m().poly([22, 25, 31.5, 25, 27, 34])
  d.fill(shirt, SHIRT[1])
  d.fill(shirt.facing([1, 0]), SHIRT[0])
  d.fill(m().path([21, 25, 26, 34]).path([32, 25, 27, 34]).path([26.5, 34, 26.5, 40]), COAT[0])
  d.px(28, 36, COAT[0]).px(28, 38, COAT[0])

  // arm presenting the capsules
  d.part(m().limb([39, 29.5, 44, 33, 47.5, 29], [3.4, 3, 2.6]), COAT, { bevel: 3 })
  d.part(m().ellipse(49, 26.5, 2.6, 2.2, -30), SKIN, { bevel: 2 })

  // neck with the shadow of the chin, head, ear
  d.part(m().rect(25, 21, 5, 5), SKIN, { bevel: 3 })
  d.tone(m().rect(25, 22, 5, 2), -1)
  const face = m()
    .ellipse(27, 14.5, 6.6, 7.6)
    .poly([21, 15, 33.5, 15, 31.5, 22, 28, 23.4, 25, 23.4, 22.5, 21.5])
  d.part(face, SKIN.slice(1), { bevel: 7 })
  d.part(m().ellipse(20.6, 15.5, 1.3, 2), SKIN, { bias: -1, bevel: 1.5 })

  // swept-back grey hair with sideburns
  const crown = [19.5, 14, 19.5, 9, 21, 5.5, 24, 3.2, 27, 4, 28.5, 2.4, 31, 4.2, 33, 3.6, 34.5, 7, 35, 12]
  const hairline = [33.6, 14, 33, 10, 30, 8, 25, 8.2, 22, 10, 21.4, 16]
  const hair = m()
    .poly([...crown, ...hairline])
    .poly([33, 10, 34.6, 12, 34, 17.5, 32.8, 15])
  d.part(hair, HAIR, { bevel: 3, line: 'none' })

  // face: brows, smiling eyes, nose, a kind smile
  const features = [
    'bbb...bbb',
    '.........',
    '.e.....e.',
    'e.e...e.e',
    '.........',
    '.....s...',
    '....ss...',
    '.m.....m.',
    '..mmmmm..',
  ]
  d.stamp(features, 23, 11, { b: HAIR[0], e: INK, s: SKIN[1], m: SKIN[0] })
}

/** A starter capsule standing on the table, with its shadow. */
function capsule(p: Painter, x: number, y: number): void {
  const ball = ['..kkk..', '.krhrk.', 'krhrrrk', 'kkkwkkk', 'kwwwwsk', '.kwssk.', '..kkk..']
  p.stamp(ball, x, y, { k: INK, r: RED[1], h: RED[2], w: COAT[3], s: COAT[1] })
  p.fill(p.m().rect(x + 1, y + 7, 6, 1), WOOD[0])
}

export const professorEich: CardDef = {
  id: 'pkm-base-067',
  number: 67,
  name: 'Professor Eich',
  tier: 'uncommon',
  kind: 'trainer',
  text: 'Wirf deine Hand ab und ziehe 7 Karten.',
  foil: 'none',
  draw(p) {
    lab(p)
    const d = p.layer()
    professor(d)
    p.subject(d, OUTLINE)
    capsule(p, 43, 33)
    capsule(p, 51, 34)
    capsule(p, 59, 33)
  },
}
