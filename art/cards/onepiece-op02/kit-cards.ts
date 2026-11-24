import type { FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { cost, power, life, counter, type } (frame: art/frames/onepiece.ts). Cost, power and
 * life as in docs/sets/onepiece-op02.md; counter and type from the official English card data, types in
 * German. Event texts are short German versions of the card effects (three lines). Alternative cards
 * reuse the look of their base card with another pose and scene.
 */
const WHITEBEARD: FigureCard = { fig: 'giant', skin: 'e0a070', hair: 'short f4f0e8', hat: 'bandana 2a2a36', face: ['moustache'], wear: 'bare e0a070 3a3a6a 2a2a3a', cape: 'f4f0e8', prop: 'spear', eyes: 'narrow' }
const GARP: FigureCard = { fig: 'broad', skin: 'e0a878', hair: 'short e8e8e8', face: ['beard', 'scar'], wear: 'coat f4f4f0 2a2a3a 3a4a6a', prop: 'fists', eyes: 'angry', mouth: 'grin' }
const ACE: FigureCard = { fig: 'slim', hair: 'wild 1c1418', hat: 'wide f08a20', wear: 'bare f1b688 f0a020 2a2a3a', prop: 'fists', mouth: 'grin' }
const MARCO: FigureCard = { fig: 'slim', hair: 'spiky f0d060', wear: 'open 6a4ab0 3ab0f0 3a3a6a', x: ['wings'], eyes: 'narrow' }
const SANJI: FigureCard = { fig: 'slim', hair: 'short f0d060', face: ['beard'], wear: 'suit 1c1a24 3a8ad8', pose: 'action' }
const ODEN: FigureCard = { fig: 'giant', hair: 'bun 1c1a24', face: ['beard'], wear: 'kimono f0e8d8 2f7a4a 4a3a2a', mouth: 'grin' }
const NAMI: FigureCard = { fig: 'slim', skin: 'f8c8a0', hair: 'long f08030', wear: 'shirt f8f8f8 3a6ab0 3a6ab0', prop: 'staff 4a8ad8' }
const LUFFY: FigureCard = { fig: 'slim', hair: 'short 1c1418', hat: 'straw', face: ['scar'], wear: 'open d83030 d83030 2a5ab0', prop: 'fists', pose: 'action', mouth: 'grin' }
const IVANKOV: FigureCard = { fig: 'broad', skin: 'f0c8b0', hair: 'afro 7a3ab0', wear: 'coat 2a2a3a f080b0 3a2a4a', cape: 'd83a5a', mouth: 'grin' }
const BUGGY: FigureCard = { fig: 'normal', skin: 'f4ece0', hair: 'long 3a8ad8', hat: 'tricorn', wear: 'coat d83a3a f0d040 3a3a6a', mouth: 'grin' }
const HANCOCK: FigureCard = { fig: 'slim', skin: 'f8d8c0', hair: 'long 1c1a24', wear: 'dress d8304a f0c040', cape: 'f4f0f4', eyes: 'narrow' }
const MAGELLAN: FigureCard = { fig: 'giant', skin: 'd8b090', hair: 'short 1c1a24', hat: 'horns 3a2a4a', wear: 'coat 3a2a4a 9a4ae0 2a2a3a', cape: '5a2a6a', eyes: 'angry', mouth: 'fang' }
const SMOKER: FigureCard = { fig: 'broad', skin: 'e0b090', hair: 'short f0f0f0', wear: 'open f0ece0 4a4a5a 3a4a6a', prop: 'staff 6a6a7a', eyes: 'angry', mouth: 'flat' }
const SAKAZUKI: FigureCard = { fig: 'giant', skin: 'e0a878', hair: 'short 1c1a24', hat: 'cap f4f4f0', wear: 'suit d83a3a f05a2a 9a2a2a', cape: 'f4f4f0', prop: 'fists', eyes: 'angry', mouth: 'flat' }
const TASHIGI: FigureCard = { fig: 'slim', hair: 'short 1c1a24', face: ['glasses'], wear: 'coat f4f4f0 f0a0b8 3a5a9a', prop: 'katana' }
const ROSINANTE: FigureCard = { fig: 'slim', skin: 'f4e0d0', hair: 'short f0d060', hat: 'hood 1c1a24', wear: 'coat 1c1a24 f4f0e8 3a3a4a', cape: '1c1a24', mouth: 'grin' }
const BORSALINO: FigureCard = { fig: 'slim', skin: 'e8c0a0', hair: 'short 1c1a24', face: ['shades'], wear: 'suit f0d040 1c1a24 d8b030', cape: 'f4f4f0', mouth: 'open' }

const SPECS: readonly KitSpec[] = [
  // ── Rot ──
  { id: 'op02-001', print: { life: 6, power: 6000, type: 'Kaiser/Whitebeard-Bande' }, art: WHITEBEARD },
  { id: 'op02-002', print: { life: 4, power: 5000, type: 'Marine' }, art: GARP },
  { id: 'op02-003', print: { cost: 9, power: 10000, type: 'Kaiser/Whitebeard-Bande' },
    art: { ...WHITEBEARD, wear: 'bare e0a070 8ad8f0 2a2a3a', prop: 'fists', pose: 'action', eyes: 'angry', x: ['aura'] } },
  { id: 'op02-004', print: { cost: 2, power: 3000, counter: 1000, type: 'Bergbanditen' },
    art: { fig: 'broad', skin: 'e8b890', hair: 'afro e07a30', wear: 'shirt 7a6a9a e8c040 3a3a4a', prop: 'club', mouth: 'grin', v: 1 } },
  { id: 'op02-005', print: { cost: 4, power: 4000, counter: 2000, type: 'Whitebeard-Bande' },
    art: { fig: 'giant', skin: 'bfe0f0', hair: 'bald 3a2a1a', face: ['moustache'], wear: 'open 4a7a5a e8d8a0 3a3a4a', pose: 'cast', eyes: 'angry' } },
  { id: 'op02-006', print: { cost: 3, power: 5000, type: 'Whitebeard-Allianz' },
    art: { fig: 'normal', hair: 'long 5a3a2a', wear: 'open f0e8d8 3a6ab0 3a3a4a', prop: 'greatsword', pose: 'action', eyes: 'angry' } },
  { id: 'op02-007', print: { cost: 3, power: 3000, counter: 1000, type: 'Whitebeard-Bande' },
    art: { fig: 'normal', skin: 'e0a878', hair: 'short 1c1a24', hat: 'tophat 1c1a24', face: ['moustache'], wear: 'suit f4f0e8 d83a5a 3a3a4a', prop: 'sword', prop2: 'sword', pose: 'action' } },
  { id: 'op02-008', print: { cost: 7, power: 7000, type: 'Whitebeard-Bande' }, art: { ...ACE, pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op02-009', print: { cost: 1, power: 0, counter: 2000, type: 'Windmühlendorf' },
    art: { fig: 'slim', hair: 'long 2a5a3a', hat: 'bandana 9ad8a8', wear: 'dress f0e8d8 6aa86a', prop: 'cup f4f0e8', v: 1 } },
  { id: 'op02-010', print: { cost: 2, power: 3000, counter: 2000, type: 'Spade-Piraten' },
    art: { fig: 'slim', hair: 'short 4a3a2a', hat: 'cap 3a3a4a', face: ['blindfold'], wear: 'coat 3a4a6a 1c1a24 3a3a4a', prop: 'book f0e8d8', prop2: 'pistol' } },
  { id: 'op02-011', print: { cost: 4, power: 5000, counter: 1000, type: 'Whitebeard-Bande' }, art: { ...MARCO, pose: 'action', x: ['wings', 'aura'] } },
  { id: 'op02-012', print: { cost: 1, type: 'Kaiser/Whitebeard-Bande' }, text: '[Main] K.O. 1 Gegner bis 3000, nur mit Whitebeard.',
    art: { obj: 'fist', c: 'e0a070 8ad8f0', x: ['bolts', 'streak'] } },
  { id: 'op02-013', print: { cost: 1, type: 'Kaiser/Whitebeard-Bande' }, text: '[Main] Bis 3 Leben: diesen Zug kein Leben auf die Hand.',
    art: { obj: 'hand', c: 'e0a070 f08a20', x: ['smoke', 'sparks'], v: 1 } },

  // ── Grün ──
  { id: 'op02-014', print: { life: 5, power: 5000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'normal', hair: 'bun 1c1a24', face: ['moustache'], wear: 'kimono b83a2a 4ac878 3a2a2a', prop: 'katana2', pose: 'action', eyes: 'angry', x: ['aura'], v: 1 } },
  { id: 'op02-015', print: { life: 4, power: 5000, type: 'Strohhutbande' }, art: { ...SANJI, eyes: 'narrow' } },
  { id: 'op02-016', print: { cost: 3, power: 5000, counter: 1000, type: 'FILM/Strohhutbande' },
    art: { fig: 'slim', skin: 'c08850', hair: 'wild 1c1418', face: ['nose', 'goggles'], wear: 'shirt f0c040 3a8a5a 2a2a3a', prop: 'slingshot', pose: 'action', v: 1 } },
  { id: 'op02-017', print: { cost: 5, power: 5000, counter: 2000, type: 'Minks' },
    art: { fig: 'small', skin: 'f8e4d8', hair: 'short f4e8a0', hat: 'bunny f4f0ec', wear: 'dress f0708a f8e040', prop: 'spear', pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op02-018', print: { cost: 8, power: 8000, type: 'Land Wano/Kouzuki-Clan' }, art: { ...ODEN, prop: 'katana2', pose: 'cast' } },
  { id: 'op02-019', print: { cost: 1, power: 0, counter: 1000, type: 'Land Wano/Kouzuki-Clan' },
    art: { fig: 'slim', skin: 'f8e4d8', hair: 'long 3a2a5a', wear: 'kimono f0d8e8 c83a6a', prop: 'orb e8d8a0', eyes: 'closed', v: 1 } },
  { id: 'op02-020', print: { cost: 2, power: 4000, counter: 1000, type: 'FILM/Fischmensch/Strohhutbande' },
    art: { fig: 'giant', skin: '4a7ac8', hair: 'pony 1c1a24', wear: 'shirt f04a3a f0d040 3a3a6a', pose: 'cross', v: 1 } },
  { id: 'op02-021', print: { cost: 2, power: 2000, counter: 2000, type: 'FILM/Tier/Strohhutbande' },
    art: { fig: 'small', skin: 'a8683a', hat: 'tophat f080a8', wear: 'bare a8683a a8683a 3a5ab0', prop: 'staff 4ae0f0', prop2: 'staff f04ab0', pose: 'cast', mouth: 'open', v: 1 } },
  { id: 'op02-022', print: { cost: 2, power: 3000, counter: 1000, type: 'FILM/Supernovae/Heart-Piraten' },
    art: { fig: 'slim', skin: 'e0b088', hair: 'short 1c1a24', hat: 'cap f0ece0', face: ['beard'], wear: 'coat 1c1a24 e8c040 3a4a7a', prop: 'katana 6a6a7a', eyes: 'narrow' } },
  { id: 'op02-023', print: { cost: 3, power: 5000, type: 'FILM/Strohhutbande' }, art: { ...NAMI, pose: 'cast', mouth: 'grin', x: ['aura'], v: 1 } },
  { id: 'op02-024', print: { cost: 3, power: 4000, counter: 1000, type: 'FILM/Strohhutbande' },
    art: { fig: 'slim', skin: 'e8b890', hair: 'long 1c1a24', hat: 'wide f4f0e8', wear: 'dress 5a3a8a d84a8a 2a2a3a', pose: 'cross', eyes: 'narrow' } },
  { id: 'op02-025', print: { cost: 5, power: 7000, counter: 1000, type: 'FILM/Strohhutbande' },
    art: { fig: 'broad', skin: 'e0a878', hair: 'slick 3a8ad8', face: ['shades'], wear: 'open f0d040 e8504a 3a5ab0', prop: 'fists', pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op02-026', print: { cost: 4, power: 5000, counter: 1000, type: 'FILM/Strohhutbande' },
    art: { fig: 'slim', skin: 'f0ece0', hair: 'afro 1c1a24', hat: 'tophat 1c1a24', wear: 'suit 1c1a24 d83a5a', prop: 'axe d83a5a', pose: 'action', mouth: 'grin' } },
  { id: 'op02-027', print: { cost: 7, power: 7000, type: 'FILM/Supernovae/Strohhutbande' }, art: { ...LUFFY, wear: 'open f4f0e8 d83030 2a5ab0', pose: 'cast', v: 1 } },
  { id: 'op02-028', print: { cost: 4, power: 6000, type: 'Land Wano' },
    art: { fig: 'slim', hair: 'long f4f4f8', hat: 'horns d83a3a', wear: 'kimono f4f0e8 c83a5a 3a3a5a', prop: 'club', pose: 'cast', mouth: 'grin', v: 1 } },
  { id: 'op02-029', print: { cost: 4, power: 6000, counter: 1000, type: 'FILM/Supernovae/Strohhutbande' },
    art: { fig: 'normal', skin: 'e0a070', hair: 'short 3a9a4a', face: ['scar'], wear: 'kimono 2f6b3a b02428 1c1a24', prop: 'katana3', pose: 'cross', eyes: 'closed', mouth: 'flat', v: 1 } },
  { id: 'op02-030', print: { cost: 3, type: 'FILM/Supernovae/Strohhutbande' }, text: '[Counter] +6000, spiele 1 Charakter bis Kosten 3.',
    art: { obj: 'slash', c: '6ae08a e0ffe8', x: ['smoke'] } },

  // ── Blau ──
  { id: 'op02-031', print: { life: 5, power: 5000, type: 'Impel Down/Revolutionsarmee' }, art: { ...IVANKOV, pose: 'cast', v: 1 } },
  { id: 'op02-032', print: { cost: 7, power: 7000, type: 'Impel Down/Revolutionsarmee' }, art: { ...IVANKOV, prop: 'fists', pose: 'action', x: ['aura'] } },
  { id: 'op02-033', print: { cost: 5, power: 7000, counter: 1000, type: 'Impel Down/Ex-Baroque Works' },
    art: { fig: 'normal', skin: 'e8b890', hair: 'slick 1c1a24', face: ['scar'], wear: 'shirt e8e4d8 1c1a24 3a3a4a', prop: 'scythe d8a830', eyes: 'narrow', v: 1 } },
  { id: 'op02-034', print: { cost: 4, power: 6000, counter: 1000, type: 'Samurai der Meere/Thriller-Bark-Bande' },
    art: { fig: 'giant', skin: 'd8d0e0', hair: 'spiky 4a3a5a', hat: 'horns 8a8a9a', wear: 'coat 2a2a3a 6a3a8a', x: ['wings'], pose: 'cast', mouth: 'grin', eyes: 'angry' } },
  { id: 'op02-035', print: { cost: 6, power: 8000, counter: 1000, type: 'Samurai der Meere' },
    art: { fig: 'slim', hair: 'slick 1c1a24', hat: 'wide 2a2430', face: ['moustache'], wear: 'coat 2a2430 e8c040', prop: 'greatsword 1c1a24', pose: 'action', eyes: 'glow' } },
  { id: 'op02-036', print: { cost: 1, power: 2000, type: 'Samurai der Meere/Donquixote-Piraten' },
    art: { fig: 'giant', hair: 'short f0d060', face: ['shades'], wear: 'coat f07ab0 f8f0f4 e8a868', cape: 'f07ab0', pose: 'action', mouth: 'grin', v: 1 } },
  { id: 'op02-037', print: { cost: 3, power: 3000, counter: 1000, type: 'Samurai der Meere/Revolutionsarmee' },
    art: { fig: 'giant', hair: 'short 1c1a24', hat: 'fox', face: ['glasses'], wear: 'coat 2a2a3a 8a6a4a', prop: 'book 8a3a2a', prop2: 'orb f0b0c8', pose: 'action', v: 1 } },
  { id: 'op02-038', print: { cost: 1, power: 2000, counter: 1000, type: 'Impel Down/Buggy-Piraten' }, art: { ...BUGGY, pose: 'cast' } },
  { id: 'op02-039', print: { cost: 4, power: 5000, counter: 1000, type: 'Impel Down/Samurai der Meere/Kuja-Piraten' }, art: { ...HANCOCK, pose: 'cross' } },
  { id: 'op02-040', print: { cost: 6, power: 7000, type: 'Impel Down/Strohhutbande' }, art: { ...LUFFY, eyes: 'angry', x: ['aura'], v: 1 } },
  { id: 'op02-041', print: { cost: 1, power: 1000, counter: 1000, type: 'Impel Down/Ex-Baroque Works' },
    art: { fig: 'broad', skin: 'b87a50', hair: 'bald', face: ['shades'], wear: 'shirt e8e4d8 c8a040 3a3a4a', prop: 'sword', prop2: 'sword', eyes: 'angry', v: 1 } },
  { id: 'op02-042', print: { cost: 5, power: 5000, counter: 2000, type: 'Impel Down/Ex-Baroque Works' },
    art: { fig: 'slim', hair: 'short 1c1a24', wear: 'coat f080b0 f4f4f8 3a5ab0', x: ['wings'], pose: 'cast', eyes: 'closed', mouth: 'grin', v: 1 } },
  { id: 'op02-043', print: { cost: 4, power: 5000, counter: 1000, type: 'Impel Down/Ex-Baroque Works' },
    art: { fig: 'slim', hair: 'bun 1c1a24', face: ['glasses'], wear: 'shirt f4f0e8 3a5ab0 2a2a3a', prop: 'orb f4ecd8', mouth: 'grin', v: 1 } },
  { id: 'op02-044', print: { cost: 3, type: 'Impel Down/Revolutionsarmee' }, text: '[Counter] +6000, dann ziehe, bis du 2 Handkarten hast.',
    art: { obj: 'eye', c: '7a3ab0 f0ecf4', x: ['streak'] } },

  // ── Lila ──
  { id: 'op02-045', print: { life: 5, power: 5000, type: 'Impel Down' }, art: MAGELLAN },
  { id: 'op02-046', print: { life: 4, power: 5000, type: 'FILM/Neo-Marine' },
    art: { fig: 'broad', skin: 'e0b090', hair: 'short 9a6ac8', face: ['shades'], wear: 'coat 2a2a3a 9a6ac8 2a2a3a', prop: 'launcher 6a6a7a', pose: 'action', mouth: 'flat' } },
  { id: 'op02-047', print: { cost: 3, power: 3000, counter: 2000, type: 'Impel Down' },
    art: { fig: 'slim', skin: 'e8b890', hair: 'long f0d060', hat: 'horns 2a2a3a', wear: 'suit 2a2a3a d83a5a', prop: 'staff 2a2a3a', pose: 'action', eyes: 'narrow', mouth: 'grin', v: 1 } },
  { id: 'op02-048', print: { cost: 2, power: 3000, counter: 2000, type: 'FILM/Goldlöwen-Piraten' },
    art: { fig: 'normal', hair: 'long f0d060', face: ['beard'], wear: 'coat 3a3a4a d8a830 9aa4b8', cape: 'f4f0e8', prop: 'sword', pose: 'cast', mouth: 'grin' } },
  { id: 'op02-049', print: { cost: 4, power: 5000, counter: 1000, type: 'Impel Down' },
    art: { fig: 'slim', skin: 'e8c8b0', hair: 'long 1c1a24', wear: 'suit 2a2a3a 6a6a7a', prop: 'katana 9a9aa8', eyes: 'narrow', mouth: 'flat', v: 1 } },
  { id: 'op02-050', print: { cost: 8, power: 8000, type: 'World-Piraten' },
    art: { fig: 'giant', skin: 'd8a878', hair: 'mohawk 6a3a8a', wear: 'bare d8a878 e8c040 3a3a4a', pose: 'cast', mouth: 'grin', eyes: 'angry', x: ['aura'] } },
  { id: 'op02-051', print: { cost: 1, power: 2000, counter: 1000, type: 'Impel Down' },
    art: { fig: 'normal', skin: 'b8805a', hat: 'hood e8c040', wear: 'coat 3a3a4a e8c040', prop: 'spear', mouth: 'grin', eyes: 'narrow' } },
  { id: 'op02-052', print: { cost: 5, power: 6000, type: 'Impel Down' }, art: { ...MAGELLAN, prop: 'orb 9a4ae0', pose: 'cast', x: ['aura'], v: 1 } },
  { id: 'op02-053', print: { cost: 2, type: 'Impel Down' }, text: '[Counter] DON!! -1: 2 Gegner erhalten -3000.',
    art: { obj: 'smoke', c: '9a4ae0 4a2a6a', x: ['glow'], v: 1 } },

  // ── Schwarz ──
  { id: 'op02-054', print: { life: 5, power: 5000, type: 'Marine' }, art: SMOKER },
  { id: 'op02-055', print: { cost: 3, power: 4000, counter: 1000, type: 'Marine' },
    art: { fig: 'slim', hair: 'short f080a8', wear: 'coat f4f4f0 3a5ab0 3a5a9a', pose: 'cast', eyes: 'closed', mouth: 'open' } },
  { id: 'op02-056', print: { cost: 6, power: 7000, type: 'Marine' }, art: { ...SAKAZUKI, pose: 'action' } },
  { id: 'op02-057', print: { cost: 3, power: 4000, counter: 1000, type: 'Marine' }, art: { ...SMOKER, pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op02-058', print: { cost: 2, power: 3000, counter: 2000, type: 'Marine' },
    art: { fig: 'giant', hair: 'short 1c1a24', hat: 'cap f4f4f0', face: ['beard', 'glasses'], wear: 'coat f4f4f0 3a3a4a 3a3a4a', pose: 'cross', mouth: 'flat' } },
  { id: 'op02-059', print: { cost: 3, power: 5000, type: 'Marine' }, art: { ...TASHIGI, pose: 'action', eyes: 'angry' } },
  { id: 'op02-060', print: { cost: 2, power: 2000, counter: 1000, type: 'Marine/Donquixote-Piraten' }, art: { ...ROSINANTE, pose: 'action', x: ['aura'] } },
  { id: 'op02-061', print: { cost: 4, power: 6000, counter: 1000, type: 'Riese/Marine' },
    art: { fig: 'giant', skin: 'e0a878', hair: 'short 6a4a3a', face: ['beard'], wear: 'coat f4f4f0 3a5a9a 3a3a4a', mouth: 'grin', eyes: 'closed' } },
  { id: 'op02-062', print: { cost: 5, power: 6000, counter: 1000, type: 'Marine' },
    art: { fig: 'slim', hair: 'long f080b0', wear: 'coat f4f4f0 3a3a4a 2a2a3a', pose: 'cross', eyes: 'narrow', mouth: 'flat' } },
  { id: 'op02-063', print: { cost: 1, power: 1000, counter: 1000, type: 'Marine' },
    art: { fig: 'normal', hair: 'mohawk f05a7a', wear: 'coat f4f4f0 3a5ab0 3a3a4a', mouth: 'grin' } },
  { id: 'op02-064', print: { cost: 4, power: 5000, counter: 1000, type: 'Marine' }, art: { ...BORSALINO, pose: 'action', x: ['aura'] } },
  { id: 'op02-065', print: { cost: 2, power: 3000, counter: 2000, type: 'Marine' }, art: { ...GARP, pose: 'action' } },
  { id: 'op02-066', print: { cost: 1, type: 'Marine' }, text: '[Main] 1 Gegner erhält in diesem Zug -5 Kosten.', art: { obj: 'crystal', c: 'a8d8f0 f0f8ff', x: ['rays'] } },
  { id: 'op02-067', print: { cost: 2, type: 'Marine' }, text: '[Main] K.O. 1 Gegner bis Kosten 1.', art: { obj: 'fireball', c: 'e8401a f8b040', n: 3, x: ['streak'], v: 1 } },

  // ── Secret Rares ──
  { id: 'op02-068', print: { cost: 8, power: 8000, type: 'FILM' },
    art: { fig: 'slim', skin: 'f8dcc8', hair: 'long e8505a', wear: 'dress f4f4f8 4a5ab0', pose: 'action', eyes: 'closed', mouth: 'open', x: ['aura'], v: 1 } },
  { id: 'op02-069', print: { cost: 10, power: 10000, type: 'Ex-Marine' },
    art: { fig: 'normal', skin: 'b8805a', hair: 'short 1c1a24', hat: 'bandana 3a6ab0', wear: 'coat f4f4f0 3a6ab0 3a3a5a', eyes: 'narrow', mouth: 'flat', x: ['aura'], v: 1 } },

  // ── Alternatives ──
  { id: 'op02-070', print: { cost: 9, power: 10000, type: 'Kaiser/Whitebeard-Bande' }, art: { ...WHITEBEARD, pose: 'cast', eyes: 'angry', x: ['aura'], v: 1 } },
  { id: 'op02-071', print: { cost: 4, power: 5000, counter: 1000, type: 'Whitebeard-Bande' },
    art: { a: 'bird', c: '3a9ae8 2a6ad0 f0d040 f0d040', wings: 'bird', crest: 'flame', tail: 'flame', eyes: 'narrow', pose: 1, v: 1 } },
  { id: 'op02-072', print: { life: 4, power: 5000, type: 'Strohhutbande' }, art: { ...SANJI, wear: 'suit 1c1a24 f07020', prop: 'fists', x: ['aura'], v: 1 } },
  { id: 'op02-073', print: { cost: 8, power: 8000, type: 'Land Wano/Kouzuki-Clan' }, art: { ...ODEN, pose: 'cast', x: ['aura'], scene: 'Feuer', v: 1 } },
  { id: 'op02-074', print: { cost: 3, power: 5000, type: 'FILM/Strohhutbande' }, art: { ...NAMI, prop: 'orb f0902a', prop2: 'orb 8ad8f8', pose: 'action', mouth: 'grin', scene: 'Rot' } },
  { id: 'op02-075', print: { cost: 7, power: 7000, type: 'FILM/Supernovae/Strohhutbande' }, art: { ...LUFFY, wear: 'open f4f0e8 d83030 2a5ab0', scene: 'Psycho', v: 1 } },
  { id: 'op02-076', print: { cost: 1, power: 2000, counter: 1000, type: 'Impel Down/Buggy-Piraten' }, art: { ...BUGGY, x: ['aura'], v: 1 } },
  { id: 'op02-077', print: { cost: 4, power: 5000, counter: 1000, type: 'Impel Down/Samurai der Meere/Kuja-Piraten' }, art: { ...HANCOCK, pose: 'cast', scene: 'Grün', v: 1 } },
  { id: 'op02-078', print: { cost: 6, power: 7000, type: 'Impel Down/Strohhutbande' }, art: { ...LUFFY, pose: 'cast', scene: 'Lila' } },
  { id: 'op02-079', print: { cost: 6, power: 7000, type: 'Marine' }, art: { ...SAKAZUKI, pose: 'cast', x: ['aura'], scene: 'Feuer', v: 1 } },
  { id: 'op02-080', print: { cost: 3, power: 5000, type: 'Marine' }, art: { ...TASHIGI, eyes: 'closed', v: 1 } },
  { id: 'op02-081', print: { cost: 2, power: 2000, counter: 1000, type: 'Marine/Donquixote-Piraten' }, art: { ...ROSINANTE, prop: 'orb f4f0f8', mouth: 'smile', v: 1 } },
  { id: 'op02-082', print: { cost: 4, power: 5000, counter: 1000, type: 'Marine' }, art: { ...BORSALINO, pose: 'cast', x: ['aura'], scene: 'Gelb' } },
  { id: 'op02-083', print: { cost: 2, power: 3000, counter: 2000, type: 'Marine' }, art: { ...GARP, prop: 'orb 3a3a4a', pose: 'cast', v: 1 } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
