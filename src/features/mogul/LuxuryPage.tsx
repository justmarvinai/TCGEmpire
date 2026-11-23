import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LUXURY } from '../../../content/mogul.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.luxury
const GROUPS = ['auto', 'uhr', 'yacht', 'jet'] as const

export function LuxuryPage() {
  const q = useQuery({ queryKey: ['luxury'], queryFn: () => rpc('luxury_get', { p_player: null }) })
  const player = useMe().data?.player
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const d = q.data
  const buy = async (key: string) => {
    setBusy(key)
    const res = await act('luxury_buy', { p_key: key })
    setBusy(null)
    if (!res) return
    client.setQueryData(['luxury'], res)
    sfx('coin')
    toast('success', T.bought(LUXURY.find((l) => l.key === key)?.name ?? key))
  }
  return (
    <Page icon="diamond" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <Panel key={g} tour="luxury-group" title={T.groups[g]} tip={T.groupTip}>
              <ul className="flex flex-col gap-2">
                {LUXURY.filter((l) => l.group === g).map((l) => {
                  const owned = d.owned.some((o) => o.key === l.key)
                  const price = d.prices?.[l.key] ?? 0
                  return (
                    <li key={l.key} className={clsx('flex flex-col gap-1 rounded-xl bg-surface-2 p-3 text-sm', owned && 'outline-2 -outline-offset-2 outline-gold')}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{l.name}</span>
                        <span className="nums text-gold">{formatMoney(price)}</span>
                      </span>
                      <span className="text-fg-2">{l.text}</span>
                      {owned ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-gold">
                          <PixelIcon name="check" /> {T.owned}
                        </span>
                      ) : player.level < l.level ? (
                        <span className="text-xs text-fg-3">{T.fromLevel(l.level)}</span>
                      ) : (
                        <Button
                          size="sm"
                          className="self-start"
                          loading={busy === l.key}
                          disabled={busy !== null || player.cash_cents < price}
                          onClick={() => void buy(l.key)}
                        >
                          {T.buy}
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </Page>
  )
}
