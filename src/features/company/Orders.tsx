import clsx from 'clsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import type { Company } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.company
const ASPECTS = ['centering', 'corners', 'edges', 'surface'] as const

function useServerNow() {
  return useNow() + useWorld((w) => w.clockOffsetMs)
}

/** Cards from friends that wait in the company. */
export function PlayerOrders({ co }: { co: Company }) {
  const now = useServerNow()
  return (
    <Panel title={T.playerOrders} tip={T.playerOrdersTip}>
      {co.player_orders.length === 0 ? (
        <p className="text-sm text-fg-3">{T.playerOrdersEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {co.player_orders.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
              <Card id={o.card_id} scale={1} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{cardName(o.card_id)}</span>
                <span className="block text-xs text-fg-3">
                  {T.customer(o.customer, T.services[o.service] ?? o.service)}
                </span>
                <span className="nums block text-xs text-fg-2">
                  {T.readyIn(formatDuration(Math.max(0, Math.ceil((Date.parse(o.due_at) - now) / 1000))))} ·{' '}
                  {formatMoney(o.fee_cents)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

type Result = { truth: number[]; guess: number[]; error: number; paid_cents: number; ruf: number }

/** "Selbst graden": the owner estimates the four quality values of a VIP card. */
export function VipOrder({ co }: { co: Company }) {
  const act = useAct()
  const client = useQueryClient()
  const now = useServerNow()
  const vip = co.vip
  const [values, setValues] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  if (!vip && !result) return null
  const value = (a: (typeof ASPECTS)[number]) =>
    values[a] ?? (vip ? Math.round((vip.ranges[a][0] + vip.ranges[a][1]) / 2) : 5)

  const submit = async () => {
    if (!vip) return
    setBusy(true)
    const res = await act('company_vip_grade', { p_vip: vip.id, p_values: ASPECTS.map(value) })
    setBusy(false)
    if (!res) return
    setResult(res.result)
    setValues({})
    client.setQueryData(['company'], { ...res, result: undefined })
    sfx(res.result.error <= 2 ? 'success' : 'error')
    toast(
      res.result.error <= 2 ? 'success' : 'info',
      T.vipResult(res.result.error, formatMoney(res.result.paid_cents)),
    )
  }

  return (
    <Panel title={T.vip} tip={T.vipTip}>
      {result ? (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{T.vipResult(result.error, formatMoney(result.paid_cents))}</p>
          <p
            className={clsx(
              'text-sm font-bold',
              result.ruf > 0 ? 'text-gain' : result.ruf < 0 ? 'text-loss' : 'text-fg-3',
            )}
          >
            {T.vipRuf(result.ruf)}
          </p>
          <table className="nums w-full text-sm">
            <tbody>
              {ASPECTS.map((a, i) => (
                <tr key={a}>
                  <td className="text-fg-3">{T.aspects[a]}</td>
                  <td className="text-right">
                    {T.vipGuess} {result.guess[i]}
                  </td>
                  <td
                    className={clsx(
                      'text-right font-bold',
                      result.guess[i] === result.truth[i] ? 'text-gain' : 'text-loss',
                    )}
                  >
                    {T.vipTruth} {result.truth[i]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" className="self-start" onClick={() => setResult(null)}>
            {texts.common.close}
          </Button>
        </div>
      ) : (
        vip && (
          <div className="flex flex-wrap gap-4">
            <Card id={vip.card_id} scale={3} foil="none" />
            <div className="flex min-w-48 flex-1 flex-col gap-3">
              <p className="text-sm font-bold">{cardName(vip.card_id)}</p>
              <p className="nums text-xs text-fg-3">
                {T.vipFee(formatMoney(vip.fee_cents))} ·{' '}
                {T.vipLeaves(
                  formatDuration(Math.max(0, Math.ceil((Date.parse(vip.expires_at) - now) / 1000))),
                )}
              </p>
              {ASPECTS.map((a) => {
                const [lo, hi] = vip.ranges[a]
                return (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-fg-2">{T.aspects[a]}</span>
                    <span className="nums w-12 text-xs text-fg-3">
                      {lo}–{hi}
                    </span>
                    <select
                      className="panel-inset h-8 w-16 bg-transparent px-1 text-fg"
                      value={value(a)}
                      onChange={(e) => setValues({ ...values, [a]: Number(e.target.value) })}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
              <Button
                variant="primary"
                className="self-start"
                loading={busy}
                disabled={busy}
                onClick={() => void submit()}
              >
                {T.vipSubmit}
              </Button>
            </div>
          </div>
        )
      )}
    </Panel>
  )
}
