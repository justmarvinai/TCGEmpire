import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { ProductArt } from '@/components/pixel/ProductArt.tsx'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { itemName } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { useTopic } from '@/lib/realtime.ts'
import { errorText, newRequestId, rpc } from '@/lib/rpc.ts'
import type { Break, Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { serverNow, useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { Emotes } from './Emotes.tsx'

const T = texts.breaks

export function BreakPage() {
  const breakId = Number(useParams().id)
  const client = useQueryClient()
  const player = useMe().data?.player
  const q = useQuery({
    queryKey: ['break', breakId],
    queryFn: () => rpc('break_get', { p_break: breakId }),
    refetchInterval: (query) => (query.state.data?.state === 'open' ? 10_000 : false),
  })
  const d = q.data
  useTopic(`break:${breakId}`, () => void client.invalidateQueries({ queryKey: ['break', breakId] }))

  // The next pack is fetched when the server clock says it is due.
  useEffect(() => {
    if (!d || d.state !== 'running' || !d.started_at || !d.round_seconds || !d.ends_at) return
    const next =
      d.round < d.packs
        ? new Date(d.started_at).getTime() + d.round * d.round_seconds * 1000
        : new Date(d.ends_at).getTime()
    const timer = setTimeout(
      () => void client.invalidateQueries({ queryKey: ['break', breakId] }),
      Math.max(250, next - serverNow() + 200),
    )
    return () => clearTimeout(timer)
  }, [d, client, breakId])

  return (
    <Page icon="swords" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      <Link to="/battles" className="-mt-2 self-start text-sm text-fg-3 hover:text-fg">
        ← {texts.battles.back}
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

function Board({ d, player }: { d: Break; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const instantSetting = useSettings((s) => s.instantReveal || s.reducedMotion)
  const [skip, setSkip] = useState(false)
  const instant = instantSetting || skip
  const isHost = d.host_id === player.id
  const owner = (spot: number) => d.spots.find((s) => s.spot === spot)
  const packValue = (spot: number) =>
    d.pulls.filter((p) => p.spot === spot).reduce((sum, p) => sum + p.value_cents, 0)
  // While it runs: the pack that is open right now. At the end: the best cards of the whole break.
  const shown =
    d.state === 'done'
      ? [...d.pulls].sort((a, b) => b.value_cents - a.value_cents).slice(0, 8)
      : d.pulls.filter((p) => p.spot === d.round).sort((a, b) => b.value_cents - a.value_cents)
  const current = owner(d.round)

  const run = async (
    key: string,
    fn: 'break_buy' | 'break_start' | 'break_cancel',
    args: Record<string, unknown>,
    done: string,
  ) => {
    setBusy(key)
    const res = await act(fn, { p_break: d.id, ...args }, ['breaks'])
    setBusy(null)
    if (!res) return
    sfx(fn === 'break_cancel' ? 'toggle' : 'success')
    toast(fn === 'break_cancel' ? 'info' : 'success', done)
    if ('break' in res) client.setQueryData(['break', d.id], res.break)
    else void navigate('/battles')
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <ProductArt id={d.product_id} scale={1} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-lg font-bold">{itemName(d.product_id)}</span>
            <span className="text-sm text-fg-2">{T.host(d.host_name ?? '?')}</span>
            <span className="nums text-xs text-fg-3">
              {T.price}: <span className="text-gold">{formatMoney(d.spot_cents)}</span> ·{' '}
              {T.sold(d.sold, d.packs)}
              {d.mine > 0 && <> · {T.yours(d.mine)}</>}
            </span>
          </div>
          {d.state === 'open' && isHost && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={busy === 'start'}
                disabled={busy !== null}
                title={T.startTip}
                onClick={() => void run('start', 'break_start', {}, T.started)}
              >
                {T.start}
              </Button>
              <Button
                variant="danger"
                loading={busy === 'cancel'}
                disabled={busy !== null}
                onClick={() => void run('cancel', 'break_cancel', {}, T.cancelled)}
              >
                {T.cancel}
              </Button>
            </div>
          )}
        </div>
        <Status d={d} />
      </Panel>

      {(d.state === 'running' || d.state === 'done') && d.round > 0 && (
        <Panel
          title={
            d.state === 'done'
              ? T.done
              : `${T.packOf(d.round, d.packs)} · ${current ? T.owner(current.name) : T.hostKeeps}`
          }
          action={
            <span className="nums font-bold text-gold">
              {formatMoney(shown.reduce((sum, p) => sum + p.value_cents, 0))}
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5" onClick={() => setSkip(true)}>
            {shown.map((c, idx) => (
              <div
                key={`${d.round}-${idx}`}
                className={clsx(!instant && 'anim-deal')}
                style={instant ? undefined : { animationDelay: `${idx * 90}ms` }}
                title={`${itemName(c.card_id)} · ${formatMoney(c.value_cents)}`}
              >
                <Card id={c.card_id} scale={1} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title={T.spots} tip={T.spotsTip}>
        <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: d.packs }, (_, i) => {
            const spot = i + 1
            const o = owner(spot)
            const revealed = d.state !== 'open' && spot <= d.round
            const canBuy = d.state === 'open' && !o && !isHost
            return (
              <li key={spot}>
                <button
                  type="button"
                  disabled={!canBuy || busy !== null || player.cash_cents < d.spot_cents}
                  onClick={() => void run(`s${spot}`, 'break_buy', { p_spot: spot }, T.bought(spot))}
                  aria-label={`${T.spot(spot)}: ${o ? o.name : T.free}`}
                  className={clsx(
                    'flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-xs outline-2 -outline-offset-2 transition-colors',
                    d.state === 'running' && spot === d.round
                      ? 'bg-surface-3 outline-accent'
                      : 'bg-surface-2 outline-transparent',
                    canBuy && 'hover:bg-surface-3 focus-visible:outline-accent enabled:cursor-pointer',
                    o?.player_id === player.id && 'outline-gain',
                  )}
                >
                  <span className="font-bold">{spot}</span>
                  {busy === `s${spot}` ? (
                    <span className="loading-dots" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : o ? (
                    <span className="flex items-center gap-1 truncate">
                      <Avatar name={o.name} look={o.look} size={16} />
                      <PlayerName name={o.name} look={o.look} className="max-w-14 truncate" />
                    </span>
                  ) : (
                    <span className="text-fg-3">{canBuy ? formatMoney(d.spot_cents) : T.free}</span>
                  )}
                  {revealed && (
                    <span className="nums text-[0.625rem] text-gold">{formatMoney(packValue(spot))}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>

      {d.state !== 'cancelled' && (
        <Emotes
          list={d.emotes}
          send={(e) => rpc('break_emote_send', { p_request_id: newRequestId(), p_break: d.id, p_emote: e })}
          queryKey={['break', d.id]}
        />
      )}
    </div>
  )
}

function Status({ d }: { d: Break }) {
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const left = (iso: string | null, plus = 0) =>
    formatDuration(Math.max(0, Math.ceil((new Date(iso ?? 0).getTime() + plus - now) / 1000)))
  const B = texts.battles
  let line: string
  if (d.state === 'cancelled') line = T.stateCancelled
  else if (d.state === 'open') line = T.waiting
  else if (d.state === 'done') line = T.done
  else if (d.round === 0) line = B.startsIn(left(d.started_at))
  else
    line = `${T.packOf(d.round, d.packs)} · ${d.round < d.packs ? B.nextIn(left(d.started_at, d.round * (d.round_seconds ?? 0) * 1000)) : B.resultIn(left(d.ends_at))}`
  return (
    <p
      className="mt-3 flex items-center gap-1 border-t border-line pt-3 font-semibold text-fg-2"
      aria-live="polite"
    >
      {line}
      {d.state === 'open' && <InfoTip>{T.spotsTip}</InfoTip>}
    </p>
  )
}
