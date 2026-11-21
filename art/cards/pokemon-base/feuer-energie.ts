import { colors, fire, flameMask, rays, rng, sparks } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Feuer-Energie (Common energy). Brief: flame emblem flickering, deep red background with
 * rising embers. Energy art window, 68×84.
 */
const DEEP = colors('4c0a16', '74101a', 'a01a1a', 'c82c1a')
const FIRE = colors('e2441a', 'f67a1e', 'fdb332', 'ffe466', 'fffbd6')
const RIM = colors('3a0612', 'fdb332')

export const feuerEnergie: CardDef = {
  id: 'pkm-base-076',
  number: 76,
  name: 'Feuer-Energie',
  tier: 'common',
  kind: 'energy',
  type: 'Feuer',
  foil: 'none',
  draw(p) {
    // deep red field that glows towards the emblem, with faint rays
    p.dither(null, DEEP, (x, y) => 1 - Math.hypot(x - 34, (y - 42) * 0.85) / 46, 0.8)
    p.register(DEEP)
    p.tone(rays(p, 34, 42, 10, 0.03), -1)
    sparks(p, rng(5), 30, [FIRE[1], FIRE[2]], { x: 2, y: 2, w: 64, h: 80 })

    // emblem: a dark medallion with a golden ring and the flame bursting out of it
    const emblem = p.layer()
    const disc = emblem.m().disc(34, 44, 24)
    emblem.fill(disc, RIM[0])
    emblem.fill(disc.shrunk(1).minus(disc.shrunk(3)), RIM[1])
    emblem.fill(disc.shrunk(4), DEEP[1])
    emblem.fill(disc.shrunk(4).and(rays(p, 34, 44, 8)), DEEP[2])
    const flame = flameMask(p, 34, 67, 26, 52, { lean: 6, tongues: 0 })
      .or(flameMask(p, 23, 66, 13, 31, { lean: -5, tongues: 0 }))
      .or(flameMask(p, 45, 66, 12, 25, { lean: 5, tongues: 0 }))
    emblem.fill(flame.grown(1), RIM[0])
    fire(emblem, flame, FIRE, { step: 2, dy: 2 })
    p.subject(emblem, RIM[0])
  },
}
