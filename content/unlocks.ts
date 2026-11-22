// Player level at which a feature opens. The server enforces these (config `unlock.<key>`),
// the navigation shows them.
export const UNLOCKS = {
  daily_quests: 2,
  stamps: 2,
  bunker: 3,
  upgrades: 5,
  shifts: 7,
  weekly_quests: 13,
} as const
