import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { FURNISHING_SLOTS, FURNITURE, HOMES, type FurnitureDef } from '@/lib/catalog.ts'
import { formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Housing, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.housing

/** One icon per furnishing slot (the small fixed icon set). */
export const SLOT_ICON: Record<string, IconName> = {
  schreibtisch: 'briefcase',
  sofa: 'heart',
  wand: 'star',
  vitrine: 'slab',
  teppich: 'sparkle',
  gaming: 'swords',
  haustier: 'shield',
  deko: 'diamond',
}

/** "+4 %", "+15 Energie" … for a furnishing item. */
export function bonusText(f: FurnitureDef) {
  const slot = FURNISHING_SLOTS.find((s) => s.key === f.slot)!
  return `${T.bonus[slot.unit](f.value)} ${T.bonusOf[f.slot] ?? ''}`.trim()
}

export const useHousing = () => useQuery({ queryKey: ['housing'], queryFn: () => rpc('housing_get') })

export function HousingPage() {
  const q = useHousing()
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="house" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <Home d={d} player={player} />
      )}
    </Page>
  )
}

function Home({ d, player }: { d: Housing; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const home = HOMES[d.tier]!
  const put = (doc: Housing) => client.setQueryData(['housing'], doc)

  const move = async (tier: number) => {
    setBusy(`h${tier}`)
    const res = await act('home_buy', { p_tier: tier }, ['profile'])
    setBusy(null)
    if (res) {
      put(res)
      sfx('levelup')
      toast('success', T.moved(HOMES[tier]!.name, HOMES[tier]!.article))
    }
  }
  const buy = async (f: FurnitureDef) => {
    setBusy(f.key)
    const res = await act('furniture_buy', { p_key: f.key }, ['profile'])
    setBusy(null)
    if (res) {
      put(res)
      sfx('coin')
      toast('success', T.bought(f.name))
    }
  }

  return (
    <>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel title={T.current} tip={T.currentTip}>
          <p className="flex items-center gap-2 text-xl font-bold">
            <PixelIcon name="house" className="text-accent" /> {home.name}
          </p>
          <p className="mt-1 text-sm text-fg-2">{home.text}</p>
          <p className="mt-2 text-xs text-fg-3">{T.perks(home.lagerUnits, home.vitrineSlots, home.energyRegenPct, home.slots)}</p>
        </Panel>
        <Panel title={T.wohnwert} tip={T.wohnwertTip}>
          <p className="nums text-3xl font-bold tracking-tight">{formatNumber(d.wohnwert)}</p>
        </Panel>
        <Panel title={T.nebenkosten} tip={T.nebenkostenTip}>
          <p className="nums text-3xl font-bold tracking-tight text-gold">{formatMoney(d.nebenkosten_cents)}</p>
        </Panel>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title={T.furnishing} tip={T.furnishingTip}>
          <ul className="flex flex-col gap-2">
            {FURNISHING_SLOTS.map((s, i) => {
              const open = i < home.slots
              const current = FURNITURE.find((f) => f.key === d.furnishings[s.key])
              const items = FURNITURE.filter((f) => f.slot === s.key)
              return (
                <li key={s.key} className={clsx('rounded-xl bg-surface-2 p-3', !open && 'opacity-50')}>
                  <p className="flex items-center gap-2 font-semibold">
                    <PixelIcon name={open ? SLOT_ICON[s.key]! : 'lock'} className="text-accent" />
                    {s.name}
                    <span className="text-xs font-normal text-fg-3">{current ? `${current.name} · ${bonusText(current)}` : open ? T.empty : T.slotLocked}</span>
                  </p>
                  {open && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {items.map((f) => {
                        const price = d.furniture.find((x) => x.key === f.key)?.price_cents ?? 0
                        const owned = current?.key === f.key
                        return (
                          <li key={f.key} className={clsx('flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm', owned ? 'bg-surface-3' : '')}>
                            <span className="min-w-0 flex-1">
                              <b className="block">{f.name}</b>
                              <span className="text-xs text-fg-3">
                                {f.text} · {bonusText(f)} · {T.wohnwert} {f.wohnwert}
                              </span>
                            </span>
                            {owned ? (
                              <PixelIcon name="check" className="text-gain" />
                            ) : player.level < f.minLevel ? (
                              <span className="text-xs text-fg-3">{T.fromLevel(f.minLevel)}</span>
                            ) : (
                              <Button size="sm" loading={busy === f.key} disabled={busy !== null || player.cash_cents < price} onClick={() => void buy(f)}>
                                {T.buy(formatMoney(price))}
                              </Button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title={T.homes} tip={T.homesTip}>
          <ul className="flex flex-col gap-2">
            {HOMES.filter((h) => h.tier > 0).map((h) => {
              const price = d.homes.find((x) => x.tier === h.tier)?.price_cents ?? 0
              const here = h.tier === d.tier
              const past = h.tier < d.tier
              return (
                <li key={h.tier} className={clsx('flex flex-wrap items-center gap-3 rounded-xl p-3', here ? 'bg-surface-3 outline-2 -outline-offset-2 outline-accent' : 'bg-surface-2', past && 'opacity-50')}>
                  <span className="min-w-0 flex-1">
                    <b className="block">{h.name}</b>
                    <span className="block text-xs text-fg-2">{h.text}</span>
                    <span className="block text-xs text-fg-3">{T.perks(h.lagerUnits, h.vitrineSlots, h.energyRegenPct, h.slots)}</span>
                  </span>
                  {here ? (
                    <span className="text-sm font-semibold text-gain">{T.here}</span>
                  ) : past ? (
                    <span className="text-xs text-fg-3">{T.behind}</span>
                  ) : player.level < h.minLevel ? (
                    <span className="text-xs text-fg-3">{T.fromLevel(h.minLevel)}</span>
                  ) : (
                    <span className="flex flex-col items-end gap-1">
                      <Button size="sm" variant="primary" loading={busy === `h${h.tier}`} disabled={busy !== null || player.cash_cents + d.refund_cents < price} onClick={() => void move(h.tier)}>
                        {T.move(formatMoney(price))}
                      </Button>
                      {d.refund_cents > 0 && <span className="text-xs text-fg-3">{T.refund(formatMoney(d.refund_cents))}</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
