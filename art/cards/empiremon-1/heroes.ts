import type { CardDef } from '../types.ts'
import { abgrundwal } from './abgrundwal.ts'
import { gewitterhirsch } from './gewitterhirsch.ts'
import { imperadon } from './imperadon.ts'
import { mondkaiserin } from './mondkaiserin.ts'
import { vulkanwolf } from './vulkanwolf.ts'

/** Ultra and Grail cards of this set, one hand-made file each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [vulkanwolf, gewitterhirsch, abgrundwal, imperadon, mondkaiserin]
