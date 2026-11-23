import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { SKILL_BRANCHES, SKILL_COST, SKILLS, type SkillDef } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Skills } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.skills
const byKey = new Map(SKILLS.map((s) => [s.key, s]))

export function SkillsPage() {
  const q = useQuery({ queryKey: ['skills'], queryFn: () => rpc('skills_get') })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="skills" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <Tree d={d} />
      )}
    </Page>
  )
}

function Tree({ d }: { d: Skills }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [respec, setRespec] = useState(false)
  const owned = new Set(d.owned)
  const put = (doc: Skills) => client.setQueryData(['skills'], doc)

  const learn = async (s: SkillDef) => {
    setBusy(s.key)
    const res = await act('skill_learn', { p_key: s.key }, ['upgrades', 'grading'])
    setBusy(null)
    if (res) {
      put(res)
      sfx(s.tier === 4 ? 'ultra' : 'success')
      toast('success', T.learned(s.name))
    }
  }
  const doRespec = async () => {
    setBusy('respec')
    const res = await act('skills_respec', {}, ['upgrades', 'grading'])
    setBusy(null)
    setRespec(false)
    if (res) {
      put(res)
      sfx('error')
      toast('info', T.respecDone)
    }
  }
  const bailout = async () => {
    setBusy('bailout')
    const res = await act('bailout_claim', {})
    setBusy(null)
    if (res) {
      put(res)
      sfx('coin')
      toast('success', T.bailoutPaid(formatMoney(res.paid_cents)))
    }
  }

  return (
    <>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel tour="skills-points" title={T.points} tip={T.pointsTip}>
          <p className="nums text-3xl font-bold tracking-tight">{d.points}</p>
          <p className="text-sm text-fg-3">{T.spent(d.spent)}</p>
        </Panel>
        <Panel tour="skills-respec" title={T.respec} tip={T.respecTip}>
          <p className="nums text-xl font-bold text-gold">{formatMoney(d.respec_cents)}</p>
          <Button className="mt-2" size="sm" variant="danger" disabled={d.spent === 0 || busy !== null} onClick={() => setRespec(true)}>
            {T.respec}
          </Button>
        </Panel>
        {d.bailout.owned && (
          <Panel title={T.bailoutTitle} tip={T.bailoutTip}>
            <p className="text-sm text-fg-2">
              {d.bailout.used ? T.bailoutUsed : d.bailout.ready ? T.bailoutReady(formatMoney(d.bailout.cents)) : T.bailoutWaiting}
            </p>
            {d.bailout.ready && (
              <Button className="mt-2" size="sm" variant="primary" loading={busy === 'bailout'} onClick={() => void bailout()}>
                {T.bailoutClaim}
              </Button>
            )}
          </Panel>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {SKILL_BRANCHES.map((b) => {
          const nodes = SKILLS.filter((s) => s.branch === b.key)
          const key = nodes.find((s) => s.tier === 4)!
          return (
            <Panel key={b.key} tour="skills-branch" title={b.name} tip={T.branchTip}>
              <p className="-mt-1 mb-3 text-sm text-fg-2">{b.text}</p>
              <div className="@container">
                <div className="grid gap-2 @sm:grid-cols-2">
                  {[0, 1].map((line) => (
                    <div key={line} className="flex flex-col gap-2">
                      {nodes
                        .filter((s) => s.line === line)
                        .sort((a, c) => a.tier - c.tier)
                        .map((s) => (
                          <Node key={s.key} s={s} owned={owned} points={d.points} busy={busy} onLearn={learn} />
                        ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <Node s={key} owned={owned} points={d.points} busy={busy} onLearn={learn} />
              </div>
            </Panel>
          )
        })}
      </div>

      {respec && (
        <Dialog open onOpenChange={(o) => !o && setRespec(false)} title={T.respecTitle}>
          <p className="text-sm text-fg-2">{T.respecText(formatMoney(d.respec_cents))}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setRespec(false)}>{texts.common.cancel}</Button>
            <Button variant="danger" loading={busy === 'respec'} onClick={() => void doRespec()}>
              {T.respecConfirm}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  )
}

function Node({
  s,
  owned,
  points,
  busy,
  onLearn,
}: {
  s: SkillDef
  owned: Set<string>
  points: number
  busy: string | null
  onLearn: (s: SkillDef) => Promise<void>
}) {
  const has = owned.has(s.key)
  const missing = s.requires.filter((r) => !owned.has(r))
  const cost = SKILL_COST[s.tier]
  const key = s.tier === 4
  return (
    <div
      className={clsx(
        'flex flex-col gap-1.5 rounded-xl p-3 text-sm outline-2 -outline-offset-2',
        has ? 'bg-surface-3 outline-accent' : 'bg-surface-2 outline-transparent',
        !has && missing.length > 0 && 'opacity-60',
      )}
    >
      <p className="flex min-w-0 items-center gap-1.5 font-semibold break-words">
        <PixelIcon name={has ? 'check' : missing.length ? 'lock' : key ? 'crown' : 'skills'} className={has ? 'text-gain' : 'text-accent'} />
        {s.name}
      </p>
      {key && <p className="eyebrow">{T.keystone}</p>}
      <p className="text-xs text-fg-2">{s.text}</p>
      {has ? (
        <p className="text-xs font-semibold text-gain">{T.owned}</p>
      ) : missing.length > 0 ? (
        <p className="text-xs text-fg-3">{T.needs(missing.map((m) => byKey.get(m)?.name ?? m).join(', '))}</p>
      ) : (
        <Button size="sm" className="mt-auto" disabled={points < cost || busy !== null} loading={busy === s.key} onClick={() => void onLearn(s)}>
          {T.learn(cost)}
        </Button>
      )}
    </div>
  )
}
