import clsx from 'clsx'
import { useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { UPGRADES } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import type { Upgrades } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { useQueryClient } from '@tanstack/react-query'

const T = texts.upgrades
type Upgrade = Upgrades['upgrades'][number]

function effect(unit: string, v: number) {
  if (unit === 'eur_h') return `${formatMoney(v)}/h`
  if (unit === 'h') return `+${v} h`
  if (unit === 'pct') return `+${v} %`
  return `+${v}`
}

/** One upgrade: what it does, "jetzt -> danach", cost, and the buy button. */
export function UpgradeRow({ u, level, cash }: { u: Upgrade; level: number; cash: number }) {
  const def = UPGRADES.find((d) => d.key === u.key)
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  if (!def) return null
  const maxed = u.next === null
  const locked = level < u.need_level
  const payback = def.unit === 'eur_h' && u.next !== null && u.cost_cents ? (u.cost_cents / (u.next - u.now)) * 3600 : null

  const buy = async () => {
    setBusy(true)
    const res = await act('upgrade_buy', { p_key: u.key }, ['bunker'])
    setBusy(false)
    if (res) {
      sfx('success')
      client.setQueryData(['upgrades'], { unlock_level: res.unlock_level, upgrades: res.upgrades })
      toast('success', T.bought(def.name))
    }
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 bg-surface-2 p-3 max-md:grid-cols-1">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">
          {def.name}
          <InfoTip>{def.text}</InfoTip>
          <span className="nums text-xs font-normal text-fg-3">{T.level(u.level, u.max)}</span>
        </p>
        <Progress value={u.level / u.max} tone="gold" className="mt-1 max-w-60" />
        <p className="nums mt-1 text-sm">
          <span className="text-fg-2">{effect(def.unit, u.now)}</span>
          {!maxed && (
            <>
              <span className="mx-1.5 text-fg-3">→</span>
              <span className="font-semibold text-gain">{effect(def.unit, u.next!)}</span>
            </>
          )}
          {payback !== null && <span className="ml-3 text-xs text-fg-3">{T.payback(formatDuration(payback))}</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 max-md:items-start">
        {maxed ? (
          <span className="font-pixel text-gold">{T.max}</span>
        ) : (
          <>
            <span className={clsx('nums font-semibold', cash >= (u.cost_cents ?? 0) ? 'text-gold' : 'text-loss')}>
              {formatMoney(u.cost_cents ?? 0)}
            </span>
            <Button variant="primary" size="sm" loading={busy} disabled={locked || cash < (u.cost_cents ?? 0)} onClick={buy}>
              {locked ? T.needLevel(u.need_level) : T.buy}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
