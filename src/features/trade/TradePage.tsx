import clsx from 'clsx'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, usePlayers } from '@/lib/actions.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Goods, Players, TradeDoc, TradeQuote } from '@/lib/schemas.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { GoodsList, GoodsPicker, NO_GOODS, useSettled } from './GoodsPicker.tsx'

const T = texts.trade

export function TradePage() {
  const q = usePlayers()
  const level = useMe().data?.player?.level ?? 0
  const d = q.data
  return (
    <Page icon="trade" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : level < d.trades.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={texts.locked.levelTitle(d.trades.unlock_level)} />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="flex flex-col gap-4 xl:col-span-5">
            <Offers title={T.incoming} offers={d.trades.open.filter((o) => !o.mine)} />
            <Offers title={T.outgoing} offers={d.trades.open.filter((o) => o.mine)} />
          </div>
          <NewOffer d={d} className="xl:col-span-7" />
        </div>
      )}
    </Page>
  )
}

function Offers({ title, offers }: { title: string; offers: TradeDoc[] }) {
  return (
    <Panel title={title} tip={T.panelTip}>
      {offers.length === 0 ? <p className="text-sm text-fg-3">{T.none}</p> : <div className="flex flex-col gap-3">{offers.map((o) => <Offer key={o.id} o={o} />)}</div>}
    </Panel>
  )
}

function Offer({ o }: { o: TradeDoc }) {
  const act = useAct()
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null)
  const answer = async (accept: boolean) => {
    setBusy(accept ? 'yes' : 'no')
    const res = await act('trade_answer', { p_trade: o.id, p_accept: accept }, ['players', 'trade-inventory'])
    setBusy(null)
    if (res) toast('success', accept ? T.accepted : o.mine ? T.cancelled : T.declined)
  }
  // From the caller's view: what I hand over and what I get.
  const [mine, theirs] = o.mine ? [o.give, o.take] : [o.take, o.give]
  return (
    <article className="rounded-xl bg-surface-2 p-3">
      <header className="mb-2 flex flex-wrap items-baseline gap-x-3 text-sm">
        <b>{o.mine ? T.to(o.to.name) : T.from(o.from.name)}</b>
        <span className="text-xs text-fg-3">{T.expires(formatDuration((Date.parse(o.expires_at) - (now + offset)) / 1000))}</span>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="eyebrow mb-1">{T.give}</p>
          <GoodsList goods={mine} />
        </div>
        <div>
          <p className="eyebrow mb-1">{T.get}</p>
          <GoodsList goods={theirs} />
        </div>
      </div>
      {o.my_tax_cents > 0 && <p className="mt-2 text-xs text-warn">{T.taxNote(formatMoney(o.my_tax_cents))}</p>}
      <div className="mt-3 flex gap-2">
        {!o.mine && (
          <Button size="sm" variant="primary" loading={busy === 'yes'} disabled={busy !== null} onClick={() => void answer(true)}>
            {T.accept}
          </Button>
        )}
        <Button size="sm" loading={busy === 'no'} disabled={busy !== null} onClick={() => void answer(false)}>
          {o.mine ? T.cancel : T.decline}
        </Button>
      </div>
    </article>
  )
}

function NewOffer({ d, className }: { d: Players; className?: string }) {
  const act = useAct()
  const [params] = useSearchParams()
  const others = d.players.filter((p) => !p.me)
  const [partner, setPartner] = useState(() => others.find((p) => p.id === params.get('with'))?.id ?? '')
  const [give, setGive] = useState<Goods>(NO_GOODS)
  const [take, setTake] = useState<Goods>(NO_GOODS)
  const [busy, setBusy] = useState(false)
  const [round, setRound] = useState(0) // new pickers after each sent offer
  const me = d.players.find((p) => p.me)
  const mineInv = useQuery({ queryKey: ['trade-inventory', me?.id], queryFn: () => rpc('trade_inventory', { p_player: me!.id }), enabled: !!me })
  const theirInv = useQuery({ queryKey: ['trade-inventory', partner], queryFn: () => rpc('trade_inventory', { p_player: partner }), enabled: !!partner })
  const settled = useSettled({ partner, give, take })
  const empty = give.money_cents === 0 && give.items.length === 0 && take.money_cents === 0 && take.items.length === 0
  const quote = useQuery({
    queryKey: ['trade-quote', settled],
    queryFn: () => rpc('trade_quote', { p_to: settled.partner, p_give: settled.give, p_take: settled.take }),
    enabled: !!settled.partner,
    placeholderData: keepPreviousData,
  })

  const pickPartner = (id: string) => {
    setPartner(id)
    setTake(NO_GOODS)
  }
  const send = async () => {
    setBusy(true)
    const res = await act('trade_offer', { p_to: partner, p_give: give, p_take: take }, ['players'])
    setBusy(false)
    if (res) {
      toast('success', T.sent)
      setGive(NO_GOODS)
      setTake(NO_GOODS)
      setRound((r) => r + 1)
    }
  }

  return (
    <Panel tour="trade-new" title={T.new} tip={T.newTip} className={className}>
      <label className="mb-4 block text-sm text-fg-2">
        {T.partner}
        <select
          value={partner}
          onChange={(e) => pickPartner(e.target.value)}
          className="panel-inset mt-1 block h-10 w-full bg-transparent px-3 text-fg"
        >
          <option value="">{T.pickPartner}</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · Lv {p.level}
            </option>
          ))}
        </select>
      </label>
      {partner && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="eyebrow mb-2">{T.give}</h3>
              {mineInv.data ? <GoodsPicker key={`mine-${round}`} items={mineInv.data.items} value={give} onChange={setGive} /> : <Skeleton className="h-60 w-full" />}
            </section>
            <section>
              <h3 className="eyebrow mb-2">{T.get}</h3>
              {theirInv.data ? <GoodsPicker key={`${partner}-${round}`} items={theirInv.data.items} value={take} onChange={setTake} /> : <Skeleton className="h-60 w-full" />}
            </section>
          </div>
          <dl className={clsx('mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-surface-2 p-3 text-sm', quote.isFetching && 'opacity-70')}>
            <dt className="text-fg-2">
              {T.give} · {T.value}
            </dt>
            <dd className="nums text-right font-semibold">{formatMoney(quote.data?.give_cents ?? 0)}</dd>
            <dt className="text-fg-2">
              {T.get} · {T.value}
            </dt>
            <dd className="nums text-right font-semibold">{formatMoney(quote.data?.take_cents ?? 0)}</dd>
            <dt className="flex items-center gap-1 text-fg-2">
              {T.yourTax}
              <InfoTip>{T.taxTip}</InfoTip>
            </dt>
            <dd className={clsx('nums text-right font-semibold', (quote.data?.my_tax_cents ?? 0) > 0 && 'text-warn')}>{formatMoney(quote.data?.my_tax_cents ?? 0)}</dd>
            <dt className="text-fg-2">{T.theirTax}</dt>
            <dd className="nums text-right">{formatMoney(quote.data?.their_tax_cents ?? 0)}</dd>
          </dl>
          {quote.data && quote.data.give_cents !== quote.data.take_cents && (
            <ReceiveNote q={quote.data} name={others.find((p) => p.id === partner)?.name ?? ''} />
          )}
          <Button variant="primary" className="mt-4" loading={busy} disabled={empty || quote.isError} onClick={() => void send()}>
            {T.send}
          </Button>
        </>
      )}
    </Panel>
  )
}

/** Whoever gets more value receives a gift: capped per day (decision 111). */
function ReceiveNote({ q, name }: { q: TradeQuote; name: string }) {
  const P = texts.players
  const toThem = q.give_cents > q.take_cents
  const surplus = Math.abs(q.give_cents - q.take_cents)
  const left = toThem ? q.their_receive_left_cents : q.my_receive_left_cents
  return (
    <p className={clsx('mt-2 flex items-center gap-1 text-xs', surplus > left ? 'text-warn' : 'text-fg-3')}>
      {surplus > left
        ? toThem
          ? P.receiveBlocked(name)
          : texts.errors.receive_cap
        : toThem
          ? P.receiveLeft(name, formatMoney(left))
          : P.receiveLeftMe(formatMoney(left))}
      <InfoTip>{P.receiveTip}</InfoTip>
    </p>
  )
}
