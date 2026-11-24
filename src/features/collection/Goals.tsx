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

/** Most goals shown at once when several sets are chosen. */
const NEXT = 6

/**
 * Sammelziele: all goals of one set; for several sets the ones nearest to done (the collection shows every set at once).
 */
export function SetGoals({ setIds }: { setIds: readonly string[] }) {
  const q = useQuery({ queryKey: ['goals'], queryFn: () => rpc('goals_get') })
  const mine = (q.data?.goals ?? []).filter((g) => setIds.includes(g.set_id))
  const goals =
    setIds.length === 1
      ? mine
      : mine
          .filter((g) => g.done_at === null)
          .sort((a, b) => b.have / Math.max(1, b.total) - a.have / Math.max(1, a.total))
          .slice(0, NEXT)
  return (
    <Panel title={setIds.length === 1 ? T.goals : T.goalsNext} tip={T.goalsTip} className="mt-6">
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
