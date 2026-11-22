import clsx from 'clsx'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Chart } from '@/components/ui/Chart.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { formatPercent } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { texts } from '@/texts/de.ts'

const T = texts.market
const RANGES = ['day', 'week', 'month', 'all'] as const
type Range = (typeof RANGES)[number]

/** The Marktwert of one card or sealed product over time, with a range switch. */
export function PriceChart({ itemId }: { itemId: string }) {
  const [range, setRange] = useState<Range>('week')
  const q = useQuery({
    queryKey: ['market', itemId, range],
    queryFn: () => rpc('market_item', { p_item: itemId, p_range: range }),
    staleTime: 60_000,
  })
  const d = q.data
  const first = d?.history[0]?.[1]
  const change = d && first ? (d.value_cents - first) / first : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5">
          {T.chart}
          <InfoTip>{T.chartTip}</InfoTip>
        </p>
        <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5" role="tablist" aria-label={T.chart}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={r === range}
              onClick={() => setRange(r)}
              className={clsx('rounded-md px-2 py-0.5 text-xs font-semibold', r === range ? 'bg-surface-3 text-fg' : 'text-fg-3 hover:text-fg')}
            >
              {T.ranges[r]}
            </button>
          ))}
        </div>
      </div>
      {q.isPending ? (
        <Skeleton className="mt-3 h-24 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : d.history.length < 2 ? (
        <p className="mt-3 text-sm text-fg-3">{T.noData}</p>
      ) : (
        <>
          <div className="mt-3">
            <Chart points={d.history} tone={change >= 0 ? 'gain' : 'loss'} label={T.chart} />
          </div>
          <p className={clsx('nums mt-1.5 text-xs font-semibold', change >= 0 ? 'text-gain' : 'text-loss')}>
            {T.change(formatPercent(change), T.ranges[range])}
          </p>
        </>
      )}
    </div>
  )
}
