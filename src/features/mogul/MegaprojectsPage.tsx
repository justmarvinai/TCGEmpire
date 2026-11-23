import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MEGAPROJECTS, TROPHIES } from '../../../content/mogul.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { eurosToCents as cents } from '@/features/cardmarket/common.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDate, formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Mega } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.mega
const project = (key: string) => MEGAPROJECTS.find((m) => m.key === key)
const trophy = (key: string) => TROPHIES.find((t) => t.key === key)

export function MegaprojectsPage() {
  const q = useQuery({ queryKey: ['mega'], queryFn: () => rpc('megaprojects_get'), refetchInterval: 30_000 })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="crane" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Projects d={d} />
          <Museum d={d} />
        </div>
      )}
    </Page>
  )
}

function useMega() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async <N extends 'megaproject_donate' | 'museum_bid'>(key: string, fn: N, args: Record<string, unknown>) => {
    setBusy(key)
    const res = await act(fn, args)
    setBusy(null)
    if (res) client.setQueryData(['mega'], res)
    return res
  }
  return { busy, run }
}

function Projects({ d }: { d: Mega }) {
  const { busy, run } = useMega()
  const [amount, setAmount] = useState('')
  const donate = async () => {
    const res = await run('donate', 'megaproject_donate', { p_cents: cents(amount) })
    if (!res) return
    setAmount('')
    sfx('coin')
    toast('success', T.donated(formatMoney(cents(amount))))
  }
  return (
    <Panel title={T.projects} tip={T.projectsTip}>
      <ul className="flex flex-col gap-3">
        {d.projects.map((p) => {
          const def = project(p.key)
          const active = d.active === p.key
          return (
            <li key={p.key} className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{def?.name ?? p.key}</span>
                {p.done_at ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-gain">
                    <PixelIcon name="check" /> {T.done(formatDate(p.done_at))}
                  </span>
                ) : !active ? (
                  <span className="text-xs text-fg-3">{T.later}</span>
                ) : null}
              </p>
              <p className="text-fg-2">{def?.text}</p>
              <p className="mt-1 text-xs font-semibold text-accent">{def?.bonus}</p>
              {(active || p.done_at) && (
                <>
                  <Progress className="mt-2" value={Math.min(1, p.donated_cents / p.goal_cents)} tone={p.done_at ? 'gain' : 'accent'} />
                  <p className="nums mt-1 text-xs text-fg-3">{T.progress(formatMoney(p.donated_cents), formatMoney(p.goal_cents), formatMoney(p.mine_cents))}</p>
                </>
              )}
              {p.donors.length > 0 && (
                <p className="mt-1 text-xs text-fg-2">
                  {p.done_at ? T.plaque : T.donors}: {p.donors.map((x) => `${x.name} (${formatMoney(x.cents)})`).join(', ')}
                </p>
              )}
              {active && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <Field className="w-40" label={T.amount} hint={T.min(formatMoney(d.min_cents))} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <Button size="sm" variant="primary" loading={busy === 'donate'} disabled={busy !== null || !(cents(amount) >= d.min_cents)} onClick={() => void donate()}>
                    {T.donate}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Museum({ d }: { d: Mega }) {
  const { busy, run } = useMega()
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const [bids, setBids] = useState<Record<number, string>>({})
  const bid = async (id: number, min: number) => {
    const value = bids[id] ? cents(bids[id]!) : min
    const res = await run(String(id), 'museum_bid', { p_auction: id, p_cents: value })
    if (!res) return
    sfx('coin')
    toast('success', T.bidDone(formatMoney(value)))
  }
  return (
    <Panel title={T.museum} tip={T.museumTip}>
      {d.auctions.length === 0 ? (
        <p className="text-sm text-fg-3">{T.noAuction}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {d.auctions.map((a) => (
            <li key={a.id} className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{trophy(a.key)?.name ?? a.key}</span>
                <span className="nums text-xs text-fg-3">{T.endsIn(formatDuration(Math.max(0, Math.round((Date.parse(a.ends_at) - now) / 1000))))}</span>
              </p>
              <p className="text-fg-2">{trophy(a.key)?.text}</p>
              <p className="nums mt-1">
                {a.bid_cents ? T.highest(formatMoney(a.bid_cents), a.mine ? T.you : (a.bidder ?? '?')) : T.start(formatMoney(a.start_cents))}
              </p>
              {!a.mine && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <Field
                    className="w-40"
                    label={T.yourBid}
                    hint={T.minBid(formatMoney(a.min_cents))}
                    inputMode="decimal"
                    value={bids[a.id] ?? ''}
                    onChange={(e) => setBids((b) => ({ ...b, [a.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="primary" loading={busy === String(a.id)} disabled={busy !== null} onClick={() => void bid(a.id, a.min_cents)}>
                    {T.bid}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 mb-1 text-xs font-bold tracking-wider text-fg-3 uppercase">{T.hall}</p>
      {d.hall.length === 0 ? (
        <p className="text-sm text-fg-3">{T.hallEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {d.hall.map((h) => (
            <li key={h.key} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex items-center gap-1 font-semibold">
                <PixelIcon name="trophy" className="text-gold" /> {trophy(h.key)?.name ?? h.key}
              </span>
              <span className="nums text-xs text-fg-2">{T.owner(h.owner ?? '?', formatMoney(h.paid_cents), formatDate(h.at))}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
