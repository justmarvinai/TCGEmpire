import type { CardDef, RenderedCard } from '../cards/types.ts'
import { paintArtwork } from '../cards/types.ts'
import { MICRO, drawText, fit } from '../fonts.ts'
import type { RGB, Region } from '../toolkit/index.ts'
import { Mask, Painter, hex } from '../toolkit/index.ts'

const box = (r: Region): Mask => new Mask(80, 112).rect(r.x, r.y, r.w, r.h)

/**
 * Placeholder frame until a game's own frame family exists: a plain border in the game's colour, the
 * artwork and the name. Replaced by art/frames/<game>.ts; kept small on purpose.
 */
export function renderStub(def: CardDef, area: Region, border: RGB): RenderedCard {
  const card = new Painter(80, 112).clear(border)
  const art = paintArtwork(def, area.w, area.h)
  card.fill(box({ x: area.x - 1, y: area.y - 1, w: area.w + 2, h: area.h + 2 }), hex('1e1722'))
  card.blit(art, area.x, area.y)
  drawText(card, def.name, 4, 3, fit(def.name, 72, [MICRO]), hex('fffbea'))
  const foil = new Mask(80, 112)
  if (def.foil === 'art') foil.rect(area.x, area.y, area.w, area.h)
  else if (def.foil === 'painted') art.foilMask().each((x, y) => foil.add(x + area.x, y + area.y))
  return { card, foil, art }
}
