import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Avatar } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { itemName } from '@/lib/catalog.ts'
import { formatClock, formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { GroupOrder, GroupOrders as Doc, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.groupOrders

/** Sammelbestellung: friends fill a case of displays at the wholesale price. */
export function GroupOrders({ player }: { player: Player }) {
  const q = useQuery({
    queryKey: ['group_orders'],
    queryFn: () => rpc('group_orders_get'),
    refetchInterval: 30_000,
  })
  const d = q.data
  return (
    <Panel title={T.title} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <p className="text-sm text-fg-3">{T.locked(d.unlock_level)}</p>
      ) : (
        <Orders d={d} player={player} />
      )}
    </Panel>
  )
}

function Orders({ d, player }: { d: Doc; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [product, setProduct] = useState(d.displays[0]?.product_id ?? '')
  const [shares, setShares] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const unit = d.displays.find((x) => x.product_id === product)
  const maxMine = Math.min(d.case_displays - 1, d.shares_left)

  const run = async (
    key: string,
    fn: 'group_order_create' | 'group_order_join' | 'group_order_leave',
    args: Record<string, unknown>,
    done: string,
  ) => {
    setBusy(key)
    const res = await act(fn, args)
    setBusy(null)
    if (!res) return
    client.setQueryData(['group_orders'], res.orders)
    sfx(fn === 'group_order_leave' ? 'toggle' : 'success')
    toast(fn === 'group_order_leave' ? 'info' : 'success', done)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-3">
        {T.weekLeft(d.shares_left, d.max_shares_week)} {T.delivery(d.delivery_minutes)}
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold tracking-wider text-fg-3 uppercase">{T.open}</h3>
        {d.open.length === 0 && <p className="text-sm text-fg-3">{T.none}</p>}
        {d.open.map((o) => (
          <OrderRow key={o.id} o={o} d={d} player={player} busy={busy} run={run} />
        ))}
      </div>

      {d.displays.length > 0 && maxMine > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-3">{T.display}</span>
            <select
              className="panel-inset h-9 bg-transparent px-2 text-fg"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              {d.displays.map((x) => (
                <option key={x.product_id} value={x.product_id}>
                  {itemName(x.product_id)} · {formatMoney(x.unit_cents)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fg-3">{T.shares}</span>
              <select
                className="panel-inset h-9 w-20 bg-transparent px-2 text-fg"
                value={Math.min(shares, maxMine)}
                onChange={(e) => setShares(Number(e.target.value))}
              >
                {Array.from({ length: maxMine }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            {unit && (
              <span className="flex flex-col text-sm">
                <span className="nums font-bold text-gold">
                  {formatMoney(unit.unit_cents)} {T.unit}
                </span>
                <span className="nums text-xs text-fg-3 line-through">
                  {T.list(formatMoney(unit.list_cents))}
                </span>
              </span>
            )}
          </div>
          <Button
            variant="primary"
            loading={busy === 'create'}
            disabled={
              busy !== null ||
              !unit ||
              player.cash_cents < (unit?.unit_cents ?? 0) * Math.min(shares, maxMine)
            }
            onClick={() =>
              void run(
                'create',
                'group_order_create',
                { p_product: product, p_shares: Math.min(shares, maxMine) },
                T.started,
              )
            }
          >
            {T.start}
          </Button>
        </div>
      )}

      {d.recent.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <h3 className="text-xs font-bold tracking-wider text-fg-3 uppercase">{T.recent}</h3>
          {d.recent.map((o) => (
            <p key={o.id} className="text-sm text-fg-2">
              {o.mine}× {itemName(o.product_id)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderRow({
  o,
  d,
  player,
  busy,
  run,
}: {
  o: GroupOrder
  d: Doc
  player: Player
  busy: string | null
  run: (
    key: string,
    fn: 'group_order_join' | 'group_order_leave',
    args: Record<string, unknown>,
    done: string,
  ) => Promise<void>
}) {
  const free = d.case_displays - o.taken
  const canTake = Math.min(free, d.case_displays - 1 - o.mine, d.shares_left)
  const isHost = o.host_id === player.id
  const key = `o${o.id}`
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3">
        <PixelIcon name="pack" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-bold">{itemName(o.product_id)}</span>
        <span className="nums text-xs text-gold">
          {formatMoney(o.unit_cents)} {T.unit}
        </span>
        <span className="text-xs text-fg-3">
          {T.filled(o.taken, d.case_displays)} · {T.expires(formatClock(o.expires_at))}
        </span>
        <span className="flex gap-1">
          {o.shares.map((s) => (
            <span key={s.player_id} title={`${s.name}: ${s.shares}`} className="relative">
              <Avatar name={s.name} look={s.look} size={24} />
              <span className="absolute -right-1 -bottom-1 rounded bg-surface-3 px-0.5 text-[0.5625rem] font-bold">
                {s.shares}
              </span>
            </span>
          ))}
        </span>
        <span className="mt-1 flex flex-wrap gap-2">
          {canTake > 0 && (
            <Button
              size="sm"
              variant="primary"
              loading={busy === key}
              disabled={busy !== null || player.cash_cents < o.unit_cents}
              onClick={() =>
                void run(
                  key,
                  'group_order_join',
                  { p_order: o.id, p_shares: 1 },
                  free === 1 ? T.done : T.taken,
                )
              }
            >
              {T.take(1)}
            </Button>
          )}
          {o.mine > 0 && (
            <Button
              size="sm"
              variant={isHost ? 'danger' : 'neutral'}
              loading={busy === `${key}-leave`}
              disabled={busy !== null}
              onClick={() =>
                void run(
                  `${key}-leave`,
                  'group_order_leave',
                  { p_order: o.id },
                  isHost ? T.cancelled : T.left,
                )
              }
            >
              {isHost ? T.cancel : T.leave}
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}
