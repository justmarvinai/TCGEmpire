import { MICRO, REGULAR, drawText } from '../fonts.ts'
import { colors, hex } from '../toolkit/index.ts'
import type { ProductDef } from './index.ts'

/**
 * Card back of the Pokémon game: a blue vortex around a capsule, in the spirit of the original
 * but our own design. Like the original it reads the same upside down (except the capsule).
 */
const BLUE = colors('0e1c52', '16307e', '2150b0', '3478d8', '62a8f0')
const GOLD = colors('8a5a0e', 'e9b62a', 'ffe272')
const RED = colors('8e1424', 'd8323a', 'ff8c84')
const WHITE = colors('9aa8c8', 'dfe6f6', 'ffffff')
const INK = hex('0a0f2c')

export const pokemonCardBack: ProductDef = {
  id: 'pkm-card-back',
  w: 80,
  h: 112,
  draw(p) {
    const cx = 40
    const cy = 56

    // vortex: two spiral arms that brighten towards the centre
    p.dither(
      null,
      BLUE,
      (x, y) => {
        const dx = x + 0.5 - cx
        const dy = (y + 0.5 - cy) * 0.82
        const r = Math.hypot(dx, dy)
        const arm = Math.sin(Math.atan2(dy, dx) * 2 + r * 0.19)
        return 0.86 - r / 62 + arm * 0.2
      },
      0.7,
    )

    // name band on top
    const band = p.m().rect(6, 10, 68, 13)
    p.fill(band.grown(1), INK)
    p.fill(band, GOLD[1])
    p.fill(band.facing([0, -1]), GOLD[2])
    p.fill(band.facing([0, 1]), GOLD[0])
    // bold lettering: every glyph is drawn twice, one pixel apart
    let x = 9
    for (const ch of 'TCG EMPIRE') {
      if (ch !== ' ') drawText(p, ch, x + 1, 13, REGULAR, INK)
      x += ch === ' ' ? 3 : drawText(p, ch, x, 13, REGULAR, INK) + 2
    }
    drawText(p, 'SAMMELKARTEN', 40, 27, MICRO, BLUE[4], { align: 'center' })

    // the lower half repeats the upper half, turned by 180 degrees
    for (let y = 0; y < 56; y++) {
      for (let x = 0; x < 80; x++) p.set(79 - x, 111 - y, p.get(x, y))
    }

    // capsule in the eye of the vortex
    const ball = p.m().disc(cx, cy, 15)
    p.fill(ball.grown(2), BLUE[4])
    p.fill(ball.grown(1), INK)
    p.shade(ball.clone().and(p.m().rect(0, 0, 80, cy)), RED, { bevel: 15 })
    p.shade(ball.clone().and(p.m().rect(0, cy, 80, 56)), WHITE, { bevel: 15 })
    p.fill(
      p
        .m()
        .rect(cx - 15, cy - 2, 30, 4)
        .and(ball),
      INK,
    )
    const button = p.m().disc(cx, cy, 5)
    p.fill(button, INK)
    p.fill(p.m().disc(cx, cy, 3.5), WHITE[2])
    p.fill(p.m().disc(cx, cy, 1.5), WHITE[1])
    p.fill(p.m().ellipse(cx - 6, cy - 8, 3, 2, -30), RED[2])

    // frame
    const card = p.m().rect(0, 0, 80, 112)
    const corners = p.m()
    ;[3, 1, 1].forEach((cut, row) => {
      for (let i = 0; i < cut; i++)
        corners
          .add(i, row)
          .add(79 - i, row)
          .add(i, 111 - row)
          .add(79 - i, 111 - row)
    })
    const border = card.clone().minus(p.m().rect(3, 3, 74, 106))
    p.fill(border, BLUE[1])
    p.fill(card.facing([-1, 0, 0, -1]), BLUE[3])
    p.fill(card.facing([1, 0, 0, 1]), BLUE[0])
    p.fill(p.m().rect(3, 3, 74, 106).facing(), GOLD[1])
    p.erase(corners)
  },
}
