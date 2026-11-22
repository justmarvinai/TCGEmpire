import type { BinderCard } from '@/lib/schemas.ts'
import { HIT_TIERS, cardById } from '@/lib/catalog.ts'

/** Stacked cards (Common to Rare) beyond the first copy: what "Duplikate verkaufen" sells. */
export function duplicateStacks(cards: readonly BinderCard[]) {
  return cards
    .filter((c) => c.qty > 1 && !HIT_TIERS.has(cardById.get(c.card_id)?.tier ?? 'common'))
    .map((c) => ({ card_id: c.card_id, qty: c.qty - 1 }))
}
