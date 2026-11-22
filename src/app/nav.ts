import type { IconName } from '@/components/pixel/PixelIcon.tsx'
import type { texts } from '@/texts/de.ts'

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
  { group: 'start', items: [item('home', 'home', 1, true)] },
  {
    group: 'sammeln',
    items: [item('shop', 'shop', 1, true), item('open', 'pack', 1, true), item('collection', 'binder', 1, true), item('grading', 'loupe', 13)],
  },
  {
    group: 'handeln',
    items: [
      item('kleinanzeigen', 'tag', 4),
      item('cardmarket', 'market', 10),
      item('trade', 'trade', 10),
      item('auctions', 'gavel', 25),
    ],
  },
  {
    group: 'verdienen',
    items: [item('jobs', 'briefcase', 1, true), item('bunker', 'vault', 3), item('company', 'building', 30), item('streaming', 'camera', 45)],
  },
  {
    group: 'aufsteigen',
    items: [
      item('quests', 'scroll', 1, true),
      item('path', 'path', 1, true),
      item('upgrades', 'upgrade', 5),
      item('skills', 'skills', 5),
      item('prestige', 'crown', 100),
    ],
  },
  { group: 'leben', items: [item('housing', 'house', 20), item('style', 'sparkle', 5), item('luxury', 'diamond', 55)] },
  {
    group: 'freunde',
    items: [
      item('toplists', 'trophy', 1),
      item('players', 'people', 1),
      item('battles', 'swords', 16),
      item('darkside', 'skull', 35),
      item('megaprojects', 'crane', 65),
    ],
  },
]

export const ALL_ITEMS = NAV.flatMap((g) => g.items)
