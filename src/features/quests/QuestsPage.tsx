import { useState } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useQuests } from '@/lib/actions.ts'
import { MINI_QUESTS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Quests } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { useQueryClient } from '@tanstack/react-query'

const T = texts.quests

export const questText = (template: string, target: number) =>
  (MINI_QUESTS.find((q) => q.key === template)?.text ?? template).replace('{n}', String(target))

export function QuestList({ quests, compact }: { quests: Quests; compact?: boolean }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<number | null>(null)

  const claim = async (id: number) => {
    setBusy(id)
    const res = await act('quest_claim', { p_quest: id })
    setBusy(null)
    if (res) {
      sfx('stamp')
      client.setQueryData(['quests'], res)
      if (res.bonus_booster) toast('success', T.bonusGot)
    }
  }

  return (
    <div className="flex flex-col gap-2" data-tour="quests">
      {quests.mini.map((q) => {
        const done = q.progress >= q.target
        return (
          <div key={q.id} className="flex items-center gap-3 bg-surface-2 p-2 animate-fade-up">
            <PixelIcon name={done ? 'check' : 'scroll'} className={done ? 'text-gain' : 'text-fg-3'} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{questText(q.template, q.target)}</p>
              <div className="mt-1 flex items-center gap-2">
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
            <Button size="sm" variant={done ? 'primary' : 'neutral'} disabled={!done} loading={busy === q.id} onClick={() => claim(q.id)} className={done ? 'anim-nudge' : undefined}>
              {T.claim}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export function QuestsPage() {
  const quests = useQuests()
  return (
    <Page icon="scroll" title={T.title} subtitle={T.subtitle}>
      <Panel title={T.mini} tip={T.miniTip}>
        {quests.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : quests.isError ? (
          <ErrorState message={errorText(quests.error)} onRetry={() => void quests.refetch()} />
        ) : (
          <>
            <QuestList quests={quests.data} />
            <div className="mt-4 flex items-center gap-3">
              <PixelIcon name="gift" className="text-gold" />
              <span className="text-sm text-fg-2">{T.bonusProgress(quests.data.claimed_total, quests.data.bonus_every)}</span>
              <Progress value={(quests.data.claimed_total % quests.data.bonus_every) / quests.data.bonus_every} tone="gold" className="max-w-56" />
            </div>
          </>
        )}
        <p className="mt-4 text-xs text-fg-3">{T.more}</p>
      </Panel>
    </Page>
  )
}
