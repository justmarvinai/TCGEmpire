import clsx from 'clsx'
import { useRef, type PointerEvent } from 'react'
import { maskStyle, spriteStyle, useCardAtlas } from '@/components/pixel/atlas.ts'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { CARD_BACK, cardById, HIT_TIERS, isHouse, SETS, setOfCard, TIER_TEXT, type Tier } from '@/lib/catalog.ts'
import { texts } from '@/texts/de.ts'
import { EMP_CLASSIC, EMP_FULL, type Slot } from '../../../art/frames/empiremon-layout.ts'

const W = 80
const H = 112

/**
 * A card from its set atlas at an integer scale (1 = 80x112). Hits carry their foil: animated sweep
 * (`foil="sweep"`) or pointer-driven inside a <TiltCard>. Grails always sweep and sparkle.
 */
export function Card({
  id,
  scale = 2,
  foil = 'auto',
  className,
  dim,
}: {
  id: string
  scale?: number
  foil?: 'auto' | 'sweep' | 'none'
  className?: string
  dim?: boolean
}) {
  const set = setOfCard(id)
  const atlas = useCardAtlas(set)
  const data = cardById.get(id)
  const tier = (data?.tier ?? 'common') as Tier
  const rect = atlas.data?.rect(id)
  const shiny = foil !== 'none' && HIT_TIERS.has(tier)

  if (!atlas.data || !rect) {
    return <FallbackCard id={id} scale={scale} className={className} dim={dim} loading={atlas.isPending} />
  }
  return (
    <div
      role="img"
      aria-label={data?.name ?? id}
      data-tier={tier}
      className={clsx('relative shrink-0', dim && 'opacity-30 grayscale', className)}
      style={{ width: W * scale, height: H * scale }}
    >
      <div className="absolute inset-0" style={spriteStyle(atlas.data, rect, scale)} />
      {shiny && (
        <div className={clsx('card-foil', foil === 'sweep' && 'sweep')} style={maskStyle(atlas.data, rect, scale, `${set}-foil`)}>
          <i />
        </div>
      )}
      {isHouse(set) && <HouseText id={id} scale={scale} />}
      {shiny && tier === 'grail' && (
        <span className="grail-sparkles" aria-hidden>
          <b />
          <b />
          <b />
          <b />
        </span>
      )}
    </div>
  )
}

/** A one-line text in a frame slot, shrunk to fit its width (bold Space Grotesk: about 0.58 em per character). */
function SlotText({ slot, text, scale, bold }: { slot: Slot; text: string; scale: number; bold?: boolean }) {
  const size = Math.min(slot.h * scale * 0.82, (slot.w * scale) / (text.length * (bold ? 0.6 : 0.55)))
  return (
    <span
      className={clsx('card-text', bold && 'font-bold')}
      style={{ left: slot.x * scale, top: slot.y * scale, width: slot.w * scale, height: slot.h * scale, fontSize: size }}
    >
      {text}
    </span>
  )
}

/** Empiremon bakes no text into its cards (decision 065): name, type line and number go into the frame's slots. */
function HouseText({ id, scale }: { id: string; scale: number }) {
  const data = cardById.get(id)
  const set = SETS.find((s) => s.cards.some((c) => c.id === id))
  if (!data || !set) return null
  const slots = data.tier === 'ultra' || data.tier === 'grail' ? EMP_FULL : EMP_CLASSIC
  const pad = (n: number) => String(n).padStart(3, '0')
  return (
    <div aria-hidden>
      <SlotText slot={slots.name} text={data.name} scale={scale} bold />
      <SlotText slot={slots.type} text={texts.cards.houseType(data.element ?? '')} scale={scale} />
      <SlotText slot={slots.number} text={`${pad(data.no)}/${pad(set.size)}`} scale={scale} />
    </div>
  )
}

/** Shown while a card's art is not in the atlas yet: name, number and tier colour. */
function FallbackCard({ id, scale, className, dim, loading }: { id: string; scale: number; className?: string; dim?: boolean; loading: boolean }) {
  const data = cardById.get(id)
  if (loading) return <div className={clsx('skeleton shrink-0', className)} style={{ width: W * scale, height: H * scale }} />
  return (
    <div
      className={clsx(
        'flex shrink-0 flex-col items-center justify-center gap-1 bg-surface-2 p-1 text-center outline-2 -outline-offset-2 outline-line-strong',
        dim && 'opacity-30',
        className,
      )}
      style={{ width: W * scale, height: H * scale }}
    >
      <span className={clsx('font-pixel leading-tight', scale >= 2 ? 'text-sm' : 'text-[0.5rem]', data && TIER_TEXT[data.tier])}>
        {data?.name ?? id}
      </span>
      {scale >= 2 && <span className="nums text-[0.625rem] text-fg-3">#{String(data?.no ?? 0).padStart(3, '0')}</span>}
    </div>
  )
}

export function CardBack({ scale = 2, className }: { scale?: number; className?: string }) {
  return <PixelProduct id={CARD_BACK} scale={scale} className={className} />
}

/** Wraps a card so it tilts towards the pointer and its foil follows the light. */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', `${x * 22}deg`)
    el.style.setProperty('--rx', `${-y * 22}deg`)
    el.style.setProperty('--fx', `${-x * 60}%`)
    el.style.setProperty('--fy', `${-y * 60}%`)
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    for (const v of ['--rx', '--ry']) el.style.setProperty(v, '0deg')
    for (const v of ['--fx', '--fy']) el.style.setProperty(v, '-20%')
  }
  return (
    <div ref={ref} className={clsx('tilt', className)} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  )
}
