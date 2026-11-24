import type { CardDef } from '../types.ts'
import { derPuenktliche } from './der-puenktliche.ts'
import { schnellzugphoenix } from './schnellzugphoenix.ts'
import { signalstoerung } from './signalstoerung.ts'
import { stellwerkGolem } from './stellwerk-golem.ts'
import { zugausfallHydra } from './zugausfall-hydra.ts'

/** Ultra and Grail cards of this set, one hand-made full art each (docs/ART_DIRECTION.md §7, P1). */
export const HEROES: readonly CardDef[] = [zugausfallHydra, stellwerkGolem, schnellzugphoenix, signalstoerung, derPuenktliche]
