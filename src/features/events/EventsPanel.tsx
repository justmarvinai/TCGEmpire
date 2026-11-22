import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { formatDuration } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { rpc } from '@/lib/rpc.ts'
import type { GameEvent } from '@/lib/schemas.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { eventDef, eventTarget, eventWhen } from './eventText.ts'

const T = texts.events

export const useEvents = () => useQuery({ queryKey: ['events'], queryFn: () => rpc('events_get'), refetchInterval: 60_000 })

/** Today's event, what runs now and the announced highlights, with countdowns on the server clock. */
export function EventsPanel({ className }: { className?: string }) {
  const q = useEvents()
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const left = (iso: string) => formatDuration(Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000)))
  const d = q.data
  return (
    <Panel title={T.title} tip={T.tip} className={className}>
      {!d ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          {d.today && <EventCard e={d.today} label={T.today} meta={T.untilMidnight(left(d.today.ends_at))} big />}
          {d.active.map((e) => (
            <EventCard key={e.id} e={e} label={T.running} meta={T.runningLeft(left(e.ends_at))} />
          ))}
          {d.upcoming.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wider text-fg-3 uppercase">{T.upcoming}</p>
              <ul className="flex flex-col gap-1">
                {d.upcoming.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold">{eventDef(e.key)?.name ?? e.key}</span>
                    <span className="nums text-xs text-fg-3">{T.startsIn(eventWhen(e.starts_at), left(e.starts_at))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!d.today && d.active.length === 0 && d.upcoming.length === 0 && <p className="text-sm text-fg-3">{T.none}</p>}
        </div>
      )}
    </Panel>
  )
}

function EventCard({ e, label, meta, big }: { e: GameEvent; label: string; meta: string; big?: boolean }) {
  const def = eventDef(e.key)
  const good = def?.tone !== 'bad'
  const target = eventTarget(e.data)
  return (
    <div className={clsx('flex gap-3 rounded-xl p-3', good ? 'bg-gain/10' : 'bg-loss/10')}>
      <PixelIcon name={good ? 'star' : 'bolt'} className={good ? 'text-gain' : 'text-loss'} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={clsx('font-bold', big && 'text-lg')}>{def?.name ?? e.key}</span>
          <span className="nums text-xs text-fg-3">
            {label} · {meta}
          </span>
        </p>
        <p className="text-sm text-fg-2">{def?.text}</p>
        {target && <p className="mt-1 text-xs font-semibold text-fg-2">{target}</p>}
      </div>
    </div>
  )
}
