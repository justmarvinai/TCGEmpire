import type { Painter } from '../toolkit/index.ts'
import { boosterGlurak } from './booster-pokemon-base.ts'
import { pokemonCardBack } from './card-back.ts'
import { SLAB_SAMPLES } from './slab-samples.ts'

export interface ProductDef {
  id: string
  w: number
  h: number
  draw(p: Painter): void
}

export const PRODUCTS: readonly ProductDef[] = [pokemonCardBack, boosterGlurak, ...SLAB_SAMPLES]
