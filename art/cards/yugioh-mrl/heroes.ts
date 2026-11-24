import type { CardDef } from '../types.ts'
import { blueEyesToonDragon } from './blue-eyes-toon-dragon.ts'
import { delinquentDuo } from './delinquent-duo.ts'
import { mysticalSpaceTyphoon } from './mystical-space-typhoon.ts'
import { relinquished } from './relinquished.ts'
import { snatchSteal } from './snatch-steal.ts'
import { toonMermaid } from './toon-mermaid.ts'
import { toonSummonedSkull } from './toon-summoned-skull.ts'

/**
 * Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1).
 */
export const HEROES: readonly CardDef[] = [
  toonMermaid,
  delinquentDuo,
  snatchSteal,
  toonSummonedSkull,
  mysticalSpaceTyphoon,
  relinquished,
  blueEyesToonDragon,
]
