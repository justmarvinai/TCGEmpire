import type { CreatureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of Fossil below Ultra, as compact kit specs (format: art/kit/index.ts). Attacks:
 * 'Name:COST:DAMAGE|…', energy letters F W P E Y K C; an empty cost marks a Pokémon-Power. A Non-Holo
 * twin shares its holo's creature (the kit lets only Holo and Alternative shine); an Alternative
 * reuses its creature with another pose and scene.
 */
const SLEIMOK: CreatureCard = { a: 'blob', c: '8a58a8 6a3a88 c8a8e0 a8d850', pat: 'bumps', x: ['hands', 'fumes'], eyes: 'angry', mouth: 'open', s: 1.3, scene: 'Zauber' }
const LAVADOS: CreatureCard = { a: 'bird', c: 'f8c838 f08a28 f8e8a0 f06a1e', wings: 'bird', crest: 'flame', eyes: 'angry', pose: 1, s: 1.2, v: 1 }
const ENTON: CreatureCard = { a: 'biped', c: 'f8d850 c8a030 f8f0c0', crest: 'ridge', x: ['muzzle'], eyes: 'vacant', mouth: 'none', pose: 1, n: 0.4, scene: 'Wasser' }
const LAPRAS: CreatureCard = { a: 'serpent', c: '5aa0e0 3a78c0 f0e8c8 9a98b0', horn: 'nub', ears: 'fin', x: ['orbs'], s: 1.15, scene: 'Rot' }
const AMONITAS: CreatureCard = { a: 'blob', c: '6ab8e8 3a80c0 f0e4c0', belly: 'spiral', pose: 1, s: 0.9 }
const ARKTOS: CreatureCard = { a: 'bird', c: '78b8e8 a8d8f8 e8f4fc 4a78c8', wings: 'bird', crest: 'plume', eyes: 'angry', pose: 1, s: 1.2, scene: 'Zauber', v: 1 }
const RAICHU: CreatureCard = {
  a: 'biped', c: 'f0a030 6a4a30 f8e0b0 f8d838', ears: 'long', tail: 'bolt', belly: 'patch', x: ['cheeks'], eyes: 'angry', mouth: 'open', n: 0.2, pose: 1, scene: 'Lila',
}
const MAGNETON: CreatureCard = { a: 'blob', c: 'a8b4c8 6a7890 e8f0f8', eyes: 'cyclops', mouth: 'none', x: ['magnets'], n: 3 }
const ZAPDOS: CreatureCard = { a: 'bird', c: 'f8d038 2a2430 f8d038 e88a20', wings: 'spiky', crest: 'spiky', eyes: 'angry', pose: 1, s: 1.2, scene: 'Lila' }
const FLEGMON: CreatureCard = { a: 'quad', c: 'f0a0b8 d87898 f8e8d8', ears: 'round', tail: 'plain', x: ['muzzle'], eyes: 'vacant', n: 4, scene: 'Wasser' }
const ALPOLLO: CreatureCard = { a: 'blob', c: '8858b8 5a3888 f07a8a', crest: 'spiky', x: ['hands', 'wisp'], eyes: 'angry', mouth: 'fang', scene: 'FINSTERNIS' }
const GENGAR: CreatureCard = { a: 'blob', c: '6a48a8 4a3088 9a80c8 e83a3a', crest: 'spiky', ears: 'point', x: ['hands'], eyes: 'red', mouth: 'fang', pose: 1, s: 1.25, scene: 'Chaos' }
const HYPNO: CreatureCard = { a: 'humanoid', c: 'f0d050 a87838 f8f0d8', crest: 'mane', x: ['nose', 'spoon'], eyes: 'narrow', n: 0.5, pose: 1 }
const KICKLEE: CreatureCard = { a: 'humanoid', c: 'c89870 8a6048 f0d8b0', belly: 'patch', eyes: 'angry', mouth: 'none', n: 0.2, pose: 1, scene: 'Calm', v: 1 }
const KABUTOPS: CreatureCard = { a: 'humanoid', c: 'b07a3a 7a5028 e8d0a0 f8d040', horn: 'back', x: ['lances'], eyes: 'red', mouth: 'none', n: 0.3, pose: 1, scene: 'Wasser', v: 1 }
const AERODACTYL: CreatureCard = { a: 'bird', c: 'a898b8 8a7aa0 d8d0e0 b0a0c0', wings: 'spiky', horn: 'back', eyes: 'angry', pose: 1, s: 1.2, v: 1 }
const DITTO: CreatureCard = { a: 'blob', c: 'c8a0d8 9a70b0 e8d8f0', eyes: 'narrow', s: 1.15, scene: 'Zauber' }
const DRAGORAN: CreatureCard = { a: 'biped', c: 'f0a040 d8803a f8e0a0', wings: 'small', ant: 'two', tail: 'plain', belly: 'patch', n: 1, pose: 1, s: 1.2, scene: 'Wasser', v: 1 }

const SPECS: readonly KitSpec[] = [
  { id: 'pkm-fossil-001', hp: 40, attacks: 'Giftspucke:P|Wickel:PC:20', art: { a: 'serpent', c: 'a070c0 7a4a98 f0e070', mouth: 'fang', pose: 1, scene: 'Kampf' } },
  { id: 'pkm-fossil-002', hp: 60, attacks: 'Schreckbiss:P:10|Giftzahn:PPC:20',
    art: { a: 'serpent', c: '8a58a8 5a3a78 e8c060', crest: 'mane', eyes: 'angry', mouth: 'fang', s: 1.15, scene: 'Order', v: 1 } },
  { id: 'pkm-fossil-003', hp: 40, attacks: 'Superschall:CC|Blutsauger:PC:10',
    art: { a: 'blob', c: '5a8ad8 8a5ac8 c8a0e8', ears: 'point', wings: 'spiky', eyes: 'closed', mouth: 'fang', s: 0.85, scene: 'Chaos', v: 1 } },
  { id: 'pkm-fossil-004', hp: 60, attacks: 'Flügelschlag:CCC:30|Blutsauger:PCC:20',
    art: { a: 'blob', c: '4a7ad0 8a5ac8 c8a0e8', ears: 'point', wings: 'spiky', eyes: 'narrow', mouth: 'open', s: 1.15, scene: 'FINSTERNIS' } },
  { id: 'pkm-fossil-005', hp: 50, attacks: 'Fieser Schleim:C:10|Komprimator:P',
    art: { a: 'blob', c: '9a68b8 7a4a98 c8a8e0', pat: 'bumps', x: ['hands'], eyes: 'vacant', mouth: 'open', scene: 'Mind', v: 1 } },
  { id: 'pkm-fossil-006', hp: 70, attacks: 'Giftgas:|Schlammbad:PPP:30', art: SLEIMOK },
  { id: 'pkm-fossil-007', hp: 70, attacks: 'Giftgas:|Schlammbad:PPP:30', art: SLEIMOK },
  { id: 'pkm-fossil-008', hp: 60, attacks: 'Smog:PP:20|Finale:PPC:60',
    art: { a: 'blob', c: '8a6cb8 6a4a98 f0e8c8 c8d860', pat: 'bumps', belly: 'skull', x: ['fumes'], eyes: 'angry', mouth: 'fang', n: 2, scene: 'FINSTERNIS', v: 1 } },
  { id: 'pkm-fossil-009', hp: 70, attacks: 'Rauchwolke:F:10|Smog:FF:20',
    art: { a: 'biped', c: 'f05a2a c03a1a f8d040 f8a020', tail: 'flame', crest: 'flame', belly: 'patch', eyes: 'angry', mouth: 'open', n: 0.5, v: 1 } },
  { id: 'pkm-fossil-010', hp: 70, attacks: 'Feuersbrunst:F|Sturzflug:FFFF:80', art: LAVADOS },
  { id: 'pkm-fossil-011', hp: 50, attacks: 'Kopfweh:Y|Kratzfurie:W:10×', art: ENTON },
  { id: 'pkm-fossil-012', hp: 70, attacks: 'Psychoschock:YC:10|Hyperstrahl:WWCC:20',
    art: { a: 'biped', c: '4a8ad8 2a5aa8 f0e0a0 e83a3a', x: ['muzzle', 'star'], eyes: 'angry', mouth: 'none', n: 0.3, pose: 1, scene: 'Calm' } },
  { id: 'pkm-fossil-013', hp: 30, attacks: 'Feigheit:|Säure:W:10', art: { a: 'blob', c: '8ad0f0 3a88c8 d8f0f8 e83a4a', x: ['hands'], eyes: 'red', mouth: 'none', s: 0.85 } },
  { id: 'pkm-fossil-014', hp: 60, attacks: 'Superschall:W|Quallenstich:WP:10',
    art: { a: 'blob', c: '6ab8e8 3a78c0 d8f0f8 e83a4a', crest: 'spiky', x: ['hands', 'wisp'], eyes: 'red', mouth: 'none', s: 1.2, v: 1 } },
  { id: 'pkm-fossil-015', hp: 30, attacks: 'Superschall:W|Panzerschutz:W', art: { a: 'blob', c: 'b8a0e0 6a48a8 e8e0f8', x: ['aura'], mouth: 'open', s: 0.9 } },
  { id: 'pkm-fossil-016', hp: 50, attacks: 'Klammer:WW:30|Dornkanone:WW:30×',
    art: { a: 'blob', c: 'a8a8c8 3a3458 e8e8f8', x: ['aura'], crest: 'spiky', eyes: 'narrow', s: 1.15, scene: 'Wasser', v: 1 } },
  { id: 'pkm-fossil-017', hp: 50, attacks: 'Familienruf:W|Klammergriff:WC:20', art: { a: 'blob', c: 'e86a3a c84a2a f8e0c0 e8603a', x: ['gloves', 'split'], pose: 1, s: 0.9 } },
  { id: 'pkm-fossil-018', hp: 60, attacks: 'Dreschflegel:W:10×|Krabbhammer:WWW:40',
    art: { a: 'blob', c: 'e0583a b8402a f8e0c0 e8603a', x: ['gloves', 'split'], crest: 'spiky', eyes: 'angry', pose: 1, s: 1.2, scene: 'Rot' } },
  { id: 'pkm-fossil-019', hp: 40, attacks: 'Rauchwolke:W:10', art: { a: 'serpent', c: '6ab0e8 4a88c8 f0e8b0', ears: 'fin', mouth: 'none', pose: 1, s: 0.8 } },
  { id: 'pkm-fossil-020', hp: 60, attacks: 'Aquaknarre:WC:20+|Agilität:WWC:20',
    art: { a: 'serpent', c: '4a88d0 2a5aa0 f0e8b0', ears: 'fin', crest: 'spiky', eyes: 'angry', mouth: 'none', v: 1 } },
  { id: 'pkm-fossil-021', hp: 80, attacks: 'Aquaknarre:WC:10+|Konfusstrahl:WW:10', art: LAPRAS },
  { id: 'pkm-fossil-022', hp: 40, attacks: 'Hellsehen:|Aquaknarre:W:10+', art: AMONITAS },
  { id: 'pkm-fossil-023', hp: 70, attacks: 'Aquaknarre:WC:20+|Dornkanone:WW:30×',
    art: { ...AMONITAS, crest: 'spiky', eyes: 'angry', mouth: 'fang', s: 1.15, scene: 'Kampf' } },
  { id: 'pkm-fossil-024', hp: 70, attacks: 'Gefriertrocknung:WWW:30|Blizzard:WWWW:50', art: ARKTOS },
  { id: 'pkm-fossil-025', hp: 90, attacks: 'Gigaschock:EEEE:30', art: RAICHU },
  { id: 'pkm-fossil-026', hp: 90, attacks: 'Gigaschock:EEEE:30', art: RAICHU },
  { id: 'pkm-fossil-027', hp: 80, attacks: 'Ultraschall:EE:20|Finale:EEEE:100', art: MAGNETON },
  { id: 'pkm-fossil-028', hp: 80, attacks: 'Ultraschall:EE:20|Finale:EEEE:100', art: MAGNETON },
  { id: 'pkm-fossil-029', hp: 80, attacks: 'Donnersturm:EEEE:40', art: ZAPDOS },
  { id: 'pkm-fossil-030', hp: 50, attacks: 'Tagtraum:C|Plündern:YY', art: FLEGMON },
  { id: 'pkm-fossil-031', hp: 60, attacks: 'Schrulle:|Psychoschock:YY:20',
    art: { a: 'biped', c: 'f0a0b8 a8a8b8 f8e8d8', back: 'shell', x: ['muzzle'], eyes: 'vacant', n: 0.8, s: 1.1, scene: 'Wasser' } },
  { id: 'pkm-fossil-032', hp: 50, attacks: 'Schlecker:Y:10|Energiewandel:YY',
    art: { a: 'blob', c: '3a2850 8a58c0 f4f4f8', x: ['aura'], eyes: 'angry', mouth: 'fang', scene: 'FINSTERNIS', v: 1 } },
  { id: 'pkm-fossil-033', hp: 50, attacks: 'Transparenz:|Nachtmahr:YC:10', art: ALPOLLO },
  { id: 'pkm-fossil-034', hp: 50, attacks: 'Transparenz:|Nachtmahr:YC:10', art: ALPOLLO },
  { id: 'pkm-fossil-035', hp: 80, attacks: 'Fluch:|Finsterblick:YYY:30', art: GENGAR },
  { id: 'pkm-fossil-036', hp: 90, attacks: 'Prophezeiung:|Finsterblick:YYY:30', art: HYPNO },
  { id: 'pkm-fossil-037', hp: 90, attacks: 'Prophezeiung:|Finsterblick:YYY:30', art: HYPNO },
  { id: 'pkm-fossil-038', hp: 70, attacks: 'Schlitzer:CC:20|Kratzfurie:KK:20×',
    art: { a: 'biped', c: 'e0c068 8a5a30 f8ecc0', back: 'spikes', ears: 'point', belly: 'patch', x: ['claws'], eyes: 'angry', n: 0.5, pose: 1, scene: 'Feuer' } },
  { id: 'pkm-fossil-039', hp: 50, attacks: 'Steinhagel:KC:10×', art: { a: 'blob', c: 'a8a898 787868 d0d0c4 a8a898', pat: 'bumps', x: ['gloves'], eyes: 'angry', s: 0.9 } },
  { id: 'pkm-fossil-040', hp: 60, attacks: 'Härtner:KK|Steinwurf:KKC:40',
    art: { a: 'blob', c: 'a09888 706858 d0c8bc a09888', crest: 'spiky', pat: 'bumps', x: ['gloves'], eyes: 'angry', mouth: 'fang', s: 1.15, v: 1 } },
  { id: 'pkm-fossil-041', hp: 80, attacks: 'Lawine:KKKC:60|Finale:KKKK:100',
    art: { a: 'blob', c: 'b08858 788070 e0d0b0 b08858', x: ['aura', 'gloves'], eyes: 'angry', mouth: 'fang', pose: 1, s: 1.2, v: 1 } },
  { id: 'pkm-fossil-042', hp: 60, attacks: 'Dehnkick:KK|Turmkick:KKK:50', art: KICKLEE },
  { id: 'pkm-fossil-043', hp: 60, attacks: 'Dehnkick:KK|Turmkick:KKK:50', art: KICKLEE },
  { id: 'pkm-fossil-044', hp: 30, attacks: 'Kabutopanzer:|Kratzer:K:10', art: { a: 'blob', c: 'b07838 7a5028 3a2a20 f8d040', x: ['split'], eyes: 'red', mouth: 'none', pose: 1, s: 0.9 } },
  { id: 'pkm-fossil-045', hp: 60, attacks: 'Sichelhieb:KK:30|Absorber:KKKK:40', art: KABUTOPS },
  { id: 'pkm-fossil-046', hp: 60, attacks: 'Sichelhieb:KK:30|Absorber:KKKK:40', art: KABUTOPS },
  { id: 'pkm-fossil-047', hp: 60, attacks: 'Urkraft:|Flügelschlag:CCC:30', art: AERODACTYL },
  { id: 'pkm-fossil-048', hp: 50, attacks: 'Wandler:', art: DITTO },
  { id: 'pkm-fossil-049', hp: 50, attacks: 'Wandler:', art: DITTO },
  { id: 'pkm-fossil-050', hp: 100, attacks: 'Einspringen:|Slam:CCCC:40×', art: DRAGORAN },

  { id: 'pkm-fossil-051', text: 'Mische 1 Bank-Pokémon samt Karten ins Deck.',
    art: { item: 'person', c: '7a6a9a d8d8d8 f1b688', bg: '6a5a7a 5a3a2a', x: ['moustache', 'coat'] } },
  { id: 'pkm-fossil-052', text: 'Nimm 1 Basis-Energie aus dem Deck auf die Hand.', art: { item: 'device', c: '3a9a8a', bg: 'f0e0b0 8a6a4a' } },
  { id: 'pkm-fossil-053', text: 'Hand ins Deck. Münze: Kopf 8 Karten, Zahl 1.',
    art: { item: 'person', c: '3a3a4a 2a2430 f1b688', bg: '3a7a4a 4a3020', x: ['grin', 'glasses'] } },
  { id: 'pkm-fossil-054', text: 'Münze. Bei Kopf: 1 Karte der Ablage aufs Deck.', art: { obj: 'pot', c: '3a8a4a d8d8d8', x: ['cards'], scene: 'Pflanze' } },
  { id: 'pkm-fossil-055', text: 'Spiele es wie ein Basis-Pokémon mit 10 KP.', art: { obj: 'disc', c: 'b07a3a e8b048', x: ['stone', 'glow'], scene: 'Order' } },

  { id: 'pkm-fossil-056', hp: 70, attacks: 'Feuersbrunst:F|Sturzflug:FFFF:80', art: { ...LAVADOS, wings: 'spiky', flip: true, scene: 'Fury', v: 0 } },
  { id: 'pkm-fossil-057', hp: 50, attacks: 'Kopfweh:Y|Kratzfurie:W:10×', art: { ...ENTON, pose: 0, eyes: 'closed', flip: true, scene: 'Calm' } },
  { id: 'pkm-fossil-058', hp: 80, attacks: 'Aquaknarre:WC:10+|Konfusstrahl:WW:10', art: { ...LAPRAS, pose: 1, flip: true, scene: 'Wasser', v: 1 } },
  { id: 'pkm-fossil-059', hp: 40, attacks: 'Hellsehen:|Aquaknarre:W:10+', art: { ...AMONITAS, c: '6ab8e8 e8c040 f0e4c0', x: ['aura'], eyes: 'closed', scene: 'Order' } },
  { id: 'pkm-fossil-060', hp: 70, attacks: 'Gefriertrocknung:WWW:30|Blizzard:WWWW:50', art: { ...ARKTOS, pose: 0, flip: true, scene: 'Rot', v: 1 } },
  { id: 'pkm-fossil-061', hp: 80, attacks: 'Donnersturm:EEEE:40', art: { ...ZAPDOS, pose: 0, flip: true, scene: 'Elektro' } },
  { id: 'pkm-fossil-062', hp: 50, attacks: 'Tagtraum:C|Plündern:YY', art: { ...FLEGMON, eyes: 'closed', flip: true, scene: 'Rot' } },
  { id: 'pkm-fossil-063', hp: 50, attacks: 'Transparenz:|Nachtmahr:YC:10', art: { ...ALPOLLO, mouth: 'open', flip: true, scene: 'Mind', v: 1 } },
  { id: 'pkm-fossil-064', hp: 80, attacks: 'Fluch:|Finsterblick:YYY:30', art: { ...GENGAR, pose: 0, flip: true, scene: 'Lila', v: 1 } },
  { id: 'pkm-fossil-065', hp: 60, attacks: 'Sichelhieb:KK:30|Absorber:KKKK:40', art: { ...KABUTOPS, pose: 0, flip: true, scene: 'Falle', v: 0 } },
  { id: 'pkm-fossil-066', hp: 60, attacks: 'Urkraft:|Flügelschlag:CCC:30', art: { ...AERODACTYL, flip: true, scene: 'LICHT', v: 1 } },
  { id: 'pkm-fossil-067', hp: 50, attacks: 'Wandler:',
    art: { a: 'biped', c: 'c8a0d8 9a70b0 e8d8f0', wings: 'small', ant: 'two', tail: 'plain', belly: 'patch', eyes: 'narrow', n: 1, s: 1.1, flip: true, scene: 'Mind' } },
  { id: 'pkm-fossil-068', hp: 100, attacks: 'Einspringen:|Slam:CCCC:40×', art: { ...DRAGORAN, pose: 0, flip: true, scene: 'Rot', v: 0 } },
]

/** Every card below Ultra: data specs for the reusable card model (art/kit). */
export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
