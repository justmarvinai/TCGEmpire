// Achievements count lifetime events (game.counters). Each tier pays EP; some tiers grant a title.
export interface AchievementDef {
  key: string
  event: string
  name: string
  /** {n} = threshold */
  text: string
  tiers: readonly number[]
  /** title per tier (or null) */
  titles?: readonly (string | null)[]
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: 'packs', event: 'pack_opened', name: 'Aufreißer', text: 'Öffne {n} Booster.', tiers: [10, 100, 1000, 10000], titles: [null, null, 'Folienschänder', 'Der Aufreißer'] },
  { key: 'buyer', event: 'packs_bought', name: 'Stammkunde', text: 'Kauf {n} Booster.', tiers: [10, 100, 1000], titles: [null, null, 'Kiosk-Legende'] },
  { key: 'collector', event: 'card_new', name: 'Sammelwut', text: 'Entdecke {n} verschiedene Karten.', tiers: [30, 90, 200, 354], titles: [null, null, 'Komplettist', 'Archivar'] },
  { key: 'hits', event: 'hit_pulled', name: 'Glückspilz', text: 'Zieh {n} Holos oder besser.', tiers: [10, 100, 1000], titles: [null, 'Glückspilz', 'Glücksritter'] },
  { key: 'ultra', event: 'pulled_ultra', name: 'Ultra-Fan', text: 'Zieh {n} [Ultra-Karte|Ultra-Karten].', tiers: [1, 10, 50], titles: [null, null, 'Ultra-Bonze'] },
  { key: 'grail', event: 'pulled_grail', name: 'Heiliger Gral', text: 'Zieh {n} [Grail|Grails].', tiers: [1, 5, 25], titles: ['Gralsritter', null, 'Der Auserwählte'] },
  { key: 'energy', event: 'energy_pulled', name: 'Energiesparer', text: 'Zieh {n} Energiekarten.', tiers: [100, 1000, 10000], titles: [null, 'Energiewende', 'Kraftwerk'] },
  { key: 'pech', event: 'pechvogel', name: 'Pechvogel', text: 'Öffne 20 Booster am Stück ohne Holo.', tiers: [1, 5], titles: ['Pechvogel', 'Schwarze Katze'] },
  { key: 'sold', event: 'cards_sold', name: 'Ausverkauf', text: 'Verkauf {n} Karten.', tiers: [100, 1000, 10000], titles: [null, 'Ramschkönig', 'Großhändler'] },
  { key: 'bottles', event: 'bottles', name: 'Flaschensammler', text: 'Sammle {n} Pfandflaschen.', tiers: [100, 1000, 10000], titles: [null, 'Pfandbaron', 'Flaschenkönig'] },
  { key: 'rounds', event: 'minigame_round', name: 'Malocher', text: 'Arbeite {n} Minijob-Runden.', tiers: [10, 100, 1000], titles: [null, 'Malocher', 'Arbeitstier'] },
  { key: 'shifts', event: 'shift_hours', name: 'Schichtarbeiter', text: 'Arbeite {n} Schichtstunden.', tiers: [10, 100, 1000], titles: [null, 'Werktätiger', 'Held der Arbeit'] },
  { key: 'bunker', event: 'bunker_collected', name: 'Bunkerwart', text: 'Leer den Geldbunker {n}×.', tiers: [10, 100, 1000], titles: [null, 'Dagobert', 'Fort Knox'] },
  { key: 'upgrades', event: 'upgrade_bought', name: 'Aufrüster', text: 'Kauf {n} Upgrades.', tiers: [10, 50, 200], titles: [null, null, 'Optimierer'] },
  { key: 'quests', event: 'quest_claimed', name: 'Questjunkie', text: 'Hol dir {n} Quest-Belohnungen.', tiers: [10, 100, 1000], titles: [null, 'Pflichtbewusst', 'Streber'] },
  { key: 'stamps', event: 'stamp_claimed', name: 'Abreißkalender', text: 'Stempel {n}× die Stempelkarte.', tiers: [7, 30, 100], titles: [null, 'Stammgast', 'Inventar'] },
  { key: 'doener', event: 'doener_eaten', name: 'Döner-Abo', text: 'Iss {n} Döner.', tiers: [5, 50, 500], titles: [null, 'Dönerprinz', 'Spießkönig'] },
  { key: 'pokemon', event: 'collect_pokemon', name: 'Trainer', text: 'Besitze {n} verschiedene Pokémon-Karten.', tiers: [10, 45, 90], titles: [null, null, 'Pokémon-Meister'] },
  { key: 'yugioh', event: 'collect_yugioh', name: 'Duellant', text: 'Besitze {n} verschiedene Yu-Gi-Oh!-Karten.', tiers: [10, 43, 86], titles: [null, 'Herz der Karten', 'König der Spiele'] },
  { key: 'onepiece', event: 'collect_onepiece', name: 'Pirat', text: 'Besitze {n} verschiedene One-Piece-Karten.', tiers: [10, 45, 89], titles: [null, 'Supernova', 'Piratenkönig'] },
  { key: 'riftbound', event: 'collect_riftbound', name: 'Beschwörer', text: 'Besitze {n} verschiedene Riftbound-Karten.', tiers: [10, 45, 89], titles: [null, null, 'Herausforderer'] },
  { key: 'licenses', event: 'license_bought', name: 'Expansion', text: 'Kauf {n} [Händlerlizenz|Händlerlizenzen].', tiers: [1, 3], titles: [null, 'Vier-Spiele-Mogul'] },
  { key: 'goals', event: 'goal_done', name: 'Vollständigkeitswahn', text: 'Schaff {n} [Sammelziel|Sammelziele].', tiers: [1, 5, 12], titles: [null, 'Zwangssammler', 'Archivar des Wahnsinns'] },
  { key: 'graded', event: 'graded', name: 'Plastikfetischist', text: 'Lass {n} [Karte|Karten] graden.', tiers: [1, 25, 250, 1000], titles: [null, 'Slab-Sammler', 'Grading-Junkie', 'Plastikgott'] },
  { key: 'gem', event: 'graded_10', name: 'Gem Mint', text: 'Bekomm {n}× eine 10.', tiers: [1, 10, 100], titles: [null, 'Zehnerjäger', 'Mr. Gem Mint'] },
  { key: 'black', event: 'black_label', name: 'Black Label', text: 'Bekomm {n} Black [Label|Labels] von BGS.', tiers: [1, 5], titles: ['Schwarzer Ritter', 'Darth Label'] },
  { key: 'crack', event: 'slab_cracked', name: 'Knackwurst', text: 'Knack {n} [Slab|Slabs].', tiers: [1, 25], titles: [null, 'Panzerknacker'] },
  { key: 'levels', event: 'level_up', name: 'Aufsteiger', text: 'Steig {n} Level auf.', tiers: [9, 24, 49, 99], titles: [null, 'Aufsteiger', 'Großkopferter', 'Endgegner'] },
]

/** German labels for the statistics page (counter name -> label). */
export const STAT_LABELS: Record<string, string> = {
  pack_opened: 'Booster geöffnet',
  packs_bought: 'Booster gekauft',
  card_new: 'Karten entdeckt',
  collect_pokemon: 'Pokémon-Karten gesammelt',
  collect_yugioh: 'Yu-Gi-Oh!-Karten gesammelt',
  collect_onepiece: 'One-Piece-Karten gesammelt',
  collect_riftbound: 'Riftbound-Karten gesammelt',
  license_bought: 'Lizenzen gekauft',
  goal_done: 'Sammelziele geschafft',
  pregrade: 'Karten vorgeprüft',
  graded: 'Karten gegradet',
  graded_10: 'Zehner bekommen',
  black_label: 'Black Labels',
  slab_cracked: 'Slabs geknackt',
  hit_pulled: 'Holo oder besser gezogen',
  pulled_ultra: 'Ultra gezogen',
  pulled_grail: 'Grails gezogen',
  energy_pulled: 'Energiekarten gezogen',
  cards_sold: 'Karten verkauft',
  bottles: 'Pfandflaschen gesammelt',
  minigame_round: 'Minijob-Runden',
  shift_hours: 'Schichtstunden',
  shift_done: 'Schichten beendet',
  bunker_collected: 'Bunker geleert',
  upgrade_bought: 'Upgrades gekauft',
  quest_claimed: 'Quest-Belohnungen',
  stamp_claimed: 'Stempel',
  snack_eaten: 'Snacks gegessen',
  doener_eaten: 'Döner gegessen',
  level_up: 'Level aufgestiegen',
  pechvogel: 'Pechsträhnen (20 ohne Holo)',
}
