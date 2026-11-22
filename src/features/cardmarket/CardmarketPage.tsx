import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { slabName } from '@/components/cards/Slab.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { itemName } from '@/lib/catalog.ts'
import { formatDuration, formatMoney, formatPercent } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Cardmarket } from '@/lib/schemas.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { ItemTier, useCardmarket } from './common.tsx'

const T = texts.cardmarket
type Tab = keyof typeof T.tabs

export function CardmarketPage() {
  const q = useCardmarket()
  const overview = useQuery({ queryKey: ['market-overview'], queryFn: () => rpc('market_overview'), staleTime: 60_000 })
  const [tab, setTab] = useState<Tab>('market')
  const d = q.data
  return (
    <Page icon="market" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : !d.unlocked ? (
        <Panel>
          <EmptyState icon="lock" title={texts.locked.levelTitle(d.unlock_level)} />
        </Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <Panel title={T.hype} tip={T.hypeTip}>
              <div className="flex flex-wrap gap-2">
                {(overview.data?.games ?? []).map((g) => (
                  <span key={g.game} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    {T.games[g.game] ?? g.game}
                    <b className={clsx('nums', Math.abs(g.hype - 1) < 0.01 ? 'text-fg' : g.hype > 1 ? 'text-gain' : 'text-loss')}>{g.hype.toFixed(2).replace('.', ',')}</b>
                  </span>
                ))}
              </div>
            </Panel>
            <Panel title={T.slots} tip={T.slotsTip}>
              <p className="nums text-3xl font-bold tracking-tight">
                {d.mine.used}
                <span className="text-fg-3">/{d.mine.slots}</span>
              </p>
            </Panel>
            <Panel title={T.parcels} tip={T.parcelsTip}>
              <p className="nums text-3xl font-bold tracking-tight">{d.mine.parcels.length}</p>
            </Panel>
          </div>

          <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
            {(Object.keys(T.tabs) as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={clsx('rounded-lg px-4 py-2 text-sm font-semibold', tab === k ? 'bg-grad text-white' : 'text-fg-2 hover:text-fg')}
              >
                {T.tabs[k]}
                {k === 'parcels' && d.mine.parcels.length > 0 && <span className="nums ml-1.5 opacity-80">{d.mine.parcels.length}</span>}
              </button>
            ))}
          </div>

          {tab === 'market' && <MarketList items={d.items} />}
          {tab === 'listings' && <MyListings mine={d.mine} />}
          {tab === 'orders' && <MyOrders mine={d.mine} />}
          {tab === 'parcels' && <Parcels mine={d.mine} />}
        </>
      )}
    </Page>
  )
}

function MarketList({ items }: { items: Cardmarket['items'] }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [onlyOffers, setOnlyOffers] = useState(false)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return items
      .filter((i) => (!s || itemName(i.item_id).toLowerCase().includes(s)) && (!onlyOffers || i.offers > 0))
      .sort((a, b) => b.value_cents - a.value_cents)
  }, [items, search, onlyOffers])
  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={T.search}
          aria-label={T.search}
          className="panel-inset h-10 min-w-60 flex-1 bg-transparent px-3 text-sm placeholder:text-fg-3"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-2">
          <input type="checkbox" checked={onlyOffers} onChange={(e) => setOnlyOffers(e.target.checked)} className="size-4 accent-accent" />
          {T.onlyOffers}
        </label>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="search" title={T.noItems} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-3">
                <th className="pb-2 font-semibold">{T.cols.item}</th>
                <th className="pb-2 text-right font-semibold">{T.cols.value}</th>
                <th className="pb-2 text-right font-semibold">{T.cols.today}</th>
                <th className="pb-2 text-right font-semibold">{T.cols.from}</th>
                <th className="pb-2 text-right font-semibold">{T.cols.offers}</th>
                <th className="pb-2 text-right font-semibold">{T.cols.order}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr
                  key={i.item_id}
                  onClick={() => navigate(`/cardmarket/${i.item_id}`)}
                  className="cursor-pointer border-t border-line hover:bg-surface-2"
                >
                  <td className="py-2.5">
                    <Link to={`/cardmarket/${i.item_id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {itemName(i.item_id)}
                    </Link>
                    <ItemTier id={i.item_id} className="ml-2 text-xs" />
                  </td>
                  <td className="nums py-2.5 text-right font-semibold">{formatMoney(i.value_cents)}</td>
                  <td className={clsx('nums py-2.5 text-right', i.change_pct > 0 ? 'text-gain' : i.change_pct < 0 ? 'text-loss' : 'text-fg-3')}>
                    {formatPercent(i.change_pct / 100)}
                  </td>
                  <td className="nums py-2.5 text-right">{i.from_cents !== null ? formatMoney(i.from_cents) : '–'}</td>
                  <td className="nums py-2.5 text-right text-fg-2">{i.offers || '–'}</td>
                  <td className="nums py-2.5 text-right">{i.best_order_cents !== null ? formatMoney(i.best_order_cents) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/** Cancel buttons share one helper: the answer replaces the Cardmarket document. */
function useCancel() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<number | null>(null)
  const cancel = async (fn: 'listing_cancel' | 'order_cancel', id: number) => {
    setBusy(id)
    const res = await act(fn, fn === 'listing_cancel' ? { p_listing: id } : { p_order: id }, ['cardmarket'])
    setBusy(null)
    if (res) {
      client.setQueryData(['cardmarket', res.item.item_id], res.item)
      toast('success', T.cancelled)
    }
  }
  return { busy, cancel }
}

function MyListings({ mine }: { mine: Cardmarket['mine'] }) {
  const { busy, cancel } = useCancel()
  if (mine.listings.length === 0) return <Panel><EmptyState icon="tag" title={T.noMine} /></Panel>
  return (
    <Panel>
      <ul className="flex flex-col gap-2">
        {mine.listings.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
            <Link to={`/cardmarket/${l.item_id}`} className="min-w-40 flex-1 font-semibold hover:underline">
              {l.qty}× {itemName(l.item_id)}
              {l.slab && <span className="ml-1.5 rounded-md bg-surface-3 px-1.5 text-xs font-bold">{slabName(l.slab)}</span>}
            </Link>
            <span className="nums text-sm text-fg-2">
              {formatMoney(l.price_cents)} {T.each} · {T.value} {formatMoney(l.value_cents)}
            </span>
            <Button size="sm" loading={busy === l.id} onClick={() => cancel('listing_cancel', l.id)}>
              {T.cancel}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function MyOrders({ mine }: { mine: Cardmarket['mine'] }) {
  const { busy, cancel } = useCancel()
  if (mine.orders.length === 0) return <Panel><EmptyState icon="search" title={T.noMineOrders} /></Panel>
  return (
    <Panel>
      <ul className="flex flex-col gap-2">
        {mine.orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
            <Link to={`/cardmarket/${o.item_id}`} className="min-w-40 flex-1 font-semibold hover:underline">
              {o.qty}× {itemName(o.item_id)}
            </Link>
            <span className="nums text-sm text-fg-2">
              {formatMoney(o.price_cents)} {T.each} · {T.value} {formatMoney(o.value_cents)}
            </span>
            <Button size="sm" loading={busy === o.id} onClick={() => cancel('order_cancel', o.id)}>
              {T.cancel}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Parcels({ mine }: { mine: Cardmarket['mine'] }) {
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  if (mine.parcels.length === 0) return <Panel><EmptyState icon="gift" title={T.noParcels} /></Panel>
  return (
    <Panel>
      <ul className="flex flex-col gap-2">
        {mine.parcels.map((p) => {
          const left = (Date.parse(p.arrives_at) - (now + offset)) / 1000
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
              <PixelIcon name={p.incoming ? 'arrow_down' : 'arrow_up'} className={p.incoming ? 'text-gain' : 'text-info'} />
              <span className="min-w-40 flex-1 font-semibold">
                {p.qty}× {itemName(p.item_id)}
              </span>
              <span className="text-sm text-fg-2">{p.incoming ? T.incoming : `${T.outgoing} · ${T.payout(formatMoney(p.payout_cents))}`}</span>
              <span className="nums text-sm font-semibold">{now > 0 && left > 0 ? T.arrives(formatDuration(left)) : T.arrived}</span>
              <InfoTip>{T.parcelsTip}</InfoTip>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
