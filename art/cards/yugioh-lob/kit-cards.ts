import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { level, atk, def, type } for monsters.
 */
const SPECS: readonly KitSpec[] = [
  {
    id: 'ygo-lob-005',
    print: { level: 4, atk: 1400, def: 1200, type: 'Krieger' },
    art: { fig: 'slim', skin: 'f0c8a0', hair: 'long f0e098', face: ['elf'], wear: 'armour 3a8a4a c89a40 5a4a3a', prop: 'sword', eyes: 'angry', mouth: 'flat' },
  },
  {
    id: 'ygo-lob-017',
    print: { level: 2, atk: 600, def: 700, type: 'Drache' },
    art: { a: 'biped', c: 'f0c838 d89a28 f8e8b0 f08030', wings: 'spiky', tail: 'plain', horn: 'nub', belly: 'patch', mouth: 'open', pose: 1, scene: 'WIND' },
  },
  { id: 'ygo-lob-074', text: 'Ziehe 2 Karten.', art: { obj: 'pot', x: ['face', 'cards', 'rays'] } },
  { id: 'ygo-lob-076', text: 'Beschwört der Gegner ein Monster mit 1000 oder mehr ATK: Zerstöre es.', art: { obj: 'pit', scene: 'ERDE' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
