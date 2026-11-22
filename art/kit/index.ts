import { pokemonBase } from '../../content/sets/pokemon-base.ts'
import type { CardData } from '../../content/types.ts'
import type { Attack, CardDef, CardKind, PokemonType } from '../cards/types.ts'
import type { Painter } from '../toolkit/index.ts'
import type { CreatureArt } from './creature.ts'
import { creature } from './creature.ts'
import type { ItemArt } from './items.ts'
import { energyArt, itemArt } from './items.ts'
import { HORIZON, scene, shadow } from './scene.ts'
import { Kit, palette } from './shape.ts'

/**
 * The card model for every card below Ultra: a compact spec becomes a normal `CardDef`. Name,
 * number, tier, kind and element come from the content catalog; the spec adds the printed values
 * and the art spec. Holo and Alternative cards shine on their scene, the subject stays matt.
 */
export type { CreatureArt } from './creature.ts'
export type { ItemArt } from './items.ts'

export interface EnergyArt {
  /** Two overlapping emblems (Doppel-Farblos-Energie). Plain energies need no art spec. */
  double: true
}

export interface CreatureCard extends CreatureArt {
  /** Scene element (default: the card's element) and variant: 0 day, 1 night. */
  scene?: PokemonType
  v?: 0 | 1
}

export interface KitSpec {
  id: string
  hp?: number
  /** 'Name:COST:DAMAGE|…'; cost letters F W P E Y K C = Feuer Wasser Pflanze Elektro Psycho Kampf Farblos. */
  attacks?: string
  text?: string
  art?: CreatureCard | ItemArt | EnergyArt
}

/** Card data of every set the kit can paint. */
const CATALOG = new Map<string, CardData>([pokemonBase].flatMap((s) => s.cards.map((c) => [c.id, c] as const)))

const TYPES: readonly PokemonType[] = ['Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Kampf', 'Farblos']
const COST: Readonly<Record<string, PokemonType>> = { F: 'Feuer', W: 'Wasser', P: 'Pflanze', E: 'Elektro', Y: 'Psycho', K: 'Kampf', C: 'Farblos' }

function typeOf(element: string | undefined): PokemonType | undefined {
  if (element === undefined) return undefined
  const t = TYPES.find((name) => element.startsWith(name))
  if (!t) throw new Error(`kit: unknown element ${element}`)
  return t
}

/** Parse 'Kratzer:C:10|Glut:FC:30'. */
export function parseAttacks(s: string): Attack[] {
  return s.split('|').map((entry) => {
    const [name = '', cost = '', damage = ''] = entry.split(':')
    const types = [...cost].map((ch) => {
      const t = COST[ch]
      if (!t) throw new Error(`kit: unknown cost ${ch} in ${entry}`)
      return t
    })
    return damage === '' ? { name, cost: types } : { name, cost: types, damage }
  })
}

/** Paint a creature, scaled down if it would not fit, centred, and declared as the subject. */
function paintCreature(p: Painter, art: CreatureCard, element: PokemonType): void {
  const pal = palette(art.c)
  const draw = (s: number) => {
    const d = p.layer()
    creature(new Kit(d, { x: 34, y: HORIZON + 12, s, flip: art.flip ?? false, rot: 0 }, pal), art)
    return d
  }
  let s = art.s ?? 1
  let d = draw(s)
  let box = bounds(d)
  const fit = Math.min(1, 62 / box.w, 45 / box.h)
  if (fit < 1) {
    s *= fit
    d = draw(s)
    box = bounds(d)
  }
  const dx = Math.round(34 - (box.x0 + box.x1 + 1) / 2)
  const dy = Math.max(0, 2 - box.y0)
  const moved = p.layer().blit(d, dx, dy)
  if (box.y1 < HORIZON + 9) shadow(p, art.scene ?? element, art.v ?? 0, 34, HORIZON + 11, (box.x1 - box.x0) * 0.3)
  p.subject(moved, pal.line)
}

function bounds(d: Painter): { x0: number; y0: number; x1: number; y1: number; w: number; h: number } {
  let [x0, y0, x1, y1] = [d.w, d.h, -1, -1]
  d.mask().each((x, y) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  })
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Build a card from its kit spec. */
export function kitCard(spec: KitSpec): CardDef {
  const data = CATALOG.get(spec.id)
  if (!data) throw new Error(`kit: unknown card ${spec.id}`)
  if (data.kind !== 'pokemon' && data.kind !== 'trainer' && data.kind !== 'energy') throw new Error(`kit: no frame for ${data.kind}`)
  const kind: CardKind = data.kind
  const type = typeOf(data.element)
  const shiny = data.tier === 'holo' || data.tier === 'alternative'
  const art = spec.art ?? {}
  return {
    id: spec.id,
    number: data.no,
    name: data.name.replace(/\s*\([^)]*\)$/, ''),
    tier: data.tier,
    kind,
    ...(type ? { type } : {}),
    ...(spec.hp !== undefined ? { hp: spec.hp } : {}),
    ...(spec.attacks ? { attacks: parseAttacks(spec.attacks) } : {}),
    ...(spec.text !== undefined ? { text: spec.text } : {}),
    foil: shiny ? 'painted' : 'none',
    draw(p) {
      if (kind === 'energy') return energyArt(p, type ?? 'Farblos', 'double' in art && art.double === true)
      if (kind === 'trainer') return itemArt(p, art as ItemArt)
      const c = art as CreatureCard
      p.shine(shiny)
      scene(p, c.scene ?? type ?? 'Farblos', c.v ?? 0)
      p.shine(false)
      paintCreature(p, c, type ?? 'Farblos')
    },
  }
}
