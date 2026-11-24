import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Card, TiltCard } from '@/components/cards/Card.tsx'
import { SlabOf, slabName } from '@/components/cards/Slab.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useCosmetics } from '@/lib/actions.ts'
import { SetGoals } from './Goals.tsx'
import { cardById, HIT_TIERS, SETS, TIER_LABEL, TIER_TEXT, TIERS, tierRank, UNLOCKS, type Game, type Tier } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { BinderCard } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { PriceChart } from '@/features/market/PriceChart.tsx'
import { duplicateStacks } from './sellDupes.ts'

const T = texts.collection
type Owned = 'all' | 'owned' | 'missing'
type SortKey = 'value' | 'number' | 'name' | 'rarity' | 'qty'
const SORTS: readonly SortKey[] = ['value', 'number', 'name', 'rarity', 'qty']
/** Cards drawn at once; "Mehr zeigen" adds the next batch. */
const PAGE = 120
const GAME_LIST = [...new Set(SETS.map((s) => s.game))]
const setIndex = new Map(SETS.map((s, i) => [s.id, i]))
const setOfCardId = new Map(SETS.flatMap((s) => s.cards.map((c) => [c.id, s] as const)))
const tierOf = (c: BinderCard) => cardById.get(c.card_id)?.tier ?? 'common'

/** One binder query per set (the keys other pages refresh), merged into one collection. Stable, so it memoizes. */
const mergeBinders = (rs: { data?: { cards: BinderCard[] }; isPending: boolean; error: Error | null; refetch: () => unknown }[]) => ({
  cards: rs.flatMap((r) => r.data?.cards ?? []),
  pending: rs.some((r) => r.isPending),
  error: rs.find((r) => r.error)?.error ?? null,
  refetch: () => rs.forEach((r) => void r.refetch()),
})

const ORDER: Record<SortKey, (a: BinderCard, b: BinderCard) => number> = {
  value: (a, b) => b.value_cents - a.value_cents,
  number: (a, b) =>
    (setIndex.get(setOfCardId.get(a.card_id)?.id ?? '') ?? 0) - (setIndex.get(setOfCardId.get(b.card_id)?.id ?? '') ?? 0) ||
    (cardById.get(a.card_id)?.no ?? 0) - (cardById.get(b.card_id)?.no ?? 0),
  name: (a, b) => (cardById.get(a.card_id)?.name ?? '').localeCompare(cardById.get(b.card_id)?.name ?? '', 'de'),
  rarity: (a, b) => tierRank(tierOf(b)) - tierRank(tierOf(a)) || b.value_cents - a.value_cents,
  qty: (a, b) => b.qty - a.qty || b.value_cents - a.value_cents,
}

export function CollectionPage() {
  const binder = useQueries({
    queries: SETS.map((s) => ({ queryKey: ['binder', s.id], queryFn: () => rpc('binder_get', { p_set: s.id }) })),
    combine: mergeBinders,
  })
  const look = useCosmetics().data?.style
  const act = useAct()
  const [game, setGame] = useState<Game | 'all'>('all')
  const [setId, setSetId] = useState('all')
  const [owned, setOwned] = useState<Owned>('owned')
  const [tier, setTier] = useState<Tier | null>(null)
  const [sort, setSort] = useState<SortKey>('value')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [selling, setSelling] = useState(false)
  // more cards per click; a new filter starts at the first batch again
  const filters = [game, setId, owned, tier, sort, search].join('|')
  const [page, setPage] = useState({ filters, n: PAGE })
  const limit = page.filters === filters ? page.n : PAGE

  const sets = SETS.filter((s) => game === 'all' || s.game === game)
  // game and set narrow the collection: progress, value, duplicates and goals follow them
  const scoped = useMemo(
    () =>
      binder.cards.filter((c) => {
        const s = setOfCardId.get(c.card_id)
        return !!s && (game === 'all' || s.game === game) && (setId === 'all' || s.id === setId)
      }),
    [binder.cards, game, setId],
  )
  const ownedCards = scoped.filter((c) => c.qty > 0)
  // Slabs count with their own value, everything else at Marktwert.
  const value = ownedCards.reduce((s, c) => s + c.value_cents * (c.qty - c.slabs.length) + c.slabs.reduce((t, x) => t + x.value_cents, 0), 0)
  const tiers = TIERS.filter((t) => scoped.some((c) => tierOf(c) === t))
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scoped
      .filter(
        (c) =>
          (owned === 'all' || (owned === 'owned' ? c.qty > 0 : c.qty === 0)) &&
          (!tier || tierOf(c) === tier) &&
          (!q || (cardById.get(c.card_id)?.name ?? '').toLowerCase().includes(q)),
      )
      .sort(ORDER[sort])
  }, [scoped, owned, tier, search, sort])
  const dupes = duplicateStacks(scoped)
  const selected = binder.cards.find((c) => c.card_id === open)

  const sellDupes = async () => {
    setSelling(true)
    const res = await act('ankauf_sell', { p_stacks: dupes, p_copies: [] }, ['binder'])
    setSelling(false)
    if (res) {
      sfx('coin')
      toast('success', texts.shop.sold(res.sold, formatMoney(res.payout_cents)))
    }
  }

  return (
    <Page icon="binder" title={T.title} subtitle={T.subtitle}>
      <AtticHint />
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-56">
            <p className="flex items-center gap-1 text-sm text-fg-3">
              {T.progress} <InfoTip>{T.progressTip}</InfoTip>
            </p>
            <p className="nums text-3xl font-bold tracking-tight">
              {ownedCards.length} <span className="text-fg-3">/ {scoped.length}</span>
            </p>
            <Progress value={ownedCards.length / Math.max(1, scoped.length)} tone="gold" className="mt-1" label={T.progress} />
          </div>
          <div>
            <p className="flex items-center gap-1 text-sm text-fg-3">
              {T.value} <InfoTip>{T.valueTip}</InfoTip>
            </p>
            <p className="nums text-3xl font-bold tracking-tight text-gold">{formatMoney(value)}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button onClick={sellDupes} loading={selling} disabled={dupes.length === 0} data-tour="sell-dupes">
              {texts.shop.sellDupes} ({dupes.reduce((s, d) => s + d.qty, 0)})
            </Button>
            <InfoTip>{texts.shop.ankaufBody}</InfoTip>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={T.filterGame}>
          <Chip active={game === 'all'} onClick={() => (setGame('all'), setSetId('all'))}>
            {T.allGames}
          </Chip>
          {GAME_LIST.map((g) => (
            <Chip key={g} active={game === g} onClick={() => (setGame(g), setSetId('all'))}>
              {texts.games[g]}
            </Chip>
          ))}
          {sets.length > 1 && (
            <select value={setId} onChange={(e) => setSetId(e.target.value)} aria-label={T.filterSet} className="panel-inset h-8 rounded-lg bg-transparent px-2 text-sm font-semibold">
              <option value="all">{T.allSets}</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {game === 'all' ? `${texts.games[s.game]} · ${s.name}` : s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(['owned', 'missing', 'all'] as const).map((f) => (
            <Chip key={f} active={owned === f} onClick={() => setOwned(f)}>
              {f === 'all' ? T.filterAll : f === 'owned' ? T.filterOwned : T.filterMissing}
            </Chip>
          ))}
          <span className="mx-1 h-6 w-px bg-line" />
          {tiers.map((t) => (
            <Chip key={t} active={tier === t} onClick={() => setTier(tier === t ? null : t)} className={TIER_TEXT[t]}>
              {TIER_LABEL[t]}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.search}
            aria-label={T.search}
            className="panel-inset h-8 w-56 rounded-lg bg-transparent px-3 text-sm"
          />
          <label className="ml-auto flex items-center gap-2 text-sm text-fg-2">
            {T.sortLabel}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="panel-inset h-8 rounded-lg bg-transparent px-2 text-sm font-semibold">
              {SORTS.map((k) => (
                <option key={k} value={k}>
                  {T.sorts[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {binder.pending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : binder.error ? (
        <ErrorState message={errorText(binder.error)} onRetry={binder.refetch} />
      ) : shown.length === 0 ? (
        <EmptyState icon="binder" title={T.empty} />
      ) : (
        <>
          <p className="nums mb-3 text-sm text-fg-3">{T.count(shown.length)}</p>
          <div className={clsx('grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-3 gap-y-5', look?.binder)}>
            {shown.slice(0, limit).map((c) => (
              <Slot key={c.card_id} card={c} sleeve={look?.sleeve} onOpen={() => setOpen(c.card_id)} />
            ))}
          </div>
          {shown.length > limit && (
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setPage({ filters, n: limit + PAGE })}>{T.more(Math.min(PAGE, shown.length - limit))}</Button>
            </div>
          )}
        </>
      )}

      <SetGoals setIds={sets.filter((s) => setId === 'all' || s.id === setId).map((s) => s.id)} />

      {selected && <CardDialog card={selected} onClose={() => setOpen(null)} />}
    </Page>
  )
}

function Chip({ active, onClick, className, children }: { active: boolean; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx('toggle')
        onClick()
      }}
      className={clsx(
        'h-8 rounded-lg px-3 text-sm font-semibold outline-2 -outline-offset-2',
        active ? 'bg-surface-3 outline-accent' : 'bg-surface-2 outline-line hover:bg-surface-3',
        className,
      )}
    >
      {children}
    </button>
  )
}

function Slot({ card, sleeve, onOpen }: { card: BinderCard; sleeve?: string; onOpen: () => void }) {
  const data = cardById.get(card.card_id)
  const has = card.qty > 0
  return (
    <button type="button" onClick={onOpen} className="group flex flex-col items-center gap-1 text-left" data-tour={has ? 'binder-card' : undefined}>
      <div className="relative transition-transform duration-150 group-hover:-translate-y-1">
        <span className={clsx('block', has && sleeve)}>
          <Card id={card.card_id} scale={2} dim={!has} foil={has ? 'auto' : 'none'} />
        </span>
        {!has && (
          <span className="absolute inset-0 grid place-items-center font-pixel text-2xl text-fg-3">
            #{String(data?.no ?? 0).padStart(3, '0')}
          </span>
        )}
        {card.qty > 1 && <span className="nums absolute top-1 right-1 rounded-md bg-ink/85 px-1.5 font-pixel text-sm">×{card.qty}</span>}
      </div>
      <span className="w-40 truncate text-center text-xs text-fg-2">{data?.name}</span>
      <span className="nums text-xs font-semibold text-gold">{formatMoney(card.value_cents)}</span>
    </button>
  )
}

function CardDialog({ card, onClose }: { card: BinderCard; onClose: () => void }) {
  const act = useAct()
  const navigate = useNavigate()
  const level = useMe().data?.player?.level ?? 0
  const data = cardById.get(card.card_id)!
  const [busy, setBusy] = useState(false)
  const hit = HIT_TIERS.has(data.tier)
  // What the Kartenladen can buy: raw copies of a hit, the whole stack otherwise (slabs never).
  const sellable = hit ? card.copies.length : card.qty

  const inspectBulk = async () => {
    setBusy(true)
    const res = await act('grading_inspect', { p_copy: null, p_card: card.card_id }, ['binder', 'grading'])
    setBusy(false)
    if (res) {
      toast('success', texts.grading.bulkDone)
      void navigate('/grading')
    }
  }

  const sell = async (all: boolean) => {
    setBusy(true)
    const n = all ? card.qty : 1
    const args = hit
      ? { p_stacks: [], p_copies: all ? card.copies : card.copies.slice(-1) }
      : { p_stacks: [{ card_id: card.card_id, qty: n }], p_copies: [] }
    const res = await act('ankauf_sell', args, ['binder'])
    setBusy(false)
    if (res) {
      sfx('coin')
      toast('success', texts.shop.sold(res.sold, formatMoney(res.payout_cents)))
      if (all) onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={data.name} description={`#${String(data.no).padStart(3, '0')} · ${data.en}`}>
      <div className="flex flex-wrap gap-5">
        <TiltCard>
          <Card id={card.card_id} scale={3} dim={card.qty === 0} />
        </TiltCard>
        <dl className="flex min-w-40 flex-1 flex-col gap-2 text-sm">
          <div>
            <dt className="text-fg-3">Tier</dt>
            <dd className={clsx('font-pixel text-xl', TIER_TEXT[data.tier])}>{TIER_LABEL[data.tier]}</dd>
          </div>
          <div>
            <dt className="text-fg-3">{T.cardValue}</dt>
            <dd className="nums text-xl font-bold text-gold">{formatMoney(card.value_cents)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-fg-3">
              {T.ankaufPrice} <InfoTip>{T.sellOneTip}</InfoTip>
            </dt>
            <dd className="nums font-semibold">{formatMoney(card.ankauf_cents)}</dd>
          </div>
          <div>
            <dd className="text-fg-2">{card.qty > 0 ? T.owned(card.qty) : card.discovered ? T.seen : T.never}</dd>
          </div>
          {sellable > 0 && (
            <div className="mt-auto flex flex-wrap gap-2">
              <Button onClick={() => sell(false)} loading={busy} data-tour="sell-one">
                {T.sellOne}
              </Button>
              {sellable > 1 && (
                <Button variant="danger" onClick={() => sell(true)} disabled={busy}>
                  {T.sellAll}
                </Button>
              )}
            </div>
          )}
          {level >= UNLOCKS.cardmarket && sellable > 0 && (
            <Link to={`/cardmarket/${card.card_id}?sell=1`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              <PixelIcon name="market" /> {T.toCardmarket}
            </Link>
          )}
          {level >= UNLOCKS.grading && sellable > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {hit ? (
                <Link to="/grading" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                  <PixelIcon name="loupe" /> {T.toGrading}
                </Link>
              ) : (
                <>
                  <Button size="sm" onClick={() => void inspectBulk()} disabled={busy}>
                    <PixelIcon name="loupe" /> {texts.grading.bulkInspect}
                  </Button>
                  <InfoTip>{texts.grading.bulkInspectTip}</InfoTip>
                </>
              )}
            </div>
          )}
        </dl>
      </div>
      {card.slabs.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">{T.slabs}</p>
          <ul className="flex flex-wrap gap-3">
            {card.slabs.map((s) => (
              <li key={s.copy_id} className="flex flex-col items-center gap-1">
                <SlabOf cardId={card.card_id} slab={s.slab} scale={1} />
                <span className="text-xs font-bold">{slabName(s.slab)}</span>
                <span className="nums text-xs font-semibold text-gold">{formatMoney(s.value_cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5">
        <PriceChart itemId={card.card_id} />
      </div>
    </Dialog>
  )
}

/** After an exit: what still waits on Omas Dachboden. */
function AtticHint() {
  const prestiged = (useMe().data?.player?.prestige ?? 0) > 0
  const q = useQuery({ queryKey: ['prestige'], queryFn: () => rpc('prestige_get'), enabled: prestiged })
  const n = q.data ? q.data.attic.copies.length + q.data.attic.items.reduce((s, i) => s + i.qty, 0) : 0
  if (!prestiged || n === 0) return null
  return (
    <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-gold/10 px-3 py-2 text-sm">
      <PixelIcon name="house" className="text-gold" />
      <span className="flex-1">{texts.prestige.atticHint(n)}</span>
      <Link to="/prestige" className="font-semibold text-accent hover:underline">
        {texts.prestige.atticLink}
      </Link>
    </p>
  )
}
