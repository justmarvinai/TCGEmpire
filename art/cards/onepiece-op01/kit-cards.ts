import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { cost, power, life, counter, type } (frame: art/frames/onepiece.ts).
 */
const SPECS: readonly KitSpec[] = [
  {
    id: 'op01-004',
    print: { cost: 2, power: 3000, type: 'Straw Hat Crew' },
    art: { fig: 'slim', skin: 'c08850', hair: 'wild 1c1418', face: ['nose', 'goggles'], wear: 'shirt c89a58 6a4a30 6a4a30', prop: 'slingshot', pose: 'action' },
  },
  {
    id: 'op01-012',
    print: { cost: 1, power: 2000, type: 'Straw Hat Crew' },
    art: { fig: 'slim', skin: 'f8c8a0', hair: 'long f08030', wear: 'shirt f8f8f8 3a6ab0 3a6ab0', prop: 'staff 4a8ad8' },
  },
  {
    id: 'op01-045',
    print: { cost: 4, power: 5000, type: 'Fish-Man/Arlong Pirates' },
    art: { fig: 'broad', skin: '7aa8d0', hair: 'short 2a2a3a', face: ['saw'], mouth: 'fang', eyes: 'angry', wear: 'open f0e8d0 3a8a5a 6a4a30', prop: 'greatsword' },
  },
  { id: 'op01-075', print: { cost: 2 }, art: { obj: 'club', x: ['bolts', 'streak'] } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
