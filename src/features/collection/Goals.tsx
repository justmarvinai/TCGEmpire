import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { GOALS } from '@/lib/catalog.ts'
import { rpc } from '@/lib/rpc.ts'
import { texts } from '@/texts/de.ts'

const T = texts.collection

/** Sammelziele of one set: progress, the bonus, done or not. */
export function SetGoals({ setId }: { setId: string }) {
  const q = useQuery({ queryKey: ['goals'], queryFn: () => rpc('goals_get') })
  const goals = (q.data?.goals ?? []).filter((g) => g.set_id === setId)
  return (
    <Panel title={T.goals} tip={T.goalsTip} className="mt-6">
      {!q.data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const def = GOALS.find((d) => d.key === g.key)
            const done = g.done_at !== null
            return (
              <li key={g.key} className={clsx('rounded-xl p-3', done ? 'bg-surface-3 ring-1 ring-gold' : 'bg-surface-2')}>
                <p className="flex items-center gap-2">
                  <PixelIcon name={done ? 'trophy' : 'binder'} className={done ? 'text-gold' : 'text-fg-3'} />
                  <b className="min-w-0 flex-1 truncate">{def?.name ?? g.key}</b>
                  <span className="nums text-xs text-fg-3">{done ? T.goalDone : T.goalProgress(g.have, g.total)}</span>
                </p>
                <Progress value={g.have / Math.max(1, g.total)} tone="gold" className="mt-2" label={def?.name ?? g.key} />
                <p className="mt-2 text-xs text-accent">{T.bonus[g.stat]?.(g.value) ?? `${g.stat} +${g.value}`}</p>
                {done && def && <p className="mt-1 text-xs text-fg-2">{def.joke}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
