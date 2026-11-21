// Card and product art is built from code into PNG atlases (pnpm art:build -> public/atlas).
// One atlas per set is loaded on demand.
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const zCardAtlas = z.object({
  cell: z.object({ w: z.number(), h: z.number() }),
  items: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
})
const zSpriteAtlas = z.object({
  items: z.record(z.string(), z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
})

async function load<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`/atlas/${name}.json`)
  if (!res.ok) throw new Error(`atlas ${name} missing`)
  return schema.parse(await res.json())
}

/** Atlas of equally sized cards (80x112), e.g. `pokemon-base`. */
export function useCardAtlas(name: string) {
  return useQuery({ queryKey: ['atlas', name], queryFn: () => load(name, zCardAtlas), staleTime: Infinity })
}

/** Atlas of sprites with individual sizes, e.g. `products`. */
export function useSpriteAtlas(name: string) {
  return useQuery({ queryKey: ['atlas', name], queryFn: () => load(name, zSpriteAtlas), staleTime: Infinity })
}
