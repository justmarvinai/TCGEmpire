import type { CreatureCard, FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of Riftbound Spiritforged below Ultra, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; art briefs: docs/sets/riftbound-spiritforged.md). Same frame and print
 * data as Origins (art/frames/riftbound.ts): print { energy, might, tag, domain2 }; Legends print no cost.
 * Units hide their bottom 17 art rows under the glass name bar (cover 17), runes 18 under the floating
 * plate, Alternative units 18. Champions share one look (exported for the hero placeholders); their
 * Alternative card changes pose and scene.
 */
export const RUMBLE: FigureCard = { fig: 'small', skin: '8aa8c8', hair: 'spiky e8dcc0', face: ['goggles', 'elf'], wear: 'shirt 8a4a2a e8a040 4a3a34', mouth: 'grin' }
/** Rumble inside his scrap mech: a giant of patched plates with the yordle's goggled face in the hatch. */
export const RUMBLE_MECH: FigureCard = { fig: 'giant', skin: '8aa8c8', hair: 'spiky e8dcc0', face: ['goggles'], wear: 'armour 8a4a2a e8a040 4a4a58', prop: 'launcher 5a5a68', x: ['tank'], mouth: 'grin' }
export const LUCIAN: FigureCard = { fig: 'normal', skin: '8a5a3a', hair: 'short 1a1418', wear: 'coat 2a2a34 e8e0d0', prop: 'pistols e8f4ff', eyes: 'narrow', mouth: 'flat' }
export const DRAVEN: FigureCard = { fig: 'normal', skin: 'e8b890', hair: 'slick 3a2418', face: ['moustache'], wear: 'armour 5a2a2a c8a040', prop: 'axe', prop2: 'axe', mouth: 'grin' }
export const REKSAI: CreatureCard = { a: 'quad', c: '6a3a9a 2a1a4a c8a0e0 f04ab0', back: 'spikes', crest: 'ridge', eyes: 'vacant', mouth: 'fang', x: ['claws'], tail: 'stinger', n: 6, pose: 1, s: 1.15 }
export const ORNN: FigureCard = { fig: 'giant', skin: 'b87850', hair: 'wild 7a5a4a', face: ['beard'], hat: 'horns d8c8a8', wear: 'armour 3e3430 e8802a', prop: 'axe 5a5a68', mouth: 'flat' }
export const JAX: FigureCard = { fig: 'normal', skin: '8a6ab0', face: ['mask'], hat: 'hood 3a2a5a', wear: 'armour 3a2a5a e0b040', prop: 'staff f0d060', eyes: 'glow', mouth: 'none' }
export const IRELIA: FigureCard = { fig: 'slim', skin: 'e8c0a0', hair: 'pony 1e1a2a', wear: 'armour 2a8a8a e0b040', mouth: 'flat' }
const BLADES = { prop: 'sword d8f0f0', prop2: 'sword d8f0f0' } as const
export const AZIR: FigureCard = { fig: 'normal', skin: 'c89a50', face: ['nose'], hat: 'crown e8c040', wear: 'armour e8c040 2a8a8a', cape: '2a8a8a', prop: 'spear f0d060', eyes: 'glow', mouth: 'none' }
export const EZREAL: FigureCard = { fig: 'slim', skin: 'f0c8a0', hair: 'spiky f0d050', face: ['goggles'], wear: 'coat 3a5a9a e8c060 6a4a30', mouth: 'grin' }
export const RENATA: FigureCard = { fig: 'slim', skin: 'e8c0a0', hair: 'slick 2a1a2a', wear: 'dress 4a2a5a 6ad04a', eyes: 'narrow', mouth: 'grin' }
export const SIVIR: FigureCard = { fig: 'slim', skin: 'c8905a', hair: 'long 2a1a1a', wear: 'armour c8a050 a83a2a', prop: 'fan e8c040', mouth: 'grin' }
export const FIORA: FigureCard = { fig: 'slim', skin: 'f0c8a8', hair: 'short 3a2a3a', wear: 'suit 3a5ab0 e8e8f4', cape: '3a5ab0', prop: 'sword d8e0f0' }
export const YONE: FigureCard = { fig: 'normal', skin: 'e0b088', hair: 'pony 2a2030', face: ['mask'], wear: 'kimono 2a1a22 c82a2a', prop: 'katana2 d84a4a', eyes: 'glow', mouth: 'none' }
export const BARD: FigureCard = { fig: 'normal', face: ['mask'], hat: 'hood e8dcc0', wear: 'robe e8dcc0 e0b040', prop: 'orb f0d060', eyes: 'glow', mouth: 'none' }
export const SORAKA: FigureCard = { fig: 'slim', skin: '9ab0e0', hair: 'long f0f0f8', hat: 'horns f0e0a0', wear: 'robe 6a5ab0 e8e0f8', prop: 'staff f0d060', eyes: 'closed' }
export const AHRI: FigureCard = { fig: 'slim', skin: 'f8dcc8', hair: 'long 2a1a2a', hat: 'fox', wear: 'kimono f4f0f8 c83a5a', x: ['tails'] }
const RENGAR: CreatureCard = { a: 'humanoid', c: 'c8945a 5a3a20 f0dcb0 e04a2a', crest: 'mane', ears: 'point', x: ['claws'], eyes: 'angry', mouth: 'fang', n: 1, pose: 1 }
const VEX: FigureCard = { fig: 'small', skin: 'c8c8d8', hat: 'hood 2a2a3a', face: ['elf'], wear: 'robe 2a2a3a 6a4ab0', eyes: 'narrow', mouth: 'flat' }
const PORO = 'f4f2f8 c8c4d8 ffffff e86a8a'

const SPECS: readonly KitSpec[] = [
  // ── Fury ──
  { id: 'rb-sfd-001', print: { domain2: 'Mind' }, art: { ...RUMBLE_MECH, scene: 'Fury' } },
  { id: 'rb-sfd-002', print: { domain2: 'Body' }, art: { ...LUCIAN, pose: 'cross', x: ['aura'], scene: 'Lila' } },
  { id: 'rb-sfd-003', print: { domain2: 'Chaos' }, art: { ...DRAVEN, pose: 'cast', cape: 'b82a2a', scene: 'Order', v: 1 } },
  { id: 'rb-sfd-004', print: { domain2: 'Order' }, art: { ...REKSAI, pose: 0, scene: 'Body' } },
  { id: 'rb-sfd-005', cover: 17, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...RUMBLE, prop: 'axe 8a8a98', x: ['tank'], pose: 'action', scene: 'Mind', v: 1 } },
  { id: 'rb-sfd-006', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...DRAVEN, prop2: 'shield a82a2a', pose: 'action', scene: 'Body' } },
  { id: 'rb-sfd-007', cover: 17, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...LUCIAN, pose: 'action', scene: 'Mind', v: 1 } },
  { id: 'rb-sfd-008', cover: 17, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...REKSAI, flip: true, scene: 'Kampf' } },
  { id: 'rb-sfd-009', cover: 17, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...RENGAR, scene: 'Pflanze' } },
  {
    id: 'rb-sfd-010',
    print: { energy: 2, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Ausgerüstet: +2 Macht. Fang sie, sonst Finger ab.',
    art: { obj: 'axe', c: '8a8a9a c82a2a', x: ['streak', 'sparks'], flip: true },
  },
  {
    id: 'rb-sfd-011',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Drache' },
    art: { a: 'quad', c: 'd0582a 6a2014 f0b070 f0d040', horn: 'spike', crest: 'ridge', ears: 'point', tail: 'flame', mouth: 'open', n: 4, scene: 'Kampf', v: 1 },
  },
  { id: 'rb-sfd-012', cover: 17, print: { energy: 1, might: 1, tag: 'Leere' }, art: { a: 'insect', c: '8a4ad0 3a1a6a e0c0f8 f04ab0', wings: 'bug', eyes: 'red', scene: 'Chaos' } },
  { id: 'rb-sfd-013', cover: 18, art: { rune: true, scene: 'Fury' } },

  // ── Calm ──
  { id: 'rb-sfd-014', print: { domain2: 'Mind' }, art: { ...ORNN, pose: 'cast', scene: 'Feuer', v: 1 } },
  { id: 'rb-sfd-015', print: { domain2: 'Body' }, art: { ...JAX, pose: 'action', x: ['aura'], scene: 'Chaos', v: 1 } },
  { id: 'rb-sfd-016', print: { domain2: 'Chaos' }, art: { ...IRELIA, ...BLADES, x: ['wings'], pose: 'cast', scene: 'Calm', v: 1 } },
  { id: 'rb-sfd-017', print: { domain2: 'Order' }, art: { ...AZIR, pose: 'cast', scene: 'Body' } },
  { id: 'rb-sfd-018', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...IRELIA, x: ['wings'], eyes: 'closed', scene: 'Calm' } },
  {
    id: 'rb-sfd-019',
    print: { energy: 4, tag: 'Signatur', domain2: 'Mind' },
    text: 'Ausgerüstet: +3 Macht. Der Hut ist klüger als du.',
    art: { obj: 'crystal', c: '5a4ac8 e8c040', x: ['stone', 'glow', 'sparks'], v: 1 },
  },
  {
    id: 'rb-sfd-020',
    print: { energy: 2, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Deine Einheiten: +2 Macht bis Zugende.',
    art: { obj: 'swords', n: 4, c: 'd8e8f0 e0b040', x: ['sparks', 'glow'], scene: 'Calm', v: 1 },
  },
  {
    id: 'rb-sfd-021',
    print: { energy: 3, tag: 'Signatur', domain2: 'Order' },
    text: 'Erschaffe zwei Sandsoldaten mit 2 Macht.',
    art: { obj: 'ankh', c: 'e8c040 2a8a8a', x: ['rays'], scene: 'Body' },
  },
  {
    id: 'rb-sfd-022',
    print: { energy: 3 },
    text: 'Stirbt die Einheit, kehrt sie einmal zurück.',
    art: { obj: 'wings', c: 'e0e8f4 e8c040', x: ['glow', 'rays'], scene: 'Mind' },
  },
  {
    id: 'rb-sfd-023',
    cover: 17,
    print: { energy: 4, might: 6, tag: 'Yordle' },
    art: { fig: 'giant', skin: 'e0b890', hair: 'wild f0e0c0', face: ['elf'], wear: 'shirt 5a8a4a 8a5a30', mouth: 'grin', scene: 'Farblos' },
  },
  { id: 'rb-sfd-024', cover: 17, print: { energy: 1, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'round', mouth: 'none', scene: 'Farblos', v: 1 } },
  { id: 'rb-sfd-025', print: { energy: 1 }, text: 'Ausgerüstet: +1 Macht. Billig, aber ehrlich.', art: { obj: 'disc', c: '9a6a3a c83a3a', x: ['stone'], scene: 'Pflanze' } },
  { id: 'rb-sfd-026', print: { energy: 2 }, text: 'Betäube eine Einheit. Thwonk.', art: { obj: 'club', c: 'a87040 c8c8d0', x: ['streak', 'sparks'], scene: 'Grün' } },
  { id: 'rb-sfd-027', cover: 18, art: { rune: true, scene: 'Calm', v: 1 } },

  // ── Mind ──
  { id: 'rb-sfd-028', print: { domain2: 'Chaos' }, art: { ...EZREAL, prop: 'fists', pose: 'action', x: ['aura'], scene: 'Kampf' } },
  { id: 'rb-sfd-029', print: { domain2: 'Order' }, art: { ...RENATA, pose: 'cross', scene: 'Mind', v: 1 } },
  { id: 'rb-sfd-030', cover: 17, print: { energy: 6, might: 6, tag: 'Champion' }, art: { ...ORNN, prop2: 'sword f08a3a', scene: 'Fury' } },
  { id: 'rb-sfd-031', cover: 17, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...RENATA, prop: 'cup 6ad04a', scene: 'Zauber' } },
  { id: 'rb-sfd-032', cover: 17, print: { energy: 3, might: 2, tag: 'Champion' }, art: { ...BARD, pose: 'cast', x: ['aura'], scene: 'Mind' } },
  {
    id: 'rb-sfd-033',
    cover: 17,
    print: { energy: 4, might: 4, tag: 'Champion' },
    art: { fig: 'normal', skin: 'f0c8a0', hair: 'slick 3a2a1a', wear: 'coat e8e0d0 3a6ab0 3a3a48', prop: 'axe 6ac8f0', scene: 'Mind', v: 1 },
  },
  {
    id: 'rb-sfd-034',
    print: { energy: 2, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Bewege eine Einheit. Füge 2 Schaden zu.',
    art: { obj: 'vortex', c: 'e8b030 fff0a0', x: ['sparks'], scene: 'Kampf' },
  },
  { id: 'rb-sfd-035', cover: 17, print: { energy: 2, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'narrow', mouth: 'fang', x: ['cheeks'], scene: 'Rot' } },
  { id: 'rb-sfd-036', cover: 17, print: { energy: 2, might: 2, tag: 'Piltover' }, art: { a: 'humanoid', c: 'c8a060 6a5030 f0e0b0 6ac8f0', eyes: 'round', mouth: 'smile', x: ['magnets'], pose: 2 } },
  {
    id: 'rb-sfd-037',
    print: { energy: 1 },
    text: 'Ausgerüstet: Die Einheit nimmt 1 Schaden weniger.',
    art: { fig: 'normal', skin: 'c89a60', hair: 'bald', wear: 'shirt 8a9ab0 c8a870 6a5a40', eyes: 'closed', mouth: 'none', scene: 'Mind', v: 1 },
  },
  { id: 'rb-sfd-038', cover: 18, art: { rune: true, scene: 'Mind', v: 1 } },

  // ── Body ──
  { id: 'rb-sfd-039', print: { domain2: 'Chaos' }, art: { ...SIVIR, pose: 'cast', scene: 'Feuer' } },
  { id: 'rb-sfd-040', print: { domain2: 'Order' }, art: { ...FIORA, pose: 'cast', scene: 'Order' } },
  { id: 'rb-sfd-041', cover: 17, print: { energy: 4, might: 5, tag: 'Champion' }, art: { ...YONE, pose: 'action', scene: 'Grün' } },
  { id: 'rb-sfd-042', cover: 17, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...JAX, pose: 'cast', scene: 'Body', v: 1 } },
  {
    id: 'rb-sfd-043',
    print: { energy: 4 },
    text: 'Ausgerüstet: +2 Macht. Greift sie an, ziehe 1 Karte.',
    art: { obj: 'crystal', c: 'e8c040 c83a3a', x: ['bolts', 'glow'], scene: 'Body', v: 1 },
  },
  {
    id: 'rb-sfd-044',
    print: { energy: 2, tag: 'Signatur', domain2: 'Order' },
    text: 'Pariere einen Angriff, schlage mit 3 zurück.',
    art: { obj: 'slash', c: '6ac8f0 ffffff', x: ['sparks'], scene: 'Order' },
  },
  {
    id: 'rb-sfd-045',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Poro' },
    art: { a: 'blob', c: PORO, ears: 'point', eyes: 'angry', mouth: 'none', x: ['moustache'], scene: 'Body', v: 1 },
  },
  { id: 'rb-sfd-046', print: { energy: 1 }, text: 'Ausgerüstet: +1 Macht. Reicht fürs erste Date.', art: { obj: 'sword', c: 'c8d0e0 c83a3a', x: ['stone'], scene: 'Kampf' } },
  {
    id: 'rb-sfd-047',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Pirat' },
    art: { a: 'humanoid', c: '9a6a3a 5a3a20 e8c8a0 e8d040', ears: 'big', tail: 'curl', mouth: 'smile', pose: 1, scene: 'Rot' },
  },
  { id: 'rb-sfd-048', cover: 18, art: { rune: true, scene: 'Kampf' } },

  // ── Chaos ──
  { id: 'rb-sfd-049', cover: 17, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...EZREAL, prop: 'book e0b040', scene: 'LICHT' } },
  { id: 'rb-sfd-050', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...SIVIR, pose: 'cross', scene: 'Kampf' } },
  {
    id: 'rb-sfd-051',
    cover: 17,
    print: { energy: 3, might: 2, tag: 'Champion' },
    art: { fig: 'small', skin: '4a9ad8', hair: 'mohawk 2a5a9a', face: ['elf'], wear: 'bare 4a9ad8 e8e0d0 2a5a9a', prop: 'spear e0b040', mouth: 'grin', scene: 'Wasser' },
  },
  { id: 'rb-sfd-052', cover: 17, print: { energy: 2, might: 3, tag: 'Champion' }, art: { ...VEX, x: ['aura'], scene: 'Elektro', v: 1 } },
  {
    id: 'rb-sfd-053',
    cover: 17,
    print: { energy: 1, might: 1 },
    art: { fig: 'normal', skin: 'f0c8a0', hair: 'wild e85a2a', wear: 'shirt 7a3ab0 f0d040', prop: 'fists', mouth: 'open', eyes: 'round', pose: 'cast', scene: 'Chaos' },
  },
  { id: 'rb-sfd-054', print: { energy: 2 }, text: 'Füge einer Einheit 3 Schaden zu. Angesagt!', art: { obj: 'beam', c: 'f0d040 fff0c0', x: ['smoke', 'streak'], scene: 'Chaos', v: 1 } },
  { id: 'rb-sfd-055', print: { energy: 1 }, text: 'Ausgerüstet: +1 Energie, wenn sie angreift.', art: { obj: 'orb', c: '3a6ad8 d8dce8', x: ['stone', 'sparks'], scene: 'Psycho' } },
  { id: 'rb-sfd-056', cover: 18, art: { rune: true, scene: 'Chaos', v: 1 } },

  // ── Order ──
  { id: 'rb-sfd-057', cover: 17, print: { energy: 5, might: 4, tag: 'Champion' }, art: { ...AZIR, pose: 'cross', scene: 'Order', v: 1 } },
  { id: 'rb-sfd-058', cover: 17, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...FIORA, scene: 'Mind', v: 1 } },
  { id: 'rb-sfd-059', cover: 17, print: { energy: 3, might: 2, tag: 'Champion' }, art: { ...SORAKA, pose: 'cast', scene: 'Farblos', v: 1 } },
  {
    id: 'rb-sfd-060',
    print: { energy: 3 },
    text: 'Ausgerüstet: +2 Macht. Stiehlt dem Ziel 1 Macht.',
    art: { obj: 'sword', c: '2a4a40 6ad0a0', x: ['stone', 'smoke', 'glow'], scene: 'FINSTERNIS' },
  },
  { id: 'rb-sfd-061', print: { energy: 3 }, text: 'Ausgerüstet: +3 Macht. Groß. Sehr groß.', art: { obj: 'sword', c: 'd8dce8 8a5a30', x: ['rays'], s: 1.25, scene: 'Order', v: 1 } },
  {
    id: 'rb-sfd-062',
    cover: 17,
    print: { energy: 1, might: 2, tag: 'Zaun' },
    art: { fig: 'slim', skin: 'e8c0a0', hair: 'mohawk 6ad04a', face: ['goggles'], wear: 'open 2a2a30 6ad04a', prop: 'cup 6ad04a', mouth: 'grin', scene: 'Mind', v: 1 },
  },
  {
    id: 'rb-sfd-063',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Demacia' },
    art: { fig: 'normal', hat: 'helmet c8d0e0', wear: 'armour c8d0e0 3a6ab0', prop: 'spear', prop2: 'shield 3a6ab0', mouth: 'flat', eyes: 'narrow' },
  },
  { id: 'rb-sfd-064', cover: 18, art: { rune: true, scene: 'Order', v: 1 } },

  // ── Battlefields ──
  { id: 'rb-sfd-065', text: 'Eroberst du hier, erschaffe einen Sandsoldaten.', art: { land: 'wasteland' } },
  { id: 'rb-sfd-066', text: 'Ausrüstung kostet hier 1 Energie weniger.', art: { land: 'mountain', v: 1 } },

  // ── Alternative: a second artwork of the champion; the frame adds the showcase treatment ──
  { id: 'rb-sfd-067', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...DRAVEN, cape: 'e8c040', flip: true, scene: 'LICHT' } },
  { id: 'rb-sfd-068', cover: 18, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...RUMBLE_MECH, pose: 'action', scene: 'Fury', v: 1 } },
  { id: 'rb-sfd-069', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...LUCIAN, pose: 'cast', x: ['aura'], flip: true, scene: 'Lila', v: 1 } },
  { id: 'rb-sfd-070', cover: 18, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...REKSAI, s: 1.3, scene: 'Psycho' } },
  { id: 'rb-sfd-071', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...IRELIA, ...BLADES, pose: 'action', x: ['wings'], scene: 'Wasser', v: 1 } },
  { id: 'rb-sfd-072', cover: 18, print: { energy: 6, might: 6, tag: 'Champion' }, art: { ...ORNN, pose: 'action', prop: 'axe f0d060', x: ['aura'], scene: 'Mind' } },
  { id: 'rb-sfd-073', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...RENATA, prop: 'cup 6ad04a', pose: 'cast', flip: true, scene: 'Lila' } },
  { id: 'rb-sfd-074', cover: 18, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...JAX, pose: 'cross', x: ['aura'], scene: 'Psycho', v: 1 } },
  { id: 'rb-sfd-075', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...SIVIR, pose: 'action', flip: true, scene: 'Body', v: 1 } },
  { id: 'rb-sfd-076', cover: 18, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...EZREAL, prop: 'orb 8ad8ff', pose: 'cast', scene: 'Pflanze', v: 1 } },
  { id: 'rb-sfd-077', cover: 18, print: { energy: 5, might: 4, tag: 'Champion' }, art: { ...AZIR, x: ['aura'], flip: true, scene: 'LICHT' } },
  { id: 'rb-sfd-078', cover: 18, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...FIORA, pose: 'action', flip: true, scene: 'LICHT', v: 1 } },
  { id: 'rb-sfd-079', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...AHRI, prop: 'orb f0b8d0', pose: 'cast', scene: 'Calm', v: 1 } },
  { id: 'rb-sfd-080', print: { domain2: 'Chaos' }, art: { ...IRELIA, ...BLADES, x: ['wings', 'aura'], pose: 'action', flip: true, scene: 'Mind' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
