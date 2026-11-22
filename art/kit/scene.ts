import type { PokemonType } from '../cards/types.ts'
import type { Mask, Painter, Ramp, RGB } from '../toolkit/index.ts'
import { colors, hex, lightning, mix, rays, rng, sky, sparks, stars } from '../toolkit/index.ts'
import { INK } from './shape.ts'
import { Stage } from './stage.ts'

// Simple element scenes behind a kit subject: a dithered sky, a ground band and two or three
// shapes. Variant 0 is the day scene, variant 1 the night (or storm) scene, so an Alternative card
// can differ from its base card. Shapes are placed in design space (68×48, ground line 33) and
// mapped onto the painter by its stage, so every scene fits every picture size.

interface Look {
  sky: Ramp
  ground: Ramp
  /** Shapes between sky and ground. */
  deco(p: Painter, st: Stage): void
  /** Shapes on the ground. */
  floor?(p: Painter, st: Stage): void
}

const cloud = (p: Painter, x: number, y: number, s: number, ramp: Ramp) => {
  const m = p.m().ellipse(x, y, 6 * s, 2.4 * s).ellipse(x - 2 * s, y - 1.8 * s, 3 * s, 2.2 * s).ellipse(x + 2.2 * s, y - 1.2 * s, 2.6 * s, 1.9 * s)
  p.fill(m, ramp[1] ?? 0)
  p.fill(m.clone().minus(m.moved(0, -1)), ramp[0] ?? 0)
}

const hills = (p: Painter, st: Stage, ramp: Ramp, seed: number) => {
  const m = p.m().ellipse(st.x(10 + seed), st.y(36), st.x(22), st.y(8)).ellipse(st.x(56 - seed), st.y(37), st.x(24), st.y(9))
  p.fill(m, ramp[1] ?? 0)
  p.fill(m.clone().minus(m.moved(-2, 2)), ramp[0] ?? 0)
}

const disc = (p: Painter, x: number, y: number, r: number, ramp: Ramp) => {
  p.fill(p.m().disc(x, y, r + 1.5), ramp[0] ?? 0)
  p.fill(p.m().disc(x, y, r), ramp[1] ?? 0)
}

const POKEMON: Readonly<Record<PokemonType, readonly [Look, Look]>> = {
  Feuer: [
    {
      sky: colors('f0843a', 'f7ad58', 'fcd789'),
      ground: colors('b4582e', '8c3e24'),
      deco(p, st) {
        disc(p, st.x(50), st.y(14), st.r(6), colors('fbe3a0', 'fff4c8'))
        const mesa = p.m().poly(st.pts([0, 33, 0, 20, 9, 19, 12, 24, 20, 24, 24, 33])).poly(st.pts([44, 33, 47, 26, 58, 25, 61, 21, 68, 21, 68, 33]))
        p.fill(mesa, hex('c2633a'))
        p.fill(mesa.clone().minus(mesa.moved(0, 1)), hex('dc8048'))
      },
    },
    {
      sky: colors('2a0e22', '5a1628', '9a2c24'),
      ground: colors('4a1a1e', '2e1018'),
      deco(p, st) {
        const cone = p.m().poly(st.pts([30, 33, 44, 16, 52, 16, 66, 33]))
        p.fill(cone, hex('3a1420'))
        p.fill(p.m().poly(st.pts([44, 16, 52, 16, 50, 20, 46, 20])), hex('f07020'))
        sparks(p, rng(4), st.n(18), colors('f07020', 'ffc040'), { x: 2, y: 2, w: p.w - 4, h: st.g - 4 })
      },
    },
  ],
  Wasser: [
    {
      sky: colors('6cb8ee', '9ad2f6', 'cdebfb'),
      ground: colors('f2dca4', 'dcbc80'),
      deco(p, st) {
        cloud(p, st.x(14), st.y(9), st.r(1), colors('cfe6f8', 'ffffff'))
        p.fill(p.m().rect(0, st.y(26), p.w, st.g - st.y(26)), hex('3a8ed8'))
        p.fill(p.m().rect(0, st.y(26), p.w, 1), hex('a8def8'))
        for (const [x, y] of [[8, 29], [30, 30], [50, 28]] as const) p.fill(p.m().rect(st.x(x), st.y(y), st.x(6), 1), hex('a8def8'))
      },
    },
    {
      sky: colors('0c1636', '1a2f5e', '2e5288'),
      ground: colors('1a4a8a', '123672'),
      deco(p, st) {
        stars(p, rng(9), st.n(14), colors('dfe8ff'), { x: 2, y: 2, w: p.w - 4, h: st.y(18) })
        disc(p, st.x(54), st.y(9), st.r(4.5), colors('c8d8f0', 'f4f6e0'))
      },
      floor(p, st) {
        for (let i = 0; st.g + 2 + i * 4 < p.h; i++) {
          const y = st.g + 2 + i * 4
          for (let x = (i * 7) % 12; x < p.w; x += 12) p.fill(p.m().rect(x, y, 5, 1), hex('5a9ad8'))
        }
      },
    },
  ],
  Pflanze: [
    {
      sky: colors('a6dcef', 'c8ecf2', 'e6f7ea'),
      ground: colors('6ab04a', '4a8c38'),
      deco(p, st) {
        const canopy = p
          .m()
          .blob(st.x(4), st.y(8), st.x(13), st.y(11), 3)
          .blob(st.x(64), st.y(6), st.x(12), st.y(12), 5)
          .blob(st.x(10), st.y(30), st.x(12), st.y(6), 7)
          .blob(st.x(60), st.y(31), st.x(12), st.y(6), 8)
        p.fill(canopy, hex('3f8a3c'))
        p.fill(canopy.clone().minus(canopy.moved(1, 2)), hex('6cb454'))
      },
    },
    {
      sky: colors('d8913c', 'eeb460', 'f8d88e'),
      ground: colors('4a7a34', '34592a'),
      deco(p, st) {
        for (const [x, w] of [[6, 4], [19, 3], [50, 3], [61, 5]] as const) p.fill(p.m().rect(st.x(x), 0, st.x(w), st.y(35)), hex('6a4428'))
        const leaves = p.m().blob(st.x(10), st.y(2), st.x(16), st.y(8), 2).blob(st.x(58), st.y(3), st.x(16), st.y(9), 6)
        p.fill(leaves, hex('2f5a30'))
      },
    },
  ],
  Elektro: [
    {
      sky: colors('f2d45c', 'f8e48a', 'fff4c0'),
      ground: colors('8c8aa0', '6c6a82'),
      deco(p, st) {
        const tower = (x: number) => {
          const m = p.m().poly(st.pts([x - 4, 33, x - 1, 6, x + 1, 6, x + 4, 33])).minus(p.m().poly(st.pts([x - 2, 33, x, 12, x + 2, 33])))
          m.rect(st.x(x - 6), st.y(9), st.x(12), 1).rect(st.x(x - 5), st.y(15), st.x(10), 1)
          p.fill(m, hex('4a4a5e'))
        }
        tower(8)
        tower(60)
        p.fill(p.m().path(st.pts([2, 10, 20, 13, 34, 14, 48, 13, 66, 10])), hex('4a4a5e'))
        cloud(p, st.x(34), st.y(5), st.r(1.2), colors('a8a4b8', 'cfcad8'))
      },
    },
    {
      sky: colors('10142e', '1e2450', '34346a'),
      ground: colors('2a2a44', '1c1c30'),
      deco(p, st) {
        cloud(p, st.x(14), st.y(6), st.r(1.4), colors('2a2a4c', '46466e'))
        cloud(p, st.x(52), st.y(4), st.r(1.2), colors('2a2a4c', '46466e'))
        lightning(p, [st.x(56), st.y(7)], [st.x(62), st.y(31)], hex('fff8a8'), { seed: 3, jag: st.r(2.5), glow: hex('8a8cf0') })
        lightning(p, [st.x(12), st.y(8)], [st.x(6), st.y(27)], hex('fff8a8'), { seed: 8, jag: st.r(2), glow: hex('8a8cf0') })
      },
    },
  ],
  Psycho: [
    {
      sky: colors('b78ad8', 'd2aeea', 'ecd8f6'),
      ground: colors('9a68c0', '7c4ea4'),
      deco(p, st) {
        const rings = p.m()
        for (let y = 0; y < st.g; y++) for (let x = 0; x < p.w; x++) if (Math.floor(Math.hypot(x - st.x(34), y - st.y(18)) / st.r(4)) % 2 === 0) rings.add(x, y)
        p.register(colors('b78ad8', 'd2aeea', 'ecd8f6'))
        p.tone(rings, 1)
      },
    },
    {
      sky: colors('140a26', '2a1448', '45226a'),
      ground: colors('2c1846', '1e1032'),
      deco(p, st) {
        stars(p, rng(13), st.n(20), colors('e8d8ff', 'b090f0'), { x: 2, y: 2, w: p.w - 4, h: st.y(26) })
        const moon = p.m().disc(st.x(52), st.y(10), st.r(6)).minus(p.m().disc(st.x(55), st.y(8), st.r(5.5)))
        p.fill(moon, hex('f4e8c0'))
      },
    },
  ],
  Kampf: [
    {
      sky: colors('e8c890', 'f2dcb0', 'faf0d8'),
      ground: colors('c08a54', 'a06c3e'),
      deco(p, st) {
        const rocks = p
          .m()
          .poly(st.pts([0, 33, 0, 14, 6, 10, 12, 16, 16, 33]))
          .poly(st.pts([50, 33, 54, 18, 60, 14, 68, 17, 68, 33]))
          .blob(st.x(30), st.g, st.x(5), st.y(2.5), 2)
        p.fill(rocks, hex('9a6a46'))
        p.fill(rocks.clone().minus(rocks.moved(1, 1)), hex('c49464'))
      },
    },
    {
      sky: colors('5a2440', 'a4404a', 'e88a58'),
      ground: colors('6a4030', '4c2c24'),
      deco(p, st) {
        disc(p, st.x(18), st.y(20), st.r(5), colors('f2a868', 'ffd890'))
        const peaks = p.m().poly(st.pts([0, 33, 10, 18, 20, 33])).poly(st.pts([14, 33, 30, 12, 46, 33])).poly(st.pts([40, 33, 56, 16, 68, 24, 68, 33]))
        p.fill(peaks, hex('4a2436'))
      },
    },
  ],
  Farblos: [
    {
      sky: colors('6cb8ee', '9ad0f6', 'd8f0ff'),
      ground: colors('76c04a', '58a03c'),
      deco(p, st) {
        cloud(p, st.x(50), st.y(8), st.r(1), colors('cfe6f8', 'ffffff'))
        cloud(p, st.x(16), st.y(5), st.r(0.75), colors('cfe6f8', 'ffffff'))
        hills(p, st, colors('5aa878', '7cc48a'), 0)
      },
    },
    {
      sky: colors('141e48', '22346a', '3a5488'),
      ground: colors('2e5a3e', '22462e'),
      deco(p, st) {
        stars(p, rng(21), st.n(16), colors('f0f0ff'), { x: 2, y: 2, w: p.w - 4, h: st.y(22) })
        disc(p, st.x(52), st.y(11), st.r(6), colors('d8dcc0', 'fbf6dc'))
        hills(p, st, colors('1e3a3a', '2a4a48'), 4)
      },
    },
  ],
}


// ── motifs of the other games' scenes (design space) ─────────────────────────

/** Lift the pixels of a ramp one step inside a mask (sunbursts, glows on a dithered sky). */
const lift = (p: Painter, ramp: Ramp, m: Mask) => {
  p.register(ramp)
  p.tone(m, 1)
}

const burst = (p: Painter, st: Stage, ramp: Ramp, x: number, y: number, n = 10) =>
  lift(p, ramp, rays(p, st.x(x), st.y(y), n, 0.02).and(p.m().rect(0, 0, p.w, st.g)))

const silhouette = (p: Painter, m: Mask, c: RGB) => p.fill(m, c)

/** Columns with a capital: light left edge, dark right edge. */
const pillars = (p: Painter, st: Stage, xs: readonly number[], c: Ramp) => {
  for (const x of xs) {
    const col = p.m().rect(st.x(x - 2.5), st.y(9), st.x(5), st.g - st.y(9)).rect(st.x(x - 3.5), st.y(7), st.x(7), st.y(2.4))
    p.fill(col, c[1] ?? 0)
    p.edge(col, c[2] ?? 0, [-1, 0])
    p.edge(col, c[0] ?? 0, [1, 0])
  }
}

/** Bamboo stalks with darker nodes. */
const bamboo = (p: Painter, st: Stage, xs: readonly number[], c: Ramp) => {
  for (const x of xs) {
    const w = Math.max(2, Math.round(st.x(2.4)))
    p.fill(p.m().rect(st.x(x), 0, w, st.g + 1), c[1] ?? 0)
    p.fill(p.m().rect(st.x(x), 0, 1, st.g + 1), c[2] ?? 0)
    for (let y = (x * 3) % 7; y < st.g; y += Math.round(st.y(8))) p.fill(p.m().rect(st.x(x), y, w, 1), c[0] ?? 0)
  }
}

const torii = (p: Painter, st: Stage, x: number, c: RGB) => {
  const m = p.m()
    .rect(st.x(x - 9), st.y(16), st.x(2.4), st.g - st.y(16))
    .rect(st.x(x + 6.6), st.y(16), st.x(2.4), st.g - st.y(16))
    .poly(st.pts([x - 13, 13, x + 13, 13, x + 12, 15.5, x - 12, 15.5]))
    .rect(st.x(x - 10), st.y(19), st.x(20), st.y(1.6))
  silhouette(p, m, c)
}

const pagoda = (p: Painter, st: Stage, x: number, c: RGB) => {
  const m = p.m()
  for (let i = 0; i < 3; i++) {
    const y = 14 + i * 6
    const w = 6 + i * 2.5
    m.poly(st.pts([x - w, y + 2, x + w, y + 2, x + w * 0.6, y - 1, x - w * 0.6, y - 1])).rect(st.x(x - w * 0.5), st.y(y + 2), st.x(w), st.y(4))
  }
  m.poly(st.pts([x - 1, 13, x + 1, 13, x, 8]))
  silhouette(p, m, c)
}

const castle = (p: Painter, st: Stage, c: RGB) => {
  const m = p.m()
  for (const [x, top, w] of [[8, 16, 6], [20, 22, 9], [47, 12, 7], [58, 19, 8]] as const) {
    m.rect(st.x(x - w / 2), st.y(top), st.x(w), st.g - st.y(top)).poly(st.pts([x - w / 2 - 1, top, x + w / 2 + 1, top, x, top - w * 0.9]))
  }
  m.rect(st.x(8), st.y(26), st.x(50), st.g - st.y(26))
  silhouette(p, m, c)
}

const tombs = (p: Painter, st: Stage, c: RGB) => {
  const m = p.m()
  for (const [x, h] of [[7, 6], [19, 4.5], [50, 5], [62, 7]] as const) m.rect(st.x(x - 2.5), st.y(33 - h), st.x(5), st.y(h)).disc(st.x(x), st.y(33 - h), st.r(2.5))
  m.rect(st.x(33.5), st.y(22), st.x(1.4), st.y(11)).rect(st.x(31), st.y(25), st.x(6.4), st.y(1.4))
  m.poly(st.pts([12, 33, 13, 18, 14.5, 33])).limb(st.pts([13, 22, 9, 17, 7, 16]), st.r(0.6)).limb(st.pts([13.6, 20, 17, 15]), st.r(0.6))
  silhouette(p, m, c)
}

const ship = (p: Painter, st: Stage, x: number, y: number, c: RGB) => {
  const m = p.m().poly(st.pts([x - 6, y - 2, x + 6, y - 2, x + 4, y, x - 4, y])).rect(st.x(x - 0.5), st.y(y - 10), 1, st.y(8))
  m.poly(st.pts([x - 0.3, y - 9.5, x + 4.5, y - 6, x - 0.3, y - 3]))
  silhouette(p, m, c)
}

const spires = (p: Painter, st: Stage, c: RGB) => {
  const m = p.m()
  for (const [x, h, w] of [[3, 20, 4], [12, 12, 3], [56, 18, 4], [64, 25, 4], [44, 9, 3]] as const) m.poly(st.pts([x - w, 33, x - 0.6, 33 - h, x + 0.6, 33 - h, x + w, 33]))
  silhouette(p, m, c)
}

const rings = (p: Painter, st: Stage, c: RGB) => {
  const m = p.m()
  for (const [r, w] of [[13, 0.9], [9, 0.9]] as const) m.or(p.m().disc(st.x(34), st.y(15), st.r(r)).minus(p.m().disc(st.x(34), st.y(15), st.r(r) - w)))
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    m.disc(st.x(34) + Math.cos(a) * st.r(13), st.y(15) + Math.sin(a) * st.r(13), st.r(1.4))
  }
  silhouette(p, m, c)
}

const spiral = (p: Painter, st: Stage, ramp: Ramp) => {
  const m = p.m()
  for (let y = 0; y < st.g; y++) {
    for (let x = 0; x < p.w; x++) {
      const dx = x - st.x(34)
      const dy = y - st.y(15)
      const a = Math.atan2(dy, dx) / (Math.PI * 2)
      if (Math.floor((Math.hypot(dx, dy) / st.r(5) + a * 2) % 2) === 0) m.add(x, y)
    }
  }
  lift(p, ramp, m)
}

const glitch = (p: Painter, st: Stage) => {
  const rand = rng(17)
  for (let i = 0; i < st.n(9); i++) {
    const x = Math.floor(rand() * (p.w - 6)) + 2
    const y = Math.floor(rand() * (st.g - 6)) + 2
    p.stamp(i % 2 ? ['ccc.'] : ['.mm', 'mm.'], x, y, { c: hex('7af0f0'), m: hex('f070d0') })
  }
}

const OTHER = {
  // Yu-Gi-Oh! attributes (ERDE, WASSER, FEUER and WIND reuse the Pokémon scenes)
  LICHT: [
    {
      sky: colors('e8c050', 'f4dc90', 'fff4d0'),
      ground: colors('f0e4c0', 'd4c49c'),
      deco(p, st) {
        burst(p, st, colors('e8c050', 'f4dc90', 'fff4d0'), 34, 4, 12)
        cloud(p, st.x(10), st.y(28), st.r(1.5), colors('f0e4c8', 'fffcf4'))
        cloud(p, st.x(58), st.y(29), st.r(1.3), colors('f0e4c8', 'fffcf4'))
      },
    },
    {
      sky: colors('7a6ab8', 'e898a8', 'ffd8a0'),
      ground: colors('c8a878', 'a08460'),
      deco(p, st) {
        burst(p, st, colors('7a6ab8', 'e898a8', 'ffd8a0'), 34, 33, 14)
        disc(p, st.x(34), st.g, st.r(8), colors('ffd890', 'fff0c0'))
      },
    },
  ],
  FINSTERNIS: [
    {
      sky: colors('120a1e', '261440', '42205e'),
      ground: colors('2c1a3a', '1a1026'),
      deco(p, st) {
        stars(p, rng(31), st.n(12), colors('c8b0f0'), { x: 2, y: 2, w: p.w - 4, h: st.y(20) })
        p.fill(p.m().disc(st.x(52), st.y(9), st.r(5.5)).minus(p.m().disc(st.x(54.5), st.y(7.5), st.r(5))), hex('e0d0f0'))
        tombs(p, st, hex('0c0614'))
      },
    },
    {
      sky: colors('1a0810', '3a1020', '6a1a28'),
      ground: colors('2a1418', '180a0e'),
      deco(p, st) {
        disc(p, st.x(50), st.y(11), st.r(7), colors('a02a2a', 'e05040'))
        castle(p, st, hex('120608'))
      },
    },
  ],
  // Backdrops of spells and traps without an element
  Zauber: [
    {
      sky: colors('124a4a', '1e7068', '3aa08a'),
      ground: colors('1e4a46', '123430'),
      deco(p, st) {
        burst(p, st, colors('124a4a', '1e7068', '3aa08a'), 34, 18, 12)
      },
    },
    {
      sky: colors('0e2a3a', '1a4a5a', '2a7078'),
      ground: colors('163a40', '0e262c'),
      deco(p, st) {
        stars(p, rng(41), st.n(16), colors('8ae8d8', 'e0fff8'), { x: 2, y: 2, w: p.w - 4, h: st.g - 4 })
      },
    },
  ],
  Falle: [
    {
      sky: colors('3a1238', '6a1e5a', 'a03a7a'),
      ground: colors('3a1a32', '220e1e'),
      deco(p, st) {
        burst(p, st, colors('3a1238', '6a1e5a', 'a03a7a'), 34, 18, 12)
      },
    },
    {
      sky: colors('200a20', '42143c', '6a2058'),
      ground: colors('2a1026', '180814'),
      deco(p, st) {
        stars(p, rng(43), st.n(14), colors('f0a0d8'), { x: 2, y: 2, w: p.w - 4, h: st.g - 4 })
      },
    },
  ],
  // One Piece colours (Blau reuses the Pokémon water scenes)
  Rot: [
    {
      sky: colors('c83a3a', 'ee7448', 'f8b868'),
      ground: colors('9a6034', '6e4022'),
      deco(p, st) {
        disc(p, st.x(48), st.y(22), st.r(7), colors('f8d890', 'fff0c0'))
        p.fill(p.m().rect(0, st.y(23), p.w, st.g - st.y(23)), hex('8a3048'))
        for (const [x, y, w] of [[40, 25, 16], [44, 28, 9], [8, 27, 7], [24, 30, 6]] as const) p.fill(p.m().rect(st.x(x), st.y(y), st.x(w), 1), hex('f0a070'))
        ship(p, st, 15, 23, hex('4a1a2a'))
      },
      floor: planks,
    },
    {
      sky: colors('120c22', '2a1a3a', '5a2a4a'),
      ground: colors('5a3a2a', '3a2418'),
      deco(p, st) {
        stars(p, rng(51), st.n(14), colors('f0e0f0'), { x: 2, y: 2, w: p.w - 4, h: st.y(18) })
        disc(p, st.x(18), st.y(10), st.r(5), colors('d8c8a8', 'fff4dc'))
        p.fill(p.m().rect(0, st.y(24), p.w, st.g - st.y(24)), hex('241430'))
        for (const [x, y, w] of [[12, 26, 12], [16, 29, 6], [44, 27, 8]] as const) p.fill(p.m().rect(st.x(x), st.y(y), st.x(w), 1), hex('8a6a8a'))
      },
      floor: planks,
    },
  ],
  Grün: [
    {
      sky: colors('a8cc80', 'cce4a8', 'eef6d8'),
      ground: colors('5a9a40', '3e7a30'),
      deco(p, st) {
        const mount = p.m().poly(st.pts([14, 33, 34, 9, 54, 33]))
        p.fill(mount, hex('9ab89a'))
        p.fill(mount.and(p.m().poly(st.pts([28, 15, 34, 9, 40, 15, 37, 17, 34, 15, 31, 17]))), hex('f0f4ec'))
        bamboo(p, st, [3, 9, 58, 64], colors('2a5a2a', '3a7a3a', '6aa860'))
      },
    },
    {
      sky: colors('3a2440', '9a4a5a', 'f0a070'),
      ground: colors('3a4a2a', '24321c'),
      deco(p, st) {
        torii(p, st, 34, hex('2a1420'))
        sparks(p, rng(53), st.n(14), colors('f8b0c8', 'fff0f4'), { x: 2, y: 2, w: p.w - 4, h: st.g - 2 })
      },
    },
  ],
  Lila: [
    {
      sky: colors('2a1438', '4a2662', '7a4a90'),
      ground: colors('3a2a4a', '24182e'),
      deco(p, st) {
        cloud(p, st.x(16), st.y(7), st.r(1.6), colors('24123a', '3a2252'))
        cloud(p, st.x(54), st.y(5), st.r(1.3), colors('24123a', '3a2252'))
        lightning(p, [st.x(52), st.y(8)], [st.x(58), st.y(30)], hex('f0d8ff'), { seed: 5, jag: st.r(2.5), glow: hex('9a5ae0') })
      },
    },
    {
      sky: colors('140a20', '2a1440', '4a2468'),
      ground: colors('2a1a38', '1a1024'),
      deco(p, st) {
        stars(p, rng(57), st.n(16), colors('e0c8ff'), { x: 2, y: 2, w: p.w - 4, h: st.y(24) })
        disc(p, st.x(50), st.y(11), st.r(6.5), colors('c0a0e0', 'f0e0ff'))
        cloud(p, st.x(18), st.y(20), st.r(1.4), colors('1e1030', '2e1a46'))
      },
    },
  ],
  // Riftbound domains (Body reuses the Pokémon canyon and sunset scenes)
  Fury: [
    {
      sky: colors('4a1018', '8a2420', 'd0582e'),
      ground: colors('4a2420', '2e1612'),
      deco(p, st) {
        spires(p, st, hex('24080c'))
        sparks(p, rng(61), st.n(16), colors('f07020', 'ffc040'), { x: 2, y: 2, w: p.w - 4, h: st.g - 4 })
      },
    },
    POKEMON.Feuer[1],
  ],
  Calm: [
    {
      sky: colors('86bca0', 'b4d8c0', 'e0f0e0'),
      ground: colors('5a9a6a', '3e7a52'),
      deco(p, st) {
        pagoda(p, st, 46, hex('6c9c84'))
        bamboo(p, st, [4, 10, 61], colors('2e6a42', '4a8a5a', '7ab888'))
      },
    },
    {
      sky: colors('3a2a4a', 'a8607a', 'f0b890'),
      ground: colors('3a5a48', '28402f'),
      deco(p, st) {
        torii(p, st, 34, hex('2a1a2a'))
        for (const [x, y] of [[8, 10], [20, 6], [50, 8], [61, 12]] as const) p.stamp(['.o.', 'ooo', '.o.'], Math.round(st.x(x)), Math.round(st.y(y)), { o: hex('ffb060') })
      },
    },
  ],
  Mind: [
    {
      sky: colors('0e1634', '1c3064', '345a9a'),
      ground: colors('243868', '162448'),
      deco(p, st) {
        stars(p, rng(71), st.n(14), colors('c0d8ff'), { x: 2, y: 2, w: p.w - 4, h: st.g - 6 })
        rings(p, st, hex('6aa8f0'))
      },
    },
    {
      sky: colors('283868', '6a78b0', 'e0b080'),
      ground: colors('4a4a68', '32324a'),
      deco(p, st) {
        const m = p.m()
        for (const [x, top, w] of [[8, 10, 7], [20, 18, 6], [50, 6, 6], [60, 15, 8]] as const) m.rect(st.x(x - w / 2), st.y(top), st.x(w), st.g - st.y(top)).poly(st.pts([x - w / 2, top, x + w / 2, top, x, top - 4]))
        silhouette(p, m, hex('1e2240'))
        for (const [x, y] of [[8, 13], [50, 9]] as const) p.fill(p.m().disc(st.x(x), st.y(y), st.r(1.6)), hex('f0d890'))
      },
    },
  ],
  Chaos: [
    {
      sky: colors('1a0a28', '3a1452', '6a2a82'),
      ground: colors('2a1238', '180a22'),
      deco(p, st) {
        spiral(p, st, colors('1a0a28', '3a1452', '6a2a82'))
        glitch(p, st)
      },
    },
    POKEMON.Psycho[1],
  ],
  Order: [
    {
      sky: colors('d8c890', 'efe2b8', 'fffaf0'),
      ground: colors('e4dccc', 'c4b8a4'),
      deco(p, st) {
        burst(p, st, colors('d8c890', 'efe2b8', 'fffaf0'), 34, 2, 12)
        pillars(p, st, [8, 60], colors('b8ac98', 'ece6da', 'fffcf4'))
      },
    },
    {
      sky: colors('7a6ab8', 'e898a8', 'ffd8a0'),
      ground: colors('c8a878', 'a08460'),
      deco(p, st) {
        burst(p, st, colors('7a6ab8', 'e898a8', 'ffd8a0'), 34, 33, 14)
        disc(p, st.x(34), st.g, st.r(8), colors('ffd890', 'fff0c0'))
        pillars(p, st, [8, 60], colors('8a7a78', 'c8b8b0', 'f0e4d8'))
      },
    },
  ],
} satisfies Record<string, readonly [Look, Look]>

/** Deck planks on the ground of a ship. */
function planks(p: Painter, st: Stage): void {
  for (let y = st.g + 3; y < p.h; y += Math.max(3, Math.round(st.y(4)))) p.fill(p.m().rect(0, y, p.w, 1), hex('5a3418'))
}

const LOOKS: Readonly<Record<string, readonly [Look, Look]>> = {
  ...POKEMON,
  ...OTHER,
  ERDE: [POKEMON.Pflanze[0], POKEMON.Kampf[0]],
  WASSER: POKEMON.Wasser,
  FEUER: POKEMON.Feuer,
  WIND: POKEMON.Farblos,
  Blau: POKEMON.Wasser,
  Body: [POKEMON.Feuer[0], POKEMON.Kampf[1]],
}

/** Every scene the kit can paint: Pokémon types, Yu-Gi-Oh! attributes, One Piece colours, Riftbound domains. */
export type SceneKey = PokemonType | keyof typeof OTHER | 'ERDE' | 'WASSER' | 'FEUER' | 'WIND' | 'Blau' | 'Body'

export function isScene(key: string): key is SceneKey {
  return key in LOOKS
}

function lookOf(key: SceneKey, variant: 0 | 1): Look {
  const look = LOOKS[key]?.[variant]
  if (!look) throw new Error(`kit: unknown scene ${key}`)
  return look
}

/**
 * Paint the scene of an element. `second` (One Piece dual colours) paints the upper right of the
 * sky in the second colour's sky.
 */
export function scene(p: Painter, element: SceneKey, variant: 0 | 1, second?: SceneKey, cover = 0): void {
  const look = lookOf(element, variant)
  const st = new Stage(p.w, p.h, cover)
  const g = st.g
  sky(p, look.sky, 0, g, 0.7)
  if (second) {
    const other = lookOf(second, variant).sky
    const split = p.m().poly([p.w * 0.42, 0, p.w, 0, p.w, g * 0.95])
    p.dither(split, other, (_x, y) => y / Math.max(1, g - 1), 0.7)
    p.fill(p.m().path([p.w * 0.42, 0, p.w, g * 0.95]), other[other.length - 1] ?? 0)
  }
  look.deco(p, st)
  p.dither(p.m().rect(0, g, p.w, p.h - g), look.ground, (_x, y) => (y - g) / (p.h - g - 1), 0.6)
  look.floor?.(p, st)
}

/** Lift the scene one ramp step inside a mask (glows and sunbursts behind objects). */
export function brighten(p: Painter, element: SceneKey, variant: 0 | 1, m: Mask): void {
  const look = lookOf(element, variant)
  p.register(look.sky).register(look.ground)
  p.tone(m, 1)
}

/** Shadow of a subject on the ground. */
export function shadow(p: Painter, element: SceneKey, variant: 0 | 1, x: number, y: number, rx: number): void {
  const ground = lookOf(element, variant).ground
  p.fill(p.m().ellipse(x, y, rx, Math.max(1.2, rx * 0.18)), mix(ground[ground.length - 1] ?? INK, INK, 0.35))
}
