import clsx from 'clsx'
import { useState } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { PackArt } from '@/features/open/PackInfo.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useLicenses } from '@/lib/actions.ts'
import { GAMES, PRODUCTS, SETS, type Game } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { texts } from '@/texts/de.ts'

const T = texts.licenses

/** The booster of a game, for its picture. */
const boosterOf = (game: Game) => PRODUCTS.find((p) => p.kind === 'booster' && SETS.find((s) => s.id === p.set)?.game === game)?.id ?? ''

/** Picks the favourite game: its licence for free, Opa's booster and all reward boosters come from it. */
export function useStarterPick() {
  const act = useAct()
  const [busy, setBusy] = useState<Game | null>(null)
  const pick = async (game: Game) => {
    setBusy(game)
    const res = await act('starter_pick', { p_game: game }, ['licenses', 'shop'])
    setBusy(null)
    if (res) toast('success', T.picked(texts.games[game]))
  }
  return { pick, busy }
}

/** Händlerlizenzen at the top of the Läden page; the starter choice for players who have not picked yet. */
export function LicensePanel({ level }: { level: number }) {
  const q = useLicenses()
  const act = useAct()
  const { pick, busy: picking } = useStarterPick()
  const [busy, setBusy] = useState<Game | null>(null)
  const d = q.data

  const buy = async (game: Game) => {
    setBusy(game)
    const res = await act('license_buy', { p_game: game }, ['licenses', 'shop'])
    setBusy(null)
    if (res) toast('success', T.bought(texts.games[game]))
  }

  if (!d) return <Skeleton className="mb-4 h-28 w-full" />
  if (d.owned.length === 0) {
    return (
      <Panel title={T.pickTitle} tip={T.tip} className="mb-4">
        <p className="mb-4 text-sm text-fg-2">{T.pickText}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GAMES.map((g) => (
            <div key={g} className="flex flex-col items-center gap-3 rounded-xl bg-surface-2 p-4 text-center">
              <PackArt id={boosterOf(g)} scale={1} />
              <p className="font-bold">{texts.games[g]}</p>
              <p className="flex-1 text-xs text-fg-2">{texts.gamePitch[g]}</p>
              <Button size="sm" variant="primary" loading={picking === g} disabled={picking !== null} onClick={() => void pick(g)}>
                {T.pick(texts.games[g])}
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    )
  }

  const canBuy = d.owned.length < d.allowed && d.next_fee_cents !== null
  const nextLevel = d.levels.find((l) => l > level)
  return (
    <Panel tour="licenses" title={T.title} tip={T.tip} className="mb-4">
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {GAMES.map((g) => {
          const owned = d.owned.includes(g)
          return (
            <li key={g} className={clsx('flex items-center gap-3 rounded-xl p-3', owned ? 'bg-surface-3' : 'bg-surface-2')}>
              <PixelIcon name={owned ? 'check' : 'lock'} className={owned ? 'text-gain' : 'text-fg-3'} />
              <span className="min-w-0 flex-1">
                <b className="block">{texts.games[g]}</b>
                <span className="text-xs text-fg-3">
                  {owned ? (d.fav_game === g ? T.fav : T.owned) : canBuy ? '' : d.owned.length >= GAMES.length ? '' : nextLevel ? T.fromLevel(nextLevel) : ''}
                </span>
              </span>
              {!owned && canBuy && (
                <Button size="sm" loading={busy === g} disabled={busy !== null} onClick={() => void buy(g)}>
                  {T.buy(formatMoney(d.next_fee_cents ?? 0))}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {d.owned.length >= GAMES.length && <p className="mt-3 text-sm text-fg-3">{T.allDone}</p>}
    </Panel>
  )
}
