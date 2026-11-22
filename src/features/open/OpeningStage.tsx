// The pack opening: tear, reveal, suspense on hits, summary. The server has already booked every card;
// this component only replays the result, so it can be skipped or closed at any moment.
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardBack, TiltCard } from '@/components/cards/Card.tsx'
import { spriteStyle, useSpriteAtlas } from '@/components/pixel/atlas.ts'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName, gameOf, HIT_TIERS, productById, TIER_LABEL, TIER_TEXT, tierRank, type Tier } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { hash01 } from '@/lib/pure.ts'
import type { PackOpen, PulledCard } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx, type SfxName } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { useWorld } from '@/lib/world.ts'

const T = texts.open
type Phase = 'sealed' | 'tearing' | 'cards' | 'summary'

/** Suspense before a hit flips, in ms. */
const CHARGE: Partial<Record<Tier, number>> = { holo: 500, alternative: 900, ultra: 1500, grail: 2600 }
const GLOW: Partial<Record<Tier, string>> = {
  holo: 'var(--color-tier-holo)',
  alternative: 'var(--color-tier-alternative)',
  ultra: 'var(--color-tier-ultra)',
  grail: 'var(--color-tier-grail)',
}

export function OpeningStage({
  result,
  productId,
  onClose,
  onAgain,
  canAgain,
}: {
  result: PackOpen
  productId: string
  onClose: () => void
  onAgain: () => void
  canAgain: boolean
}) {
  const instant = useSettings((s) => s.instantReveal)
  const multi = result.packs.length > 1
  const [packIdx, setPackIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>(instant ? 'summary' : 'sealed')
  const [shown, setShown] = useState(0) // cards of the current pack that are face up
  const [charging, setCharging] = useState(false)
  const [burst, setBurst] = useState<{ tier: Tier; key: number } | null>(null)
  const chat = useChat(gameOf(productId))
  const pack = result.packs[packIdx]!

  // Level-up celebrations wait until the stage is closed.
  useEffect(() => {
    useWorld.getState().apply({ stageOpen: true })
    return () => useWorld.getState().apply({ stageOpen: false })
  }, [])
  const cards = pack.cards

  const celebrate = useCallback(
    (card: PulledCard) => {
      const tier = card.tier as Tier
      const sound: SfxName = HIT_TIERS.has(tier) ? (tier as SfxName) : tier === 'rare' ? 'rare' : 'flip'
      sfx(sound)
      if (card.new) setTimeout(() => sfx('newcard'), 120)
      if (HIT_TIERS.has(tier)) setBurst({ tier, key: Date.now() })
      chat.react(tier)
    },
    [chat],
  )

  // Instant mode still gives the best Ultra/Grail its moment, once.
  useEffect(() => {
    if (!instant) return
    const best = bestOf(result.packs.flatMap((p) => p.cards))
    if (!best || tierRank(best.tier) < tierRank('ultra')) return
    const t = setTimeout(() => celebrate(best), 0)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on mount

  const tear = useCallback(() => {
    setPhase('tearing')
    sfx('tear')
    chat.react('start')
    setTimeout(() => {
      setPhase('cards')
      // Several packs: the bulk is dealt at once, only the hit slot keeps its suspense.
      if (multi) {
        const bulk = cards.length - 1
        setShown(bulk)
        sfx('flip')
        const best = bestOf(cards.slice(0, bulk))
        if (best && HIT_TIERS.has(best.tier)) celebrate(best)
      }
    }, 520)
  }, [cards, multi, celebrate, chat])

  const revealNext = useCallback(() => {
    if (charging) return
    const next = cards[shown]
    if (!next) return
    const tier = next.tier as Tier
    const wait = shown === cards.length - 1 ? CHARGE[tier] : undefined
    if (wait) {
      setCharging(true)
      sfx('charge')
      chat.react('charge')
      setTimeout(() => {
        setCharging(false)
        setShown((n) => n + 1)
        celebrate(next)
      }, wait)
      return
    }
    setShown((n) => n + 1)
    celebrate(next)
  }, [cards, shown, charging, celebrate, chat])

  const nextPack = useCallback(() => {
    if (packIdx + 1 < result.packs.length) {
      setPackIdx(packIdx + 1)
      setShown(0)
      setPhase('sealed')
    } else {
      setPhase('summary')
    }
  }, [packIdx, result.packs.length])

  const revealAll = () => {
    setShown(cards.length)
    const best = bestOf(cards.slice(shown))
    if (best) celebrate(best)
  }

  const advance = useCallback(() => {
    if (phase === 'sealed') tear()
    else if (phase === 'cards') {
      if (shown < cards.length) revealNext()
      else nextPack()
    }
  }, [phase, shown, cards.length, tear, revealNext, nextPack])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        advance()
      } else if (e.key === 'Escape') {
        if (phase === 'summary') onClose()
        else setPhase('summary')
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [advance, phase, onClose])

  const current = shown > 0 ? cards[shown - 1] : undefined
  const upcoming = cards[shown]
  const packDone = phase === 'cards' && shown >= cards.length

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[1fr_17rem] bg-ink/85 backdrop-blur-xl max-lg:grid-cols-1" role="dialog" aria-label={T.title}>
      <div className="relative flex min-h-0 flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-6 pt-4">
          <p className="font-pixel text-xl">{productById.get(productId)?.name}</p>
          {multi && phase !== 'summary' && <span className="text-sm text-fg-3">{T.packOf(packIdx + 1, result.packs.length)}</span>}
          <div className="ml-auto flex gap-2">
            {phase !== 'summary' && (
              <Button size="sm" onClick={() => setPhase('summary')}>
                {T.toSummary}
              </Button>
            )}
            <Button size="sm" onClick={onClose} aria-label={texts.common.close}>
              <PixelIcon name="close" />
            </Button>
          </div>
        </header>

        {phase === 'summary' ? (
          <Summary result={result} productId={productId} onClose={onClose} onAgain={onAgain} canAgain={canAgain} />
        ) : (
          <div className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 select-none" onClick={advance}>
            {burst && <Burst key={burst.key} tier={burst.tier} />}
            {(phase === 'sealed' || phase === 'tearing') && <Pack productId={productId} index={packIdx} tearing={phase === 'tearing'} />}

            {phase === 'cards' && (
              <>
                <div className="relative grid place-items-center" style={{ minHeight: 336 }}>
                  {charging && upcoming ? (
                    <div className="relative anim-rattle" style={{ '--amp': upcoming.tier === 'grail' ? '7px' : '4px' } as React.CSSProperties}>
                      <div className="glow" style={{ '--glow': GLOW[upcoming.tier as Tier] } as React.CSSProperties} />
                      <CardBack scale={3} className={clsx(upcoming.tier === 'grail' && 'anim-heartbeat')} />
                    </div>
                  ) : packDone || multi ? (
                    <BigCard card={multi ? (bestOf(cards.slice(0, shown)) ?? cards[0]!) : cards[cards.length - 1]!} />
                  ) : current ? (
                    <BigCard key={shown} card={current} />
                  ) : (
                    <CardBack scale={3} className="anim-deal" />
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 px-4">
                  {cards.map((c, i) =>
                    i < shown ? (
                      <div key={i} className="relative anim-deal" style={{ animationDelay: multi ? `${i * 35}ms` : '0ms' }}>
                        <Card id={c.card_id} scale={1} foil="sweep" />
                        {c.new && <NewBadge small />}
                      </div>
                    ) : (
                      <CardBack key={i} scale={1} className="opacity-40" />
                    ),
                  )}
                </div>
              </>
            )}

            <p className="text-sm text-fg-3">
              {phase === 'sealed' ? T.tearHint : packDone ? '' : charging ? '…' : T.nextHint}
            </p>
            {phase === 'cards' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {!packDone && !charging && <Button onClick={revealAll}>{T.revealAll}</Button>}
                {packDone && (
                  <Button variant="primary" onClick={nextPack}>
                    {packIdx + 1 < result.packs.length ? T.nextPack : T.toSummary}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Chat lines={chat.lines} />
    </div>
  )
}

function bestOf(cards: readonly PulledCard[]) {
  return [...cards].sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || b.value_cents - a.value_cents)[0]
}

/** The sealed booster; on tear its top strip flies off. */
function Pack({ productId, index, tearing }: { productId: string; index: number; tearing: boolean }) {
  const atlas = useSpriteAtlas()
  const wrappers = (productById.get(productId)?.wrappers ?? []).filter((w) => atlas.data?.rect(w))
  const id = wrappers[index % Math.max(1, wrappers.length)]
  const rect = id ? atlas.data?.rect(id) : undefined
  const scale = 3
  if (!atlas.data || !rect) return <div className="skeleton" style={{ width: 84 * scale, height: 132 * scale }} />
  const strip = 22
  const top = { ...rect, h: strip }
  const body = { ...rect, y: rect.y + strip, h: rect.h - strip }
  return (
    <div className={clsx(!tearing && 'anim-bob')}>
      <div className={clsx(tearing && 'anim-strip-off')} style={spriteStyle(atlas.data, top, scale)} />
      <div className={clsx(tearing && 'anim-rattle')} style={spriteStyle(atlas.data, body, scale)} />
    </div>
  )
}

/** The card in the spotlight, with its tier and value. */
function BigCard({ card }: { card: PulledCard }) {
  const tier = card.tier as Tier
  const hit = HIT_TIERS.has(tier)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative anim-flip-in">
        {hit && <div className="glow" style={{ '--glow': GLOW[tier] } as React.CSSProperties} />}
        <TiltCard>
          <Card id={card.card_id} scale={3} foil={hit ? 'sweep' : 'none'} />
        </TiltCard>
        {card.new && <NewBadge />}
      </div>
      <p className="flex items-center gap-2 text-sm">
        <span className={clsx('font-pixel text-base', TIER_TEXT[tier])}>{TIER_LABEL[tier]}</span>
        <span className="text-fg-2">{cardName(card.card_id)}</span>
        <span className="nums font-semibold text-gold">{formatMoney(card.value_cents)}</span>
      </p>
    </div>
  )
}

function NewBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={clsx(
        'absolute -top-2 -right-2 bg-gain font-pixel text-accent-fg anim-stamp',
        small ? 'px-1 text-[0.625rem]' : 'px-1.5 text-sm',
      )}
    >
      {T.newBadge}
    </span>
  )
}

/** Flash, rays and particles for a hit. Bigger tiers get more. */
function Burst({ tier }: { tier: Tier }) {
  const big = tierRank(tier) >= tierRank('ultra')
  const count = { holo: 14, alternative: 24, ultra: 40, grail: 70 }[tier as 'holo'] ?? 10
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + hash01(i, 1) * 0.4
        const d = 160 + hash01(i, 2) * (big ? 320 : 160)
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, t: 600 + hash01(i, 3) * 700, hue: Math.floor(hash01(i, 4) * 360) }
      }),
    [count, big],
  )
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      {big && <div className="rays" />}
      {tierRank(tier) >= tierRank('alternative') && <div className="absolute inset-0 bg-white anim-flash" />}
      <div className="relative">
        {parts.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--t': `${p.t}ms`,
                background: tier === 'grail' ? `hsl(${p.hue} 90% 65%)` : GLOW[tier],
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------------------------
function Summary({
  result,
  productId,
  onClose,
  onAgain,
  canAgain,
}: {
  result: PackOpen
  productId: string
  onClose: () => void
  onAgain: () => void
  canAgain: boolean
}) {
  const act = useAct()
  const [sold, setSold] = useState(false)
  const [busy, setBusy] = useState(false)
  const all = result.packs.flatMap((p) => p.cards)
  const sorted = [...all].sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || b.value_cents - a.value_cents)
  const hits = sorted.filter((c) => HIT_TIERS.has(c.tier))
  const paid = result.price_cents * result.packs.length
  const ratio = paid > 0 ? result.total_value_cents / paid : 1
  const verdict = T.verdicts.find(([max]) => ratio < max)?.[1] ?? ''
  const godPack = result.packs.some((p) => p.cards.every((c) => HIT_TIERS.has(c.tier)))

  // Bulk = Common/Uncommon/Rare of this opening, except the copy that was new for the collection.
  const bulk = new Map<string, number>()
  for (const c of all) if (!HIT_TIERS.has(c.tier) && !c.new) bulk.set(c.card_id, (bulk.get(c.card_id) ?? 0) + 1)
  const bulkCount = [...bulk.values()].reduce((s, n) => s + n, 0)

  const sellBulk = async () => {
    setBusy(true)
    const res = await act(
      'ankauf_sell',
      { p_stacks: JSON.stringify([...bulk].map(([card_id, qty]) => ({ card_id, qty }))), p_copies: [] },
      ['binder'],
    )
    setBusy(false)
    if (res) {
      setSold(true)
      sfx('coin')
      toast('success', texts.shop.sold(res.sold, formatMoney(res.payout_cents)))
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          {godPack && <p className="font-pixel text-5xl text-tier-grail anim-heartbeat">{T.godPack}</p>}
          <p className="font-pixel text-4xl anim-stamp">{verdict}</p>
          <div className="mt-3 flex justify-center gap-8 text-sm">
            <Stat label={T.value} value={formatMoney(result.total_value_cents)} tone="text-gold" />
            <Stat label={T.paid} value={formatMoney(paid)} tone="text-fg" />
            <Stat
              label={T.profit}
              value={formatMoney(result.total_value_cents - paid)}
              tone={result.total_value_cents >= paid ? 'text-gain' : 'text-loss'}
            />
          </div>
        </div>

        {hits.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 font-pixel text-xl">{T.topHits}</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {hits.slice(0, 8).map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-1 anim-deal" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="relative">
                    <TiltCard>
                      <Card id={c.card_id} scale={2} foil="sweep" />
                    </TiltCard>
                    {c.new && <NewBadge />}
                  </div>
                  <span className={clsx('font-pixel text-sm', TIER_TEXT[c.tier as Tier])}>{TIER_LABEL[c.tier as Tier]}</span>
                  <span className="nums text-sm font-semibold text-gold">{formatMoney(c.value_cents)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-6">
          <h3 className="mb-3 font-pixel text-xl">
            {T.allCards} <span className="text-fg-3">({all.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {sorted.map((c, i) => (
              <div key={i} className="relative" title={`${cardName(c.card_id)} · ${formatMoney(c.value_cents)}`}>
                <Card id={c.card_id} scale={1} foil="sweep" />
                {c.new && <NewBadge small />}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={onAgain} disabled={!canAgain}>
            {T.again}
          </Button>
          <span className="flex items-center gap-1">
            <Button onClick={sellBulk} loading={busy} disabled={sold || bulkCount === 0}>
              {T.sellBulk} ({sold ? 0 : bulkCount})
            </Button>
            <InfoTip>{T.sellBulkTip}</InfoTip>
          </span>
          <Link to="/collection" onClick={onClose} className="btn btn-neutral inline-flex min-h-10 items-center px-3 font-semibold">
            {T.toBinder}
          </Link>
          <Button onClick={onClose}>{texts.common.close}</Button>
        </div>
        <p className="mt-2 text-center text-xs text-fg-3">{productById.get(productId)?.name}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-fg-3">{label}</p>
      <p className={clsx('nums font-pixel text-2xl', tone)}>{value}</p>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Fake live chat: reacts to every reveal
// ----------------------------------------------------------------------------------------------
type ChatMood = 'start' | 'charge' | Tier

function useChat(game: string | undefined) {
  const [lines, setLines] = useState<{ id: number; name: string; text: string }[]>([])
  const id = useRef(0)
  const react = useCallback((mood: ChatMood) => {
    const local = T.chatGame[game ?? ''] ?? {}
    const pool =
      mood === 'start' || mood === 'charge'
        ? [...T.chat.start, ...(local.start ?? [])]
        : mood === 'common' || mood === 'uncommon'
          ? [...T.chat.bulk, ...(local.bulk ?? [])]
          : mood === 'grail'
            ? [...T.chat.grail, ...(local.grail ?? [])]
            : T.chat[mood as keyof typeof T.chat]
    const n = mood === 'grail' ? 6 : mood === 'ultra' ? 4 : HIT_TIERS.has(mood) ? 3 : Math.random() < 0.5 ? 1 : 0
    const add = Array.from({ length: n }, () => ({
      id: id.current++,
      name: T.chatNames[Math.floor(Math.random() * T.chatNames.length)]!,
      text: pool[Math.floor(Math.random() * pool.length)]!,
    }))
    if (add.length) setLines((l) => [...l, ...add].slice(-40))
  }, [game])
  return useMemo(() => ({ lines, react }), [lines, react])
}

function Chat({ lines }: { lines: { id: number; name: string; text: string }[] }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [lines])
  return (
    <aside className="flex min-h-0 flex-col border-l-2 border-line bg-surface-1 max-lg:hidden">
      <div className="flex items-center gap-2 border-b-2 border-line px-3 py-2">
        <span className="size-2 bg-loss anim-heartbeat" />
        <span className="font-pixel text-lg">{T.chatTitle}</span>
        <span className="ml-auto text-xs text-fg-3">{T.chatViewers(37 + lines.length * 3)}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-sm leading-snug">
        {lines.map((l) => (
          <p key={l.id} className="animate-fade-up">
            <span className="font-semibold text-accent">{l.name}</span>: <span className="text-fg-2">{l.text}</span>
          </p>
        ))}
        <div ref={end} />
      </div>
    </aside>
  )
}
