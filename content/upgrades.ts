// Account upgrades: bought with money, many levels. Cost of the next level = cost * growth^level (Basis-€),
// player level needed for the next level = minLevel + floor(level * levelStep).
// `stat` + `per` become a modifier (value = per * level); bunker yield has its own formula (docs/ECONOMY.md §6).
export interface UpgradeDef {
  key: string
  group: 'bunker' | 'jobs' | 'oeffnen' | 'handel' | 'fortschritt'
  name: string
  text: string
  max: number
  costBaseCents: number
  growth: number
  minLevel: number
  levelStep: number
  stat?: string
  op?: 'flat' | 'pct'
  per?: number
  /** how the client shows the effect */
  unit: 'eur_h' | 'h' | 'pct' | 'energy' | 'pts'
}

export const UPGRADES: readonly UpgradeDef[] = [
  { key: 'bunker_ertrag', group: 'bunker', name: 'Ertrag', text: 'Mehr Geld pro Stunde im Geldbunker. +12 % pro Stufe.', max: 60, costBaseCents: 500_00, growth: 1.17, minLevel: 3, levelStep: 0.5, unit: 'eur_h' },
  { key: 'bunker_kapazitaet', group: 'bunker', name: 'Kapazität', text: 'Der Bunker sammelt länger, bevor er voll ist. +2 Stunden pro Stufe.', max: 10, costBaseCents: 1_000_00, growth: 1.6, minLevel: 3, levelStep: 2, stat: 'bunker_capacity_h', op: 'flat', per: 2, unit: 'h' },
  { key: 'bunker_zinsen', group: 'bunker', name: 'Zinsen', text: 'Bonus beim Abholen, wenn der Bunker zu mindestens 90 % voll ist. Geduld zahlt sich aus.', max: 10, costBaseCents: 2_500_00, growth: 1.5, minLevel: 6, levelStep: 2, stat: 'bunker_interest_pct', op: 'flat', per: 3, unit: 'pct' },
  { key: 'bunker_sicherheit', group: 'bunker', name: 'Sicherheit', text: 'Panzertür, Kamera, Wachhund Rex. Schützt vor Einbrechern, sobald deine Freunde welche werden.', max: 10, costBaseCents: 2_000_00, growth: 1.5, minLevel: 8, levelStep: 2, stat: 'def_bunker', op: 'flat', per: 5, unit: 'pts' },
  { key: 'energie_tank', group: 'jobs', name: 'Energietank', text: 'Mehr maximale Energie für Minijobs. +10 pro Stufe.', max: 10, costBaseCents: 800_00, growth: 1.45, minLevel: 5, levelStep: 2, stat: 'energy_max', op: 'flat', per: 10, unit: 'energy' },
  { key: 'ausdauer', group: 'jobs', name: 'Ausdauer', text: 'Energie lädt schneller nach. +10 % pro Stufe.', max: 10, costBaseCents: 1_200_00, growth: 1.45, minLevel: 6, levelStep: 2, stat: 'energy_regen_pct', op: 'flat', per: 10, unit: 'pct' },
  { key: 'fleiss', group: 'jobs', name: 'Fleiß', text: 'Mehr Lohn in Schichten und Minijobs. +5 % pro Stufe.', max: 20, costBaseCents: 1_500_00, growth: 1.35, minLevel: 7, levelStep: 1, stat: 'wage_pct', op: 'flat', per: 5, unit: 'pct' },
  { key: 'pack_glueck', group: 'oeffnen', name: 'Pack-Glück', text: 'Höhere Chance auf Alternative, Ultra und Grail. +5 % pro Stufe, höchstens +50 % insgesamt.', max: 10, costBaseCents: 3_000_00, growth: 1.6, minLevel: 5, levelStep: 3, stat: 'pack_luck', op: 'flat', per: 5, unit: 'pct' },
  { key: 'verkaufsflaeche', group: 'handel', name: 'Verkaufsfläche', text: 'Mehr Plätze für Angebote und Gesuche am Cardmarket. +5 pro Stufe.', max: 10, costBaseCents: 2_500_00, growth: 1.5, minLevel: 10, levelStep: 2, stat: 'listing_slots', op: 'flat', per: 5, unit: 'pts' },
  { key: 'lagerregal', group: 'handel', name: 'Lagerregal', text: 'Mehr Platz für Sealed im Lager. +30 Booster oder Displays pro Stufe.', max: 10, costBaseCents: 3_000_00, growth: 1.5, minLevel: 18, levelStep: 2, stat: 'lager_units', op: 'flat', per: 30, unit: 'pts' },
  { key: 'schnelllerner', group: 'fortschritt', name: 'Schnelllerner', text: 'Mehr EP aus allem. +3 % pro Stufe.', max: 20, costBaseCents: 2_000_00, growth: 1.4, minLevel: 5, levelStep: 2, stat: 'ep', op: 'pct', per: 3, unit: 'pct' },
]
