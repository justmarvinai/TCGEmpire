// Streaming (docs/GAME_DESIGN.md §17), level 45: go live and every booster you open is a show. Packs bring viewers
// (a long boring stretch loses them), hits bring donations and Followers; donations per day are capped. Sponsors
// pay for a number of boosters opened live. Followers are a progression axis of their own (half survive an exit).
// Sponsor names are parodies and live here so they can be swapped.
export interface SponsorDef {
  key: string
  name: string
  text: string
  /** boosters to open live within a day */
  packs: number
  /** reward in minutes of reference income */
  rewardMinutes: number
}

export const SPONSORS: readonly SponsorDef[] = [
  { key: 'blitzbirne', name: 'Blitzbirne Energy', text: 'Der Energy-Drink mit dem Geschmack von Batterie. Jetzt mit 30 % weniger Herzrasen.', packs: 30, rewardMinutes: 10 },
  { key: 'raid', name: 'RAID: Schatten-Legenden', text: 'Das Handyspiel, das jeder Streamer spielt. Keiner weiß, warum.', packs: 50, rewardMinutes: 20 },
  { key: 'vpm', name: 'NordVPM', text: 'Surf sicher. Wovor, sagen wir nicht.', packs: 20, rewardMinutes: 8 },
  { key: 'frisch', name: 'Hallo Frisch', text: 'Kochboxen für Leute, die nie kochen. Mit Gutschein-Code.', packs: 40, rewardMinutes: 15 },
  { key: 'gamerstuhl', name: 'Thronsitz Gaming-Stuhl', text: 'Rücken kaputt? Nicht mehr lange. Also, noch kaputter.', packs: 60, rewardMinutes: 25 },
]

export const STREAMING_CONFIG = {
  'stream.sponsors': Object.fromEntries(SPONSORS.map(({ key, name: _n, text: _t, ...s }) => [key, s])),
} as const
