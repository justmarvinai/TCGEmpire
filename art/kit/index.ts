import { SETS as CONTENT_SETS } from '../../content/catalog.ts'
import type { CardData, Game } from '../../content/types.ts'
import type { Attack, CardDef, PokemonType } from '../cards/types.ts'
import type { Painter } from '../toolkit/index.ts'
import type { CreatureArt } from './creature.ts'
import { creature } from './creature.ts'
import type { FigureArt } from './figure.ts'
import { figure } from './figure.ts'
import type { ItemArt } from './items.ts'
import { energyArt, itemArt } from './items.ts'
import type { LandArt, RuneArt } from './land.ts'
import { isDomain, landArt, runeArt } from './land.ts'
import type { ObjectArt } from './object.ts'
import { FLOATING, object, objectEffects, objectLine } from './object.ts'
import type { SceneKey } from './scene.ts'
import { brighten, isScene, scene, shadow } from './scene.ts'
import { Kit, palette } from './shape.ts'
import { place } from './stage.ts'

/**
 * The card model for every card below Ultra: a compact spec becomes a normal `CardDef`. Name
 * (without a trailing " (…)" suffix), number, tier, kind, element and sub come from the content
 * catalog; the spec adds the printed values and the art. Holo and Alternative cards shine on their
 * scene, the subject stays matt. The art fits any art-window size the card's frame asks for.
 *
 *   { id, print?, text?, hp?, attacks?, art? }
 *
 *   print    printed values for the frame of the card's game, copied to CardDef.print:
 *            Yu-Gi-Oh! { level, atk, def, type } e.g. { level: 4, atk: 1400, def: 1200, type: 'Krieger' };
 *            One Piece { cost, power, life, counter, type }; Riftbound { energy, might, tag, domain2 }
 *   text     rules text of cards that print it
 *   cover    rows at the bottom of the art window that the frame covers (e.g. a glass name bar);
 *            the subject stands above them, the ground continues underneath. Default 0.
 *   hp, attacks   Pokémon only: 'Name:COST:DAMAGE|…', cost letters F W P E Y K C
 *   art      one of (the key in front tells which):
 *            { a: … }      creature: monsters, beasts, dragons, poros (art/kit/creature.ts)
 *            { fig: … }    figure: people and humanoids (art/kit/figure.ts)
 *            { obj: … }    object: spells, traps, gear, events (art/kit/object.ts)
 *            { rune: true }  rune stone of the card's domain (art/kit/land.ts)
 *            { land: … }   landscape without a subject: battlefields, field spells (art/kit/land.ts)
 *            { item: … }, { double: true }   Pokémon trainers and energies (art/kit/items.ts)
 *
 * Creatures, figures, objects and runes stand in a scene: `scene` picks it (default: the card's
 * element; the first colour of a One Piece dual colour, the second tints the sky; spells without an
 * element 'Zauber', traps 'Falle') and `v` its variant (0 day, 1 night). Scenes: Pokémon types
 * (Feuer, Wasser, Pflanze, Elektro, Psycho, Kampf, Farblos), Yu-Gi-Oh! attributes (LICHT,
 * FINSTERNIS, ERDE, WASSER, FEUER, WIND), One Piece colours (Rot, Grün, Blau, Lila), Riftbound
 * domains (Fury, Calm, Mind, Body, Chaos, Order), Zauber, Falle. Empiremon elements use the Pokémon
 * type scenes (Glut Feuer, Flut Wasser, Kraut Pflanze, Strom Elektro, Beton Kampf, Spuk Psycho).
 */
export type { CreatureArt } from './creature.ts'
export type { FigureArt } from './figure.ts'
export type { ItemArt } from './items.ts'
export type { LandArt, RuneArt } from './land.ts'
export type { ObjectArt } from './object.ts'
export type { SceneKey } from './scene.ts'

export interface EnergyArt {
  /** Two overlapping emblems (Doppel-Farblos-Energie). Plain energies need no art spec. */
  double: true
}

interface Staged {
  /** Scene (default: from the card's element) and variant: 0 day, 1 night. */
  scene?: SceneKey
  v?: 0 | 1
}

export interface CreatureCard extends CreatureArt, Staged {}
export interface FigureCard extends FigureArt, Staged {}
export interface ObjectCard extends ObjectArt, Staged {}
export interface RuneCard extends RuneArt, Staged {}

export interface KitSpec {
  id: string
  cover?: number
  hp?: number
  /** 'Name:COST:DAMAGE|…'; cost letters F W P E Y K C = Feuer Wasser Pflanze Elektro Psycho Kampf Farblos. */
  attacks?: string
  text?: string
  print?: Readonly<Record<string, string | number>>
  art?: CreatureCard | FigureCard | ObjectCard | RuneCard | LandArt | ItemArt | EnergyArt
}

/** Card data of every set the kit can paint, with the game of its set. */
const CATALOG = new Map<string, { data: CardData; game: Game }>(
  CONTENT_SETS.flatMap((s) => s.cards.map((c) => [c.id, { data: c, game: s.game }] as const)),
)

const TYPES: readonly PokemonType[] = ['Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Kampf', 'Farblos']
const COST: Readonly<Record<string, PokemonType>> = { F: 'Feuer', W: 'Wasser', P: 'Pflanze', E: 'Elektro', Y: 'Psycho', K: 'Kampf', C: 'Farblos' }
/** Figures and objects fill a little more of the window than creatures of the same size. */
const FIGURE_SIZE = 1.12
const OBJECT_SIZE = 1.35

function typeOf(element: string | undefined): PokemonType | undefined {
  if (element === undefined) return undefined
  const t = TYPES.find((name) => element.startsWith(name))
  if (!t) throw new Error(`kit: unknown element ${element}`)
  return t
}

/** Empiremon elements borrow the Pokémon type scenes. */
const EMPIREMON_SCENES: Readonly<Record<string, SceneKey>> = {
  Glut: 'Feuer',
  Flut: 'Wasser',
  Kraut: 'Pflanze',
  Strom: 'Elektro',
  Beton: 'Kampf',
  Spuk: 'Psycho',
}

/** Home scene of a card and, for One Piece dual colours, the second colour. */
function scenesOf(game: Game, data: CardData): [SceneKey, SceneKey | undefined] {
  if (game === 'pokemon') return [typeOf(data.element) ?? 'Farblos', undefined]
  if (game === 'empiremon') return [EMPIREMON_SCENES[data.element ?? ''] ?? 'Farblos', undefined]
  const [first = '', second] = (data.element ?? '').split('/')
  if (isScene(first)) return [first, second !== undefined && isScene(second) ? second : undefined]
  if (data.kind === 'trap') return ['Falle', undefined]
  return [data.kind === 'spell' ? 'Zauber' : 'Farblos', undefined]
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
function paintCreature(p: Painter, art: CreatureCard, element: SceneKey, cover: number, whole: boolean): void {
  const pal = palette(art.c)
  place(p, (d, x, y, s) => creature(new Kit(d, { x, y, s, flip: art.flip ?? false, rot: 0 }, pal), art), {
    s: art.s ?? 1,
    line: pal.line,
    cover,
    whole,
    shadow: (x, y, rx) => shadow(p, art.scene ?? element, art.v ?? 0, x, y, rx),
  })
}

function paintFigure(p: Painter, art: FigureCard, cover: number): void {
  const pal = palette(art.wear.split(' ')[1] ?? '8a8a9a')
  place(p, (d, x, y, s) => figure(new Kit(d, { x, y, s, flip: art.flip ?? false, rot: 0 }, pal), art), {
    s: (art.s ?? 1) * FIGURE_SIZE,
    line: pal.line,
    cover,
    whole: true,
  })
}

function paintObject(p: Painter, art: ObjectCard, key: SceneKey, shiny: boolean, cover: number): void {
  const v = art.v ?? 0
  place(p, (d, x, y, s) => object(new Kit(d, { x, y, s, flip: art.flip ?? false, rot: 0 }, palette('888888')), art), {
    s: (art.s ?? 1) * OBJECT_SIZE,
    line: objectLine(art),
    anchor: FLOATING.has(art.obj) ? 'mid' : 'foot',
    shine: shiny,
    cover,
    whole: true,
    under: (box, s) => objectEffects(p, art, box, s, (m) => brighten(p, key, v, m)),
  })
}

/** Build a card from its kit spec. */
export function kitCard(spec: KitSpec): CardDef {
  const entry = CATALOG.get(spec.id)
  if (!entry) throw new Error(`kit: unknown card ${spec.id}`)
  const { data, game } = entry
  const kind = data.kind
  const type = game === 'pokemon' ? typeOf(data.element) : undefined
  const shiny = data.tier === 'holo' || data.tier === 'alternative'
  const art = spec.art
  const cover = spec.cover ?? 0
  const [home, second] = scenesOf(game, data)
  if (!art && kind !== 'energy' && kind !== 'rune') throw new Error(`kit: ${spec.id} needs an art spec`)
  return {
    id: spec.id,
    number: data.no,
    name: data.name.replace(/\s+\([^)]*\)$/, ''),
    tier: data.tier,
    kind,
    ...(type ? { type } : {}),
    ...(data.element !== undefined ? { element: data.element } : {}),
    ...(data.sub !== undefined ? { sub: data.sub } : {}),
    ...(spec.print ? { print: spec.print } : {}),
    ...(spec.hp !== undefined ? { hp: spec.hp } : {}),
    ...(spec.attacks ? { attacks: parseAttacks(spec.attacks) } : {}),
    ...(spec.text !== undefined ? { text: spec.text } : {}),
    foil: shiny ? 'painted' : 'none',
    draw(p) {
      if (!art || 'double' in art) {
        if (kind === 'energy') return energyArt(p, type ?? 'Farblos', art !== undefined)
        return paintRune(p, {}, home, shiny, cover)
      }
      if ('item' in art) return itemArt(p, art)
      if ('land' in art) return landArt(p, art, shiny)
      const key = art.scene ?? home
      p.shine(shiny)
      scene(p, key, art.v ?? 0, art.scene ? undefined : second, cover)
      p.shine(false)
      if ('a' in art) return paintCreature(p, art, home, cover, game !== 'pokemon')
      if ('fig' in art) return paintFigure(p, art, cover)
      if ('obj' in art) return paintObject(p, art, key, shiny, cover)
      runeArt(p, art, domainOf(data), (m) => brighten(p, key, art.v ?? 0, m), shiny, cover)
    },
  }
}

function domainOf(data: CardData) {
  const d = data.element?.split('/')[0]
  if (!isDomain(d)) throw new Error(`kit: rune ${data.id} has no domain`)
  return d
}

/** A rune card without an art spec: the rune of its domain on its domain scene. */
function paintRune(p: Painter, art: Partial<RuneCard>, home: SceneKey, shiny: boolean, cover: number): void {
  const key = art.scene ?? home
  p.shine(shiny)
  scene(p, key, art.v ?? 0, undefined, cover)
  p.shine(false)
  if (!isDomain(home)) throw new Error(`kit: rune without a domain`)
  runeArt(p, { rune: true, ...art }, home, (m) => brighten(p, key, art.v ?? 0, m), shiny, cover)
}
