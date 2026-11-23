import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { graderName, SlabOf, slabName } from '@/components/cards/Slab.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useGrading } from '@/lib/actions.ts'
import { cardById, cardName, TIER_LABEL, TIER_TEXT, type Tier } from '@/lib/catalog.ts'
import { formatDuration, formatFactor, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Companies, GradeResult, GraderId, GraderKey, Grading, ServiceId } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { GradeReveal } from './GradeReveal.tsx'
import { Emblem } from '@/components/pixel/Emblem.tsx'
import { labelColor } from '@/features/company/LabelDesigner.tsx'

const T = texts.grading
type Tab = keyof typeof T.tabs
const GRADERS: GraderId[] = ['psa', 'bgs', 'cgc']
const SERVICES: ServiceId[] = ['economy', 'standard', 'express']
const ASPECTS = ['centering', 'corners', 'edges', 'surface'] as const

/** Server time in ms, ticking every second. */
function useServerNow() {
  const now = useNow()
  const offset = useWorld((s) => s.clockOffsetMs)
  return now > 0 ? now + offset : 0
}

export function GradingPage() {
  const q = useGrading()
  const player = useMe().data?.player
  const [tab, setTab] = useState<Tab>('check')
  const d = q.data
  const now = useServerNow()
  const due = d ? d.orders.filter((o) => now > 0 && Date.parse(o.due_at) <= now).length : 0

  return (
    <Page icon="loupe" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <Panel title={T.slots} tip={T.slotsTip}>
              <p className="nums text-3xl font-bold tracking-tight">
                {d.used}
                <span className="text-fg-3">/{d.slots}</span>
              </p>
            </Panel>
            <Panel title={T.lupe} tip={T.lupeTip}>
              <p className="text-3xl font-bold tracking-tight">{T.width(d.width)}</p>
            </Panel>
            <Panel title={T.slabCount} tip={T.slabCountTip}>
              <p className="nums text-3xl font-bold tracking-tight">{d.slabs.length}</p>
            </Panel>
          </div>

          <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
            {(Object.keys(T.tabs) as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={clsx(
                  'rounded-lg px-4 py-2 text-sm font-semibold',
                  tab === k ? 'bg-grad text-white' : 'text-fg-2 hover:text-fg',
                )}
              >
                {T.tabs[k]}
                {k === 'orders' && d.orders.length > 0 && (
                  <span className="nums ml-1.5 opacity-80">{due > 0 ? `${due}!` : d.orders.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'check' && <CheckTab d={d} onSent={() => setTab('orders')} />}
          {tab === 'orders' && <OrdersTab d={d} now={now} />}
          {tab === 'slabs' && <SlabsTab d={d} />}
          {tab === 'pop' && <PopTab initial={d.slabs[0]?.card_id ?? d.copies[0]?.card_id ?? null} />}
        </>
      )}
    </Page>
  )
}

/** Puts a write's grading document into the cache. */
function useSetGrading() {
  const client = useQueryClient()
  return (g: Grading) => client.setQueryData(['grading'], g)
}

// ----------------------------------------------------------------------------------------------
// Prüfen & Einschicken
// ----------------------------------------------------------------------------------------------
/** Friends' companies as graders: their label, owner, brand and stars. */
function CompanyOptions({
  companies,
  grader,
  onPick,
}: {
  companies: Companies
  grader: GraderKey
  onPick: (g: GraderKey) => void
}) {
  return (
    <>
      <p className="mt-2 flex items-center gap-1 text-xs font-bold tracking-wider text-fg-3 uppercase">
        {T.companies} <InfoTip>{T.companiesTip}</InfoTip>
      </p>
      {companies.map((c) => {
        const key = `co:${c.id}` as const
        const bg = labelColor(c.label.bg)
        const fg = labelColor(c.label.fg)
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={grader === key}
            onClick={() => onPick(key)}
            className={clsx(
              'rounded-xl p-3 text-left outline-2 -outline-offset-2 transition-colors',
              grader === key
                ? 'bg-surface-3 outline-accent'
                : 'bg-surface-2 outline-transparent hover:bg-surface-3',
            )}
          >
            <span className="flex items-center gap-2 font-bold">
              <span className="rounded p-0.5" style={{ background: bg }}>
                <Emblem bits={c.label.emblem} fg={fg} bg={bg} scale={2} />
              </span>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-xs font-semibold text-fg-3">{T.brand(c.brand_bps / 100)}</span>
            </span>
            <span className="mt-1 block text-xs text-fg-2">
              {T.companyBy(c.owner)}
              {c.stars_avg !== null && ` · ★ ${String(c.stars_avg).replace('.', ',')}`}
            </span>
          </button>
        )
      })}
    </>
  )
}

function CheckTab({ d, onSent }: { d: Grading; onSent: () => void }) {
  const act = useAct()
  const setGrading = useSetGrading()
  const [picked, setPicked] = useState<string[]>([])
  const [grader, setGrader] = useState<GraderKey>('psa')
  const [service, setService] = useState<ServiceId>('economy')
  const [busy, setBusy] = useState<string | null>(null)
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => rpc('companies_list') }).data ?? []

  // a big grader or a friend's company: fee, time and upcharge per service
  const company = grader.startsWith('co:') ? companies.find((c) => `co:${c.id}` === grader) : undefined
  const offer = (s: ServiceId) =>
    company
      ? company.services.find((x) => x.service === s)
      : {
          fee_cents: d.graders[grader as GraderId].fees_cents[s],
          minutes: d.graders[grader as GraderId].minutes[s],
        }
  const chosen = d.copies.filter((c) => picked.includes(c.copy_id))
  const fee = offer(service)?.fee_cents ?? 0
  const total = chosen.reduce((s, c) => s + fee + (company ? 0 : c.upcharge_cents[grader as GraderId]), 0)
  const free = d.slots - d.used

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const inspect = async (copy: string) => {
    setBusy(copy)
    const res = await act('grading_inspect', { p_copy: copy, p_card: null })
    setBusy(null)
    if (res) {
      setGrading(res.grading)
      sfx('flip')
    }
  }
  const send = async () => {
    setBusy('send')
    const copies = chosen.map((c) => c.copy_id)
    const res = company
      ? await act('company_order_submit', { p_copies: copies, p_company: company.id, p_service: service }, [
          'binder',
        ])
      : await act('grading_submit', { p_copies: copies, p_grader: grader, p_service: service }, ['binder'])
    setBusy(null)
    if (res) {
      setGrading(res.grading)
      setPicked([])
      sfx('coin')
      toast('success', T.submitted(chosen.length, company?.name ?? grader.toUpperCase()))
      onSent()
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Panel tour="grading-copies" title={T.copiesTitle} tip={T.copiesTip}>
        {d.copies.length === 0 ? (
          <EmptyState icon="card" title={T.copiesEmpty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {d.copies.map((c) => {
              const card = cardById.get(c.card_id)
              const on = picked.includes(c.copy_id)
              const r = c.ranges
              const lo = r ? Math.min(...ASPECTS.map((a) => r[a][0])) : 0
              const hi = r ? Math.min(...ASPECTS.map((a) => r[a][1])) : 0
              return (
                <li
                  key={c.copy_id}
                  className={clsx(
                    'flex flex-wrap items-center gap-3 rounded-xl p-3',
                    on ? 'bg-surface-3 outline-2 -outline-offset-2 outline-accent' : 'bg-surface-2',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(c.copy_id)}
                    aria-label={T.select(card?.name ?? c.card_id)}
                    className="size-5 accent-accent"
                  />
                  <Card id={c.card_id} scale={1} />
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold">{card?.name}</p>
                    <p className="text-xs">
                      <span className={TIER_TEXT[(card?.tier ?? 'common') as Tier]}>
                        {TIER_LABEL[(card?.tier ?? 'common') as Tier]}
                      </span>
                      <span className="nums ml-2 text-gold">{formatMoney(c.value_cents)}</span>
                    </p>
                    {r ? (
                      <p className="mt-1 text-sm font-semibold text-accent">{T.expected(lo, hi)}</p>
                    ) : (
                      <p className="mt-1 text-sm text-fg-3">{T.notInspected}</p>
                    )}
                  </div>
                  {r && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {ASPECTS.map((a) => (
                        <div key={a} className="flex items-center gap-2">
                          <dt className="w-20 text-fg-3">{T.aspects[a]}</dt>
                          <dd className="flex items-center gap-1.5">
                            <RangeBar range={r[a]} />
                            <span className="nums font-semibold">
                              {r[a][0] === r[a][1] ? r[a][0] : `${r[a][0]}–${r[a][1]}`}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {(!r || r.width > d.width) && (
                    <Button
                      size="sm"
                      loading={busy === c.copy_id}
                      disabled={busy !== null}
                      onClick={() => void inspect(c.copy_id)}
                    >
                      <PixelIcon name="loupe" /> {r ? T.reinspect : T.inspect}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel tour="grading-grader" title={T.graderTitle} tip={T.graderTip} className="self-start xl:sticky xl:top-4">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={T.graderTitle}>
          {GRADERS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={grader === g}
              onClick={() => setGrader(g)}
              className={clsx(
                'rounded-xl p-3 text-left outline-2 -outline-offset-2 transition-colors',
                grader === g
                  ? 'bg-surface-3 outline-accent'
                  : 'bg-surface-2 outline-transparent hover:bg-surface-3',
              )}
            >
              <span className="flex items-center justify-between font-bold">
                {g.toUpperCase()}
                <span className="text-xs font-semibold text-fg-3">
                  {T.brand(d.graders[g].brand_bps / 100)}
                </span>
              </span>
              <span className="mt-1 block text-xs text-fg-2">{T.graders[g]}</span>
            </button>
          ))}
          {companies.length > 0 && (
            <CompanyOptions
              companies={companies}
              grader={grader}
              onPick={(g) => {
                setGrader(g)
                if (!companies.find((c) => `co:${c.id}` === g)?.services.some((x) => x.service === service))
                  setService('economy')
              }}
            />
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={T.graderTitle}>
          {SERVICES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={service === s}
              disabled={!offer(s)}
              onClick={() => setService(s)}
              className={clsx(
                'flex flex-col items-center rounded-xl p-2 text-center outline-2 -outline-offset-2 transition-colors disabled:opacity-40',
                service === s
                  ? 'bg-surface-3 outline-accent'
                  : 'bg-surface-2 outline-transparent enabled:hover:bg-surface-3',
              )}
            >
              <span className="text-sm font-semibold">{T.services[s]}</span>
              <span className="nums text-xs text-gold">
                {offer(s) ? formatMoney(offer(s)!.fee_cents) : '–'}
              </span>
              <span className="nums text-xs text-fg-3">
                {offer(s) ? formatDuration(offer(s)!.minutes * 60) : ''}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-fg-3">
          {formatMoney(fee)} {T.perCard}
          {!company && (
            <>
              {' '}
              ·{' '}
              {T.upcharge(
                String(d.graders[grader as GraderId].upcharge_bps / 100).replace('.', ','),
                formatMoney(d.upcharge_from_cents),
              )}
            </>
          )}
        </p>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-fg-2">
            {T.total} · {T.selected(chosen.length)}
          </span>
          <span className="nums text-xl font-bold text-gold">{formatMoney(total)}</span>
        </div>
        <Button
          variant="primary"
          className="mt-3 w-full"
          loading={busy === 'send'}
          disabled={chosen.length === 0 || chosen.length > free || busy !== null}
          onClick={() => void send()}
        >
          {T.submit(Math.max(1, chosen.length))}
        </Button>
        {chosen.length === 0 ? (
          <p className="mt-2 text-xs text-fg-3">{T.noneSelected}</p>
        ) : free <= 0 ? (
          <p className="mt-2 text-xs text-warn">{T.slotsFull}</p>
        ) : chosen.length > free ? (
          <p className="mt-2 text-xs text-warn">{T.tooMany(free)}</p>
        ) : null}
      </Panel>
    </div>
  )
}

/** Ten cells for grades 1–10, the possible range lit. */
function RangeBar({ range }: { range: [number, number] }) {
  return (
    <span className="flex gap-px" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i
          key={i}
          className={clsx(
            'h-2.5 w-1.5 rounded-[1px]',
            i + 1 >= range[0] && i + 1 <= range[1] ? 'bg-accent' : 'bg-surface-3',
          )}
        />
      ))}
    </span>
  )
}

// ----------------------------------------------------------------------------------------------
// Beim Grader
// ----------------------------------------------------------------------------------------------
function OrdersTab({ d, now }: { d: Grading; now: number }) {
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => rpc('companies_list') }).data ?? []
  const companyNames = new Map(companies.map((c) => [`co:${c.id}`, c.name]))
  const act = useAct()
  const setGrading = useSetGrading()
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<GradeResult[] | null>(null)
  const ready = d.orders.filter((o) => now > 0 && Date.parse(o.due_at) <= now)

  const reveal = async (ids: number[]) => {
    setBusy(true)
    const res = await act('grading_reveal', { p_orders: ids }, ['binder', 'stats', 'goals'])
    setBusy(false)
    if (res) {
      setGrading(res.grading)
      setResults(res.results)
    }
  }

  return (
    <Panel title={T.tabs.orders} tip={T.ordersTip}>
      {results && <GradeReveal results={results} onClose={() => setResults(null)} />}
      {d.orders.length === 0 ? (
        <EmptyState icon="clock" title={T.ordersEmpty} />
      ) : (
        <>
          {ready.length > 1 && (
            <Button
              variant="primary"
              className="mb-3"
              loading={busy}
              onClick={() => void reveal(ready.map((o) => o.id))}
            >
              {T.revealAll(ready.length)}
            </Button>
          )}
          <ul className="grid gap-2 md:grid-cols-2">
            {d.orders.map((o) => {
              const left = Math.max(0, (Date.parse(o.due_at) - now) / 1000)
              const isReady = now > 0 && left === 0
              return (
                <li key={o.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <Card id={o.card_id} scale={1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cardName(o.card_id)}</p>
                    <p className="text-xs text-fg-2">
                      {graderName(o.grader, companyNames.get(o.grader))} · {T.services[o.service]} ·{' '}
                      <span className="nums">{formatMoney(o.fee_cents)}</span>
                    </p>
                    <p
                      className={clsx('nums mt-1 text-sm font-semibold', isReady ? 'text-gain' : 'text-fg-2')}
                    >
                      {isReady ? T.arrived : T.backIn(formatDuration(left))}
                    </p>
                  </div>
                  {isReady && (
                    <Button size="sm" variant="primary" loading={busy} onClick={() => void reveal([o.id])}>
                      {T.reveal}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Panel>
  )
}

// ----------------------------------------------------------------------------------------------
// Deine Slabs
// ----------------------------------------------------------------------------------------------
function SlabsTab({ d }: { d: Grading }) {
  const act = useAct()
  const setGrading = useSetGrading()
  const [crack, setCrack] = useState<Grading['slabs'][number] | null>(null)
  const [busy, setBusy] = useState(false)

  const doCrack = async () => {
    if (!crack) return
    setBusy(true)
    const res = await act('slab_crack', { p_copy: crack.copy_id }, ['binder'])
    setBusy(false)
    setCrack(null)
    if (res) {
      setGrading(res.grading)
      sfx(res.damaged ? 'error' : 'tear')
      toast(res.damaged ? 'info' : 'success', res.damaged ? T.crackedDamaged : T.cracked)
    }
  }

  return (
    <Panel tour="grading-slabs" title={T.tabs.slabs} tip={T.slabsTip}>
      {crack && (
        <Dialog
          open
          onOpenChange={(o) => !o && setCrack(null)}
          title={T.crackTitle}
          description={`${cardName(crack.card_id)} · ${slabName(crack.slab)}`}
        >
          <p className="text-sm text-fg-2">{T.crackText}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setCrack(null)}>{texts.common.cancel}</Button>
            <Button variant="danger" loading={busy} onClick={() => void doCrack()}>
              {T.crackConfirm}
            </Button>
          </div>
        </Dialog>
      )}
      {d.slabs.length === 0 ? (
        <EmptyState icon="slab" title={T.slabsEmpty} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
          {d.slabs.map((s) => (
            <li key={s.copy_id} className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 p-3">
              <SlabOf cardId={s.card_id} slab={s.slab} scale={2} />
              <p className="nums text-lg font-bold text-gold">{formatMoney(s.value_cents)}</p>
              <p className="nums text-xs text-fg-3">
                {T.raw} {formatMoney(s.raw_cents)} · {formatFactor(s.value_cents / Math.max(1, s.raw_cents))}
              </p>
              <p className="nums text-xs text-fg-2">{T.pop(s.slab.pop, s.slab.pop_higher)}</p>
              {s.location !== 'inventory' ? (
                <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs text-fg-2">
                  {T.where[s.location] ?? s.location}
                </span>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to={`/cardmarket/${s.card_id}`}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    {T.sell}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCrack(s)}
                    className="text-sm font-semibold text-fg-3 hover:text-loss"
                  >
                    {T.crack}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// ----------------------------------------------------------------------------------------------
// Pop Report
// ----------------------------------------------------------------------------------------------
function PopTab({ initial }: { initial: string | null }) {
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<string | null>(initial)
  const pop = useQuery({
    queryKey: ['pop', card],
    queryFn: () => rpc('pop_report_get', { p_card: card! }),
    enabled: card !== null,
  })
  const matches = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (s.length < 2) return []
    return [...cardById.values()].filter((c) => c.name.toLowerCase().includes(s)).slice(0, 8)
  }, [search])

  return (
    <Panel title={T.popTitle} tip={T.popTip}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={T.popSearch}
        aria-label={T.popSearch}
        className="panel-inset mb-3 h-10 w-full max-w-md bg-transparent px-3 text-sm placeholder:text-fg-3"
      />
      {matches.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCard(c.id)
                setSearch('')
              }}
              className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-surface-3"
            >
              {c.name} <span className="text-xs text-fg-3">#{String(c.no).padStart(3, '0')}</span>
            </button>
          ))}
        </div>
      )}
      {!card ? (
        <EmptyState icon="search" title={T.popPick} />
      ) : pop.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : pop.isError ? (
        <ErrorState message={errorText(pop.error)} onRetry={() => void pop.refetch()} />
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <Card id={card} scale={2} />
          <div className="min-w-60 flex-1">
            <p className="text-lg font-bold">{cardName(card)}</p>
            <p className="nums mb-3 text-sm text-fg-2">
              {T.popRaw(formatMoney(pop.data.value_cents))} · {T.popMine(pop.data.mine)}
            </p>
            {pop.data.rows.length === 0 ? (
              <p className="text-sm text-fg-3">{T.popNone}</p>
            ) : (
              <table className="w-full max-w-md text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-3">
                    <th className="pb-2 font-semibold">{T.popCols.grade}</th>
                    <th className="pb-2 text-right font-semibold">{T.popCols.count}</th>
                    <th className="pb-2 text-right font-semibold">
                      <span className="inline-flex items-center gap-1">
                        {T.popCols.value} <InfoTip>{T.slabsTip}</InfoTip>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pop.data.rows.map((r) => (
                    <tr key={`${r.grader}-${r.grade}-${r.black_label}`} className="border-t border-line">
                      <td className="py-2 font-semibold">{slabName(r)}</td>
                      <td className="nums py-2 text-right">{r.n}</td>
                      <td className="nums py-2 text-right text-gold">{formatMoney(r.value_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
