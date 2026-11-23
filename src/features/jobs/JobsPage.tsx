import clsx from 'clsx'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useJobs } from '@/lib/actions.ts'
import { JOBS, RANKS, SHIFT_HOURS } from '@/lib/catalog.ts'
import { formatDuration, formatMoney, formatNumber } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Jobs, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { Game, type GameKey } from './games.tsx'

const T = texts.jobs
const jobDef = (key: string) => JOBS.find((j) => j.key === key)

/** Server time in ms, refreshed every second (0 before the first tick). */
function useServerNow() {
  const now = useNow()
  const offset = useWorld((s) => s.clockOffsetMs)
  return now > 0 ? now + offset : 0
}

export function JobsPage() {
  const jobs = useJobs()
  const player = useMe().data?.player
  return (
    <Page icon="briefcase" title={T.title} subtitle={T.subtitle}>
      {jobs.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : jobs.isError ? (
        <ErrorState message={errorText(jobs.error)} onRetry={() => void jobs.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <Minijobs jobs={jobs.data} player={player} />
          <Shifts jobs={jobs.data} player={player} />
        </div>
      )}
    </Page>
  )
}

// ----------------------------------------------------------------------------------------------
function Minijobs({ jobs, player }: { jobs: Jobs; player: Player }) {
  const act = useAct()
  const now = useServerNow()
  const [run, setRun] = useState<{ id: string; game: GameKey; duration: number } | null>(null)
  const [result, setResult] = useState<{ game: string; payout: number; ep: number; bons: number; buff: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const start = async (game: GameKey) => {
    setBusy(game)
    setResult(null)
    const res = await act('minigame_start', { p_game: game })
    setBusy(null)
    if (res) setRun({ id: res.run_id, game, duration: res.duration_s })
  }

  const finish = useCallback(
    async (score: number, count: number) => {
      if (!run) return
      const res = await act('minigame_finish', { p_run: run.id, p_score: score, p_bottles: count }, ['quests'])
      setRun(null)
      if (res) {
        setResult({ game: run.game, payout: res.payout_cents, ep: res.ep_gained, bons: res.pfandbons, buff: res.buff })
        sfx('coin')
      }
    },
    [act, run],
  )

  const games = jobs.jobs.filter((j) => j.minigame)
  return (
    <Panel title={T.minijobs} tip={T.minijobsTip}>
      {run ? (
        <div data-tour="minigame">
          <Game game={run.game} duration={run.duration} onDone={finish} />
        </div>
      ) : (
        <>
          {result && (
            <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-2 p-4 animate-pop">
              <span className="font-pixel text-xl">{T.resultTitle}</span>
              <span className="nums font-pixel text-2xl text-gold anim-stamp">+{formatMoney(result.payout)}</span>
              <span className="nums text-sm text-fg-2">
                +{result.ep} {T.epGained}
              </span>
              {result.bons > 0 && <span className="text-sm text-gain">{T.pfandbon}</span>}
              {result.buff && <span className="text-sm text-gain">{T.buff[result.game]}</span>}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {games.map((j) => {
              const def = jobDef(j.key)
              const locked = player.level < j.min_level
              const energy = j.energy ?? 0
              return (
                <div key={j.key} className={clsx('flex flex-col gap-2 rounded-2xl bg-surface-2 p-4', locked && 'opacity-50')}>
                  <p className="flex items-center gap-2 font-semibold">
                    <PixelIcon name={locked ? 'lock' : 'briefcase'} className="text-accent" />
                    {T.minigameNames[j.minigame!]}
                    <span className="text-xs font-normal text-fg-3">{T.employer(def?.employer ?? '')}</span>
                  </p>
                  <p className="text-sm text-fg-2">{T.minigameBodies[j.minigame!]}</p>
                  <div className="mt-auto flex items-center gap-3">
                    <Button
                      variant="primary"
                      loading={busy === j.minigame}
                      disabled={locked || player.energy < energy || busy !== null}
                      onClick={() => start(j.minigame as GameKey)}
                      data-tour={j.minigame === 'pfand' ? 'pfand' : undefined}
                    >
                      {locked ? texts.nav.lockedLevel(j.min_level) : T.start}
                    </Button>
                    <span className="flex items-center gap-1 text-sm text-info">
                      <PixelIcon name="bolt" /> {T.energyCost(energy)}
                    </span>
                  </div>
                  {!locked && player.energy < energy && now > 0 && (
                    <p className="text-xs text-fg-3">{T.noEnergy(formatDuration(energyWait(player, energy, now)))}</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

/** Seconds until there is enough energy (interpolated from the server's rate). */
function energyWait(p: Player, need: number, serverMs: number) {
  const since = (serverMs - Date.parse(p.energy_at)) / 1000
  return Math.max(0, (need - p.energy) * p.energy_regen_s - (since % p.energy_regen_s))
}

// ----------------------------------------------------------------------------------------------
function Shifts({ jobs, player }: { jobs: Jobs; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const now = useServerNow()
  const shiftJobs = jobs.jobs.filter((j) => j.shifts)
  const [job, setJob] = useState(shiftJobs.find((j) => player.level >= j.min_level)?.key ?? '')
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (fn: 'shift_start' | 'shift_checkin' | 'shift_claim', args: Record<string, unknown> = {}) => {
    setBusy(fn)
    const res = await act(fn, args, ['quests'])
    setBusy(null)
    if (!res) return
    client.setQueryData(['jobs'], { unlock_shifts: res.unlock_shifts, checkin_bonus_pct: res.checkin_bonus_pct, jobs: res.jobs, shift: res.shift })
    if (fn === 'shift_claim' && 'result' in res) {
      sfx('coin')
      toast('success', T.earned(formatMoney(res.result.wage_cents)))
    } else sfx(fn === 'shift_checkin' ? 'stamp' : 'toggle')
  }

  if (player.level < jobs.unlock_shifts) {
    return (
      <Panel tour="shifts" title={T.shifts} tip={T.shiftsTip}>
        <EmptyState icon="lock" title={T.shiftsLocked(jobs.unlock_shifts)} />
      </Panel>
    )
  }

  const s = jobs.shift
  if (s) {
    const total = Date.parse(s.ends_at) - Date.parse(s.started_at)
    const elapsed = now > 0 ? Math.min(total, now - Date.parse(s.started_at)) : 0
    const done = s.done || (now > 0 && now >= Date.parse(s.ends_at))
    const canCheckin = !done && s.checkins < s.checkin_max && now >= Date.parse(s.next_checkin_at)
    const def = jobDef(s.job)
    return (
      <Panel tour="shifts" title={T.shifts} tip={T.shiftsTip}>
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
          <p className="flex items-center gap-2 font-semibold">
            <PixelIcon name="clock" className="text-accent" />
            {def?.name} <span className="text-xs font-normal text-fg-3">{T.employer(def?.employer ?? '')}</span>
            <span className="nums ml-auto text-lg font-bold text-gold">{formatMoney(s.wage_cents)}</span>
          </p>
          <Progress value={total > 0 ? elapsed / total : 1} tone={done ? 'gain' : 'accent'} />
          <p className="text-sm text-fg-2">{done ? T.done : T.endsIn(formatDuration((total - elapsed) / 1000))}</p>
          <p className="text-xs text-fg-3">{T.checkins(s.checkins, s.checkin_max, jobs.checkin_bonus_pct)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {done ? (
              <Button variant="primary" className="anim-nudge" loading={busy === 'shift_claim'} onClick={() => run('shift_claim')}>
                {T.claim}
              </Button>
            ) : (
              <>
                <Button variant="primary" disabled={!canCheckin} loading={busy === 'shift_checkin'} onClick={() => run('shift_checkin')} className={canCheckin ? 'anim-nudge' : undefined}>
                  {canCheckin || s.checkins >= s.checkin_max ? T.checkin : T.checkinIn(formatDuration((Date.parse(s.next_checkin_at) - now) / 1000))}
                </Button>
                <Button loading={busy === 'shift_claim'} onClick={() => run('shift_claim')}>
                  {T.stop}
                </Button>
                <InfoTip>{T.stopTip}</InfoTip>
              </>
            )}
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <Panel tour="shifts" title={T.shifts} tip={T.shiftsTip}>
      <div className="flex flex-col gap-2">
        {shiftJobs.map((j) => {
          const def = jobDef(j.key)
          const locked = player.level < j.min_level
          return (
            <label
              key={j.key}
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 p-3 outline-2 -outline-offset-2',
                job === j.key ? 'outline-accent' : 'outline-transparent',
                locked && 'cursor-not-allowed opacity-50',
              )}
            >
              <input type="radio" name="job" className="accent-accent" disabled={locked} checked={job === j.key} onChange={() => setJob(j.key)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {def?.name} <span className="text-xs font-normal text-fg-3">{T.employer(def?.employer ?? '')}</span>
                </p>
                <p className="text-xs text-fg-3">
                  {T.rank}: {RANKS[j.rank]?.name} · {T.hoursWorked(formatNumber(Math.floor(j.hours)))}
                </p>
              </div>
              {locked ? (
                <span className="text-xs text-fg-3">{texts.nav.lockedLevel(j.min_level)}</span>
              ) : (
                <span className="nums text-right font-semibold text-gold">
                  {formatMoney(j.wage_cents ?? 0)}
                  <span className="block text-xs font-normal text-fg-3">{T.perHour}</span>
                </span>
              )}
            </label>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SHIFT_HOURS.map((h) => (
          <Button key={h} variant={h === 1 ? 'primary' : 'neutral'} disabled={!job || busy !== null} loading={busy === 'shift_start'} onClick={() => run('shift_start', { p_job: job, p_hours: h })}>
            {T.lengths[String(h)]}
          </Button>
        ))}
      </div>
    </Panel>
  )
}
