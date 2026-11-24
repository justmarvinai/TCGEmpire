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
