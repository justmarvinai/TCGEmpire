import { useState } from 'react'
import { Link } from 'react-router'
import { ProductArt } from '@/components/pixel/ProductArt.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { duplicateStacks } from '@/features/collection/sellDupes.ts'
import { useAct, useShop } from '@/lib/actions.ts'
import { productById, SETS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { useMe } from '@/lib/world.ts'
import { Snacks } from './Snacks.tsx'
import { Lager, Stores } from './Stores.tsx'
import { config } from '../../../content/config.ts'

const T = texts.shop

/** Odds line for the "i": straight from the configured odds. */
function oddsText() {
  const o = config['pack.hit_odds_ppm']
  const one = (ppm: number) => `1:${Math.round(1_000_000 / ppm)}`
  return `Holo ${one(o.holo)}, Alternative ${one(o.alternative)}, Ultra ${one(o.ultra)}, Grail ${one(o.grail)}.`
}

export function ShopPage() {
  const shop = useShop()
  const act = useAct()
  const [busy, setBusy] = useState<string | null>(null)
  const [justBought, setJustBought] = useState(false)
  const player = useMe().data?.player

  const buy = async (productId: string, qty: number) => {
    setBusy(`${productId}:${qty}`)
    const res = await act('store_buy', { p_product: productId, p_qty: qty }, ['shop', 'quests'])
    setBusy(null)
    if (res) {
      sfx('coin')
      toast('success', T.bought(qty))
      setJustBought(true)
    }
  }

  return (
    <Page icon="shop" title={T.title} subtitle={T.subtitle}>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={T.kiosk} tip={T.kioskTip}>
          {shop.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : shop.isError ? (
            <ErrorState message={errorText(shop.error)} onRetry={() => void shop.refetch()} />
          ) : shop.data.kiosk.length === 0 ? (
            <EmptyState icon="shop" title={T.empty} />
          ) : (
            shop.data.kiosk.map((k) => {
              const product = productById.get(k.product_id)
              const left = k.daily_limit - k.bought_today
              return (
                <div key={k.product_id} className="flex flex-wrap items-center gap-6" data-tour="kiosk">
                  <ProductArt id={k.product_id} scale={2} className="anim-bob" />
                  <div className="flex min-w-56 flex-col gap-3">
                    <div>
                      <p className="text-2xl font-bold tracking-tight">{product?.name}</p>
                      <p className="flex items-center gap-1 text-sm text-fg-2">
                        {T.odds} <InfoTip>{T.oddsTip(oddsText())}</InfoTip>
                      </p>
                    </div>
                    <p className="nums text-3xl font-bold tracking-tight text-gold">{formatMoney(k.price_cents)}</p>
                    <p className="text-xs text-fg-3">{T.today(k.bought_today, k.daily_limit)}</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 5, 10].map((n) => (
                        <Button
                          key={n}
                          variant={n === 1 ? 'primary' : 'neutral'}
                          disabled={left < n || busy !== null}
                          loading={busy === `${k.product_id}:${n}`}
                          onClick={() => buy(k.product_id, n)}
                        >
                          {T.buy(n)} · {formatMoney(k.price_cents * n)}
                        </Button>
                      ))}
                    </div>
                    {justBought && (
                      <Link to="/open" className="btn btn-primary inline-flex min-h-10 w-fit items-center px-3 font-semibold anim-nudge">
                        {T.openNow}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={T.ankauf} tip={T.ankaufTip}>
            <SellDuplicates />
          </Panel>
          {shop.data && <Lager shop={shop.data} />}
          {shop.data && player && <Snacks shop={shop.data} player={player} where="kiosk" />}
          {shop.data && player && <Snacks shop={shop.data} player={player} where="pfandautomat" />}
        </div>
      </div>

      {shop.data && player && (
        <>
          <h2 className="mt-8 mb-4 text-2xl font-bold tracking-tight">{T.stores}</h2>
          <Stores shop={shop.data} player={player} />
        </>
      )}
    </Page>
  )
}

function SellDuplicates() {
  const act = useAct()
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const stacks = (await Promise.all(SETS.map((s) => rpc('binder_get', { p_set: s.id })))).flatMap((b) => duplicateStacks(b.cards))
      if (stacks.length === 0) {
        toast('info', T.noDupes)
        return
      }
      const res = await act('ankauf_sell', { p_stacks: JSON.stringify(stacks), p_copies: [] }, ['binder'])
      if (res) {
        sfx('coin')
        toast('success', T.sold(res.sold, formatMoney(res.payout_cents)))
      }
    } catch (e) {
      toast('error', errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-fg-2">{T.ankaufBody}</p>
      <Button onClick={run} loading={busy}>
        {T.sellDupes}
      </Button>
    </div>
  )
}
