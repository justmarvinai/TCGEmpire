import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * The Commons of Empiremon Pfandland, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; brief: docs/sets/empiremon.md). Deposit and recycling: bottle glass,
 * crates, cans, caps and labels.
 */
const SPECS: readonly KitSpec[] = [
  // Pfandpinguin: a classic black-and-white penguin
  { id: 'emp4-001', art: { a: 'bird', c: '2a3048 1a1e30 f4f4f8 f0a020', belly: 'patch', wings: 'small' } },
  // Flaschengeist: a bottle-green ghost with floating hands
  {
    id: 'emp4-002',
    art: { a: 'blob', c: 'a8e0b8 5a9a70 e8fff0 c0a0ff', eyes: 'vacant', x: ['wisp', 'hands'] },
  },
  // Dosendachs: a badger of silver can tin with a red stripe
  {
    id: 'emp4-003',
    art: { a: 'quad', n: 4, c: 'a8b0bc 6a7280 d83a3a 3a3a48', ears: 'round', belly: 'band', pose: 1 },
  },
  // Kistenkrabbe: a crab shaped like a green beer crate
  { id: 'emp4-004', art: { a: 'blob', c: '3a8a4a 245a30 a8d8a0 e8b030', x: ['gloves', 'split'] } },
  // Scherbenschlange: a snake of broken green glass with shard spikes
  {
    id: 'emp4-005',
    art: { a: 'serpent', c: '6a9a6a 3a5a3a c0e0b0 e8f0e0', crest: 'spiky', eyes: 'narrow', mouth: 'fang' },
  },
  // Kronkorkenkäfer: a beetle with a golden bottle-cap shell
  { id: 'emp4-006', art: { a: 'insect', c: 'd8b040 9a7a20 fff0b0 3a3a48', wings: 'bug', ant: 'two' } },
  // Mehrwegmaus: a brown mouse with a recycling-green curly tail
  {
    id: 'emp4-007',
    art: { a: 'quad', n: 3, c: 'a89a8a 7a6a5a e8e0d4 5ab050', ears: 'big', tail: 'curl', x: ['whiskers'] },
  },
  // Einwegigel: a hedgehog of blue single-use plastic
  { id: 'emp4-008', art: { a: 'quad', n: 3, c: 'c8d0dc 3a8ad8 f4f8ff 2a2a3a', back: 'spikes', x: ['nose'] } },
  // Leergutlurch: an axolotl-like newt with feathery gills
  {
    id: 'emp4-009',
    art: { a: 'quad', n: 3, c: '5ab8a0 2a7a6a f0a0b8 f08aa0', crest: 'fins', tail: 'plain' },
  },
  // Bierdeckelbiber: a beaver with a flat coaster tail
  {
    id: 'emp4-010',
    art: {
      a: 'biped',
      n: 1,
      c: '8a5a30 5a3a1e d8b890 f0e0c0',
      ears: 'round',
      tail: 'club',
      mouth: 'fang',
      belly: 'patch',
    },
  },
  // Glascontainerkrake: a bottle-green octopus floating with four arms
  { id: 'emp4-011', art: { a: 'humanoid', n: 1, pose: 2, c: '4aa070 2a6a48 c0f0d0 9ad8b0', x: ['arms4'] } },
  // Etikettenechse: a green lizard with a paper-label belly
  {
    id: 'emp4-012',
    art: { a: 'quad', n: 4, c: '6ab048 3a7a2a f0ece0 d83a3a', crest: 'ridge', tail: 'plain', belly: 'band' },
  },
  // Sixpackspinne: a dark crawler caught in six-pack rings
  { id: 'emp4-013', art: { a: 'insect', c: '4a3a68 2a2040 d8d0e8 f0e060', ant: 'fork', eyes: 'red' } },
  // Gärkellerkröte: a squat amber toad, fuming from the fermenting cellar
  {
    id: 'emp4-014',
    art: {
      a: 'blob',
      c: 'b07a30 7a4a1a f0d890 f8e8a0',
      pose: 1,
      eyes: 'narrow',
      mouth: 'open',
      x: ['fumes'],
    },
  },
  // Korkenkobold: a cork goblin, round and grumpy
  { id: 'emp4-015', art: { a: 'cocoon', c: 'c89a60 8a6a3a f0dcb0 5a9a3a', eyes: 'angry', mouth: 'fang' } },
  // Strohhalmstorch: a white stork with a red straw beak
  { id: 'emp4-016', art: { a: 'bird', c: 'f4f4f0 2a2a30 ffffff e84a4a', pose: 1, wings: 'bird' } },
  // Pfandbonbär: a bear with a paper receipt for a belly
  {
    id: 'emp4-017',
    art: { a: 'biped', n: 1, c: 'b8a088 8a7058 f8f4ec 3a3a48', ears: 'round', belly: 'patch', mouth: 'open' },
  },
  // Tütenqualle: a plastic-bag jellyfish
  {
    id: 'emp4-018',
    art: { a: 'blob', c: 'e8f0f8 b0c0d8 ffffff 90d0ff', eyes: 'vacant', mouth: 'none', x: ['wisp'] },
  },
  // Rückgaberabe: a black raven with red eyes
  {
    id: 'emp4-019',
    art: { a: 'bird', pose: 1, c: '2a2438 18141f 6a608a ff4a3a', wings: 'bird', eyes: 'red' },
  },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
