import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { slabName } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { centsToEuros, eurosToCents, ItemArt } from '@/features/cardmarket/common.tsx'
import { useAct } from '@/lib/actions.ts'
import { AD_REPLIES, AD_SELLERS, AD_TITLES, itemName } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Ads } from '@/lib/schemas.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.kleinanzeigen
type Tab = keyof typeof T.tabs
type ReplyKind = keyof typeof AD_REPLIES

const pick = <X,>(list: readonly X[], i: number) => list[Math.abs(i) % list.length]!
/** The NPC's answer line with the price filled in. */
const replyText = (kind: string | null, idx: number | null, cents: number) =>
  kind && kind in AD_REPLIES ? pick(AD_REPLIES[kind as ReplyKind], idx ?? 0).replace('{price}', formatMoney(cents)) : ''

export function KleinanzeigenPage() {
  const q = useQuery({ queryKey: ['ads'], queryFn: () => rpc('ads_get') })
  const [tab, setTab] = useState<Tab>('board')
  const d = q.data
  return (
    <Page icon="tag" title={T.title} subtitle={T.subtitle} tip={T.tip}>
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
                {k === 'mine' && d.mine.some((m) => m.offers.length > 0) && <span className="ml-1.5 opacity-80">•</span>}
              </button>
            ))}
          </div>
          {tab === 'board' ? <Board d={d} /> : <Mine d={d} />}
        </>
      )}
    </Page>
  )
}

/** Writes answer with the whole ads document. */
function useAdsAct() {
  const act = useAct()
  const client = useQueryClient()
  return async <N extends 'ad_offer' | 'ad_post' | 'ad_remove' | 'ad_answer'>(fn: N, args: Record<string, unknown>) => {
    const res = await act(fn, args, ['shop', 'binder', 'quests'])
    if (res) client.setQueryData(['ads'], res.ads)
    return res
  }
}

function Board({ d }: { d: Ads }) {
  if (d.board.length === 0) return <Panel><EmptyState icon="tag" title={T.empty} /></Panel>
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" data-tour="kleinanzeigen-board">
      {d.board.map((a) => (
        <AdCard key={a.id} a={a} />
      ))}
    </div>
  )
}

function AdCard({ a }: { a: Ads['board'][number] }) {
  const run = useAdsAct()
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const [price, setPrice] = useState(centsToEuros(a.mine?.counter_cents ?? Math.round(a.ask_cents * 0.8)))
  const [busy, setBusy] = useState<string | null>(null)
  const seller = a.seller ?? pick(AD_SELLERS, a.seller_idx)
  const title = pick(AD_TITLES[a.style], a.title_idx).replace('{card}', itemName(a.item_id))
  const blocked = a.mine?.state === 'blocked'
  const left = (Date.parse(a.expires_at) - (now + offset)) / 1000
  const send = async (cents: number, key: string) => {
    setBusy(key)
    const res = await run('ad_offer', { p_ad: a.id, p_price: cents })
    setBusy(null)
    if (!res) return
    const r = res.result
    if (r.state === 'accepted') toast(r.outcome === 'ok' ? 'success' : 'error', T[r.outcome === 'ok' ? 'bought' : r.outcome])
    else if (r.counter_cents) setPrice(centsToEuros(r.counter_cents))
  }
  const cents = eurosToCents(price)
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex gap-4">
        <ItemArt id={a.item_id} scale={1} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{T.styles[a.style]}</p>
          {a.suspicious && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-loss/15 px-2 py-0.5 text-xs font-bold text-loss" title={T.suspiciousTip}>
              <PixelIcon name="skull" /> {T.suspicious}
            </p>
          )}
          <p className="mt-1 leading-snug font-semibold">{title}</p>
          <p className="mt-1 text-sm text-fg-2">
            {a.qty > 1 && `${a.qty}× `}
            {itemName(a.item_id)} · {seller}
          </p>
          <p className="nums mt-2 text-2xl font-bold tracking-tight text-gold">
            {formatMoney(a.ask_cents)} <span className="text-sm text-fg-3">{T.vb}</span>
          </p>
          <p className="nums text-xs text-fg-3">
            {T.value} {formatMoney(a.value_cents)} · {now > 0 && left > 0 ? T.left(formatDuration(left)) : ''}
          </p>
          {a.min_cents !== null && <p className="nums text-xs font-semibold text-accent">{T.painThreshold(formatMoney(a.min_cents))}</p>}
        </div>
      </div>
      {a.mine && (
        <p className={clsx('rounded-xl px-3 py-2 text-sm', blocked ? 'bg-loss/15 text-loss' : 'bg-surface-2 text-fg-2')}>
          <b className="text-fg">{seller}:</b> „{replyText(a.mine.reply_kind, a.mine.reply_idx, a.mine.counter_cents ?? a.mine.price_cents)}“
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-end gap-2">
        <Field label={T.yourOffer} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-36" disabled={blocked} />
        <Button disabled={blocked || !(cents > 0) || busy !== null} loading={busy === 'offer'} onClick={() => send(cents, 'offer')}>
          {blocked ? T.blocked : T.offer}
        </Button>
        <Button variant="primary" disabled={blocked || busy !== null} loading={busy === 'buy'} onClick={() => send(a.ask_cents, 'buy')}>
          {T.buyNow}
        </Button>
      </div>
    </Panel>
  )
}

function Mine({ d }: { d: Ads }) {
  const run = useAdsAct()
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (key: string, fn: 'ad_remove' | 'ad_answer', args: Record<string, unknown>, done: string) => {
    setBusy(key)
    const res = await run(fn, args)
    setBusy(null)
    if (res) toast('success', done)
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <PostForm d={d} />
      <div className="flex flex-col gap-4">
        {d.mine.length === 0 && (
          <Panel>
            <EmptyState icon="tag" title={T.noMine} />
          </Panel>
        )}
        {d.mine.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-center gap-4">
              <ItemArt id={m.item_id} scale={1} />
              <div className="min-w-40 flex-1">
                <p className="font-semibold">
                  {m.qty > 1 && `${m.qty}× `}
                  {itemName(m.item_id)}
                </p>
                <p className="nums text-xl font-bold text-gold">{formatMoney(m.ask_cents)}</p>
                <p className="nums text-xs text-fg-3">
                  {T.value} {formatMoney(m.value_cents)}
                </p>
              </div>
              <Button size="sm" loading={busy === `r${m.id}`} onClick={() => go(`r${m.id}`, 'ad_remove', { p_ad: m.id }, T.removed)}>
                {T.remove}
              </Button>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {m.offers.length === 0 && <li className="text-sm text-fg-3">{T.noOffers}</li>}
              {m.offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <p className="min-w-48 flex-1 text-sm">
                    <b>{o.name}:</b> „{replyText(o.reply_kind, o.reply_idx, o.price_cents)}“
                  </p>
                  <span className="nums font-bold">{formatMoney(o.price_cents)}</span>
                  <Button size="sm" variant="primary" loading={busy === `a${o.id}`} onClick={() => go(`a${o.id}`, 'ad_answer', { p_offer: o.id, p_accept: true }, T.sold)}>
                    {T.accept}
                  </Button>
                  <Button size="sm" loading={busy === `d${o.id}`} onClick={() => go(`d${o.id}`, 'ad_answer', { p_offer: o.id, p_accept: false }, T.declined)}>
                    {T.decline}
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  )
}

type Choice = { key: string; kind: 'card' | 'copy' | 'sealed'; item: string; copy: string | null; max: number; label: string }

function PostForm({ d }: { d: Ads }) {
  const run = useAdsAct()
  const choices: Choice[] = [
    ...d.owned.stacks.map((s) => ({ key: `s:${s.item_id}`, kind: 'card' as const, item: s.item_id, copy: null, max: s.qty, label: `${s.qty}× ${itemName(s.item_id)}` })),
    ...d.owned.copies.map((c) => ({
      key: `c:${c.copy_id}`,
      kind: 'copy' as const,
      item: c.item_id,
      copy: c.copy_id,
      max: 1,
      label: c.slab ? `${itemName(c.item_id)} · ${slabName(c.slab)}` : itemName(c.item_id),
    })),
    ...d.owned.sealed.map((s) => ({ key: `p:${s.item_id}`, kind: 'sealed' as const, item: s.item_id, copy: null, max: s.qty, label: `${s.qty}× ${itemName(s.item_id)}` })),
  ]
  const [key, setKey] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const choice = choices.find((c) => c.key === key)
  const n = Math.floor(Number(qty))
  const cents = eurosToCents(price)
  const full = d.mine.length >= d.slots
  const submit = async () => {
    if (!choice) return
    setBusy(true)
    const res = await run('ad_post', { p_kind: choice.kind, p_item: choice.item, p_copy: choice.copy, p_qty: choice.kind === 'copy' ? 1 : n, p_price: cents })
    setBusy(false)
    if (res) {
      toast('success', T.posted)
      setKey('')
      setPrice('')
    }
  }
  return (
    <Panel tour="kleinanzeigen-post" title={T.postTitle} tip={T.postTip} action={<span className="nums text-xs text-fg-3">{T.slots(d.mine.length, d.slots)}</span>}>
      <label className="mb-1 block text-sm font-medium text-fg-2" htmlFor="ad-what">
        {T.what}
      </label>
      <select
        id="ad-what"
        value={key}
        onChange={(e) => {
          setKey(e.target.value)
          setQty('1')
        }}
        className="panel-inset mb-3 h-10 w-full bg-transparent px-2 text-sm"
      >
        <option value="">{T.pick}</option>
        {choices.map((c) => (
          <option key={c.key} value={c.key} className="bg-surface-1">
            {c.label}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-end gap-3">
        {choice && choice.kind !== 'copy' && (
          <Field label={T.qty} type="number" min={1} max={choice.max} value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" />
        )}
        <Field label={T.price} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-32" />
        <Button
          variant="primary"
          disabled={full || !choice || !(cents > 0) || (choice.kind !== 'copy' && (n < 1 || n > choice.max))}
          loading={busy}
          onClick={submit}
        >
          {T.post}
        </Button>
      </div>
    </Panel>
  )
}
