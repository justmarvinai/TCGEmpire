import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useLimits } from '@/lib/actions.ts'
import { formatDate, formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Honor, Loan, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { UNLOCKS } from '../../../content/unlocks.ts'

const T = texts.loans

export const useLoans = () => useQuery({ queryKey: ['loans'], queryFn: () => rpc('loans_get') })

/** Ehre title and record, e.g. next to a name. */
export function HonorBadge({ honor, record }: { honor: Honor; record?: boolean }) {
  const bad = honor.broken > 0
  return (
    <span
      className={clsx(
        'rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold',
        bad ? 'bg-loss/15 text-loss' : 'bg-surface-3 text-fg-2',
      )}
    >
      {honor.title ? T.titles[honor.title] : T.noTitle}
      {record && <span className="font-normal text-fg-3"> · {T.record(honor.kept, honor.broken)}</span>}
    </span>
  )
}

/** The Bierdeckel: open offers, running loans, the last closed ones and the own Ehre. */
export function LoansPanel({ player }: { player: Player }) {
  const q = useLoans()
  const d = q.data
  return (
    <Panel tour="loans" title={T.title} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <p className="text-sm text-fg-3">{T.locked(d.unlock_level)}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-fg-3">{T.honor}:</span> <HonorBadge honor={d.honor} record />
          </p>
          {d.honor.schufa_until && (
            <p className="text-xs text-loss">{T.schufa(formatDate(d.honor.schufa_until))}</p>
          )}
          {d.loans.length === 0 ? (
            <p className="text-sm text-fg-3">{T.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.loans.map((l) => (
                <LoanRow key={l.id} l={l} cash={player.cash_cents} level={player.level} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  )
}

const STATE_TEXT: Record<Loan['state'], string> = {
  offered: T.stateOffered,
  active: T.stateActive,
  repaid: T.stateRepaid,
  defaulted: T.stateDefaulted,
  cancelled: T.stateCancelled,
}

function LoanRow({ l, cash, level }: { l: Loan; cash: number; level: number }) {
  const act = useAct()
  const client = useQueryClient()
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (
    key: string,
    fn: 'loan_respond' | 'loan_cancel' | 'loan_repay' | 'loan_burst',
    args: Record<string, unknown>,
    done: string,
  ) => {
    setBusy(key)
    const res = await act(fn, { p_loan: l.id, ...args }, ['players'])
    setBusy(null)
    if (!res) return
    client.setQueryData(['loans'], res.loans)
    sfx(key === 'decline' || key === 'withdraw' ? 'toggle' : key === 'burst' ? 'shard' : 'success')
    toast(key === 'decline' || key === 'withdraw' || key === 'burst' ? 'info' : 'success', done)
  }

  return (
    <li
      className={clsx(
        'flex flex-col gap-1.5 rounded-xl bg-surface-2 p-3',
        (l.state === 'repaid' || l.state === 'cancelled') && 'opacity-70',
      )}
    >
      <span className="flex items-center gap-2">
        <Avatar name={l.other.name} look={l.other.look} size={24} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {l.role === 'lender' ? (
            <>
              {texts.players.you} → <PlayerName name={l.other.name} look={l.other.look} />
            </>
          ) : (
            <>
              <PlayerName name={l.other.name} look={l.other.look} /> → {texts.players.you}
            </>
          )}
        </span>
        <span
          className={clsx(
            'text-xs font-bold',
            l.state === 'defaulted' ? 'text-loss' : l.state === 'active' ? 'text-accent' : 'text-fg-3',
          )}
        >
          {STATE_TEXT[l.state]}
        </span>
      </span>
      <span className="nums text-sm">
        <span className="text-gold">{formatMoney(l.principal_cents)}</span>
        <span className="text-fg-3">
          {' '}
          · {l.interest_pct} % · {l.days} d
        </span>
      </span>
      {l.state === 'active' && l.due_at && (
        <span className="nums text-xs text-fg-2">
          {T.due(
            formatMoney(l.due_cents),
            formatDuration(Math.max(0, Math.round((Date.parse(l.due_at) - now) / 1000))),
          )}
        </span>
      )}
      <span className="flex flex-wrap gap-2">
        {l.state === 'offered' && l.role === 'borrower' && (
          <>
            <Button
              size="sm"
              variant="primary"
              loading={busy === 'accept'}
              disabled={busy !== null}
              onClick={() => void run('accept', 'loan_respond', { p_accept: true }, T.accepted)}
            >
              {T.accept}
            </Button>
            <Button
              size="sm"
              loading={busy === 'decline'}
              disabled={busy !== null}
              onClick={() => void run('decline', 'loan_respond', { p_accept: false }, T.declined)}
            >
              {T.decline}
            </Button>
          </>
        )}
        {l.state === 'offered' && l.role === 'lender' && (
          <Button
            size="sm"
            loading={busy === 'withdraw'}
            disabled={busy !== null}
            onClick={() => void run('withdraw', 'loan_cancel', {}, T.withdrawn)}
          >
            {T.withdraw}
          </Button>
        )}
        {l.state === 'active' && l.role === 'borrower' && (
          <Button
            size="sm"
            variant="primary"
            loading={busy === 'repay'}
            disabled={busy !== null || cash < l.due_cents}
            onClick={() => void run('repay', 'loan_repay', {}, T.repaid)}
          >
            {T.repay(formatMoney(l.due_cents))}
          </Button>
        )}
        {l.state === 'active' && l.role === 'borrower' && level >= UNLOCKS.darkside && (
          <span className="flex items-center gap-1">
            <HoldButton disabled={busy !== null} onHold={() => void run('burst', 'loan_burst', {}, T.burstDone(l.other.name))}>
              {T.burst}
            </HoldButton>
            <InfoTip>{T.burstTip}</InfoTip>
          </span>
        )}
      </span>
    </li>
  )
}

/** Offer a loan to another player. */
export function LoanDialog({
  to,
  onClose,
}: {
  to: { id: string; name: string; honor: Honor }
  onClose: () => void
}) {
  const act = useAct()
  const client = useQueryClient()
  const d = useLoans().data
  const [euros, setEuros] = useState('100')
  const [pct, setPct] = useState('10')
  const [days, setDays] = useState('3')
  const [busy, setBusy] = useState(false)
  const limit = useLimits(to.id).data?.target
  const cents = Math.round(Number(euros.replace(',', '.')) * 100)
  const interest = Math.round(Number(pct))
  const dayCount = Math.round(Number(days))
  const valid =
    !!d &&
    Number.isFinite(cents) &&
    cents >= d.min_cents &&
    (!limit || (cents <= limit.loan_max_cents && !limit.loan_active)) &&
    interest >= 0 &&
    interest <= d.max_interest_pct &&
    dayCount >= 1 &&
    dayCount <= d.max_days

  const send = async () => {
    setBusy(true)
    const res = await act('loan_offer', {
      p_to: to.id,
      p_cents: cents,
      p_interest_pct: interest,
      p_days: dayCount,
    })
    setBusy(false)
    if (!res) return
    client.setQueryData(['loans'], res.loans)
    sfx('success')
    toast('success', T.offered(to.name))
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.dialog(to.name)} description={T.dialogDesc}>
      <p className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-fg-3">{T.honor}:</span> <HonorBadge honor={to.honor} record />
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label={T.amount}
          type="number"
          inputMode="decimal"
          min={d ? d.min_cents / 100 : 1}
          step="1"
          value={euros}
          onChange={(e) => setEuros(e.target.value)}
        />
        <Field
          label={T.interest}
          type="number"
          min={0}
          max={d?.max_interest_pct}
          step="1"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
        />
        <Field
          label={T.days}
          type="number"
          min={1}
          max={d?.max_days}
          step="1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
      {limit && (
        <p className={clsx('mt-2 text-xs', limit.loan_active || cents > limit.loan_max_cents ? 'text-warn' : 'text-fg-3')}>
          {limit.loan_active ? T.busy(to.name) : T.max(formatMoney(limit.loan_max_cents))}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button variant="primary" loading={busy} disabled={busy || !valid} onClick={() => void send()}>
          {T.offer}
        </Button>
      </div>
    </Dialog>
  )
}
