import type { KitSpec } from '../../kit/index.ts'
import { kitCard } from '../../kit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Every card below Ultra, built from compact kit specs (format: art/kit/index.ts; docs/ART_DIRECTION.md
 * §7, P2). print: { energy, might, tag, domain2 } (frame: art/frames/riftbound.ts). Units hide their
 * bottom 17 art rows under the glass name bar (cover: 17), runes 18 under the floating plate.
 */
const SPECS: readonly KitSpec[] = [
  {
    id: 'rb-ogn-005',
    cover: 17,
    print: { energy: 4, might: 4, tag: 'Champion' },
    art: { fig: 'slim', skin: 'f4d8d0', hair: 'braids 3a7ad8', wear: 'shirt 2a2a3a d84a8a 6a3a8a', prop: 'launcher', mouth: 'grin' },
  },
  { id: 'rb-ogn-018', cover: 18, art: { rune: true, v: 1 } },
  {
    id: 'rb-ogn-059',
    cover: 17,
    print: { energy: 2, might: 2, tag: 'Champion' },
    art: { fig: 'small', skin: 'd8a868', hair: 'short d8a868', hat: 'cap 6a8a3a', face: ['elf'], wear: 'shirt 6a8a3a 8a5a30', prop: 'pistol', mouth: 'grin', scene: 'Pflanze' },
  },
  { id: 'rb-ogn-076', art: { land: 'peak' } },
]

export const KIT_CARDS: readonly CardDef[] = SPECS.map(kitCard)
