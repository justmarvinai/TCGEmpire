import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { slabName } from '@/components/cards/Slab.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { itemName } from '@/lib/catalog.ts'
import { formatMoney, formatStars } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { texts } from '@/texts/de.ts'
import { ItemTier, TraderName } from './common.tsx'

const T = texts.cardmarket

/** A seller's shop window: everything they offer right now. */
export function SellerPage() {
  const { id = '' } = useParams()
  const q = useQuery({ queryKey: ['seller', id], queryFn: () => rpc('seller_get', { p_seller: id }) })
  const d = q.data
  return (
    <Page icon="people" title={d?.seller.name ?? '…'} subtitle={T.sellerSubtitle}>
      <Link to="/cardmarket" className="mb-4 inline-block text-sm font-semibold text-fg-2 hover:text-fg">
        ← {T.back}
      </Link>
      {q.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Panel
          title={T.offers}
          action={
            <span className="flex items-center gap-3 text-sm text-fg-2">
              <TraderName name={d.seller.name} kind={d.seller.kind} />
              <span>
                {T.ruf} <b className="nums text-fg">{formatStars(d.seller.ruf)} ★</b>
              </span>
            </span>
          }
        >
          {d.listings.length === 0 ? (
            <EmptyState icon="tag" title={T.sellerEmpty} />
          ) : (
            <ul className="flex flex-col gap-2">
              {d.listings.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <Link to={`/cardmarket/${l.item_id}`} className="min-w-40 flex-1 font-semibold hover:underline">
                    {l.qty}× {itemName(l.item_id)}
                    {l.slab && <span className="ml-1.5 rounded-md bg-surface-3 px-1.5 text-xs font-bold">{slabName(l.slab)}</span>}
                  </Link>
                  <ItemTier id={l.item_id} className="text-xs" />
                  <span className="nums text-sm text-fg-2">
                    {T.value} {formatMoney(l.value_cents)}
                  </span>
                  <span className="nums font-bold">{formatMoney(l.price_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </Page>
  )
}
