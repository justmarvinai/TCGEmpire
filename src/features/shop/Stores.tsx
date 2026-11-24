import clsx from 'clsx'
import { useState } from 'react'
import { PackArt } from '@/features/open/PackInfo.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { productById, STORES } from '@/lib/catalog.ts'
import { formatClock, formatMoney } from '@/lib/format.ts'
import type { Player, Shop } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.shop
const SIZES = [1, 2, 5, 10]

/** Müller, Würfelbude and Smyths: shared restock waves or a weekly allocation. */
export function Stores({ shop, player, licensed }: { shop: Shop; player: Player; licensed: (productId: string) => boolean }) {
  const act = useAct()
  const [busy, setBusy] = useState<string | null>(null)
  const buy = async (store: string, product: string, qty: number) => {
    setBusy(`${store}:${product}:${qty}`)
    const res = await act('retail_buy', { p_store: store, p_product: product, p_qty: qty }, ['shop', 'quests'])
    setBusy(null)
    if (res) {
      sfx('coin')
      toast('success', T.bought(qty))
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {shop.stores.map((s) => {
        const def = STORES.find((d) => d.key === s.key)
        if (!def) return null
        const rule = s.shared ? T.sharedTip((def.restocks ?? []).join(' und '), def.limit) : T.weeklyTip(def.limit, def.limitPerRuf100 ?? 0)
        return (
          <Panel key={s.key} tour="stores" title={def.name} tip={`${def.text} ${rule}`}>
            {player.level < s.min_level ? (
              <EmptyState icon="lock" title={T.fromLevel(s.min_level)}>
                {def.text}
              </EmptyState>
            ) : (
              <>
                <p className="mb-4 text-sm text-fg-2">
                  {!s.open ? T.storeClosed : !s.shared ? T.storeWeekly : s.next_restock_at ? T.storeNext(formatClock(s.next_restock_at)) : ''}
                </p>
                <ul className="flex flex-col gap-3">
                  {s.offers.map((o) => {
                    const room = o.limit - o.bought
                    const max = Math.max(0, Math.min(room, s.shared ? (o.left ?? 0) : room))
                    const sizes = SIZES.filter((n) => n <= max)
                    const status = s.shared ? (o.total === null ? T.noDelivery : o.left === 0 ? T.soldOut : T.stock(o.left ?? 0, o.total)) : null
                    return (
                      <li key={o.product_id} className="flex items-center gap-4 rounded-xl bg-surface-2 p-3">
                        <PackArt id={o.product_id} scale={1} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{productById.get(o.product_id)?.name}</p>
                          <p className="nums text-lg font-bold text-gold">{formatMoney(o.price_cents)}</p>
                          <p className={clsx('text-xs', o.left === 0 ? 'text-loss' : 'text-fg-3')}>
                            {status && `${status} · `}
                            {T.yourLimit(o.bought, o.limit)}
                          </p>
                          {player.level < o.min_level ? (
                            <p className="mt-2 text-sm text-fg-3">{T.fromLevel(o.min_level)}</p>
                          ) : !licensed(o.product_id) ? (
                            <Button size="sm" disabled className="mt-2">
                              {texts.licenses.missing}
                            </Button>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {sizes.length === 0 && (
                                <Button size="sm" disabled>
                                  {o.left === 0 ? T.soldOut : s.shared && o.total === null ? T.noDelivery : T.yourLimit(o.bought, o.limit)}
                                </Button>
                              )}
                              {sizes.map((n) => (
                                <Button
                                  key={n}
                                  size="sm"
                                  variant={n === 1 ? 'primary' : 'neutral'}
                                  disabled={!s.open || busy !== null}
                                  loading={busy === `${s.key}:${o.product_id}:${n}`}
                                  onClick={() => buy(s.key, o.product_id, n)}
                                >
                                  {n}×
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </Panel>
        )
      })}
    </div>
  )
}

/** How much sealed fits; stores stop selling when it is full. */
export function Lager({ shop }: { shop: Shop }) {
  const { used, cap } = shop.lager
  return (
    <Panel tour="lager" title={T.lager} tip={T.lagerTip}>
      <p className="nums text-3xl font-bold tracking-tight">
        {used}
        <span className="text-fg-3">/{cap}</span>
      </p>
      <Progress value={used / Math.max(1, cap)} tone={used >= cap ? 'gold' : 'accent'} className="mt-3" label={T.lager} />
      <p className="mt-2 text-sm text-fg-3">{T.lagerUsed(used, cap)}</p>
    </Panel>
  )
}
