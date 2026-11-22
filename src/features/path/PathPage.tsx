import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { ALL_ITEMS } from '@/app/nav.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { useLevelPath } from '@/lib/actions.ts'
import { formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.path

export function PathPage() {
  const path = useLevelPath()
  const level = useMe().data?.player?.level ?? 1
  const here = useRef<HTMLLIElement>(null)
  useEffect(() => {
    here.current?.scrollIntoView({ block: 'center' })
  }, [path.data])

  return (
    <Page icon="path" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      <Panel>
        {path.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : path.isError ? (
          <ErrorState message={errorText(path.error)} onRetry={() => void path.refetch()} />
        ) : (
          <ol className="flex flex-col">
            {path.data.levels.map((l) => {
              const unlocks = ALL_ITEMS.filter((i) => i.level === l.level)
              const reached = l.level <= level
              const next = l.level === level + 1
              return (
                <li
                  key={l.level}
                  ref={next ? here : undefined}
                  className={clsx(
                    'grid grid-cols-[5rem_1fr_auto] items-center gap-4 rounded-xl border-b border-line px-3 py-2.5',
                    reached ? 'opacity-55' : '',
                    next && 'bg-surface-2 outline-2 -outline-offset-2 outline-accent',
                  )}
                >
                  <span className={clsx('text-2xl font-bold tracking-tight', next ? 'text-accent' : 'text-gold')}>Lv {l.level}</span>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {next && <span className="bg-accent px-1.5 text-xs font-bold text-accent-fg">{T.current}</span>}
                    {unlocks.map((u) => (
                      <span key={u.id} className="flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 font-semibold">
                        <PixelIcon name={u.icon} className="text-accent" />
                        {texts.nav.items[u.id]}
                      </span>
                    ))}
                    {reached && <PixelIcon name="check" className="text-gain" />}
                  </div>
                  <div className="nums text-right text-sm">
                    <span className="font-semibold text-gold">{formatMoney(l.reward_cents)}</span>
                    {l.booster && <span className="ml-2 font-semibold text-accent">{T.booster}</span>}
                    <span className="block text-xs text-fg-3">
                      {formatNumber(l.ep)} {T.ep}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>
    </Page>
  )
}
