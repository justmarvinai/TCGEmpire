import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * The Commons of Empiremon Abstellgleis, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; brief: docs/sets/empiremon.md). Rail chaos: delays, replacement buses,
 * signal failures and the creatures that live on the platform.
 */
const SPECS: readonly KitSpec[] = [
  // Verspätungsschnecke: a green snail-slug, asleep on the job
  { id: 'emp5-001', art: { a: 'larva', c: '7ab04a 4a7a2a d8f0b0 f0c040', ant: 'two', eyes: 'closed' } },
  // Weichenwiesel: a quick yellow weasel
  { id: 'emp5-002', art: { a: 'quad', n: 4, c: 'e8c040 a88a20 fff0c0 3a3a48', ears: 'round', tail: 'plain', pose: 1 } },
  // Gleisgecko: a rust-spotted grey gecko
  { id: 'emp5-003', art: { a: 'quad', n: 3, c: '8a7a6a 5a4a3a c8b8a8 c86a2a', tail: 'curl', pat: 'spots' } },
  // Schaffnereule: a stern conductor owl in uniform blue
  { id: 'emp5-004', art: { a: 'bird', c: '4a4a7a 2a2a50 c8c8e0 f0c040', ears: 'tuft', belly: 'patch', eyes: 'narrow' } },
  // Pendlerpinguin: a tired commuter penguin in a grey-blue suit
  { id: 'emp5-005', art: { a: 'bird', c: '4a5a7a 2a3248 e8ecf4 d83a3a', belly: 'patch', wings: 'small', eyes: 'vacant' } },
  // Ersatzverkehrsesel: a grumpy grey donkey that stands in for the train
  { id: 'emp5-006', art: { a: 'quad', n: 7, c: '9a9aa0 6a6a72 e0e0e4 f0c030', ears: 'long', tail: 'plain', eyes: 'narrow' } },
  // Bahnsteigbiber: a dark beaver pacing the platform
  { id: 'emp5-007', art: { a: 'biped', n: 1, c: '6a4428 3e2614 c8a080 f0e0c0', ears: 'round', tail: 'club', mouth: 'fang', pose: 1 } },
  // Durchsagendrossel: a thrush that squawks the announcements
  { id: 'emp5-008', art: { a: 'bird', c: 'c8a040 8a6a20 f8e8b0 f05030', belly: 'patch' } },
  // Fahrkartenfalke: a violet falcon diving for your ticket
  { id: 'emp5-009', art: { a: 'bird', pose: 1, c: '6a5a8a 3a2e5a d8d0e8 f0c040', wings: 'bird', eyes: 'angry' } },
  // Klimaanlagenkrake: an ice-blue octopus with chilly hands, puffing cold air
  { id: 'emp5-010', art: { a: 'blob', c: '8ac8f0 4a88c0 e0f4ff c0ecff', x: ['hands', 'split', 'fumes'], eyes: 'narrow' } },
  // Großraumgrille: a green cricket that chirps in the open-plan carriage
  { id: 'emp5-011', art: { a: 'insect', c: '6ab040 3a7a28 d0f0a0 f0e060', wings: 'bug', ant: 'two' } },
  // Kofferkäfer: a beetle with a brown suitcase for a shell
  { id: 'emp5-012', art: { a: 'insect', c: '7a5a3a 4a3420 d8b890 c8c8d0', wings: 'small', ant: 'fork' } },
  // Signalsalamander: a black salamander with signal-yellow stripes
  { id: 'emp5-013', art: { a: 'quad', n: 3, c: '34303a f0c020 5a5464 f0c020', tail: 'plain', pat: 'stripes' } },
  // Stellwerksspinne: a yellow-and-black crawler from the signal box
  { id: 'emp5-014', art: { a: 'insect', c: 'e8c030 3a3a48 fff0b0 d83a2a', ant: 'fork', eyes: 'red' } },
  // Oberleitungsotter: a brown otter on the overhead line
  { id: 'emp5-015', art: { a: 'quad', n: 4, c: '8a6040 5a3a24 e8d0b0 f0d030', ears: 'round', tail: 'plain', x: ['whiskers'] } },
  // Speisewagenschwein: a pink pig with a curly tail
  { id: 'emp5-016', art: { a: 'quad', n: 4, c: 'f0a0a0 c07070 ffe0e0 e06a7a', ears: 'point', tail: 'curl', x: ['nose'] } },
  // Ruhebereichsrobbe: a grey seal with a flipper tail, fast asleep in the quiet zone
  { id: 'emp5-017', art: { a: 'quad', n: 2, c: '8a9aa8 5a6a78 d0dce4 2a2a30', tail: 'fin', eyes: 'closed' } },
  // Tunnelmaulwurf: a slate-grey mole with big digging claws
  { id: 'emp5-018', art: { a: 'biped', n: 1, c: '5a5e6a 3a3e48 a8acb8 f08aa0', pose: 1, eyes: 'closed', x: ['claws', 'nose'] } },
  // Bahnhofstaube: a grey station pigeon with a green sheen
  { id: 'emp5-019', art: { a: 'bird', c: '8a8e9a 6ab090 c8ccd8 f0a030', belly: 'patch' } },
  // Gepäckgeier: a vulture with a ruff, eyeing the luggage
  { id: 'emp5-020', art: { a: 'bird', c: '4a3a4a 2a202a e8d8d0 d89a8a', crest: 'mane', eyes: 'narrow' } },
  // Umsteigeunke: a fire-bellied toad between two trains
  { id: 'emp5-021', art: { a: 'blob', c: '3a6a7a 2a4a58 f08a30 f0c040', pose: 1, belly: 'patch', pat: 'bumps' } },
  // Funklochfledermaus: a violet bat lost in the dead zone
  { id: 'emp5-022', art: { a: 'bird', pose: 1, c: '5a4a78 3a2e50 c8b8e8 f0e060', wings: 'spiky', ears: 'point', eyes: 'vacant' } },
  // Sitzplatzschakal: a sandy jackal that steals your seat
  { id: 'emp5-023', art: { a: 'quad', n: 7, c: 'd89a50 9a6a30 f8e0b8 d83a2a', ears: 'big', tail: 'plain', eyes: 'angry' } },
  // Weichenwurm: a pink earthworm curled round the points
  { id: 'emp5-024', art: { a: 'larva', pose: 1, c: 'd88a8a a85a5a f8d0c8 5a9a3a' } },
  // Notbremsnashorn: a charging rhino in emergency-brake red
  { id: 'emp5-025', art: { a: 'quad', n: 6, c: 'b06a5a 7a4038 e8c8b8 f0e0d0', horn: 'spike', pose: 1, eyes: 'angry' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
