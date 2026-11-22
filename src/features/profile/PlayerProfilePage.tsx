import { Link, useParams } from 'react-router'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Card } from '@/components/cards/Card.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { cardName } from '@/lib/catalog.ts'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { formatDate, formatMoney, formatNumber } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Profile } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'
import { Guestbook, HomeCard } from './HomeAndGuestbook.tsx'
import { useProfile, VitrinePanel } from './Vitrine.tsx'

const T = texts.profile

/** Another player's profile: who they are, a few numbers and their Vitrine. */
export function PlayerProfilePage() {
  const { id = '' } = useParams()
  const q = useProfile(id)
  return (
    <Page icon="people" title={q.data?.name ?? texts.players.title} subtitle={q.data ? (q.data.title ?? T.visitSubtitle(q.data.level)) : texts.players.subtitle}>
      <Link to="/players" className="mb-4 inline-block text-sm font-semibold text-fg-2 hover:text-fg">
        ← {texts.players.back}
      </Link>
      {q.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !q.data ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ProfileHeader p={q.data} />
          <ProfileNumbers p={q.data} />
          <Trophies p={q.data} />
          <HomeCard p={q.data} />
          <VitrinePanel profile={q.data} />
          <Guestbook p={q.data} />
        </div>
      )}
    </Page>
  )
}

export function ProfileHeader({ p }: { p: Profile }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={p.name} look={p.look} size={64} className="m-1" />
        <div className="min-w-0 flex-1">
          <p className="text-3xl leading-none font-bold tracking-tight">
            <PlayerName name={p.name} look={p.look} />
          </p>
          {p.title && <p className="font-semibold text-accent">{p.title}</p>}
          <p className="mt-1 text-sm text-fg-2">
            Level {p.level} · <span className="nums text-gold">{formatMoney(p.net_worth_cents)}</span>
          </p>
          <p className="text-xs text-fg-3">{T.since(formatDate(p.created_at))}</p>
        </div>
      </div>
    </Panel>
  )
}

/** Podium places in the Wochenwertung and the best pull ever. */
export function Trophies({ p }: { p: Profile }) {
  const t = p.trophies
  return (
    <Panel title={T.trophies} tip={T.trophiesTip}>
      <div className="flex flex-wrap items-center gap-5">
        {(
          [
            ['gold', 'text-gold'],
            ['silver', 'text-fg-2'],
            ['bronze', 'text-warn'],
          ] as const
        ).map(([k, tone]) => (
          <span key={k} className="flex items-center gap-1.5" title={T.medal[k]}>
            <PixelIcon name="trophy" scale={2} className={tone} />
            <b className="nums text-xl">{t[k]}</b>
          </span>
        ))}
        <span className="flex min-w-48 flex-1 items-center gap-3">
          {t.best_pull_card ? (
            <>
              <Card id={t.best_pull_card} scale={1} />
              <span className="text-sm">
                <span className="block text-fg-3">{T.bestPull}</span>
                <b className="block">{cardName(t.best_pull_card)}</b>
                <span className="nums text-gold">{formatMoney(t.best_pull_cents)}</span>
              </span>
            </>
          ) : (
            <span className="text-sm text-fg-3">{T.noPull}</span>
          )}
        </span>
      </div>
    </Panel>
  )
}

export function ProfileNumbers({ p }: { p: Profile }) {
  return (
    <Panel title={T.stats} tip={T.numbersTip}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {(Object.keys(T.numbers) as (keyof typeof T.numbers)[]).map((k) => (
          <div key={k} className="flex justify-between border-b border-line py-1">
            <dt className="text-fg-2">{T.numbers[k]}</dt>
            <dd className="nums font-semibold">{formatNumber(Math.floor(p.stats[k]))}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
