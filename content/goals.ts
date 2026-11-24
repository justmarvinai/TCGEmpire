// Sammelziele (docs/GAME_DESIGN.md §6): small permanent bonuses for collecting (pack_luck counts percent points). A goal is a list of card groups;
// a group counts as soon as you have ever owned one card of it (pulled, bought, traded); with minGrade only a slab of that grade counts. Per set: all Holos and the
// complete set; plus themed goals with a joke. Bonuses go through the modifier engine and stay after selling.
import { SETS } from './catalog.ts'
import { COPY_TIERS } from './types.ts'

export type GoalStat = 'pack_luck' | 'ep' | 'energy_max' | 'listing_slots' | 'lager_units' | 'grading_slots'

export interface GoalDef {
  key: string
  set: string
  name: string
  /** shown when the goal is reached */
  joke: string
  groups: readonly (readonly string[])[]
  /** a group only counts with a slab of at least this grade (Master Set) */
  minGrade?: number
  bonus: { stat: GoalStat; op: 'flat' | 'pct'; value: number }
}

const THEMES: readonly GoalDef[] = [
  {
    key: 'exodia',
    set: 'yugioh-lob',
    name: 'Exodia, komplett',
    joke: 'Alle fünf Teile. Du hast automatisch gewonnen. Nichts. Aber gewonnen.',
    groups: [['ygo-lob-037'], ['ygo-lob-038'], ['ygo-lob-039'], ['ygo-lob-040'], ['ygo-lob-084', 'ygo-lob-079']],
    bonus: { stat: 'pack_luck', op: 'flat', value: 5 },
  },
  {
    key: 'starters',
    set: 'pokemon-base',
    name: 'Die drei Starter, voll entwickelt',
    joke: 'Bisaflor, Turtok, Glurak. Opa glaubt es erst, wenn er es sieht. Er sieht schlecht.',
    groups: [['pkm-base-087'], ['pkm-base-088'], ['pkm-base-090']],
    bonus: { stat: 'energy_max', op: 'flat', value: 10 },
  },
  {
    key: 'strohhut',
    set: 'onepiece-op01',
    name: 'Die ganze Strohhut-Bande',
    joke: 'Zehn Leute, ein Schiff, null Plan. Fühlt sich an wie deine WG.',
    groups: [
      ['op01-003', 'op01-018', 'op01-081', 'op01-085'],
      ['op01-001', 'op01-019', 'op01-078', 'op01-086'],
      ['op01-012', 'op01-080'],
      ['op01-004'],
      ['op01-009'],
      ['op01-011'],
      ['op01-013'],
      ['op01-015'],
      ['op01-016'],
      ['op01-010'],
    ],
    bonus: { stat: 'listing_slots', op: 'flat', value: 1 },
  },
  {
    key: 'runes',
    set: 'riftbound-origins',
    name: 'Alle sechs Runen',
    joke: 'Sechs glühende Steine. Wertlos. Aber vollständig. Wie dein Lebenslauf.',
    groups: [['rb-ogn-018'], ['rb-ogn-035'], ['rb-ogn-047'], ['rb-ogn-058'], ['rb-ogn-067'], ['rb-ogn-075']],
    bonus: { stat: 'lager_units', op: 'flat', value: 4 },
  },
  // sets 2 and 3 (0.0.9): one themed goal each
  {
    key: 'evoli',
    set: 'pokemon-jungle',
    name: 'Evoli und seine drei Steine',
    joke: 'Feuer, Wasser, Blitz. Evoli hat mehr Karriereoptionen als du.',
    groups: [
      ['pkm-jungle-055', 'pkm-jungle-070'],
      ['pkm-jungle-025', 'pkm-jungle-060', 'pkm-jungle-073'],
      ['pkm-jungle-032', 'pkm-jungle-063', 'pkm-jungle-074'],
      ['pkm-jungle-028', 'pkm-jungle-061', 'pkm-jungle-077'],
    ],
    bonus: { stat: 'energy_max', op: 'flat', value: 5 },
  },
  {
    key: 'voegel',
    set: 'pokemon-fossil',
    name: 'Die drei legendären Vögel',
    joke: 'Eis, Blitz, Feuer. Und du kriegst nicht mal den Grill an.',
    groups: [
      ['pkm-fossil-024', 'pkm-fossil-060', 'pkm-fossil-071'],
      ['pkm-fossil-029', 'pkm-fossil-061', 'pkm-fossil-072'],
      ['pkm-fossil-010', 'pkm-fossil-056', 'pkm-fossil-069'],
    ],
    bonus: { stat: 'pack_luck', op: 'flat', value: 3 },
  },
  {
    key: 'torwaechter',
    set: 'yugioh-mrd',
    name: 'Der Torwächter und seine drei Teile',
    joke: 'Drei Monster opfern, um eins zu rufen. Klingt wie dein Bewerbungsprozess.',
    groups: [['ygo-mrd-025'], ['ygo-mrd-026'], ['ygo-mrd-027'], ['ygo-mrd-079', 'ygo-mrd-087']],
    bonus: { stat: 'lager_units', op: 'flat', value: 4 },
  },
  {
    key: 'toon',
    set: 'yugioh-mrl',
    name: 'Toon-Welt, voll besetzt',
    joke: 'Alles ist lustiger als Cartoon. Außer dein Kontoauszug.',
    groups: [
      ['ygo-mrl-055', 'ygo-mrl-066'],
      ['ygo-mrl-067', 'ygo-mrl-074'],
      ['ygo-mrl-070', 'ygo-mrl-077'],
      ['ygo-mrl-073', 'ygo-mrl-080'],
    ],
    bonus: { stat: 'ep', op: 'pct', value: 3 },
  },
  {
    key: 'admirale',
    set: 'onepiece-op02',
    name: 'Die drei Admiräle',
    joke: 'Magma, Licht und Eis. Drei Rentner mit Superkräften und Dienstwagen.',
    groups: [
      ['op02-056', 'op02-079'],
      ['op02-064', 'op02-082'],
      ['op02-069', 'op02-088'],
    ],
    bonus: { stat: 'grading_slots', op: 'flat', value: 1 },
  },
  {
    key: 'charlotte',
    set: 'onepiece-op03',
    name: 'Familie Charlotte',
    joke: 'Mama hat 85 Kinder. Du kriegst nicht mal einen Rückruf von der Hausverwaltung.',
    groups: [
      ['op03-043', 'op03-064', 'op03-076', 'op03-083'],
      ['op03-055', 'op03-069', 'op03-086', 'op03-088'],
      ['op03-059'],
      ['op03-060'],
      ['op03-061'],
      ['op03-062', 'op03-081'],
      ['op03-063', 'op03-082'],
    ],
    bonus: { stat: 'listing_slots', op: 'flat', value: 1 },
  },
  {
    key: 'ionia',
    set: 'riftbound-spiritforged',
    name: 'Ionias Klingen',
    joke: 'Irelia, Yasuo, Yone. Drei Schwerter, null Therapieplätze.',
    groups: [['rb-sfd-016', 'rb-sfd-018', 'rb-sfd-071', 'rb-sfd-080', 'rb-sfd-087'], ['rb-sfd-041', 'rb-sfd-084'], ['rb-sfd-085']],
    bonus: { stat: 'energy_max', op: 'flat', value: 5 },
  },
  {
    key: 'mondnacht',
    set: 'riftbound-unleashed',
    name: 'Mond, Trübsal und Baron',
    joke: 'Diana, Vex und ein Riesenwurm. Klingt wie dein letzter Gruppenurlaub.',
    groups: [
      ['rb-unl-030', 'rb-unl-032', 'rb-unl-070', 'rb-unl-085'],
      ['rb-unl-017', 'rb-unl-020', 'rb-unl-068', 'rb-unl-083'],
      ['rb-unl-052', 'rb-unl-077', 'rb-unl-086'],
    ],
    bonus: { stat: 'pack_luck', op: 'flat', value: 3 },
  },
]

const SET_GOALS: readonly GoalDef[] = SETS.flatMap((s) => [
  {
    key: `holos-${s.id}`,
    set: s.id,
    name: `Alle Holos: ${s.name}`,
    joke: 'Glänzt alles. Du auch, ein bisschen.',
    groups: s.cards.filter((c) => c.tier === 'holo').map((c) => [c.id]),
    bonus: { stat: 'pack_luck', op: 'flat', value: 3 },
  },
  {
    key: `set-${s.id}`,
    set: s.id,
    name: `Set komplett: ${s.name}`,
    joke: 'Jede Karte einmal. Deine Familie macht sich Sorgen.',
    groups: s.cards.map((c) => [c.id]),
    bonus: { stat: 'ep', op: 'pct', value: 5 },
  },
  {
    key: `master-${s.id}`,
    set: s.id,
    name: `Master Set: ${s.name}`,
    joke: 'Jede Holo und besser im Slab, alles 9 oder höher. Dein Konto weint, dein Regal glänzt.',
    groups: s.cards.filter((c) => COPY_TIERS.includes(c.tier)).map((c) => [c.id]),
    minGrade: 9,
    bonus: { stat: 'grading_slots', op: 'flat', value: 2 },
  },
])

// A goal needs something to collect: Empiremon sets have no Holos (0.0.5).
export const GOALS: readonly GoalDef[] = [...SET_GOALS.filter((g) => g.groups.length > 0), ...THEMES]
