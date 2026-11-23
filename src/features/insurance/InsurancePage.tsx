import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDate, formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Insurance, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.insurance

export function InsurancePage() {
  const q = useQuery({ queryKey: ['insurance'], queryFn: () => rpc('insurance_get') })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="shield" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <Policies d={d} player={player} />
      )}
    </Page>
  )
}

function Policies({ d, player }: { d: Insurance; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  const set = async (kind: 'versand' | 'hausrat', on: boolean) => {
    setBusy(kind)
    const res = await act('insurance_set', { p_kind: kind, p_on: on })
    setBusy(null)
    if (res) {
      client.setQueryData(['insurance'], res)
      sfx(on ? 'success' : 'toggle')
      toast(on ? 'success' : 'info', (on ? T.signed : T.cancelled)(T.policies[kind].name))
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {d.policies.map((p) => {
        const info = T.policies[p.kind]
        const needsHome = p.kind === 'hausrat' && !d.has_home && !p.active
        const risk = p.kind === 'versand' ? (d.lost_parcel_bps / 100).toFixed(1).replace('.', ',') : String(d.water_damage_pct)
        return (
          <Panel key={p.kind} tour="insurance-policy" title={info.name} tip={info.text}>
            <div className={clsx('flex flex-col gap-2', p.active && 'rounded-xl bg-surface-3 p-3 outline-2 -outline-offset-2 outline-gain')}>
              <p className="text-sm text-fg-2">{info.text}</p>
              <p className="text-xs text-fg-3">{info.risk(risk)}</p>
              {p.kind === 'hausrat' && <p className="nums text-xs text-fg-3">{T.bulkValue(formatMoney(d.bulk_cents))}</p>}
              <p className="nums text-xl font-bold text-gold">{T.perDay(formatMoney(p.premium_cents))}</p>
              {p.active ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gain">
                    <PixelIcon name="shield" /> {T.active}
                    {p.since && <span className="font-normal text-fg-3">{T.since(formatDate(p.since))}</span>}
                  </span>
                  <Button size="sm" loading={busy === p.kind} disabled={busy !== null} onClick={() => void set(p.kind, false)}>
                    {T.cancel}
                  </Button>
                </div>
              ) : needsHome ? (
                <p className="text-sm text-fg-3">{T.needsHome}</p>
              ) : (
                <Button
                  variant="primary"
                  className="self-start"
                  loading={busy === p.kind}
                  disabled={busy !== null || player.cash_cents < p.premium_cents}
                  onClick={() => void set(p.kind, true)}
                >
                  {T.sign}
                </Button>
              )}
            </div>
          </Panel>
        )
      })}
    </div>
  )
}
