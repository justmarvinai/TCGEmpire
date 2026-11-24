import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * The Commons of Empiremon Spätschicht, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; brief: docs/sets/empiremon.md). Night shift: Späti, Döner, neon and the
 * night bus, so most cards use the night variant of their element scene (v 1).
 */
const SPECS: readonly KitSpec[] = [
  // Dosenkater: a tin-can tomcat with a red label round its belly
  { id: 'emp2-001', art: { a: 'biped', c: '9aa4b0 5a6270 d83a3a f0c030', ears: 'point', tail: 'plain', belly: 'band', eyes: 'narrow', x: ['whiskers'], v: 1 } },
  // Kronkorkenkrabbe: a crab whose shell is a crimped bottle cap
  { id: 'emp2-002', art: { a: 'blob', c: 'd0a838 9a7420 f8e8a0 e04a30', crest: 'spiky', x: ['gloves'], v: 1 } },
  // Kippenkrähe: a scruffy crow from the bus stop ashtray
  { id: 'emp2-003', art: { a: 'bird', c: '3e3848 24202c 8a8494 e8a040', eyes: 'angry', v: 1 } },
  // Neonmotte: a moth glowing in neon pink and cyan
  { id: 'emp2-004', art: { a: 'insect', c: 'f060c8 40e0f0 ffd0f0 fff060', wings: 'bird', ant: 'two', v: 1 } },
  // Pizzakartonpanzer: a turtle with a pizza box for a shell
  { id: 'emp2-005', art: { a: 'biped', n: 1, c: 'a8a060 c8925a f0dcb0 d83a2a', back: 'shell', eyes: 'narrow', v: 1 } },
  // Mitternachtsmops: a midnight-violet pug
  { id: 'emp2-006', art: { a: 'quad', n: 4, c: '5a4a7a 342a4c a898c8 f0e060', ears: 'round', x: ['muzzle'], v: 1 } },
  // Energydrinkechse: a wired lizard in energy-drink green
  { id: 'emp2-007', art: { a: 'quad', n: 4, c: 'b8e030 6a9a18 f8ffa0 3a60ff', crest: 'spiky', tail: 'plain', pose: 1, eyes: 'angry', mouth: 'open', v: 1 } },
  // Frittenfuchs: a golden fries fox with a ketchup-red tail tip
  { id: 'emp2-008', art: { a: 'quad', c: 'f0b030 c07818 fff0b0 d82a2a', ears: 'point', tail: 'fluff', pat: 'stripes', v: 1 } },
  // Nachtbusschnecke: a slow green slug with headlight eyes
  { id: 'emp2-009', art: { a: 'larva', c: '3a8a4a 245a34 c8e8a0 f0e060', ant: 'two', v: 1 } },
  // Kioskkakadu: a cockatoo with a yellow crest
  { id: 'emp2-010', art: { a: 'bird', c: 'f4f0e8 c8c0b0 fffcf4 f0c830', crest: 'plume' } },
  // Dönerdachs: a badger with a striped back and a mean grin
  { id: 'emp2-011', art: { a: 'quad', n: 4, c: '8a7a6a 3a3030 f0e8dc d84a20', ears: 'round', pat: 'stripes', eyes: 'narrow', mouth: 'fang', v: 1 } },
  // Laternenlibelle: a dragonfly that glows like a street lamp
  { id: 'emp2-012', art: { a: 'insect', c: 'f8d040 c89020 fff8c0 60c0ff', wings: 'bug', ant: 'two', v: 1 } },
  // Rucksackratte: a standing rat with a red backpack
  { id: 'emp2-013', art: { a: 'biped', c: '8a8490 d84a3a c8c0c8 3a3a48', ears: 'round', tail: 'plain', back: 'shell', x: ['whiskers'], v: 1 } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
