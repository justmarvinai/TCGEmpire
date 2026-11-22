import clsx from 'clsx'
import { useState } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { UpgradeRow } from '@/features/upgrades/UpgradeRow.tsx'
import { useAct, useBunker, useUpgrades } from '@/lib/actions.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Bunker } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { useQueryClient } from '@tanstack/react-query'

const T = texts.bunker

/** Bunker content now, interpolated from the server's rate between syncs. */
// Seven stages, seven card-tier colours: Sparschwein grey … Geldspeicher pink. No extra art needed.
const STAGE_TONE = ['text-tier-common', 'text-tier-uncommon', 'text-tier-rare', 'text-tier-holo', 'text-tier-alternative', 'text-tier-ultra', 'text-tier-grail']
const STAGE_OUTLINE = ['outline-tier-common', 'outline-tier-uncommon', 'outline-tier-rare', 'outline-tier-holo', 'outline-tier-alternative', 'outline-tier-ultra', 'outline-tier-grail']

export function useBunkerContent(b: Bunker | undefined) {
  const now = useNow()
  const offset = useWorld((s) => s.clockOffsetMs)
  if (!b?.unlocked || !b.accrual_at || b.rate_cents === undefined || b.capacity_h === undefined) return null
  const hours = now > 0 ? Math.max(0, (now + offset - Date.parse(b.accrual_at)) / 3_600_000) : 0
  const max = b.rate_cents * b.capacity_h
  const content = Math.max(b.content_cents ?? 0, Math.min(max, b.rate_cents * hours))
  return { content, max, fill: max > 0 ? content / max : 0, fullInS: Math.max(0, (b.capacity_h - hours) * 3600) }
}

/** Empties the bunker; used by the bunker page and the home tile. */
export function useCollectBunker() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const collect = async () => {
    setBusy(true)
    const res = await act('bunker_collect', {}, ['quests'])
    setBusy(false)
    if (res) {
      sfx('coin')
      client.setQueryData(['bunker'], res.bunker)
      toast('success', T.collected(formatMoney(res.collected_cents + res.interest_cents)))
    }
  }
  return { busy, collect }
}

export function BunkerPage() {
  const bunker = useBunker()
  const ups = useUpgrades()
  const p = useMe().data?.player
  const { busy, collect } = useCollectBunker()
  const live = useBunkerContent(bunker.data)

  const b = bunker.data
  return (
    <Page icon="vault" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {bunker.isPending || !p ? (
        <Skeleton className="h-72 w-full" />
      ) : bunker.isError ? (
        <ErrorState message={errorText(bunker.error)} onRetry={() => void bunker.refetch()} />
      ) : !b?.unlocked || !live ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(b?.unlock_level ?? 3)} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Panel title={T.stages[b.stage ?? 0]}>
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className={clsx(
                  'grid size-40 place-items-center rounded-3xl bg-surface-2 outline-2',
                  STAGE_OUTLINE[b.stage ?? 0],
                  live.fill >= 1 ? 'text-gold anim-heartbeat' : STAGE_TONE[b.stage ?? 0],
                )}
              >
                <PixelIcon name="vault" scale={4} />
              </div>
              <div className="w-full max-w-sm text-center">
                <p className="text-sm text-fg-3">{T.content}</p>
                <p className="nums text-4xl font-bold tracking-tight text-gold">{formatMoney(Math.floor(live.content))}</p>
                <Progress value={live.fill} tone={live.fill >= 1 ? 'gain' : 'gold'} className="mt-2" />
                <p className="mt-1 text-xs text-fg-3">{live.fill >= 1 ? T.full : T.fullIn(formatDuration(live.fullInS))}</p>
              </div>
              <Button variant="primary" size="lg" loading={busy} disabled={live.content < 1} onClick={collect} className={live.fill >= 1 ? 'anim-nudge' : undefined}>
                {T.collect}
              </Button>
              <dl className="grid w-full grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <dt className="text-fg-3">{T.rate}</dt>
                  <dd className="nums font-semibold">{formatMoney(b.rate_cents ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-fg-3">{T.capacity}</dt>
                  <dd className="nums font-semibold">{b.capacity_h} h</dd>
                </div>
                <div>
                  <dt className="text-fg-3">{T.interestLabel}</dt>
                  <dd className="nums font-semibold">{T.interest(String(b.interest_pct ?? 0))}</dd>
                  <dd className="nums text-xs text-fg-3">{T.interestNote(String(Math.round((b.interest_fill ?? 0) * 100)))}</dd>
                </div>
              </dl>
            </div>
          </Panel>
          <Panel title={T.upgradesTitle} tip={T.upgradesTip}>
            {ups.data ? (
              <div className="flex flex-col gap-2">
                {ups.data.upgrades
                  .filter((u) => u.group === 'bunker')
                  .map((u) => (
                    <UpgradeRow key={u.key} u={u} level={p.level} cash={p.cash_cents} />
                  ))}
              </div>
            ) : (
              <Skeleton className="h-60 w-full" />
            )}
          </Panel>
        </div>
      )}
    </Page>
  )
}
