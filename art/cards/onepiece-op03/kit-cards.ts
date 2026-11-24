import type { FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { cost, power, life, counter, type } (frame: art/frames/onepiece.ts). Cost, power and
 * life as in docs/sets/onepiece-op03.md; counter and type from the official English card data, types in
 * German. Event texts are short German versions of the card effects (three lines). Alternative cards
 * reuse the look of their base card with another pose and scene.
 */
const ACE: FigureCard = { fig: 'slim', hair: 'wild 1c1418', hat: 'wide f08a20', wear: 'bare f1b688 f0a020 2a2a3a', prop: 'fists', mouth: 'grin' }
const MARCO: FigureCard = { fig: 'slim', hair: 'spiky f0d060', wear: 'open 6a4ab0 3ab0f0 3a3a6a', x: ['wings', 'aura'], eyes: 'narrow' }
const GARP: FigureCard = { fig: 'broad', skin: 'e0a878', hair: 'short e8e8e8', face: ['beard', 'scar'], wear: 'coat f4f4f0 2a2a3a 3a4a6a', eyes: 'angry', mouth: 'grin' }
const KURO: FigureCard = { fig: 'slim', skin: 'f0d0b0', hair: 'slick 1c1a24', face: ['glasses'], wear: 'suit 1c1a24 f4f0e8', prop: 'katana2 c8c8d8', eyes: 'narrow', mouth: 'flat' }
const ARLONG: FigureCard = { fig: 'broad', skin: '7aa8d0', hair: 'short 2a2a3a', face: ['saw'], wear: 'open f0e8d0 3a8a5a 6a4a30', eyes: 'angry', mouth: 'fang' }
const NAMI: FigureCard = { fig: 'slim', skin: 'f8c8a0', hair: 'long f08030', wear: 'shirt f8f8f8 3a6ab0 3a6ab0', prop: 'staff 4a8ad8' }
const BUGGY: FigureCard = { fig: 'normal', skin: 'f4ece0', hair: 'long 3a8ad8', hat: 'tricorn', wear: 'coat d83a3a f0d040 3a3a6a', mouth: 'grin' }
const USOPP: FigureCard = { fig: 'slim', skin: 'c08850', hair: 'wild 1c1418', face: ['nose', 'goggles'], wear: 'shirt e8d8b0 8a5a30 6a4a30' }
const ICEBURG: FigureCard = { fig: 'slim', hair: 'short 3a6ab0', wear: 'suit 2a2a3a f4f0e8', eyes: 'closed', mouth: 'flat' }
const LUFFY: FigureCard = { fig: 'slim', hair: 'short 1c1418', hat: 'straw', face: ['scar'], wear: 'open d83030 d83030 2a5ab0', prop: 'fists', pose: 'action', mouth: 'grin' }
const LUCCI: FigureCard = { fig: 'normal', skin: 'e8c8a8', hair: 'long 1c1a24', hat: 'tophat 1c1a24', face: ['beard'], wear: 'suit 1c1a24 f4f0e8', eyes: 'narrow', mouth: 'flat' }
const LINLIN: FigureCard = { fig: 'giant', skin: 'f0c8a8', hair: 'wild f080b0', hat: 'tricorn', wear: 'dress f4f0f8 d83a5a', cape: 'd83a5a', mouth: 'grin' }
const ISSHO: FigureCard = { fig: 'normal', skin: 'c08860', hair: 'short 1c1a24', face: ['scar'], wear: 'kimono 6a3a9a f4f0e8 3a2a4a', cape: 'f4f4f0', eyes: 'closed', mouth: 'flat' }
const KAKU: FigureCard = { fig: 'slim', skin: 'e8c8a8', hair: 'short e08a40', hat: 'cap 1c1a24', face: ['nose'], wear: 'suit 1c1a24 f4f0e8', prop: 'katana2' }
const KALIFA: FigureCard = { fig: 'slim', hair: 'long f0d060', face: ['glasses'], wear: 'dress 2a2a3a f4f0e8', eyes: 'narrow' }
const KATAKURI: FigureCard = { fig: 'giant', skin: 'e8c0a0', hair: 'spiky 6a1a2a', face: ['mask'], wear: 'open 4a3a3a 8a2a3a 2a2a3a', eyes: 'angry' }
const PUDDING: FigureCard = { fig: 'slim', skin: 'f8dcc8', hair: 'braids 6a3a2a', wear: 'dress f080a8 f4f0e8' }
const PEROSPERO: FigureCard = { fig: 'slim', skin: 'f0d0b0', hair: 'short 3a2a5a', hat: 'tophat 6a3a8a', wear: 'coat 6a3a8a f080b0', prop: 'staff f05a7a', mouth: 'grin' }
const SOGEKING: FigureCard = { fig: 'slim', skin: 'd8a830', hair: 'wild 1c1418', face: ['nose'], wear: 'shirt e8d8b0 8a5a30 6a4a30', cape: 'c82a3a' }

const SPECS: readonly KitSpec[] = [
  // ── Rot ──
  { id: 'op03-001', print: { life: 5, power: 5000, type: 'Whitebeard-Bande' }, art: { ...ACE, pose: 'cross', x: ['aura'] } },
  { id: 'op03-002', print: { cost: 1, power: 2000, counter: 1000, type: 'Land Wano/Whitebeard-Bande' },
    art: { fig: 'slim', skin: 'f8ece4', hair: 'bun 1c1a24', wear: 'kimono f0a0c0 c83a5a', prop: 'pistols', pose: 'action', eyes: 'narrow' } },
  { id: 'op03-003', print: { cost: 1, power: 2000, counter: 1000, type: 'Whitebeard-Bande' },
    art: { fig: 'normal', hair: 'slick 6a4a2a', face: ['scar'], wear: 'coat f4f0e8 3a3a4a 3a3a4a', prop: 'orb 7a3ab0', mouth: 'grin', v: 1 } },
  { id: 'op03-004', print: { cost: 4, power: 6000, type: 'Whitebeard-Bande' },
    art: { fig: 'giant', skin: 'd8a070', hair: 'wild 1c1a24', hat: 'bandana b83a5a', face: ['beard'], wear: 'open 2a2a3a b83a5a 3a3a4a', prop: 'orb c82a3a', mouth: 'fang', x: ['aura'], v: 1 } },
  { id: 'op03-005', print: { cost: 5, power: 6000, counter: 1000, type: 'Whitebeard-Bande' }, art: { ...MARCO, pose: 'cast', v: 1 } },
  { id: 'op03-006', print: { cost: 3, power: 5000, type: 'Marine' }, art: { ...GARP, prop: 'orb 3a3a4a', pose: 'action' } },
  { id: 'op03-007', print: { cost: 7, type: 'Whitebeard-Bande' }, text: '[Main] Mit Ace: K.O. bis 8000, Leader +3000.', art: { obj: 'fireball', s: 1.3, x: ['rays', 'glow'] } },
  { id: 'op03-008', print: { cost: 3, type: 'Whitebeard-Bande' }, text: '[Main] Event abwerfen: K.O. bis 5000 und bis 4000.',
    art: { obj: 'fist', c: 'f0a020 f05a20', x: ['flames', 'streak'] } },

  // ── Grün ──
  { id: 'op03-009', print: { life: 5, power: 5000, type: 'East Blue/Black-Cat-Piraten' }, art: KURO },
  { id: 'op03-010', print: { life: 4, power: 5000, type: 'Fischmensch/East Blue/Arlong-Piraten' }, art: { ...ARLONG, pose: 'cross' } },
  { id: 'op03-011', print: { cost: 1, power: 3000, counter: 1000, type: 'East Blue/Alvida-Piraten' },
    art: { fig: 'slim', hair: 'long 1c1a24', hat: 'wide f4f4f0', wear: 'dress f4f0f4 d83a5a', prop: 'club', eyes: 'narrow', x: ['aura'] } },
  { id: 'op03-012', print: { cost: 4, power: 5000, counter: 1000, type: 'East Blue/Krieg-Piraten' },
    art: { fig: 'slim', skin: 'e0c8b0', hair: 'short 1c1a24', hat: 'bandana 2a2a3a', wear: 'open 3a3a4a 2a2a3a 3a3a4a', prop: 'club 3a3a4a', prop2: 'club 3a3a4a', pose: 'action', eyes: 'angry', v: 1 } },
  { id: 'op03-013', print: { cost: 6, power: 7000, type: 'East Blue/Krieg-Piraten' },
    art: { fig: 'giant', skin: 'e0b090', hair: 'short 1c1a24', wear: 'armour d8a830 3a3a4a 3a3a4a', prop: 'spear', pose: 'action', eyes: 'angry', mouth: 'fang', v: 1 } },
  { id: 'op03-014', print: { cost: 4, power: 3000, counter: 1000, type: 'Fischmensch/East Blue/Arlong-Piraten' },
    art: { fig: 'broad', skin: '8a9ab0', hair: 'bald', wear: 'kimono f4f0e8 4aa8e8 3a3a4a', prop: 'fists', pose: 'action', eyes: 'angry' } },
  { id: 'op03-015', print: { cost: 5, power: 6000, type: 'East Blue/Black-Cat-Piraten' },
    art: { fig: 'slim', skin: 'e8b890', hair: 'short 1c1a24', face: ['shades'], wear: 'coat 3a5ab0 f0d040 2a2a3a', prop: 'orb e8c040', pose: 'action', mouth: 'grin' } },
  { id: 'op03-016', print: { cost: 4, power: 3000, counter: 1000, type: 'Fischmensch/East Blue/Arlong-Piraten' },
    art: { fig: 'broad', skin: '6ab0a8', hair: 'short 2a2a3a', wear: 'open e8d8c0 3a6a8a 3a3a4a', prop: 'orb 6ac8f0', mouth: 'open', eyes: 'narrow', v: 1 } },
  { id: 'op03-017', print: { cost: 2, power: 2000, counter: 1000, type: 'East Blue/Arlong-Piraten' }, art: { ...NAMI, hat: 'straw', eyes: 'closed', mouth: 'open', v: 1 } },
  { id: 'op03-018', print: { cost: 2, power: 2000, counter: 1000, type: 'East Blue/Krieg-Piraten' },
    art: { fig: 'giant', hair: 'bald', wear: 'armour e8e4f0 f07020 3a3a4a', prop: 'shield f4f0e8', mouth: 'open', x: ['aura'] } },
  { id: 'op03-019', print: { cost: 3, power: 5000, type: 'East Blue/Buggy-Piraten' }, art: { ...BUGGY, prop: 'orb 2a2a3a', v: 1 } },
  { id: 'op03-020', print: { cost: 4, power: 4000, counter: 2000, type: 'Fischmensch/East Blue/Arlong-Piraten' },
    art: { fig: 'giant', skin: 'f08a8a', hair: 'short 1c1a24', wear: 'shirt f0d040 3a8a5a 3a3a4a', prop: 'katana2', mouth: 'grin' } },
  { id: 'op03-021', print: { cost: 1, type: 'East Blue/Black-Cat-Piraten' }, text: '[Main] 1 Gegner bis Kosten 1 ruht, 1 Charakter +1000.',
    art: { obj: 'vortex', c: '6a3ab0 e8c040', x: ['sparks'] } },

  // ── Blau ──
  { id: 'op03-022', print: { life: 5, power: 5000, type: 'East Blue' }, art: { ...NAMI, pose: 'cast', mouth: 'grin', v: 1 } },
  { id: 'op03-023', print: { cost: 4, power: 5000, type: 'East Blue' }, art: { ...USOPP, prop: 'slingshot', pose: 'action' } },
  { id: 'op03-024', print: { cost: 1, power: 0, counter: 1000, type: 'East Blue' },
    art: { fig: 'small', hair: 'short 6a4a2a', hat: 'helmet 9aa4b8', wear: 'shirt e8d8b0 3a6ab0 6a4a30', prop: 'sword b88450', mouth: 'open' } },
  { id: 'op03-025', print: { cost: 2, power: 0, counter: 1000, type: 'East Blue' },
    art: { fig: 'small', skin: 'e0b090', hair: 'afro 3a2a1a', face: ['beard'], wear: 'shirt e8c040 8a5a30 8a5a30', pose: 'cast', mouth: 'open' } },
  { id: 'op03-026', print: { cost: 1, power: 0, counter: 2000, type: 'East Blue' },
    art: { fig: 'slim', skin: 'f8e0d0', hair: 'long f0e0a0', wear: 'dress f4f0f8 8ab0e0', pose: 'cast' } },
  { id: 'op03-027', print: { cost: 2, power: 4000, counter: 1000, type: 'East Blue' },
    art: { fig: 'normal', skin: 'e8b890', hair: 'short 4a4a5a', hat: 'cap 3a5a8a', face: ['scar', 'moustache'], wear: 'coat 3a5a8a f0d040 3a3a4a', prop: 'pistol', mouth: 'flat' } },
  { id: 'op03-028', print: { cost: 5, power: 6000, counter: 1000, type: 'East Blue' },
    art: { fig: 'broad', hair: 'short f0e8c0', hat: 'tophat f4f4f4', face: ['moustache'], wear: 'coat f4f0e8 1c1a24 3a3a4a', pose: 'action', v: 1 } },
  { id: 'op03-029', print: { cost: 2, power: 0, counter: 1000, type: 'East Blue' },
    art: { fig: 'slim', skin: 'c88a5a', hair: 'short 3a6ab0', wear: 'shirt f0e8d8 3a8a5a 3a5a9a', prop: 'orb f0902a' } },
  { id: 'op03-030', print: { cost: 4, power: 5000, counter: 1000, type: 'East Blue/Ex-Marine' },
    art: { fig: 'normal', hair: 'mohawk f05a7a', wear: 'shirt f4e8d0 3a6a3a 3a5a9a', prop: 'rifle', v: 1 } },
  { id: 'op03-031', print: { cost: 1, power: 3000, counter: 1000, type: 'East Blue' },
    art: { fig: 'normal', skin: 'f0e0d0', hair: 'afro f4f0e8', wear: 'suit 1c1a24 f4f0e8', eyes: 'closed' } },
  { id: 'op03-032', print: { cost: 1, power: 3000, type: 'East Blue' },
    art: { fig: 'normal', hair: 'short 1c1a24', hat: 'bandana 3a8a5a', face: ['shades'], wear: 'open f4f0e8 3a3a4a 3a5a9a', prop: 'sword', pose: 'action' } },
  { id: 'op03-033', print: { cost: 3, type: 'East Blue' }, text: '[Main] Ziehe 2 Karten.', art: { obj: 'cup', c: 'f4f0e8 f0a040', x: ['smoke'] } },
  { id: 'op03-034', print: { cost: 4, type: 'East Blue/Strohhutbande' }, text: '[Main] 1 Charakter bis Kosten 5 unter sein Deck.',
    art: { obj: 'swords', c: 'c8d0e0 3a8a5a', x: ['streak'] } },

  // ── Lila ──
  { id: 'op03-035', print: { life: 5, power: 5000, type: 'Water Seven/Galley-La Company' }, art: { ...ICEBURG, pose: 'cross' } },
  { id: 'op03-036', print: { cost: 2, power: 4000, counter: 1000, type: 'Water Seven/Franky-Familie' },
    art: { fig: 'normal', hair: 'afro f080b0', face: ['shades'], wear: 'shirt 3a8ad8 f0d040 3a3a6a', pose: 'action', mouth: 'grin' } },
  { id: 'op03-037', print: { cost: 1, power: 2000, counter: 1000, type: 'Meermensch/Water Seven' },
    art: { fig: 'broad', hair: 'bun 6a4a8a', wear: 'dress 3a8ad8 f4f0e8 3a8ad8', prop: 'cup f0d040', eyes: 'closed', mouth: 'grin', v: 1 } },
  { id: 'op03-038', print: { cost: 2, power: 2000, counter: 1000, type: 'Tier/Water Seven' },
    art: { fig: 'small', hair: 'pony 1c1a24', hat: 'bunny f4f0e8', wear: 'dress f4f0e8 d83a3a', pose: 'cast', mouth: 'open' } },
  { id: 'op03-039', print: { cost: 5, power: 6000, type: 'Water Seven/Galley-La Company' },
    art: { fig: 'normal', hair: 'short f0d060', face: ['goggles'], wear: 'open 3a3a4a f0d040 3a5a9a', prop: 'staff c8a870', pose: 'action', mouth: 'grin' } },
  { id: 'op03-040', print: { cost: 6, power: 7000, type: 'Water Seven/Strohhutbande' }, art: { ...LUFFY, skin: 'f0a0a0', eyes: 'angry', x: ['aura'], v: 1 } },
  { id: 'op03-041', print: { cost: 0, type: 'Water Seven/Strohhutbande' }, text: '[Counter] Wirf 1 Handkarte ab: +3000.',
    art: { obj: 'fist', c: 'f0a0a0 d83030', x: ['streak', 'smoke'] } },

  // ── Schwarz ──
  { id: 'op03-042', print: { life: 5, power: 5000, type: 'CP9' }, art: LUCCI },
  { id: 'op03-043', print: { life: 4, power: 5000, type: 'Kaiser/Big-Mom-Piraten' }, art: { ...LINLIN, pose: 'cast' } },
  { id: 'op03-044', print: { cost: 8, power: 9000, type: 'Marine' }, art: { ...ISSHO, prop: 'katana', pose: 'cast', v: 1 } },
  { id: 'op03-045', print: { cost: 5, power: 5000, counter: 2000, type: 'Marine/Donquixote-Piraten' },
    art: { fig: 'normal', skin: 'e0b090', hair: 'short 1c1a24', face: ['shades'], wear: 'coat f4f4f0 2a2a3a 3a3a4a', prop: 'staff 6aa860', mouth: 'flat', v: 1 } },
  { id: 'op03-046', print: { cost: 5, power: 6000, counter: 1000, type: 'CP9' }, art: { ...KAKU, pose: 'action' } },
  { id: 'op03-047', print: { cost: 4, power: 4000, counter: 2000, type: 'CP9' }, art: { ...KALIFA, prop: 'staff 6a6a7a', prop2: 'orb e0f0ff', pose: 'action' } },
  { id: 'op03-048', print: { cost: 4, power: 6000, counter: 1000, type: 'CP9' },
    art: { fig: 'giant', skin: 'f4f0e8', hair: 'long f080b0', wear: 'kimono 6a3a8a f0d040 3a3a4a', prop: 'staff d8a830', pose: 'cast', eyes: 'angry', mouth: 'open', v: 1 } },
  { id: 'op03-049', print: { cost: 5, power: 7000, counter: 1000, type: 'CP9' },
    art: { fig: 'broad', skin: 'e0b090', hair: 'wild 6a5a4a', hat: 'fox', wear: 'coat 3a3a4a f4f0e8 3a3a4a', prop: 'fists', pose: 'action', eyes: 'angry', mouth: 'fang', v: 1 } },
  { id: 'op03-050', print: { cost: 1, power: 2000, counter: 1000, type: 'CP9' },
    art: { fig: 'slim', hair: 'short 9a5ab0', face: ['mask'], wear: 'suit f4f0e8 9a9aa8', prop: 'orb e8c040', v: 1 } },
  { id: 'op03-051', print: { cost: 3, power: 3000, counter: 1000, type: 'CP9' },
    art: { fig: 'broad', skin: 'e8c8a8', hair: 'bald', wear: 'suit 1c1a24 f4f0e8', pose: 'action', mouth: 'fang' } },
  { id: 'op03-052', print: { cost: 5, power: 6000, counter: 1000, type: 'CP9' },
    art: { fig: 'broad', skin: 'e0b090', hair: 'short 1c1a24', hat: 'horns 1c1a24', face: ['moustache'], wear: 'suit 1c1a24 f4f0e8', pose: 'action', v: 1 } },
  { id: 'op03-053', print: { cost: 6, power: 7000, type: 'CP9' },
    art: { ...LUCCI, skin: 'e8b040', hat: 'fox e8b040', wear: 'suit 1c1a24 e8b040', prop: 'fists', pose: 'action', eyes: 'angry', mouth: 'fang' } },
  { id: 'op03-054', print: { cost: 0, type: 'CP9' }, text: '[Counter] Wirf 1 Handkarte ab: +3000.', art: { obj: 'fist', c: 'e8c8a8 3a3a4a', x: ['glow', 'rays'] } },

  // ── Gelb ──
  { id: 'op03-055', print: { life: 5, power: 5000, type: 'Big-Mom-Piraten' }, art: { ...KATAKURI, prop: 'spear' } },
  { id: 'op03-056', print: { cost: 1, power: 3000, counter: 1000, type: 'Meermensch' },
    art: { fig: 'slim', hair: 'long 4ac878', wear: 'dress f8c0d0 f080b0 f080b0', pose: 'cast', mouth: 'open' } },
  { id: 'op03-057', print: { cost: 2, power: 3000, counter: 2000, type: 'Vinsmoke-Familie' },
    art: { fig: 'slim', hair: 'short f0d060', face: ['beard'], wear: 'suit f4f0e8 d83a5a', prop: 'orb f080b0', eyes: 'closed', mouth: 'open' } },
  { id: 'op03-058', print: { cost: 3, power: 3000, counter: 1000, type: 'Meermensch' },
    art: { fig: 'normal', hair: 'long 3a5ab0', wear: 'robe 6a3a8a f0d040 6a3a8a', prop: 'orb 9ae0f8', eyes: 'narrow', v: 1 } },
  { id: 'op03-059', print: { cost: 3, power: 4000, counter: 1000, type: 'Big-Mom-Piraten' },
    art: { fig: 'giant', skin: 'e8a878', hair: 'spiky f07030', face: ['beard'], wear: 'open 3a3a4a f05a2a 3a3a4a', prop: 'fists', eyes: 'angry', x: ['aura'] } },
  { id: 'op03-060', print: { cost: 4, power: 5000, counter: 1000, type: 'Big-Mom-Piraten' },
    art: { fig: 'giant', hair: 'spiky 8a3ab0', wear: 'armour d8a060 f0d8a0 a87040', prop: 'sword d8a060', prop2: 'shield d8a060', pose: 'action', eyes: 'angry' } },
  { id: 'op03-061', print: { cost: 4, power: 5000, counter: 1000, type: 'Big-Mom-Piraten' },
    art: { fig: 'slim', hair: 'long f4f0f8', wear: 'coat 3a3a4a f080b0 3a3a4a', prop: 'sword', prop2: 'cup f0a040', eyes: 'narrow', v: 1 } },
  { id: 'op03-062', print: { cost: 1, power: 2000, counter: 1000, type: 'Big-Mom-Piraten' }, art: PUDDING },
  { id: 'op03-063', print: { cost: 3, power: 5000, type: 'Big-Mom-Piraten' }, art: PEROSPERO },
  { id: 'op03-064', print: { cost: 10, power: 12000, type: 'Kaiser/Big-Mom-Piraten' }, art: { ...LINLIN, prop: 'sword', pose: 'cast', x: ['aura'], v: 1 } },
  { id: 'op03-065', print: { cost: 5, power: 0, counter: 1000, type: 'Meermensch' },
    art: { fig: 'giant', skin: 'f8e0e0', hair: 'long f080b0', hat: 'crown', wear: 'dress f8f0f8 f0d040 f0a0c8', eyes: 'closed', mouth: 'open' } },
  { id: 'op03-066', print: { cost: 3, power: 3000, counter: 1000, type: 'Big-Mom-Piraten/Homies' }, art: { obj: 'sword', c: 'c8d0e0 2a2a3a', x: ['glow'] } },
  { id: 'op03-067', print: { cost: 2, type: 'Big-Mom-Piraten' }, text: '[Main] Weniger Leben als Gegner: K.O. bis Kosten 4.',
    art: { obj: 'slash', c: 'f4ecd8 fff8f0', x: ['smoke'] } },

  // ── Secret Rares ──
  { id: 'op03-068', print: { cost: 7, power: 6000, counter: 1000, type: 'Sniper Island' }, art: { ...SOGEKING, prop: 'slingshot', pose: 'action', v: 1 } },
  { id: 'op03-069', print: { cost: 8, power: 8000, type: 'Big-Mom-Piraten' }, art: { ...KATAKURI, prop: 'fists', pose: 'action', eyes: 'glow', x: ['aura'], v: 1 } },

  // ── Alternatives ──
  { id: 'op03-070', print: { cost: 5, power: 6000, counter: 1000, type: 'Whitebeard-Bande' },
    art: { a: 'bird', c: '3a9ae8 2a6ad0 f0d040 f0d040', wings: 'bird', crest: 'flame', tail: 'flame', eyes: 'narrow', flip: true, scene: 'Wasser', v: 1 } },
  { id: 'op03-071', print: { life: 5, power: 5000, type: 'East Blue/Black-Cat-Piraten' }, art: { ...KURO, pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op03-072', print: { life: 4, power: 5000, type: 'Fischmensch/East Blue/Arlong-Piraten' }, art: { ...ARLONG, prop: 'greatsword', pose: 'action', scene: 'Blau' } },
  { id: 'op03-073', print: { cost: 4, power: 5000, type: 'East Blue' }, art: { ...USOPP, pose: 'cast', mouth: 'open', scene: 'Lila', v: 1 } },
  { id: 'op03-074', print: { life: 5, power: 5000, type: 'Water Seven/Galley-La Company' }, art: { ...ICEBURG, prop: 'book 3a6ab0', eyes: 'round', mouth: 'smile', scene: 'Rot' } },
  { id: 'op03-075', print: { life: 5, power: 5000, type: 'CP9' }, art: { ...LUCCI, pose: 'cast', scene: 'Order', v: 1 } },
  { id: 'op03-076', print: { life: 4, power: 5000, type: 'Kaiser/Big-Mom-Piraten' }, art: { ...LINLIN, prop: 'cup f4f0f8', scene: 'Gelb', v: 1 } },
  { id: 'op03-077', print: { cost: 8, power: 9000, type: 'Marine' }, art: { ...ISSHO, prop: 'cup 6a3a2a', scene: 'Feuer', v: 1 } },
  { id: 'op03-078', print: { cost: 5, power: 6000, counter: 1000, type: 'CP9' }, art: { ...KAKU, skin: 'f0c860', hat: 'horns c89030', pose: 'cast', v: 1 } },
  { id: 'op03-079', print: { cost: 4, power: 4000, counter: 2000, type: 'CP9' }, art: { ...KALIFA, prop: 'orb e0f0ff', prop2: 'orb f0e0ff', scene: 'Zauber', v: 1 } },
  { id: 'op03-080', print: { cost: 6, power: 7000, type: 'CP9' },
    art: { a: 'quad', c: 'e8b040 7a4a1a f8e8c0', pat: 'spots', ears: 'point', tail: 'plain', eyes: 'angry', mouth: 'fang', pose: 1, v: 1 } },
  { id: 'op03-081', print: { cost: 1, power: 2000, counter: 1000, type: 'Big-Mom-Piraten' }, art: { ...PUDDING, prop: 'orb 6a3a2a', eyes: 'closed', scene: 'Psycho' } },
  { id: 'op03-082', print: { cost: 3, power: 5000, type: 'Big-Mom-Piraten' }, art: { ...PEROSPERO, pose: 'cast', v: 1 } },
  { id: 'op03-083', print: { cost: 10, power: 12000, type: 'Kaiser/Big-Mom-Piraten' }, art: { ...LINLIN, pose: 'action', mouth: 'open', x: ['aura'], scene: 'Lila' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
