import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { PackArt } from '@/features/open/PackInfo.tsx'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { itemName } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { useTopic } from '@/lib/realtime.ts'
import { errorText, newRequestId, rpc } from '@/lib/rpc.ts'
import type { Battle, Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { serverNow, useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { BattleActions } from './BattlesPage.tsx'
import { Emotes } from './Emotes.tsx'

const T = texts.battles

export function BattlePage() {
  const battleId = Number(useParams().id)
  const client = useQueryClient()
  const player = useMe().data?.player
  const q = useQuery({
    queryKey: ['battle', battleId],
    queryFn: () => rpc('battle_get', { p_battle: battleId }),
    refetchInterval: (query) => (query.state.data?.state === 'open' ? 10_000 : false),
  })
  const d = q.data
  useTopic(`battle:${battleId}`, () => void client.invalidateQueries({ queryKey: ['battle', battleId] }))

  // Every client asks for the next round when the server clock says it is due; nobody sees it earlier.
  useEffect(() => {
    if (!d || d.state !== 'running' || !d.started_at || !d.round_seconds || !d.ends_at) return
    const next =
      d.round < d.packs
        ? new Date(d.started_at).getTime() + d.round * d.round_seconds * 1000
        : new Date(d.ends_at).getTime()
    const timer = setTimeout(
      () => void client.invalidateQueries({ queryKey: ['battle', battleId] }),
      Math.max(250, next - serverNow() + 200),
    )
    return () => clearTimeout(timer)
  }, [d, client, battleId])

  return (
    <Page icon="swords" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      <Link to="/battles" className="-mt-2 self-start text-sm text-fg-3 hover:text-fg">
        ← {T.back}
      </Link>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Board d={d} player={player} />
      )}
    </Page>
  )
}

function Board({ d, player }: { d: Battle; player: Player }) {
  const pot = d.players.reduce((sum, p) => sum + p.shown_cents, 0)
  const instantSetting = useSettings((s) => s.instantReveal || s.reducedMotion)
  const [skip, setSkip] = useState(false)
  const instant = instantSetting || skip
  const winners = d.result?.winners ?? []
  const mySeat = d.players.find((p) => p.player_id === player.id)?.seat
  // Cards a seat shows: the best of the current pack while it runs, the best pulls at the end; the rest as a count.
  const limit = d.seats === 2 ? 8 : d.seats === 3 ? 6 : 4
  const shown = (seat: number) =>
    d.pulls
      .filter((p) => p.seat === seat && (d.state === 'done' || p.round === d.round))
      .sort((a, b) => b.value_cents - a.value_cents)

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <PackArt id={d.product_id} scale={1} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-lg font-bold">{T.modes[d.mode].name}</span>
            <span className="text-sm text-fg-2">{T.modes[d.mode].text}</span>
            <span className="text-xs text-fg-3">
              {T.packsOf(d.packs, itemName(d.product_id))} · {T.stake}:{' '}
              <span className="nums text-gold">{formatMoney(d.stake_cents)}</span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-1 text-xs text-fg-3">
              {T.pot} <InfoTip>{T.potTip}</InfoTip>
            </span>
            <NumberTicker value={pot} format={formatMoney} className="nums text-2xl font-bold text-gold" />
          </div>
        </div>
        <Status d={d} mySeat={mySeat} />
        {d.state === 'open' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <BattleActions b={d} player={player} />
          </div>
        )}
      </Panel>

      <div
        className={clsx(
          'grid gap-3',
          d.seats === 2
            ? 'md:grid-cols-2'
            : d.seats === 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2 xl:grid-cols-4',
        )}
        onClick={() => setSkip(true)}
      >
        {Array.from({ length: d.seats }, (_, i) => {
          const seat = i + 1
          const p = d.players.find((x) => x.seat === seat)
          const won = winners.includes(seat)
          const cards = shown(seat)
          const rest = cards.slice(limit)
          return (
            <section
              key={seat}
              aria-label={p?.name ?? T.free}
              className={clsx(
                'panel flex min-h-60 flex-col gap-3 p-4 transition-opacity',
                d.state === 'done' &&
                  d.mode !== 'freundschaft' &&
                  (won ? 'outline-2 -outline-offset-2 outline-gain' : 'opacity-70'),
              )}
            >
              <header className="flex items-center gap-2">
                {p ? (
                  <Avatar name={p.name} look={p.look} size={36} className={clsx(p.bot && 'grayscale')} />
                ) : (
                  <span className="size-9 rounded-full border border-dashed border-line-strong" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {p ? (
                      <PlayerName name={p.name} look={p.look} />
                    ) : (
                      <span className="text-fg-3">{T.free}</span>
                    )}
                  </span>
                  <span className="flex gap-1.5 text-[0.6875rem] text-fg-3">
                    {d.mode === 'team' && <span>{T.team(seat % 2 === 1 ? 1 : 2)}</span>}
                    {p?.bot && <span className="rounded bg-surface-3 px-1">{T.bot}</span>}
                    {p?.player_id === d.host_id && <span>{T.host}</span>}
                  </span>
                </div>
                <span className="flex flex-col items-end">
                  <span className="flex items-center gap-1 text-[0.6875rem] text-fg-3">
                    {T.total} <InfoTip>{T.totalTip}</InfoTip>
                  </span>
                  <NumberTicker
                    value={p?.shown_cents ?? 0}
                    format={formatMoney}
                    className="nums font-bold text-gold"
                  />
                </span>
              </header>
              <div className="flex flex-wrap gap-1.5">
                {cards.slice(0, limit).map((c, idx) => (
                  <div
                    key={`${c.round}-${idx}`}
                    className={clsx(!instant && 'anim-deal')}
                    style={instant ? undefined : { animationDelay: `${idx * 90}ms` }}
                    title={`${itemName(c.card_id)} · ${formatMoney(c.value_cents)}`}
                  >
                    <Card id={c.card_id} scale={1} />
                  </div>
                ))}
              </div>
              {rest.length > 0 && (
                <p className="nums text-xs text-fg-3">
                  {T.more(rest.length, formatMoney(rest.reduce((sum, c) => sum + c.value_cents, 0)))}
                </p>
              )}
            </section>
          )
        })}
      </div>

      {d.state !== 'cancelled' && (
        <Emotes
          list={d.emotes}
          send={(e) => rpc('emote_send', { p_request_id: newRequestId(), p_battle: d.id, p_emote: e })}
          queryKey={['battle', d.id]}
        />
      )}
    </div>
  )
}

/** Round, countdown and the result, all on the server clock. */
function Status({ d, mySeat }: { d: Battle; mySeat: number | undefined }) {
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const left = (iso: string | null, plus = 0) =>
    formatDuration(Math.max(0, Math.ceil((new Date(iso ?? 0).getTime() + plus - now) / 1000)))
  let line: string
  if (d.state === 'cancelled') line = T.cancelled
  else if (d.state === 'open') line = T.waiting
  else if (d.state === 'running' && d.round === 0) line = T.startsIn(left(d.started_at))
  else if (d.state === 'running')
    line = `${T.round(d.round, d.packs)} · ${d.round < d.packs ? T.nextIn(left(d.started_at, d.round * (d.round_seconds ?? 0) * 1000)) : T.resultIn(left(d.ends_at))}`
  else line = resultLine(d)
  const won =
    d.state === 'done' && mySeat !== undefined && d.mode !== 'freundschaft'
      ? d.result?.winners.includes(mySeat)
      : undefined
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3"
      aria-live="polite"
    >
      <span className={clsx('font-semibold', d.state === 'done' ? 'text-fg' : 'text-fg-2')}>{line}</span>
      {won !== undefined && (
        <span className={clsx('text-sm font-bold', won ? 'text-gain' : 'text-loss')}>
          {won ? T.youWon : T.youLost}
        </span>
      )}
      {mySeat === undefined && d.state !== 'open' && (
        <span className="text-xs text-fg-3">{T.spectating}</span>
      )}
    </div>
  )
}

function resultLine(d: Battle) {
  if (d.mode === 'freundschaft') return T.friendly
  const seats = d.result?.winners ?? []
  const names = seats.map((s) => d.players.find((p) => p.seat === s))
  if (d.mode === 'team') return T.winnerTeam(names.map((p) => p?.name ?? '?').join(' & '))
  const w = names[0]
  return w?.bot ? T.winnerBot(w.name) : T.winner(w?.name ?? '?')
}
