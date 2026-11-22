import type { PokemonType } from '../cards/types.ts'
import type { Painter, Ramp } from '../toolkit/index.ts'
import { colors, hex, lightning, mix, rng, sky, sparks, stars } from '../toolkit/index.ts'
import { INK } from './shape.ts'

// Simple element scenes behind a kit subject: a dithered sky, a ground band and two or three
// shapes. Variant 0 is the day scene, variant 1 the night (or storm) scene, so an Alternative card
// can differ from its base card.

/** Ground line of every scene; subjects stand 12 px below it. */
export const HORIZON = 33

interface Look {
  sky: Ramp
  ground: Ramp
  /** Shapes between sky and ground; `g` is the ground line. */
  deco(p: Painter, g: number): void
  /** Shapes on the ground. */
  floor?(p: Painter, g: number): void
}

const cloud = (p: Painter, x: number, y: number, s: number, ramp: Ramp) => {
  const m = p.m().ellipse(x, y, 6 * s, 2.4 * s).ellipse(x - 2 * s, y - 1.8 * s, 3 * s, 2.2 * s).ellipse(x + 2.2 * s, y - 1.2 * s, 2.6 * s, 1.9 * s)
  p.fill(m, ramp[1] ?? 0)
  p.fill(m.clone().minus(m.moved(0, -1)), ramp[0] ?? 0)
}

const hills = (p: Painter, g: number, ramp: Ramp, seed: number) => {
  const m = p.m().ellipse(10 + seed, g + 3, 22, 8).ellipse(56 - seed, g + 4, 24, 9)
  p.fill(m, ramp[1] ?? 0)
  p.fill(m.clone().minus(m.moved(-2, 2)), ramp[0] ?? 0)
}

const disc = (p: Painter, x: number, y: number, r: number, ramp: Ramp) => {
  p.fill(p.m().disc(x, y, r + 1.5), ramp[0] ?? 0)
  p.fill(p.m().disc(x, y, r), ramp[1] ?? 0)
}

const LOOKS: Readonly<Record<PokemonType, readonly [Look, Look]>> = {
  Feuer: [
    {
      sky: colors('f0843a', 'f7ad58', 'fcd789'),
      ground: colors('b4582e', '8c3e24'),
      deco(p, g) {
        disc(p, 50, 14, 6, colors('fbe3a0', 'fff4c8'))
        const mesa = p.m().poly([0, g, 0, 20, 9, 19, 12, 24, 20, 24, 24, g]).poly([44, g, 47, 26, 58, 25, 61, 21, 68, 21, 68, g])
        p.fill(mesa, hex('c2633a'))
        p.fill(mesa.clone().minus(mesa.moved(0, 1)), hex('dc8048'))
      },
    },
    {
      sky: colors('2a0e22', '5a1628', '9a2c24'),
      ground: colors('4a1a1e', '2e1018'),
      deco(p, g) {
        const cone = p.m().poly([30, g, 44, 16, 52, 16, 66, g])
        p.fill(cone, hex('3a1420'))
        p.fill(p.m().poly([44, 16, 52, 16, 50, 20, 46, 20]), hex('f07020'))
        sparks(p, rng(4), 18, colors('f07020', 'ffc040'), { x: 2, y: 2, w: 64, h: g - 4 })
      },
    },
  ],
  Wasser: [
    {
      sky: colors('6cb8ee', '9ad2f6', 'cdebfb'),
      ground: colors('f2dca4', 'dcbc80'),
      deco(p, g) {
        cloud(p, 14, 9, 1, colors('cfe6f8', 'ffffff'))
        p.fill(p.m().rect(0, g - 7, 68, 7), hex('3a8ed8'))
        p.fill(p.m().rect(0, g - 7, 68, 1), hex('a8def8'))
        for (const [x, y] of [[8, g - 4], [30, g - 3], [50, g - 5]] as const) p.fill(p.m().rect(x, y, 6, 1), hex('a8def8'))
      },
    },
    {
      sky: colors('0c1636', '1a2f5e', '2e5288'),
      ground: colors('1a4a8a', '123672'),
      deco(p) {
        stars(p, rng(9), 14, colors('dfe8ff'), { x: 2, y: 2, w: 64, h: 18 })
        disc(p, 54, 9, 4.5, colors('c8d8f0', 'f4f6e0'))
      },
      floor(p, g) {
        for (let i = 0; i < 4; i++) {
          const y = g + 2 + i * 4
          for (let x = (i * 7) % 12; x < 68; x += 12) p.fill(p.m().rect(x, y, 5, 1), hex('5a9ad8'))
        }
      },
    },
  ],
  Pflanze: [
    {
      sky: colors('a6dcef', 'c8ecf2', 'e6f7ea'),
      ground: colors('6ab04a', '4a8c38'),
      deco(p, g) {
        const canopy = p.m().blob(4, 8, 13, 11, 3).blob(64, 6, 12, 12, 5).blob(10, g - 3, 12, 6, 7).blob(60, g - 2, 12, 6, 8)
        p.fill(canopy, hex('3f8a3c'))
        p.fill(canopy.clone().minus(canopy.moved(1, 2)), hex('6cb454'))
      },
    },
    {
      sky: colors('d8913c', 'eeb460', 'f8d88e'),
      ground: colors('4a7a34', '34592a'),
      deco(p, g) {
        for (const [x, w] of [[6, 4], [19, 3], [50, 3], [61, 5]] as const) p.fill(p.m().rect(x, 0, w, g + 2), hex('6a4428'))
        const leaves = p.m().blob(10, 2, 16, 8, 2).blob(58, 3, 16, 9, 6)
        p.fill(leaves, hex('2f5a30'))
      },
    },
  ],
  Elektro: [
    {
      sky: colors('f2d45c', 'f8e48a', 'fff4c0'),
      ground: colors('8c8aa0', '6c6a82'),
      deco(p, g) {
        const tower = (x: number) => {
          const m = p.m().poly([x - 4, g, x - 1, 6, x + 1, 6, x + 4, g]).minus(p.m().poly([x - 2, g, x, 12, x + 2, g]))
          m.rect(x - 6, 9, 12, 1).rect(x - 5, 15, 10, 1)
          p.fill(m, hex('4a4a5e'))
        }
        tower(8)
        tower(60)
        p.fill(p.m().path([2, 10, 20, 13, 34, 14, 48, 13, 66, 10]), hex('4a4a5e'))
        cloud(p, 34, 5, 1.2, colors('a8a4b8', 'cfcad8'))
      },
    },
    {
      sky: colors('10142e', '1e2450', '34346a'),
      ground: colors('2a2a44', '1c1c30'),
      deco(p, g) {
        cloud(p, 14, 6, 1.4, colors('2a2a4c', '46466e'))
        cloud(p, 52, 4, 1.2, colors('2a2a4c', '46466e'))
        lightning(p, [56, 7], [62, g - 2], hex('fff8a8'), { seed: 3, jag: 2.5, glow: hex('8a8cf0') })
        lightning(p, [12, 8], [6, g - 6], hex('fff8a8'), { seed: 8, jag: 2, glow: hex('8a8cf0') })
      },
    },
  ],
  Psycho: [
    {
      sky: colors('b78ad8', 'd2aeea', 'ecd8f6'),
      ground: colors('9a68c0', '7c4ea4'),
      deco(p, g) {
        const rings = p.m()
        for (let y = 0; y < g; y++) for (let x = 0; x < 68; x++) if (Math.floor(Math.hypot(x - 34, y - 18) / 4) % 2 === 0) rings.add(x, y)
        p.register(colors('b78ad8', 'd2aeea', 'ecd8f6'))
        p.tone(rings, 1)
      },
    },
    {
      sky: colors('140a26', '2a1448', '45226a'),
      ground: colors('2c1846', '1e1032'),
      deco(p) {
        stars(p, rng(13), 20, colors('e8d8ff', 'b090f0'), { x: 2, y: 2, w: 64, h: 26 })
        const moon = p.m().disc(52, 10, 6).minus(p.m().disc(55, 8, 5.5))
        p.fill(moon, hex('f4e8c0'))
      },
    },
  ],
  Kampf: [
    {
      sky: colors('e8c890', 'f2dcb0', 'faf0d8'),
      ground: colors('c08a54', 'a06c3e'),
      deco(p, g) {
        const rocks = p.m().poly([0, g, 0, 14, 6, 10, 12, 16, 16, g]).poly([50, g, 54, 18, 60, 14, 68, 17, 68, g]).blob(30, g, 5, 2.5, 2)
        p.fill(rocks, hex('9a6a46'))
        p.fill(rocks.clone().minus(rocks.moved(1, 1)), hex('c49464'))
      },
    },
    {
      sky: colors('5a2440', 'a4404a', 'e88a58'),
      ground: colors('6a4030', '4c2c24'),
      deco(p, g) {
        disc(p, 18, 20, 5, colors('f2a868', 'ffd890'))
        const peaks = p.m().poly([0, g, 10, 18, 20, g]).poly([14, g, 30, 12, 46, g]).poly([40, g, 56, 16, 68, 24, 68, g])
        p.fill(peaks, hex('4a2436'))
      },
    },
  ],
  Farblos: [
    {
      sky: colors('6cb8ee', '9ad0f6', 'd8f0ff'),
      ground: colors('76c04a', '58a03c'),
      deco(p, g) {
        cloud(p, 50, 8, 1, colors('cfe6f8', 'ffffff'))
        cloud(p, 16, 5, 0.75, colors('cfe6f8', 'ffffff'))
        hills(p, g, colors('5aa878', '7cc48a'), 0)
      },
    },
    {
      sky: colors('141e48', '22346a', '3a5488'),
      ground: colors('2e5a3e', '22462e'),
      deco(p, g) {
        stars(p, rng(21), 16, colors('f0f0ff'), { x: 2, y: 2, w: 64, h: 22 })
        disc(p, 52, 11, 6, colors('d8dcc0', 'fbf6dc'))
        hills(p, g, colors('1e3a3a', '2a4a48'), 4)
      },
    },
  ],
}

/** Paint the scene of an element. */
export function scene(p: Painter, element: PokemonType, variant: 0 | 1): void {
  const look = LOOKS[element][variant]
  const g = HORIZON
  sky(p, look.sky, 0, g, 0.7)
  look.deco(p, g)
  p.dither(p.m().rect(0, g, p.w, p.h - g), look.ground, (_x, y) => (y - g) / (p.h - g - 1), 0.6)
  look.floor?.(p, g)
}

/** Shadow of a subject on the ground. */
export function shadow(p: Painter, element: PokemonType, variant: 0 | 1, x: number, y: number, rx: number): void {
  const ground = LOOKS[element][variant].ground
  p.fill(p.m().ellipse(x, y, rx, Math.max(1.2, rx * 0.18)), mix(ground[ground.length - 1] ?? INK, INK, 0.35))
}
