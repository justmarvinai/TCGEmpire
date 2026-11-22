import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useQuests } from '@/lib/actions.ts'
import { ALL_QUESTS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Quest, Quests } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.quests

const template = (key: string) => ALL_QUESTS.find((q) => q.key === key)
export const questText = (key: string, target: number) => (template(key)?.text ?? key).replace('{n}', String(target))

/** Claims, rerolls and stamps all answer with the whole quest document. */
function useQuestAction() {
  const act = useAct()
  const client = useQueryClient()
  return async (fn: 'quest_claim' | 'quest_reroll' | 'stamp_claim', args: Record<string, unknown>) => {
    const res = await act(fn, args, ['shop'])
    if (res) {
      client.setQueryData(['quests'], res)
      if (res.bonus_booster) toast('success', T.bonusGot)
    }
    return res
  }
}

export function QuestList({ quests, list, reroll, compact }: { quests: Quests; list: Quest[]; reroll?: boolean; compact?: boolean }) {
  const run = useQuestAction()
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (key: string, fn: 'quest_claim' | 'quest_reroll', id: number) => {
    setBusy(key)
    const res = await run(fn, { p_quest: id })
    setBusy(null)
    if (res) sfx(fn === 'quest_claim' ? 'stamp' : 'toggle')
  }

  return (
    <div className="flex flex-col gap-2" data-tour="quests">
      {list.map((q) => {
        const done = q.progress >= q.target
        const path = template(q.template)?.path
        return (
          <div key={q.id} className={clsx('flex items-center gap-3 bg-surface-2 p-2 animate-fade-up', q.claimed && 'opacity-50')}>
            <PixelIcon name={done ? 'check' : 'scroll'} className={done ? 'text-gain' : 'text-fg-3'} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{questText(q.template, q.target)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Progress value={q.progress / q.target} tone={done ? 'gain' : 'accent'} className="max-w-48" />
                <span className="nums text-xs text-fg-3">
                  {q.progress}/{q.target}
                </span>
                {!compact && (
                  <span className="nums text-xs text-fg-3">
                    · {formatMoney(q.reward_cents)} · {q.reward_ep} EP · {q.reward_pfandbons} Pfandbon
                  </span>
                )}
              </div>
            </div>
            {q.claimed ? (
              <span className="font-pixel text-sm text-gain anim-stamp">{T.claimed}</span>
            ) : (
              <div className="flex items-center gap-1">
                {!done && path && !compact && (
                  <Link to={path} className="px-2 text-xs font-semibold text-accent hover:underline">
                    {T.go}
                  </Link>
                )}
                {reroll && quests.reroll_free && !done && (
                  <Button size="sm" loading={busy === `r${q.id}`} onClick={() => go(`r${q.id}`, 'quest_reroll', q.id)}>
                    {T.reroll}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={done ? 'primary' : 'neutral'}
                  disabled={!done}
                  loading={busy === `c${q.id}`}
                  onClick={() => go(`c${q.id}`, 'quest_claim', q.id)}
                  className={done ? 'anim-nudge' : undefined}
                >
                  {T.claim}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Stamps({ q }: { q: Quests }) {
  const run = useQuestAction()
  const [busy, setBusy] = useState<string | null>(null)
  const s = q.stamps
  const stamp = async (joker: boolean) => {
    setBusy(joker ? 'j' : 's')
    const res = await run('stamp_claim', { p_joker: joker })
    setBusy(null)
    if (res) sfx('stamp')
  }
  if (!s.unlocked) return <p className="text-sm text-fg-3">{texts.stamps.locked(s.unlock_level)}</p>
  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {s.rewards.map((cents, i) => (
          <div
            key={i}
            className={clsx(
              'flex flex-col items-center gap-1 p-2 text-center outline-2 -outline-offset-2',
              i < s.days ? 'bg-surface-3 outline-gain' : 'bg-surface-2 outline-line',
            )}
          >
            <span className="font-pixel text-lg">{i + 1}</span>
            {i < s.days ? <PixelIcon name="check" scale={2} className="text-gain anim-stamp" /> : <PixelIcon name={i === 6 ? 'pack' : 'coin'} scale={2} className="text-fg-3" />}
            <span className="nums text-[0.625rem] text-gold">{formatMoney(cents)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" disabled={s.today_done || s.days >= 7} loading={busy === 's'} onClick={() => stamp(false)} className={!s.today_done && s.days < 7 ? 'anim-nudge' : undefined}>
          {s.today_done ? texts.stamps.done : texts.stamps.claim}
        </Button>
        {s.joker_available && (
          <Button loading={busy === 'j'} onClick={() => stamp(true)}>
            {texts.stamps.joker}
          </Button>
        )}
      </div>
    </div>
  )
}

export function QuestsPage() {
  const quests = useQuests()
  const q = quests.data
  return (
    <Page icon="scroll" title={T.title} subtitle={T.subtitle}>
      {quests.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : quests.isError || !q ? (
        <ErrorState message={errorText(quests.error)} onRetry={() => void quests.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title={T.daily} tip={T.dailyTip}>
            {q.daily.length === 0 ? (
              <EmptyState icon="lock" title={T.dailyLocked(q.unlock_daily)} />
            ) : (
              <>
                <QuestList quests={q} list={q.daily} reroll />
                <p className={clsx('mt-3 text-sm', q.daily_bonus_done ? 'text-gain' : 'text-fg-2')}>
                  <PixelIcon name="gift" className="mr-1 inline text-gold" />
                  {q.daily_bonus_done ? T.bonusDone : T.dailyBonus(formatMoney(q.daily_bonus_cents))}
                </p>
              </>
            )}
          </Panel>
          <Panel title={texts.stamps.title} tip={texts.stamps.tip}>
            <Stamps q={q} />
          </Panel>
          <Panel title={T.mini} tip={T.miniTip}>
            <QuestList quests={q} list={q.mini} />
            <div className="mt-4 flex items-center gap-3">
              <PixelIcon name="gift" className="text-gold" />
              <span className="text-sm text-fg-2">{T.bonusProgress(q.claimed_total, q.bonus_every)}</span>
              <Progress value={(q.claimed_total % q.bonus_every) / q.bonus_every} tone="gold" className="max-w-56" />
            </div>
          </Panel>
          <Panel title={T.weekly} tip={T.weeklyTip}>
            {q.weekly.length === 0 ? (
              <EmptyState icon="lock" title={T.weeklyLocked(q.unlock_weekly)} />
            ) : (
              <>
                <QuestList quests={q} list={q.weekly} />
                <p className={clsx('mt-3 text-sm', q.weekly_bonus_done ? 'text-gain' : 'text-fg-2')}>
                  <PixelIcon name="gift" className="mr-1 inline text-gold" />
                  {q.weekly_bonus_done ? T.bonusDone : T.weeklyChest(q.weekly_chest_boosters)}
                </p>
              </>
            )}
          </Panel>
        </div>
      )}
    </Page>
  )
}
