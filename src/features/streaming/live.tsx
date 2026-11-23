import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { SPONSORS } from '../../../content/streaming.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { UNLOCKS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { rpc } from '@/lib/rpc.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.streaming

/** The stream, for every page that shows it (only fetched once the feature is open). */
export function useStream() {
  const level = useMe().data?.player?.level ?? 0
  return useQuery({ queryKey: ['stream'], queryFn: () => rpc('stream_get'), enabled: level >= UNLOCKS.streaming })
}

/** On the opening page while live: the audience at a glance. */
export function LiveBar() {
  const d = useStream().data
  if (!d?.live) return null
  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-loss/10 px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 font-bold text-loss">
        <span className="size-2 rounded-full bg-loss anim-heartbeat" /> {T.liveNow}
      </span>
      <span className="nums">{T.viewersN(d.viewers)}</span>
      <span className="nums">{T.followersN(d.followers)}</span>
      <span className="nums text-gold">{T.todayN(formatMoney(d.today_cents))}</span>
      {d.sponsor && <span className="text-fg-3">{T.presentedBy(SPONSORS.find((x) => x.key === d.sponsor!.key)?.name ?? '')}</span>}
      <Link to="/streaming" className="ml-auto flex items-center gap-1 font-semibold text-accent hover:underline">
        <PixelIcon name="camera" /> {T.manage}
      </Link>
    </p>
  )
}
