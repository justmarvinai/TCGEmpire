import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { itemName } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Breaks, BreakSummary, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.breaks

const useBreaks = () =>
  useQuery({ queryKey: ['breaks'], queryFn: () => rpc('breaks_get'), refetchInterval: 15_000 })

/** Open, running and recent Box Breaks. */
export function BreakList({ player }: { player: Player }) {
  const q = useBreaks()
  const d = q.data
  return (
    <Panel title={T.title} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <p className="py-2 text-sm text-fg-3">{T.locked(d.unlock_level)}</p>
      ) : d.open.length + d.running.length + d.done.length === 0 ? (
        <p className="py-2 text-sm text-fg-3">{T.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...d.running, ...d.open, ...d.done].map((b) => (
            <BreakRow key={b.id} b={b} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

function BreakRow({ b }: { b: BreakSummary }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3">
        <PixelIcon name="pack" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2 font-bold">
          {itemName(b.product_id)}
          <span className="text-xs font-normal text-fg-3">{T.host(b.host_name ?? '?')}</span>
        </span>
        <span className="nums text-sm">
          <span className="text-gold">{formatMoney(b.spot_cents)}</span>{' '}
          <span className="text-fg-3">· {T.sold(b.sold, b.packs)}</span>
          {b.mine > 0 && <span className="text-gain"> · {T.yours(b.mine)}</span>}
        </span>
      </div>
      <Link
        to={`/battles/break/${b.id}`}
        className="btn btn-neutral inline-flex min-h-8 items-center px-3 text-sm font-semibold"
      >
        {b.state === 'running' ? texts.battles.watch : texts.battles.view}
      </Link>
    </li>
  )
}

/** Put a display of your own on the table. */
export function CreateBreak({ player }: { player: Player }) {
  const q = useBreaks()
  if (!q.data || player.level < q.data.unlock_level) return null
  return <CreateBreakForm d={q.data} />
}

function CreateBreakForm({ d }: { d: Breaks }) {
  const act = useAct()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [product, setProduct] = useState(d.displays[0]?.product_id ?? '')
  const display = d.displays.find((x) => x.product_id === product) ?? d.displays[0]
  const [euros, setEuros] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const cents =
    euros === null ? (display?.booster_cents ?? 0) : Math.round(Number(euros.replace(',', '.')) * 100)
  const valid =
    !!display && Number.isFinite(cents) && cents >= display.min_cents && cents <= display.max_cents

  const create = async () => {
    if (!display) return
    setBusy(true)
    const res = await act('break_create', { p_product: display.product_id, p_spot_cents: cents }, ['breaks'])
    setBusy(false)
    if (!res) return
    sfx('success')
    toast('success', T.opened)
    client.setQueryData(['break', res.break.id], res.break)
    void navigate(`/battles/break/${res.break.id}`)
  }

  return (
    <Panel title={T.create} tip={T.createTip}>
      {!display ? (
        <p className="text-sm text-fg-3">{T.noDisplay}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-3">{T.display}</span>
            <select
              className="panel-inset h-9 bg-transparent px-2 text-fg"
              value={display.product_id}
              onChange={(e) => {
                setProduct(e.target.value)
                setEuros(null)
              }}
            >
              {d.displays.map((x) => (
                <option key={x.product_id} value={x.product_id}>
                  {itemName(x.product_id)} · {x.qty}×
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1 text-fg-3">
              {T.price}{' '}
              <InfoTip>{T.priceTip(formatMoney(display.min_cents), formatMoney(display.max_cents))}</InfoTip>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={display.min_cents / 100}
              max={display.max_cents / 100}
              value={euros ?? (display.booster_cents / 100).toFixed(2)}
              onChange={(e) => setEuros(e.target.value)}
              aria-invalid={!valid}
              className="panel-inset h-9 bg-transparent px-2 text-fg focus-visible:outline-accent aria-[invalid=true]:outline-loss"
            />
          </label>
          <Button variant="primary" loading={busy} disabled={busy || !valid} onClick={() => void create()}>
            {T.open}
          </Button>
        </div>
      )}
    </Panel>
  )
}
