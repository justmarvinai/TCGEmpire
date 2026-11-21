import type { Mask, Painter, Points } from '../../toolkit/index.ts'
import { colors, hex, pts, rays, sky } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Pikachu (Common). Brief: chubby yellow mouse mid-hop, cheeks glowing yellow with charge,
 * sunny meadow with berry bushes. Classic art window, 68×48.
 */
const SKY = colors('58aef0', '80c4f6', 'aedcfb', 'def2ff')
const CLOUD = colors('c4e2fa', 'ffffff')
const HILL = colors('58a878', '7cc48a')
const GRASS = colors('2c7436', '479a3c', '72be46', 'a4da5c')
const BUSH = colors('17502e', '26703a', '3f9440')
const BERRY = colors('a81c30', 'e8404a', 'ffa0a0')
const YELLOW = colors('a2601a', 'd6961e', 'f3be2e', 'fbd93e', 'fff3a0')
const BROWN = colors('5a3210', '96581a', 'c07a2a')
const BLACK = colors('1c1420', '3c3448')
const MOUTH = colors('7e2230', 'f28a94')
const GLOW = hex('fffbe6')
const SPARK = hex('ffe45c')
const OUTLINE = hex('3a2010')

function meadow(p: Painter): void {
  // sky with soft rays from the sun in the corner
  sky(p, SKY, 0, 31, 0.6)
  p.register(SKY)
  p.tone(rays(p, 5, 3, 9, 0.02).and(p.m().rect(0, 0, 68, 31)), 1)
  p.fill(p.m().disc(4, 3, 7.5), YELLOW[4])
  p.fill(p.m().disc(4, 3, 5.5), GLOW)

  const cloud = (x: number, y: number, s: number) => {
    const puffs = p.m().ellipse(x, y, 6 * s, 2.6 * s)
    puffs.ellipse(x - 2 * s, y - 2 * s, 3 * s, 2.4 * s).ellipse(x + 2.4 * s, y - 1.4 * s, 2.6 * s, 2 * s)
    p.fill(puffs, CLOUD[1])
    p.fill(puffs.clone().minus(puffs.moved(0, -1)), CLOUD[0])
  }
  cloud(51, 8, 1)
  cloud(24, 5, 0.7)

  // far hills, then the meadow getting darker towards the viewer
  const hills = p.m().ellipse(14, 34, 22, 8).ellipse(52, 35, 26, 9)
  p.fill(hills, HILL[1])
  p.fill(hills.clone().minus(hills.moved(-2, 2)), HILL[0])
  p.dither(p.m().rect(0, 31, 68, 17), [GRASS[3], GRASS[2], GRASS[1]], (_x, y) => (y - 31) / 16, 0.7)
  for (const [x, y] of pts([20, 36, 47, 35, 9, 45, 57, 46, 26, 46, 44, 42, 50, 40, 18, 41])) {
    p.px(x, y, GRASS[0])
    p.px(x + 1, y - 1, GRASS[0])
    p.px(x + 2, y, GRASS[0])
  }
  for (const [x, y] of pts([23, 39, 46, 46, 53, 37, 15, 46])) p.px(x, y, CLOUD[1])

  // berry bushes left and right; every lump is x, y, rx, ry
  const bush = (lumps: readonly number[], seed: number, berries: Points) => {
    const m = p.m()
    for (let i = 0; i + 3 < lumps.length; i += 4) {
      m.blob(lumps[i] ?? 0, lumps[i + 1] ?? 0, lumps[i + 2] ?? 0, lumps[i + 3] ?? 0, seed + i / 4, 0.14)
    }
    p.shade(m.and(p.m().rect(0, 0, 68, 46)), BUSH, { bevel: 5 })
    for (const [x, y] of pts(berries)) p.stamp(['hb', 'bd'], x, y, { h: BERRY[2], b: BERRY[1], d: BERRY[0] })
  }
  bush([4, 35, 9, 8, 12, 40, 7, 5.5, 1, 27, 5, 5], 3, [2, 30, 8, 33, 4, 38, 12, 39, 9, 28])
  bush([63, 34, 9, 8.5, 55, 40, 6.5, 5.5, 66, 25, 5, 5], 8, [58, 32, 64, 36, 61, 27, 56, 40, 65, 42])

  // shadow on the grass: the mouse is in the air
  p.fill(p.m().ellipse(34.5, 45.5, 9, 1.6), GRASS[0])
}

function mouse(d: Painter): void {
  const m = (): Mask => d.m()

  // lightning-bolt tail: three slanted bars stepping down to the body, widest at the tip
  const tail = m().poly([13, 27, 5, 27, 2, 13, 11, 13])
  tail.poly([19, 34, 13.5, 34, 10.5, 24, 16, 24]).poly([26.5, 39, 22, 39, 16.5, 31, 20, 31])
  d.part(tail, YELLOW, { bevel: 3 })
  const tailBase = m().poly([28, 40, 21, 40, 17, 33.5, 28, 33.5])
  d.shade(tailBase.and(tail), BROWN, { bevel: 3 })

  // ears with black tips
  const ear = (shape: Points, tipX: number, tipY: number) => {
    const e = m().poly(shape)
    d.part(e, YELLOW, { bevel: 2.5 })
    d.shade(m().disc(tipX, tipY, 5.2).and(e), BLACK, { bevel: 2 })
  }
  ear([25.5, 14, 30.5, 10.5, 20.5, 0.6, 18.6, 2.2], 19.5, 1.5)
  ear([39, 10, 44, 13.5, 52.4, 3, 50.6, 1], 51.5, 2)

  // chubby body and head as one shape with a soft chin line, then the feet
  const head = m().ellipse(35, 18.5, 11, 8.8)
  const torso = m().ellipse(34, 30.5, 10.5, 10)
  d.part(head.clone().or(torso), YELLOW)
  d.tone(head.facing([0, 1]).and(torso.shrunk(2)), -1)
  d.part(m().ellipse(28, 40.8, 4.2, 2.4, -14), YELLOW, { bevel: 2 })
  d.part(m().ellipse(41, 41.2, 4.2, 2.4, 14), YELLOW, { bevel: 2 })

  // arms thrown up
  d.part(m().capsule(26, 28, 20.5, 23.5, 2.6, 2.2), YELLOW, { bevel: 2.5 })
  d.part(m().capsule(43.5, 28, 49, 23, 2.6, 2.2), YELLOW, { bevel: 2.5 })

  // face: eyes with a glint, nose, open smile, cheeks glowing with charge
  const eye = ['.kk.', 'kwkk', 'kkkk', '.kk.']
  d.stamp(eye, 28, 15, { k: BLACK[0], w: GLOW })
  d.stamp(eye, 38, 15, { k: BLACK[0], w: GLOW })
  d.px(35, 19, BLACK[0])
  const smile = ['k.....k', '.kkkkk.', '.krrrk.', '..ktk..', '...k...']
  d.stamp(smile, 32, 20, { k: YELLOW[0], r: MOUTH[0], t: MOUTH[1] })
  const cheek = ['..ooo..', '.ohhho.', 'ohhggho', 'ohgggho', 'ohhggho', '.ohhho.', '..ooo..']
  d.stamp(cheek, 23, 18, { o: YELLOW[2], h: YELLOW[4], g: GLOW })
  d.stamp(cheek, 41, 18, { o: YELLOW[2], h: YELLOW[4], g: GLOW })
}

/** Sparks jumping off the cheeks: crisp zigzags with a drop shadow so they hold on the sky. */
function charge(p: Painter): void {
  const big = ['.....y', '....y.', '..yyy.', '..y...', '.y....', 'y.....']
  const small = ['...y', '.yy.', '.y..', 'y...']
  const spark = (grid: readonly string[], x: number, y: number, flip: boolean) => {
    const shape = p.layer().stamp(grid, x, y, { y: SPARK }, flip)
    p.fill(shape.mask().moved(1, 1), YELLOW[0])
    p.blit(shape)
  }
  spark(big, 16, 9, true)
  spark(big, 48, 9, false)
  spark(small, 52, 17, false)
  spark(small, 11, 8, true)
  for (const [x, y] of pts([57, 14, 46, 7, 14, 5, 9, 12])) p.px(x, y, SPARK)
}

export const pikachu: CardDef = {
  id: 'pkm-base-028',
  number: 28,
  name: 'Pikachu',
  tier: 'common',
  kind: 'pokemon',
  type: 'Elektro',
  hp: 40,
  attacks: [
    { name: 'Nagen', cost: ['Farblos'], damage: '10' },
    { name: 'Donnerschock', cost: ['Elektro', 'Farblos'], damage: '30' },
  ],
  foil: 'none',
  draw(p) {
    meadow(p)
    const d = p.layer()
    mouse(d)
    p.subject(d, OUTLINE)
    charge(p)
  },
}
