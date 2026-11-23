import { useState } from 'react'
import { Link } from 'react-router'
import { ProductArt } from '@/components/pixel/ProductArt.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { sfx } from '@/lib/sfx.ts'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { useAct, useShop } from '@/lib/actions.ts'
import { productById } from '@/lib/catalog.ts'
import { errorText } from '@/lib/rpc.ts'
import type { PackOpen } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { texts } from '@/texts/de.ts'
import { OpeningStage } from './OpeningStage.tsx'
import { LiveBar, useStream } from '@/features/streaming/live.tsx'

const T = texts.open
const SIZES = [1, 5, 10] as const

export function OpenPage() {
  const shop = useShop()
  const act = useAct()
  const { instantReveal, set } = useSettings()
  const [session, setSession] = useState<{ result: PackOpen; productId: string; qty: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const stream = useStream()

  const open = async (productId: string, qty: number) => {
    setBusy(`${productId}:${qty}`)
    const result = await act('pack_open', { p_product: productId, p_qty: qty }, ['shop', 'binder', 'quests', 'stream'])
    setBusy(null)
    if (result) setSession({ result, productId, qty })
  }

  const sealed = shop.data?.sealed ?? []
  const unbox = async (productId: string) => {
    setBusy(`${productId}:unbox`)
    const res = await act('display_unbox', { p_product: productId }, ['shop'])
    setBusy(null)
    if (res) {
      sfx('tear')
      toast('success', T.unboxed(res.boosters))
    }
  }
  const left = session ? (sealed.find((s) => s.product_id === session.productId)?.qty ?? 0) : 0

  return (
    <Page icon="pack" title={T.title} subtitle={T.subtitle}>
      <LiveBar />
      <Panel
        tip={T.yoursTip}
        title={T.yours}
        action={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-2">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={instantReveal}
              onChange={(e) => set({ instantReveal: e.target.checked })}
            />
            {T.instant}
            <InfoTip>{T.instantTip}</InfoTip>
          </label>
        }
      >
        {shop.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : shop.isError ? (
          <ErrorState message={errorText(shop.error)} onRetry={() => void shop.refetch()} />
        ) : sealed.length === 0 ? (
          <EmptyState icon="pack" title={T.none}>
            <p>{T.noneBody}</p>
            <Link to="/shop" className="btn btn-primary mt-3 inline-flex min-h-10 items-center px-3 font-semibold">
              {T.toShop}
            </Link>
          </EmptyState>
        ) : (
          <div className="flex flex-wrap gap-8">
            {sealed.map((s) => {
              const product = productById.get(s.product_id)
              return (
                <div key={s.product_id} className="flex items-center gap-5" data-tour="open-pack">
                  <div className="relative">
                    <ProductArt id={s.product_id} scale={2} className="anim-bob" />
                    <span className="nums absolute -top-2 -right-3 rounded-lg bg-grad px-2 font-pixel text-lg text-white">×{s.qty}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xl font-bold tracking-tight">{product?.name}</p>
                    {product?.kind === 'display' && (
                      <>
                        <p className="max-w-56 text-sm text-fg-2">{T.displayHint}</p>
                        <Button variant="primary" disabled={busy !== null} loading={busy === `${s.product_id}:unbox`} onClick={() => unbox(s.product_id)}>
                          {T.unbox}
                        </Button>
                      </>
                    )}
                    {product?.kind !== 'display' && SIZES.map((n) => (
                      <Button
                        key={n}
                        variant={n === 1 ? 'primary' : 'neutral'}
                        disabled={s.qty < n || busy !== null}
                        loading={busy === `${s.product_id}:${n}`}
                        onClick={() => open(s.product_id, n)}
                      >
                        {T.open(n)}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {session && (
        <OpeningStage
          key={`${session.result.packs[0]?.cards[0]?.card_id}-${session.result.total_value_cents}`}
          result={session.result}
          productId={session.productId}
          canAgain={left > 0}
          viewers={stream.data?.live ? stream.data.viewers : null}
          onClose={() => setSession(null)}
          onAgain={() => void open(session.productId, Math.min(session.qty, left))}
        />
      )}
    </Page>
  )
}
