import clsx from 'clsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDate, formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import type { Company, CompanyDoc, RpcName } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { AWARDS, CAMPAIGNS, DECISIONS, STAGES, TAX_FORM } from '../../../content/company.ts'

const T = texts.company
const leftOf = (iso: string, now: number) =>
  formatDuration(Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000)))

function useServerNow() {
  return useNow() + useWorld((w) => w.clockOffsetMs)
}

function useRun() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async <R extends CompanyDoc>(key: string, fn: RpcName, args: Record<string, unknown>) => {
    setBusy(key)
    const res = (await act(fn, args)) as R | undefined
    setBusy(null)
    if (res) client.setQueryData(['company'], res)
    return res
  }
  return { busy, run }
}

/** A decision card with its choices; the outcome text comes from the content. */
export function DecisionCard({ co }: { co: Company }) {
  const { busy, run } = useRun()
  const now = useServerNow()
  const d = co.decision
  const def = d && DECISIONS.find((x) => x.key === d.key)
  if (!d || !def) return null
  const decide = async (i: number) => {
    const res = await run(`d${i}`, 'company_decide', { p_decision: d.id, p_choice: i })
    if (!res) return
    sfx('stamp')
    toast('info', def.choices[i]!.result)
  }
  return (
    <Panel
      title={`${T.decision}: ${def.title}`}
      tip={T.decisionTip}
      className="outline-2 -outline-offset-2 outline-gold"
    >
      <p className="text-sm text-fg-2">{def.text}</p>
      <p className="nums mt-2 text-xs text-fg-3">{T.decisionLeaves(leftOf(d.expires_at, now))}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {def.choices.map((c, i) => (
          <Button
            key={c.label}
            variant={i === 0 ? 'primary' : 'neutral'}
            loading={busy === `d${i}`}
            disabled={busy !== null}
            onClick={() => void decide(i)}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </Panel>
  )
}

export function Marketing({ co }: { co: Company }) {
  const { busy, run } = useRun()
  const now = useServerNow()
  const active = co.marketing
  const activeName = active && (CAMPAIGNS.find((c) => c.key === active.key)?.name ?? T.marketing)
  return (
    <Panel title={T.marketing} tip={T.marketingTip}>
      {active && (
        <p className="mb-3 rounded-lg bg-gain/15 p-2 text-sm text-gain">
          {T.campaignActive(activeName ?? '', leftOf(active.until, now))}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {CAMPAIGNS.map((c) => {
          const live = co.campaigns[c.key]
          return (
            <li
              key={c.key}
              className={clsx(
                'flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3',
                !live?.open && 'opacity-60',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{c.name}</span>
                <span className="block text-xs text-fg-3">{c.text}</span>
                <span className="block text-xs text-fg-2">
                  {T.campaignInfo(Math.round(c.boost * 100), c.hours)}
                </span>
              </span>
              {live?.open ? (
                <Button
                  size="sm"
                  variant="primary"
                  loading={busy === c.key}
                  disabled={busy !== null || !!active || co.cash_cents < live.cost_cents}
                  onClick={async () => {
                    if (await run(c.key, 'company_marketing', { p_key: c.key })) {
                      sfx('success')
                      toast('success', T.campaignStarted(c.name))
                    }
                  }}
                >
                  {T.campaignStart(formatMoney(live.cost_cents))}
                </Button>
              ) : (
                <span className="text-xs text-fg-3">
                  {T.campaignLocked(STAGES.find((s) => s.stage === c.minStage)?.name ?? '')}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function Taxes({ co }: { co: Company }) {
  const { busy, run } = useRun()
  const now = useServerNow()
  const [form, setForm] = useState(false)
  const overdue = Date.parse(co.tax.due_at) <= now
  return (
    <Panel title={T.tax} tip={T.taxTip(co.tax.late_pct, co.tax.advisor_pct)}>
      {co.tax.advisor ? (
        <p className="text-sm text-fg-2">{T.taxAdvisorActive(co.tax.advisor_pct)}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className={clsx('nums text-sm', overdue ? 'text-loss' : 'text-fg-2')}>
            {overdue ? T.taxOverdue : T.taxDue(leftOf(co.tax.due_at, now))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setForm(true)}>
              {T.taxFile}
            </Button>
            <Button
              loading={busy === 'advisor'}
              disabled={busy !== null || co.cash_cents < co.tax.advisor_cost_cents}
              onClick={async () => {
                if (await run('advisor', 'company_tax_advisor', {})) {
                  sfx('success')
                  toast('success', T.taxAdvisorHired)
                }
              }}
            >
              {T.taxAdvisor(formatMoney(co.tax.advisor_cost_cents))}
            </Button>
          </div>
        </div>
      )}
      {form && <TaxForm co={co} onClose={() => setForm(false)} />}
    </Panel>
  )
}

function TaxForm({ co, onClose }: { co: Company; onClose: () => void }) {
  const { busy, run } = useRun()
  const file = async (amount: number) => {
    const res = await run<CompanyDoc & { filed: boolean }>(`a${amount}`, 'company_tax_file', {
      p_amount: amount,
    })
    if (!res) return
    if (res.filed) {
      sfx('stamp')
      toast('success', T.taxFiled)
      onClose()
    } else {
      sfx('error')
      toast('error', T.taxWrong)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={TAX_FORM.title} description={TAX_FORM.question}>
      <div className="flex flex-col gap-2">
        {co.tax.options.map((v) => (
          <Button key={v} loading={busy === `a${v}`} disabled={busy !== null} onClick={() => void file(v)}>
            <span className="nums">{formatMoney(v)}</span>
          </Button>
        ))}
      </div>
    </Dialog>
  )
}

export function Shady({ co }: { co: Company }) {
  const { busy, run } = useRun()
  const sh = co.shady
  const [payout, setPayout] = useState(false)
  const [boxes, setBoxes] = useState('20')
  const shady = async (key: string, action: string, arg: string, done: string = T.shadyDone) => {
    if (await run(key, 'company_shady', { p_action: action, p_arg: arg })) {
      sfx('coin')
      toast('success', done)
    }
  }
  return (
    <Panel title={T.shady} tip={T.shadyTip} className="outline-2 -outline-offset-2 outline-loss/40">
      <div className="flex flex-col gap-4">
        {sh.scandal_until && (
          <p className="rounded-lg bg-loss/15 p-2 text-sm font-semibold text-loss">
            {T.scandal(formatDate(sh.scandal_until))}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-sm font-bold">
            {T.schwarz} <InfoTip>{T.schwarzTip(sh.schwarz_wage_pct)}</InfoTip>
          </span>
          {sh.schwarzarbeit && <span className="text-xs text-warn">{T.schwarzActive}</span>}
          <Button
            size="sm"
            className="self-start"
            variant={sh.schwarzarbeit ? 'neutral' : 'danger'}
            loading={busy === 'schwarz'}
            disabled={busy !== null}
            onClick={() => void shady('schwarz', 'schwarzarbeit', sh.schwarzarbeit ? 'off' : 'on')}
          >
            {sh.schwarzarbeit ? T.schwarzOff : T.schwarzOn}
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-sm font-bold">
            {T.evade} <InfoTip>{T.evadeTip}</InfoTip>
          </span>
          {sh.evaded_cents > 0 && (
            <span className="nums text-xs text-warn">{T.evaded(formatMoney(sh.evaded_cents))}</span>
          )}
          <Button
            size="sm"
            variant="danger"
            className="self-start"
            disabled={co.cash_cents <= 0}
            onClick={() => setPayout(true)}
          >
            {T.payout}
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-sm font-bold">
            {T.mystery} <InfoTip>{T.mysteryTip(String(sh.mystery_markup).replace('.', ','))}</InfoTip>
          </span>
          {sh.mystery_sour > 0 && (
            <span className="text-xs text-warn">{T.mysteryPending(sh.mystery_sour)}</span>
          )}
          <span className="flex items-end gap-2">
            <Field
              label={T.mysteryQty}
              type="number"
              min={1}
              max={sh.mystery_max}
              step="1"
              className="w-28"
              value={boxes}
              onChange={(e) => setBoxes(e.target.value)}
            />
            <Button
              size="sm"
              variant="danger"
              loading={busy === 'mystery'}
              disabled={busy !== null || !(Number(boxes) >= 1)}
              onClick={() =>
                void shady('mystery', 'mystery', String(Math.floor(Number(boxes))), T.mysterySold)
              }
            >
              {T.mysterySell}
            </Button>
          </span>
        </div>
        {sh.bumped > 0 && (
          <p className="flex items-center gap-2 text-xs text-warn">
            <PixelIcon name="bolt" /> {T.bumpedCount(sh.bumped)}
          </p>
        )}
      </div>
      {payout && <UntaxedPayout co={co} onClose={() => setPayout(false)} />}
    </Panel>
  )
}

function UntaxedPayout({ co, onClose }: { co: Company; onClose: () => void }) {
  const { busy, run } = useRun()
  const [euros, setEuros] = useState(String(Math.floor(co.cash_cents / 100)))
  const cents = Math.round(Number(euros.replace(',', '.')) * 100)
  const valid = Number.isFinite(cents) && cents >= 1 && cents <= co.cash_cents
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.evade} description={T.evadeTip}>
      <Field
        label={T.amount}
        type="number"
        inputMode="decimal"
        min={0.01}
        max={co.cash_cents / 100}
        step="0.01"
        value={euros}
        onChange={(e) => setEuros(e.target.value)}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <HoldButton
          disabled={!valid || busy !== null}
          onHold={async () => {
            if (await run('payout', 'company_shady', { p_action: 'payout', p_arg: String(cents) })) {
              sfx('coin')
              toast('success', T.paidOut(formatMoney(cents)))
              onClose()
            }
          }}
        >
          {T.payout}
        </HoldButton>
      </div>
    </Dialog>
  )
}

/** One grade more for a friend's order (Gefälligkeitsgutachten). */
export function BumpButton({ order }: { order: Company['player_orders'][number] }) {
  const { busy, run } = useRun()
  if (order.bumped) return <span className="text-xs text-warn">{T.bumped}</span>
  return (
    <HoldButton
      disabled={busy !== null}
      onHold={async () => {
        if (await run('bump', 'company_shady', { p_action: 'bump', p_arg: String(order.id) })) {
          sfx('coin')
          toast('info', T.bumped)
        }
      }}
    >
      {T.bump}
    </HoldButton>
  )
}

export function Awards({ co }: { co: Company }) {
  const won = new Set(co.awards.map((a) => a.key))
  return (
    <Panel title={T.awards} tip={T.awardsTip}>
      <ul className="flex flex-col gap-2">
        {AWARDS.map((a) => (
          <li
            key={a.key}
            className={clsx(
              'flex items-center gap-3 rounded-xl p-3',
              won.has(a.key) ? 'bg-gold/15' : 'bg-surface-2 opacity-70',
            )}
          >
            <PixelIcon name={won.has(a.key) ? 'trophy' : 'lock'} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{a.name}</span>
              <span className="block text-xs text-fg-3">{a.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
