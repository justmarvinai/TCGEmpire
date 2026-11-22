// Things that appear on top of every page: level-up celebration, Mutti's tutorial, big pulls of others.
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ALL_ITEMS, FEATURES, unseenFeatures } from '@/app/nav.ts'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc.ts'
import { Button } from '@/components/ui/Button.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardName, JOBS, TUTORIAL } from '@/lib/catalog.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { hash01, useNow } from '@/lib/pure.ts'
import type { Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

export function Overlays({ awayS, player }: { awayS: number; player: Player }) {
  // Only what the first answer of this visit said counts: later syncs reset the away time.
  const [away] = useState(awayS)
  return (
    <>
      {away >= RECAP_MIN_S && player.tutorial_step < 0 && <RecapSheet away={away} player={player} />}
      <LevelUpOverlay />
      <BigPulls />
    </>
  )
}

const RECAP_MIN_S = 600

/** "Willkommen zurück": what happened while the player was away, collected with one click. */
function RecapSheet({ away, player }: { away: number; player: Player }) {
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const act = useAct()
  const recap = useQuery({ queryKey: ['recap'], queryFn: () => rpc('recap_get'), staleTime: Infinity })
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  if (!open || !recap.data) return null
  const b = recap.data.bunker
  const s = recap.data.shift
  const lines: { icon: IconName; text: string; money?: number }[] = []
  if (b.unlocked && (b.content_cents ?? 0) > 0) lines.push({ icon: 'vault', text: texts.recap.bunker, money: b.content_cents })
  if (s) {
    const job = JOBS.find((j) => j.key === s.job)?.employer ?? s.job
    lines.push(
      s.done
        ? { icon: 'briefcase', text: texts.recap.shiftDone(job), money: s.wage_cents }
        : { icon: 'clock', text: texts.recap.shiftRunning(job, formatDuration((Date.parse(s.ends_at) - (now + offset)) / 1000)) },
    )
  }
  if (player.sealed_total > 0) lines.push({ icon: 'pack', text: texts.recap.sealed(player.sealed_total) })
  if (player.quests_ready > 0) lines.push({ icon: 'scroll', text: texts.recap.quests(player.quests_ready) })
  if (lines.length === 0) return null
  const collectable = lines.some((l) => l.money)

  const collect = async () => {
    setBusy(true)
    const res = await act('recap_collect', {}, ['bunker', 'jobs', 'quests'])
    setBusy(false)
    if (res) {
      sfx('coin')
      toast('success', texts.recap.collected(formatMoney(res.bunker_cents + res.shift_cents)))
      setOpen(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && setOpen(false)} title={texts.recap.title} description={texts.recap.away(formatDuration(away))}>
      <ul className="flex flex-col gap-2">
        {lines.map((l, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 anim-deal" style={{ animationDelay: `${i * 80}ms` }}>
            <PixelIcon name={l.icon} className="text-accent" />
            <span className="flex-1 text-sm">{l.text}</span>
            {l.money !== undefined && <span className="nums font-semibold text-gold">+{formatMoney(l.money)}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={() => setOpen(false)}>{texts.recap.later}</Button>
        {collectable && (
          <Button variant="primary" loading={busy} onClick={collect}>
            {texts.recap.collect}
          </Button>
        )}
      </div>
    </Dialog>
  )
}

/** Mutti's 2–3 step tour of a freshly unlocked feature, on the page where it lives. */
export function FeatureTour({ player }: { player: Player }) {
  const { pathname } = useLocation()
  const seeTour = useSettings((s) => s.seeTour)
  const feature = unseenFeatures(player, useSettings((s) => s.seenTours)).find((f) => f.path === pathname)
  return feature ? <TourDock key={feature.key} tour={TOURS[feature.key]} onDone={() => seeTour(`${player.id}:${feature.key}`)} /> : null
}

type Tour = { name: string; steps: readonly string[] }
const TOURS: Record<(typeof FEATURES)[number]['key'], Tour> = texts.tour.features

function TourDock({ tour, onDone }: { tour: Tour; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const last = step === tour.steps.length - 1
  return (
    <aside className="panel mb-4 flex flex-wrap items-center gap-3 p-3 animate-fade-up" aria-live="polite" aria-label={texts.tour.title(tour.name)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tier-grail font-pixel text-xl text-accent-fg">M</span>
      <div className="min-w-64 flex-1">
        <p className="text-xs text-fg-3">
          <span className="font-semibold text-gain">{texts.tour.title(tour.name)}</span> · {step + 1} / {tour.steps.length}
        </p>
        <p className="text-sm leading-snug">{tour.steps[step]}</p>
      </div>
      <Button variant="primary" size="sm" onClick={() => (last ? onDone() : setStep(step + 1))}>
        {last ? texts.tour.done : texts.tour.next}
      </Button>
    </aside>
  )
}

/** Mutti's current message, on top of every page while the tutorial runs. */
export function TutorialBanner({ player }: { player: Player }) {
  return player.tutorial_step >= 0 ? <TutorialDock key={player.tutorial_step} step={player.tutorial_step} /> : null
}

function LevelUpOverlay() {
  const all = useWorld((s) => s.levelUps)
  const stageOpen = useWorld((s) => s.stageOpen)
  const queue = stageOpen ? [] : all
  const apply = useWorld((s) => s.apply)
  // Several level-ups at once collapse into one celebration of the highest.
  const top = queue.length ? queue.reduce((a, b) => (b.level > a.level ? b : a)) : null
  const reward = queue.reduce((s, l) => s + l.reward_cents, 0)
  const boosters = queue.filter((l) => l.booster).length
  const reached = (level: number) => queue.some((l) => l.level === level)
  const pages = top ? ALL_ITEMS.filter((i) => reached(i.level)) : []
  // Features inside an older page (Tagesquests, Schichten …) are listed too, with that page's icon.
  const inside = (top ? FEATURES.filter((f) => reached(f.level) && !pages.some((i) => i.path === f.path)) : []).map((f) => ({
    id: f.key,
    icon: ALL_ITEMS.find((i) => i.path === f.path)?.icon ?? 'star',
    name: TOURS[f.key].name,
  }))
  const unlocks = [...pages.map((i) => ({ id: i.id, icon: i.icon, name: texts.nav.items[i.id] })), ...inside]

  useEffect(() => {
    if (top) sfx('levelup')
  }, [top?.level]) // eslint-disable-line react-hooks/exhaustive-deps -- play once per celebration

  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        dx: (hash01(i, top?.level ?? 0) - 0.5) * 900,
        dy: -120 - hash01(i, 7) * 380,
        t: 900 + hash01(i, 9) * 900,
        c: ['var(--color-gold)', 'var(--color-accent)', 'var(--color-gain)', 'var(--color-info)', 'var(--color-tier-grail)'][i % 5],
      })),
    [top?.level],
  )

  if (!top) return null
  const close = () => apply({ levelUps: [] })
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/85" role="dialog" aria-label={texts.levelUp.title} onClick={close}>
      <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
        <div className="rays opacity-60" />
        <div className="relative">
          {confetti.map((c, i) => (
            <span key={i} className="particle" style={{ '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--t': `${c.t}ms`, background: c.c } as React.CSSProperties} />
          ))}
        </div>
      </div>
      <div className="panel-float relative w-[min(92vw,26rem)] p-6 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
        <p className="font-pixel text-2xl text-accent">{texts.levelUp.title}</p>
        <p className="font-pixel text-7xl leading-none text-gold anim-stamp">{top.level}</p>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <p className="text-fg-3">{texts.levelUp.reward}</p>
          <p className="nums font-pixel text-2xl text-gold">+{formatMoney(reward)}</p>
          {boosters > 0 && <p className="font-semibold text-accent">{boosters > 1 ? `+${boosters} Booster` : texts.levelUp.booster}</p>}
          <p className="text-fg-2">{texts.levelUp.skillPoint}</p>
        </div>
        {unlocks.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-fg-3">{texts.levelUp.unlocks}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {unlocks.map((u, i) => (
                <span key={u.id} className="flex items-center gap-1 rounded-lg bg-surface-3 px-2 py-1 text-sm font-semibold anim-deal" style={{ animationDelay: `${200 + i * 120}ms` }}>
                  <PixelIcon name={u.icon} className="text-accent" />
                  {u.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={close} autoFocus>
          {texts.levelUp.next}
        </Button>
      </div>
    </div>
  )
}

/** Ultra and Grail pulls of anyone on the server get announced. */
function BigPulls() {
  const pulls = useWorld((s) => s.bigPulls)
  const apply = useWorld((s) => s.apply)
  useEffect(() => {
    if (!pulls.length) return
    for (const p of pulls) {
      const name = String(p.data.name)
      const card = cardName(String(p.data.card_id))
      if (p.kind === 'pull_grail') {
        sfx('grail')
        toast('success', texts.bigPull.grail(name, card))
      } else {
        toast('info', texts.bigPull.ultra(name, card))
      }
    }
    apply({ bigPulls: [] })
  }, [pulls, apply])
  return null
}

/** Mutti's messages: one step at a time, each completes when the server sees the action. */
function TutorialDock({ step }: { step: number }) {
  const def = TUTORIAL[step]
  const act = useAct()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!def) return null

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold"
      >
        <PixelIcon name="chat" className="text-accent" /> {texts.tutorial.from}
      </button>
    )
  }

  const run = async (fn: 'tutorial_ack' | 'tutorial_skip') => {
    setBusy(true)
    await act(fn, {}, ['shop'])
    setBusy(false)
  }

  return (
    <aside className="panel mb-4 flex flex-wrap items-center gap-3 p-3 animate-fade-up" aria-live="polite">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tier-grail font-pixel text-xl text-accent-fg">M</span>
      <div className="min-w-64 flex-1">
        <p className="text-xs text-fg-3">
          <span className="font-semibold text-fg-2">{texts.tutorial.from}</span> · {step + 1} / {TUTORIAL.length}
        </p>
        <p className="text-sm leading-snug">{def.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {def.ack ? (
          <Button variant="primary" size="sm" loading={busy} onClick={() => run('tutorial_ack')}>
            {def.ack}
          </Button>
        ) : (
          def.path && (
            <Button variant="primary" size="sm" onClick={() => navigate(def.path!)} className={clsx('anim-nudge')}>
              {texts.tutorial.show}
            </Button>
          )
        )}
        {step >= 3 && (
          <Button size="sm" disabled={busy} onClick={() => run('tutorial_skip')}>
            {texts.tutorial.skip}
          </Button>
        )}
        <button type="button" onClick={() => setHidden(true)} className="text-xs text-fg-3 hover:text-fg">
          {texts.tutorial.hide}
        </button>
      </div>
    </aside>
  )
}
