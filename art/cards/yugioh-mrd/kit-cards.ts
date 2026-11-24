import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). Briefs: docs/sets/yugioh-mrd.md. print: { level, atk, def, type } for monsters, with the
 * German types of the era (Hexer = spellcaster). Texts fit the frame (art/frames/yugioh.ts): one row
 * under the type line of a monster, three rows on spells and traps. Alternatives get another pose and
 * scene than their base card.
 */
const SPECS: readonly KitSpec[] = [
  // ── normal monsters ──
  {
    id: 'ygo-mrd-001',
    print: { level: 4, atk: 1300, def: 1400, type: 'Unterweltler' },
    art: { a: 'humanoid', c: '6aa83a 3a7028 c8e08a f0e040', horn: 'spike', ears: 'point', eyes: 'angry', mouth: 'fang', pose: 1 },
  },
  {
    id: 'ygo-mrd-002',
    print: { level: 4, atk: 1400, def: 1200, type: 'Drache' },
    art: { a: 'quad', c: 'e8842a b85a1a f8d090 5a8ac8', wings: 'spiky', horn: 'back', tail: 'plain', eyes: 'angry', mouth: 'fang', n: 5, pose: 1 },
  },
  {
    id: 'ygo-mrd-003',
    print: { level: 4, atk: 1200, def: 1000, type: 'Insekt' },
    art: { a: 'insect', c: 'f0c030 2a2a30 f8e8a8 d83a2a', wings: 'bug', ant: 'two', eyes: 'red', mouth: 'fang', x: ['lances'] },
  },
  {
    id: 'ygo-mrd-004',
    print: { level: 4, atk: 1300, def: 1400, type: 'Geflügeltes Ungeheuer' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'wild 9a4ad0', wear: 'dress 2a7a6a e8c040', x: ['wings'], pose: 'action', eyes: 'narrow', mouth: 'grin', scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrd-005',
    print: { level: 5, atk: 1600, def: 1400, type: 'Fee' },
    art: { fig: 'normal', skin: 'e8d8c8', hair: 'long 2a2a3a', wear: 'armour 3a3448 4a4458 2a2434', x: ['wings'], eyes: 'closed', mouth: 'flat' },
  },
  {
    id: 'ygo-mrd-006',
    print: { level: 1, atk: 300, def: 200, type: 'Insekt' },
    art: { a: 'larva', c: '8ac84a 5a9a2a d8f0a0', eyes: 'round', mouth: 'smile', s: 1.25 },
  },
  {
    id: 'ygo-mrd-007',
    print: { level: 5, atk: 1500, def: 1800, type: 'Pflanze' },
    art: { a: 'humanoid', c: '7a5a36 52381e a88660 4c9a38', crest: 'spiky', eyes: 'narrow', mouth: 'open', n: 1, scene: 'Pflanze', v: 1 },
  },
  {
    id: 'ygo-mrd-008',
    print: { level: 3, atk: 1200, def: 700, type: 'Drache' },
    art: { a: 'biped', c: 'f09a3a c8702a f8d8a0 8a4ac0', wings: 'small', tail: 'plain', horn: 'nub', belly: 'patch', eyes: 'round', mouth: 'open', pose: 1 },
  },
  {
    id: 'ygo-mrd-009',
    print: { level: 4, atk: 1500, def: 800, type: 'Drache' },
    art: { a: 'serpent', c: '3a3440 22202a 6a6070 f08a2a', crest: 'ridge', eyes: 'red', mouth: 'open', scene: 'FEUER', v: 1 },
  },
  {
    id: 'ygo-mrd-010',
    print: { level: 3, atk: 600, def: 1500, type: 'Hexer' },
    art: { fig: 'slim', skin: 'f4f0f0', hat: 'pointed 6a2a9a', face: ['mask'], wear: 'suit 6a2a9a 1a1020', prop: 'orb 3a1a5a', prop2: 'orb 3a1a5a', pose: 'cast', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-mrd-011',
    print: { level: 5, atk: 2000, def: 1530, type: 'Unterweltler' },
    art: { fig: 'broad', skin: '3a2a4a', hat: 'crown e8c040', wear: 'robe 2a1a3a d83a3a', cape: '6a1a2a', pose: 'cross', eyes: 'glow', mouth: 'fang', v: 1 },
  },
  {
    id: 'ygo-mrd-012',
    print: { level: 4, atk: 1000, def: 1200, type: 'Krieger' },
    art: { fig: 'broad', skin: 'e0b088', hat: 'helmet 8a8ea0', wear: 'armour 8a8ea0 c83a2a 4a4a5a', prop: 'sword', prop2: 'shield c83a2a', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-mrd-013',
    print: { level: 4, atk: 500, def: 2000, type: 'Ungeheuer' },
    art: { a: 'biped', c: '9a9aa8 6a6a78 d8d0d8 e8a0a8', ears: 'round', tail: 'plain', eyes: 'round', mouth: 'smile', x: ['muzzle', 'whiskers'], scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrd-014',
    print: { level: 4, atk: 1800, def: 800, type: 'Fisch' },
    art: { a: 'fish', c: 'e84a8a 4a8ae8 f8e050 3ac08a', pat: 'stripes', eyes: 'round', mouth: 'open', pose: 1 },
  },
  {
    id: 'ygo-mrd-015',
    print: { level: 3, atk: 1100, def: 800, type: 'Hexer' },
    art: { fig: 'slim', skin: 'f4d0b0', hair: 'long e8c070', hat: 'hood f0f0f8', wear: 'robe f0f0f8 e8c040', eyes: 'closed', mouth: 'smile', x: ['aura'] },
  },
  {
    id: 'ygo-mrd-016',
    print: { level: 4, atk: 1500, def: 1200, type: 'Ungeheuer' },
    art: { a: 'quad', c: 'd8a040 a86a20 f8e0a0 f0f0e0', crest: 'mane', horn: 'back', tail: 'fluff', eyes: 'angry', mouth: 'none', n: 8, scene: 'Kampf', v: 1 },
  },
  {
    id: 'ygo-mrd-017',
    print: { level: 7, atk: 2400, def: 2000, type: 'Ungeheuer-Krieger' },
    art: { fig: 'giant', skin: '8a8a98', hat: 'helmet c8a040', face: ['nose'], wear: 'armour 6a6a78 c8a040 4a4a58', prop: 'club 8a5a32', pose: 'action', eyes: 'angry', mouth: 'flat' },
  },

  // ── effect monsters ──
  {
    id: 'ygo-mrd-018',
    print: { level: 2, atk: 500, def: 400, type: 'Insekt' },
    text: 'Schlüpft aus Kokon',
    art: { a: 'larva', c: 'c8d890 8aa858 f0f4d0', eyes: 'red', mouth: 'none', pose: 1, s: 1.4, scene: 'Pflanze' },
  },
  {
    id: 'ygo-mrd-019',
    print: { level: 6, atk: 1950, def: 2100, type: 'Geflügeltes Ungeheuer' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'long d84a8a', wear: 'dress 6a3a9a e8c040', x: ['wings'], pose: 'cast', eyes: 'narrow', mouth: 'grin', scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrd-020',
    print: { level: 3, atk: 0, def: 2000, type: 'Insekt' },
    text: 'Hüllt die Motte ein',
    art: { a: 'cocoon', c: '6ab84a 3a8a2a c8f0a0', eyes: 'closed', mouth: 'none', pose: 2, s: 1.5 },
  },
  {
    id: 'ygo-mrd-021',
    print: { level: 2, atk: 900, def: 400, type: 'Unterweltler' },
    text: 'FLIPP: Falle zurück',
    art: { a: 'blob', c: '2a2430 1a1620 4a4458 e8d040', crest: 'spiky', eyes: 'red', mouth: 'fang', x: ['aura'], v: 1 },
  },
  {
    id: 'ygo-mrd-022',
    print: { level: 3, atk: 1000, def: 700, type: 'Hexer' },
    text: 'Treffer: Abwerfen',
    art: { fig: 'small', skin: 'f4d0b0', hair: 'short 3a2a2a', hat: 'tophat f0f0f8', wear: 'robe f0f0f8 c83a3a', prop: 'orb f06a8a', pose: 'cast', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-mrd-023',
    print: { level: 4, atk: 1200, def: 1000, type: 'Unterweltler' },
    text: 'FLIPP: Deck ordnen',
    art: { a: 'blob', c: '6a4a8a 4a2a6a a88ac8', crest: 'spiky', eyes: 'cyclops', mouth: 'none', pose: 1 },
  },
  {
    id: 'ygo-mrd-024',
    print: { level: 4, atk: 900, def: 1400, type: 'Hexer' },
    text: 'Treffer: Ziehe 1',
    art: { fig: 'normal', skin: 'e8c098', hat: 'hood 2a4a9a', face: ['mask'], wear: 'robe 2a4a9a 8ad0f0', pose: 'cast', eyes: 'glow', x: ['aura'] },
  },
  {
    id: 'ygo-mrd-025',
    print: { level: 7, atk: 2600, def: 2200, type: 'Donner' },
    text: 'Angreifer auf 0 ATK',
    art: { a: 'humanoid', c: 'e8b830 b8861c f8e8a0 8a5ac8', crest: 'spiky', eyes: 'angry', mouth: 'open', n: 1, pose: 1, scene: 'Elektro', v: 1 },
  },
  {
    id: 'ygo-mrd-026',
    print: { level: 7, atk: 2400, def: 2200, type: 'Hexer' },
    text: 'Angreifer auf 0 ATK',
    art: { a: 'humanoid', c: '4aa05a 2a7a3a b8e8a8 e8e0c8', ears: 'point', eyes: 'narrow', mouth: 'fang', pose: 2, x: ['moustache'] },
  },
  {
    id: 'ygo-mrd-027',
    print: { level: 7, atk: 2500, def: 2400, type: 'Aqua' },
    text: 'Angreifer auf 0 ATK',
    art: { a: 'humanoid', c: '3a7ac8 2a4a9a a8d0f0 f0e8a0', crest: 'fins', eyes: 'angry', mouth: 'fang', n: 1, v: 1 },
  },
  {
    id: 'ygo-mrd-028',
    print: { level: 2, atk: 500, def: 400, type: 'Maschine' },
    text: 'Greift direkt an',
    art: { fig: 'slim', skin: 'b8c0c8', face: ['goggles'], wear: 'coat 4a5a4a 8a8a9a 2a2a34', pose: 'action', mouth: 'flat' },
  },
  {
    id: 'ygo-mrd-029',
    print: { level: 1, atk: 300, def: 400, type: 'Hexer' },
    text: 'FLIPP: Zauber holen',
    art: { fig: 'slim', skin: 'f4d0b0', hair: 'long f0d890', hat: 'hood 3a5ab0', wear: 'robe 3a5ab0 e8c040', prop: 'staff e8c040', pose: 'cast', mouth: 'smile' },
  },
  {
    id: 'ygo-mrd-030',
    print: { level: 5, atk: 1800, def: 1500, type: 'Krieger' },
    text: 'Lava-Bruder: +500',
    art: { fig: 'giant', skin: '6a8a4a', wear: 'bare 6a8a4a 8a5a30', prop: 'club 5a4a3a', eyes: 'angry', mouth: 'fang', scene: 'Pflanze' },
  },
  {
    id: 'ygo-mrd-031',
    print: { level: 3, atk: 200, def: 1800, type: 'Pyro' },
    text: 'FLIPP: Drachen frei',
    art: { fig: 'small', skin: 'e86a2a', hair: 'spiky f0c040', wear: 'shirt c83a12 f0c040', prop: 'staff 8a5a32', eyes: 'closed', mouth: 'flat' },
  },
  {
    id: 'ygo-mrd-032',
    print: { level: 3, atk: 1000, def: 600, type: 'Unterweltler' },
    text: 'Grab: Karte suchen',
    art: { a: 'blob', c: '8a6a4a 5a4030 c8a888', ears: 'tuft', eyes: 'angry', mouth: 'open', x: ['hands'], scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrd-033',
    print: { level: 8, atk: 2600, def: 2500, type: 'Insekt' },
    text: 'Nur aus dem Kokon',
    art: { a: 'insect', c: '3aa8a0 1a6a6a c8f0e0 e8c040', wings: 'bug', ant: 'fork', eyes: 'round', mouth: 'none', scene: 'WIND', v: 1 },
  },
  {
    id: 'ygo-mrd-034',
    print: { level: 1, atk: 300, def: 200, type: 'Unterweltler' },
    text: 'Wirf ab: 0 Schaden',
    art: { a: 'blob', c: '8a5a2a 5a3a1a c89060 5ab83a', crest: 'spiky', eyes: 'round', mouth: 'none', x: ['gloves'] },
  },
  {
    id: 'ygo-mrd-035',
    print: { level: 4, atk: 920, def: 1930, type: 'Unterweltler' },
    text: 'FLIPP: Zombie +200',
    art: { obj: 'crystal', c: '6a4a9a c8a0f0', x: ['smoke', 'glow'], v: 1 },
  },
  {
    id: 'ygo-mrd-036',
    print: { level: 5, atk: 1000, def: 2000, type: 'Aqua' },
    text: 'Opfer: halbe ATK',
    art: { a: 'biped', c: '6a9a4a 4a7a3a c8d8a0 8a5a32', back: 'shell', eyes: 'round', mouth: 'smile', n: 0.8, pose: 1 },
  },
  {
    id: 'ygo-mrd-037',
    print: { level: 4, atk: 1350, def: 1400, type: 'Unterweltler' },
    text: 'Angriff: 1 zur Hand',
    art: { fig: 'normal', skin: 'f4f0f0', hair: 'afro e83a3a', face: ['nose'], wear: 'suit e8c040 3a6ac8', eyes: 'narrow', mouth: 'open', pose: 'action' },
  },
  {
    id: 'ygo-mrd-038',
    print: { level: 6, atk: 1800, def: 2000, type: 'Zombie' },
    text: 'Zombies +100',
    art: { a: 'blob', c: 'f08a2a c8601a f8c060 e8c040', pat: 'stripes', eyes: 'angry', mouth: 'fang', x: ['wisp'] },
  },
  {
    id: 'ygo-mrd-039',
    print: { level: 3, atk: 1200, def: 900, type: 'Krieger' },
    text: 'Verteidigung: 1 tot',
    art: { fig: 'slim', skin: 'f4f0f0', hat: 'pointed e8a0c8', wear: 'suit e8a0c8 8ac8f0', pose: 'cast', eyes: 'closed', mouth: 'smile', scene: 'Psycho', v: 1 },
  },
  {
    id: 'ygo-mrd-040',
    print: { level: 3, atk: 900, def: 700, type: 'Krieger' },
    text: 'FLIPP: 500 je Z/F',
    art: { fig: 'slim', skin: 'f4d0b0', hair: 'bun 2a1a1a', wear: 'kimono c83a3a f0c040', prop: 'fan', pose: 'action', eyes: 'narrow', mouth: 'flat', scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrd-041',
    print: { level: 4, atk: 2200, def: 100, type: 'Insekt' },
    text: 'Angriff: Münzwurf',
    art: { a: 'insect', c: '8a3a2a 2a1a1a d88a5a e8c040', ant: 'fork', eyes: 'red', mouth: 'fang', scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrd-042',
    print: { level: 5, atk: 1600, def: 1300, type: 'Zombie' },
    text: 'Grab-Monster: +100',
    art: { fig: 'slim', skin: '8a7a9a', hair: 'wild 2a1a2a', wear: 'bare 8a7a9a e04a4a 3a2a3a', pose: 'action', eyes: 'glow', mouth: 'fang' },
  },
  {
    id: 'ygo-mrd-043',
    print: { level: 5, atk: 1600, def: 1500, type: 'Donner' },
    text: 'Abwerfen: 2 suchen',
    art: { a: 'serpent', c: 'c8d8f0 7a90c0 f0f8ff 4a8ae0', crest: 'spiky', tail: 'bolt', eyes: 'angry', mouth: 'fang', pose: 1, scene: 'Elektro', v: 1 },
  },
  {
    id: 'ygo-mrd-044',
    print: { level: 4, atk: 1400, def: 1300, type: 'Maschine' },
    text: 'Opfer: 500 Schaden',
    art: { fig: 'broad', skin: '7a5aa8', hat: 'helmet 7a5aa8', wear: 'armour 7a5aa8 e8c040 4a3a6a', prop: 'launcher', eyes: 'glow', mouth: 'none', scene: 'Elektro' },
  },
  {
    id: 'ygo-mrd-045',
    print: { level: 4, atk: 1800, def: 1000, type: 'Unterweltler' },
    text: 'Treffer: er zieht 2',
    art: { fig: 'broad', skin: 'c8584a', hair: 'bald', wear: 'shirt f0f0f0 c83a3a', prop: 'axe 98a4bc', eyes: 'narrow', mouth: 'grin' },
  },
  {
    id: 'ygo-mrd-046',
    print: { level: 4, atk: 2000, def: 800, type: 'Hexer' },
    text: 'Angriff: 1000 LP',
    art: { fig: 'slim', skin: '8a6ab0', hair: 'long e8e8f0', face: ['elf'], wear: 'dress 2a1a3a 9a4ae0', pose: 'cast', eyes: 'narrow', mouth: 'flat', x: ['aura'] },
  },
  {
    id: 'ygo-mrd-047',
    print: { level: 5, atk: 1550, def: 1800, type: 'Krieger' },
    text: 'Sumpf-Bruder: +500',
    art: { fig: 'giant', skin: 'c84a2a', wear: 'bare c84a2a f0a030', prop: 'club 3a2a2a', eyes: 'glow', mouth: 'fang', scene: 'FEUER', v: 1 },
  },
  {
    id: 'ygo-mrd-048',
    print: { level: 4, atk: 1100, def: 1200, type: 'Hexer' },
    text: 'Grab: Karte suchen',
    art: { fig: 'slim', skin: 'a8b8a0', hat: 'hood 2a2a3a', wear: 'robe 2a2a3a 6ae070', pose: 'cast', eyes: 'glow', mouth: 'grin', scene: 'Pflanze', v: 1 },
  },
  {
    id: 'ygo-mrd-049',
    print: { level: 2, atk: 600, def: 550, type: 'Ungeheuer' },
    text: 'FEUER +500 ATK',
    art: { a: 'quad', c: 'e8a040 b8702a f8d8a0 f06a1e', crest: 'flame', horn: 'back', tail: 'plain', eyes: 'angry', mouth: 'open', n: 4, v: 1 },
  },
  {
    id: 'ygo-mrd-050',
    print: { level: 2, atk: 550, def: 500, type: 'Hexer' },
    text: 'FINSTERNIS +500',
    art: { fig: 'small', skin: 'f4d0b0', hair: 'pony c84a2a', hat: 'pointed 2a1a3a', wear: 'dress 2a1a3a 9a4ae0', prop: 'staff 8a5a32', pose: 'cast', mouth: 'smile', scene: 'Psycho', v: 1 },
  },
  {
    id: 'ygo-mrd-051',
    print: { level: 7, atk: 2600, def: 2200, type: 'Maschine' },
    text: 'Münzwurf: 1 tot',
    art: { a: 'biped', c: '6a6a7a 3a3a48 a8a8b8 f0a030', wings: 'spiky', horn: 'spike', tail: 'plain', eyes: 'red', mouth: 'open', x: ['claws'], n: 0.6, pose: 1, scene: 'Elektro' },
  },
  {
    id: 'ygo-mrd-052',
    print: { level: 1, atk: 0, def: 100, type: 'Hexer' },
    text: 'Grab: Kampfende',
    art: { fig: 'slim', skin: 'f4e0d0', hair: 'long e8d8a0', wear: 'dress d8d8e8 a8a8c0', eyes: 'closed', mouth: 'flat', scene: 'WASSER', v: 1 },
  },

  // ── fusion monsters ──
  {
    id: 'ygo-mrd-053',
    print: { level: 6, atk: 2100, def: 1800, type: 'Aqua' },
    art: { a: 'serpent', c: '3a9a8a 2a6a6a b0e8d8 f0c860', crest: 'fins', tail: 'curl', eyes: 'angry', mouth: 'open', pose: 1 },
  },
  {
    id: 'ygo-mrd-054',
    print: { level: 7, atk: 2300, def: 2000, type: 'Hexer' },
    art: { fig: 'broad', skin: 'f4f0f0', hair: 'afro 3ab0e0', face: ['nose'], wear: 'suit c83a5a f0e040', pose: 'cast', eyes: 'narrow', mouth: 'grin', x: ['aura'] },
  },
  {
    id: 'ygo-mrd-055',
    print: { level: 5, atk: 1750, def: 1500, type: 'Hexer' },
    art: { fig: 'normal', skin: 'f0c8a0', hair: 'spiky f0e040', face: ['shades'], wear: 'open 3a3a48 e83a8a', prop: 'staff e83a8a', pose: 'action', mouth: 'open', scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrd-056',
    print: { level: 7, atk: 2800, def: 2100, type: 'Donner' },
    art: { a: 'biped', c: '7a8ab0 4a5a80 c8d0e8 f0e040', wings: 'spiky', tail: 'bolt', ant: 'fork', eyes: 'red', mouth: 'fang', n: 0.8, pose: 1, scene: 'Elektro', v: 1 },
  },
  {
    id: 'ygo-mrd-057',
    print: { level: 7, atk: 2650, def: 2250, type: 'Hexer' },
    art: { fig: 'normal', skin: 'e8e0cc', hat: 'horns', wear: 'robe 3a2a4a 9a5ae0', cape: '2a1a3a', prop: 'staff 9a5ae0', pose: 'cast', eyes: 'glow', mouth: 'fang', v: 1 },
  },

  // ── spells ──
  {
    id: 'ygo-mrd-058',
    text: 'Beschwöre Harpyie oder Harpyien-Schwestern.',
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'wild 9a4ad0', wear: 'dress 2a7a6a e8c040', prop: 'shield d8e8f8', x: ['wings'], eyes: 'closed', mouth: 'smile' },
  },
  { id: 'ygo-mrd-059', text: 'Wirf 1 Karte ab: Zerstöre 1 Monster.', art: { obj: 'hand', c: 'e8dcc0 8a7a5a', x: ['smoke'], scene: 'FINSTERNIS' } },
  { id: 'ygo-mrd-060', text: 'Entferne bis zu 5 Karten aus den Friedhöfen.', art: { a: 'blob', c: 'e8f0f8 b8c8e0 ffffff', n: 3, eyes: 'closed', mouth: 'smile', x: ['wisp'], scene: 'FINSTERNIS' } },
  { id: 'ygo-mrd-061', text: 'Wirf bis zu 3 Monster von der Hand ab.', art: { obj: 'coffin', x: ['sparks', 'rays'] } },
  { id: 'ygo-mrd-062', text: 'Beide Spieler opfern 1 Monster.', art: { obj: 'chains', x: ['bolts'] } },
  { id: 'ygo-mrd-063', text: 'Zerstöre alle Zauber- und Fallenkarten.', art: { obj: 'gust', c: 'd8e4f0 4a5a6a', x: ['bolts'], v: 1 } },

  // ── traps ──
  { id: 'ygo-mrd-064', text: 'Schützt deine anderen Fallen vor Zerstörung.', art: { obj: 'pit', c: '8a6a4a f0d040', x: ['sparks'] } },
  {
    id: 'ygo-mrd-065',
    text: 'Wirf 1 Karte ab: Annulliere 1 Zauberkarte.',
    art: { fig: 'normal', skin: 'e8c098', hat: 'hood 4a2a6a', wear: 'robe 4a2a6a 4ae0e0', pose: 'cast', eyes: 'glow', mouth: 'flat', x: ['aura'] },
  },
  { id: 'ygo-mrd-066', text: 'Zahle 1000 LP: Annulliere 1 Fallenkarte.', art: { fig: 'slim', skin: 'e0b088', hat: 'bandana 2a2a3a', face: ['mask'], wear: 'coat 4a3a2a c8a040', prop: 'katana', pose: 'action', eyes: 'narrow', mouth: 'grin' } },
  { id: 'ygo-mrd-067', text: 'Opfere 1 Monster: Annulliere 1 Beschwörung.', art: { obj: 'fangs', c: 'f0c840 8a5a10', x: ['rays', 'glow'], scene: 'LICHT' } },
  {
    id: 'ygo-mrd-068',
    text: 'Bei Kampfschaden wirft der Gegner 1 Karte ab.',
    art: { fig: 'small', skin: '8ab84a', hair: 'bald', hat: 'bandana 3a3a48', face: ['nose', 'elf'], wear: 'shirt 6a4a2a c8a040', prop: 'club 8a5a32', pose: 'action', eyes: 'narrow', mouth: 'grin' },
  },

  // ── Alternative: a second artwork of the same card ──
  {
    id: 'ygo-mrd-069',
    print: { level: 3, atk: 1200, def: 700, type: 'Drache' },
    art: { a: 'biped', c: 'f09a3a c8702a f8d8a0 8a4ac0', wings: 'small', tail: 'plain', horn: 'nub', belly: 'patch', eyes: 'closed', mouth: 'smile', flip: true, scene: 'WIND', v: 1 },
  },
  {
    id: 'ygo-mrd-070',
    print: { level: 7, atk: 2600, def: 2200, type: 'Maschine' },
    text: 'Münzwurf: 1 tot',
    art: { a: 'quad', c: '4a4a58 2a2a34 8a8a98 f0a030', horn: 'spike', tail: 'plain', eyes: 'red', mouth: 'fang', n: 7, flip: true, scene: 'FEUER' },
  },
  {
    id: 'ygo-mrd-071',
    print: { level: 4, atk: 1300, def: 1400, type: 'Geflügeltes Ungeheuer' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'wild 9a4ad0', wear: 'dress 2a7a6a e8c040', x: ['wings'], eyes: 'closed', mouth: 'smile', flip: true, scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrd-072',
    print: { level: 1, atk: 300, def: 200, type: 'Unterweltler' },
    text: 'Wirf ab: 0 Schaden',
    art: { a: 'blob', c: '8a5a2a 5a3a1a c89060 5ab83a', n: 3, crest: 'spiky', eyes: 'round', mouth: 'smile', scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrd-073',
    print: { level: 7, atk: 2400, def: 2000, type: 'Drache' },
    art: { a: 'quad', c: '8aa070 5a7a4a d8e0b8 f0f0e0', wings: 'small', horn: 'back', crest: 'mane', tail: 'plain', eyes: 'closed', mouth: 'none', x: ['whiskers'], n: 4, scene: 'Kampf', v: 1 },
  },
  { id: 'ygo-mrd-074', text: 'Zahle die Hälfte deiner LP: Annulliere 1 Karte.', art: { obj: 'bolt', c: 'f8f0d0 ffffff', x: ['bolts', 'glow'], scene: 'Elektro', v: 1 } },
  {
    id: 'ygo-mrd-075',
    print: { level: 2, atk: 500, def: 400, type: 'Hexer' },
    text: 'Münzwurf: alle tot',
    art: { fig: 'small', skin: 'f4d0b0', hat: 'pointed 7a3ab0', wear: 'robe 7a3ab0 e8c040', prop: 'orb e8c040', pose: 'cast', eyes: 'round', mouth: 'open', x: ['aura'], scene: 'Psycho', v: 1 },
  },
  {
    id: 'ygo-mrd-076',
    text: 'Übernimm 1 Monster des Gegners für 1 Zug.',
    art: { fig: 'slim', skin: 'f4d0b0', hair: 'long f0e8f8', wear: 'dress f0f0f8 2a1a2a', x: ['wings'], flip: true, eyes: 'closed', mouth: 'smile', v: 1 },
  },
  { id: 'ygo-mrd-077', text: 'Zerstöre alle angreifenden Monster.', art: { obj: 'crystal', c: 'b8e8f8 ffffff', x: ['rays', 'sparks'], v: 1 } },
  {
    id: 'ygo-mrd-078',
    print: { level: 9, atk: 3200, def: 2500, type: 'Drache' },
    art: { a: 'quad', c: '2a2430 1a1620 5a4a60 d82a2a', belly: 'skull', wings: 'spiky', horn: 'spike', tail: 'plain', eyes: 'red', mouth: 'fang', n: 6, pose: 1, scene: 'FEUER', v: 1 },
  },
  {
    id: 'ygo-mrd-079',
    print: { level: 11, atk: 3750, def: 3400, type: 'Krieger' },
    text: 'Opfere die 3 Teile',
    art: { fig: 'giant', skin: 'e8c040', hat: 'helmet e8c040', wear: 'armour 4aa05a e8c040 3a6ac8', pose: 'cross', eyes: 'glow', mouth: 'none', x: ['aura'], scene: 'Elektro', v: 1 },
  },
  {
    id: 'ygo-mrd-080',
    print: { level: 6, atk: 2500, def: 1200, type: 'Unterweltler' },
    art: { a: 'biped', c: '4a4452 2a2430 e8e0cc c83a3a', wings: 'spiky', horn: 'spike', belly: 'skull', eyes: 'red', mouth: 'fang', x: ['claws'], n: 0.6, pose: 1, scene: 'Order' },
  },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
