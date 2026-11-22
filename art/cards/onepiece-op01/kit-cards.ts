import type { FigureCard, KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { cost, power, life, counter, type } (frame: art/frames/onepiece.ts). Cost, power and
 * life as in docs/sets/onepiece-op01.md; counter and type from the official English card data, types in
 * German. The frame prints the whole type line, or its longest part that fits. Event texts are short
 * German versions of the card effects (three lines). Alternative cards reuse the look of their base
 * card with another pose, mood or scene.
 */
const LUFFY: FigureCard = { fig: 'slim', hair: 'short 1c1418', hat: 'straw', face: ['scar'], wear: 'open d83030 d83030 2a5ab0', prop: 'fists', pose: 'action', mouth: 'grin' }
const ZORO: FigureCard = { fig: 'normal', skin: 'e0a070', hair: 'short 3a9a4a', hat: 'bandana 1c1a24', face: ['scar'], wear: 'kimono 2f6b3a b02428 1c1a24', prop: 'katana3', pose: 'action', eyes: 'angry' }
const LAW: FigureCard = { fig: 'slim', skin: 'e0b088', hair: 'short 1c1a24', hat: 'cap f0ece0', face: ['beard'], wear: 'coat 1c1a24 e8c040 3a4a7a', prop: 'sword 6a6a7a' }
const NAMI: FigureCard = { fig: 'slim', skin: 'f8c8a0', hair: 'long f08030', wear: 'shirt f8f8f8 3a6ab0 3a6ab0', prop: 'staff 4a8ad8', prop2: 'orb f0902a' }
const KID: FigureCard = { fig: 'broad', skin: 'f0c8a0', hair: 'spiky d83a2a', face: ['goggles'], wear: 'coat 8a1a2a 1c1a24 2a2a3a', prop: 'fists', eyes: 'angry', mouth: 'grin' }
const HANCOCK: FigureCard = { fig: 'slim', skin: 'f8d8c0', hair: 'long 1c1a24', wear: 'dress d8304a f0c040', cape: 'f4f0f4', eyes: 'narrow' }
const CROCODILE: FigureCard = { fig: 'normal', skin: 'e8b890', hair: 'slick 1c1a24', face: ['scar'], wear: 'suit 3a3a4a d8a830', cape: '1c1a24', prop: 'scythe d8a830', eyes: 'narrow' }
const KAIDO: FigureCard = { fig: 'giant', skin: 'e0a070', hair: 'long 1c1a24', hat: 'horns', face: ['beard'], wear: 'open 5a3a8a e8c040 3a2a4a', prop: 'club', eyes: 'angry', mouth: 'fang' }
const KING: FigureCard = { fig: 'giant', skin: '8a6a5a', hair: 'long f4f0e8', face: ['mask'], wear: 'suit 1c1a24 e85a2a', x: ['wings'], prop: 'sword' }

const SPECS: readonly KitSpec[] = [
  // ── Rot ──
  { id: 'op01-001', print: { life: 5, power: 5000, type: 'Supernovae/Strohhutbande' }, art: { ...ZORO, v: 1 } },
  { id: 'op01-002', print: { life: 4, power: 5000, type: 'Supernovae/Heart-Piraten' }, art: LAW },
  { id: 'op01-003', print: { life: 4, power: 5000, type: 'Supernovae/Strohhutbande' }, art: { ...LUFFY, scene: 'Rot' } },
  { id: 'op01-004', print: { cost: 2, power: 3000, counter: 2000, type: 'Strohhutbande' },
    art: { fig: 'slim', skin: 'c08850', hair: 'wild 1c1418', face: ['nose', 'goggles'], wear: 'shirt e8d8b0 8a5a30 6a4a30', prop: 'slingshot', pose: 'action' } },
  { id: 'op01-005', print: { cost: 4, power: 4000, type: 'FILM' }, art: { fig: 'slim', skin: 'f8dcc8', hair: 'long e8505a', wear: 'dress f4f4f8 4a5ab0', pose: 'cast', mouth: 'open', x: ['aura'] } },
  { id: 'op01-006', print: { cost: 1, power: 0, counter: 2000, type: 'Land Wano' }, art: { fig: 'small', hair: 'short 1c1418', wear: 'kimono 8a5ac0 f0c040', prop: 'orb f4ece0', mouth: 'open' } },
  { id: 'op01-007', print: { cost: 4, power: 5000, type: 'Supernovae/Beautiful-Piraten' },
    art: { fig: 'slim', skin: 'f8dcc8', hair: 'long f0d060', wear: 'coat f4f0f8 d8a830 3a3a5a', cape: 'd84a6a', prop: 'sword', pose: 'action', v: 1 } },
  { id: 'op01-008', print: { cost: 2, power: 3000, counter: 1000, type: 'Minks' },
    art: { fig: 'small', skin: 'f8e4d8', hair: 'short f4e8a0', hat: 'bunny f4f0ec', wear: 'dress f0708a f4f0ec', prop: 'fists', pose: 'action', x: ['aura'], v: 1 } },
  { id: 'op01-009', print: { cost: 2, power: 3000, counter: 2000, type: 'Strohhutbande' },
    art: { fig: 'slim', hair: 'short f0d060', face: ['beard'], wear: 'suit 1c1a24 f07020', prop: 'fists', pose: 'action', x: ['aura'] } },
  { id: 'op01-010', print: { cost: 4, power: 5000, type: 'Fischmensch/Strohhutbande' },
    art: { fig: 'giant', skin: '4a7ac8', hair: 'pony 1c1a24', wear: 'kimono f0a040 3a3a6a', prop: 'fists', pose: 'action', eyes: 'angry' } },
  { id: 'op01-011', print: { cost: 3, power: 4000, counter: 1000, type: 'Tier/Strohhutbande' },
    art: { fig: 'small', skin: 'a8683a', hat: 'tophat f080a8', wear: 'bare a8683a a8683a 3a5ab0', x: ['tank'], prop: 'orb f8c0d8', mouth: 'open' } },
  { id: 'op01-012', print: { cost: 1, power: 2000, counter: 1000, type: 'Strohhutbande' }, art: { ...NAMI, pose: 'action' } },
  { id: 'op01-013', print: { cost: 3, power: 4000, counter: 1000, type: 'Strohhutbande' },
    art: { fig: 'slim', skin: 'e8b890', hair: 'long 1c1a24', wear: 'dress 5a3a8a d84a8a 2a2a3a', pose: 'cross', eyes: 'narrow' } },
  { id: 'op01-014', print: { cost: 2, power: 2000, counter: 1000, type: 'Supernovae/Barto-Club' },
    art: { fig: 'slim', hair: 'mohawk 4ac85a', wear: 'open 2a3a4a 4ac85a 3a3a4a', mouth: 'fang', eyes: 'angry', pose: 'cross', x: ['aura'] } },
  { id: 'op01-015', print: { cost: 3, power: 4000, type: 'Strohhutbande' },
    art: { fig: 'broad', skin: 'e0a878', hair: 'slick 3a8ad8', face: ['shades'], wear: 'open e8504a f0d040 3a5ab0', prop: 'fists', pose: 'cast' } },
  { id: 'op01-016', print: { cost: 4, power: 5000, counter: 1000, type: 'Strohhutbande' },
    art: { fig: 'slim', skin: 'f0ece0', hair: 'afro 1c1a24', hat: 'tophat 1c1a24', wear: 'suit 1c1a24 d83a5a', prop: 'staff 6a4a2a', mouth: 'grin', v: 1 } },
  { id: 'op01-017', print: { cost: 3, power: 5000, counter: 1000, type: 'Whitebeard-Bande' },
    art: { fig: 'slim', hair: 'spiky f0d060', wear: 'open 6a4ab0 3ab0f0 3a3a6a', x: ['wings'], pose: 'cast', v: 1 } },
  { id: 'op01-018', print: { cost: 2, power: 3000, counter: 1000, type: 'Supernovae/Strohhutbande' }, art: { ...LUFFY, eyes: 'angry', v: 1 } },
  { id: 'op01-019', print: { cost: 3, power: 5000, type: 'Supernovae/Strohhutbande' }, art: ZORO },
  { id: 'op01-020', print: { cost: 2, type: 'Supernovae/Strohhutbande' }, text: '[Counter] +4000, dann K.O. 1 Gegner bis 4000.',
    art: { obj: 'fist', x: ['flames', 'streak'], v: 1 } },
  { id: 'op01-021', print: { cost: 1, type: 'Strohhutbande' }, text: '[Counter] +2000, bei 2 Leben oder weniger +4000.', art: { obj: 'beam', x: ['sparks'] } },
  { id: 'op01-022', print: { cost: 1, type: 'Strohhutbande' }, text: '[Main] Nimm 1 Strohhut aus den oberen 5 Karten.', art: { obj: 'hourglass', x: ['rays'] } },

  // ── Grün ──
  { id: 'op01-023', print: { life: 5, power: 5000, type: 'Land Wano/Kouzuki-Clan' },
    art: { fig: 'giant', hair: 'bun 1c1a24', face: ['beard'], wear: 'kimono f0e8d8 2f7a4a 4a3a2a', prop: 'katana2', pose: 'action', mouth: 'grin' } },
  { id: 'op01-024', print: { cost: 3, power: 4000, counter: 1000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'giant', skin: 'd8986a', hair: 'wild c83a2a', face: ['beard'], wear: 'kimono 3a3a4a c83a2a', prop: 'greatsword', eyes: 'angry', v: 1 } },
  { id: 'op01-025', print: { cost: 3, power: 3000, counter: 2000, type: 'Land Wano/Whitebeard-Bande' },
    art: { fig: 'slim', skin: 'f8ece4', hair: 'bun 1c1a24', wear: 'kimono f0a0c0 c83a5a', prop: 'pistols', eyes: 'narrow', v: 1 } },
  { id: 'op01-026', print: { cost: 3, power: 4000, counter: 1000, type: 'Minks/Land Wano/Akazaya-Neun' },
    art: { fig: 'normal', skin: 'f4f0e8', hair: 'long f4f0e8', hat: 'fox', face: ['beard'], wear: 'coat 3a5a9a d8b040', cape: 'c83a3a', prop: 'sword', eyes: 'angry' } },
  { id: 'op01-027', print: { cost: 3, power: 5000, type: 'Land Wano/Akazaya-Neun' }, art: { fig: 'slim', hair: 'pony 1c1a24', wear: 'kimono e8e0f0 8a3a5a', prop: 'katana', eyes: 'closed' } },
  { id: 'op01-028', print: { cost: 2, power: 3000, counter: 1000, type: 'Fischmensch/Land Wano/Akazaya-Neun' },
    art: { fig: 'broad', skin: '6aa858', hat: 'wide e8c060', wear: 'kimono 3a6a8a 2a2a3a', prop: 'katana', mouth: 'flat' } },
  { id: 'op01-029', print: { cost: 2, power: 3000, counter: 1000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'slim', skin: 'f8f0e8', hair: 'wild c83a3a', wear: 'kimono 3a3a3a f0e8d0', prop: 'staff 2a2a2a', mouth: 'grin', v: 1 } },
  { id: 'op01-030', print: { cost: 2, power: 2000, counter: 1000, type: 'Supernovae/Kid-Piraten' },
    art: { fig: 'slim', hair: 'long f0d060', face: ['mask'], wear: 'shirt f0f0f4 3a5a9a 3a5a9a', prop: 'scythe', prop2: 'scythe', pose: 'action', v: 1 } },
  { id: 'op01-031', print: { cost: 6, power: 6000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'normal', hair: 'bun 1c1a24', face: ['moustache'], wear: 'kimono b83a2a f07020 3a2a2a', prop: 'katana2', x: ['aura'], pose: 'action', eyes: 'angry', v: 1 } },
  { id: 'op01-032', print: { cost: 1, power: 0, counter: 1000, type: 'Land Wano/Kouzuki-Clan' },
    art: { a: 'serpent', c: 'f08ab0 c85a88 fce0ec', horn: 'back', crest: 'mane', eyes: 'round', mouth: 'open', s: 0.9 } },
  { id: 'op01-033', print: { cost: 1, power: 0, counter: 1000, type: 'Land Wano/Kouzuki-Clan' },
    art: { fig: 'slim', hair: 'bun 1c1a24', wear: 'kimono 8a3ab0 e8c040', prop: 'fan e85a8a', eyes: 'narrow', v: 1 } },
  { id: 'op01-034', print: { cost: 5, power: 7000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'slim', hair: 'slick 3a6ad8', face: ['glasses'], wear: 'kimono 3a3a5a d8a8c0', prop: 'katana', eyes: 'closed', v: 1 } },
  { id: 'op01-035', print: { cost: 5, power: 6000, type: 'Supernovae/Heart-Piraten' }, art: { ...LAW, pose: 'action', v: 1 } },
  { id: 'op01-036', print: { cost: 2, power: 3000, counter: 1000, type: 'Minks/Land Wano/Akazaya-Neun' },
    art: { fig: 'giant', skin: 'e8a040', hair: 'wild f0d060', hat: 'fox', face: ['beard'], wear: 'kimono 4a4a5a c83a3a', prop: 'spear', mouth: 'grin', v: 1 } },
  { id: 'op01-037', print: { cost: 4, power: 4000, counter: 2000, type: 'Minks/Heart-Piraten' },
    art: { fig: 'broad', skin: 'f4f4f0', hair: 'short f4f4f0', hat: 'fox', wear: 'suit f08a30 1c1a24', prop: 'fists', pose: 'action', mouth: 'open' } },
  { id: 'op01-038', print: { cost: 8, power: 8000, type: 'Supernovae/Kid-Piraten' }, art: { ...KID, pose: 'cast' } },
  { id: 'op01-039', print: { cost: 3, power: 4000, counter: 1000, type: 'Land Wano/Akazaya-Neun' },
    art: { fig: 'broad', hair: 'bun 1c1a24', wear: 'robe 3a3a5a c83a3a', prop: 'book e8dcb8', eyes: 'closed', mouth: 'open', v: 1 } },
  { id: 'op01-040', print: { cost: 1, type: 'Land Wano/Kouzuki-Clan' }, text: '[Main] Lass 2 Charaktere ruhen: Ziehe 2 Karten.', art: { obj: 'hand', x: ['rays'], v: 1 } },
  { id: 'op01-041', print: { cost: 2, type: 'Supernovae/Kid-Piraten' }, text: '[Counter] +4000. Lass 1 Gegner bis Kosten 4 ruhen.',
    art: { obj: 'fist', c: '8a8a98 6a6a78', x: ['bolts'] } },

  // ── Blau ──
  { id: 'op01-042', print: { life: 5, power: 5000, type: 'Samurai der Meere/Donquixote-Piraten' },
    art: { fig: 'giant', hair: 'short f0d060', face: ['shades'], wear: 'coat f07ab0 f8f0f4 e8a868', cape: 'f07ab0', pose: 'cast', mouth: 'grin' } },
  { id: 'op01-043', print: { life: 4, power: 5000, type: 'Kaiser/Tierkönig-Piraten' }, art: KAIDO },
  { id: 'op01-044', print: { life: 4, power: 5000, type: 'Samurai der Meere/Baroque Works' }, art: CROCODILE },
  { id: 'op01-045', print: { cost: 4, power: 5000, counter: 1000, type: 'Fischmensch/Arlong-Piraten' },
    art: { fig: 'broad', skin: '7aa8d0', hair: 'short 2a2a3a', face: ['saw'], mouth: 'fang', eyes: 'angry', wear: 'open f0e8d0 3a8a5a 6a4a30', prop: 'greatsword' } },
  { id: 'op01-046', print: { cost: 2, power: 3000, counter: 2000, type: 'Buggy-Piraten' },
    art: { fig: 'slim', hair: 'long 1c1a24', hat: 'wide f4f0f0', wear: 'dress f4f0f4 d83a5a', prop: 'club', pose: 'action' } },
  { id: 'op01-047', print: { cost: 7, power: 7000, counter: 1000, type: 'Samurai der Meere/Baroque Works' },
    art: { ...CROCODILE, pose: 'cast', x: ['aura'], scene: 'Feuer' } },
  { id: 'op01-048', print: { cost: 4, power: 5000, counter: 1000, type: 'Samurai der Meere/Thriller-Bark-Bande' },
    art: { fig: 'giant', skin: 'd8d0e0', hair: 'spiky 4a3a5a', hat: 'horns 8a8a9a', wear: 'coat 2a2a3a d83a3a', prop: 'scythe', mouth: 'grin', eyes: 'angry', v: 1 } },
  { id: 'op01-049', print: { cost: 9, power: 9000, type: 'Samurai der Meere' },
    art: { fig: 'slim', hair: 'slick 1c1a24', hat: 'wide 2a2430', face: ['moustache'], wear: 'coat 2a2430 e8c040', prop: 'greatsword 1c1a24', eyes: 'glow' } },
  { id: 'op01-050', print: { cost: 4, power: 5000, counter: 1000, type: 'Samurai der Meere/Revolutionsarmee' },
    art: { fig: 'giant', hair: 'short 1c1a24', hat: 'fox', face: ['glasses'], wear: 'coat 2a2a3a 8a6a4a', prop: 'book 8a3a2a' } },
  { id: 'op01-051', print: { cost: 4, power: 5000, type: 'Biowaffe/Marine' },
    art: { fig: 'giant', hair: 'short 1c1a24', hat: 'fox', face: ['glasses'], wear: 'coat 3a3a4a f04a3a', prop: 'fists', eyes: 'glow', mouth: 'open', v: 1 } },
  { id: 'op01-052', print: { cost: 2, power: 4000, counter: 1000, type: 'Dressrosa' },
    art: { fig: 'normal', hair: 'short f0d060', wear: 'open f0f0f4 3a5a9a 3a3a4a', prop: 'fists', pose: 'action', mouth: 'grin' } },
  { id: 'op01-053', print: { cost: 1, power: 2000, counter: 1000, type: 'Thriller-Bark-Bande' },
    art: { fig: 'small', skin: 'f8e0e0', hair: 'braids f080b0', hat: 'crown', wear: 'dress 2a2a3a f080b0', prop: 'staff f080b0', v: 1 } },
  { id: 'op01-054', print: { cost: 4, power: 5000, counter: 1000, type: 'Samurai der Meere/Kuja-Piraten' }, art: { ...HANCOCK, pose: 'cast' } },
  { id: 'op01-055', print: { cost: 3, power: 1000, counter: 1000, type: 'Baroque Works' },
    art: { fig: 'slim', skin: 'e8b890', hair: 'long 1c1a24', hat: 'wide f4f0e8', wear: 'coat f4f0e8 6a3a8a 5a3a6a', pose: 'cross', eyes: 'narrow', scene: 'Feuer' } },
  { id: 'op01-056', print: { cost: 2, power: 3000, counter: 1000, type: 'Baroque Works' },
    art: { fig: 'broad', skin: 'b87a50', hair: 'bald', face: ['shades'], wear: 'bare b87a50 c8a040 3a3a4a', prop: 'sword', prop2: 'sword', pose: 'action' } },
  { id: 'op01-057', print: { cost: 3, power: 4000, counter: 2000, type: 'Baroque Works' },
    art: { fig: 'slim', hair: 'short 1c1a24', wear: 'coat f080b0 f4f4f8 3a5ab0', x: ['wings'], pose: 'cast', mouth: 'open' } },
  { id: 'op01-058', print: { cost: 2, power: 3000, counter: 1000, type: 'Baroque Works' },
    art: { fig: 'slim', hair: 'spiky 1c1a24', face: ['glasses'], wear: 'shirt f4f0e8 3a5ab0 2a2a3a', prop: 'staff f4ecd8', mouth: 'grin' } },
  { id: 'op01-059', print: { cost: 1, type: 'Samurai der Meere/Baroque Works' }, text: '[Counter] +2000. Ordne die oberen 3 Karten.',
    art: { obj: 'slash', c: 'e8c890 fff4d0', scene: 'Feuer' } },

  // ── Lila ──
  { id: 'op01-060', print: { life: 5, power: 5000, type: 'Tierkönig-Piraten' }, art: { ...KING, scene: 'Feuer', v: 1 } },
  { id: 'op01-061', print: { cost: 2, power: 3000, type: 'Tierkönig-Piraten' },
    art: { fig: 'small', hair: 'long 3a8ad8', hat: 'horns', wear: 'dress e86a8a 2a2a3a', pose: 'action', mouth: 'fang', eyes: 'angry' } },
  { id: 'op01-062', print: { cost: 10, power: 12000, type: 'Kaiser/Tierkönig-Piraten' },
    art: { a: 'serpent', c: '3a6ad0 2a4aa8 f0f0f8 f0d040', crest: 'mane', horn: 'back', eyes: 'angry', mouth: 'fang', s: 1.3 } },
  { id: 'op01-063', print: { cost: 7, power: 7000, type: 'Tierkönig-Piraten' },
    art: { a: 'bird', c: '2a2a3a 1c1a24 e8c040 f07020', wings: 'spiky', crest: 'flame', eyes: 'angry', pose: 1, v: 1 } },
  { id: 'op01-064', print: { cost: 6, power: 5000, counter: 1000, type: 'Tierkönig-Piraten' },
    art: { fig: 'giant', hair: 'braids 1c1a24', face: ['shades'], wear: 'open 3a3a4a f0d040 2a2a3a', prop: 'fists', pose: 'cast', mouth: 'grin' } },
  { id: 'op01-065', print: { cost: 1, power: 2000, counter: 2000, type: 'Land Wano/Kurozumi-Clan' },
    art: { fig: 'slim', hair: 'long 3a3a4a', hat: 'crown', wear: 'kimono 7a3ab0 e8c040', prop: 'fan e8c040', mouth: 'open' } },
  { id: 'op01-066', print: { cost: 3, power: 4000, counter: 2000, type: 'Tierkönig-Piraten' },
    art: { fig: 'broad', hair: 'short 1c1a24', hat: 'horns', wear: 'armour 4a4a5a c83a3a', prop: 'spear', eyes: 'angry' } },
  { id: 'op01-067', print: { cost: 3, power: 4000, counter: 1000, type: 'Tierkönig-Piraten' },
    art: { fig: 'giant', hair: 'wild 1c1a24', hat: 'horns f0e8d8', face: ['mask'], wear: 'coat 6a4a2a 3a3a4a', prop: 'scythe', prop2: 'scythe', eyes: 'angry' } },
  { id: 'op01-068', print: { cost: 4, power: 6000, counter: 1000, type: 'Tierkönig-Piraten/On-Air-Piraten' },
    art: { fig: 'slim', skin: 'c89068', hair: 'braids 1c1a24', wear: 'coat 3a8a5a e8c040', mouth: 'grin', x: ['aura'], pose: 'cast' } },
  { id: 'op01-069', print: { cost: 4, power: 2000, counter: 1000, type: 'Tierkönig-Piraten/Hawkins-Piraten' },
    art: { fig: 'slim', skin: 'f4ecdc', hair: 'long f0e0a0', wear: 'coat 6a3a8a 3a3a4a', prop: 'fan f4f0e8', eyes: 'narrow', mouth: 'flat', v: 1 } },
  { id: 'op01-070', print: { cost: 2, power: 3000, counter: 1000, type: 'Tierkönig-Piraten' },
    art: { fig: 'normal', hair: 'slick 1c1a24', face: ['mask'], wear: 'coat 4a3a6a f0d040', prop: 'pistol', mouth: 'fang' } },
  { id: 'op01-071', print: { cost: 4, power: 5000, counter: 1000, type: 'Tierkönig-Piraten' },
    art: { fig: 'giant', hair: 'bun 1c1a24', wear: 'kimono 1c1a24 c83a5a', prop: 'orb f0a040', eyes: 'narrow', v: 1 } },
  { id: 'op01-072', print: { cost: 4, power: 5000, counter: 1000, type: 'Tierkönig-Piraten' },
    art: { a: 'biped', c: '7a9a4a 4a6a2a e8d8a0 c83a3a', back: 'spikes', eyes: 'angry', mouth: 'fang', pose: 1 } },
  { id: 'op01-073', print: { cost: 5, power: 5000, counter: 2000, type: 'Marine/Drake-Piraten/Tierkönig-Piraten' },
    art: { fig: 'broad', hair: 'short d86a3a', face: ['scar'], wear: 'coat 3a5a8a e8e0d0', prop: 'sword', prop2: 'axe', eyes: 'angry', v: 1 } },
  { id: 'op01-074', print: { cost: 2, type: 'Tierkönig-Piraten' }, text: '[Main] Spiele 1 SMILE bis Kosten 3 aus den oberen 5.',
    art: { obj: 'fruit', c: '6ab040 3a7a2a', x: ['face', 'stone'] } },
  { id: 'op01-075', print: { cost: 2, type: 'Kaiser/Tierkönig-Piraten' }, text: '[Counter] +4000. Bei 2 Leben oder weniger +1 DON!!',
    art: { obj: 'club', x: ['bolts', 'streak'] } },

  // ── Secret Rares and Alternatives ──
  { id: 'op01-076', print: { cost: 9, power: 10000, type: 'Kaiser/Rothaar-Piraten' },
    art: { fig: 'normal', hair: 'short c8282c', face: ['scar'], wear: 'shirt f4f0e8 c83a3a 3a3a4a', cape: '1c1a24', prop: 'sword', eyes: 'narrow' } },
  { id: 'op01-077', print: { cost: 5, power: 5000, counter: 1000, type: 'Land Wano' },
    art: { fig: 'slim', hair: 'long f4f4f8', hat: 'horns d83a3a', wear: 'kimono f4f0e8 c83a5a 3a3a5a', prop: 'club', pose: 'action', mouth: 'grin' } },
  { id: 'op01-078', print: { life: 5, power: 5000, type: 'Supernovae/Strohhutbande' }, art: { ...ZORO, pose: 'cross', eyes: 'closed', x: ['aura'] } },
  { id: 'op01-079', print: { life: 4, power: 5000, type: 'Supernovae/Heart-Piraten' }, art: { ...LAW, prop: 'orb 4ab0e0', eyes: 'narrow', v: 1 } },
  { id: 'op01-080', print: { cost: 1, power: 2000, counter: 1000, type: 'Strohhutbande' }, art: { ...NAMI, pose: 'cast', mouth: 'open', v: 1 } },
  { id: 'op01-081', print: { cost: 2, power: 3000, counter: 1000, type: 'Supernovae/Strohhutbande' }, art: { ...LUFFY, pose: 'cast', mouth: 'open' } },
  { id: 'op01-082', print: { cost: 8, power: 8000, type: 'Supernovae/Kid-Piraten' }, art: { ...KID, x: ['wings'], pose: 'cast', v: 1 } },
  { id: 'op01-083', print: { cost: 4, power: 5000, counter: 1000, type: 'Samurai der Meere/Kuja-Piraten' }, art: { ...HANCOCK, pose: 'action', v: 1 } },
  { id: 'op01-084', print: { cost: 10, power: 12000, type: 'Kaiser/Tierkönig-Piraten' }, art: { ...KAIDO, pose: 'action', v: 1 } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
