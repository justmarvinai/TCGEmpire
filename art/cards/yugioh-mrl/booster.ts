import { pick } from '../../products/booster-pokemon-base.ts'
import { boosterPack } from '../../products/booster-ygo-lob.ts'
import type { ProductDef } from '../../products/index.ts'
import type { Mask, Painter } from '../../toolkit/index.ts'
import { colors } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'
import { blueEyesToonDragon } from './blue-eyes-toon-dragon.ts'
import { relinquished } from './relinquished.ts'
import { toonSummonedSkull } from './toon-summoned-skull.ts'

/** The set name on the ribbon of every Spell Ruler wrapper. */
const TITLE = ['Spell', 'Ruler'] as const

/** Colours of the card artworks that the wrappers take along as effects. */
const GLYPH = colors('4a3414', '7c5a20', 'b88a30', 'f0c860')
/** Altar stone and candle wax; the candle flames are glyph gold. */
const ALTAR = colors('0a0710', '181022', '281c36', '3e2e50', 'b4aab6', 'e6e0d6', 'fffaee')
const ZAP = colors('ffdc3a', 'ffffff')

/**
 * A hero card whose wrapper cut-out leaves out part of its subject (a prop, not the monster). The
 * artwork is cleaned up the way the card's is before the cut, so the pixels kept match the card.
 */
function without(hero: CardDef, drop: (art: Painter) => Mask): CardDef {
  return {
    ...hero,
    draw(p) {
      hero.draw(p)
      p.cleanup(p.subjectMask)
      p.subjectMask.minus(drop(p))
    },
  }
}

/** The booster wrappers of this set (content/catalog.ts lists their ids). Each hero is cut out of its card art. */
export const BOOSTERS: readonly ProductDef[] = [
  // Aufgegeben, the real cover card: the small bone-white figure is too small to fill the pack alone,
  // so it brings the giant gold eye of its card (the pupil is a hole into the void, so the whole iris
  // comes along) and its altar with the candles; it hooks the teal ghost beast, which stays clear of
  // the seal. Black-violet void foil that glows gold behind the figure.
  boosterPack({
    id: 'booster-ygo-mrl-relinquished',
    hero: relinquished,
    title: TITLE,
    effects: (art) =>
      pick(art, GLYPH, [{ x: 4, y: 8, w: 72, h: 40 }])
        .or(art.m().disc(40, 29, 10.5))
        .or(pick(art, [...ALTAR, ...GLYPH], [{ x: 12, y: 58, w: 56, h: 54 }])),
    at: [-2, 36],
    foil: colors('050308', '0b0612', '140b1e', '20122c', '2e1a3c', '44244e', '8a5468', 'f8d47e'),
    burst: [38, 86],
  }),
  // Blauäugiger Toon-Drache: the white cartoon dragon bursts out of the pages of its book (the red
  // cover stays on the card), on pop-art pink foil
  boosterPack({
    id: 'booster-ygo-mrl-toon-blue-eyes',
    hero: without(blueEyesToonDragon, (art) => art.m().rect(0, 86, 80, 26)),
    title: TITLE,
    at: [1, 34],
    foil: colors('12020c', '2a0620', '480c36', '6a144e', '90206a', 'c03a88', 'f070b0', 'ffd8f0'),
    burst: [41, 64],
  }),
  // Herbeigerufener Toon-Schädel: the lavender cartoon fiend mid-jump, zigzag bolts from its claws
  // (grown by a pixel to bring their ink outline), on comic ochre foil
  boosterPack({
    id: 'booster-ygo-mrl-toon-skull',
    hero: toonSummonedSkull,
    title: TITLE,
    effects: (art) =>
      pick(art, ZAP, [
        { x: 0, y: 26, w: 12, h: 50 },
        { x: 68, y: 26, w: 12, h: 50 },
      ]).grown(1),
    at: [2, 36],
    foil: colors('140c02', '2a1a04', '482c06', '6c4208', '985e0a', 'c8860e', 'f4be1e', 'fff4a8'),
    burst: [42, 67],
  }),
]
