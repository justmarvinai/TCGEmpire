import type { Painter } from '../toolkit/index.ts'
import { EMPIREMON_BOOSTERS } from './booster-empiremon.ts'
import { OP01_BOOSTERS } from './booster-op01.ts'
import { boosterBisaflor, boosterGlurak, boosterTurtok } from './booster-pokemon-base.ts'
import { RB_OGN_BOOSTERS } from './booster-rb-ogn.ts'
import { YGO_LOB_BOOSTERS } from './booster-ygo-lob.ts'
import { cardBack } from './card-back.ts'
import { GRADE_PACKS } from './gradepack.ts'
import { SLAB_FRAMES } from './slab.ts'

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
  ...SLAB_FRAMES,
  ...GRADE_PACKS,
]
