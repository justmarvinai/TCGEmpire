import type { IconName } from '@/components/pixel/PixelIcon.tsx'
import type { texts } from '@/texts/de.ts'
import { UNLOCKS } from '@/lib/catalog.ts'

type ItemId = keyof typeof texts.nav.items
type GroupId = keyof typeof texts.nav.groups

export interface NavItem {
  id: ItemId
  path: string
  icon: IconName
  /** player level that unlocks the feature (docs/GAME_DESIGN.md §22) */
  level: number
  /** false until the feature's milestone ships: shows "Bald" */
  built: boolean
}

const item = (id: ItemId, icon: IconName, level: number, built = false): NavItem => ({
  id,
  path: id === 'home' ? '/' : `/${id}`,
  icon,
  level,
  built,
})

export const NAV: { group: GroupId; items: NavItem[] }[] = [
  { group: 'start', items: [item('home', 'home', 1, true), item('profile', 'star', 1, true)] },
  {
    group: 'sammeln',
    items: [item('shop', 'shop', 1, true), item('open', 'pack', 1, true), item('collection', 'binder', 1, true), item('grading', 'loupe', UNLOCKS.grading, true)],
  },
  {
    group: 'handeln',
    items: [
      item('kleinanzeigen', 'tag', UNLOCKS.kleinanzeigen, true),
      item('cardmarket', 'market', UNLOCKS.cardmarket, true),
      item('trade', 'trade', UNLOCKS.trade, true),
      item('auctions', 'gavel', 25),
    ],
  },
  {
    group: 'verdienen',
    items: [item('jobs', 'briefcase', 1, true), item('bunker', 'vault', UNLOCKS.bunker, true), item('company', 'building', 30), item('streaming', 'camera', 45)],
  },
  {
    group: 'aufsteigen',
    items: [
      item('quests', 'scroll', 1, true),
      item('path', 'path', 1, true),
      item('upgrades', 'upgrade', UNLOCKS.upgrades, true),
      item('skills', 'skills', UNLOCKS.skills, true),
      item('prestige', 'crown', 100),
    ],
  },
  { group: 'leben', items: [item('housing', 'house', UNLOCKS.housing, true), item('style', 'sparkle', UNLOCKS.style, true), item('insurance', 'shield', UNLOCKS.insurance, true), item('luxury', 'diamond', 55)] },
  {
    group: 'freunde',
    items: [
      item('stammtisch', 'chat', UNLOCKS.stammtisch, true),
      item('toplists', 'trophy', UNLOCKS.toplists, true),
      item('players', 'people', UNLOCKS.players, true),
      item('battles', 'swords', 16),
      item('darkside', 'skull', 35),
      item('megaprojects', 'crane', 65),
    ],
  },
]

export const ALL_ITEMS = NAV.flatMap((g) => g.items)

type Feature = keyof typeof UNLOCKS

/** The page of every feature a level unlocks: its tour runs there and its nav entry shows NEU. */
const FEATURE_PAGE: Record<Feature, string> = {
  toplists: '/toplists',
  stammtisch: '/stammtisch',
  players: '/players',
  trade: '/trade',
  licenses: '/shop',
  daily_quests: '/quests',
  stamps: '/quests',
  bunker: '/bunker',
  upgrades: '/upgrades',
  skills: '/skills',
  housing: '/housing',
  style: '/style',
  insurance: '/insurance',
  shifts: '/jobs',
  cardmarket: '/cardmarket',
  stores: '/shop',
  kleinanzeigen: '/kleinanzeigen',
  lager: '/shop',
  weekly_quests: '/quests',
  grading: '/grading',
}

export const FEATURES = (Object.keys(FEATURE_PAGE) as Feature[])
  .map((key) => ({ key, level: UNLOCKS[key], path: FEATURE_PAGE[key] }))
  .sort((a, b) => a.level - b.level)

/** Unlocked features whose tour this device has not finished yet (never during Mutti's tutorial). */
export const unseenFeatures = (p: { id: string; level: number; tutorial_step: number }, seen: string[]) =>
  p.tutorial_step >= 0 ? [] : FEATURES.filter((f) => f.level <= p.level && !seen.includes(`${p.id}:${f.key}`))
