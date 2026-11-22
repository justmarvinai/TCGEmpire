// Schattenwirtschaft (docs/GAME_DESIGN.md §16.2, docs/ECONOMY.md §10): every hostile action is one roll,
//   chance = clamp(base + Angriff − Abwehr, 5 %, 85 %)
// Angriff: +5 for every learned Schlitzohr skill, +10 as Rache. Abwehr: the victim's upgrade for that kind
// (`defence` is its stat). Costs are minutes of the attacker's reference income; Präparierte Booster cost a share
// of the booster's value instead. Names and texts are shown by the client, the rest is seeded as config.
export type AttackKind = 'bunker' | 'finanzamt' | 'bewertung' | 'geruecht' | 'abwerben' | 'resealed'

export interface AttackDef {
  key: AttackKind
  name: string
  text: string
  /** base success in % */
  base: number
  costMinutes: number
  defence: string
  /** the upgrade that blocks it, for headlines ("scheitert an …") */
  defenceName: string
}

export const ATTACKS: readonly AttackDef[] = [
  {
    key: 'bunker',
    name: 'Bunker knacken',
    text: 'Räum ein Viertel von dem ab, was im Geldbunker des Opfers liegt und noch nicht abgeholt ist.',
    base: 45,
    costMinutes: 10,
    defence: 'def_bunker',
    defenceName: 'Wachhund Rex',
  },
  {
    key: 'finanzamt',
    name: 'Beim Finanzamt anschwärzen',
    text: 'Ein anonymer Hinweis, und das Finanzamt prüft die Firma. Hinterzogene Steuern und Schwarzarbeit fliegen auf, du kriegst 10 % als Tippgeber. Ist die Firma sauber, zahlst du für falsche Verdächtigung.',
    base: 50,
    costMinutes: 10,
    defence: 'def_finanzamt',
    defenceName: 'Steuerkanzlei',
  },
  {
    key: 'bewertung',
    name: '1-Stern-Bewertung',
    text: 'Eine vernichtende Bewertung im Netz kostet die Firma des Opfers Ruf.',
    base: 55,
    costMinutes: 5,
    defence: 'def_bewertung',
    defenceName: 'Rechtsschutz',
  },
  {
    key: 'abwerben',
    name: 'Abwerben',
    text: 'Ein besseres Angebot, und der beste Mitarbeiter des Opfers arbeitet ab sofort für dich. Treue Leute bleiben eher. Du brauchst eine Firma mit freiem Platz.',
    base: 40,
    costMinutes: 20,
    defence: 'def_abwerben',
    defenceName: 'Betriebsklima',
  },
  {
    key: 'geruecht',
    name: 'Gerücht streuen',
    text: 'Ein Gerücht im Forum treibt den Preis einer Karte um 15 % hoch oder runter. Es verfliegt nach ein paar Stunden. Der beste Faktencheck am Stammtisch kann es entlarven.',
    base: 50,
    costMinutes: 5,
    defence: 'def_geruecht',
    defenceName: 'Faktencheck',
  },
  {
    key: 'resealed',
    name: 'Präparierte Booster',
    text: 'Wiegen, aufschneiden, Hits raus, Bulk rein, zukleben. Du behältst die Karten und den Booster. Loswerden kannst du ihn nur im Direkthandel, wer ihn öffnet, findet nur Bulk. Ein Prüfgerät kann dich auffliegen lassen.',
    base: 55,
    costMinutes: 0,
    defence: 'def_resealed',
    defenceName: 'Prüfgerät',
  },
]

/** What the server needs (seeded as config `darkside.attacks`). */
export const DARKSIDE_CONFIG = {
  'darkside.attacks': Object.fromEntries(ATTACKS.map(({ key, name: _n, text: _t, defenceName: _d, ...a }) => [key, a])),
} as const
