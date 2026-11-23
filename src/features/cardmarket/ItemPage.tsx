import clsx from 'clsx'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { slabName } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { PriceChart } from '@/features/market/PriceChart.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardById, itemName } from '@/lib/catalog.ts'
import { formatAgo, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText } from '@/lib/rpc.ts'
import type { CardmarketItem } from '@/lib/schemas.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { centsToEuros, eurosToCents, ItemArt, ItemTier, TraderName, useCardmarketItem } from './common.tsx'

const T = texts.cardmarket
const HIT = new Set(['holo', 'alternative', 'ultra', 'grail'])

type WriteFn = 'listing_buy' | 'listing_create' | 'listing_cancel' | 'order_create' | 'order_fill' | 'order_cancel'

/** Every market write answers with the item document: put it straight into the cache. */
function useMarketAct(item: string) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: WriteFn, args: Record<string, unknown>, done: string) => {
    setBusy(key)
    const res = await act(fn, args, ['cardmarket'])
    setBusy(null)
    if (res) {
      client.setQueryData(['cardmarket', item], res.item)
      toast('success', done)
    }
    return !!res
  }
  return { busy, run }
}

export function CardmarketItemPage() {
  const { item = '' } = useParams()
  const q = useCardmarketItem(item)
  const d = q.data
  return (
    <Page icon="market" title={itemName(item)} subtitle={T.subtitle}>
      <Link to="/cardmarket" className="mb-4 inline-block text-sm font-semibold text-fg-2 hover:text-fg">
        ← {T.back}
      </Link>
      {q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Detail d={d} />
      )}
    </Page>
  )
}

function Detail({ d }: { d: CardmarketItem }) {
  const { busy, run } = useMarketAct(d.item_id)
  // Slabs never fill a raw buy order; they are only listed on purpose.
  const owned = d.owned.qty + d.owned.copies.length
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel className="flex flex-col items-center justify-center gap-3 lg:col-span-4">
        <ItemArt id={d.item_id} scale={3} />
        <ItemTier id={d.item_id} className="text-sm font-semibold" />
      </Panel>
      <Panel title={T.value} tip={T.valueTip} className="lg:col-span-8">
        <p className="nums text-4xl font-bold tracking-tight">{formatMoney(d.value_cents)}</p>
        <div className="mt-4">
          <PriceChart itemId={d.item_id} />
        </div>
      </Panel>

      <Panel title={T.offers} tip={T.offersTip} className="lg:col-span-6">
        {d.listings.length === 0 ? (
          <EmptyState icon="tag" title={T.noListings} />
        ) : (
          <ul className="flex flex-col gap-2">
            {d.listings.map((l) => (
              <OfferRow key={l.id} l={l} busy={busy} run={run} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={T.orders} tip={T.ordersTip} className="lg:col-span-6">
        {d.orders.length === 0 ? (
          <EmptyState icon="search" title={T.noOrders} />
        ) : (
          <ul className="flex flex-col gap-2">
            {d.orders.map((o) => (
              <OrderRow key={o.id} o={o} owned={owned} busy={busy} run={run} />
            ))}
          </ul>
        )}
      </Panel>

      <ListForm key={d.owned.copies.length + d.owned.slabs.length} d={d} busy={busy} run={run} />
      <OrderForm d={d} busy={busy} run={run} />

      <Panel title={T.sales} tip={T.salesTip} className="lg:col-span-12">
        <Sales d={d} />
      </Panel>
    </div>
  )
}

type Run = ReturnType<typeof useMarketAct>['run']

function QtyInput({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <input
      type="number"
      min={1}
      max={max}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))}
      className="panel-inset nums h-8 w-16 bg-transparent px-2 text-sm"
    />
  )
}

function OfferRow({ l, busy, run }: { l: CardmarketItem['listings'][number]; busy: string | null; run: Run }) {
  const [n, setN] = useState(1)
  return (
    <li className={clsx('flex flex-wrap items-center gap-3 rounded-xl p-3', l.mine ? 'bg-accent-lo/15' : 'bg-surface-2')}>
      <Link to={`/cardmarket/seller/${l.seller.id}`} className="min-w-28 flex-1 text-sm font-semibold hover:underline">
        <TraderName name={l.seller.name} kind={l.seller.kind} />
      </Link>
      {l.slab ? (
        <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold" title={T.slabValue(formatMoney(l.value_cents))}>
          {slabName(l.slab)}
        </span>
      ) : (
        <span className="nums text-sm text-fg-2">{l.qty}×</span>
      )}
      <span className="nums font-bold">{formatMoney(l.price_cents)}</span>
      {l.mine ? (
        <Button size="sm" loading={busy === `c${l.id}`} onClick={() => run(`c${l.id}`, 'listing_cancel', { p_listing: l.id }, T.cancelled)}>
          {T.cancel}
        </Button>
      ) : (
        <span className="flex items-center gap-2">
          {l.qty > 1 && <QtyInput value={n} max={l.qty} onChange={setN} label={T.qty} />}
          <Button size="sm" variant="primary" loading={busy === `b${l.id}`} onClick={() => run(`b${l.id}`, 'listing_buy', { p_listing: l.id, p_qty: n }, T.bought)}>
            {T.buy}
          </Button>
        </span>
      )}
    </li>
  )
}

function OrderRow({ o, owned, busy, run }: { o: CardmarketItem['orders'][number]; owned: number; busy: string | null; run: Run }) {
  const max = Math.max(1, Math.min(owned, o.qty))
  const [n, setN] = useState(max)
  return (
    <li className={clsx('flex flex-wrap items-center gap-3 rounded-xl p-3', o.mine ? 'bg-accent-lo/15' : 'bg-surface-2')}>
      <span className="min-w-28 flex-1 text-sm font-semibold">
        <TraderName name={o.buyer.name} kind={o.buyer.kind} />
      </span>
      <span className="nums text-sm text-fg-2">{o.qty}×</span>
      <span className="nums font-bold">{formatMoney(o.price_cents)}</span>
      {o.mine ? (
        <Button size="sm" loading={busy === `x${o.id}`} onClick={() => run(`x${o.id}`, 'order_cancel', { p_order: o.id }, T.cancelled)}>
          {T.cancel}
        </Button>
      ) : (
        <span className="flex items-center gap-2">
          {max > 1 && <QtyInput value={Math.min(n, max)} max={max} onChange={setN} label={T.qty} />}
          <Button
            size="sm"
            disabled={owned === 0}
            loading={busy === `f${o.id}`}
            onClick={() => run(`f${o.id}`, 'order_fill', { p_order: o.id, p_qty: Math.min(n, max) }, T.filled)}
          >
            {T.sellTo}
          </Button>
        </span>
      )}
    </li>
  )
}

function ListForm({ d, busy, run }: { d: CardmarketItem; busy: string | null; run: Run }) {
  const hit = HIT.has(cardById.get(d.item_id)?.tier ?? '')
  // A hit is listed as one exemplar: a raw copy or one of the player's slabs.
  const choices = [
    ...(d.owned.copies.length > 0 ? [{ id: d.owned.copies[0]!, label: T.rawCopy(d.owned.copies.length), value: d.value_cents }] : []),
    ...d.owned.slabs.map((s) => ({ id: s.copy_id, label: `${slabName(s.slab)} · ${s.slab.cert_no}`, value: s.value_cents })),
  ]
  const [pick, setPick] = useState(choices[0]?.id ?? '')
  const choice = choices.find((c) => c.id === pick) ?? choices[0]
  const owned = d.owned.qty + d.owned.copies.length + d.owned.slabs.length
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState(centsToEuros(choice?.value ?? d.value_cents))
  const cents = eurosToCents(price)
  const n = hit ? 1 : Math.floor(Number(qty))
  const valid = owned > 0 && cents > 0 && n >= 1 && (hit ? !!choice : n <= d.owned.qty)
  const submit = () =>
    run('list', 'listing_create', {
      p_kind: hit ? 'copy' : d.kind === 'sealed' ? 'sealed' : 'card',
      p_item: d.item_id,
      p_copy: hit ? choice?.id : null,
      p_qty: n,
      p_price: cents,
    }, T.listed)
  return (
    <Panel title={T.listTitle} tip={T.listTip} className="lg:col-span-6">
      <p className="mb-3 text-sm text-fg-2">{owned > 0 ? T.owned(owned) : T.ownedNone}</p>
      <div className="flex flex-wrap items-end gap-3">
        {hit && choices.length > 1 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-3">{T.which}</span>
            <select
              value={choice?.id}
              onChange={(e) => {
                setPick(e.target.value)
                const c = choices.find((x) => x.id === e.target.value)
                if (c) setPrice(centsToEuros(c.value))
              }}
              className="panel-inset h-10 bg-transparent px-2 text-sm"
            >
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {!hit && <Field label={T.qty} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="w-24" />}
        <Field label={T.pricePer} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-40" />
        <Button variant="primary" disabled={!valid} loading={busy === 'list'} onClick={submit}>
          {T.list}
        </Button>
      </div>
    </Panel>
  )
}

function OrderForm({ d, busy, run }: { d: CardmarketItem; busy: string | null; run: Run }) {
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState(centsToEuros(Math.round(d.value_cents * 0.9)))
  const cents = eurosToCents(price)
  const n = Math.floor(Number(qty))
  return (
    <Panel title={T.orderTitle} tip={T.orderTip} className="lg:col-span-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={T.qty} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="w-24" />
        <Field label={T.maxPrice} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-44" />
        <Button
          disabled={!(cents > 0 && n >= 1)}
          loading={busy === 'order'}
          onClick={() => run('order', 'order_create', { p_item: d.item_id, p_qty: n, p_price: cents }, T.ordered)}
        >
          {T.order}
        </Button>
      </div>
    </Panel>
  )
}

function Sales({ d }: { d: CardmarketItem }) {
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  if (d.sales.length === 0) return <p className="text-sm text-fg-3">{T.noSales}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {d.sales.map((s, i) => (
        <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <b className="nums">{formatMoney(s.price_cents)}</b>
          {s.slab && <span className="ml-1.5 rounded-md bg-surface-3 px-1.5 text-xs font-bold">{s.slab}</span>}
          <span className="text-fg-3">
            {' '}
            · {s.qty}× · {now > 0 ? formatAgo(s.at, now + offset) : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
