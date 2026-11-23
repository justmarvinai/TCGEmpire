import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PERKS } from '../../../content/prestige.ts'
import { rankName } from './rank.ts'
import { slabName } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName, itemName } from '@/lib/catalog.ts'
import { formatDate, formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { AtticCopy, Player, Prestige } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.prestige


export function PrestigePage() {
  const q = useQuery({ queryKey: ['prestige'], queryFn: () => rpc('prestige_get') })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="crown" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level && d.prestige === 0 ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)}>
            <p className="max-w-md text-sm text-fg-2">{T.lockedText}</p>
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-12">
          <Rank d={d} />
          <Exit d={d} player={player} />
          <Perks d={d} />
          <Attic d={d} />
          {d.history.length > 0 && <History d={d} />}
        </div>
      )}
    </Page>
  )
}

function Rank({ d }: { d: Prestige }) {
  return (
    <Panel title={T.rank} tip={T.rankTip} className="lg:col-span-4">
      <p className="text-2xl font-bold text-gold">{rankName(d.prestige) ?? T.noRank}</p>
      <p className="mt-1 text-sm text-fg-2">{T.exits(d.prestige)}</p>
      <p className="mt-3 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-sm text-fg-2">
          {T.stars} <InfoTip>{T.starsTip}</InfoTip>
        </span>
        <span className="nums text-2xl font-bold text-accent">{d.stars}</span>
      </p>
    </Panel>
  )
}

function Exit({ d, player }: { d: Prestige; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const blockers = Object.entries(d.blockers)
  const ready = player.level >= d.unlock_level
  const exit = async () => {
    const res = await act('prestige_exit', { p_confirm: confirm })
    if (!res) return
    client.setQueryData(['prestige'], res)
    client.removeQueries({ predicate: (q) => !['me', 'atlas', 'prestige'].includes(String(q.queryKey[0])) })
    setConfirm('')
    sfx('levelup')
    toast('success', T.done(res.history[res.history.length - 1]?.stars ?? 0, rankName(res.prestige) ?? ''))
  }
  return (
    <Panel tour="prestige-exit" title={T.exit} tip={T.exitTip} className="lg:col-span-8">
      {!ready ? (
        <p className="text-sm text-fg-2">{T.nextExit(d.unlock_level)}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-fg-2">{T.preview}</span>
              <span className="nums text-3xl font-bold text-accent">+{d.preview.stars}</span>
            </p>
            <p className="text-xs text-fg-3">
              {T.previewBreakdown(d.preview.base, d.preview.stars - d.preview.base, formatMoney(d.preview.value_cents), formatMoney(d.preview.unit_cents))}
            </p>
            <p className="mt-2 font-semibold">{T.resets}</p>
            <p className="text-fg-2">{T.resetsList}</p>
            <p className="mt-2 font-semibold">{T.keeps}</p>
            <p className="text-fg-2">{T.keepsList(formatMoney(d.preview.start_cents), d.preview.ruf_after)}</p>
          </div>
          <div className="flex flex-col gap-3">
            {blockers.length > 0 ? (
              <div className="rounded-xl bg-loss/10 p-3 text-sm">
                <p className="font-semibold text-loss">{T.blocked}</p>
                <ul className="mt-1 list-disc pl-5 text-fg-2">
                  {blockers.map(([k, n]) => (
                    <li key={k}>{T.blockers[k]?.(n) ?? `${k}: ${n}`}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <Field label={T.confirmLabel(player.username)} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
                <HoldButton disabled={confirm.trim().toLowerCase() !== player.username.toLowerCase()} onHold={() => void exit()}>
                  {T.go}
                </HoldButton>
              </>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

function Perks({ d }: { d: Prestige }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const buy = async (key: string) => {
    setBusy(key)
    const res = await act('perk_buy', { p_key: key })
    setBusy(null)
    if (!res) return
    client.setQueryData(['prestige'], res)
    sfx('success')
    toast('success', T.perkBought(PERKS.find((p) => p.key === key)?.name ?? key))
  }
  return (
    <Panel tour="prestige-perks" title={T.perks} tip={T.perksTip} className="lg:col-span-12">
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {PERKS.map((p) => {
          const own = d.perks[p.key] ?? { level: 0, cost: null }
          return (
            <li key={p.key} className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-3 text-sm">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="nums text-xs text-fg-3">{T.perkLevel(own.level, p.max)}</span>
              </span>
              <span className="text-fg-2">{p.text}</span>
              {own.cost === null ? (
                <span className="text-xs font-semibold text-gain">{T.perkMax}</span>
              ) : (
                <Button
                  size="sm"
                  className="self-start"
                  loading={busy === p.key}
                  disabled={busy !== null || d.stars < own.cost}
                  onClick={() => void buy(p.key)}
                >
                  {T.perkBuy(own.cost)}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Attic({ d }: { d: Prestige }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})
  const left = Math.max(0, d.attic.limit_cents - d.attic.used_cents)
  const fresh = d.attic.used_cents === 0
  const fetchBack = async (key: string, args: Record<string, unknown>) => {
    setBusy(key)
    const res = await act('attic_retrieve', args)
    setBusy(null)
    if (!res) return
    client.setQueryData(['prestige'], res)
    for (const k of ['collection', 'inventory']) void client.invalidateQueries({ queryKey: [k] })
    sfx('success')
    toast('success', T.atticDone)
  }
  const empty = d.attic.items.length === 0 && d.attic.copies.length === 0
  const label = (c: AtticCopy) =>
    c.grader && c.grade !== null ? slabName({ grader: c.grader as 'psa', grade: c.grade, black_label: Boolean(c.black_label) }) : T.raw
  return (
    <Panel title={T.attic} tip={T.atticTip} className="lg:col-span-12">
      {empty ? (
        <EmptyState icon="house" title={T.atticEmpty} />
      ) : (
        <>
          <p className="nums mb-3 text-sm text-fg-2">
            {T.atticLeft(formatMoney(left), formatMoney(d.attic.limit_cents))}
            {fresh && <span className="text-fg-3"> · {T.atticFresh}</span>}
          </p>
          <ul className="flex max-h-[30rem] flex-col gap-1.5 overflow-y-auto pr-1">
            {d.attic.copies.map((c) => (
              <li key={c.copy_id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="min-w-40 flex-1">
                  <span className="block truncate font-semibold">{cardName(c.card_id)}</span>
                  <span className="text-xs text-fg-3">{label(c)}</span>
                </span>
                <span className="nums text-gold">{formatMoney(c.value_cents)}</span>
                <Button
                  size="sm"
                  loading={busy === c.copy_id}
                  disabled={busy !== null || (!fresh && c.value_cents > left)}
                  onClick={() => void fetchBack(c.copy_id, { p_kind: 'copy', p_item: null, p_copy: c.copy_id, p_qty: null })}
                >
                  {T.fetch}
                </Button>
              </li>
            ))}
            {d.attic.items.map((i) => {
              const key = `${i.kind}:${i.item_id}`
              const n = Math.max(1, Math.min(i.qty, qty[key] ?? 1))
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span className="min-w-40 flex-1">
                    <span className="block truncate font-semibold">{i.kind === 'card' ? cardName(i.item_id) : itemName(i.item_id)}</span>
                    <span className="nums text-xs text-fg-3">{T.atticQty(i.qty, formatMoney(i.value_cents))}</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={i.qty}
                    value={n}
                    aria-label={T.fetchQty}
                    onChange={(e) => setQty((q) => ({ ...q, [key]: Number(e.target.value) }))}
                    className="panel-inset nums h-8 w-20 bg-transparent px-2 text-fg"
                  />
                  <Button
                    size="sm"
                    loading={busy === key}
                    disabled={busy !== null || (!fresh && i.value_cents * n > left)}
                    onClick={() => void fetchBack(key, { p_kind: i.kind, p_item: i.item_id, p_copy: null, p_qty: n })}
                  >
                    {T.fetch}
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Panel>
  )
}

function History({ d }: { d: Prestige }) {
  return (
    <Panel title={T.history} tip={T.historyTip} className="lg:col-span-12">
      <ul className="flex flex-col gap-1.5 text-sm">
        {d.history.map((h) => (
          <li key={h.n} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="font-semibold">{T.historyLine(h.n, rankName(h.n) ?? '')}</span>
            <span className="nums text-fg-2">
              {T.historyMeta(formatDate(h.at), Math.max(1, Math.round((Date.parse(h.at) - Date.parse(h.started_at)) / 86_400_000)), h.stars, formatMoney(h.value_cents))}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
