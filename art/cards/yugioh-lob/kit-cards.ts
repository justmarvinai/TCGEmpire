import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). Briefs: docs/sets/yugioh-lob.md. print: { level, atk, def, type } for monsters, with the
 * German types of the era (Hexer = spellcaster). Texts fit the frame (art/frames/yugioh.ts): one row
 * under the type line of a monster, three rows on spells and traps.
 */
const SPECS: readonly KitSpec[] = [
  // ── normal monsters ──
  {
    id: 'ygo-lob-001',
    print: { level: 7, atk: 2850, def: 2350, type: 'Drache' },
    art: { a: 'quad', c: '8a5ab4 5e3a86 d8c4e4 f2ead6', wings: 'spiky', horn: 'spike', crest: 'spiky', tail: 'plain', eyes: 'angry', mouth: 'fang', x: ['claws'], n: 6, pose: 1, s: 1.15 },
  },
  {
    id: 'ygo-lob-002',
    print: { level: 4, atk: 1200, def: 1000, type: 'Ungeheuer-Krieger' },
    art: { a: 'humanoid', c: '6aa03e 4a7a2c b8d88a', eyes: 'cyclops', mouth: 'fang', horn: 'nub', x: ['belt'], n: 1, pose: 1 },
  },
  {
    id: 'ygo-lob-003',
    print: { level: 1, atk: 300, def: 200, type: 'Zombie' },
    art: { fig: 'slim', skin: 'e6e0cc', hat: 'hood 5e3a80', wear: 'robe 5e3a80 e8d050 3a2a50', eyes: 'glow', mouth: 'grin', v: 1 },
  },
  {
    id: 'ygo-lob-004',
    print: { level: 7, atk: 2300, def: 2100, type: 'Krieger' },
    art: { fig: 'broad', skin: 'e8b890', hat: 'helmet 3a4a9a', wear: 'armour 3a4a9a e0b040 2a2a40', cape: 'c8302a', prop: 'spear d8302a', prop2: 'spear d8302a', pose: 'action', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-lob-005',
    print: { level: 4, atk: 1400, def: 1200, type: 'Krieger' },
    art: { fig: 'slim', skin: 'f0c8a0', hair: 'long f0e098', face: ['elf'], wear: 'armour 3a8a4a c89a40 5a4a3a', prop: 'sword', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-lob-006',
    print: { level: 2, atk: 500, def: 700, type: 'Insekt' },
    art: { a: 'humanoid', c: '5aa83a 3a7a2a d8ec9a', ant: 'two', x: ['arms4'], mouth: 'smile', pose: 1 },
  },
  {
    id: 'ygo-lob-007',
    print: { level: 3, atk: 1200, def: 800, type: 'Dinosaurier' },
    art: { a: 'quad', c: 'e4dcc4 b4a888 f6f0e0', crest: 'mane', ears: 'big', horn: 'spike', eyes: 'vacant', mouth: 'none', x: ['nose'], n: 9, s: 1.15, v: 1 },
  },
  {
    id: 'ygo-lob-008',
    print: { level: 3, atk: 1200, def: 800, type: 'Ungeheuer' },
    art: { a: 'quad', c: 'c4ccdc 8890a8 f2f4f8', ears: 'point', tail: 'fluff', mouth: 'open', x: ['muzzle'], n: 7, v: 1 },
  },
  {
    id: 'ygo-lob-009',
    print: { level: 3, atk: 800, def: 900, type: 'Ungeheuer' },
    art: { a: 'quad', c: '6c6a74 4a4852 8e8c96', crest: 'mane', ears: 'point', tail: 'fluff', eyes: 'red', mouth: 'fang', n: 5 },
  },
  {
    id: 'ygo-lob-010',
    print: { level: 4, atk: 1300, def: 900, type: 'Unterweltler' },
    art: { fig: 'broad', skin: '6a4a8a', hat: 'hood 2c1a3c', wear: 'robe 2c1a3c d83a4a', prop: 'club 8a8a9a', eyes: 'glow', mouth: 'fang', v: 1 },
  },
  {
    id: 'ygo-lob-011',
    print: { level: 3, atk: 800, def: 700, type: 'Hexer' },
    art: { fig: 'small', skin: 'f4d0b0', hair: 'short 4a3a6a', hat: 'pointed 4a6ac8', wear: 'robe 8aa8e8 f0e070', eyes: 'closed', mouth: 'open', v: 1 },
  },
  {
    id: 'ygo-lob-012',
    print: { level: 3, atk: 1200, def: 900, type: 'Zombie' },
    art: { fig: 'normal', skin: '8aa878', hair: 'wild 3a3a2a', wear: 'open 5a5048 c8b030 3a3830', prop: 'orb f0c040', eyes: 'glow', mouth: 'grin', v: 1 },
  },
  {
    id: 'ygo-lob-013',
    print: { level: 3, atk: 900, def: 1000, type: 'Hexer' },
    art: { fig: 'normal', skin: 'e8b890', hair: 'short 2a2020', wear: 'robe c8402a f0c040', prop: 'orb f06a1e', prop2: 'orb f06a1e', pose: 'cast', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-lob-014',
    print: { level: 3, atk: 600, def: 900, type: 'Krieger' },
    art: { a: 'blob', c: 'f2ead6 c0ac84 fbf6ea', pat: 'spots', eyes: 'angry', mouth: 'none', pose: 1 },
  },
  {
    id: 'ygo-lob-015',
    print: { level: 2, atk: 700, def: 600, type: 'Pflanze' },
    art: { a: 'blob', c: '5a9a3a 3a7a2a 8ac85a f06a1e', crest: 'spiky', eyes: 'angry', mouth: 'fang', x: ['fumes'] },
  },
  {
    id: 'ygo-lob-016',
    print: { level: 4, atk: 1000, def: 1500, type: 'Aqua' },
    art: { a: 'quad', c: 'f0a030 2a2430 f8e0b0', pat: 'stripes', back: 'shell', ears: 'point', mouth: 'open', x: ['muzzle'], n: 6 },
  },
  {
    id: 'ygo-lob-017',
    print: { level: 2, atk: 600, def: 700, type: 'Drache' },
    art: { a: 'biped', c: 'f0c838 d89a28 f8e8b0 f08030', wings: 'spiky', tail: 'plain', horn: 'nub', belly: 'patch', mouth: 'open', pose: 1, scene: 'WIND' },
  },
  {
    id: 'ygo-lob-018',
    print: { level: 3, atk: 600, def: 900, type: 'Fee' },
    art: { a: 'blob', c: 'f8b4c8 e084a4 fff0f4 f8e060', wings: 'small', x: ['star'], mouth: 'smile' },
  },
  {
    id: 'ygo-lob-019',
    print: { level: 2, atk: 600, def: 500, type: 'Pyro' },
    art: { obj: 'fireball', x: ['face', 'sparks'], v: 1 },
  },
  {
    id: 'ygo-lob-020',
    print: { level: 4, atk: 1200, def: 2000, type: 'Hexer' },
    art: { fig: 'normal', skin: '7aa8d8', hat: 'hood 2a5aa8', face: ['mask'], wear: 'robe 2a5aa8 8ad0f0', pose: 'cast', eyes: 'glow', x: ['aura'] },
  },
  {
    id: 'ygo-lob-021',
    print: { level: 2, atk: 800, def: 400, type: 'Krieger' },
    art: { fig: 'normal', skin: 'e8c098', hat: 'helmet 2a4aa8', wear: 'armour 2a4aa8 8ad0f0 1e2440', prop: 'katana', pose: 'action', eyes: 'angry', mouth: 'flat', x: ['aura'] },
  },
  {
    id: 'ygo-lob-022',
    print: { level: 4, atk: 1100, def: 1100, type: 'Krieger' },
    art: { fig: 'broad', skin: 'e0b088', hair: 'short 7a7a7a', face: ['beard', 'scar'], wear: 'armour 8c8c9c c8a040 5a4a3a', prop: 'sword', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-lob-023',
    print: { level: 3, atk: 800, def: 800, type: 'Geflügeltes Ungeheuer' },
    art: { a: 'bird', c: '3c3c4c 28283a 6a6a7c e8c040', wings: 'spiky', eyes: 'red', pose: 1, v: 1 },
  },
  {
    id: 'ygo-lob-024',
    print: { level: 4, atk: 800, def: 2000, type: 'Hexer' },
    art: { fig: 'slim', skin: '8ab8e8', hair: 'long f0e8c0', face: ['elf'], wear: 'dress 3a9a5a e8d070', pose: 'cast', eyes: 'closed', mouth: 'smile', x: ['aura'] },
  },
  {
    id: 'ygo-lob-025',
    print: { level: 4, atk: 1200, def: 1500, type: 'Ungeheuer-Krieger' },
    art: { a: 'biped', c: 'a8703a 7a4a28 e8c898 c8c8d0', ears: 'round', tail: 'club', belly: 'patch', x: ['belt'], mouth: 'smile', n: 0.3 },
  },
  {
    id: 'ygo-lob-026',
    print: { level: 5, atk: 2000, def: 1500, type: 'Drache' },
    art: { a: 'quad', c: 'e0b848 a8802c f8e8a8 7a3a8a', wings: 'spiky', horn: 'back', tail: 'plain', eyes: 'angry', mouth: 'fang', n: 4, pose: 1 },
  },
  {
    id: 'ygo-lob-027',
    print: { level: 3, atk: 1300, def: 2000, type: 'Fels' },
    art: { fig: 'giant', skin: '8a8478', hat: 'helmet 8a8478', wear: 'armour 8a8478 c0b8a8 6a6458', prop: 'greatsword 9a948a', eyes: 'glow', mouth: 'none' },
  },
  {
    id: 'ygo-lob-028',
    print: { level: 4, atk: 1400, def: 1300, type: 'Unterweltler' },
    art: { fig: 'slim', skin: 'b4a4d4', hat: 'tophat 2a1a3a', wear: 'suit 8a4ab4 f0e8f8', cape: 'c83a4a', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-lob-029',
    print: { level: 3, atk: 300, def: 1200, type: 'Krieger' },
    art: { fig: 'broad', skin: '2a2a34', hat: 'helmet 8a8ea0', wear: 'armour 8a8ea0 f0d060 5a5e70', eyes: 'glow', mouth: 'none' },
  },
  {
    id: 'ygo-lob-030',
    print: { level: 2, atk: 800, def: 600, type: 'Pflanze' },
    art: { a: 'blob', c: '4a8a3a 2a5a2a d84a5a', crest: 'spiky', eyes: 'angry', mouth: 'fang', x: ['hands'] },
  },
  {
    id: 'ygo-lob-031',
    print: { level: 4, atk: 1300, def: 1000, type: 'Pyro' },
    art: { a: 'humanoid', c: 'd84a1e a82a12 f8b048 ffd860', crest: 'flame', eyes: 'angry', mouth: 'fang', n: 1, pose: 1, v: 1 },
  },
  {
    id: 'ygo-lob-032',
    print: { level: 3, atk: 700, def: 1300, type: 'Drache' },
    art: { a: 'biped', c: '6a9ad0 4a6aa8 e0e8f0', eyes: 'cyclops', wings: 'small', tail: 'plain', horn: 'nub', n: 0.2 },
  },
  {
    id: 'ygo-lob-033',
    print: { level: 5, atk: 1600, def: 1300, type: 'Seeschlange' },
    art: { a: 'serpent', c: '3a6a9a 2a4a7a 8ac0e0 f0e040', crest: 'spiky', eyes: 'angry', mouth: 'fang', pose: 1, v: 1 },
  },
  {
    id: 'ygo-lob-034',
    print: { level: 4, atk: 1200, def: 1300, type: 'Donner' },
    art: { a: 'quad', c: 'a87848 7a5030 e8d0a0 f0e040', ant: 'fork', tail: 'bolt', eyes: 'angry', mouth: 'fang', n: 6, pose: 1, v: 1 },
  },
  {
    id: 'ygo-lob-035',
    print: { level: 4, atk: 1550, def: 1200, type: 'Geflügeltes Ungeheuer' },
    art: { a: 'bird', c: 'c82a2a 8a1a1a f0e8d8 e8c040', wings: 'spiky', belly: 'skull', eyes: 'angry', pose: 1, scene: 'FEUER' },
  },
  {
    id: 'ygo-lob-036',
    print: { level: 4, atk: 1200, def: 1000, type: 'Drache' },
    art: { a: 'biped', c: '6aa04a 4a7a3a c8e0a0', wings: 'spiky', tail: 'plain', horn: 'back', eyes: 'angry', mouth: 'fang', n: 0.4 },
  },
  // the four sealed limbs of the Forbidden One: golden shackles for the legs, fist and open hand for the arms
  { id: 'ygo-lob-037', print: { level: 1, atk: 200, def: 300, type: 'Hexer' }, art: { obj: 'chains', c: 'e8c050 8a5a10', x: ['glow', 'rays'] } },
  { id: 'ygo-lob-038', print: { level: 1, atk: 200, def: 300, type: 'Hexer' }, art: { obj: 'chains', c: 'e8c050 8a5a10', x: ['glow', 'rays'], flip: true } },
  { id: 'ygo-lob-039', print: { level: 1, atk: 200, def: 300, type: 'Hexer' }, art: { obj: 'fist', c: 'c89048 e8c050', x: ['glow', 'rays'] } },
  { id: 'ygo-lob-040', print: { level: 1, atk: 200, def: 300, type: 'Hexer' }, art: { obj: 'hand', c: 'c89048 e8c050', x: ['glow', 'rays'] } },

  // ── effect monsters ──
  {
    id: 'ygo-lob-041',
    print: { level: 5, atk: 1380, def: 1930, type: 'Unterweltler' },
    text: 'FLIPP: 1 Falle weg',
    art: { fig: 'slim', skin: 'e6e0cc', hat: 'wide 2a1a3a', wear: 'robe 2a1a3a 9a4ae0', prop: 'scythe', eyes: 'glow', mouth: 'grin', v: 1 },
  },
  {
    id: 'ygo-lob-042',
    print: { level: 2, atk: 450, def: 600, type: 'Insekt' },
    text: 'FLIPP: Monster tot',
    art: { a: 'insect', c: '8a5a2a 5a3a1a c8a070 e8d8b0', ant: 'two', eyes: 'angry', mouth: 'fang', pose: 1 },
  },
  {
    id: 'ygo-lob-043',
    print: { level: 2, atk: 450, def: 500, type: 'Ungeheuer' },
    text: 'FLIPP: Auf die Hand',
    art: { a: 'blob', c: 'f0e8d8 c8b8a0 fff8f0 e8a040', wings: 'bird', mouth: 'smile', scene: 'WIND' },
  },

  // ── fusion monsters ──
  {
    id: 'ygo-lob-044',
    print: { level: 5, atk: 1800, def: 1600, type: 'Krieger' },
    art: { fig: 'normal', skin: 'e8b890', hat: 'helmet d8742a', wear: 'armour d8742a 3a6ac8 3a3a5a', prop: 'greatsword f06a1e', pose: 'action', eyes: 'angry', mouth: 'open', x: ['aura'] },
  },
  {
    id: 'ygo-lob-045',
    print: { level: 3, atk: 1100, def: 800, type: 'Pyro' },
    art: { fig: 'small', skin: 'f08a2a', hat: 'helmet c83a12', wear: 'armour f06a1e fcd040', prop: 'spear e8e0d0', pose: 'action', eyes: 'angry', mouth: 'grin', x: ['aura'] },
  },
  {
    id: 'ygo-lob-046',
    print: { level: 4, atk: 1500, def: 1250, type: 'Drache' },
    art: { a: 'serpent', c: '2a2430 1a1620 4a4458 f06a1e', crest: 'flame', eyes: 'red', mouth: 'fang', pose: 1, v: 1 },
  },
  {
    id: 'ygo-lob-047',
    print: { level: 3, atk: 1000, def: 800, type: 'Zombie' },
    art: { a: 'blob', c: 'ece6d6 f06a1e ffd060', x: ['aura', 'wisp'], eyes: 'vacant', mouth: 'fang' },
  },
  {
    id: 'ygo-lob-048',
    print: { level: 6, atk: 1850, def: 1700, type: 'Maschine' },
    art: { a: 'quad', c: '98a4bc 6a7890 dfe6f2', wings: 'spiky', horn: 'spike', tail: 'plain', eyes: 'red', mouth: 'fang', n: 5, pose: 1 },
  },
  {
    id: 'ygo-lob-049',
    print: { level: 7, atk: 2600, def: 2100, type: 'Drache' },
    art: { fig: 'broad', skin: 'e8b890', hat: 'helmet 3a4a9a', wear: 'armour 3a4a9a e0b040 2a2a40', cape: 'c8302a', prop: 'spear d8302a', prop2: 'spear d8302a', pose: 'action', eyes: 'angry', mouth: 'flat', x: ['wings'] },
  },

  // ── spells ──
  { id: 'ygo-lob-050', text: 'Ein Krieger erhält 300 ATK.', art: { obj: 'sword', x: ['stone', 'rays'] } },
  { id: 'ygo-lob-051', text: 'Ein Ungeheuer erhält 300 ATK und 300 DEF.', art: { obj: 'fangs', x: ['glow'] } },
  { id: 'ygo-lob-052', text: 'Ein Hexer erhält 300 ATK und 300 DEF.', art: { obj: 'book', c: '6a3a9a e8c040', x: ['glow', 'sparks'] } },
  { id: 'ygo-lob-053', text: 'Insekt, Ungeheuer und Pflanze: +200 ATK/DEF.', art: { land: 'forest' } },
  { id: 'ygo-lob-054', text: 'Dinosaurier, Zombie und Fels: +200 ATK/DEF.', art: { land: 'wasteland' } },
  { id: 'ygo-lob-055', text: 'Drache, Donner und Geflügeltes Ungeheuer: +200.', art: { land: 'mountain' } },
  { id: 'ygo-lob-056', text: 'Krieger und Ungeheuer-Krieger: +200 ATK/DEF.', art: { land: 'plains' } },
  { id: 'ygo-lob-057', text: 'Fisch, Seeschlange, Donner und Aqua: +200 ATK/DEF.', art: { land: 'sea' } },
  { id: 'ygo-lob-058', text: 'Unterweltler und Hexer: +200 ATK/DEF. Feen: -200.', art: { land: 'void' } },
  { id: 'ygo-lob-059', text: 'Zerstöre alle Monster auf dem Feld.', art: { obj: 'vortex', c: '1a1020 8a5ad0', x: ['sparks'] } },
  { id: 'ygo-lob-060', text: 'Zerstöre alle Monster, die dein Gegner kontrolliert.', art: { obj: 'bolt', x: ['bolts', 'glow'] } },
  { id: 'ygo-lob-061', text: 'Erhalte 500 Lebenspunkte.', art: { obj: 'potion', c: 'd8302a f0e0c0', x: ['glow'] } },
  { id: 'ygo-lob-062', text: 'Füge dem Gegner 200 Punkte Schaden zu.', art: { obj: 'flame', s: 0.8, x: ['sparks'] } },
  { id: 'ygo-lob-063', text: 'Füge dem Gegner 500 Punkte Schaden zu.', art: { obj: 'fireball', n: 3, x: ['streak'], v: 1 } },
  { id: 'ygo-lob-064', text: 'Das schwächste offene Monster des Gegners stirbt.', art: { obj: 'bolt', c: '24160c 6a4426', x: ['smoke'], scene: 'ERDE' } },
  { id: 'ygo-lob-065', text: 'Verschmilz Monster zu einem Fusionsmonster.', art: { obj: 'vortex', c: 'f08a2a 3a7ae0', x: ['sparks'] } },
  {
    id: 'ygo-lob-066',
    text: 'Entferne 2 Monster aus dem Friedhof des Gegners.',
    art: { fig: 'normal', skin: '9ab088', hair: 'wild 4a4a3a', wear: 'coat 4a463a c8b030 3a382e', prop: 'axe 8a8a9a', prop2: 'orb f0c040', eyes: 'glow', mouth: 'grin', scene: 'FINSTERNIS', v: 1 },
  },
  { id: 'ygo-lob-067', text: 'Ein Unterweltler erhält 300 ATK und 300 DEF.', art: { obj: 'orb', c: '3a1a5a 9a5ae0', x: ['bolts', 'glow'] } },
  { id: 'ygo-lob-068', text: 'Eine Pflanze erhält 300 ATK und 300 DEF.', art: { obj: 'germs', n: 4 } },
  { id: 'ygo-lob-069', text: 'Ein Geflügeltes Ungeheuer erhält 300 ATK/DEF.', art: { obj: 'wings', x: ['streak'], scene: 'WIND' } },
  {
    id: 'ygo-lob-070',
    text: 'Erhalte 600 Lebenspunkte.',
    art: { fig: 'small', skin: '8ab84a', hair: 'bald', face: ['nose', 'elf'], wear: 'shirt 8a5a30 c8a040', prop: 'cup 6ac04a', eyes: 'narrow', mouth: 'grin' },
  },
  { id: 'ygo-lob-071', text: 'Füge dem Gegner 600 Punkte Schaden zu.', art: { obj: 'flame', x: ['smoke'] } },
  { id: 'ygo-lob-072', text: 'Dein Gegner kann 3 Runden lang nicht angreifen.', art: { obj: 'swords', n: 3, x: ['glow'], v: 1 } },
  { id: 'ygo-lob-073', text: 'Beschwöre 1 Monster aus einem Friedhof.', art: { obj: 'wings', c: 'f8e8a0 e8c040', x: ['rays', 'glow'] } },
  { id: 'ygo-lob-074', text: 'Ziehe 2 Karten.', art: { obj: 'pot', x: ['face', 'cards', 'rays'] } },

  // ── traps ──
  { id: 'ygo-lob-075', text: 'Drachen bleiben in Verteidigungsposition.', art: { obj: 'pot', c: 'b0703a 6a4a2a', x: ['lid', 'smoke'] } },
  { id: 'ygo-lob-076', text: 'Ein beschworenes Monster ab 1000 ATK fällt hinein.', art: { obj: 'pit', scene: 'ERDE' } },

  // ── Alternative: a second artwork of the same card ──
  { id: 'ygo-lob-077', text: 'Ziehe 2 Karten.', art: { obj: 'pot', c: 'e8c040 c83a5a', x: ['face', 'coins', 'rays'], v: 1 } },
  { id: 'ygo-lob-078', text: 'Beschwöre 1 Monster aus einem Friedhof.', art: { obj: 'ankh', x: ['glow', 'stone'], v: 1 } },
  {
    id: 'ygo-lob-079',
    print: { level: 3, atk: 1000, def: 1000, type: 'Hexer' },
    text: 'Alle 5 Teile: Sieg',
    art: { fig: 'giant', skin: 'c89048', hat: 'crown e8c040', wear: 'bare c89048 e8c040', prop: 'orb fff0a0', pose: 'cast', eyes: 'glow', mouth: 'flat', x: ['aura'] },
  },
  {
    id: 'ygo-lob-080',
    print: { level: 7, atk: 2400, def: 2000, type: 'Drache' },
    art: { a: 'biped', c: '2a2430 1a1620 5a4a60 d82a2a', wings: 'spiky', horn: 'back', tail: 'plain', eyes: 'red', mouth: 'fang', n: 0.6, pose: 1, scene: 'FEUER' },
  },
  {
    id: 'ygo-lob-081',
    print: { level: 7, atk: 2500, def: 2100, type: 'Hexer' },
    art: { fig: 'slim', skin: 'f0e0e8', hair: 'long e8e8f0', hat: 'pointed b8202a', wear: 'robe b8202a e8c040 6a1018', prop: 'staff 6ac06a', pose: 'cast', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-lob-082',
    print: { level: 8, atk: 3000, def: 2500, type: 'Drache' },
    art: { a: 'biped', c: 'e8eef8 a8b8d8 ffffff 3a8ae8', wings: 'spiky', horn: 'back', tail: 'plain', eyes: 'angry', mouth: 'open', n: 0.6, pose: 1, v: 1 },
  },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
