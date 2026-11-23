import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { LUXURY } from '../../../content/mogul.ts'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useStats } from '@/lib/actions.ts'
import { ACHIEVEMENTS, STAT_LABELS } from '@/lib/catalog.ts'
import { fillCount, formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useSetMe, useWorld } from '@/lib/world.ts'
import { HonorBadge } from '@/features/players/Loans.tsx'
import { texts } from '@/texts/de.ts'
import { Guestbook, HomeCard } from './HomeAndGuestbook.tsx'
import { Trophies } from './PlayerProfilePage.tsx'
import { useProfile, VitrinePanel } from './Vitrine.tsx'

const T = texts.profile

export function ProfilePage() {
  const stats = useStats()
  const profile = useProfile(null)
  const player = useMe().data?.player
  const act = useAct()
  const client = useQueryClient()

  const setTitle = async (title: string | null) => {
    const res = await act('title_set', { p_title: title }, ['stats'])
    if (res) sfx('toggle')
    void client.invalidateQueries({ queryKey: ['stats'] })
  }

  return (
    <Page icon="star" title={T.title} subtitle={T.subtitle}>
      {stats.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : stats.isError ? (
        <ErrorState message={errorText(stats.error)} onRetry={() => void stats.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={player.username} look={profile.data?.look} size={64} className="m-1" />
              <div className="min-w-0 flex-1">
                <p className="text-3xl leading-none font-bold tracking-tight">
                  <PlayerName name={player.username} look={profile.data?.look} />
                </p>
                {player.title && <p className="font-semibold text-accent">{player.title}</p>}
                <p className="mt-1 text-sm text-fg-2">
                  Level {player.level} · <span className="nums text-gold">{formatMoney(player.net_worth_cents)}</span>
                </p>
                {profile.data && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-3">
                    {texts.loans.honor}: <HonorBadge honor={profile.data.honor} record />
                  </p>
                )}
              </div>
            </div>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="text-fg-3">
                {T.titleLabel} · {T.titleTip}
              </span>
              <select
                className="panel-inset bg-transparent px-2 py-1 text-fg"
                value={stats.data.title ?? ''}
                onChange={(e) => void setTitle(e.target.value || null)}
              >
                <option value="">{T.noTitle}</option>
                {stats.data.titles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </Panel>

          {profile.data && <Trophies p={profile.data} />}
          {profile.data && <HomeCard p={profile.data} />}
          {profile.data && <VitrinePanel profile={profile.data} />}
          {profile.data && <LuxuryPanel id={profile.data.id} />}
          {profile.data && <Guestbook p={profile.data} />}

          <Panel title={T.stats} tip={T.statsTip}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {Object.entries(STAT_LABELS)
                .filter(([k]) => stats.data.counters[k])
                .map(([k, label]) => (
                  <div key={k} className="flex justify-between border-b border-line py-1">
                    <dt className="text-fg-2">{label}</dt>
                    <dd className="nums font-semibold">{formatNumber(Math.floor(stats.data.counters[k] ?? 0))}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <Panel title={T.achievements} tip={T.achievementsTip} className="xl:col-span-2">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {ACHIEVEMENTS.map((a) => {
                const tier = stats.data.achievements.find((x) => x.key === a.key)?.tier ?? 0
                const next = a.tiers[tier]
                const have = stats.data.counters[a.event] ?? 0
                const done = next === undefined
                return (
                  <div key={a.key} className={clsx('flex items-center gap-3 rounded-xl bg-surface-2 p-3', tier === 0 && 'opacity-60')}>
                    <PixelIcon name={done ? 'trophy' : tier > 0 ? 'star' : 'lock'} scale={2} className={done ? 'text-gold' : tier > 0 ? 'text-accent' : 'text-fg-3'} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {a.name} <span className="nums text-xs font-normal text-fg-3">{T.tierOf(tier, a.tiers.length)}</span>
                      </p>
                      <p className="text-xs text-fg-3">{fillCount(a.text, next ?? a.tiers.at(-1)!)}</p>
                      {!done && <Progress value={have / next} tone="gold" className="mt-1" />}
                      {done && <p className="text-xs text-gain">{T.done}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <AccountPanel player={player} />
          <DangerZone player={player} />
        </div>
      )}
    </Page>
  )
}

/** Login data: the username and the e-mail (only its owner ever sees it). */
function AccountPanel({ player }: { player: Player }) {
  const q = useQuery({ queryKey: ['account'], queryFn: () => rpc('account_get') })
  const act = useAct()
  const client = useQueryClient()
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const value = draft ?? q.data?.email ?? ''

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await act('account_email_set', { p_email: value })
    setBusy(false)
    if (!res) return
    client.setQueryData(['account'], res)
    setDraft(null)
    sfx('success')
    toast('success', T.accountSaved)
  }

  return (
    <Panel title={T.account} tip={T.accountTip} className="xl:col-span-2">
      {q.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : q.isError ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <form onSubmit={save} className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-fg-3">{T.accountName}</span>
            <span className="text-lg font-semibold">{player.username}</span>
            {!q.data.email && <span className="text-fg-2">{T.accountNoEmail}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <Field
              label={T.accountEmail}
              type="email"
              autoComplete="email"
              maxLength={254}
              value={value}
              onChange={(e) => setDraft(e.target.value)}
              required
            />
            <Button type="submit" size="sm" className="self-start" loading={busy} disabled={busy || value.trim() === (q.data.email ?? '')}>
              {T.accountSave}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}

function DangerZone({ player }: { player: Player }) {
  const act = useAct()
  const setMe = useSetMe()
  const client = useQueryClient()
  const reset = useWorld((s) => s.reset)
  const [confirm, setConfirm] = useState({ reset: '', delete: '' })
  const ok = (v: string) => v.trim().toLowerCase() === player.username.toLowerCase()

  const run = async (fn: 'account_reset' | 'account_delete') => {
    const res = await act(fn, { p_confirm: fn === 'account_reset' ? confirm.reset : confirm.delete })
    if (!res) return
    reset()
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'atlas' })
    setMe(res)
    sfx('error')
    if (fn === 'account_reset') toast('info', T.resetDone)
  }

  return (
    <Panel title={T.danger} tip={T.dangerTip} className="xl:col-span-2">
      <div className="grid gap-4 md:grid-cols-2">
        {(['reset', 'delete'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-3 bg-loss/10 p-3 outline-2 -outline-offset-2 outline-loss/40">
            <p className="text-xl font-bold text-loss">{k === 'reset' ? T.resetTitle : T.deleteTitle}</p>
            <p className="text-sm text-fg-2">{k === 'reset' ? T.resetBody : T.deleteBody}</p>
            <Field
              label={T.confirmLabel(player.username)}
              value={confirm[k]}
              onChange={(e) => setConfirm({ ...confirm, [k]: e.target.value })}
              autoComplete="off"
            />
            <HoldButton disabled={!ok(confirm[k])} onHold={() => void run(k === 'reset' ? 'account_reset' : 'account_delete')}>
              {k === 'reset' ? T.resetTitle : T.deleteTitle} · {T.hold}
            </HoldButton>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/** Luxus on the profile: what the player has blown money on. */
function LuxuryPanel({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['luxury', id], queryFn: () => rpc('luxury_get', { p_player: id }) })
  if (!q.data) return null
  return (
    <Panel title={texts.luxury.profile} tip={texts.luxury.tip}>
      {q.data.owned.length === 0 ? (
        <p className="text-sm text-fg-3">{texts.luxury.profileEmpty}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {q.data.owned.map((o) => (
            <li key={o.key} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm font-semibold">
              <PixelIcon name="diamond" className="text-gold" /> {LUXURY.find((l) => l.key === o.key)?.name ?? o.key}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
