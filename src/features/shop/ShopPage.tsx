import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { PackArt } from '@/features/open/PackInfo.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { duplicateStacks } from '@/features/collection/sellDupes.ts'
import { useAct, useLicenses, useShop } from '@/lib/actions.ts'
import { GAMES, gameOf, isHouseProduct, productById, type Game } from '@/lib/catalog.ts'
import type { Shop } from '@/lib/schemas.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { useMe, useReleasedSets } from '@/lib/world.ts'
import { LicensePanel } from './Licenses.tsx'
import { Snacks } from './Snacks.tsx'
import { Lager, Stores } from './Stores.tsx'
import { config } from '../../../content/config.ts'

const T = texts.shop
const GAME_ORDER: readonly Game[] = [...GAMES, 'empiremon']

const one = (ppm: number) => `1:${formatNumber(Math.round(1_000_000 / ppm))}`

/** Odds line for the "i": straight from the configured odds. */
function oddsText() {
  const o = config['pack.hit_odds_ppm']
  return `Holo ${one(o.holo)}, Alternative ${one(o.alternative)}, Ultra ${one(o.ultra)}, Grail ${one(o.grail)}.`
}

/** The same for an Empiremon booster: the house odds. */
function houseOddsText() {
  const o = config['pack.house_hit_odds_ppm']
  return `Ultra ${one(o.ultra)}, Grail ${one(o.grail)}.`
}

export function ShopPage() {
  const shop = useShop(true)
  const act = useAct()
  const [busy, setBusy] = useState<string | null>(null)
  const [justBought, setJustBought] = useState(false)
  const player = useMe().data?.player
  const licenses = useLicenses()
  const owned = licenses.data?.owned ?? []
  const licensed = (productId: string) => isHouseProduct(productId) || owned.some((g) => g === gameOf(productId))

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
      {player && <LicensePanel level={player.level} />}
      <Panel title={T.kiosk} tip={T.kioskTip}>
        {/* the order depends on your licences: wait for them, so nothing jumps */}
        {shop.isPending || licenses.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : shop.isError ? (
          <ErrorState message={errorText(shop.error)} onRetry={() => void shop.refetch()} />
        ) : shop.data.kiosk.length === 0 ? (
          <EmptyState icon="shop" title={T.empty} />
        ) : (
          <Kiosk offers={shop.data.kiosk} owned={owned} fav={licenses.data?.fav_game ?? null} busy={busy} onBuy={buy} justBought={justBought} />
        )}
      </Panel>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title={T.ankauf} tip={T.ankaufTip}>
          <SellDuplicates />
        </Panel>
        {shop.data && <Lager shop={shop.data} />}
        {shop.data && player && <Snacks shop={shop.data} player={player} where="kiosk" />}
        {shop.data && player && <Snacks shop={shop.data} player={player} where="pfandautomat" />}
      </div>

      {shop.data && player && (
        <>
          <h2 className="mt-8 mb-4 text-2xl font-bold tracking-tight">{T.stores}</h2>
          <Stores shop={shop.data} player={player} licensed={licensed} />
        </>
      )}
    </Page>
  )
}

type Offer = Shop['kiosk'][number]

/**
 * The kiosk's boosters grouped by game: your games first (your favourite on top), then Empiremon, then the games you
 * have no licence for. Chips show one game; with many sets this stays one screen per game.
 */
function Kiosk({
  offers,
  owned,
  fav,
  busy,
  onBuy,
  justBought,
}: {
  offers: Offer[]
  owned: readonly string[]
  fav: string | null
  busy: string | null
  onBuy: (productId: string, qty: number) => void
  justBought: boolean
}) {
  const [game, setGame] = useState<Game | 'all'>('all')
  const games = [...new Set(offers.map((k) => gameOf(k.product_id)).filter((g): g is Game => g !== undefined))]
  const rank = (g: Game) => (g === fav ? 0 : owned.includes(g) ? 1 : g === 'empiremon' ? 2 : 3)
  const groups = games
    .sort((a, b) => rank(a) - rank(b) || GAME_ORDER.indexOf(a) - GAME_ORDER.indexOf(b))
    .filter((g) => game === 'all' || g === game)
  // Mama's tutorial marks the 1× button of the first booster you can buy
  const firstGame = groups.find((g) => rank(g) < 3)
  const firstBuyable = offers.find((k) => gameOf(k.product_id) === firstGame)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={texts.collection.filterGame}>
        {(['all', ...games] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              sfx('toggle')
              setGame(g)
            }}
            className={clsx(
              'h-8 rounded-lg px-3 text-sm font-semibold outline-2 -outline-offset-2',
              game === g ? 'bg-surface-3 outline-accent' : 'bg-surface-2 outline-line hover:bg-surface-3',
            )}
          >
            {g === 'all' ? texts.collection.allGames : texts.games[g]}
          </button>
        ))}
        {justBought && (
          <Link to="/open" className="btn btn-primary ml-auto inline-flex min-h-9 items-center px-3 text-sm font-semibold anim-nudge">
            {T.openNow}
          </Link>
        )}
      </div>
      {groups.map((g) => {
        const list = offers.filter((k) => gameOf(k.product_id) === g)
        const locked = rank(g) === 3
        return (
          <section key={g}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold tracking-wide text-fg-2 uppercase">
              {g === 'empiremon' ? T.empiremon : texts.games[g]}
              {g === 'empiremon' && <InfoTip>{T.empiremonTip}</InfoTip>}
              {locked && (
                <span className="flex items-center gap-1 text-xs font-semibold normal-case text-fg-3">
                  <PixelIcon name="lock" /> {texts.licenses.missing}
                  <InfoTip>{texts.licenses.missingTip(texts.games[g])}</InfoTip>
                </span>
              )}
            </h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
              {list.map((k) => (
                <KioskTile key={k.product_id} k={k} locked={locked} busy={busy} onBuy={onBuy} tour={k.product_id === firstBuyable?.product_id} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function KioskTile({ k, locked, busy, onBuy, tour }: { k: Offer; locked: boolean; busy: string | null; onBuy: (productId: string, qty: number) => void; tour: boolean }) {
  const product = productById.get(k.product_id)
  const left = k.daily_limit === null ? Infinity : k.daily_limit - k.bought_today
  return (
    <li className="flex gap-3 rounded-xl bg-surface-2 p-3">
      <PackArt id={k.product_id} scale={1} artClassName={locked ? 'opacity-60 grayscale' : undefined} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-bold leading-tight">{product?.name}</p>
        <p className="flex items-center gap-1 text-xs text-fg-3">
          {T.odds} <InfoTip>{isHouseProduct(k.product_id) ? T.oddsHouseTip(houseOddsText()) : T.oddsTip(oddsText())}</InfoTip>
        </p>
        <p className="nums text-lg font-bold text-gold">{formatMoney(k.price_cents)}</p>
        {k.daily_limit !== null && <p className="text-xs text-fg-3">{T.today(k.bought_today, k.daily_limit)}</p>}
        {!locked && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {[1, 5, 10].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === 1 ? 'primary' : 'neutral'}
                disabled={left < n || busy !== null}
                loading={busy === `${k.product_id}:${n}`}
                onClick={() => onBuy(k.product_id, n)}
                data-tour={tour && n === 1 ? 'kiosk' : undefined}
              >
                {T.buy(n)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

function SellDuplicates() {
  const act = useAct()
  const released = useReleasedSets()
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const stacks = (await Promise.all(released.map((s) => rpc('binder_get', { p_set: s.id })))).flatMap((b) => duplicateStacks(b.cards))
      if (stacks.length === 0) {
        toast('info', T.noDupes)
        return
      }
      const res = await act('ankauf_sell', { p_stacks: stacks, p_copies: [] }, ['binder'])
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
