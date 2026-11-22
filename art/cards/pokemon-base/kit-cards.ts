import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card of the Basis-Set below Ultra that has no hand-made art, as compact kit specs
 * (format: art/kit/index.ts). Attacks: 'Name:COST:DAMAGE|…' with F W P E Y K C as energy letters.
 */
const SPECS: readonly KitSpec[] = [
  { id: 'pkm-base-001', hp: 40, attacks: 'Egelsamen:PP:20', art: { a: 'quad', c: '78c8a8 4a9a48 a8e0c8 c8383c', back: 'bulb', ears: 'point', eyes: 'red', pat: 'spots', n: 5 } },
  { id: 'pkm-base-003', hp: 40, attacks: 'Fadenschuss:P:10', art: { a: 'larva', c: '78b848 4a8a30 f0e070 e83a2a', ant: 'fork', s: 0.9 } },
  { id: 'pkm-base-004', hp: 70, attacks: 'Härtner:CC|Stachelspore:PP:20', art: { a: 'cocoon', c: '70b048', pose: 1, eyes: 'narrow', mouth: 'none' } },
  { id: 'pkm-base-011', hp: 50, attacks: 'Smog:PP:10', art: { a: 'blob', c: '8a6cb8 6a4a98 f0e8c8 c8d860', pat: 'bumps', belly: 'skull', x: ['fumes'], mouth: 'fang' } },
  { id: 'pkm-base-012', hp: 50, attacks: 'Kratzer:C:10|Glut:FC:30', art: { a: 'biped', c: 'f08a3c c05a28 f8d888 f06a1e', tail: 'flame', belly: 'patch' } },
  { id: 'pkm-base-014', hp: 50, attacks: 'Konfusstrahl:FF:10', art: { a: 'quad', c: 'd0683a a84a2a f0c890 f0904a', tail: 'fan6', ears: 'point', crest: 'curl', n: 6, s: 0.9 } },
  { id: 'pkm-base-019', hp: 40, attacks: 'Blubber:W:10|Panzerschutz:WC', art: { a: 'biped', c: '78bce8 b07a3a f0d898', back: 'shell', tail: 'curl', belly: 'patch' } },
  { id: 'pkm-base-024', hp: 40, attacks: 'Klaps:W:20', art: { a: 'star', c: 'c89848 a07030 f0d070 e8303c', scene: 'Wasser', v: 1 } },
  { id: 'pkm-base-026', hp: 30, attacks: 'Tackle:C:10|Platscher:W:10×', art: { a: 'fish', c: 'e8603a c84a2a f8d0a0 f8e0a0', eyes: 'vacant', mouth: 'open', x: ['whiskers'] } },
  { id: 'pkm-base-044', hp: 50, attacks: 'Fußkick:K:20', art: { a: 'humanoid', c: '98a8c0 6a7890 c8d0dc', crest: 'ridge', eyes: 'angry', belly: 'patch' } },
  { id: 'pkm-base-049', hp: 40, attacks: 'Wirbelwind:CC:10', art: { a: 'bird', c: 'b0804a 8a5a30 f0d8a8 e8a0a0', wings: 'bird', belly: 'patch', crest: 'plume' } },
  { id: 'pkm-base-055', hp: 40, attacks: 'Pfund:C:10', art: { a: 'serpent', c: '6aa0e8 4a70c0 f4f0f8', ears: 'fin', scene: 'Wasser' } },
  { id: 'pkm-base-072', text: 'Heile 20 Schaden bei einem deiner Pokémon.', art: { item: 'bottle', c: '9a5ac8', bg: 'b8d8f0 5a9a40' } },
  { id: 'pkm-base-080' },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
