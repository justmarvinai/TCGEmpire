import type { CardDef, RenderedCard } from '../cards/types.ts'
import type { Region } from '../toolkit/index.ts'
import { hex } from '../toolkit/index.ts'
import { renderStub } from './stub.ts'

/** Card frames of the OP game. Placeholder: the frame family is designed in alpha_05 (docs/ART_DIRECTION.md §5). */
export const CARD = { w: 80, h: 112 } as const

/** Where a card's artwork sits (card coordinates). Ultra and Grail are always full art, 80×112. */
export function artArea(def: CardDef): Region {
  return def.tier === 'ultra' || def.tier === 'grail' ? { x: 0, y: 0, w: 80, h: 112 } : { x: 6, y: 14, w: 68, h: 56 }
}

export function renderCard(def: CardDef, _setSize: number): RenderedCard {
  return renderStub(def, artArea(def), hex('e0483c'))
}
