import clsx from 'clsx'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Avatar } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { itemName } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { BATTLE_MODES, type BattleMode, type Battles, type BattleSummary, type Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.battles

export function BattlesPage() {
  const q = useQuery({ queryKey: ['battles'], queryFn: () => rpc('battles_get'), refetchInterval: 15_000 })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="swords" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_24rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title={T.lobby} tip={T.lobbyTip}>
              <BattleList list={d.open} empty={T.lobbyEmpty} player={player} />
            </Panel>
            <Panel title={T.running}>
              <BattleList list={d.running} empty={T.runningEmpty} player={player} />
            </Panel>
            <Panel title={T.done}>
              <BattleList list={d.done} empty={T.doneEmpty} player={player} />
            </Panel>
          </div>
          <CreateBattle d={d} player={player} />
        </div>
      )}
    </Page>
  )
}

function BattleList({ list, empty, player }: { list: BattleSummary[]; empty: string; player: Player }) {
  if (list.length === 0) return <p className="py-2 text-sm text-fg-3">{empty}</p>
  return (
    <ul className="flex flex-col gap-2">
      {list.map((b) => (
        <BattleRow key={b.id} b={b} player={player} />
      ))}
    </ul>
  )
}

/** One battle: mode, booster, stake, seats, and what the player can do with it. */
function BattleRow({ b, player }: { b: BattleSummary; player: Player }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3">
        <PixelIcon name="pack" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2 font-bold">
          {T.modes[b.mode].name}
          <span className="text-xs font-normal text-fg-3">{T.packsOf(b.packs, itemName(b.product_id))}</span>
        </span>
        <span className="nums text-sm text-gold">
          {T.stake}: {formatMoney(b.stake_cents)}
        </span>
      </div>
      <Seats b={b} />
      <div className="flex flex-wrap gap-2">
        <BattleActions b={b} player={player} />
        <Link to={`/battles/${b.id}`} className="btn btn-neutral inline-flex min-h-8 items-center px-3 text-sm font-semibold">
          {b.state === 'running' ? T.watch : T.view}
        </Link>
      </div>
    </li>
  )
}

/** Join, start with bots, leave or dissolve an open battle. */
export function BattleActions({ b, player }: { b: BattleSummary; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const isHost = b.host_id === player.id
  if (b.state !== 'open') return null

  const run = async (fn: 'battle_join' | 'battle_leave' | 'battle_start', done: string) => {
    setBusy(fn)
    const res = await act(fn, { p_battle: b.id }, ['battles', 'battle'])
    setBusy(null)
    if (!res) return
    sfx(fn === 'battle_leave' ? 'toggle' : 'success')
    toast(fn === 'battle_leave' ? 'info' : 'success', done)
    if ('battle' in res) {
      client.setQueryData(['battle', b.id], res.battle)
      void navigate(`/battles/${b.id}`)
    }
  }

  return (
    <>
      {!b.mine && (
        <Button size="sm" variant="primary" loading={busy === 'battle_join'} disabled={busy !== null || player.cash_cents < b.stake_cents} onClick={() => void run('battle_join', T.joined)}>
          {T.join}
        </Button>
      )}
      {isHost && (
        <Button size="sm" variant="primary" loading={busy === 'battle_start'} disabled={busy !== null} onClick={() => void run('battle_start', T.started)} title={T.startTip}>
          {T.start}
        </Button>
      )}
      {b.mine && (
        <Button size="sm" variant={isHost ? 'danger' : 'neutral'} loading={busy === 'battle_leave'} disabled={busy !== null} onClick={() => void run('battle_leave', isHost ? T.dissolved : T.left)}>
          {isHost ? T.dissolve : T.leave}
        </Button>
      )}
    </>
  )
}

function Seats({ b }: { b: BattleSummary }) {
  return (
    <div className="flex items-center gap-1" aria-label={T.seatsOf(b.players.length, b.seats)}>
      {Array.from({ length: b.seats }, (_, i) => {
        const p = b.players.find((x) => x.seat === i + 1)
        return p ? (
          <span key={i} title={p.bot ? `${p.name} (${T.bot})` : p.name}>
            <Avatar name={p.name} look={p.look} size={28} className={clsx(p.bot && 'opacity-60 grayscale')} />
          </span>
        ) : (
          <span key={i} className="grid size-7 place-items-center rounded-full border border-dashed border-line-strong text-[0.625rem] text-fg-3">
            {T.free}
          </span>
        )
      })}
    </div>
  )
}

function CreateBattle({ d, player }: { d: Battles; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [mode, setMode] = useState<BattleMode>('klassisch')
  const [product, setProduct] = useState(d.boosters[0]?.product_id ?? '')
  const [packs, setPacks] = useState(1)
  const [seats, setSeats] = useState(2)
  const [busy, setBusy] = useState(false)
  const price = d.boosters.find((x) => x.product_id === product)?.price_cents ?? 0
  const stake = price * packs
  const seatCount = mode === 'team' ? 4 : seats

  const create = async () => {
    setBusy(true)
    const res = await act('battle_create', { p_mode: mode, p_product: product, p_packs: packs, p_seats: seatCount }, ['battles'])
    setBusy(false)
    if (!res) return
    sfx('success')
    toast('success', T.opened)
    client.setQueryData(['battle', res.battle.id], res.battle)
    void navigate(`/battles/${res.battle.id}`)
  }

  return (
    <Panel title={T.create} tip={T.createTip} className="self-start xl:sticky xl:top-4">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={T.mode}>
          {BATTLE_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={clsx(
                'rounded-xl p-2.5 text-left outline-2 -outline-offset-2 transition-colors focus-visible:outline-accent',
                mode === m ? 'bg-surface-3 outline-accent' : 'bg-surface-2 outline-transparent hover:bg-surface-3',
              )}
            >
              <span className="block text-sm font-bold">{T.modes[m].name}</span>
              <span className="mt-0.5 block text-xs text-fg-2">{T.modes[m].text}</span>
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-3">{T.booster}</span>
          <select className="panel-inset h-9 bg-transparent px-2 text-fg" value={product} onChange={(e) => setProduct(e.target.value)}>
            {d.boosters.map((x) => (
              <option key={x.product_id} value={x.product_id}>
                {itemName(x.product_id)} · {formatMoney(x.price_cents)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-3">{T.packs}</span>
            <select className="panel-inset h-9 bg-transparent px-2 text-fg" value={packs} onChange={(e) => setPacks(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-fg-3">{T.seats}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={T.seats}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={seatCount === n}
                  disabled={mode === 'team' && n !== 4}
                  onClick={() => setSeats(n)}
                  className={clsx(
                    'h-9 flex-1 rounded-lg font-bold outline-2 -outline-offset-2 transition-colors focus-visible:outline-accent disabled:opacity-40',
                    seatCount === n ? 'bg-surface-3 outline-accent' : 'bg-surface-2 outline-transparent hover:bg-surface-3',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="flex items-center gap-1 text-sm text-fg-2">
            {T.stake} <InfoTip>{T.stakeTip}</InfoTip>
          </span>
          <span className="nums text-xl font-bold text-gold">{formatMoney(stake)}</span>
        </div>
        <Button variant="primary" loading={busy} disabled={busy || !product || player.cash_cents < stake} onClick={() => void create()}>
          {T.open}
        </Button>
      </div>
    </Panel>
  )
}

