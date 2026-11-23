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
import { fillCount, formatMoney } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Quest, Quests } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.quests

const template = (key: string) => ALL_QUESTS.find((q) => q.key === key)
export const questText = (key: string, target: number) => fillCount(template(key)?.text ?? key, target)

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
    if (res) sfx(fn === 'quest_claim' ? 'quest' : 'toggle')
  }

  return (
    <div className="flex flex-col gap-2" data-tour="quests">
      {list.map((q) => {
        const done = q.progress >= q.target
        const path = template(q.template)?.path
        const text = questText(q.template, q.target)
        if (compact) {
          return (
            <div key={q.id} className={clsx('flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 animate-fade-up', q.claimed && 'opacity-50')}>
              <PixelIcon name={done ? 'check' : 'scroll'} className={done ? 'text-gain' : 'text-fg-3'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" title={text}>
                  {text}
                </p>
                <Progress value={q.progress / q.target} tone={done ? 'gain' : 'accent'} className="mt-1.5" />
              </div>
              {done && !q.claimed ? (
                <Button size="sm" variant="primary" loading={busy === `c${q.id}`} onClick={() => go(`c${q.id}`, 'quest_claim', q.id)} className="anim-nudge">
                  {T.claim}
                </Button>
              ) : (
                <span className="nums shrink-0 text-xs text-fg-3">{q.claimed ? T.claimed : `${q.progress}/${q.target}`}</span>
              )}
            </div>
          )
        }
        return (
          <div key={q.id} className={clsx('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface-2 p-3 animate-fade-up', q.claimed && 'opacity-50')}>
            <PixelIcon name={done ? 'check' : 'scroll'} className={done ? 'text-gain' : 'text-fg-3'} />
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm">{text}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Progress value={q.progress / q.target} tone={done ? 'gain' : 'accent'} className="w-32 shrink-0" />
                <span className="nums text-xs text-fg-3">
                  {q.progress}/{q.target}
                </span>
                <span className="nums text-xs text-fg-3">{T.reward(formatMoney(q.reward_cents), q.reward_ep, q.reward_pfandbons)}</span>
              </div>
            </div>
            {q.claimed ? (
              <span className="ml-auto font-pixel text-sm text-gain anim-stamp">{T.claimed}</span>
            ) : (
              <div className="ml-auto flex items-center gap-1">
                {!done && path && (
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

/** The Stempelkarte; `compact` shows only the day squares (home tile). */
export function Stamps({ q, compact }: { q: Quests; compact?: boolean }) {
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
  const canStamp = !s.today_done && s.days < 7
  const buttons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" size={compact ? 'sm' : 'md'} disabled={!canStamp} loading={busy === 's'} onClick={() => stamp(false)} className={canStamp ? 'anim-nudge' : undefined}>
        {s.today_done ? texts.stamps.done : texts.stamps.claim}
      </Button>
      {s.joker_available && (
        <Button size={compact ? 'sm' : 'md'} loading={busy === 'j'} onClick={() => stamp(true)}>
          {texts.stamps.joker}
        </Button>
      )}
    </div>
  )
  const today = Math.min(s.days, 6)
  return (
    <div>
      <div className={clsx('grid grid-cols-7', compact ? 'gap-1.5' : 'gap-2')}>
        {s.rewards.map((cents, i) => (
          <div
            key={i}
            className={clsx(
              'flex flex-col items-center justify-center rounded-xl text-center',
              compact ? 'aspect-square' : 'gap-1 p-2.5',
              i < s.days ? 'bg-grad text-white' : 'bg-surface-2 text-fg-2',
              i === s.days && canStamp && 'shadow-[inset_0_0_0_2px_var(--color-accent),0_0_18px_rgb(125_92_255/0.45)]',
            )}
          >
            {i < s.days ? (
              <PixelIcon name="check" scale={compact ? 1 : 2} className="anim-stamp" />
            ) : compact ? (
              i === 6 ? <PixelIcon name="pack" /> : <span className="font-bold">{i + 1}</span>
            ) : (
              <>
                <span className="text-lg font-bold">{i + 1}</span>
                <PixelIcon name={i === 6 ? 'pack' : 'coin'} className="text-fg-3" />
              </>
            )}
            {/* on phones the amounts would overlap; the next one is shown next to the button */}
            {!compact && <span className="nums text-xs whitespace-nowrap text-gold max-sm:hidden">{formatMoney(cents)}</span>}
          </div>
        ))}
      </div>
      {compact ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {buttons}
          <span className="nums text-sm text-fg-3">{texts.stamps.next(formatMoney(s.rewards[today] ?? 0))}</span>
        </div>
      ) : (
        <div className="mt-4">{buttons}</div>
      )}
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
        <div className="flex flex-col gap-4">
          <Panel title={texts.stamps.title} tip={texts.stamps.tip}>
            <Stamps q={q} />
          </Panel>
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
