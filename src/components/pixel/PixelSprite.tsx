import clsx from 'clsx'
import { spriteStyle, useSpriteAtlas } from './atlas.ts'

/** A product sprite (booster, card back, slab frame) from the `products` atlas. */
export function PixelProduct({
  id,
  scale = 2,
  className,
  fallback = { w: 80, h: 112 },
}: {
  id: string
  scale?: number
  className?: string
  fallback?: { w: number; h: number }
}) {
  const atlas = useSpriteAtlas()
  const rect = atlas.data?.rect(id)
  if (!atlas.data || !rect) {
    return <div className={clsx('skeleton', className)} style={{ width: fallback.w * scale, height: fallback.h * scale }} />
  }
  return <div role="img" aria-label={id} className={clsx('shrink-0', className)} style={spriteStyle(atlas.data, rect, scale)} />
}
