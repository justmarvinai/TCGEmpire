// Quest templates. `event` must match a name the server emits (private.emit); `path` is where the quest is
// solved (deep link). Mini-quests are endless and tiny, dailies reset at 00:00, weeklies on Monday.
export interface QuestTemplate {
  key: string
  event: string
  min: number
  max: number
  /** German text, {n} = target, [Einzahl|Mehrzahl] picks the form for the target */
  text: string
  path: string
  /** the feature behind the quest must be unlocked */
  minLevel?: number
}

export const MINI_QUESTS: readonly QuestTemplate[] = [
  { key: 'open', event: 'pack_opened', min: 2, max: 5, text: 'Öffne {n} Booster.', path: '/open' },
  { key: 'buy', event: 'packs_bought', min: 2, max: 5, text: 'Kauf {n} Booster am Kiosk.', path: '/shop' },
  { key: 'new', event: 'card_new', min: 2, max: 6, text: 'Entdecke {n} neue Karten.', path: '/open' },
  { key: 'sell', event: 'cards_sold', min: 5, max: 20, text: 'Verkauf {n} Karten im Kartenladen.', path: '/collection' },
  { key: 'bottles', event: 'bottles', min: 15, max: 40, text: 'Sammle {n} Pfandflaschen.', path: '/jobs' },
  { key: 'rounds', event: 'minigame_round', min: 1, max: 2, text: 'Arbeite {n}× einen Minijob.', path: '/jobs' },
  { key: 'hit', event: 'hit_pulled', min: 1, max: 1, text: 'Zieh ein Holo oder besser.', path: '/open' },
  { key: 'energy', event: 'energy_pulled', min: 4, max: 10, text: 'Zieh {n} Energiekarten. Ja, wirklich.', path: '/open' },
  { key: 'bunker', event: 'bunker_collected', min: 1, max: 1, text: 'Leer den Geldbunker.', path: '/bunker', minLevel: 3 },
]

export const DAILY_QUESTS: readonly QuestTemplate[] = [
  { key: 'd_open', event: 'pack_opened', min: 8, max: 15, text: 'Öffne heute {n} Booster.', path: '/open' },
  { key: 'd_new', event: 'card_new', min: 3, max: 8, text: 'Entdecke heute {n} neue Karten.', path: '/open' },
  { key: 'd_sell', event: 'cards_sold', min: 20, max: 50, text: 'Verkauf heute {n} Karten.', path: '/collection' },
  { key: 'd_rounds', event: 'minigame_round', min: 3, max: 6, text: 'Arbeite heute {n}× einen Minijob.', path: '/jobs' },
  { key: 'd_hits', event: 'hit_pulled', min: 2, max: 4, text: 'Zieh heute {n} Holos oder besser.', path: '/open' },
  { key: 'd_quests', event: 'quest_claimed', min: 4, max: 8, text: 'Hol dir heute {n} Quest-Belohnungen.', path: '/quests' },
  { key: 'd_bunker', event: 'bunker_collected', min: 2, max: 4, text: 'Leer den Geldbunker {n}× heute.', path: '/bunker', minLevel: 3 },
  { key: 'd_upgrade', event: 'upgrade_bought', min: 1, max: 3, text: 'Kauf heute {n} [Upgrade|Upgrades].', path: '/upgrades', minLevel: 5 },
  { key: 'd_shift', event: 'shift_done', min: 1, max: 2, text: 'Beende heute {n} [Schicht|Schichten].', path: '/jobs', minLevel: 7 },
  { key: 'd_snack', event: 'snack_eaten', min: 1, max: 2, text: 'Gönn dir heute {n} [Snack|Snacks].', path: '/shop' },
  { key: 'd_graded', event: 'graded', min: 1, max: 2, text: 'Lass heute {n} [Karte|Karten] graden.', path: '/grading', minLevel: 13 },
  { key: 'd_battle', event: 'battle_played', min: 1, max: 1, text: 'Spiel heute ein Pack Battle.', path: '/battles', minLevel: 16 },
]

export const WEEKLY_QUESTS: readonly QuestTemplate[] = [
  { key: 'w_open', event: 'pack_opened', min: 60, max: 100, text: 'Öffne diese Woche {n} Booster.', path: '/open' },
  { key: 'w_new', event: 'card_new', min: 10, max: 20, text: 'Entdecke diese Woche {n} neue Karten.', path: '/open' },
  { key: 'w_hits', event: 'hit_pulled', min: 15, max: 25, text: 'Zieh diese Woche {n} Holos oder besser.', path: '/open' },
  { key: 'w_rounds', event: 'minigame_round', min: 20, max: 35, text: 'Arbeite diese Woche {n}× einen Minijob.', path: '/jobs' },
  { key: 'w_shift', event: 'shift_hours', min: 20, max: 40, text: 'Arbeite diese Woche {n} Schichtstunden.', path: '/jobs' },
  { key: 'w_bunker', event: 'bunker_collected', min: 10, max: 20, text: 'Leer den Geldbunker {n}× diese Woche.', path: '/bunker' },
  { key: 'w_upgrade', event: 'upgrade_bought', min: 5, max: 10, text: 'Kauf diese Woche {n} Upgrades.', path: '/upgrades' },
  { key: 'w_graded', event: 'graded', min: 4, max: 8, text: 'Lass diese Woche {n} Karten graden.', path: '/grading', minLevel: 13 },
  { key: 'w_battles', event: 'battle_played', min: 2, max: 4, text: 'Spiel diese Woche {n} Pack Battles.', path: '/battles', minLevel: 16 },
  { key: 'w_dark', event: 'attack_done', min: 1, max: 3, text: 'Mach diese Woche {n} [Ding|Dinger] in der Schattenwirtschaft. Ein Gerücht geht immer.', path: '/darkside', minLevel: 35 },
  { key: 'w_stamps', event: 'stamp_claimed', min: 5, max: 6, text: 'Stempel diese Woche {n}× die Stempelkarte.', path: '/quests' },
]

export const QUESTS_BY_KIND = { mini: MINI_QUESTS, daily: DAILY_QUESTS, weekly: WEEKLY_QUESTS } as const
export const ALL_QUESTS: readonly QuestTemplate[] = [...MINI_QUESTS, ...DAILY_QUESTS, ...WEEKLY_QUESTS]
