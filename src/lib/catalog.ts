// Client view of the content catalog: names, tiers and products come from content/, values from the server.
import { cardById, PRODUCTS, productById, SETS } from '../../content/catalog.ts'
import { GAMES, TIERS, type CardData, type Game, type Tier } from '../../content/types.ts'
import { ALL_QUESTS } from '../../content/quests.ts'
import { TUTORIAL } from '../../content/tutorial.ts'
import { UPGRADES } from '../../content/upgrades.ts'
import { JOBS, RANKS, SHIFT_HOURS } from '../../content/jobs.ts'
import { CONSUMABLES } from '../../content/consumables.ts'
import { ACHIEVEMENTS, STAT_LABELS } from '../../content/achievements.ts'
import { UNLOCKS } from '../../content/unlocks.ts'
import { STORES } from '../../content/stores.ts'
export { AD_REPLIES, AD_SELLERS, AD_TITLES } from '../../content/kleinanzeigen.ts'
export { GOALS } from '../../content/goals.ts'
export { SKILL_BRANCHES, SKILL_COST, SKILLS, type SkillDef } from '../../content/skills.ts'
export { FURNISHING_SLOTS, FURNITURE, HOMES, type FurnitureDef, type HomeDef } from '../../content/housing.ts'
export { COSMETIC_KINDS, COSMETICS, type CosmeticDef, type CosmeticKind } from '../../content/cosmetics.ts'

export { ACHIEVEMENTS, ALL_QUESTS, cardById, CONSUMABLES, JOBS, PRODUCTS, productById, RANKS, SETS, SHIFT_HOURS }
export { GAMES, STAT_LABELS, STORES, TIERS, TUTORIAL, UNLOCKS, UPGRADES }
export type { Game }
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

/** Display name of a card or a sealed product. */
/** The game a card or sealed product belongs to. */
export const gameOf = (id: string): Game | undefined => {
  const set = cardById.has(id) ? setOfCard(id) : productById.get(id)?.set
  return SETS.find((s) => s.id === set)?.game
}

export const itemName = (id: string) => cardById.get(id)?.name ?? productById.get(id)?.name ?? id

export const setOfCard = (id: string) => SETS.find((s) => s.cards.some((c) => c.id === id))?.id ?? 'pokemon-base'

/** Card name as shown in lists. */
export const cardName = (id: string) => cardById.get(id)?.name ?? id

/** The single card back of the game (owner decision). */
export const CARD_BACK = 'card-back'
