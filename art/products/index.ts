import type { Painter } from '../toolkit/index.ts'
import { EMPIREMON_BOOSTERS } from './booster-empiremon.ts'
import { OP01_BOOSTERS } from './booster-op01.ts'
import { boosterBisaflor, boosterGlurak, boosterTurtok } from './booster-pokemon-base.ts'
import { RB_OGN_BOOSTERS } from './booster-rb-ogn.ts'
import { YGO_LOB_BOOSTERS } from './booster-ygo-lob.ts'
import { cardBack } from './card-back.ts'
import { GRADE_PACKS } from './gradepack.ts'
import { SLAB_FRAMES } from './slab.ts'
import { BOOSTERS as PKM_JUNGLE } from '../cards/pokemon-jungle/booster.ts'
import { BOOSTERS as PKM_FOSSIL } from '../cards/pokemon-fossil/booster.ts'
import { BOOSTERS as YGO_MRD } from '../cards/yugioh-mrd/booster.ts'
import { BOOSTERS as YGO_MRL } from '../cards/yugioh-mrl/booster.ts'
import { BOOSTERS as OP02 } from '../cards/onepiece-op02/booster.ts'
import { BOOSTERS as OP03 } from '../cards/onepiece-op03/booster.ts'
import { BOOSTERS as RB_SFD } from '../cards/riftbound-spiritforged/booster.ts'
import { BOOSTERS as RB_UNL } from '../cards/riftbound-unleashed/booster.ts'

export interface ProductDef {
  id: string
  w: number
  h: number
  draw(p: Painter): void
}

export const PRODUCTS: readonly ProductDef[] = [
  cardBack,
  boosterGlurak,
  boosterTurtok,
  boosterBisaflor,
  ...YGO_LOB_BOOSTERS,
  ...OP01_BOOSTERS,
  ...RB_OGN_BOOSTERS,
  ...EMPIREMON_BOOSTERS,
  // sets 2 and 3 (0.0.9): each set folder paints its own wrappers with its game's painter
  ...PKM_JUNGLE,
  ...PKM_FOSSIL,
  ...YGO_MRD,
  ...YGO_MRL,
  ...OP02,
  ...OP03,
  ...RB_SFD,
  ...RB_UNL,
  ...SLAB_FRAMES,
  ...GRADE_PACKS,
]
