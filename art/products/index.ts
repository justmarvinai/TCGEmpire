import type { Painter } from '../toolkit/index.ts'
import { boosterGlurak } from './booster-pokemon-base.ts'
import { cardBack } from './card-back.ts'
import { SLAB_FRAMES } from './slab.ts'

export interface ProductDef {
  id: string
  w: number
  h: number
  draw(p: Painter): void
}

export const PRODUCTS: readonly ProductDef[] = [cardBack, boosterGlurak, ...SLAB_FRAMES]
