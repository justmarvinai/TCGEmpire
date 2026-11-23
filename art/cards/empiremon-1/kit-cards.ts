import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * The Commons of Empiremon Grundauflage, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; brief: docs/sets/empiremon.md). The first generation: classic wild
 * creatures, bright and friendly, each a simple kit creature that fits its pun name. The element picks
 * the scene (art/kit/index.ts); the frame writes no text (art/frames/empiremon.ts).
 */
const SPECS: readonly KitSpec[] = [
  // Funkfuchs: a steel-blue radio fox with a white chest, a curly cable for a tail and a little yellow
  // spark of an antenna on its head
  {
    id: 'emp1-001',
    art: { a: 'quad', c: '6a8cc0 34486e eef2fa ffd84a', ears: 'point', tail: 'curl', ant: 'fork', belly: 'patch', pose: 1, x: ['muzzle'] },
  },
  // Glutkröte: a red-hot toad covered in warts
  { id: 'emp1-002', art: { a: 'blob', c: 'dc5a2c 9a2e18 f8cc6c ffa02a', pose: 1, pat: 'bumps', mouth: 'open' } },
  // Pfützling: a little puddle that sits up and smiles
  { id: 'emp1-003', art: { a: 'blob', c: '62b4f0 2e78c8 d8f2ff 9ad8ff', pose: 1, x: ['cheeks'] } },
  // Moosbär: a heavy bear overgrown with moss
  { id: 'emp1-004', art: { a: 'biped', n: 1, c: '6a8a3a 3e5e24 c8dc8a 8a5a30', ears: 'round', belly: 'patch', pat: 'spots', x: ['claws'] } },
  // Kieselkauz: a pebble-grey owl
  { id: 'emp1-005', art: { a: 'bird', c: '9a9ca4 6a6c78 dcdee4 f0a030', ears: 'tuft', belly: 'patch' } },
  // Spukspatz: a pale ghost sparrow in flight
  { id: 'emp1-006', art: { a: 'bird', c: 'c4b0ec 8a6ac0 f4eeff 9a7ad8', pose: 1, wings: 'bird', eyes: 'vacant' } },
  // Flämmchen: a little living flame
  { id: 'emp1-007', art: { a: 'cocoon', pose: 2, c: 'fa9a30 d84a1c fff0a0 ffcc40' } },
  // Blubbaal: a blue eel blowing bubbles
  { id: 'emp1-008', art: { a: 'serpent', c: '2e7ed4 1a4c94 b0e4fa cff4ff', crest: 'fins', x: ['orbs'] } },
  // Knospenkobold: a goblin with a flower bud on its back
  { id: 'emp1-009', art: { a: 'biped', c: '7cc052 4a8a30 dcf2a8 f06aa0', ears: 'point', back: 'bud', mouth: 'fang' } },
  // Zappelmaus: a fidgety lavender mouse with big ears and a curly tail
  { id: 'emp1-010', art: { a: 'quad', n: 3, c: 'c8c2dc 8a84a4 f4f0ff ffd84a', ears: 'big', tail: 'curl', pose: 1, x: ['whiskers'] } },
  // Bröckelbock: a crumbling stone goat
  { id: 'emp1-011', art: { a: 'quad', n: 7, c: 'a09a8c 6e685e dcd8cc 5c564c', horn: 'back', pat: 'bumps', eyes: 'narrow' } },
  // Nebelnatter: a coiled fog adder
  { id: 'emp1-012', art: { a: 'serpent', pose: 1, c: '9a8cc4 665a92 dcd6f2 c4a6ff', eyes: 'narrow', mouth: 'fang' } },
  // Rußratte: a soot-black rat with ember eyes
  { id: 'emp1-013', art: { a: 'quad', n: 3, c: '4a4248 2c2630 8a7e82 f07030', ears: 'round', tail: 'plain', eyes: 'red', x: ['whiskers'] } },
  // Schlammschnecke: a mud slug with eye stalks
  { id: 'emp1-014', art: { a: 'larva', c: '8a6a42 5a4228 c8ac80 6a8a3a', ant: 'two', eyes: 'closed' } },
  // Steckdosenigel: a socket-white hedgehog with yellow spark spines
  { id: 'emp1-015', art: { a: 'quad', n: 3, c: 'e4e0d4 f2c428 fffaf0 3a3a48', back: 'spikes', x: ['nose'] } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
