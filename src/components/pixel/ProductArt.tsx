import clsx from 'clsx'
import { productById } from '@/lib/catalog.ts'
import { PixelProduct } from './PixelSprite.tsx'

const W = 84
const H = 132

/** A sealed product: a booster shows its wrapper, a display three wrappers in a row with its count. */
export function ProductArt({ id, scale = 2, className }: { id: string; scale?: number; className?: string }) {
  const product = productById.get(id)
  const wrappers = product?.wrappers ?? []
  if (product?.kind !== 'display') {
    return <PixelProduct id={wrappers[0] ?? ''} scale={scale} fallback={{ w: W, h: H }} className={className} />
  }
  const step = 14 * scale
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: W * scale + 2 * step, height: H * scale + 2 * step }}>
      {[2, 1, 0].map((i) => (
        <div key={i} className="absolute drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)]" style={{ left: (2 - i) * step, top: i * step }}>
          <PixelProduct id={wrappers[i % wrappers.length] ?? ''} scale={scale} fallback={{ w: W, h: H }} />
        </div>
      ))}
      <span className="absolute -right-2 -bottom-2 rounded-lg bg-grad px-2 font-pixel text-lg text-white shadow-lg">{product.contains?.qty}×</span>
    </div>
  )
}
