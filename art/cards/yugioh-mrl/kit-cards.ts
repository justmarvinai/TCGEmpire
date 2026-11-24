import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). Briefs: docs/sets/yugioh-mrl.md. print: { level, atk, def, type } for monsters, with the
 * German types of the era (Hexer = spellcaster); Toons print 'Typ/Toon'. Texts fit the frame
 * (art/frames/yugioh.ts): one row under the type line of a monster, three rows on spells and traps.
 * Alternatives get another pose and scene than their base card.
 */
const SPECS: readonly KitSpec[] = [
  // ── normal monsters ──
  {
    id: 'ygo-mrl-001',
    print: { level: 5, atk: 1800, def: 1700, type: 'Fee' },
    art: { fig: 'slim', skin: 'f0d8c8', hair: 'long c8c8d8', hat: 'helmet 3a3a58', wear: 'armour 3a3a58 e8c040 2a2a40', prop: 'spear e8c040', x: ['wings'], eyes: 'narrow', mouth: 'flat', scene: 'WIND', v: 1 },
  },
  {
    id: 'ygo-mrl-002',
    print: { level: 5, atk: 1400, def: 1800, type: 'Aqua' },
    art: { a: 'biped', c: '5a8a6a 3a5a4a b8d0a0 f06a1e', back: 'shell', eyes: 'angry', mouth: 'open', n: 1, pose: 1, scene: 'FEUER', v: 1 },
  },
  {
    id: 'ygo-mrl-003',
    print: { level: 7, atk: 2000, def: 2300, type: 'Maschine' },
    art: { a: 'block', c: 'c8a040 8a6a2a f0e0a0 d83a3a', eyes: 'angry', pose: 1, s: 1.2 },
  },
  {
    id: 'ygo-mrl-004',
    print: { level: 4, atk: 1400, def: 1500, type: 'Aqua' },
    art: { fig: 'slim', skin: 'f0c8a8', hair: 'long 3a8ac8', wear: 'armour c83a3a e8c040 3ab0a0', prop: 'bow', pose: 'action', eyes: 'narrow', mouth: 'flat' },
  },
  {
    id: 'ygo-mrl-005',
    print: { level: 5, atk: 1600, def: 1400, type: 'Aqua' },
    art: { a: 'humanoid', c: 'c84a6a 8a2a4a f0a0b0 e8c040', x: ['arms4'], eyes: 'angry', mouth: 'open', n: 1, pose: 1 },
  },
  {
    id: 'ygo-mrl-006',
    print: { level: 5, atk: 0, def: 3000, type: 'Fels' },
    art: { a: 'block', c: '9a948a 6a6458 c8c0b0', eyes: 'narrow', s: 1.3, scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrl-007',
    print: { level: 7, atk: 2200, def: 2600, type: 'Drache' },
    art: { a: 'biped', c: 'd83a2a a82a1a f8c0a0 f0f0e0', wings: 'small', horn: 'back', tail: 'plain', belly: 'patch', eyes: 'angry', mouth: 'fang', n: 0.5, pose: 1 },
  },
  {
    id: 'ygo-mrl-008',
    print: { level: 7, atk: 2100, def: 2800, type: 'Drache' },
    art: { a: 'quad', c: 'b8e0f0 7ab0d0 f0f8ff 4a8ae0', wings: 'spiky', horn: 'spike', crest: 'ridge', tail: 'plain', eyes: 'angry', mouth: 'fang', n: 6, scene: 'WASSER', v: 1 },
  },
  {
    id: 'ygo-mrl-009',
    print: { level: 7, atk: 2350, def: 2400, type: 'Drache' },
    art: { a: 'serpent', c: '4a4a7a 2a2a4a 8a8ab8 d83a5a', crest: 'spiky', eyes: 'red', mouth: 'fang', scene: 'WIND', v: 1 },
  },

  // ── effect monsters ──
  {
    id: 'ygo-mrl-010',
    print: { level: 3, atk: 900, def: 800, type: 'Aqua' },
    text: 'Grab: Deck mischen',
    art: { a: 'bird', c: '2a2a3a 1a1a28 f0f0f8 f0a030', belly: 'patch', eyes: 'angry', x: ['lances'] },
  },
  {
    id: 'ygo-mrl-011',
    print: { level: 1, atk: 300, def: 350, type: 'Aqua' },
    text: 'Wechsel: 2000 LP',
    art: { a: 'blob', c: '6ab8e8 3a8ac8 c8e8f8', n: 2, eyes: 'round', mouth: 'smile' },
  },
  {
    id: 'ygo-mrl-012',
    print: { level: 4, atk: 1550, def: 1400, type: 'Hexer' },
    text: 'Je Ausrüstung +500',
    art: { fig: 'normal', skin: 'e8c098', hat: 'pointed 2a4aa8', wear: 'robe 2a4aa8 e8c040', cape: '4a7ad0', pose: 'cast', eyes: 'closed', mouth: 'flat', x: ['aura'] },
  },
  {
    id: 'ygo-mrl-013',
    print: { level: 4, atk: 950, def: 1500, type: 'Aqua' },
    text: 'FLIPP: 2x Kampf',
    art: { a: 'blob', c: 'e8f0f8 a8b8d0 ffffff 4a8ae8', crest: 'curl', eyes: 'round', mouth: 'smile', x: ['hands'] },
  },
  {
    id: 'ygo-mrl-014',
    print: { level: 2, atk: 650, def: 500, type: 'Unterweltler' },
    text: 'FLIPP: Er zieht 3',
    art: { a: 'blob', c: '6a5a8a 3a2a5a 9a8ab8 e8d040', n: 3, ears: 'point', eyes: 'angry', mouth: 'fang' },
  },
  {
    id: 'ygo-mrl-015',
    print: { level: 4, atk: 1350, def: 1700, type: 'Krieger' },
    text: 'FLIPP: Tauschen',
    art: { fig: 'broad', skin: 'e0b088', hat: 'helmet 6a5a4a', wear: 'armour 6a5a4a c8a040 3a3a48', prop: 'sword', pose: 'action', eyes: 'narrow', mouth: 'grin', scene: 'LICHT', v: 1 },
  },
  {
    id: 'ygo-mrl-016',
    print: { level: 7, atk: 1600, def: 3000, type: 'Krieger' },
    text: 'Nur via Labyrinth',
    art: { fig: 'slim', skin: '5a4a7a', hat: 'helmet 2a1a3a', wear: 'armour 2a1a3a 9a5ae0 1a1020', prop: 'katana b8a8e0', pose: 'action', eyes: 'glow', mouth: 'none', scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrl-017',
    print: { level: 7, atk: 2200, def: 2600, type: 'Drache/Toon' },
    text: 'Braucht Toon-Welt',
    art: { a: 'biped', c: 'f05a3a c83a2a f8d8b0 f0e040', wings: 'small', horn: 'nub', belly: 'patch', tail: 'plain', eyes: 'round', mouth: 'open', pose: 1, scene: 'LICHT' },
  },
  {
    id: 'ygo-mrl-018',
    print: { level: 2, atk: 200, def: 1000, type: 'Pyro' },
    text: 'Explodiert: Schaden',
    art: { obj: 'fruit', c: '2a2a34 f06a1e', x: ['face', 'sparks'], scene: 'FEUER' },
  },
  {
    id: 'ygo-mrl-019',
    print: { level: 3, atk: 900, def: 900, type: 'Fels' },
    text: 'FLIPP: Alles tot',
    art: { obj: 'pot', c: '8a9ab0 d83a3a', x: ['face', 'cards'] },
  },
  {
    id: 'ygo-mrl-020',
    print: { level: 3, atk: 100, def: 2000, type: 'Fee' },
    text: 'Grab-Karten weg',
    art: { fig: 'slim', skin: 'f4e0d0', hair: 'long f0e8c0', wear: 'robe f0f0f8 e8c040', prop: 'staff e8c040', x: ['wings', 'aura'], pose: 'cast', eyes: 'closed', mouth: 'flat' },
  },
  {
    id: 'ygo-mrl-021',
    print: { level: 4, atk: 1400, def: 1450, type: 'Ungeheuer' },
    text: 'Grab: ERDE rufen',
    art: { a: 'biped', c: '8a6a4a 5a4030 c8a888 e8a0a8', ears: 'round', tail: 'plain', eyes: 'red', mouth: 'fang', x: ['whiskers'], pose: 1, scene: 'ERDE', v: 1 },
  },
  {
    id: 'ygo-mrl-022',
    print: { level: 4, atk: 1400, def: 1000, type: 'Fee' },
    text: 'Holt Ritualmonster',
    art: { a: 'humanoid', c: 'e8b830 b8861c f8e8a0 f06a8a', x: ['arms4'], eyes: 'closed', mouth: 'smile', pose: 2 },
  },
  {
    id: 'ygo-mrl-023',
    print: { level: 4, atk: 1400, def: 1200, type: 'Maschine' },
    text: 'Grab: FEUER rufen',
    art: { a: 'biped', c: '8a9ab0 5a6a80 c8d8e8 f06a1e', back: 'shell', eyes: 'round', mouth: 'smile', n: 0.4, scene: 'Psycho', v: 1 },
  },
  {
    id: 'ygo-mrl-024',
    print: { level: 3, atk: 1000, def: 1000, type: 'Krieger' },
    text: 'ATK x2, dann tot',
    art: { fig: 'broad', skin: 'e0b088', hair: 'bald', wear: 'kimono f0f0f0 2a2a2a', prop: 'fists', pose: 'action', eyes: 'angry', mouth: 'open' },
  },
  {
    id: 'ygo-mrl-025',
    print: { level: 4, atk: 1800, def: 400, type: 'Ungeheuer' },
    text: 'Allein: Verteidigung',
    art: { a: 'quad', c: 'f0f0f8 3a2a4a ffffff 9a4ae0', pat: 'stripes', crest: 'mane', tail: 'plain', eyes: 'red', mouth: 'none', n: 8, pose: 1, scene: 'WIND', v: 1 },
  },
  {
    id: 'ygo-mrl-026',
    print: { level: 2, atk: 1000, def: 100, type: 'Unterweltler' },
    text: 'Grab: 500 + Keime',
    art: { obj: 'germs', c: '9a4ae0 f0e0a0', n: 3 },
  },
  {
    id: 'ygo-mrl-027',
    print: { level: 2, atk: 1000, def: 100, type: 'Ungeheuer' },
    text: 'Grab: +1000 LP',
    art: { a: 'quad', c: 'a8805a 7a5a3a e8d8c0', wings: 'small', ears: 'round', tail: 'fluff', eyes: 'round', mouth: 'smile', n: 3, pose: 1, scene: 'Pflanze' },
  },
  {
    id: 'ygo-mrl-028',
    print: { level: 2, atk: 500, def: 500, type: 'Unterweltler' },
    text: 'Grab: Beide rufen',
    art: { fig: 'small', skin: 'b8a8d8', hair: 'wild 3a2a4a', wear: 'shirt 5a3a6a 8a8a9a', cape: '8a2a3a', prop: 'spear 8a8a9a', eyes: 'round', mouth: 'open', scene: 'Psycho' },
  },
  {
    id: 'ygo-mrl-029',
    print: { level: 4, atk: 1400, def: 800, type: 'Fee' },
    text: 'Grab: LICHT rufen',
    art: { fig: 'normal', skin: 'f4d8c0', hair: 'spiky f0e8a0', wear: 'armour f0f0f8 e8c040 c8c8d8', prop: 'staff e8c040', x: ['wings', 'aura'], pose: 'action', mouth: 'flat' },
  },
  {
    id: 'ygo-mrl-030',
    print: { level: 4, atk: 1400, def: 1000, type: 'Ungeheuer-Krieger' },
    text: 'Grab: WASSER rufen',
    art: { a: 'biped', c: '4a6ab0 2a4a8a a8c0e8', ears: 'round', belly: 'patch', eyes: 'angry', mouth: 'fang', n: 1, pose: 1 },
  },
  {
    id: 'ygo-mrl-031',
    print: { level: 4, atk: 1400, def: 900, type: 'Insekt' },
    text: 'Grab: WIND rufen',
    art: { a: 'insect', c: '6ac04a 3a8a2a c8f0a0', wings: 'bug', ant: 'two', eyes: 'angry', mouth: 'fang', x: ['lances'] },
  },
  {
    id: 'ygo-mrl-032',
    print: { level: 4, atk: 1400, def: 1100, type: 'Pflanze' },
    text: 'Grab: FINSTERNIS',
    art: { obj: 'fruit', c: 'd83a2a 4a9a3a', x: ['face', 'glow'] },
  },

  // ── ritual monsters ──
  {
    id: 'ygo-mrl-033',
    print: { level: 6, atk: 1950, def: 1850, type: 'Krieger' },
    art: { fig: 'normal', skin: 'e8c098', hat: 'helmet 3a5aa8', wear: 'armour 3a5aa8 e8c040 2a2a48', cape: 'c83a3a', prop: 'katana2', pose: 'action', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-mrl-034',
    print: { level: 6, atk: 2000, def: 1850, type: 'Krieger' },
    art: { a: 'blob', c: 'e0a040 a86a2a 7a4020 f0e8c0', pat: 'spots', eyes: 'angry', mouth: 'fang', x: ['split'] },
  },
  {
    id: 'ygo-mrl-035',
    print: { level: 8, atk: 2550, def: 2500, type: 'Aqua' },
    art: { a: 'quad', c: 'd8603a a83a2a f8c0a0 6a8a4a', back: 'spikes', horn: 'spike', eyes: 'angry', mouth: 'fang', n: 4, s: 1.15 },
  },

  // ── spells ──
  { id: 'ygo-mrl-036', text: 'Ein Monster erhält 1000 ATK.', art: { obj: 'axe', c: '3a2a3a 8a2a2a', x: ['glow', 'smoke'] } },
  { id: 'ygo-mrl-037', text: '+500 ATK. Im Friedhof: 500 Schaden.', art: { obj: 'orb', c: '1a1020 6a3a9a', x: ['bolts', 'glow'] } },
  { id: 'ygo-mrl-038', text: 'Ein Monster erhält 700 ATK.', art: { a: 'blob', c: 'b85ab0 8a3a8a f0b0e8', eyes: 'narrow', mouth: 'smile', x: ['hands'] } },
  {
    id: 'ygo-mrl-039',
    text: 'Angriffe kosten den Gegner 1 Karte.',
    art: { fig: 'normal', skin: 'c8b8a0', hat: 'hood 2a2a3a', wear: 'robe 2a2a3a 6a4a8a', prop: 'orb f0c040', eyes: 'glow', mouth: 'flat', scene: 'FINSTERNIS' },
  },
  {
    id: 'ygo-mrl-040',
    text: 'Ziehe 1 Karte. Der Gegner erhält 1000 LP.',
    art: { fig: 'small', skin: '8ab84a', hair: 'bald', face: ['nose', 'elf'], wear: 'suit 3a3a48 e8c040', prop: 'fan', eyes: 'narrow', mouth: 'grin' },
  },
  { id: 'ygo-mrl-041', text: 'Angreifen kostet 500 LP.', art: { obj: 'hand', c: 'f0b888 3a6a3a', x: ['sparks'] } },
  { id: 'ygo-mrl-042', text: 'Wirf 5 Karten ab: Zerstöre alle Karten.', art: { obj: 'hourglass', c: '3a2a4a e8c890', x: ['smoke'] } },
  { id: 'ygo-mrl-043', text: 'Zahle 1000 LP: Sieh die Hand an, wirf 1 ab.', art: { obj: 'hand', c: 'f0f0f0 c83a30', x: ['glow', 'sparks'] } },
  {
    id: 'ygo-mrl-044',
    text: 'Ein Monster erhält 700 ATK.',
    art: { fig: 'normal', skin: 'e8c098', hair: 'spiky 6a3a1a', wear: 'armour 8a8ea0 c83a2a 4a4a5a', prop: 'sword', pose: 'action', eyes: 'angry', mouth: 'open' },
  },
  {
    id: 'ygo-mrl-045',
    text: 'Sieh die Hand an: 1 Karte zurück ins Deck.',
    art: { fig: 'broad', skin: 'e0b088', hat: 'helmet 8a6a3a', wear: 'armour 8a6a3a e8c040 4a3a2a', prop: 'spear', eyes: 'angry', mouth: 'flat' },
  },
  { id: 'ygo-mrl-046', text: 'Alle Zauber und Fallen zurück auf die Hand.', art: { obj: 'vortex', c: '3a4a6a b8d0f0', x: ['sparks'] } },
  { id: 'ygo-mrl-047', text: 'Wähle 5 Karten: Der Gegner gibt dir 1.', art: { obj: 'cards', n: 5, x: ['glow'] } },
  { id: 'ygo-mrl-048', text: 'Ritual für Aufgegeben.', art: { obj: 'eye', c: '8a3ad0 f0ecf4', x: ['glow', 'rays'], scene: 'FINSTERNIS' } },
  { id: 'ygo-mrl-049', text: 'Ein Monster erhält 700 ATK und 700 DEF.', art: { obj: 'crystal', c: 'f4f0f8 c8a8e8', x: ['glow', 'sparks'] } },
  { id: 'ygo-mrl-050', text: 'Ruft den Mauerschatten aus der Wand.', art: { land: 'warrens' } },
  { id: 'ygo-mrl-051', text: 'Weniger LP: ATK x2. Mehr LP: ATK halbiert.', art: { fig: 'giant', skin: 'e8b890', hat: 'helmet 8a3a2a', wear: 'armour 8a3a2a e8c040 3a2a2a', pose: 'cross', eyes: 'angry', mouth: 'flat', x: ['aura'] } },
  { id: 'ygo-mrl-052', text: 'Ritual für Auftritt des Schwerts.', art: { obj: 'flame', x: ['sparks'], v: 1 } },
  { id: 'ygo-mrl-053', text: 'Ritual für Hungriger Burger.', art: { obj: 'scroll', c: 'f0e4c0 c86a2a', x: ['glow'] } },
  { id: 'ygo-mrl-054', text: 'Ritual für Krebsschildkröte.', art: { a: 'biped', c: '6a9a4a 4a7a3a c8d8a0', back: 'shell', eyes: 'closed', mouth: 'smile', n: 0.3, scene: 'WASSER' } },
  { id: 'ygo-mrl-055', text: 'Zahle 1000 LP. Toons kommen ins Spiel.', art: { obj: 'book', c: 'e84a4a f8e050', x: ['rays', 'sparks'] } },
  { id: 'ygo-mrl-056', text: 'FINSTERNIS +500 ATK und -400 DEF.', art: { land: 'rift' } },
  {
    id: 'ygo-mrl-057',
    text: 'Monster ab 1500 ATK greifen nicht an.',
    art: { fig: 'slim', skin: 'f4d8c0', hair: 'long f0d890', wear: 'robe f0f0f8 6ac04a', prop: 'staff 6ac04a', x: ['wings'], eyes: 'closed', mouth: 'smile' },
  },

  // ── traps ──
  { id: 'ygo-mrl-058', text: 'Ein Monster kann nicht mehr angreifen.', art: { obj: 'chains', c: 'f0e080 b89a30', x: ['glow', 'rays'] } },
  { id: 'ygo-mrl-059', text: 'Ein Monster verliert 500 DEF.', art: { a: 'serpent', c: '6aa03a 3a7028 d8e8a0 f0f0e0', eyes: 'angry', mouth: 'fang', pose: 1 } },
  { id: 'ygo-mrl-060', text: 'Ein beschworenes Monster bis 500 DEF stirbt.', art: { obj: 'disc', c: 'f0e0a8 b89a60', x: ['glow'] } },
  { id: 'ygo-mrl-061', text: 'Ein beschworenes Monster bis 500 ATK stirbt.', art: { obj: 'pit', c: '6a2a2a f0e8d0', x: ['smoke'], scene: 'ERDE' } },

  // ── Alternative: a second artwork of the same card ──
  {
    id: 'ygo-mrl-062',
    print: { level: 6, atk: 2000, def: 1850, type: 'Krieger' },
    art: { a: 'blob', c: 'e0a040 a86a2a 7a4020 f0e8c0', pat: 'spots', eyes: 'narrow', mouth: 'open', x: ['split'], pose: 1, flip: true, scene: 'Psycho', v: 1 },
  },
  {
    id: 'ygo-mrl-063',
    print: { level: 3, atk: 900, def: 900, type: 'Fels' },
    text: 'FLIPP: Alles tot',
    art: { obj: 'pot', c: '8a9ab0 d83a3a', x: ['lid', 'sparks', 'rays'], scene: 'Elektro', v: 1 },
  },
  { id: 'ygo-mrl-064', text: 'Weniger LP: ATK x2. Mehr LP: ATK halbiert.', art: { fig: 'giant', skin: 'e8b890', hat: 'helmet 8a3a2a', wear: 'armour 8a3a2a e8c040 3a2a2a', pose: 'action', prop: 'greatsword', eyes: 'angry', mouth: 'open', flip: true, v: 1 } },
  {
    id: 'ygo-mrl-065',
    print: { level: 7, atk: 2350, def: 2400, type: 'Drache' },
    art: { a: 'serpent', c: '4a4a7a 2a2a4a 8a8ab8 d83a5a', crest: 'spiky', eyes: 'red', mouth: 'fang', pose: 1, flip: true, scene: 'FINSTERNIS' },
  },
  { id: 'ygo-mrl-066', text: 'Zahle 1000 LP. Toons kommen ins Spiel.', art: { obj: 'book', c: '3a8ae0 f0c040', x: ['glow', 'sparks'], flip: true, v: 1 } },
  {
    id: 'ygo-mrl-067',
    print: { level: 4, atk: 1400, def: 1500, type: 'Aqua/Toon' },
    text: 'Braucht Toon-Welt',
    art: { fig: 'slim', skin: 'f4d0b0', hair: 'long f07ab0', face: ['shades'], wear: 'dress 3ac0b0 f04a4a', pose: 'action', mouth: 'grin', scene: 'WASSER' },
  },
  { id: 'ygo-mrl-068', text: 'Zahle 1000 LP: Der Gegner wirft 2 Karten ab.', art: { a: 'blob', c: 'd83a3a 8a2a2a f0a0a0', n: 2, ears: 'point', eyes: 'narrow', mouth: 'fang', v: 1 } },
  { id: 'ygo-mrl-069', text: 'Übernimm 1 Monster. Gegner: +1000 LP.', art: { obj: 'fangs', c: 'b8c4d8 4e5870', x: ['sparks'] } },
  {
    id: 'ygo-mrl-070',
    print: { level: 6, atk: 2500, def: 1200, type: 'Unterweltler/Toon' },
    text: 'Braucht Toon-Welt',
    art: { a: 'biped', c: 'c8c0d8 8a80a0 f0ecf8 f04a4a', wings: 'spiky', horn: 'spike', belly: 'skull', eyes: 'round', mouth: 'open', n: 0.4, pose: 1, scene: 'LICHT' },
  },
  { id: 'ygo-mrl-071', text: 'Zerstöre 1 Zauber- oder Fallenkarte.', art: { obj: 'vortex', c: '1a4a2a 6ae08a', x: ['sparks'], scene: 'Psycho', v: 1 } },
  {
    id: 'ygo-mrl-072',
    print: { level: 1, atk: 0, def: 0, type: 'Hexer' },
    text: 'Saugt Monster auf',
    art: { a: 'biped', c: 'e8e0d0 a89a88 f8f4ec 8a3ad0', wings: 'spiky', eyes: 'cyclops', mouth: 'none', n: 0.2, v: 1 },
  },
  {
    id: 'ygo-mrl-073',
    print: { level: 8, atk: 3000, def: 2500, type: 'Drache/Toon' },
    text: 'Braucht Toon-Welt',
    art: { a: 'biped', c: 'f0f4fc b8c8e8 ffffff 3a8ae8', wings: 'spiky', horn: 'back', tail: 'plain', eyes: 'round', mouth: 'open', n: 0.4, pose: 1, flip: true, scene: 'Psycho' },
  },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
