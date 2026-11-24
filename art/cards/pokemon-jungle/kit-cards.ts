import type { CreatureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of Dschungel below Ultra, as compact kit specs (format: art/kit/index.ts). Attacks:
 * 'Name:COST:DAMAGE|…', energy letters F W P E Y K C; an empty cost marks a Pokémon-Power. A Non-Holo
 * twin shares its holo's creature (the kit lets only Holo and Alternative shine); an Alternative
 * reuses its creature with another pose and scene.
 */
const NIDOQUEEN: CreatureCard = {
  a: 'biped', c: '5a80c8 2a4a90 e8dcb0', ears: 'big', back: 'spikes', tail: 'plain', belly: 'patch', eyes: 'angry', mouth: 'fang', n: 1, s: 1.15, scene: 'Feuer',
}
const GIFLOR: CreatureCard = { a: 'biped', c: '4a5ab0 d84a4a b0c0f0 f0e070', back: 'bulb', eyes: 'narrow', n: 1, s: 1.15 }
const OMOT: CreatureCard = { a: 'insect', c: 'b090d8 7a58a8 f0e8f8 3a68d8', wings: 'bug', ant: 'two', eyes: 'red', s: 1.1, scene: 'Psycho', v: 1 }
const SARZENIA: CreatureCard = { a: 'blob', c: 'd8d050 4a9a3a f0e8a0 4a9a3a', ears: 'long', crest: 'curl', pat: 'spots', eyes: 'angry', mouth: 'fang', s: 1.2, v: 1 }
const SICHLOR: CreatureCard = { a: 'insect', c: '6ab848 3a8a30 f0e8b0 e83a3a', wings: 'bug', eyes: 'angry', x: ['lances'], s: 1.3, scene: 'Calm' }
const PINSIR: CreatureCard = {
  a: 'humanoid', c: 'a88050 6a4a28 e8d8b0 5a3a20', ears: 'big', pat: 'stripes', x: ['claws'], eyes: 'angry', mouth: 'fang', n: 0.5, v: 1,
}
const FLAMARA: CreatureCard = { a: 'quad', c: 'f0703a c04a2a f8e0a0 f8d060', crest: 'mane', tail: 'fluff', ears: 'big', mouth: 'open', n: 6, v: 1 }
const AQUANA: CreatureCard = { a: 'quad', c: '78c0e8 3a7ab8 f0f0e0 f0f0e0', crest: 'mane', ears: 'fin', tail: 'fin', n: 6, v: 1 }
const PIKACHU: CreatureCard = { a: 'biped', c: 'f8d038 2a2430 f8e8a0 e8303a', ears: 'long', tail: 'bolt', x: ['cheeks'], s: 0.85 }
const LEKTROBAL: CreatureCard = { a: 'blob', c: 'f4f4f8 f8d848 e04848', x: ['split', 'aura'], eyes: 'angry', mouth: 'fang', s: 1.1, scene: 'Lila' }
const BLITZA: CreatureCard = { a: 'quad', c: 'f8d838 c8a020 f8f8f0 f8f8f0', crest: 'spiky', ears: 'big', tail: 'fluff', eyes: 'angry', n: 7, v: 1 }
const PANTIMOS: CreatureCard = { a: 'humanoid', c: 'f4c8d4 4a7ad8 f8f0f4 f8f8ff', ears: 'round', belly: 'patch', x: ['gloves'], pose: 1 }
const TRAGOSSO: CreatureCard = { a: 'biped', c: 'a8784a f0e8d0 f0e0b0', ears: 'long', horn: 'back', x: ['muzzle'], belly: 'patch', s: 0.9, scene: 'Farblos', v: 1 }
const TAUBOSS: CreatureCard = { a: 'bird', c: 'b8885a e8d8b0 f0e0c0 e8703a', wings: 'bird', crest: 'plume', belly: 'patch', pose: 1, s: 1.25 }
const PIXI: CreatureCard = { a: 'blob', c: 'f8b0c0 8a5a50 fff0f4 e88aa0', ears: 'long', wings: 'small', crest: 'curl', tail: 'curl', pose: 1, s: 1.2, scene: 'Psycho', v: 1 }
const PUMMELUFF: CreatureCard = { a: 'blob', c: 'f8b8c8 e890a8 fff0f4', ears: 'point', crest: 'curl', mouth: 'open', pose: 1, s: 0.9, v: 1 }
const KNUDDELUFF: CreatureCard = { a: 'blob', c: 'f8b0c4 e890a8 fff4f4', ears: 'long', crest: 'curl', belly: 'patch', x: ['gloves'], pose: 1, s: 1.15, scene: 'Pflanze' }
const MAUZI: CreatureCard = { a: 'biped', c: 'f0e0b0 8a6a40 fff4e0 e8b030', ears: 'point', tail: 'curl', x: ['star', 'whiskers'], s: 0.85, v: 1 }
const KANGAMA: CreatureCard = {
  a: 'biped', c: 'a8784a 6a4a28 e8d0a0 7a5030', ears: 'round', belly: 'pouch', x: ['gloves'], eyes: 'angry', n: 1, s: 1.15, pose: 1, scene: 'Elektro', v: 1,
}
const EVOLI: CreatureCard = { a: 'quad', c: 'b07a48 7a4a28 f0e0c0 f0e0c0', crest: 'mane', tail: 'fluff', ears: 'big', n: 5, s: 0.9, scene: 'Pflanze' }
const RELAXO: CreatureCard = { a: 'blob', c: '30607a 1e4458 f0e0c0', ears: 'point', belly: 'patch', eyes: 'closed', pose: 1, s: 1.35, scene: 'Pflanze', v: 1 }

const SPECS: readonly KitSpec[] = [
  { id: 'pkm-jungle-001', hp: 70, attacks: 'Wirbelwind:CC:20|Megasauger:PPPP:40', art: { a: 'insect', c: '5a58b0 3a3a80 e8e8f8 e83a4a', wings: 'bug', ant: 'two', eyes: 'red', s: 1.1 } },
  { id: 'pkm-jungle-002', hp: 60, attacks: 'Kratzfurie:P:10×|Familienruf:PP',
    art: { a: 'quad', c: '98b8e8 4a70b8 eef4fb 4a70b8', ears: 'big', back: 'spikes', pat: 'spots', eyes: 'red', x: ['whiskers'], n: 5, s: 0.9 } },
  { id: 'pkm-jungle-003', hp: 70, attacks: 'Superschall:P|Doppelkick:PCC:30×',
    art: { a: 'quad', c: '7aa0d8 3a5aa8 e0ecf8 3a5aa8', ears: 'big', back: 'spikes', pat: 'spots', eyes: 'red', n: 6, v: 1 } },
  { id: 'pkm-jungle-004', hp: 90, attacks: 'Verehrer:PC:20+|Megahieb:PPCC:50', art: NIDOQUEEN },
  { id: 'pkm-jungle-005', hp: 90, attacks: 'Verehrer:PC:20+|Megahieb:PPCC:50', art: NIDOQUEEN },
  { id: 'pkm-jungle-006', hp: 50, attacks: 'Stachelspore:P:10|Keimling:PP', art: { a: 'biped', c: '4a68b0 2a4a88 a0b8e8 4c9a38', back: 'bud', crest: 'plume', eyes: 'narrow', v: 1 } },
  { id: 'pkm-jungle-007', hp: 60, attacks: 'Giftpuder:P:10|Gestank:PP:20', art: { a: 'biped', c: '4a5aa8 2a3a78 a0b0e0 d8503a', back: 'bud', crest: 'plume', eyes: 'vacant', mouth: 'open', n: 0.4 } },
  { id: 'pkm-jungle-008', hp: 80, attacks: 'Heilung:|Blättertanz:PPP:30×', art: GIFLOR },
  { id: 'pkm-jungle-009', hp: 80, attacks: 'Heilung:|Blättertanz:PPP:30×', art: GIFLOR },
  { id: 'pkm-jungle-010', hp: 40, attacks: 'Kratzer:C:20|Pilzspore:PP', art: { a: 'quad', c: 'f0a040 d8503a f8d8a0', back: 'bulb', eyes: 'narrow', n: 3, s: 0.85, scene: 'Kampf', v: 1 } },
  { id: 'pkm-jungle-011', hp: 60, attacks: 'Pilzspore:PP|Schlitzer:PPP:30', art: { a: 'quad', c: 'e88a3a d8403a f8d8a0', back: 'bulb', eyes: 'vacant', n: 4, s: 1.1, v: 1 } },
  { id: 'pkm-jungle-012', hp: 40, attacks: 'Stachelspore:P:10|Blutsauger:PP:10',
    art: { a: 'blob', c: '8a58b8 6a3a98 c8a8e0 e83a4a', crest: 'curl', ant: 'two', pat: 'bumps', eyes: 'red', pose: 1, scene: 'Farblos', v: 1 } },
  { id: 'pkm-jungle-013', hp: 70, attacks: 'Wandel:|Giftpuder:PP:10', art: OMOT },
  { id: 'pkm-jungle-014', hp: 70, attacks: 'Wandel:|Giftpuder:PP:10', art: OMOT },
  { id: 'pkm-jungle-015', hp: 40, attacks: 'Rankenhieb:P:10|Familienruf:P', art: { a: 'serpent', c: 'e8d860 4a8a30 6ab050 e86a7a', ears: 'fin', mouth: 'open', s: 0.85 } },
  { id: 'pkm-jungle-016', hp: 70, attacks: 'Giftpuder:P:10|Rasierblatt:PP:30', art: { a: 'blob', c: 'e8d050 4a9a3a f8f0a0 4a9a3a', wings: 'small', ears: 'long', crest: 'curl', eyes: 'angry', mouth: 'open', pose: 1 } },
  { id: 'pkm-jungle-017', hp: 80, attacks: 'Lockstoff:PP|Säure:P:10', art: SARZENIA },
  { id: 'pkm-jungle-018', hp: 80, attacks: 'Lockstoff:PP|Säure:P:10', art: SARZENIA },
  { id: 'pkm-jungle-019', hp: 50, attacks: 'Hypnose:Y|Egelsamen:PP:20', art: { a: 'blob', c: 'f0c0c8 c88a98 fff0f0', mouth: 'open', n: 3, scene: 'Farblos' } },
  { id: 'pkm-jungle-020', hp: 80, attacks: 'Teleport:Y|Eierbombe:CC:20×', art: { a: 'blob', c: 'e8d070 4c9a38 f8f0c0', x: ['aura'], eyes: 'angry', n: 3, pose: 1, scene: 'Wasser' } },
  { id: 'pkm-jungle-021', hp: 70, attacks: 'Schwerttanz:P|Schlitzer:PCC:30', art: SICHLOR },
  { id: 'pkm-jungle-022', hp: 60, attacks: 'Klammergriff:PP:20|Guillotine:PPCC:50', art: PINSIR },
  { id: 'pkm-jungle-023', hp: 60, attacks: 'Klammergriff:PP:20|Guillotine:PPCC:50', art: PINSIR },
  { id: 'pkm-jungle-024', hp: 70, attacks: 'Stampfer:CC:20+|Agilität:FFC:20',
    art: { a: 'quad', c: 'f8e8c0 c8b088 fff8e8 f06a1e', crest: 'flame', tail: 'flame', ears: 'point', horn: 'spike', n: 13, pose: 1, s: 1.1 } },
  { id: 'pkm-jungle-025', hp: 70, attacks: 'Ruckzuckhieb:CC:10+|Flammenwerfer:FFCC:60', art: FLAMARA },
  { id: 'pkm-jungle-026', hp: 40, attacks: 'Hornattacke:W:10', art: { a: 'fish', c: 'f4ecec c8b8b8 ffffff f07a2a', pose: 1 } },
  { id: 'pkm-jungle-027', hp: 70, attacks: 'Hornattacke:W:10|Kaskade:WC:30', art: { a: 'fish', c: 'f08a3a c05a2a f8f0e8 f8f0e8', eyes: 'angry', s: 1.15, v: 1 } },
  { id: 'pkm-jungle-028', hp: 80, attacks: 'Ruckzuckhieb:CC:10+|Aquaknarre:WWC:30+', art: AQUANA },
  { id: 'pkm-jungle-029', hp: 50, attacks: 'Funkensprung:EE:20', art: { ...PIKACHU, scene: 'Pflanze' } },
  { id: 'pkm-jungle-030', hp: 90, attacks: 'Summschock:|Elektroschock:EEE:50', art: LEKTROBAL },
  { id: 'pkm-jungle-031', hp: 90, attacks: 'Summschock:|Elektroschock:EEE:50', art: LEKTROBAL },
  { id: 'pkm-jungle-032', hp: 70, attacks: 'Ruckzuckhieb:CC:10+|Nadelrakete:EEC:20×', art: BLITZA },
  { id: 'pkm-jungle-033', hp: 40, attacks: 'Unsichtbare Wand:|Meditation:YC:10+', art: PANTIMOS },
  { id: 'pkm-jungle-034', hp: 40, attacks: 'Unsichtbare Wand:|Meditation:YC:10+', art: PANTIMOS },
  { id: 'pkm-jungle-035', hp: 30, attacks: 'Spähen:|Kratzer:C:10',
    art: { a: 'blob', c: 'f0e0c8 a87850 fff4e8 c89870', ears: 'point', x: ['gloves', 'nose'], eyes: 'angry', mouth: 'open', pose: 1, s: 0.9, scene: 'Pflanze', v: 1 } },
  { id: 'pkm-jungle-036', hp: 70, attacks: 'Kratzfurie:KK:10×|Wutanfall:KKC:50',
    art: { a: 'blob', c: 'e8d8c0 a07048 fff4e8 b88a60', ears: 'point', x: ['gloves', 'nose'], eyes: 'angry', mouth: 'fang', pose: 1, s: 1.15, v: 1 } },
  { id: 'pkm-jungle-037', hp: 40, attacks: 'Schluchzer:C|Wut:KK:10+', art: TRAGOSSO },
  { id: 'pkm-jungle-038', hp: 60, attacks: 'Knochmerang:KK:30×|Freundesruf:KKC',
    art: { a: 'biped', c: '8a6a48 f0e8d0 e8d8b0', ears: 'long', horn: 'back', x: ['muzzle'], belly: 'patch', eyes: 'angry', n: 0.5, pose: 1, v: 1 } },
  { id: 'pkm-jungle-039', hp: 70, attacks: 'Silberblick:C|Hornattacke:KKK:30',
    art: { a: 'quad', c: 'a0a0a8 70707a d8d8dc', horn: 'spike', back: 'spikes', crest: 'ridge', eyes: 'angry', n: 4, pose: 1, s: 1.05 } },
  { id: 'pkm-jungle-040', hp: 100, attacks: 'Hornattacke:KCC:30|Rammen:KKKK:50',
    art: { a: 'biped', c: '9898a0 686870 d8d0c8', horn: 'spike', crest: 'ridge', tail: 'plain', belly: 'patch', eyes: 'angry', mouth: 'fang', n: 1, s: 1.15, v: 1 } },
  { id: 'pkm-jungle-041', hp: 80, attacks: 'Flügelschlag:CC:20|Orkan:CCC:30', art: TAUBOSS },
  { id: 'pkm-jungle-042', hp: 50, attacks: 'Pikser:C:10|Spiegeltrick:CCC', art: { a: 'bird', c: 'a87050 c8604a f0d8b0 e8b080', wings: 'bird', crest: 'spiky', eyes: 'angry', s: 0.85, scene: 'Kampf' } },
  { id: 'pkm-jungle-043', hp: 70, attacks: 'Agilität:CCC:20|Bohrschnabel:CCCC:40',
    art: { a: 'bird', c: 'a87850 c86040 f0d8b0 e8a080', wings: 'bird', crest: 'spiky', belly: 'patch', pose: 1, s: 1.15, scene: 'Kampf' } },
  { id: 'pkm-jungle-044', hp: 70, attacks: 'Metronom:C|Komprimator:CC', art: PIXI },
  { id: 'pkm-jungle-045', hp: 70, attacks: 'Metronom:C|Komprimator:CC', art: PIXI },
  { id: 'pkm-jungle-046', hp: 60, attacks: 'Schlaflied:C|Pfund:CC:20', art: PUMMELUFF },
  { id: 'pkm-jungle-047', hp: 80, attacks: 'Schlaflied:C|La-Ola:CCC:10×', art: KNUDDELUFF },
  { id: 'pkm-jungle-048', hp: 50, attacks: 'Zahltag:CC:10', art: MAUZI },
  { id: 'pkm-jungle-049', hp: 70, attacks: 'Kratzer:CC:20|Anspringen:CCC:30',
    art: { a: 'quad', c: 'f0e0b8 b8a070 fff8e8 e83a4a', ears: 'point', tail: 'curl', x: ['star', 'whiskers'], eyes: 'narrow', n: 9, scene: 'Lila', v: 1 } },
  { id: 'pkm-jungle-050', hp: 70, attacks: 'Fluchthilfe:|Wut:CCC:10+', art: { a: 'bird', c: 'b08048 2a2430 f0d8b0 e8b030', wings: 'small', crest: 'spiky', eyes: 'angry', s: 1.1, scene: 'Kampf' } },
  { id: 'pkm-jungle-051', hp: 90, attacks: 'Klammerzunge:CC:10|Superschall:CC', art: { a: 'biped', c: 'e8a0b0 c87888 f0e0c0', tail: 'plain', belly: 'patch', mouth: 'open', n: 1, s: 1.05 } },
  { id: 'pkm-jungle-052', hp: 90, attacks: 'Apport:C|Kometenhieb:CCCC:20×', art: KANGAMA },
  { id: 'pkm-jungle-053', hp: 90, attacks: 'Apport:C|Kometenhieb:CCCC:20×', art: KANGAMA },
  { id: 'pkm-jungle-054', hp: 60, attacks: 'Stampfer:CC:20+|Amok:CCC:20+',
    art: { a: 'quad', c: 'b88a50 7a5a38 5a3a28 f0e8d0', crest: 'mane', horn: 'spike', ears: 'point', tail: 'plain', eyes: 'angry', n: 7, pose: 1, scene: 'Feuer' } },
  { id: 'pkm-jungle-055', hp: 50, attacks: 'Rutenschlag:C|Ruckzuckhieb:C:10+', art: EVOLI },
  { id: 'pkm-jungle-056', hp: 90, attacks: 'Dickhaut:|Bodyslam:CCCC:30', art: RELAXO },

  { id: 'pkm-jungle-057', text: 'Wirf eine Münze. Bei Kopf: Suche 1 Pokémon im Deck.', art: { item: 'coins', bg: 'b8e0a0 5a9a40', x: ['ball'] } },

  { id: 'pkm-jungle-058', hp: 70, attacks: 'Schwerttanz:P|Schlitzer:PCC:30', art: { ...SICHLOR, flip: true, s: 1.15, scene: 'Elektro', v: 1 } },
  { id: 'pkm-jungle-059', hp: 60, attacks: 'Klammergriff:PP:20|Guillotine:PPCC:50', art: { ...PINSIR, pose: 1, flip: true, scene: 'LICHT', v: 1 } },
  { id: 'pkm-jungle-060', hp: 70, attacks: 'Ruckzuckhieb:CC:10+|Flammenwerfer:FFCC:60', art: { ...FLAMARA, eyes: 'closed', mouth: 'smile', flip: true, scene: 'Farblos' } },
  { id: 'pkm-jungle-061', hp: 80, attacks: 'Ruckzuckhieb:CC:10+|Aquaknarre:WWC:30+', art: { ...AQUANA, pose: 1, flip: true, scene: 'Zauber' } },
  { id: 'pkm-jungle-062', hp: 50, attacks: 'Funkensprung:EE:20', art: { ...PIKACHU, pose: 1, flip: true, scene: 'LICHT' } },
  { id: 'pkm-jungle-063', hp: 70, attacks: 'Ruckzuckhieb:CC:10+|Nadelrakete:EEC:20×', art: { ...BLITZA, pose: 1, flip: true, scene: 'Mind' } },
  { id: 'pkm-jungle-064', hp: 40, attacks: 'Unsichtbare Wand:|Meditation:YC:10+', art: { ...PANTIMOS, pose: 2, flip: true, eyes: 'closed', scene: 'Farblos', v: 0 } },
  { id: 'pkm-jungle-065', hp: 40, attacks: 'Schluchzer:C|Wut:KK:10+', art: { ...TRAGOSSO, flip: true, eyes: 'closed', scene: 'Lila' } },
  { id: 'pkm-jungle-066', hp: 70, attacks: 'Metronom:C|Komprimator:CC', art: { ...PIXI, pose: 0, flip: true, x: ['gloves'], scene: 'Falle', v: 0 } },
  { id: 'pkm-jungle-067', hp: 60, attacks: 'Schlaflied:C|Pfund:CC:20', art: { ...PUMMELUFF, eyes: 'angry', mouth: 'fang', x: ['gloves'], flip: true, scene: 'Zauber', v: 0 } },
  { id: 'pkm-jungle-068', hp: 50, attacks: 'Zahltag:CC:10', art: { ...MAUZI, pose: 1, flip: true, scene: 'Kampf' } },
  { id: 'pkm-jungle-069', hp: 90, attacks: 'Apport:C|Kometenhieb:CCCC:20×', art: { ...KANGAMA, pose: 0, eyes: 'closed', flip: true, scene: 'Pflanze', v: 1 } },
  { id: 'pkm-jungle-070', hp: 50, attacks: 'Rutenschlag:C|Ruckzuckhieb:C:10+', art: { ...EVOLI, pose: 1, flip: true, scene: 'Mind', v: 0 } },
  { id: 'pkm-jungle-071', hp: 90, attacks: 'Dickhaut:|Bodyslam:CCCC:30', art: { ...RELAXO, mouth: 'open', flip: true, scene: 'Farblos', v: 0 } },
]

/** Every card below Ultra: data specs for the reusable card model (art/kit). */
export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
