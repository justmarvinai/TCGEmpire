// Card and product art is built from code into PNG atlases (pnpm art:build -> public/atlas).
// One atlas per set is loaded on demand; sprites are cut out with CSS backgrounds at integer scales.
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const zSize = z.object({ w: z.number(), h: z.number() })
const zCardAtlas = z.object({
  cell: zSize,
  size: zSize.optional(),
  items: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
})
const zSpriteAtlas = z.object({
  size: zSize.optional(),
  items: z.record(z.string(), z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
})

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Atlas {
  name: string
  size: { w: number; h: number }
  ids: string[]
  rect(id: string): Rect | undefined
}

async function fetchJson(name: string): Promise<unknown> {
  const res = await fetch(`/atlas/${name}.json`)
  if (!res.ok) throw new Error(`atlas ${name} missing`)
  return res.json()
}

async function loadCards(name: string): Promise<Atlas> {
  const a = zCardAtlas.parse(await fetchJson(name))
  const pos = Object.values(a.items)
  const size = a.size ?? {
    w: Math.max(0, ...pos.map((p) => p.x)) + a.cell.w,
    h: Math.max(0, ...pos.map((p) => p.y)) + a.cell.h,
  }
  return { name, size, ids: Object.keys(a.items), rect: (id) => (a.items[id] ? { ...a.items[id], ...a.cell } : undefined) }
}

async function loadSprites(name: string): Promise<Atlas> {
  const a = zSpriteAtlas.parse(await fetchJson(name))
  const r = Object.values(a.items)
  const size = a.size ?? { w: Math.max(0, ...r.map((p) => p.x + p.w)), h: Math.max(0, ...r.map((p) => p.y + p.h)) }
  return { name, size, ids: Object.keys(a.items), rect: (id) => a.items[id] }
}

/** Atlas of equally sized cards (80x112), e.g. `pokemon-base`. */
export function useCardAtlas(name: string) {
  return useQuery({ queryKey: ['atlas', name], queryFn: () => loadCards(name), staleTime: Infinity, retry: 1 })
}

/** Atlas of sprites with individual sizes: `products` (boosters, card back, slab frames). */
export function useSpriteAtlas(name = 'products') {
  return useQuery({ queryKey: ['atlas', name], queryFn: () => loadSprites(name), staleTime: Infinity, retry: 1 })
}

/** CSS that shows one atlas region at an integer scale with hard pixels. */
export function spriteStyle(atlas: Atlas, rect: Rect, scale: number, file = atlas.name): React.CSSProperties {
  return {
    width: rect.w * scale,
    height: rect.h * scale,
    backgroundImage: `url(/atlas/${file}.png)`,
    backgroundSize: `${atlas.size.w * scale}px ${atlas.size.h * scale}px`,
    backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  }
}

/** The same region as a CSS mask (used for foil: the foil atlas is white where a card shines). */
export function maskStyle(atlas: Atlas, rect: Rect, scale: number, file: string): React.CSSProperties {
  const url = `url(/atlas/${file}.png)`
  const size = `${atlas.size.w * scale}px ${atlas.size.h * scale}px`
  const pos = `${-rect.x * scale}px ${-rect.y * scale}px`
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: size,
    maskSize: size,
    WebkitMaskPosition: pos,
    maskPosition: pos,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }
}
