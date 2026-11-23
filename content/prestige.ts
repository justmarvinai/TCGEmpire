// Prestige, "Der Exit" (docs/GAME_DESIGN.md §20, docs/ECONOMY.md §11). From level 100 the empire is sold for
// Empire-Sterne; level, money, upgrades, skills, bunker, company and home start over, the collection waits on Omas
// Dachboden. Perks are bought with Sterne and stay forever: modest per level, the next level always costs more
// (cost of the next level = costBase × growth^level, rounded).
export interface PerkDef {
  key: string
  name: string
  text: string
  stat: string
  op: 'flat' | 'pct'
  per: number
  max: number
  costBase: number
  growth: number
}

export const PERKS: readonly PerkDef[] = [
  { key: 'lohn', name: 'Fleißiges Erbe', text: '+5 % Lohn in Schichten und Minijobs pro Stufe.', stat: 'wage_pct', op: 'flat', per: 5, max: 10, costBase: 3, growth: 1.4 },
  { key: 'zinsen', name: 'Altes Geld', text: '+10 % Ertrag im Geldbunker pro Stufe.', stat: 'bunker_rate_pct', op: 'flat', per: 10, max: 10, costBase: 3, growth: 1.4 },
  { key: 'ep', name: 'Schnellstarter', text: '+5 % EP aus allem pro Stufe.', stat: 'ep', op: 'pct', per: 5, max: 10, costBase: 3, growth: 1.4 },
  { key: 'glueck', name: 'Glückliches Händchen', text: '+2 % Pack-Glück pro Stufe.', stat: 'pack_luck', op: 'flat', per: 2, max: 10, costBase: 4, growth: 1.5 },
  { key: 'erbe', name: 'Erbschaft', text: 'Nach jedem Exit startest du mit 2.500 € mehr pro Stufe.', stat: 'start_cash_base', op: 'flat', per: 2_500_00, max: 10, costBase: 2, growth: 1.4 },
  { key: 'oma', name: 'Omas Liebling', text: 'Oma rückt jeden Tag 25 % mehr vom Dachboden raus pro Stufe.', stat: 'attic_pct', op: 'flat', per: 25, max: 8, costBase: 2, growth: 1.4 },
]

/** Prestige ranks by number of exits; beyond the list the last one counts up. */
export const PRESTIGE_RANKS: readonly string[] = [
  'Kleinunternehmer',
  'Mittelständler',
  'Hidden Champion',
  'DAX-Vorstand',
  'Oligarch',
  'Bond-Bösewicht',
  'Weltherrscher',
]

export const PRESTIGE_CONFIG = {
  'prestige.perks': Object.fromEntries(PERKS.map(({ key, name: _n, text: _t, ...p }) => [key, p])),
} as const
