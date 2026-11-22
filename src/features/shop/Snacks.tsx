import { useState } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { CONSUMABLES } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import type { Player, Shop } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { SNACK_ICON } from './icons.ts'

const T = texts.snacks

/** Kiosk snacks (money) or the Pfandautomat (Pfandbons). */
export function Snacks({ shop, player, where }: { shop: Shop; player: Player; where: 'kiosk' | 'pfandautomat' }) {
  const act = useAct()
  const [busy, setBusy] = useState<string | null>(null)
  const items = CONSUMABLES.filter((c) => c.where === where)
  const use = async (key: string, name: string) => {
    setBusy(key)
    const res = await act('consumable_use', { p_key: key }, ['shop'])
    setBusy(null)
    if (res) {
      sfx('success')
      toast('success', T.used(name))
    }
  }
  return (
    <Panel
      title={where === 'kiosk' ? T.title : T.automat}
      tip={where === 'kiosk' ? T.tip : T.automatTip}
      action={where === 'pfandautomat' ? <span className="nums text-sm text-gain">{T.bons(player.pfandbons)}</span> : undefined}
    >
      <div className="flex flex-col gap-2">
        {items.map((c) => {
          const offer = shop.snacks.find((s) => s.key === c.key)
          const affordable = where === 'kiosk' ? player.cash_cents >= (offer?.price_cents ?? Infinity) : player.pfandbons >= (c.pfandbons ?? Infinity)
          return (
            <div key={c.key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <PixelIcon name={SNACK_ICON[c.key] ?? 'gift'} scale={2} className="text-accent" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-semibold">
                  {c.name} <InfoTip>{c.text}</InfoTip>
                </p>
                <p className="nums text-xs text-fg-3">
                  {where === 'kiosk' ? formatMoney(offer?.price_cents ?? 0) : T.bons(c.pfandbons ?? 0)}
                </p>
              </div>
              <Button size="sm" variant="primary" disabled={!affordable || busy !== null} loading={busy === c.key} onClick={() => use(c.key, c.name)}>
                {where === 'kiosk' ? T.buy : T.redeem}
              </Button>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
