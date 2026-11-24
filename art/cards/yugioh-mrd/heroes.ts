import type { CardDef } from '../types.ts'
import { blackSkullDragon } from './black-skull-dragon.ts'
import { changeOfHeart } from './change-of-heart.ts'
import { gateGuardian } from './gate-guardian.ts'
import { mirrorForce } from './mirror-force.ts'
import { solemnJudgment } from './solemn-judgment.ts'
import { summonedSkull } from './summoned-skull.ts'
import { thousandDragon } from './thousand-dragon.ts'
import { timeWizard } from './time-wizard.ts'

/**
 * Ultra and Grail cards of this set, each hand-made in its own file (docs/ART_DIRECTION.md §7, P1).
 */
export const HEROES: readonly CardDef[] = [
  thousandDragon,
  solemnJudgment,
  timeWizard,
  changeOfHeart,
  mirrorForce,
  blackSkullDragon,
  gateGuardian,
  summonedSkull,
]
