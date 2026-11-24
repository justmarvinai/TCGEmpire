import type { CardDef } from '../types.ts'
import { aerodactyl } from './aerodactyl.ts'
import { arktos } from './arktos.ts'
import { dragoran } from './dragoran.ts'
import { gengar } from './gengar.ts'
import { lapras } from './lapras.ts'
import { lavados } from './lavados.ts'
import { zapdos } from './zapdos.ts'

/** Ultra and Grail cards of this set, hand-made, one file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [lavados, lapras, arktos, zapdos, aerodactyl, gengar, dragoran]
