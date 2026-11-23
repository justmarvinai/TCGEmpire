// The minijob games. Each reports a score in Basis-€ cents; the server checks it against the job's cap and pays it.
import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Card } from '@/components/cards/Card.tsx'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { cardById, SETS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { minijobs } from '@/texts/minijobs.ts'

const T = texts.jobs
export type GameKey = 'pfand' | 'regale' | 'sortieren' | 'pakete' | 'fake' | 'praktikum'
type Done = (score: number, count: number) => void

export function Game({ game, duration, onDone }: { game: GameKey; duration: number; onDone: Done }) {
  if (game === 'pfand') return <PfandGame duration={duration} onDone={onDone} />
  if (game === 'pakete') return <TimingGame duration={duration} onDone={onDone} />
  if (game === 'fake') return <FakeGame duration={duration} onDone={onDone} />
  if (game === 'praktikum') return <GradingGame duration={duration} onDone={onDone} />
  return <SortGame key={game} game={game} duration={duration} onDone={onDone} />
}

/** Counts down once; calls onDone with the final score exactly once. */
function useRound(duration: number, onDone: Done, result: () => [number, number]) {
  const [left, setLeft] = useState(duration)
  const done = useRef(false)
  useEffect(() => {
    const start = performance.now()
    const timer = setInterval(() => {
      const t = (performance.now() - start) / 1000
      setLeft(Math.max(0, duration - t))
      if (t >= duration && !done.current) {
        done.current = true
        clearInterval(timer)
        const [score, count] = result()
        onDone(Math.max(0, score), count)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [duration, onDone, result])
  return left
}

function Hud({ left, score, extra }: { left: number; score: number; extra: string }) {
  return (
    <div className="mb-2 flex items-center gap-6 font-pixel text-xl">
      <span className="flex items-center gap-2">
        <PixelIcon name="clock" /> <span className="nums">{Math.ceil(left)} s</span>
      </span>
      <span className="nums text-gold">{formatMoney(Math.max(0, score))}</span>
      <span className="nums text-fg-2">{extra}</span>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Pfandflaschen: click the bottles, leave the shards. A round is 15 s, so a bottle is worth three of the old 45 s round.
// ----------------------------------------------------------------------------------------------
const ITEMS = {
  einweg: { cents: 1500, weight: 20, icon: 'bottle', tone: 'text-info' },
  mehrweg: { cents: 900, weight: 28, icon: 'bottle', tone: 'text-gain' },
  bier: { cents: 480, weight: 45, icon: 'bottle', tone: 'text-warn' },
  scherbe: { cents: -600, weight: 7, icon: 'sparkle', tone: 'text-fg-2' },
} satisfies Record<string, { cents: number; weight: number; icon: IconName; tone: string }>
type Kind = keyof typeof ITEMS
interface Item {
  id: number
  kind: Kind
  x: number
  y: number
  until: number
}

function pickKind(): Kind {
  const total = Object.values(ITEMS).reduce((s, i) => s + i.weight, 0)
  let r = Math.random() * total
  for (const [k, i] of Object.entries(ITEMS)) {
    r -= i.weight
    if (r < 0) return k as Kind
  }
  return 'bier'
}

function PfandGame({ duration, onDone }: { duration: number; onDone: Done }) {
  const [items, setItems] = useState<Item[]>([])
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string; good: boolean }[]>([])
  const [score, setScore] = useState(0)
  const [bottles, setBottles] = useState(0)
  const state = useRef({ score: 0, bottles: 0, id: 0 })
  const left = useRound(duration, onDone, useCallback(() => [state.current.score, state.current.bottles], []))

  useEffect(() => {
    const s = state.current
    const start = performance.now()
    let next = 0
    let frame = 0
    const loop = (now: number) => {
      const t = (now - start) / 1000
      if (t >= duration) return
      const pace = 1 - (t / duration) * 0.4 // faster and shorter-lived as the round goes on
      if (now >= next) {
        const fresh = Array.from({ length: Math.random() < 0.3 ? 2 : 1 }, () => ({
          id: s.id++,
          kind: pickKind(),
          x: 4 + Math.random() * 88,
          y: 10 + Math.random() * 76,
          until: now + 1900 * pace,
        }))
        setItems((list) => [...list.filter((i) => i.until > now), ...fresh])
        next = now + (650 + Math.random() * 700) * pace
      } else {
        setItems((list) => (list.some((i) => i.until <= now) ? list.filter((i) => i.until > now) : list))
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  const grab = (item: Item) => {
    const s = state.current
    const def = ITEMS[item.kind]
    setItems((list) => list.filter((i) => i.id !== item.id))
    s.score += def.cents
    if (def.cents > 0) s.bottles += 1
    setScore(s.score)
    setBottles(s.bottles)
    sfx(def.cents > 0 ? 'bottle' : 'shard')
    setPops((p) => [...p.slice(-8), { id: item.id, x: item.x, y: item.y, text: def.cents > 0 ? `+${formatMoney(def.cents)}` : T.ouch, good: def.cents > 0 }])
  }

  return (
    <div>
      <Hud left={left} score={score} extra={`${T.bottles}: ${bottles}`} />
      <div
        className="relative h-[26rem] overflow-hidden rounded-2xl border border-line select-none"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgb(80 140 70 / 0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgb(60 120 60 / 0.35), transparent 45%), linear-gradient(180deg, #1d3a24, #13261a)',
        }}
      >
        {items.map((i) => {
          const def = ITEMS[i.kind]
          return (
            <button
              key={i.id}
              type="button"
              aria-label={T.types[i.kind]}
              onPointerDown={() => grab(i)}
              className={clsx('absolute flex flex-col items-center anim-bottle', def.tone)}
              style={{ left: `${i.x}%`, top: `${i.y}%`, transform: i.kind === 'scherbe' ? 'rotate(20deg)' : undefined }}
            >
              <PixelIcon name={def.icon} scale={3} />
              <span className="nums rounded bg-ink/70 px-1 text-[0.625rem] font-semibold">{formatMoney(def.cents)}</span>
            </button>
          )
        })}
        {pops.map((p) => (
          <span
            key={p.id}
            className={clsx('pointer-events-none absolute font-pixel text-lg anim-rise', p.good ? 'text-gold' : 'text-loss')}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.text}
          </span>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Sorting: Regale einräumen (words into shelves) and Karten sortieren (cards by type)
// ----------------------------------------------------------------------------------------------
const SORT = {
  regale: { right: 400, wrong: -200 },
  sortieren: { right: 500, wrong: -250 },
}
const SORT_CARDS = SETS[0]!.cards

function nextSortItem(game: 'regale' | 'sortieren', avoid: string | undefined) {
  for (;;) {
    if (game === 'regale') {
      const [label, bin] = T.regaleItems[Math.floor(Math.random() * T.regaleItems.length)]!
      if (label !== avoid) return { id: label, bin }
    } else {
      const c = SORT_CARDS[Math.floor(Math.random() * SORT_CARDS.length)]!
      if (c.id !== avoid) return { id: c.id, bin: c.kind === 'trainer' ? 'Trainer' : (c.element ?? 'Farblos') }
    }
  }
}

function SortGame({ game, duration, onDone }: { game: 'regale' | 'sortieren'; duration: number; onDone: Done }) {
  const bins = game === 'regale' ? Object.keys(T.shelves) : T.sortBins
  const [item, setItem] = useState(() => nextSortItem(game, undefined))
  const [score, setScore] = useState(0)
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null)
  const state = useRef({ score: 0, count: 0 })
  const left = useRound(duration, onDone, useCallback(() => [state.current.score, state.current.count], []))

  const choose = useCallback(
    (bin: string) => {
      const ok = bin === item.bin
      const s = state.current
      s.score += ok ? SORT[game].right : SORT[game].wrong
      if (ok) s.count += 1
      setScore(s.score)
      setCount(s.count)
      setFlash(ok ? 'right' : 'wrong')
      sfx(ok ? 'bottle' : 'shard')
      setItem(nextSortItem(game, item.id))
    },
    [game, item],
  )

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= bins.length) choose(bins[n - 1]!)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [bins, choose])

  return (
    <div>
      <Hud left={left} score={score} extra={`${T.right}: ${count}`} />
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface-2 p-6 select-none">
        <div key={item.id} className={clsx('anim-deal', flash === 'wrong' && 'animate-shake')}>
          {game === 'regale' ? (
            <p className="rounded-xl bg-surface-3 px-6 py-4 font-pixel text-4xl">{item.id}</p>
          ) : (
            <Card id={item.id} scale={2} foil="none" />
          )}
        </div>
        <div className={clsx('grid gap-2', bins.length > 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {bins.map((b, i) => (
            <button
              key={b}
              type="button"
              onClick={() => choose(b)}
              className="btn btn-neutral min-h-12 min-w-32 px-3 font-semibold"
            >
              <span className="mr-2 text-xs text-fg-3">{i + 1}</span>
              {game === 'regale' ? T.shelves[b] : b}
            </button>
          ))}
        </div>
        {game === 'sortieren' && <p className="text-xs text-fg-3">{cardById.get(item.id)?.name}</p>}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Pakete ausliefern: press while the marker is inside the delivery window. The marker swings slowly enough to be
// seen as one bar (a full swing takes 2.5 s at the start, a little faster later); windows start wide.
// ----------------------------------------------------------------------------------------------
function newWindow(n: number) {
  const width = Math.max(0.16, 0.3 - n * 0.005)
  return { start: 0.05 + Math.random() * (0.9 - width), width }
}

function TimingGame({ duration, onDone }: { duration: number; onDone: Done }) {
  const marker = useRef<HTMLDivElement>(null)
  const pos = useRef(0)
  const [win, setWin] = useState(() => newWindow(0))
  const [score, setScore] = useState(0)
  const [parcels, setParcels] = useState(0)
  const [result, setResult] = useState<{ key: number; text: string; good: boolean } | null>(null)
  const state = useRef({ score: 0, parcels: 0 })
  const left = useRound(duration, onDone, useCallback(() => [state.current.score, state.current.parcels], []))

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const loop = (now: number) => {
      const t = (now - start) / 1000
      const speed = 0.8 + t * 0.012
      pos.current = (Math.sin(t * speed * Math.PI) + 1) / 2
      if (marker.current) marker.current.style.transform = `translateX(${pos.current * 100}%)`
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  const drop = useCallback(() => {
    const s = state.current
    const x = pos.current
    const inside = x >= win.start && x <= win.start + win.width
    const perfect = inside && Math.abs(x - (win.start + win.width / 2)) < win.width * 0.2
    const gain = perfect ? 1000 : inside ? 650 : 0
    s.score += gain
    s.parcels += 1
    setScore(s.score)
    setParcels(s.parcels)
    sfx(inside ? 'bottle' : 'shard')
    setResult({ key: s.parcels, text: perfect ? T.perfect : inside ? `+${formatMoney(gain)}` : T.neighbour, good: inside })
    setWin(newWindow(s.parcels))
  }, [win])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        drop()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [drop])

  return (
    <div>
      <Hud left={left} score={score} extra={T.parcels(parcels)} />
      <button type="button" onPointerDown={drop} className="block w-full rounded-2xl border border-line bg-surface-2 p-8 select-none">
        <div className="relative h-14 overflow-hidden rounded-xl border border-line bg-ink">
          {/* marker and window share an inset track, so the marker is fully visible at both ends */}
          <div className="absolute inset-y-0 right-3 left-3">
            <div className="absolute inset-y-0 bg-gain/40 outline-2 outline-gain" style={{ left: `${win.start * 100}%`, width: `${win.width * 100}%` }} />
            <div ref={marker} className="absolute inset-y-[-6px] left-0 w-full will-change-transform">
              <div className="h-full w-2.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_12px_var(--color-gold)]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex h-8 items-center justify-center gap-2">
          <PixelIcon name="gift" scale={2} className="text-warn" />
          {result && (
            <span key={result.key} className={clsx('font-pixel text-2xl anim-stamp', result.good ? 'text-gain' : 'text-loss')}>
              {result.text}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-fg-3">{T.dropHint}</p>
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Grading minijobs: one card at a time. An answer counts once the card lies still; after a miss the
// card stays up for a moment to show why (so blind button mashing does not pay either).
// ----------------------------------------------------------------------------------------------
const ALL_CARDS = SETS.flatMap((s) => s.cards)
/** Answers while the next card is still dealing in do not count (no blind double clicks). */
const DEAL_MS = 250
/** Cards are shown at this integer scale; a card is CW x CH card pixels. */
const PX = 3
const CW = 80
const CH = 112

function pick<V>(list: readonly V[]): V {
  return list[Math.floor(Math.random() * list.length)]!
}

/** n different items of a list, in random order. */
function sample<V>(list: readonly V[], n: number): V[] {
  const rest = [...list]
  return Array.from({ length: Math.min(n, rest.length) }, () => rest.splice(Math.floor(Math.random() * rest.length), 1)[0]!)
}

function randomCard(avoid?: string) {
  for (;;) {
    const c = pick(ALL_CARDS)
    if (c.id !== avoid) return c
  }
}

const signed = (cents: number) => (cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents))

/** The current card, the lock while it deals in, and the reveal after a miss. */
function useCardFlow<C>(deal: (prev?: C) => C, revealMs: number, left: number) {
  const [card, setCard] = useState(() => deal())
  const [missed, setMissed] = useState(false)
  const flow = useRef<{ shownAt: number; busy: boolean; timer?: ReturnType<typeof setTimeout> }>({ shownAt: 0, busy: false })
  useEffect(() => {
    const f = flow.current
    return () => clearTimeout(f.timer)
  }, [])
  return {
    card,
    missed,
    /** An answer counts only while the round runs and the card lies still. */
    ready: () => left > 0 && !flow.current.busy && performance.now() - flow.current.shownAt >= DEAL_MS,
    /** Deals the next card: at once, or after the reveal when the answer was a miss. */
    next: (miss: boolean) => {
      const f = flow.current
      const go = () => {
        f.busy = false
        f.shownAt = performance.now()
        setMissed(false)
        setCard(deal(card))
      }
      if (!miss) return go()
      f.busy = true
      setMissed(true)
      f.timer = setTimeout(go, revealMs)
    },
  }
}

/** Calls the latest handler for each fresh key press (no auto-repeat, no shortcuts); true = key used. */
function useKeys(handle: (key: string) => boolean) {
  const latest = useRef(handle)
  useEffect(() => {
    latest.current = handle
  })
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (latest.current(e.key.toLowerCase())) e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])
}

/** Brief glow behind the card after each answer. */
function Flash({ good }: { good: boolean }) {
  return <div className={clsx('pointer-events-none absolute -inset-4 rounded-3xl anim-flash', good ? 'bg-gain/35' : 'bg-loss/40')} />
}

/** After a miss: a stamp with what it really was and what it cost, then why. */
function Verdict({ title, cents, tone, children }: { title: string; cents: number; tone: 'loss' | 'warn'; children: ReactNode }) {
  return (
    <div className="flex max-w-64 flex-col items-center gap-3 md:items-start">
      <div className={clsx('anim-stamp rounded-xl border-2 px-4 py-2 text-center', tone === 'loss' ? 'border-loss text-loss' : 'border-warn text-warn')}>
        <p className="font-pixel text-3xl leading-none">{title}</p>
        <p className="nums mt-1 font-pixel text-lg">{signed(cents)}</p>
      </div>
      {children}
    </div>
  )
}

function Gain({ cents }: { cents: number }) {
  return <span className="anim-rise font-pixel text-3xl text-gain">{signed(cents)}</span>
}

function Key({ k }: { k: string }) {
  return <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 font-sans text-xs font-semibold text-fg-3">{k}</kbd>
}

// ----------------------------------------------------------------------------------------------
// Echt oder Fake? A real card, or a fake with ONE visible tell
// ----------------------------------------------------------------------------------------------
const F = minijobs.fake
/** About 40 % fakes; at 42 % always pressing "Echt" loses money on average. */
const FAKE = { right: 3_500, wrong: -5_000, share: 0.42, revealMs: 1_200 }
/** What each tell does to the card (whole class names, one picked at random). */
const LOOKS = {
  hue: ['hue-rotate-90', 'hue-rotate-180', '-hue-rotate-90'],
  faded: ['saturate-25'],
  mirror: ['-scale-x-100'],
  dark: ['brightness-50'],
  name: [''],
}
type Tell = keyof typeof LOOKS
const TELLS = Object.keys(LOOKS) as Tell[]

interface FakeCard {
  key: number
  id: string
  tell: Tell | null
  look: string
  plate: string
}

function nextFake(prev?: FakeCard): FakeCard {
  const card = randomCard(prev?.id)
  const tell = Math.random() < FAKE.share ? pick(TELLS) : null
  return {
    key: (prev?.key ?? 0) + 1,
    id: card.id,
    tell,
    look: tell ? pick(LOOKS[tell]) : '',
    plate: tell === 'name' ? misspell(card.name) : card.name,
  }
}

/** A believable typo in the printed part of the name (not in a variant like "(Alt-Art)"): two neighbouring letters
 *  swapped, or one letter doubled. */
function misspell(name: string) {
  const [printed = name, ...variant] = name.split(' (')
  const ch = [...printed]
  const letter = (i: number) => /\p{L}/u.test(ch[i] ?? '')
  const swaps = ch.flatMap((c, i) => (i > 0 && letter(i) && letter(i + 1) && c.toLowerCase() !== ch[i + 1]!.toLowerCase() ? [i] : []))
  if (swaps.length > 0 && Math.random() < 0.5) {
    const i = pick(swaps)
    ;[ch[i], ch[i + 1]] = [ch[i + 1]!, ch[i]!]
  } else {
    const doubles = ch.flatMap((_, i) => (i > 0 && letter(i) ? [i] : []))
    const i = doubles.length > 0 ? pick(doubles) : 0
    ch.splice(i, 0, ch[i]!)
  }
  return [ch.join(''), ...variant].join(' (')
}

function FakeGame({ duration, onDone }: { duration: number; onDone: Done }) {
  const [score, setScore] = useState(0)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState<{ key: number; ok: boolean } | null>(null)
  const state = useRef({ score: 0, count: 0 })
  const left = useRound(duration, onDone, useCallback(() => [state.current.score, state.current.count], []))
  const { card, missed, ready, next } = useCardFlow(nextFake, FAKE.revealMs, left)

  const answer = (saysFake: boolean) => {
    if (!ready()) return
    const ok = saysFake === (card.tell !== null)
    const s = state.current
    s.score = Math.max(0, s.score + (ok ? FAKE.right : FAKE.wrong))
    if (ok) s.count += 1
    setScore(s.score)
    setCount(s.count)
    setLast({ key: card.key, ok })
    sfx(ok ? 'stamp' : 'error')
    next(!ok)
  }
  useKeys((k) => {
    if (k === 'e' || k === 'arrowleft') answer(false)
    else if (k === 'f' || k === 'arrowright') answer(true)
    else return false
    return true
  })

  return (
    <div>
      <Hud left={left} score={score} extra={`${T.right}: ${count}`} />
      <div className="flex flex-col items-center gap-4 overflow-x-clip rounded-2xl border border-line bg-surface-2 p-3 select-none md:p-5">
        <p className="text-sm text-fg-2">{F.hint}</p>
        <div className="grid w-full items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="max-md:hidden" />
          <div className="relative flex flex-col items-center gap-3">
            {last && <Flash key={`flash-${last.key}`} good={last.ok} />}
            <div key={card.key} className="relative anim-deal">
              <div className={card.look}>
                <Card id={card.id} scale={PX} foil="none" />
              </div>
            </div>
            <p
              className={clsx(
                'relative rounded-lg bg-surface-3 px-3 py-1.5 text-center outline-2 -outline-offset-2',
                missed && card.tell === 'name' ? 'outline-loss' : 'outline-transparent',
              )}
            >
              <span className="mr-2 text-xs text-fg-3">{F.plate}</span>
              <span className="font-semibold">{card.plate}</span>
            </p>
          </div>
          <div className="flex min-h-32 items-center justify-center md:justify-start">
            {missed ? (
              card.tell ? (
                <Verdict title={F.caught} cents={FAKE.wrong} tone="loss">
                  <p className="text-sm text-fg-2 max-md:text-center">
                    <span className="font-semibold text-fg">{F.tells[card.tell]}.</span> {F.passed}
                  </p>
                </Verdict>
              ) : (
                <Verdict title={F.wasReal} cents={FAKE.wrong} tone="loss">
                  <p className="text-sm text-fg-2 max-md:text-center">{F.flagged}</p>
                </Verdict>
              )
            ) : (
              last?.ok && <Gain key={last.key} cents={FAKE.right} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={missed}
            onClick={() => answer(false)}
            className="btn btn-neutral flex min-h-12 min-w-32 items-center justify-center gap-3 px-4 text-lg font-semibold md:min-w-44"
          >
            <Key k={F.keysReal[1]} />
            <span className="text-gain">{F.real}</span>
            <Key k={F.keysReal[0]} />
          </button>
          <button
            type="button"
            disabled={missed}
            onClick={() => answer(true)}
            className="btn btn-neutral flex min-h-12 min-w-32 items-center justify-center gap-3 px-4 text-lg font-semibold md:min-w-44"
          >
            <Key k={F.keysFake[0]} />
            <span className="text-loss">{F.fake}</span>
            <Key k={F.keysFake[1]} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Grading-Praktikum: grade the card. The worst of centering, corners, edges and surface counts.
// ----------------------------------------------------------------------------------------------
const P = minijobs.praktikum
/** wrong = off by two or more grades; at -100 € blindly pressing one button earns nothing on average. */
const PRAKTIKUM = { right: 7_000, near: 1_500, wrong: -10_000, revealMs: 1_500 }
const GRADES = [10, 9, 8, 7]
const ASPECTS = ['centering', 'corners', 'edges', 'surface'] as const
type Aspect = (typeof ASPECTS)[number]
/** Chance of a 10, 9 or 8 for each quality value (the rest is a 7): every final grade comes up about as often. */
const VALUE_ODDS = [0.707, 0.134, 0.09]
/** Light frame around the card in card pixels; bad centering moves the card to one side (7/7, 5/9, 3/11, 1/13). */
const MARGIN = 7
/** By damage (10 - value): centering shift, size of each whitened corner (1, 2 or 3 corners), specks along one
 *  edge, scratches across the art. */
const SHIFT = [0, 2, 4, 6]
const CORNER = [0, 4, 6, 8]
const SPECKS = [0, 5, 8, 13]
const SCRATCHES = [
  [],
  [{ len: 28, tone: 'bg-fg/70' }],
  [{ len: 46, tone: 'bg-fg' }],
  [
    { len: 60, tone: 'bg-fg' },
    { len: 36, tone: 'bg-fg' },
  ],
]

/** In card pixels: a whitened spot (top-left and size) and a scratch (centre, length and angle). */
interface Spot {
  x: number
  y: number
  w: number
  h: number
}
interface Scratch {
  x: number
  y: number
  len: number
  deg: number
  tone: string
}
interface GradeCard {
  key: number
  id: string
  values: Record<Aspect, number>
  grade: number
  /** top-left of the card inside its frame, in card pixels */
  at: { x: number; y: number }
  spots: Spot[]
  scratches: Scratch[]
}

function rollValue() {
  let r = Math.random()
  for (const [i, p] of VALUE_ODDS.entries()) if ((r -= p) < 0) return 10 - i
  return 7
}

function nextGrade(prev?: GradeCard): GradeCard {
  const values = { centering: rollValue(), corners: rollValue(), edges: rollValue(), surface: rollValue() }
  const bad = (a: Aspect) => 10 - values[a]
  const shift = SHIFT[bad('centering')]! * pick([-1, 1])
  const spots: Spot[] = []
  // Corners: 1-3 whitened corners, each a stair-step triangle that grows with the damage.
  const size = CORNER[bad('corners')]!
  for (const c of sample([0, 1, 2, 3], bad('corners'))) {
    for (let i = 0; i < size; i++) spots.push({ x: c % 2 ? CW - size + i : 0, y: c < 2 ? i : CH - 1 - i, w: size - i, h: 1 })
  }
  // Edges: whitened specks along one edge (top, right, bottom or left), two card pixels deep, longer when worse.
  const edge = pick([0, 1, 2, 3])
  const slots = Array.from({ length: ((edge % 2 ? CH : CW) - 10) / 2 }, (_, i) => 5 + i * 2)
  for (const p of sample(slots, SPECKS[bad('edges')]!)) {
    const len = 2 + Math.floor(Math.random() * bad('edges'))
    spots.push(edge % 2 ? { x: edge === 3 ? 0 : CW - 2, y: p, w: 2, h: len } : { x: p, y: edge === 0 ? 0 : CH - 2, w: len, h: 2 })
  }
  return {
    key: (prev?.key ?? 0) + 1,
    id: randomCard(prev?.id).id,
    values,
    grade: Math.min(...Object.values(values)),
    at: Math.random() < 0.5 ? { x: MARGIN + shift, y: MARGIN } : { x: MARGIN, y: MARGIN + shift },
    spots,
    // Surface: scratch lines across the art.
    scratches: SCRATCHES[bad('surface')]!.map((s) => ({
      ...s,
      x: s.len / 2 + 6 + Math.random() * (CW - s.len - 12),
      y: 24 + Math.random() * 28,
      deg: Math.random() * 70 - 35,
    })),
  }
}

/** The card in its light frame, with its flaws drawn on top. */
function GradedCard({ card }: { card: GradeCard }) {
  return (
    <div className="relative bg-fg-2" style={{ width: (CW + 2 * MARGIN) * PX, height: (CH + 2 * MARGIN) * PX }}>
      <div className="absolute" style={{ left: card.at.x * PX, top: card.at.y * PX }}>
        <Card id={card.id} scale={PX} foil="none" />
        {card.spots.map((s, i) => (
          <i key={i} className="absolute bg-fg" style={{ left: s.x * PX, top: s.y * PX, width: s.w * PX, height: s.h * PX }} />
        ))}
        {card.scratches.map((s, i) => (
          <i
            key={`s${i}`}
            className={clsx('absolute h-0.5', s.tone)}
            style={{ left: (s.x - s.len / 2) * PX, top: s.y * PX, width: s.len * PX, transform: `rotate(${s.deg}deg)` }}
          />
        ))}
      </div>
    </div>
  )
}

function GradingGame({ duration, onDone }: { duration: number; onDone: Done }) {
  const [score, setScore] = useState(0)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState<{ key: number; off: number; cents: number } | null>(null)
  const state = useRef({ score: 0, count: 0 })
  const left = useRound(duration, onDone, useCallback(() => [state.current.score, state.current.count], []))
  const { card, missed, ready, next } = useCardFlow(nextGrade, PRAKTIKUM.revealMs, left)

  const choose = (grade: number) => {
    if (!ready()) return
    const off = Math.abs(grade - card.grade)
    const cents = off === 0 ? PRAKTIKUM.right : off === 1 ? PRAKTIKUM.near : PRAKTIKUM.wrong
    const s = state.current
    s.score = Math.max(0, s.score + cents)
    if (off === 0) s.count += 1
    setScore(s.score)
    setCount(s.count)
    setLast({ key: card.key, off, cents })
    sfx(off === 0 ? 'stamp' : off === 1 ? 'flip' : 'error')
    next(off > 0)
  }
  useKeys((k) => {
    const grade = GRADES[Number(k) - 1]
    if (grade === undefined) return false
    choose(grade)
    return true
  })

  return (
    <div>
      <Hud left={left} score={score} extra={`${T.right}: ${count}`} />
      <div className="flex flex-col items-center gap-4 overflow-x-clip rounded-2xl border border-line bg-surface-2 p-3 select-none md:p-5">
        <p className="text-sm font-semibold text-fg-2">{P.hint}</p>
        <div className="grid w-full items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="max-md:hidden" />
          <div className="relative">
            {last && <Flash key={`flash-${last.key}`} good={last.off === 0} />}
            <div key={card.key} className="relative anim-deal">
              <GradedCard card={card} />
            </div>
          </div>
          <div className="flex min-h-44 items-center justify-center md:justify-start">
            {missed && last ? (
              <Verdict title={P.grade(card.grade)} cents={last.cents} tone={last.off === 1 ? 'warn' : 'loss'}>
                <p className="text-sm text-fg-2">{last.off === 1 ? P.near : P.wrong}</p>
                <div className="grid grid-cols-[auto_auto] gap-x-4 text-sm">
                  {ASPECTS.flatMap((a) => {
                    const tone = card.values[a] === card.grade ? 'font-semibold text-fg' : 'text-fg-3'
                    return [
                      <span key={a} className={tone}>
                        {P.aspects[a]}
                      </span>,
                      <span key={`${a}-v`} className={clsx('nums text-right', tone)}>
                        {card.values[a]}
                      </span>,
                    ]
                  })}
                </div>
              </Verdict>
            ) : (
              last?.off === 0 && <Gain key={last.key} cents={last.cents} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {GRADES.map((g, i) => (
            <button
              key={g}
              type="button"
              disabled={missed}
              onClick={() => choose(g)}
              className="btn btn-neutral flex min-h-12 min-w-28 items-center justify-center gap-2 px-3 font-semibold"
            >
              <Key k={String(i + 1)} />
              {P.grades[g]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
