// Endless mini-quests: always a few active, replaced instantly when claimed. Deliberately tiny rewards.
// `event` must match a name the server emits (private.emit).
export interface QuestTemplate {
  key: string
  event: string
  min: number
  max: number
  /** German text, {n} = target */
  text: string
}

export const MINI_QUESTS: readonly QuestTemplate[] = [
  { key: 'open', event: 'pack_opened', min: 2, max: 5, text: 'Öffne {n} Booster.' },
  { key: 'buy', event: 'packs_bought', min: 2, max: 5, text: 'Kauf {n} Booster am Kiosk.' },
  { key: 'new', event: 'card_new', min: 2, max: 6, text: 'Entdecke {n} neue Karten.' },
  { key: 'sell', event: 'cards_sold', min: 5, max: 20, text: 'Verkauf {n} Karten im Kartenladen.' },
  { key: 'bottles', event: 'bottles', min: 15, max: 40, text: 'Sammle {n} Pfandflaschen.' },
  { key: 'rounds', event: 'minigame_round', min: 1, max: 2, text: 'Geh {n}× Pfand sammeln.' },
  { key: 'hit', event: 'hit_pulled', min: 1, max: 1, text: 'Zieh ein Holo oder besser.' },
  { key: 'energy', event: 'energy_pulled', min: 4, max: 10, text: 'Zieh {n} Energiekarten. Ja, wirklich.' },
]
