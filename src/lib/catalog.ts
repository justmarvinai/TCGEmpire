// Client view of the content catalog: names, tiers and products come from content/, values from the server.
import { cardById, PRODUCTS, productById, SETS } from '../../content/catalog.ts'
import { TIERS, type CardData, type Tier } from '../../content/types.ts'
import { MINI_QUESTS } from '../../content/quests.ts'
import { TUTORIAL } from '../../content/tutorial.ts'

export { cardById, MINI_QUESTS, PRODUCTS, productById, SETS, TIERS, TUTORIAL }
export type { CardData, Tier }

export const HIT_TIERS: ReadonlySet<string> = new Set<Tier>(['holo', 'alternative', 'ultra', 'grail'])
export const tierRank = (t: string) => TIERS.indexOf(t as Tier)

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  holo: 'Holo',
  alternative: 'Alternative',
  ultra: 'Ultra',
  grail: 'Grail',
}

/** Text colour utility per tier (design tokens). */
export const TIER_TEXT: Record<Tier, string> = {
  common: 'text-tier-common',
  uncommon: 'text-tier-uncommon',
  rare: 'text-tier-rare',
  holo: 'text-tier-holo',
  alternative: 'text-tier-alternative',
  ultra: 'text-tier-ultra',
  grail: 'text-tier-grail',
}

export const setOfCard = (id: string) => SETS.find((s) => s.cards.some((c) => c.id === id))?.id ?? 'pokemon-base'

/** Card name as shown in lists. */
export const cardName = (id: string) => cardById.get(id)?.name ?? id

/** The single card back of the game (owner decision). */
export const CARD_BACK = 'card-back'
