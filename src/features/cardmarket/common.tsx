import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { ProductArt } from '@/components/pixel/ProductArt.tsx'
import { cardById, TIER_LABEL, TIER_TEXT, type Tier } from '@/lib/catalog.ts'
import { rpc } from '@/lib/rpc.ts'
import { texts } from '@/texts/de.ts'

export const useCardmarket = () => useQuery({ queryKey: ['cardmarket'], queryFn: () => rpc('cardmarket_get') })
export const useCardmarketItem = (id: string) => useQuery({ queryKey: ['cardmarket', id], queryFn: () => rpc('cardmarket_item', { p_item: id }) })

/** Tier label of a card, or "Sealed" for products. */
export function ItemTier({ id, className }: { id: string; className?: string }) {
  const card = cardById.get(id)
  if (!card) return <span className={clsx('text-fg-3', className)}>Sealed</span>
  return <span className={clsx(TIER_TEXT[card.tier as Tier], className)}>{TIER_LABEL[card.tier as Tier]}</span>
}

/** Card art or the product's first wrapper. */
export function ItemArt({ id, scale = 2, className }: { id: string; scale?: number; className?: string }) {
  if (cardById.has(id)) return <Card id={id} scale={scale} className={className} />
  return <ProductArt id={id} scale={scale} className={className} />
}

export const TraderName = ({ name, kind }: { name: string; kind: 'player' | 'npc' }) => (
  <span className="flex items-center gap-1.5">
    {name}
    {kind === 'npc' && <span className="rounded-md bg-surface-3 px-1.5 text-[0.625rem] font-bold tracking-wide text-fg-3 uppercase">{texts.cardmarket.npc}</span>}
  </span>
)

/** Euros typed by the player as cents: "1.234,50", "12,50" and "12.50" all work. */
export function eurosToCents(s: string) {
  const t = s.trim().replace(/[\s€]/g, '')
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}
export const centsToEuros = (c: number) => (c / 100).toFixed(2).replace('.', ',')
