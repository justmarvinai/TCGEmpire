// What each step of a feature's first-visit tour marks on its page: a [data-tour] id per step of
// texts.tour.features, or null for a step about the page as a whole (the bubble then sits in the middle). A target
// that is not on screen (another tab, nothing founded yet) is treated like null.
import type { FEATURES } from '@/app/nav.ts'

type FeatureKey = (typeof FEATURES)[number]['key']

export const TOUR_TARGETS: Record<FeatureKey, readonly (string | null)[]> = {
  daily_quests: ['quests-daily', 'quest-reroll', 'quests-daily'],
  stamps: ['stamps', 'stamps'],
  weekly_quests: ['quests-weekly', 'quests-weekly'],
  bunker: ['bunker-stage', 'bunker-collect', 'bunker-upgrades'],
  upgrades: ['upgrades-group', 'upgrades-group'],
  shifts: ['shifts', 'shifts', 'shifts'],
  players: ['players-list', 'player-gift'],
  friends: ['friend-help', 'friend-help', 'friend-coffee'],
  group_orders: ['group-orders', 'group-orders'],
  loans: ['player-loan', 'loans'],
  trade: ['trade-new', 'trade-new', 'trade-new'],
  toplists: ['toplist', 'toplist', 'toplist'],
  stammtisch: ['stammtisch-chat', 'stammtisch-online'],
  licenses: ['licenses', 'licenses'],
  stores: ['stores', 'stores', 'stores'],
  lager: ['stores', 'lager'],
  cardmarket: ['cardmarket-slots', 'cardmarket-parcels', 'cardmarket-sell-tab'],
  kleinanzeigen: ['kleinanzeigen-board', 'kleinanzeigen-board', 'kleinanzeigen-post'],
  grading: ['grading-copies', 'grading-grader', 'grading-slabs'],
  skills: ['skills-points', 'skills-branch', 'skills-respec'],
  housing: ['housing-homes', 'housing-nebenkosten', 'housing-furnishing'],
  style: ['style-kind', 'style-avatar', null],
  insurance: [null, 'insurance-policy'],
  battles: ['battles-lobby', 'battles-create', 'battles-create'],
  breaks: ['breaks', 'breaks'],
  company: ['company-found', 'company-hakt', 'company-team'],
  wholesale: ['wholesale', 'wholesale'],
  loewen: ['loewen', 'loewen'],
  streaming: ['streaming-channel', 'streaming-sponsor'],
  luxury: ['luxury-group', 'luxury-group'],
  megaprojects: ['megaprojects', 'museum'],
  prestige: ['prestige-exit', 'prestige-perks'],
  bares: ['bares-pick', 'bares-dealers'],
  darkside: ['darkside-targets', 'darkside-targets', 'darkside-status'],
}
