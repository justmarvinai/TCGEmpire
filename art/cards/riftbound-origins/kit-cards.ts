import type { FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of Riftbound Origins below Ultra, built from compact kit specs (format: art/kit/index.ts;
 * docs/ART_DIRECTION.md §7, P2; art briefs: docs/sets/riftbound-origins.md). print: { energy, might,
 * tag, domain2 } (frame: art/frames/riftbound.ts); Legends print no cost. Units hide their bottom 17
 * art rows under the glass name bar (cover 17),
 * runes 18 under the floating plate; Alternative units (74×100) let the figure stand behind the glass name bar (cover 18). Champions share one look; their second card changes pose and scene.
 */
const JINX: FigureCard = { fig: 'slim', skin: 'f4d8d0', hair: 'braids 3a7ad8', wear: 'shirt 2a2a3a d84a8a d84a8a', mouth: 'grin' }
const KAISA: FigureCard = { fig: 'slim', skin: 'c89a8a', hair: 'long 241830', wear: 'armour 2a1e4a b04ad8', x: ['wings'], eyes: 'glow' }
const DARIUS: FigureCard = { fig: 'broad', skin: 'e0b090', hair: 'short 2a2020', face: ['beard'], wear: 'armour 2a2430 b82a2a', cape: 'b82a2a', prop: 'axe', eyes: 'angry', mouth: 'flat' }
const AHRI: FigureCard = { fig: 'slim', skin: 'f8dcc8', hair: 'long 2a1a2a', hat: 'fox', wear: 'kimono f4f0f8 c83a5a', x: ['tails'] }
const YASUO: FigureCard = { fig: 'normal', skin: 'e0b088', hair: 'pony 2a2030', wear: 'kimono 3a5a8a c8c0a8', prop: 'katana', eyes: 'narrow', mouth: 'flat' }
const LEESIN: FigureCard = { fig: 'normal', skin: 'd8a070', hair: 'bald', face: ['blindfold'], wear: 'bare 3a4a8a d82a2a', prop: 'fists' }
const TEEMO: FigureCard = { fig: 'small', skin: 'd8a868', hair: 'short d8a868', hat: 'cap 6a8a3a', face: ['elf'], wear: 'shirt 6a8a3a 8a5a30', mouth: 'grin' }
const MISS_FORTUNE: FigureCard = { fig: 'slim', skin: 'f0c0a0', hair: 'long c83a3a', hat: 'tricorn 2a2026', wear: 'coat 2a6a6a c83a3a' }
const SETT: FigureCard = { fig: 'broad', skin: 'e0a878', hair: 'slick b8482a', wear: 'open 3a2a2a e8e0d0', prop: 'fists e8c040', mouth: 'grin' }
const PORO = 'f4f2f8 c8c4d8 ffffff e86a8a'

const SPECS: readonly KitSpec[] = [
  // ── Fury ──
  { id: 'rb-ogn-001', print: { domain2: 'Mind' }, art: { ...KAISA, pose: 'cast', scene: 'Chaos', v: 1 } },
  {
    id: 'rb-ogn-002',
    print: { domain2: 'Body' },
    art: { a: 'biped', c: 'e8eef4 4a5a7a c8d4e0 6ac8f0', ears: 'round', x: ['claws'], eyes: 'angry', mouth: 'fang', pose: 1, s: 1.2, scene: 'Elektro', v: 1 },
  },
  { id: 'rb-ogn-003', print: { domain2: 'Chaos' }, art: { ...JINX, prop: 'minigun', prop2: 'launcher', pose: 'action', scene: 'Chaos', v: 1 } },
  { id: 'rb-ogn-004', print: { domain2: 'Order' }, art: { ...DARIUS, v: 1 } },
  { id: 'rb-ogn-005', cover: 17, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...JINX, prop: 'launcher' } },
  { id: 'rb-ogn-006', cover: 17, print: { energy: 5, might: 6, tag: 'Champion' }, art: { ...DARIUS, pose: 'action', scene: 'Body' } },
  {
    id: 'rb-ogn-007',
    cover: 17,
    print: { energy: 3, might: 5, tag: 'Champion' },
    art: { fig: 'normal', skin: 'f0c0a0', hair: 'short e85a9a', wear: 'coat 8a2a3a 3a3a48', prop: 'fists d8a040', pose: 'action', eyes: 'angry' },
  },
  {
    id: 'rb-ogn-008',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'normal', skin: 'e8b890', hair: 'slick 3a2418', face: ['moustache'], wear: 'armour 5a2a2a c8a040', prop: 'axe', prop2: 'axe', pose: 'cast', mouth: 'grin', scene: 'Body' },
  },
  {
    id: 'rb-ogn-009',
    print: { energy: 6, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Füge einer Einheit 6 Schaden zu. Bumm.',
    art: { obj: 'rocket', x: ['face', 'streak', 'smoke'], scene: 'Chaos', v: 1 },
  },
  {
    id: 'rb-ogn-010',
    print: { energy: 4, tag: 'Signatur', domain2: 'Order' },
    text: 'Vernichte eine verwundete Einheit.',
    art: { obj: 'axe', c: '7a7a8a a82a2a', x: ['glow'], v: 1 },
  },
  { id: 'rb-ogn-011', print: { energy: 2 }, text: 'Zu Beginn deines Zuges erhältst du 1 Energie.', art: { obj: 'disc', x: ['rays', 'stone'], scene: 'Body' } },
  { id: 'rb-ogn-012', cover: 17, print: { energy: 1, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'narrow', mouth: 'none', x: ['cheeks'] } },
  {
    id: 'rb-ogn-013',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Noxus' },
    art: { fig: 'normal', hat: 'helmet', wear: 'armour 3a3440 a82a2a', prop: 'spear', prop2: 'shield a82a2a', mouth: 'flat' },
  },
  { id: 'rb-ogn-014', cover: 17, print: { energy: 1, might: 2, tag: 'Noxus' }, art: { fig: 'slim', hair: 'short 6a4a2a', wear: 'shirt 8a3030 5a5a6a', prop: 'sword', pose: 'cast' } },
  {
    id: 'rb-ogn-015',
    cover: 17,
    print: { energy: 3, might: 4, tag: 'Zaun' },
    art: { fig: 'broad', skin: 'c8a080', hair: 'mohawk 4a8a3a', face: ['mask'], wear: 'armour 3a3a40 6ad04a', x: ['tank'], pose: 'cross', eyes: 'glow', scene: 'Chaos' },
  },
  { id: 'rb-ogn-016', cover: 17, print: { energy: 2, might: 2, tag: 'Zaun' }, art: { a: 'blob', n: 3, c: 'e85a9a 9a2a5a f8c0d8 f0d040', mouth: 'fang', eyes: 'angry' } },
  { id: 'rb-ogn-017', print: { energy: 1 }, text: 'Eine Einheit: +2 Macht, sie greift sofort an.', art: { obj: 'bolt', c: 'f05aa0 ffe0f0', x: ['streak', 'sparks'], scene: 'Chaos' } },
  { id: 'rb-ogn-018', cover: 18, art: { rune: true, v: 1 } },

  // ── Calm ──
  { id: 'rb-ogn-019', print: { domain2: 'Mind' }, art: { ...AHRI, prop: 'orb 6ad8f8', pose: 'cast' } },
  {
    id: 'rb-ogn-020',
    print: { domain2: 'Body' },
    art: { ...LEESIN, pose: 'action', x: ['aura'], scene: 'Body' },
  },
  { id: 'rb-ogn-021', print: { domain2: 'Chaos' }, art: { ...YASUO } },
  {
    id: 'rb-ogn-022',
    print: { domain2: 'Order' },
    art: { fig: 'normal', skin: 'f0c8a0', hair: 'long a8402a', hat: 'helmet e0b040', wear: 'armour e0b040 f8e8a0', prop: 'sword', prop2: 'shield f0c040', pose: 'cast', scene: 'Mind' },
  },
  { id: 'rb-ogn-023', cover: 17, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...AHRI, prop: 'orb f07aa8', flip: true, scene: 'Order', v: 1 } },
  { id: 'rb-ogn-024', cover: 17, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...YASUO, eyes: 'closed', scene: 'Wasser', v: 1 } },
  {
    id: 'rb-ogn-025',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'long 2a1a2a', hat: 'tophat 5a3a8a', wear: 'dress 5a3a8a e8d0a0', prop: 'rifle', pose: 'action', scene: 'Order', v: 1 },
  },
  {
    id: 'rb-ogn-026',
    cover: 17,
    print: { energy: 4, might: 5, tag: 'Champion' },
    art: { fig: 'giant', skin: 'e8b830', hair: 'bald', wear: 'armour e8b830 3a3a48', prop: 'fists 3a3a48', eyes: 'glow', mouth: 'none' },
  },
  {
    id: 'rb-ogn-027',
    print: { energy: 3, tag: 'Signatur', domain2: 'Mind' },
    text: 'Verteile 3 Schaden auf bis zu drei Einheiten.',
    art: { obj: 'fireball', n: 3, c: '3a8af0 c0e8ff', scene: 'Mind', v: 1 },
  },
  {
    id: 'rb-ogn-028',
    print: { energy: 4, tag: 'Signatur', domain2: 'Chaos' },
    text: 'Betäube eine Einheit und füge ihr 4 Schaden zu.',
    art: { obj: 'slash', x: ['streak'] },
  },
  {
    id: 'rb-ogn-029',
    print: { energy: 3, tag: 'Signatur', domain2: 'Body' },
    text: 'Kicke eine Einheit auf die Hand ihres Besitzers zurück.',
    art: { obj: 'fist', c: 'd8a070 f0c040', x: ['rays', 'glow'], scene: 'Body' },
  },
  { id: 'rb-ogn-030', print: { energy: 2 }, text: 'Opfere dies: Eine Einheit stirbt diesen Zug nicht.', art: { obj: 'hourglass', x: ['glow'] } },
  { id: 'rb-ogn-031', cover: 17, print: { energy: 2, might: 2, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', mouth: 'open', scene: 'Fury' } },
  {
    id: 'rb-ogn-032',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Shurima' },
    art: { fig: 'normal', skin: 'c8a050', hair: 'bald', wear: 'armour c8a050 4a8a8a', prop: 'staff b08a40', eyes: 'glow', mouth: 'none', scene: 'Body' },
  },
  { id: 'rb-ogn-033', cover: 17, print: { energy: 2, might: 2, tag: 'Ionia' }, art: { fig: 'slim', skin: 'f0c8a0', hair: 'bun 2a2a3a', wear: 'robe 3a8aa0 e8e0c8', prop: 'orb 6ac8f0', pose: 'cast' } },
  { id: 'rb-ogn-034', print: { energy: 1 }, text: 'Ziehe eine feindliche Einheit zu dir herüber.', art: { obj: 'heart', x: ['sparks', 'streak'] } },
  { id: 'rb-ogn-035', cover: 18, art: { rune: true } },

  // ── Mind ──
  { id: 'rb-ogn-036', print: { domain2: 'Chaos' }, art: { ...TEEMO, prop: 'pistol', pose: 'cast', scene: 'Pflanze' } },
  {
    id: 'rb-ogn-037',
    print: { domain2: 'Order' },
    art: { fig: 'normal', skin: 'c8b0a0', face: ['mask'], hat: 'hood 5a4a6a', wear: 'robe 4a4a5a e8a030', prop: 'staff c8a040', eyes: 'glow', pose: 'cast', x: ['aura'], v: 1 },
  },
  { id: 'rb-ogn-038', cover: 17, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...KAISA } },
  {
    id: 'rb-ogn-039',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: '8a5a3a', hair: 'mohawk f0f0f0', wear: 'coat 3a8a8a e8a030', prop: 'club 6ac8f0', x: ['tank'], pose: 'action' },
  },
  {
    id: 'rb-ogn-040',
    cover: 17,
    print: { energy: 3, might: 2, tag: 'Champion' },
    art: { fig: 'small', skin: 'e8c8a0', hair: 'afro f0e8c0', face: ['goggles', 'moustache'], wear: 'coat 4a6aa0 e8c040', prop: 'book' },
  },
  {
    id: 'rb-ogn-041',
    cover: 17,
    print: { energy: 5, might: 6, tag: 'Champion' },
    art: { fig: 'giant', skin: '9a6ab8', hair: 'bald', wear: 'coat f0f0f0 6a8aa0', prop: 'book e8e0c8', eyes: 'angry', mouth: 'grin' },
  },
  {
    id: 'rb-ogn-042',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Champion' },
    art: { fig: 'slim', skin: 'e8c8a8', hair: 'short 3a2a2a', wear: 'coat 4a4a5a e8a030', prop: 'staff 6a5a4a', eyes: 'narrow', mouth: 'flat' },
  },
  {
    id: 'rb-ogn-043',
    cover: 17,
    print: { energy: 1, might: 1, tag: 'Yordle' },
    art: { fig: 'small', skin: 'b8a0d8', hair: 'bun 6a4a8a', face: ['glasses'], wear: 'robe 3a5a9a e8d080', prop: 'staff 8a5a30', pose: 'cast' },
  },
  { id: 'rb-ogn-044', cover: 17, print: { energy: 1, might: 1, tag: 'Piltover' }, art: { fig: 'slim', hair: 'short a85a2a', wear: 'robe 3a4a8a e8d080', prop: 'book 8a3a2a', mouth: 'open' } },
  { id: 'rb-ogn-045', print: { energy: 2 }, text: 'Eine Einheit ist bis Zugende unangreifbar.', art: { obj: 'smoke', x: ['sparks'] } },
  { id: 'rb-ogn-046', print: { energy: 1 }, text: 'Betäube eine Einheit für diesen Zug.', art: { obj: 'vortex', c: '3a5ab0 a0c8f0', x: ['sparks'] } },
  { id: 'rb-ogn-047', cover: 18, art: { rune: true } },

  // ── Body ──
  { id: 'rb-ogn-048', print: { domain2: 'Chaos' }, art: { ...MISS_FORTUNE, prop: 'pistols', pose: 'action', scene: 'Wasser' } },
  { id: 'rb-ogn-049', print: { domain2: 'Order' }, art: { ...SETT, pose: 'cross', v: 1 } },
  { id: 'rb-ogn-050', cover: 17, print: { energy: 3, might: 3, tag: 'Champion' }, art: { ...LEESIN, eyes: 'closed', x: ['aura'], scene: 'Calm' } },
  {
    id: 'rb-ogn-051',
    cover: 17,
    print: { energy: 4, might: 5, tag: 'Champion' },
    art: { a: 'quad', c: '7a8a9a 3a4a5a c8d0d8 6ad04a', ears: 'point', x: ['claws'], mouth: 'fang', eyes: 'red', tail: 'plain', pose: 1, s: 1.1, scene: 'Chaos', v: 1 },
  },
  {
    id: 'rb-ogn-052',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Demacia' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'pony e8c060', wear: 'armour c8d0e0 3a6ab0', prop: 'sword', prop2: 'shield 3a6ab0', mouth: 'grin' },
  },
  { id: 'rb-ogn-053', cover: 17, print: { energy: 2, might: 2, tag: 'Ionia' }, art: { fig: 'slim', face: ['mask'], hat: 'hood 3a3a6a', wear: 'robe 3a3a6a 8a6ad0', pose: 'cast', scene: 'Calm', v: 1 } },
  { id: 'rb-ogn-054', cover: 17, print: { energy: 1, might: 2 }, art: { a: 'quad', c: 'e8a040 6a4a2a f8e0b0', pat: 'stripes', ears: 'round', tail: 'plain', n: 5, s: 0.9, scene: 'Pflanze' } },
  {
    id: 'rb-ogn-055',
    cover: 17,
    print: { energy: 3, might: 4, tag: 'Freljord' },
    art: { a: 'biped', c: '8a6a4a 5a3a2a c8a888 6ac8f0', ears: 'round', x: ['claws'], mouth: 'fang', eyes: 'angry', pose: 1, scene: 'Elektro', v: 1 },
  },
  {
    id: 'rb-ogn-056',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Pirat' },
    art: { fig: 'broad', skin: 'd8a070', hair: 'bald', face: ['beard'], hat: 'bandana c83a3a', wear: 'open e8e0d0 3a5a8a', prop: 'club 8a5a32', pose: 'action', scene: 'Wasser' },
  },
  {
    id: 'rb-ogn-057',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Shurima' },
    art: { a: 'quad', c: 'd8b070 a07840 f0e0b0 c84a2a', crest: 'ridge', horn: 'back', tail: 'plain', mouth: 'fang', eyes: 'angry', n: 6, pose: 1, scene: 'Body' },
  },
  { id: 'rb-ogn-058', cover: 18, art: { rune: true } },

  // ── Chaos ──
  { id: 'rb-ogn-059', cover: 17, print: { energy: 2, might: 2, tag: 'Champion' }, art: { ...TEEMO, face: ['elf', 'goggles'], prop: 'pistol', scene: 'Pflanze' } },
  { id: 'rb-ogn-060', cover: 17, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...MISS_FORTUNE, prop: 'pistol', pose: 'action', scene: 'Wasser', v: 1 } },
  {
    id: 'rb-ogn-061',
    cover: 17,
    print: { energy: 4, might: 3, tag: 'Champion' },
    art: { fig: 'slim', skin: 'e0b890', hair: 'long 3a2a2a', face: ['moustache'], hat: 'wide 5a3a2a', wear: 'coat 3a2a5a c8a040', prop: 'fan c8a040', mouth: 'grin', v: 1 },
  },
  {
    id: 'rb-ogn-062',
    cover: 17,
    print: { energy: 4, might: 4, tag: 'Champion' },
    art: { fig: 'slim', skin: 'c8a0a0', hair: 'long 2a1a2a', wear: 'coat 2a1a2a 8a2a3a', prop: 'scythe 8a2a2a', eyes: 'angry', pose: 'action', x: ['aura'], v: 1 },
  },
  {
    id: 'rb-ogn-063',
    cover: 17,
    print: { energy: 3, might: 5, tag: 'Zaun' },
    art: { fig: 'giant', skin: 'c08860', hair: 'mohawk 2a2a2a', face: ['shades'], wear: 'open 2a2a3a 6ad04a', pose: 'cross', v: 1 },
  },
  {
    id: 'rb-ogn-064',
    cover: 17,
    print: { energy: 1, might: 1, tag: 'Pirat' },
    art: { fig: 'slim', skin: 'e8b890', hat: 'bandana 3a6a3a', face: ['eyepatch'], wear: 'shirt e8e0d0 6a4a8a', eyes: 'narrow', mouth: 'grin', scene: 'Wasser', v: 1 },
  },
  { id: 'rb-ogn-065', cover: 17, print: { energy: 2, might: 2, tag: 'Ionia' }, art: { fig: 'normal', skin: 'd8a070', hair: 'bald', wear: 'robe c85a2a 3a2a2a', prop: 'orb f07a2a', pose: 'cast', x: ['aura'] } },
  { id: 'rb-ogn-066', print: { energy: 1 }, text: 'Schicke eine kleine Einheit auf die Hand.', art: { obj: 'gust', x: ['streak'] } },
  { id: 'rb-ogn-067', cover: 18, art: { rune: true } },

  // ── Order ──
  { id: 'rb-ogn-068', cover: 17, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...SETT, v: 1 } },
  { id: 'rb-ogn-069', cover: 17, print: { energy: 3, might: 4, tag: 'Champion' }, art: { fig: 'slim', skin: 'f0c8a8', hair: 'short 2a2a3a', wear: 'suit 3a5ab0 e8c040', prop: 'sword c8d0e0', pose: 'action' } },
  {
    id: 'rb-ogn-070',
    cover: 17,
    print: { energy: 4, might: 4, tag: 'Champion' },
    art: { fig: 'normal', skin: 'e0b088', face: ['mask'], hat: 'hood 3a4a8a', wear: 'robe 3a4a8a 6ac8f0', prop: 'katana 6ac8f0', eyes: 'glow', v: 1 },
  },
  {
    id: 'rb-ogn-071',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Noxus' },
    art: { fig: 'broad', hat: 'helmet 4a4a5a', wear: 'armour 3a3440 a82a2a', prop: 'club 8a5a32', prop2: 'shield a82a2a', pose: 'cast' },
  },
  { id: 'rb-ogn-072', cover: 17, print: { energy: 1, might: 1, tag: 'Poro' }, art: { a: 'blob', c: PORO, ears: 'point', eyes: 'angry', mouth: 'open', scene: 'Mind' } },
  {
    id: 'rb-ogn-073',
    cover: 17,
    print: { energy: 3, might: 3, tag: 'Demacia' },
    art: { fig: 'normal', hat: 'helmet c8d0e0', wear: 'armour c8d0e0 3a6ab0', cape: '3a6ab0', prop: 'sword', pose: 'action', scene: 'Body' },
  },
  {
    id: 'rb-ogn-074',
    cover: 17,
    print: { energy: 2, might: 3, tag: 'Noxus' },
    art: { fig: 'normal', skin: 'd8a888', hair: 'short 2a2020', face: ['scar'], wear: 'armour 3a3440 a82a2a', prop: 'sword', prop2: 'sword', scene: 'Body' },
  },
  { id: 'rb-ogn-075', cover: 18, art: { rune: true } },

  // ── Battlefields ──
  { id: 'rb-ogn-076', text: 'Wenn du hier eroberst, ziehe 1 Karte.', art: { land: 'peak' } },
  { id: 'rb-ogn-077', text: 'Einheiten hier haben +1 Macht.', art: { land: 'rift' } },
  { id: 'rb-ogn-078', text: 'Eroberst du hier: Wirf 1 Karte ab, ziehe 2.', art: { land: 'warrens' } },

  // ── Alternative: a second artwork of the champion; the frame adds the showcase treatment ──
  { id: 'rb-ogn-079', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...JINX, prop: 'launcher', pose: 'action', mouth: 'open', scene: 'Chaos' } },
  { id: 'rb-ogn-080', cover: 18, print: { energy: 4, might: 3, tag: 'Champion' }, art: { ...AHRI, prop: 'orb f08ab0', pose: 'cast' } },
  { id: 'rb-ogn-081', cover: 18, print: { energy: 3, might: 4, tag: 'Champion' }, art: { ...YASUO, pose: 'action', flip: true, v: 1 } },
  { id: 'rb-ogn-082', cover: 18, print: { energy: 5, might: 5, tag: 'Champion' }, art: { ...KAISA, pose: 'cast', x: ['wings', 'aura'], v: 1 } },
  { id: 'rb-ogn-083', cover: 18, print: { energy: 2, might: 2, tag: 'Champion' }, art: { ...TEEMO, pose: 'cast', scene: 'Pflanze', v: 1 } },
  { id: 'rb-ogn-084', cover: 18, print: { energy: 4, might: 4, tag: 'Champion' }, art: { ...MISS_FORTUNE, prop: 'pistols', pose: 'cast', scene: 'Elektro', v: 1 } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
