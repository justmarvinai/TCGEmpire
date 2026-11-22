import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { TOPLISTS, type Toplist, type ToplistId } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'

const T = texts.toplists

export function ToplistsPage() {
  const [list, setList] = useState<ToplistId>('worth')
  const [npcs, setNpcs] = useState(true)
  const q = useQuery({
    queryKey: ['toplist', list, npcs],
    queryFn: () => rpc('toplist_get', { p_list: list, p_npcs: npcs }),
    placeholderData: keepPreviousData,
  })
  return (
    <Page icon="trophy" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
          {TOPLISTS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={list === k}
              onClick={() => setList(k)}
              className={clsx('rounded-lg px-4 py-2 text-sm font-semibold', list === k ? 'bg-grad text-white' : 'text-fg-2 hover:text-fg')}
            >
              {T.tabs[k]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-fg-2">
          <input type="checkbox" checked={npcs} onChange={(e) => setNpcs(e.target.checked)} className="size-4 accent-accent" />
          {T.npcs}
        </label>
      </div>
      {q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !q.data ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Board d={q.data} />
      )}
    </Page>
  )
}

function Board({ d }: { d: Toplist }) {
  const value = (v: number) =>
    d.list === 'worth' || d.list === 'cash' ? formatMoney(v) : d.list === 'collection' ? T.cards(v, d.cards_total) : T.level(v)
  const me = d.rows.find((r) => r.me)
  const ahead = me && d.rows.find((r) => r.rank === me.rank - 1)
  const gap = me && ahead ? ahead.value - me.value : 0
  return (
    <Panel title={T.tabs[d.list]} tip={T.tips[d.list]}>
      {me && (
        <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <b className="mr-2">{T.rank(me.rank)}</b>
          <span className="text-fg-2">
            {!ahead ? T.top : gap > 0 ? T.gap(d.list === 'worth' || d.list === 'cash' ? formatMoney(gap) : d.list === 'level' ? T.level(gap) : String(gap), ahead.rank) : T.gapTie(ahead.rank)}
          </span>
        </p>
      )}
      {d.rows.length === 0 ? (
        <EmptyState icon="trophy" title={T.empty} />
      ) : (
        <ol className="flex flex-col">
          {d.rows.map((r, i) => (
            <Fragment key={r.id}>
              {i > 0 && r.rank > d.rows[i - 1]!.rank + 1 && (
                <li aria-hidden className="py-1 text-center text-fg-3">
                  …
                </li>
              )}
              <li className={clsx('flex items-center gap-3 rounded-xl px-3 py-2.5', r.me ? 'bg-surface-3 ring-1 ring-accent' : 'odd:bg-surface-2')}>
                <span className={clsx('nums w-9 shrink-0 text-right font-bold', r.rank <= 3 ? 'text-gold' : 'text-fg-3')}>{r.rank}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={clsx('truncate font-semibold', r.kind === 'npc' && 'text-fg-2')}>{r.name}</span>
                  {r.kind === 'npc' && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-fg-3">{T.npc}</span>}
                  {r.me && <span className="rounded-md bg-grad px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-white">{T.you}</span>}
                  {r.title && <span className="truncate text-xs text-accent max-sm:hidden">{r.title}</span>}
                </span>
                {d.list !== 'level' && <span className="nums shrink-0 text-xs text-fg-3 max-sm:hidden">{T.level(r.level)}</span>}
                <span className="nums w-36 shrink-0 text-right font-semibold">{value(r.value)}</span>
              </li>
            </Fragment>
          ))}
        </ol>
      )}
    </Panel>
  )
}
