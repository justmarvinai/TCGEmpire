import type { CreatureCard, FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of Riftbound Unleashed below Ultra, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; art briefs: docs/sets/riftbound-unleashed.md). Same frame and print data
 * as Origins (art/frames/riftbound.ts): print { energy, might, tag, domain2 }; Legends print no cost.
 * Units hide their bottom 17 art rows under the glass name bar (cover 17), runes 18 under the floating
 * plate, Alternative units 18. The set's theme is the jungle: its monsters are kit creatures, its night
 * scenes are mostly jungle and moonlight. Champions share one look (exported for the hero placeholders);
 * their Alternative card changes pose and scene.
 */
export const JHIN: FigureCard = { fig: 'slim', skin: 'e8c0a0', hair: 'slick 3a2a2a', face: ['mask'], wear: 'suit 8a1a2a e0b040', prop: 'rifle c8a040', eyes: 'narrow', mouth: 'none' }
export const RENGAR: CreatureCard = { a: 'humanoid', c: 'c8945a 5a3a20 f0dcb0 e04a2a', crest: 'mane', ears: 'point', x: ['claws'], eyes: 'angry', mouth: 'fang', n: 1, pose: 1 }
export const PYKE: FigureCard = { fig: 'slim', skin: '7aa8a0', hat: 'bandana 2a3a3a', face: ['mask', 'scar'], wear: 'coat 2a4a48 8a3a2a', prop: 'spear 8a5a3a', eyes: 'glow', mouth: 'none' }
export const VI: FigureCard = { fig: 'normal', skin: 'f0c0a0', hair: 'short e85a9a', wear: 'coat 8a2a3a 4a86b8 3a3a48', prop: 'fists', eyes: 'angry' }
export const LILLIA: FigureCard = { fig: 'slim', skin: 'f0d8e0', hair: 'long e890b8', hat: 'horns e8c8a0', wear: 'dress 7a5ac8 f0a0c8', prop: 'staff 8a5a30', mouth: 'smile' }
export const YI: FigureCard = { fig: 'normal', skin: 'e0b088', hair: 'short 2a2a2a', face: ['goggles'], wear: 'robe c8a040 6ad04a 4a3a2a', prop: 'katana e8f0d0', mouth: 'flat' }
export const VEX: FigureCard = { fig: 'small', skin: 'c8c8d8', hat: 'hood 2a2a3a', face: ['elf'], wear: 'robe 2a2a3a 6a4ab0', eyes: 'narrow', mouth: 'flat' }
export const IVERN: FigureCard = { fig: 'giant', skin: '8a6a4a', hair: 'wild 5aa03a', face: ['beard'], hat: 'horns 8a6a4a', wear: 'bare 8a6a4a 5aa03a', mouth: 'smile' }
export const DIANA: FigureCard = { fig: 'slim', skin: 'e8e0f0', hair: 'long e8e8f4', wear: 'armour 3a3a6a c8c8e0', prop: 'scythe d8e0f0', eyes: 'narrow', mouth: 'flat' }
export const LEBLANC: FigureCard = { fig: 'slim', skin: 'f0d0c0', hair: 'long 2a1a2a', hat: 'horns e0b040', wear: 'dress 5a2a7a e0b040', prop: 'staff e0b040', eyes: 'narrow', mouth: 'grin' }
export const KHAZIX: CreatureCard = { a: 'insect', c: '4a3a8a 241a4a 9a8ac8 e040c0', wings: 'bug', x: ['lances'], eyes: 'red', mouth: 'fang' }
export const POPPY: FigureCard = { fig: 'small', skin: '9ab8e0', hair: 'braids f0d070', face: ['elf'], wear: 'armour 7a7a90 c83a3a', prop: 'axe c8c8d8', mouth: 'flat' }
export const BARON: CreatureCard = { a: 'serpent', c: '6a3a9a 2a1a4a c8a0e0 6ad04a', crest: 'spiky', horn: 'spike', eyes: 'red', mouth: 'fang', s: 1.2 }
const ELDER: CreatureCard = { a: 'biped', c: '2a3a7a 141a44 c8d0f0 f0d070', wings: 'spiky', horn: 'back', crest: 'fins', tail: 'flame', eyes: 'angry', mouth: 'fang', x: ['claws'], n: 1, pose: 1 }
const PORO = 'f4f2f8 c8c4d8 ffffff e86a8a'

const SPECS: readonly KitSpec[] = [
  // ── Fury ──
  { id: 'rb-unl-001', print: { domain2: 'Mind' }, art: { ...JHIN, pose: 'cast', scene: 'Order', v: 1 } },
  { id: 'rb-unl-002', print: { domain2: 'Body' }, art: { ...RENGAR, scene: 'Pflanze', v: 1 } },
  { id: 'rb-unl-003', print: { domain2: 'Chaos' }, art: { ...PYKE, pose: 'cast', x: ['aura'], scene: 'Wasser', v: 1 } },
  { id: 'rb-unl-004', print: { domain2: 'Order' }, art: { ...VI, pose: 'action', scene: 'Mind', v: 1 } },
  { id: 'rb-unl-005', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...PYKE, prop: 'sword 8a8a98', scene: 'Rot' } },
  { id: 'rb-unl-006', cover: 17, print: { energy: 3, might: 5, tag: 'Champion' }, art: { ...VI, pose: 'cross', mouth: 'open', scene: 'Fury' } },
  {
    id: 'rb-unl-007',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'long c83a2a', face: ['scar'], wear: 'armour 2a2a30 a82a2a', prop: 'sword', prop2: 'sword', pose: 'action', scene: 'Mind', v: 1 },
  },
  {
    id: 'rb-unl-008',
    cover: 17,
    print: { energy: 4, might: 5, tag: 'Monster' },
    art: { a: 'biped', c: 'b83a2a 5a1a14 f08a5a f0c040', back: 'spikes', crest: 'flame', mouth: 'fang', eyes: 'angry', x: ['claws'], n: 1, pose: 1, scene: 'Pflanze', v: 1 },
  },
  {
    id: 'rb-unl-009',
    print: { energy: 4, tag: 'Signatur', domain2: 'Mind' },
    text: 'Vier Schüsse, je 1 Schaden. Der vierte macht 4.',
    art: { obj: 'fireball', n: 4, c: 'e0b040 fff0c0', scene: 'FINSTERNIS', v: 1 },
  },
  {
    id: 'rb-unl-010',
    print: { energy: 3, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Exekutiere eine verwundete Einheit. Blubb.',
    art: { obj: 'slash', c: '3ac8b0 e0fff8', x: ['streak'], scene: 'Wasser', v: 1 },
  },
  {
    id: 'rb-unl-011',
    print: { energy: 3, tag: 'Signatur', domain2: 'Order' },
    text: 'Ausgerüstet: +2 Macht. Wände sind optional.',
    art: { obj: 'fist', c: '6a6a7a 4ab8e0', x: ['glow', 'sparks'], scene: 'Mind', v: 1 },
  },
  { id: 'rb-unl-012', print: { energy: 1 }, text: '5 Schaden an ein Monster. Klauen erlaubt.', art: { obj: 'bolt', c: 'f0d040 fff8c0', x: ['rays'], scene: 'Pflanze' } },
  { id: 'rb-unl-013', cover: 17, print: { energy: 1, might: 2 }, art: { a: 'fish', c: '6a8aa0 3a4a60 e8f0f4 e04a4a', mouth: 'fang', eyes: 'round', scene: 'Wasser' } },
  { id: 'rb-unl-014', cover: 18, art: { rune: true, scene: 'Pflanze', v: 1 } },

  // ── Calm ──
  { id: 'rb-unl-015', print: { domain2: 'Mind' }, art: { ...LILLIA, eyes: 'closed', scene: 'Calm' } },
  { id: 'rb-unl-016', print: { domain2: 'Body' }, art: { ...YI, pose: 'action', x: ['aura'], scene: 'Grün' } },
  { id: 'rb-unl-017', print: { domain2: 'Chaos' }, art: { ...VEX, x: ['aura'], scene: 'Chaos', v: 1 } },
  { id: 'rb-unl-018', print: { domain2: 'Order' }, art: { ...IVERN, pose: 'cast', scene: 'Pflanze' } },
  { id: 'rb-unl-019', cover: 17, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...IVERN, prop: 'cup 6ac8f0', scene: 'Calm' } },
  { id: 'rb-unl-020', cover: 17, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...VEX, pose: 'cross', scene: 'Order' } },
  { id: 'rb-unl-021', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...LILLIA, pose: 'cast', x: ['aura'], scene: 'Farblos', v: 1 } },
  { id: 'rb-unl-022', cover: 17, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...YI, pose: 'action', flip: true, scene: 'Calm' } },
  {
    id: 'rb-unl-023',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Monster' },
    art: { a: 'blob', c: '8a6ad0 4a3a8a c8b8f0 6ad0c0', eyes: 'round', mouth: 'smile', x: ['hands'], scene: 'Wasser' },
  },
  {
    id: 'rb-unl-024',
    cover: 17,
    print: { energy: 2, might: 1, tag: 'Champion' },
    art: { a: 'quad', c: 'f4f0f8 c8c0d8 ffffff 6ac8f0', ears: 'point', tail: 'plain', eyes: 'round', mouth: 'smile', n: 2, scene: 'Zauber' },
  },
  {
    id: 'rb-unl-025',
    print: { energy: 3, tag: 'Signatur', domain2: 'Body' },
    text: 'Vier Hiebe: Verteile 4 Schaden.',
    art: { obj: 'swords', n: 4, c: 'e8f0d0 6ad04a', x: ['streak'], scene: 'Grün' },
  },
  {
    id: 'rb-unl-026',
    cover: 17,
    print: { energy: 5, might: 6, tag: 'Signatur', domain2: 'Order' },
    art: { a: 'humanoid', c: '9a9aa8 5a5a68 c8c8d0 f0a0c0', eyes: 'round', mouth: 'smile', x: ['gloves'], n: 1, scene: 'Pflanze' },
  },
  {
    id: 'rb-unl-027',
    cover: 17,
    print: { energy: 1, might: 2, tag: 'Ionia' },
    art: { fig: 'small', skin: 'e8c0a0', hair: 'short 2a2a2a', wear: 'robe c8a040 6ad04a', prop: 'sword b88450', pose: 'action', mouth: 'flat', scene: 'Grün' },
  },
  {
    id: 'rb-unl-028',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Ionia' },
    art: { a: 'quad', c: 'f0e8d8 a89880 ffffff f0a0c0', horn: 'back', ears: 'long', tail: 'fluff', n: 6, x: ['aura'], scene: 'Calm' },
  },
  { id: 'rb-unl-029', cover: 18, art: { rune: true, scene: 'Pflanze' } },

  // ── Mind ──
  { id: 'rb-unl-030', print: { domain2: 'Chaos' }, art: { ...DIANA, pose: 'action', scene: 'Psycho', v: 1 } },
  { id: 'rb-unl-031', print: { domain2: 'Order' }, art: { ...LEBLANC, pose: 'cast', x: ['aura'], scene: 'Lila' } },
  { id: 'rb-unl-032', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...DIANA, scene: 'Chaos', v: 1 } },
  { id: 'rb-unl-033', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...JHIN, pose: 'cross', scene: 'Mind' } },
  { id: 'rb-unl-034', cover: 17, print: { energy: 5, might: 3, tag: 'Champion' }, art: { ...LEBLANC, flip: true, scene: 'Psycho' } },
  {
    id: 'rb-unl-035',
    cover: 17,
    print: { energy: 4, might: 5, tag: 'Monster' },
    art: { a: 'biped', c: '3a5aa8 1a2a5a 8ab0e8 6ae0f0', back: 'spikes', eyes: 'cyclops', mouth: 'fang', x: ['claws'], n: 1, pose: 1, scene: 'Pflanze', v: 1 },
  },
  {
    id: 'rb-unl-036',
    print: { energy: 4, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Ziehe alle Feinde an einen Ort.',
    art: { obj: 'vortex', c: 'c8d0f0 ffffff', x: ['sparks'], scene: 'Lila', v: 1 },
  },
  {
    id: 'rb-unl-037',
    print: { energy: 2, tag: 'Signatur', domain2: 'Order' },
    text: 'Erschaffe eine Kopie einer deiner Einheiten.',
    art: { obj: 'crystal', c: '8a4ad0 f0c0ff', x: ['sparks', 'glow'], scene: 'Falle', v: 1 },
  },
  { id: 'rb-unl-038', print: { energy: 2 }, text: 'Eine Einheit verliert bis Zugende 2 Macht.', art: { obj: 'disc', c: '2a1a3a f0d040', x: ['rays'], scene: 'LICHT', v: 1 } },
  {
    id: 'rb-unl-039',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Monster' },
    art: { a: 'biped', c: '4ab88a 1a4a3a c0f0d0 a0ffd0', crest: 'ridge', tail: 'plain', eyes: 'vacant', mouth: 'fang', x: ['claws'], pose: 1, scene: 'FINSTERNIS' },
  },
  { id: 'rb-unl-040', cover: 18, art: { rune: true, scene: 'Farblos', v: 1 } },

  // ── Body ──
  { id: 'rb-unl-041', print: { domain2: 'Chaos' }, art: { ...KHAZIX, pose: 1, scene: 'Psycho', v: 1 } },
  { id: 'rb-unl-042', print: { domain2: 'Order' }, art: { ...POPPY, prop2: 'shield c83a3a', scene: 'Farblos' } },
  { id: 'rb-unl-043', cover: 17, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...POPPY, pose: 'cross', scene: 'Order' } },
  { id: 'rb-unl-044', cover: 17, print: { energy: 7, might: 8, tag: 'Drache' }, art: { ...ELDER, scene: 'Mind' } },
  {
    id: 'rb-unl-045',
    cover: 17,
    print: { energy: 4, might: 4, tag: 'Champion' },
    art: { a: 'biped', c: '4a3a8a 241a4a 9a8ac8 e040c0', wings: 'bug', crest: 'spiky', eyes: 'red', mouth: 'fang', x: ['claws', 'aura'], pose: 1, scene: 'Pflanze', v: 1 },
  },
  { id: 'rb-unl-046', cover: 17, print: { energy: 4, might: 5, tag: 'Champion' }, art: { ...RENGAR, pose: 0, scene: 'Feuer', v: 1 } },
  {
    id: 'rb-unl-047',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { a: 'quad', c: 'c8904a 6a4a2a f0d8b0 3ad0c0', ears: 'point', tail: 'plain', pat: 'spots', eyes: 'angry', mouth: 'fang', pose: 1, n: 5, scene: 'Pflanze' },
  },
  {
    id: 'rb-unl-048',
    print: { energy: 3, tag: 'Signatur', domain2: 'Order' },
    text: 'Schleudere eine Einheit weg. Tschüss.',
    art: { obj: 'club', c: 'c8c8d8 e0b040', x: ['rays', 'streak'], scene: 'Order' },
  },
  {
    id: 'rb-unl-049',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Monster' },
    art: { a: 'quad', c: '6a9a4a 3a5a2a c8e0a0 e86a8a', pat: 'bumps', mouth: 'open', eyes: 'round', n: 1, scene: 'Pflanze', v: 1 },
  },
  { id: 'rb-unl-050', print: { energy: 1 }, text: 'Ausgerüstet: +2 Macht gegen Monster.', art: { obj: 'sword', c: 'c8d0e0 5a3a22', x: ['stone'], scene: 'Pflanze' } },
  { id: 'rb-unl-051', cover: 18, art: { rune: true, scene: 'Body', v: 1 } },

  // ── Chaos ──
  { id: 'rb-unl-052', cover: 17, print: { energy: 8, might: 10, tag: 'Monster' }, art: { ...BARON, scene: 'Order', v: 1 } },
  {
    id: 'rb-unl-053',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: '9a8ac8', hair: 'long 2a2a5a', wear: 'dress 3a2a5a e85ab0', eyes: 'glow', mouth: 'grin', x: ['aura'], scene: 'FINSTERNIS' },
  },
  {
    id: 'rb-unl-054',
    cover: 17,
    print: { energy: 4, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: 'e8d0e0', hair: 'long f0f0f8', hat: 'crown 7a3ab0', wear: 'dress 5a2a7a c8a0f0', prop: 'orb 4a2a6a', pose: 'cast', x: ['aura'], scene: 'Chaos' },
  },
  {
    id: 'rb-unl-055',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Monster' },
    art: { a: 'quad', c: '8a6a4a 4a3020 c8a888 f0e8d8', crest: 'mane', horn: 'spike', ears: 'round', tail: 'plain', n: 3, scene: 'Pflanze', v: 1 },
  },
  {
    id: 'rb-unl-056',
    cover: 17,
    print: { energy: 1, might: 1 },
    art: { fig: 'small', skin: '9a7a4a', hat: 'tophat 2a2a2a', face: ['nose'], wear: 'bare 9a7a4a 6a8a3a', mouth: 'smile', pose: 'cast', scene: 'Pflanze' },
  },
  { id: 'rb-unl-057', cover: 18, art: { rune: true, scene: 'FINSTERNIS' } },

  // ── Order ──
  {
    id: 'rb-unl-058',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: 'f0d0c0', hair: 'long f0f0f8', hat: 'hood 3a5a9a', wear: 'robe 3a5a9a d8e8f8', prop: 'bow 8ac8f0', pose: 'action', scene: 'Farblos', v: 1 },
  },
  {
    id: 'rb-unl-059',
    cover: 17,
    print: { energy: 5, might: 5, tag: 'Monster' },
    art: { a: 'quad', c: '6a3a8a 2a1a4a c8a0e0 f040c0', eyes: 'cyclops', back: 'spikes', horn: 'spike', mouth: 'fang', n: 3, pose: 1, s: 1.15, scene: 'Kampf' },
  },
  { id: 'rb-unl-060', cover: 17, print: { energy: 1, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'round', mouth: 'open', x: ['cheeks'], scene: 'Farblos' } },
  { id: 'rb-unl-061', cover: 17, print: { energy: 2, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'fluffy', eyes: 'closed', mouth: 'smile', s: 1.2, scene: 'LICHT' } },
  { id: 'rb-unl-062', cover: 18, art: { rune: true, scene: 'Grün' } },

  // ── Battlefields ──
  { id: 'rb-unl-063', text: 'Stirbt hier eine Einheit, ziehe 1 Karte.', art: { land: 'sea', v: 1 } },
  { id: 'rb-unl-064', text: 'Zugbeginn: Eine Einheit hier erhält +1 Macht.', art: { land: 'forest', v: 1 } },

  // ── Alternative: a second artwork of the champion or monster; the frame adds the showcase treatment ──
  { id: 'rb-unl-065', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...PYKE, pose: 'action', x: ['aura'], scene: 'Zauber', v: 1 } },
  { id: 'rb-unl-066', cover: 18, print: { energy: 3, might: 5, tag: 'Champion' }, art: { ...VI, pose: 'cast', x: ['aura'], scene: 'Elektro', v: 1 } },
  { id: 'rb-unl-067', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...IVERN, eyes: 'closed', pose: 'cross', scene: 'Pflanze', v: 1 } },
  { id: 'rb-unl-068', cover: 18, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...VEX, pose: 'cross', x: ['aura'], flip: true, scene: 'LICHT', v: 1 } },
  { id: 'rb-unl-069', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...LILLIA, pose: 'action', flip: true, scene: 'Psycho', v: 1 } },
  { id: 'rb-unl-070', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...DIANA, pose: 'cast', x: ['aura'], scene: 'Mind' } },
  { id: 'rb-unl-071', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...JHIN, pose: 'action', flip: true, scene: 'Falle' } },
  { id: 'rb-unl-072', cover: 18, print: { energy: 5, might: 3, tag: 'Champion' }, art: { ...LEBLANC, pose: 'cross', x: ['aura'], scene: 'Order', v: 1 } },
  { id: 'rb-unl-073', cover: 18, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...POPPY, pose: 'cast', scene: 'LICHT', v: 1 } },
  { id: 'rb-unl-074', cover: 18, print: { energy: 7, might: 8, tag: 'Drache' }, art: { a: 'serpent', c: '2a3a7a 141a44 c8d0f0 f0d070', horn: 'back', crest: 'fins', eyes: 'angry', mouth: 'fang', s: 1.2, flip: true, scene: 'Lila', v: 1 } },
  { id: 'rb-unl-075', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...KHAZIX, pose: 1, flip: true, scene: 'Psycho' } },
  { id: 'rb-unl-076', cover: 18, print: { energy: 4, might: 5, tag: 'Champion' }, art: { ...RENGAR, flip: true, scene: 'Kampf', v: 1 } },
  { id: 'rb-unl-077', cover: 18, print: { energy: 8, might: 10, tag: 'Monster' }, art: { ...BARON, flip: true, scene: 'Pflanze', v: 1 } },
  { id: 'rb-unl-078', cover: 18, print: { energy: 1, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'closed', mouth: 'none', scene: 'FINSTERNIS' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
