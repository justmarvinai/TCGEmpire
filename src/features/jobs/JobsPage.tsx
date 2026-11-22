import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import type { Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { useNow } from '@/lib/pure.ts'
import { texts } from '@/texts/de.ts'
import { config } from '../../../content/config.ts'

const T = texts.jobs
const PFAND = config['minigame.pfand']

// Deposit per item in Basis-€ cents. The server caps the score; the payout it returns is what counts.
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

export function JobsPage() {
  const me = useMe()
  const player = me.data?.player
  const [run, setRun] = useState<{ id: string; duration: number } | null>(null)
  const [result, setResult] = useState<{ payout: number; ep: number; bons: number } | null>(null)
  const act = useAct()
  const [busy, setBusy] = useState(false)
  const now = useNow()
  const offset = useWorld((s) => s.clockOffsetMs)

  const start = async () => {
    setBusy(true)
    setResult(null)
    const res = await act('minigame_start', { p_game: 'pfand' })
    setBusy(false)
    if (res) setRun({ id: res.run_id, duration: res.duration_s })
  }

  const finish = useCallback(
    async (score: number, bottles: number) => {
      if (!run) return
      const res = await act('minigame_finish', { p_run: run.id, p_score: score, p_bottles: bottles }, ['quests'])
      setRun(null)
      if (res) {
        setResult({ payout: res.payout_cents, ep: res.ep_gained, bons: res.pfandbons })
        sfx('coin')
      }
    },
    [act, run],
  )

  return (
    <Page icon="briefcase" title={T.title} subtitle={T.subtitle}>
      <Panel title={T.pfand} tip={T.pfandTip}>
        {run ? (
          <PfandGame duration={run.duration} onDone={finish} />
        ) : (
          <div className="flex flex-wrap items-center gap-6" data-tour="pfand">
            <div className="grid size-24 place-items-center bg-surface-2 text-warn outline-2 outline-line">
              <PixelIcon name="bottle" scale={4} />
            </div>
            <div className="flex max-w-lg flex-col gap-3">
              <p className="text-fg-2">{T.pfandBody}</p>
              {result && (
                <div className="flex flex-wrap items-center gap-4 bg-surface-2 p-3 anim-stamp">
                  <span className="font-pixel text-xl">{T.resultTitle}</span>
                  <span className="nums font-pixel text-2xl text-gold">+{formatMoney(result.payout)}</span>
                  <span className="nums text-sm text-fg-2">
                    +{result.ep} {T.epGained}
                  </span>
                  {result.bons > 0 && <span className="text-sm text-gain">{T.pfandbon}</span>}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="primary" size="lg" onClick={start} loading={busy} disabled={!player || player.energy < PFAND.energy}>
                  {result ? T.again : T.start}
                </Button>
                <span className="flex items-center gap-1 text-sm text-info">
                  <PixelIcon name="bolt" /> {T.energyCost(PFAND.energy)}
                </span>
              </div>
              {player && player.energy < PFAND.energy && now > 0 && (
                <p className="text-sm text-fg-3">{T.noEnergy(formatDuration(energyWait(player, now + offset)))}</p>
              )}
            </div>
          </div>
        )}
      </Panel>
    </Page>
  )
}

/** Seconds until there is enough energy for a round (interpolated from the server's rate). */
function energyWait(p: Player, serverMs: number) {
  const since = (serverMs - Date.parse(p.energy_at)) / 1000
  return Math.max(0, (PFAND.energy - p.energy) * p.energy_regen_s - (since % p.energy_regen_s))
}

function PfandGame({ duration, onDone }: { duration: number; onDone: (score: number, bottles: number) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string; good: boolean }[]>([])
  const [score, setScore] = useState(0)
  const [bottles, setBottles] = useState(0)
  const [left, setLeft] = useState(duration)
  const state = useRef({ score: 0, bottles: 0, id: 0, start: 0, done: false })

  useEffect(() => {
    const s = state.current
    s.start = performance.now()
    let nextSpawn = 0
    let frame = 0
    const loop = (now: number) => {
      const t = (now - s.start) / 1000
      setLeft(Math.max(0, duration - t))
      if (t >= duration) {
        if (!s.done) {
          s.done = true
          onDone(Math.max(0, s.score), s.bottles)
        }
        return
      }
      // Faster and shorter-lived items as the round goes on.
      const pace = 1 - (t / duration) * 0.4
      if (now >= nextSpawn) {
        const n = Math.random() < 0.3 ? 2 : 1
        const fresh = Array.from({ length: n }, () => ({
          id: s.id++,
          kind: pickKind(),
          x: 4 + Math.random() * 88,
          y: 10 + Math.random() * 76,
          until: now + 1900 * pace,
        }))
        setItems((list) => [...list.filter((i) => i.until > now), ...fresh])
        nextSpawn = now + (650 + Math.random() * 700) * pace
      } else {
        setItems((list) => (list.some((i) => i.until <= now) ? list.filter((i) => i.until > now) : list))
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [duration, onDone])

  const grab = (item: Item) => {
    const s = state.current
    const def = ITEMS[item.kind]
    setItems((list) => list.filter((i) => i.id !== item.id))
    s.score += def.cents
    if (def.cents > 0) s.bottles += 1
    setScore(s.score)
    setBottles(s.bottles)
    sfx(def.cents > 0 ? 'bottle' : 'shard')
    const text = def.cents > 0 ? `+${formatMoney(def.cents)}` : T.ouch
    setPops((p) => [...p.slice(-8), { id: item.id, x: item.x, y: item.y, text, good: def.cents > 0 }])
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-6 font-pixel text-xl">
        <span className="flex items-center gap-2">
          <PixelIcon name="clock" /> <span className="nums">{Math.ceil(left)} s</span>
        </span>
        <span className="nums text-gold">
          {T.score}: {formatMoney(Math.max(0, score))}
        </span>
        <span className="nums text-fg-2">
          {T.bottles}: {bottles}
        </span>
      </div>
      <div
        className="relative h-[26rem] overflow-hidden outline-2 outline-line select-none"
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
              <span className="nums bg-ink/70 px-1 text-[0.625rem] font-semibold">{formatMoney(def.cents)}</span>
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
