import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * The Commons of Empiremon Amt & Elend, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; brief: docs/sets/empiremon.md). Bureaucracy: stamps, forms, waiting
 * numbers and the fax, in office greys, file blues and paper whites.
 */
const SPECS: readonly KitSpec[] = [
  // Stempelkrebs: a grey crab with two rubber stamps for claws
  { id: 'emp3-001', art: { a: 'blob', c: '8a8e9a 5a5e6a d0d4dc c83a3a', pose: 1, eyes: 'angry', x: ['gloves'] } },
  // Formularfalter: a butterfly with wings of form paper
  { id: 'emp3-002', art: { a: 'insect', c: '5a9a3a e8f0d8 ffffff 3a8a3a', wings: 'bird', ant: 'two' } },
  // Aktenschnecke: a file-blue slug with paper-white skin
  { id: 'emp3-003', art: { a: 'larva', c: '6a8ab8 3a5a88 f0ead8 f0c040', ant: 'two', eyes: 'narrow' } },
  // Wartenummerwurm: a grey worm, rearing up and bored to death
  { id: 'emp3-004', art: { a: 'larva', pose: 1, c: 'a8a4a0 787470 e8e4dc d83a3a', eyes: 'vacant', mouth: 'none' } },
  // Paragrafenpython: a violet python coiled like a paragraph sign
  { id: 'emp3-005', art: { a: 'serpent', pose: 1, c: '7a4ab0 4a2a78 d8c0f0 f0d060', eyes: 'narrow', mouth: 'fang' } },
  // Kopierkobold: a toner-yellow goblin, mid-tantrum
  { id: 'emp3-006', art: { a: 'humanoid', pose: 1, c: 'e8d050 a89020 fff8d0 4a4a5a', ears: 'point', eyes: 'angry', mouth: 'fang' } },
  // Tackerdackel: a grey stapler dachshund
  { id: 'emp3-007', art: { a: 'quad', n: 3, c: '8a909c 4a505c c8ccd4 2a2a34', ears: 'round', tail: 'plain' } },
  // Lochermaulwurf: a hole-punch mole with big claws and a pink nose
  { id: 'emp3-008', art: { a: 'biped', n: 1, c: '5a4a48 3a2e30 a8948c f08aa0', eyes: 'closed', x: ['claws', 'nose'] } },
  // Faxfledermaus: a grey bat with yellow ears, screeching like a fax
  { id: 'emp3-009', art: { a: 'bird', pose: 1, c: '5a5a6a 3a3a48 c8c8d0 f0e040', wings: 'spiky', ears: 'point' } },
  // Kaffeeautomatenkauz: a coffee-brown owl, eyes wide open
  { id: 'emp3-010', art: { a: 'bird', c: '7a4a2a 4a2a18 e8d0b0 f07030', ears: 'tuft', belly: 'patch', eyes: 'vacant' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
