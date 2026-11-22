// Player level at which a feature opens. The server enforces these (config `unlock.<key>`),
// the navigation shows them.
export const UNLOCKS = {
  toplists: 1,
  players: 1,
  stammtisch: 1,
  daily_quests: 2,
  stamps: 2,
  bunker: 3,
  upgrades: 5,
  shifts: 7,
  stores: 4,
  kleinanzeigen: 4,
  cardmarket: 10,
  trade: 10,
  weekly_quests: 13,
  lager: 18,
} as const
