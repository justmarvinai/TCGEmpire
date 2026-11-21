import clsx from 'clsx'
import { useCardAtlas, useSpriteAtlas } from './atlas.ts'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A card from a set atlas. `scale` 2 = binder, 4 = opening, 6 = inspect. */
export function PixelCard({ set, id, scale = 2, className }: { set: string; id: string; scale?: number; className?: string }) {
  const atlas = useCardAtlas(set)
  const cell = atlas.data?.cell ?? { w: 80, h: 112 }
  const pos = atlas.data?.items[id]
  if (!pos) return <div className={clsx('skeleton', className)} style={{ width: cell.w * scale, height: cell.h * scale }} />
  return <AtlasImage atlas={set} rect={{ ...pos, ...cell }} scale={scale} className={className} label={id} />
}

/** A product sprite (booster, display, slab, card back) from the `products` atlas. */
export function PixelProduct({ id, scale = 2, className }: { id: string; scale?: number; className?: string }) {
  const atlas = useSpriteAtlas('products')
  const rect = atlas.data?.items[id]
  if (!rect) return <div className={clsx('skeleton', className)} style={{ width: 80 * scale, height: 112 * scale }} />
  return <AtlasImage atlas="products" rect={rect} scale={scale} className={className} label={id} />
}

// One region of an atlas image at an integer scale with hard pixels: an <img> clipped by a wrapper,
// the simplest way to scale an atlas without knowing its size.
function AtlasImage({ atlas, rect, scale, className, label }: { atlas: string; rect: Rect; scale: number; className?: string; label?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={clsx('relative shrink-0 overflow-hidden', className)}
      style={{ width: rect.w * scale, height: rect.h * scale }}
    >
      <img
        src={`/atlas/${atlas}.png`}
        alt=""
        draggable={false}
        className="pixelated absolute max-w-none origin-top-left select-none"
        style={{ left: -rect.x * scale, top: -rect.y * scale, transform: `scale(${scale})` }}
      />
    </div>
  )
}

