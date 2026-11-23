import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, TiltCard } from '@/components/cards/Card.tsx'
import { SlabOf, slabName } from '@/components/cards/Slab.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useBinder, useCosmetics } from '@/lib/actions.ts'
import { SetGoals } from './Goals.tsx'
import { cardById, HIT_TIERS, SETS, TIER_LABEL, TIER_TEXT, TIERS, UNLOCKS, type Tier } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { BinderCard } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { PriceChart } from '@/features/market/PriceChart.tsx'
import { duplicateStacks } from './sellDupes.ts'

const T = texts.collection
type Filter = 'all' | 'owned' | 'missing'
const NONE: BinderCard[] = []

export function CollectionPage() {
  const [setId, setSetId] = useState(SETS[0]!.id)
  const set = SETS.find((s) => s.id === setId) ?? SETS[0]!
  const binder = useBinder(set.id)
  const look = useCosmetics().data?.style
  const act = useAct()
  const [filter, setFilter] = useState<Filter>('all')
  const [tier, setTier] = useState<Tier | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [selling, setSelling] = useState(false)

  const cards = binder.data?.cards ?? NONE
  const owned = cards.filter((c) => c.qty > 0)
  // Slabs count with their own value, everything else at Marktwert.
  const value = owned.reduce((s, c) => s + c.value_cents * (c.qty - c.slabs.length) + c.slabs.reduce((t, x) => t + x.value_cents, 0), 0)
  const shown = useMemo(
    () =>
      cards.filter(
        (c) =>
          (filter === 'all' || (filter === 'owned' ? c.qty > 0 : c.qty === 0)) &&
          (!tier || cardById.get(c.card_id)?.tier === tier),
      ),
    [cards, filter, tier],
  )
  const dupes = duplicateStacks(cards)
  const selected = cards.find((c) => c.card_id === open)

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
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label={T.sets}>
        {SETS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === set.id}
            onClick={() => {
              setSetId(s.id)
              setTier(null)
            }}
            className={clsx('rounded-lg px-4 py-2 text-sm font-semibold', s.id === set.id ? 'bg-grad text-white' : 'text-fg-2 hover:text-fg')}
          >
            {texts.games[s.game]}
            <span className="ml-1.5 font-normal opacity-80">{s.name}</span>
          </button>
        ))}
      </div>
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-56">
            <p className="flex items-center gap-1 text-sm text-fg-3">
              {set.name} · {T.progress} <InfoTip>{T.progressTip}</InfoTip>
            </p>
            <p className="nums text-3xl font-bold tracking-tight">
              {owned.length} <span className="text-fg-3">/ {set.size}</span>
            </p>
            <Progress value={owned.length / set.size} tone="gold" className="mt-1" label={T.progress} />
          </div>
          <div>
            <p className="flex items-center gap-1 text-sm text-fg-3">
              {T.value} <InfoTip>{T.valueTip}</InfoTip>
            </p>
            <p className="nums text-3xl font-bold tracking-tight text-gold">{formatMoney(value)}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button onClick={sellDupes} loading={selling} disabled={dupes.length === 0}>
              {texts.shop.sellDupes} ({dupes.reduce((s, d) => s + d.qty, 0)})
            </Button>
            <InfoTip>{texts.shop.ankaufBody}</InfoTip>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['all', 'owned', 'missing'] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? T.filterAll : f === 'owned' ? T.filterOwned : T.filterMissing}
            </Chip>
          ))}
          <span className="mx-1 w-px bg-line" />
          {TIERS.map((t) => (
            <Chip key={t} active={tier === t} onClick={() => setTier(tier === t ? null : t)} className={TIER_TEXT[t]}>
              {TIER_LABEL[t]}
            </Chip>
          ))}
        </div>
      </Panel>

      {binder.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : binder.isError ? (
        <ErrorState message={errorText(binder.error)} onRetry={() => void binder.refetch()} />
      ) : (
        <div className={clsx('grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-3 gap-y-5', look?.binder)}>
          {shown.map((c) => (
            <Slot key={c.card_id} card={c} sleeve={look?.sleeve} onOpen={() => setOpen(c.card_id)} />
          ))}
        </div>
      )}

      <SetGoals setId={set.id} />

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
    <button type="button" onClick={onOpen} className="group flex flex-col items-center gap-1 text-left">
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
              <Button onClick={() => sell(false)} loading={busy}>
                {T.sellOne}
              </Button>
              {sellable > 1 && (
                <Button variant="danger" onClick={() => sell(true)} disabled={busy}>
                  {T.sellAll}
                </Button>
              )}
            </div>
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
