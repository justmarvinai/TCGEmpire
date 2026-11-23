import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SPONSORS } from '../../../content/streaming.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatClock, formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Stream } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { UNLOCKS } from '@/lib/catalog.ts'

const T = texts.streaming

/** The stream, for every page that shows it (only fetched once the feature is open). */
export function useStream() {
  const level = useMe().data?.player?.level ?? 0
  return useQuery({ queryKey: ['stream'], queryFn: () => rpc('stream_get'), enabled: level >= UNLOCKS.streaming })
}

export function StreamingPage() {
  const q = useStream()
  const player = useMe().data?.player
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const d = q.data
  const toggle = async (on: boolean) => {
    setBusy(true)
    const res = await act('stream_set', { p_live: on })
    setBusy(false)
    if (!res) return
    client.setQueryData(['stream'], res)
    sfx(on ? 'success' : 'toggle')
    toast(on ? 'success' : 'info', on ? T.wentLive : T.ended)
  }
  return (
    <Page icon="camera" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {!player || (player.level >= UNLOCKS.streaming && q.isPending) ? (
        <Skeleton className="h-64 w-full" />
      ) : player.level < UNLOCKS.streaming ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(UNLOCKS.streaming)} />
        </Panel>
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel title={T.channel} tip={T.channelTip}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label={T.followers} value={formatNumber(d.followers)} />
              <Stat label={T.viewers} value={d.live ? formatNumber(d.viewers) : T.offline} />
              <Stat label={T.total} value={formatMoney(d.total_cents)} />
              <Stat label={T.today} value={formatMoney(d.today_cents)} tip={T.capTip(formatMoney(d.cap_cents))} />
            </div>
            <Progress className="mt-3" value={d.cap_cents ? d.today_cents / d.cap_cents : 0} tone="gold" label={T.capLabel} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {d.live ? (
                <>
                  <Button variant="danger" loading={busy} disabled={busy} onClick={() => void toggle(false)}>
                    {T.end}
                  </Button>
                  <Link to="/open">
                    <Button variant="primary">{T.toOpen}</Button>
                  </Link>
                </>
              ) : (
                <Button variant="primary" loading={busy} disabled={busy} onClick={() => void toggle(true)}>
                  {T.goLive}
                </Button>
              )}
            </div>
          </Panel>
          <SponsorPanel d={d} />
        </div>
      )}
    </Page>
  )
}

function Stat({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="flex items-center gap-1 text-xs text-fg-3">
        {label} {tip && <InfoTip>{tip}</InfoTip>}
      </p>
      <p className="nums text-lg font-bold">{value}</p>
    </div>
  )
}

function SponsorPanel({ d }: { d: Stream }) {
  const s = d.sponsor
  const def = s ? SPONSORS.find((x) => x.key === s.key) : undefined
  return (
    <Panel title={T.sponsor} tip={T.sponsorTip}>
      {!s ? (
        <p className="text-sm text-fg-3">{T.noSponsor}</p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{def?.name ?? s.key}</p>
          <p className="text-fg-2">{def?.text}</p>
          <p>{T.deal(s.need, formatMoney(s.reward_cents))}</p>
          <Progress value={s.need ? s.done / s.need : 0} tone="gain" label={T.dealProgress(s.done, s.need)} />
          <p className="nums text-xs text-fg-3">
            {T.dealProgress(s.done, s.need)} · {T.until(formatClock(s.until))}
          </p>
        </div>
      )}
    </Panel>
  )
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
