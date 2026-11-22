// The minijob games. Each reports a score in Basis-€ cents; the server caps and pays it.
import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/cards/Card.tsx'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { cardById, SETS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.jobs
export type GameKey = 'pfand' | 'regale' | 'sortieren' | 'pakete'
type Done = (score: number, count: number) => void

export function Game({ game, duration, onDone }: { game: GameKey; duration: number; onDone: Done }) {
  if (game === 'pfand') return <PfandGame duration={duration} onDone={onDone} />
  if (game === 'pakete') return <TimingGame duration={duration} onDone={onDone} />
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
// Pfandflaschen: click the bottles, leave the shards
// ----------------------------------------------------------------------------------------------
const ITEMS = {
  einweg: { cents: 500, weight: 20, icon: 'bottle', tone: 'text-info' },
  mehrweg: { cents: 300, weight: 28, icon: 'bottle', tone: 'text-gain' },
  bier: { cents: 160, weight: 45, icon: 'bottle', tone: 'text-warn' },
  scherbe: { cents: -200, weight: 7, icon: 'sparkle', tone: 'text-fg-2' },
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
// Pakete ausliefern: press while the marker is inside the delivery window
// ----------------------------------------------------------------------------------------------
function newWindow(n: number) {
  const width = Math.max(0.1, 0.24 - n * 0.006)
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
      const speed = 1.6 + t * 0.03
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
    const gain = perfect ? 800 : inside ? 500 : 0
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
          <div className="absolute inset-y-0 bg-gain/40 outline-2 outline-gain" style={{ left: `${win.start * 100}%`, width: `${win.width * 100}%` }} />
          <div ref={marker} className="absolute inset-y-[-6px] left-0 w-full">
            <div className="h-full w-1.5 bg-gold" />
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
