import { describe, expect, it } from 'vitest'
import { FONTS, fit } from '../fonts.ts'
import { SETS } from '../sets.ts'

/**
 * Automated quality gates for every registered card. They do not replace looking at the
 * contact sheet; they catch what the eye misses at ×1.
 */
const MAX_COLORS = 32
const MIN_COVERAGE = 0.1

const cases = SETS.flatMap((set) => set.cards.map((def) => ({ id: def.id, set, def })))

describe.each(cases)('$id', ({ set, def }) => {
  const { card, art, foil } = set.render(def)

  it('has the exact card and artwork size', () => {
    expect({ w: card.w, h: card.h }).toEqual(set.cardSize)
    const { w, h } = set.artSize(def)
    expect({ w: art.w, h: art.h }).toEqual({ w, h })
  })

  it('fills the whole artwork', () => {
    expect(art.mask().count()).toBe(art.w * art.h)
  })

  it(`uses at most ${MAX_COLORS} colours in the artwork`, () => {
    expect(art.colors().size).toBeLessThanOrEqual(MAX_COLORS)
  })

  it('declares a subject that is big enough to read', () => {
    expect(art.subjectMask.count() / (art.w * art.h)).toBeGreaterThanOrEqual(MIN_COVERAGE)
  })

  // Orphan = a pixel inside the subject silhouette without any neighbour of its own colour, unless
  // it was hand-placed (px, stamp). The silhouette itself must have no stray pixels or pinholes.
  it('has no orphan pixels in the subject', () => {
    expect(art.orphans(art.subjectMask)).toEqual([])
    expect(art.subjectMask.cleaned().bits).toEqual(art.subjectMask.bits)
  })

  it('has a foil mask of the card size that matches its foil definition', () => {
    expect({ w: foil.w, h: foil.h }).toEqual(set.cardSize)
    if (def.foil !== 'none') expect(foil.count()).toBeGreaterThan(0)
  })

  it('renders the same pixels every time', () => {
    expect(set.render(def).card.data).toEqual(card.data)
  })
})

describe('bitmap fonts', () => {
  const required =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÄÖÜäöüßé.,:;!?-+/()%&\'"*♂♀×·'

  it.each(FONTS.map((font) => ({ name: font.name, font })))(
    '$name covers the card character set',
    ({ font }) => {
      const missing = [...required].filter((ch) => !font.glyphs.has(ch))
      expect(missing).toEqual([])
    },
  )

  it('falls back to a narrower font for long names', () => {
    expect(fit('Glurak', 38).name).toBe('regular')
    expect(fit('Bisaknosp', 40).name).toBe('condensed')
    expect(fit('Machomei', 36).name).toBe('micro')
  })
})
