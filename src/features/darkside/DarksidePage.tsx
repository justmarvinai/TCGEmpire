import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ATTACKS, type AttackKind } from '../../../content/darkside.ts'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { HonorBadge } from '@/features/players/Loans.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName, itemName } from '@/lib/catalog.ts'
import { formatAgo, formatClock, formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { AttackPreview, AttackResult, Darkside } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { serverNow, useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.darkside
const DEF = Object.fromEntries(ATTACKS.map((a) => [a.key, a])) as Record<AttackKind, (typeof ATTACKS)[number]>
const PLAYER_ATTACKS = ['bunker', 'finanzamt', 'bewertung', 'abwerben'] as const
const attackName = (kind: string) => (kind === 'kredit' ? T.kredit : (DEF[kind as AttackKind]?.name ?? kind))

export function DarksidePage() {
  const q = useQuery({ queryKey: ['darkside'], queryFn: () => rpc('darkside_get'), refetchInterval: 30_000 })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="skull" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-12">
          <Status d={d} />
          <Targets d={d} cash={player.cash_cents} />
          <Rumour d={d} cash={player.cash_cents} />
          <Reseal d={d} cash={player.cash_cents} />
          <Log d={d} />
        </div>
      )}
    </Page>
  )
}

/** Runs a dark-side RPC and puts the new page state in the cache. */
function useDark() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async <N extends 'attack' | 'reseal'>(key: string, fn: N, args: Record<string, unknown>) => {
    setBusy(key)
    const res = await act(fn, args)
    setBusy(null)
    if (res) client.setQueryData(['darkside'], res)
    return res
  }
  return { busy, run }
}

function report(r: AttackResult) {
  if (r.success) {
    sfx('success')
    toast('success', T.success[r.kind]?.(formatMoney(r.cents ?? 0)) ?? '')
  } else {
    sfx('error')
    toast('error', (r.clean ? T.falseReport : T.blocked)(formatMoney(r.fine_cents ?? 0)))
  }
}

function Status({ d }: { d: Darkside }) {
  return (
    <Panel title={T.status} tip={T.statusTip(d.rules.angriff_per_skill)} className="lg:col-span-4">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-fg-2">{T.angriff}</span>
        <span className="nums text-2xl font-bold text-accent">+{d.angriff}</span>
      </p>
      <p className="mt-3 text-sm text-fg-2">{T.abwehr}</p>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {ATTACKS.map((a) => (
          <li key={a.key} className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-fg-2">{a.defenceName}</span>
            <span className={clsx('nums font-semibold', (d.abwehr[a.key] ?? 0) > 0 ? 'text-gain' : 'text-fg-3')}>{d.abwehr[a.key] ?? 0}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-1 text-fg-2">
          {T.capLeft} <InfoTip>{T.capTip(d.rules.loss_cap_pct)}</InfoTip>
        </span>
        <span className="nums font-semibold text-gold">{formatMoney(d.cap_left_cents)}</span>
      </p>
      <Link to="/upgrades" className="mt-4 inline-block">
        <Button size="sm">{T.defend}</Button>
      </Link>
    </Panel>
  )
}

function Targets({ d, cash }: { d: Darkside; cash: number }) {
  const { busy, run } = useDark()
  const hit = async (target: string, kind: (typeof PLAYER_ATTACKS)[number]) => {
    const res = await run(`${target}:${kind}`, 'attack', { p_kind: kind, p_target: target, p_card: null, p_up: null })
    if (res) report(res.result)
  }
  return (
    <Panel title={T.targets} tip={T.targetsTip(d.rules.cooldown_minutes, d.rules.daily_successes)} className="lg:col-span-8">
      {d.targets.length === 0 ? (
        <EmptyState icon="people" title={T.noTargets} />
      ) : (
        <ul className="flex flex-col gap-3">
          {d.targets.map((t) => (
            <li key={t.id} className="rounded-xl bg-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Avatar name={t.name} look={t.look} size={28} />
                <span className="font-semibold">
                  <PlayerName name={t.name} look={t.look} />
                </span>
                <span className="text-xs text-fg-3">{T.level(t.level)}</span>
                <HonorBadge honor={t.honor} />
                {t.company && <span className="truncate text-xs text-fg-3">„{t.company}“</span>}
                {t.revenge_until && (
                  <span className="rounded-md bg-loss/15 px-2 py-0.5 text-xs font-semibold text-loss">{T.revenge(formatClock(t.revenge_until))}</span>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PLAYER_ATTACKS.map((k) => (
                  <AttackRow
                    key={k}
                    kind={k}
                    p={t.attacks[k]}
                    cash={cash}
                    busy={busy === `${t.id}:${k}`}
                    disabled={busy !== null}
                    onGo={() => void hit(t.id, k)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AttackRow({
  kind,
  p,
  cash,
  busy,
  disabled,
  onGo,
}: {
  kind: AttackKind
  p: AttackPreview
  cash: number
  busy: boolean
  disabled: boolean
  onGo: () => void
}) {
  const reason = p.reason ? (p.reason === 'attack_cooldown' && p.ready_at ? T.readyAt(formatClock(p.ready_at)) : (T.reasons[p.reason] ?? p.reason)) : null
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-3 px-2.5 py-2 text-sm">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1 font-semibold">
          <span className="truncate">{DEF[kind].name}</span> <InfoTip>{DEF[kind].text}</InfoTip>
        </span>
        <span className="nums text-xs text-fg-3">
          {T.chance} <span className={clsx('font-semibold', p.chance >= 50 ? 'text-gain' : p.chance <= 15 ? 'text-loss' : 'text-fg')}>{p.chance} %</span> ·{' '}
          {T.cost} <span className="text-gold">{formatMoney(p.cost_cents)}</span>
          {!!p.loot_cents && (
            <>
              {' '}
              · {T.loot} <span className="text-gain">{formatMoney(p.loot_cents)}</span>
            </>
          )}
        </span>
      </span>
      {reason ? (
        <span className="shrink-0 text-xs text-fg-3">{reason}</span>
      ) : busy ? (
        <Button size="sm" loading>
          {T.hold}
        </Button>
      ) : (
        <HoldButton disabled={disabled || cash < p.cost_cents} onHold={onGo} ms={900}>
          {T.hold}
        </HoldButton>
      )}
    </div>
  )
}

function Rumour({ d, cash }: { d: Darkside; cash: number }) {
  const { busy, run } = useDark()
  const [card, setCard] = useState(d.rumour.cards.find((c) => !c.busy)?.card_id ?? '')
  const picked = d.rumour.cards.find((c) => c.card_id === card)
  const defender = d.targets.find((t) => t.id === d.rumour.defender)?.name
  const go = async (up: boolean) => {
    const res = await run(up ? 'up' : 'down', 'attack', { p_kind: 'geruecht', p_target: null, p_card: card, p_up: up })
    if (res) report(res.result)
  }
  const blocked = !card || picked?.busy || !d.rumour.ok || cash < d.rumour.cost_cents || busy !== null
  return (
    <Panel title={T.rumour} tip={DEF.geruecht.text} className="lg:col-span-6">
      <label className="flex min-w-0 flex-col gap-1 text-sm">
        <span className="text-fg-3">{T.rumourCard}</span>
        <select className="panel-inset h-9 w-full min-w-0 bg-transparent px-2 text-fg" value={card} onChange={(e) => setCard(e.target.value)}>
          {d.rumour.cards.map((c) => (
            <option key={c.card_id} value={c.card_id}>
              {cardName(c.card_id)} · {formatMoney(c.value_cents)}
              {c.busy ? ` · ${T.rumourRunning}` : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="nums mt-2 text-sm text-fg-2">
        {T.chance} <span className="font-semibold text-fg">{d.rumour.chance} %</span> · {T.cost}{' '}
        <span className="text-gold">{formatMoney(d.rumour.cost_cents)}</span>
        {d.rumour.ready_at && <span className="text-fg-3"> · {T.readyAt(formatClock(d.rumour.ready_at))}</span>}
      </p>
      <p className="mt-1 text-xs text-fg-3">{defender ? T.rumourDefender(defender) : T.rumourNoDefender}</p>
      {picked?.busy && <p className="mt-1 text-xs text-loss">{T.rumourBusy}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" loading={busy === 'up'} disabled={blocked} onClick={() => void go(true)}>
          {T.rumourUp}
        </Button>
        <Button size="sm" loading={busy === 'down'} disabled={blocked} onClick={() => void go(false)}>
          {T.rumourDown}
        </Button>
      </div>
    </Panel>
  )
}

function Reseal({ d, cash }: { d: Darkside; cash: number }) {
  const { busy, run } = useDark()
  const [qty, setQty] = useState<Record<string, number>>({})
  const prepare = async (product: string, n: number) => {
    const res = await run(product, 'reseal', { p_product: product, p_qty: n })
    if (res) {
      sfx('tear')
      toast('success', T.preparedDone(res.prepared.qty, res.prepared.hits, formatMoney(res.prepared.value_cents)))
    }
  }
  return (
    <Panel title={T.resealed} tip={`${DEF.resealed.text} ${T.resealedRules}`} className="lg:col-span-6">
      <p className="mb-3 text-xs text-fg-3">{T.resealedRules}</p>
      {d.resealed.stock.length === 0 ? (
        <EmptyState icon="pack" title={T.resealedEmpty} />
      ) : (
        <ul className="flex flex-col gap-2">
          {d.resealed.stock.map((s) => {
            const free = Math.min(d.resealed.max, s.qty - s.prepared)
            const n = Math.max(1, Math.min(free, qty[s.product_id] ?? 1))
            return (
              <li key={s.product_id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="min-w-40 flex-1">
                  <span className="block truncate font-semibold">{itemName(s.product_id)}</span>
                  <span className="nums text-xs text-fg-3">
                    {T.inStock(s.qty)}
                    {s.prepared > 0 && <span className="text-loss"> · {T.prepared(s.prepared)}</span>}
                  </span>
                </span>
                {free > 0 && (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={free}
                      value={n}
                      aria-label={T.resealed}
                      onChange={(e) => setQty((q) => ({ ...q, [s.product_id]: Number(e.target.value) }))}
                      className="panel-inset nums h-8 w-16 bg-transparent px-2 text-fg"
                    />
                    <Button
                      size="sm"
                      loading={busy === s.product_id}
                      disabled={busy !== null || cash < s.fee_cents * n}
                      onClick={() => void prepare(s.product_id, n)}
                    >
                      {T.prepare(n, formatMoney(s.fee_cents * n))}
                    </Button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function Log({ d }: { d: Darkside }) {
  return (
    <Panel title={T.log} tip={T.logTip} className="lg:col-span-12">
      {d.log.length === 0 ? (
        <EmptyState icon="shield" title={T.logEmpty} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {d.log.map((e) => {
            const other = e.other ?? T.market
            const data = e.data as Record<string, number | undefined>
            const mine = e.role === 'attacker'
            const money = mine
              ? e.success
                ? (data.cents ?? 0)
                : (data.fine_cents ?? 0)
              : e.success
                ? e.kind === 'finanzamt'
                  ? (data.fee_cents ?? 0)
                  : e.kind === 'kredit'
                    ? (data.cents ?? 0)
                    : e.loss_cents
                : (data.joy_cents ?? 0)
            const fmt = money > 0 ? formatMoney(money) : ''
            return (
              <li key={e.id} className="flex items-baseline gap-3 rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                <span className={clsx('size-2 shrink-0 rounded-full', e.success === mine ? 'bg-gain' : 'bg-loss')} aria-hidden />
                <span className="min-w-0 flex-1">
                  {(mine ? T.logMine : T.logTheirs)(attackName(e.kind), other, e.success, fmt)}
                </span>
                <span className="shrink-0 text-xs text-fg-3">{formatAgo(e.at, serverNow())}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
