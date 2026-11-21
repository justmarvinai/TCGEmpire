import type { Painter } from '../toolkit/index.ts'
import { pokemonCardBack } from './card-back.ts'

export interface ProductDef {
  id: string
  w: number
  h: number
  draw(p: Painter): void
}

export const PRODUCTS: readonly ProductDef[] = [pokemonCardBack]
