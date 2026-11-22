import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BARES_DEALERS, BARES_FIXED_DEALER } from '../../../content/bares.ts'
import { slabName } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Bares } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.bares
type Shown = { card_id: string; grader: string | null; grade: number | null; black_label: boolean | null }

const label = (c: Shown) =>
  c.grader && c.grade !== null ? slabName({ grader: c.grader as 'psa', grade: c.grade, black_label: Boolean(c.black_label) }) : T.raw
const dealer = (idx: number | null) => (idx === null ? BARES_FIXED_DEALER : (BARES_DEALERS[idx] ?? '?'))

export function BaresPage() {
  const q = useQuery({ queryKey: ['bares'], queryFn: () => rpc('bares_get') })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="coin" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : d.today ? (
        <Studio d={d} />
      ) : (
        <Pick d={d} />
      )}
    </Page>
  )
}

function useBares() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async <N extends 'bares_appraise' | 'bares_deal'>(key: string, fn: N, args: Record<string, unknown>) => {
    setBusy(key)
    const res = await act(fn, args)
    setBusy(null)
    if (res) client.setQueryData(['bares'], res)
    return res
  }
  return { busy, run }
}

function Pick({ d }: { d: Bares }) {
  const { busy, run } = useBares()
  return (
    <Panel title={T.pick} tip={T.pickTip} className="max-w-3xl">
      {d.copies.length === 0 ? (
        <EmptyState icon="card" title={T.empty} />
      ) : (
        <ul className="flex max-h-[32rem] flex-col gap-1.5 overflow-y-auto pr-1">
          {d.copies.map((c) => (
            <li key={c.copy_id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{cardName(c.card_id)}</span>
                <span className="text-xs text-fg-3">{label(c)}</span>
              </span>
              <span className="nums text-gold">{formatMoney(c.value_cents)}</span>
              <Button
                size="sm"
                loading={busy === c.copy_id}
                disabled={busy !== null}
                onClick={() => void run(c.copy_id, 'bares_appraise', { p_copy: c.copy_id }).then((r) => r && sfx('open'))}
              >
                {T.go}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Studio({ d }: { d: Bares }) {
  const { busy, run } = useBares()
  const s = d.today!
  const deal = async (i: number | null) => {
    const res = await run(String(i), 'bares_deal', { p_offer: i })
    if (!res) return
    if (i === null) {
      sfx('toggle')
      toast('info', T.noDealDone)
    } else {
      sfx('coin')
      toast('success', T.dealDone(dealer(s.offers[i]!.dealer), formatMoney(s.offers[i]!.cents)))
    }
  }
  const best = Math.max(...s.offers.map((o) => o.cents))
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={T.studio} tip={T.studioTip}>
        <p className="text-lg font-bold">{cardName(s.card_id)}</p>
        <p className="text-sm text-fg-3">{label(s)}</p>
        <p className="mt-3 flex items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1 text-fg-2">
            {T.estimate} <InfoTip>{T.estimateTip}</InfoTip>
          </span>
          <span className="nums text-xl font-bold text-gold">{formatMoney(s.estimate_cents)}</span>
        </p>
        <p className="mt-1 flex items-baseline justify-between gap-2 text-sm">
          <span className="text-fg-2">{T.value}</span>
          <span className="nums text-fg-2">{formatMoney(s.value_cents)}</span>
        </p>
      </Panel>
      <Panel title={T.dealers} tip={T.dealersTip}>
        {s.sold !== null ? (
          <p className="text-sm">
            {s.sold >= 0 ? T.sold(dealer(s.offers[s.sold]!.dealer), formatMoney(s.offers[s.sold]!.cents)) : T.notSold}
            <span className="mt-1 block text-xs text-fg-3">{T.tomorrow}</span>
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {s.offers.map((o, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{dealer(o.dealer)}</span>
                  <span className={o.cents === best ? 'nums font-bold text-gain' : 'nums text-fg-2'}>{formatMoney(o.cents)}</span>
                  <Button size="sm" variant={o.cents === best ? 'primary' : 'neutral'} loading={busy === String(i)} disabled={busy !== null} onClick={() => void deal(i)}>
                    {T.deal}
                  </Button>
                </li>
              ))}
            </ul>
            <Button className="mt-3" size="sm" loading={busy === 'null'} disabled={busy !== null} onClick={() => void deal(null)}>
              {T.noDeal}
            </Button>
          </>
        )}
      </Panel>
    </div>
  )
}
