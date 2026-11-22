import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { eurosToCents } from '@/features/cardmarket/common.tsx'
import { useAct } from '@/lib/actions.ts'
import { SETS, STORES } from '@/lib/catalog.ts'
import { formatAgo, formatDuration, formatMoney, formatNumber } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import { SET_PHASES, type Admin, type RpcName } from '@/lib/schemas.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.admin
const setName = (id: string) => SETS.find((s) => s.id === id)?.name ?? id
const storeName = (key: string) => STORES.find((s) => s.key === key)?.name ?? key

/** Runs an admin write and puts the fresh console document into the cache. */
function useAdminAct() {
  const act = useAct()
  const client = useQueryClient()
  return async (fn: RpcName, args: Record<string, unknown>, done: string) => {
    const res = await act(fn, args)
    if (res) {
      client.setQueryData(['admin'], res)
      toast('success', done)
    }
    return !!res
  }
}

export function AdminPage() {
  const isAdmin = useMe().data?.player?.is_admin ?? false
  const q = useQuery({ queryKey: ['admin'], queryFn: () => rpc('admin_get'), enabled: isAdmin, refetchInterval: 30_000 })
  return (
    <Page icon="crown" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {!isAdmin ? (
        <Panel>
          <EmptyState icon="lock" title={T.only} />
        </Panel>
      ) : q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !q.data ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Sets d={q.data} />
          <Stores d={q.data} />
          <Economy d={q.data} />
          <Players d={q.data} />
          <Server />
          <Ticks d={q.data} />
          <Config d={q.data} />
        </div>
      )}
    </Page>
  )
}

function Sets({ d }: { d: Admin }) {
  const run = useAdminAct()
  const [pick, setPick] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <Panel title={T.sets} tip={T.setsTip}>
      <ul className="flex flex-col gap-3">
        {d.sets.map((s) => {
          const target = pick[s.id] ?? s.phase
          return (
            <li key={s.id} className="rounded-xl bg-surface-2 p-3">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <b>{setName(s.id)}</b>
                <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold">{T.phases[s.phase]}</span>
              </p>
              <p className="nums mt-1 text-xs text-fg-3">
                {T.packs(formatNumber(s.packs_opened))} · {T.sealedLeft(formatNumber(s.sealed_left))}
                {s.sealed_at_oop !== null && ` · ${T.atOop(formatNumber(s.sealed_at_oop))}`}
              </p>
              <div className="mt-3 flex gap-2">
                <select
                  value={target}
                  onChange={(e) => setPick((p) => ({ ...p, [s.id]: e.target.value }))}
                  aria-label={T.setPhase}
                  className="panel-inset h-9 flex-1 bg-transparent px-2 text-sm"
                >
                  {SET_PHASES.map((ph) => (
                    <option key={ph} value={ph}>
                      {T.phases[ph]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant={target === 'oop' || target === 'vintage' ? 'danger' : 'neutral'}
                  disabled={target === s.phase}
                  loading={busy === s.id}
                  onClick={async () => {
                    setBusy(s.id)
                    await run('admin_set_phase', { p_set: s.id, p_phase: target }, T.phaseDone)
                    setBusy(null)
                  }}
                >
                  {T.setPhase}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Stores({ d }: { d: Admin }) {
  const run = useAdminAct()
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <Panel title={T.stores} tip={T.storesTip}>
      <ul className="flex flex-col gap-2">
        {d.stores.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <b className="block">{storeName(s.key)}</b>
              <span className="text-xs text-fg-3">
                {s.due_at ? T.lastRestock(formatAgo(s.due_at, now + offset)) : T.noRestock}
                {s.waves.map((w) => ` · ${w.qty_left}/${w.qty_total}`).join('')}
              </span>
            </span>
            <Button
              size="sm"
              loading={busy === s.key}
              onClick={async () => {
                setBusy(s.key)
                await run('admin_restock', { p_store: s.key }, T.restockDone)
                setBusy(null)
              }}
            >
              {T.restock}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Economy({ d }: { d: Admin }) {
  const today = d.economy[0]?.day
  const rows = useMemo(() => {
    const by = new Map<string, { today: number; week: number }>()
    for (const e of d.economy) {
      const r = by.get(e.reason) ?? { today: 0, week: 0 }
      r.week += e.cents
      if (e.day === today) r.today += e.cents
      by.set(e.reason, r)
    }
    return [...by.entries()].sort((a, b) => Math.abs(b[1].week) - Math.abs(a[1].week))
  }, [d.economy, today])
  const created = rows.reduce((s, [, r]) => s + Math.max(0, r.week), 0)
  const destroyed = rows.reduce((s, [, r]) => s + Math.min(0, r.week), 0)
  return (
    <Panel title={T.economy} tip={T.economyTip}>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          {T.created} <b className="nums text-gain">{formatMoney(created)}</b>
        </span>
        <span>
          {T.destroyed} <b className="nums text-loss">{formatMoney(destroyed)}</b>
        </span>
        <span className="text-fg-3">{T.priceLevel(d.price_level.toFixed(2).replace('.', ','))}</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-3">
              <th className="pb-2 font-semibold">{T.reason}</th>
              <th className="pb-2 text-right font-semibold">{T.today}</th>
              <th className="pb-2 text-right font-semibold">{T.week}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([reason, r]) => (
              <tr key={reason} className="border-t border-line">
                <td className="py-1.5 font-mono text-xs">{reason}</td>
                <td className={clsx('nums py-1.5 text-right', r.today > 0 ? 'text-gain' : r.today < 0 ? 'text-loss' : 'text-fg-3')}>{formatMoney(r.today)}</td>
                <td className={clsx('nums py-1.5 text-right font-semibold', r.week > 0 ? 'text-gain' : r.week < 0 ? 'text-loss' : 'text-fg-3')}>{formatMoney(r.week)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Players({ d }: { d: Admin }) {
  const run = useAdminAct()
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const [player, setPlayer] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const cents = eurosToCents(amount || '0')
  const target = d.players.find((p) => p.id === player)
  return (
    <Panel title={T.players} tip={T.playersTip}>
      <ul className="mb-4 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
        {d.players.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 rounded-lg bg-surface-2 px-3 py-2">
            <b className="min-w-28">{p.name}</b>
            <span className="nums text-fg-3">Lv {p.level}</span>
            <span className="nums">{formatMoney(p.cash_cents)}</span>
            <span className="nums text-fg-2">/ {formatMoney(p.net_worth_cents)}</span>
            <span className="ml-auto text-xs text-fg-3">{formatAgo(p.last_seen_at, now + offset)}</span>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!target || !(cents > 0)) return
          setBusy(true)
          if (await run('admin_grant', { p_player: target.id, p_cents: cents }, T.grantDone(target.name, formatMoney(cents)))) setAmount('')
          setBusy(false)
        }}
      >
        <label className="flex-1 text-xs text-fg-2">
          {T.grantPlayer}
          <select value={player} onChange={(e) => setPlayer(e.target.value)} className="panel-inset mt-1 block h-9 w-full bg-transparent px-2 text-sm text-fg">
            <option value="">–</option>
            {d.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="w-32 text-xs text-fg-2">
          {T.grantAmount}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="panel-inset mt-1 block h-9 w-full bg-transparent px-2 text-sm text-fg" />
        </label>
        <Button type="submit" size="sm" loading={busy} disabled={!target || !(cents > 0)}>
          {T.grant}
        </Button>
      </form>
    </Panel>
  )
}

function Server() {
  const run = useAdminAct()
  const [code, setCode] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<'code' | 'text' | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <Panel title={T.invite} tip={T.inviteTip}>
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy('code')
            if (await run('admin_invite_set', { p_code: code }, T.inviteDone)) setCode('')
            setBusy(null)
          }}
        >
          <label className="flex-1 text-xs text-fg-2">
            {T.inviteLabel}
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={64} className="panel-inset mt-1 block h-9 w-full bg-transparent px-2 text-sm text-fg" />
          </label>
          <Button type="submit" size="sm" loading={busy === 'code'} disabled={code.length < 4}>
            {T.inviteSave}
          </Button>
        </form>
      </Panel>
      <Panel title={T.announce} tip={T.announceTip}>
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy('text')
            if (await run('admin_announce', { p_text: text }, T.announceDone)) setText('')
            setBusy(null)
          }}
        >
          <label className="flex-1 text-xs text-fg-2">
            {T.announceLabel}
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} className="panel-inset mt-1 block h-9 w-full bg-transparent px-2 text-sm text-fg" />
          </label>
          <Button type="submit" size="sm" loading={busy === 'text'} disabled={!text.trim()}>
            {T.announceSend}
          </Button>
        </form>
      </Panel>
    </div>
  )
}

function Ticks({ d }: { d: Admin }) {
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  return (
    <Panel title={T.ticks} tip={T.ticksTip}>
      <ul className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
        {d.systems.map((s) => (
          <li key={s.name} className="flex items-baseline gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
            <b className="font-mono text-xs">{s.name}</b>
            <span className="text-xs text-fg-3">{T.every(formatDuration(s.every_seconds))}</span>
            <span className={clsx('ml-auto text-xs', s.failed_24h > 0 ? 'text-loss' : 'text-fg-3')}>
              {s.failed_24h > 0 ? T.failed(s.failed_24h) : s.last_run_at ? formatAgo(s.last_run_at, now + offset) : T.never}
            </span>
          </li>
        ))}
      </ul>
      <p className="eyebrow mb-2">{T.runs}</p>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto text-xs">
        {d.job_runs.map((r, i) => (
          <li key={i} className={clsx('rounded-lg px-3 py-1.5', r.ok ? 'bg-surface-2' : 'bg-loss/15 text-loss')}>
            <span className="font-mono">{r.name}</span> · {r.ok ? T.ok : T.error} · {r.ms} ms · {formatAgo(r.started_at, now + offset)}
            {r.error && <span className="mt-0.5 block break-words text-fg-2">{r.error}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Config({ d }: { d: Admin }) {
  const run = useAdminAct()
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const rows = d.config.filter((c) => c.key.includes(search.trim().toLowerCase()))
  const save = async (key: string, raw: string | null) => {
    let value: unknown = null
    if (raw !== null) {
      try {
        value = JSON.parse(raw)
      } catch {
        toast('error', T.configBad)
        return
      }
    }
    if (await run('admin_config_set', { p_key: key, p_value: value }, T.configDone)) setDrafts(({ [key]: _, ...rest }) => rest)
  }
  return (
    <Panel title={T.config} tip={T.configTip} className="xl:col-span-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={T.configSearch}
        aria-label={T.configSearch}
        className="panel-inset mb-3 h-9 w-full bg-transparent px-3 text-sm placeholder:text-fg-3"
      />
      <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
        {rows.map((c) => {
          const current = JSON.stringify(c.override ?? c.value)
          const draft = drafts[c.key] ?? current
          return (
            <li key={c.key} className={clsx('flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-xs', c.override !== null ? 'bg-accent-lo/20' : 'bg-surface-2')}>
              <span className="min-w-56 flex-1 font-mono">{c.key}</span>
              <input
                value={draft}
                onChange={(e) => setDrafts((x) => ({ ...x, [c.key]: e.target.value }))}
                aria-label={c.key}
                className="panel-inset h-8 w-56 bg-transparent px-2 font-mono text-xs"
              />
              <Button size="sm" disabled={draft === current} onClick={() => void save(c.key, draft)}>
                {T.configSave}
              </Button>
              <Button size="sm" disabled={c.override === null} onClick={() => void save(c.key, null)}>
                {T.configClear}
              </Button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
