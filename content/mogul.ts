// Mogul sinks (docs/GAME_DESIGN.md §15): Luxus from level 55 (tiny permanent bonuses, shown on the profile, its own
// toplist, kept through an exit), Megaprojekte from level 65 (whole-server donation goals, one after another, each
// with a permanent bonus for everyone) and Museum auctions (1-of-1 trophies the admin puts up; the winner goes into
// the Hall of Fame). Brand names live here so they can be swapped in one place.
export interface LuxuryDef {
  key: string
  group: 'auto' | 'uhr' | 'yacht' | 'jet'
  name: string
  text: string
  level: number
  priceBaseCents: number
  stat: string
  op: 'flat' | 'pct'
  value: number
}

export const LUXURY: readonly LuxuryDef[] = [
  { key: 'golf', group: 'auto', name: 'Golf GTI', text: 'Tiefergelegt, Duftbaum, Auspuff lauter als der Motor. +1 % Lohn.', level: 55, priceBaseCents: 50_000_00, stat: 'wage_pct', op: 'flat', value: 1 },
  { key: 'amg', group: 'auto', name: 'AMG mit Klappenauspuff', text: 'Die Nachbarn lieben dich. Vor allem um sechs Uhr morgens. +2 % Lohn.', level: 70, priceBaseCents: 500_000_00, stat: 'wage_pct', op: 'flat', value: 2 },
  { key: 'lambo', group: 'auto', name: 'Lamborghini', text: 'Kein Kofferraum, keine Rückbank, keine Reue. +3 % Lohn.', level: 80, priceBaseCents: 5_000_000_00, stat: 'wage_pct', op: 'flat', value: 3 },
  { key: 'rolex', group: 'uhr', name: 'Rolex Submariner', text: 'Du schaust jetzt ständig auf die Uhr. Damit es jeder sieht. +1 % EP.', level: 55, priceBaseCents: 20_000_00, stat: 'ep', op: 'pct', value: 1 },
  { key: 'patek', group: 'uhr', name: 'Patek Philippe', text: 'Man besitzt sie nicht, man bewahrt sie für die nächste Generation. Du nicht. +2 % EP.', level: 70, priceBaseCents: 500_000_00, stat: 'ep', op: 'pct', value: 2 },
  { key: 'mille', group: 'uhr', name: 'Richard Mille', text: 'Sieht aus wie Plastik, kostet wie ein Haus. +3 % EP.', level: 90, priceBaseCents: 5_000_000_00, stat: 'ep', op: 'pct', value: 3 },
  { key: 'yacht', group: 'yacht', name: 'Motoryacht', text: 'Für den Wannsee reicht es. +3 % Ertrag im Geldbunker.', level: 80, priceBaseCents: 20_000_000_00, stat: 'bunker_rate_pct', op: 'flat', value: 3 },
  { key: 'superyacht', group: 'yacht', name: 'Superyacht mit Hubschrauberlandeplatz', text: 'Hubschrauber hast du keinen. Den Landeplatz schon. +6 % Ertrag im Geldbunker.', level: 90, priceBaseCents: 200_000_000_00, stat: 'bunker_rate_pct', op: 'flat', value: 6 },
  { key: 'jet', group: 'jet', name: 'Privatjet', text: 'Für die zwölf Minuten zum Kartenladen. +1 % Pack-Glück.', level: 90, priceBaseCents: 50_000_000_00, stat: 'pack_luck', op: 'flat', value: 1 },
  { key: 'jumbo', group: 'jet', name: 'Eigener Jumbo', text: 'Ein ganzer Jumbo, nur für dich und deine Sammlung. +2 % Pack-Glück.', level: 90, priceBaseCents: 500_000_000_00, stat: 'pack_luck', op: 'flat', value: 2 },
]

export interface MegaprojectDef {
  key: string
  name: string
  text: string
  goalBaseCents: number
  stat: string
  op: 'flat' | 'pct'
  value: number
  bonus: string
}

/** In this order, one at a time. The bonus counts for every player once the goal is reached. */
export const MEGAPROJECTS: readonly MegaprojectDef[] = [
  { key: 'ber', name: 'BER fertigbauen', text: 'Der Flughafen ist offen. Fertig ist er nicht. Ihr baut ihn zu Ende. Wahrscheinlich.', goalBaseCents: 20_000_000_00, stat: 'wage_pct', op: 'flat', value: 2, bonus: '+2 % Lohn für alle' },
  { key: 's21', name: 'Stuttgart 21', text: 'Ein Bahnhof unter der Erde. Seit Jahrzehnten. Euer Geld bringt den letzten Zug ans Ziel.', goalBaseCents: 50_000_000_00, stat: 'ep', op: 'pct', value: 2, bonus: '+2 % EP für alle' },
  { key: 'schalke', name: 'Schalke 04 retten', text: 'Der Verein braucht Geld. Wieder. Diesmal von euch.', goalBaseCents: 100_000_000_00, stat: 'bunker_rate_pct', op: 'flat', value: 5, bonus: '+5 % Ertrag im Geldbunker für alle' },
  { key: 'elphi', name: 'Elbphilharmonie II', text: 'Das Original war zu billig. Ihr baut ein zweites. Mit Kartenvitrine im Foyer.', goalBaseCents: 250_000_000_00, stat: 'pack_luck', op: 'flat', value: 1, bonus: '+1 % Pack-Glück für alle' },
]

export interface TrophyDef {
  key: string
  name: string
  text: string
}

/** 1-of-1 trophies for the Museum auctions (the admin starts them). */
export const TROPHIES: readonly TrophyDef[] = [
  { key: 'illustrator', name: 'Pikachu Illustrator', text: 'Die heilige Karte. Es gibt nur diese eine im ganzen Spiel. Wer sie hat, hat gewonnen.' },
  { key: 'luster', name: 'Turnier-Schwarzer Glanzsoldat', text: 'Ein Turnierpreis aus einer Zeit, als Duelle noch auf Schulhöfen entschieden wurden.' },
  { key: 'gold_luffy', name: 'Goldener Ruffy', text: 'Massiv vergoldet, nummeriert 1/1. Der Piratenkönig unter den Karten.' },
  { key: 'prototype', name: 'Riftbound-Prototyp', text: 'Ein Testdruck, der das Werk nie hätte verlassen dürfen. Hat er aber.' },
]

/** What the server needs (seeded as config). */
export const MOGUL_CONFIG = {
  'luxury.items': Object.fromEntries(LUXURY.map(({ key, name: _n, text: _t, ...l }) => [key, l])),
  'mega.projects': MEGAPROJECTS.map(({ name: _n, text: _t, bonus: _b, ...m }) => m),
  'museum.trophies': TROPHIES.map((t) => t.key),
} as const
