import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Card, CardBack } from '@/components/cards/Card.tsx'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Ring } from '@/components/ui/Ring.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { useBunkerContent, useCollectBunker } from '@/features/bunker/BunkerPage.tsx'
import { FeedList } from '@/features/feed/Feed.tsx'
import { QuestList, Stamps } from '@/features/quests/QuestsPage.tsx'
import { useBunker, useHome, useJobs, useQuests, useShop } from '@/lib/actions.ts'
import { cardById, productById, SETS, TIER_LABEL, type Tier } from '@/lib/catalog.ts'
import { formatAgo, formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import type { Home, Me, Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { PATCH_NOTES } from '@/texts/patchnotes.ts'
import { config } from '../../../content/config.ts'

const T = texts.home

/** Exactly one recommendation: the most useful next action. */
function nextStep(
  p: Player,
  kioskPrice: number | undefined,
  s: { bunkerFull: boolean; shiftDone: boolean; stamp: boolean },
): { key: keyof typeof T.cta; text: string; to: string; icon: IconName } {
  if (p.sealed_total > 0) return { key: 'sealed', text: T.next.sealed(p.sealed_total), to: '/open', icon: 'pack' }
  if (p.quests_ready > 0) return { key: 'quests', text: T.next.quests(p.quests_ready), to: '/quests', icon: 'scroll' }
  if (s.shiftDone) return { key: 'shiftDone', text: T.next.shiftDone, to: '/jobs', icon: 'briefcase' }
  if (s.bunkerFull) return { key: 'bunkerFull', text: T.next.bunkerFull, to: '/bunker', icon: 'vault' }
  if (s.stamp) return { key: 'stamp', text: T.next.stamp, to: '/quests', icon: 'check' }
  if (kioskPrice !== undefined && p.cash_cents >= kioskPrice) return { key: 'kiosk', text: T.next.kiosk, to: '/shop', icon: 'shop' }
  if (p.energy >= config['minigame.pfand'].energy) return { key: 'pfand', text: T.next.pfand, to: '/jobs', icon: 'bottle' }
  return { key: 'broke', text: T.next.broke, to: '/collection', icon: 'binder' }
}

export function HomePage({ me }: { me: Me & { player: Player } }) {
  const p = me.player
  const quests = useQuests()
  const shop = useShop()
  const bunker = useBunker()
  const jobs = useJobs()
  const home = useHome()
  const live = useBunkerContent(bunker.data)
  const notes = PATCH_NOTES.find((n) => n.version === me.server.version)
  const seen = useSettings((s) => s.notesSeen)
  const setSettings = useSettings((s) => s.set)
  const next = nextStep(p, shop.data?.kiosk[0]?.price_cents, {
    bunkerFull: !!live && live.fill >= 1,
    shiftDone: !!jobs.data?.shift?.done,
    stamp: !!quests.data?.stamps.unlocked && !quests.data.stamps.today_done,
  })
  const sealedArt = next.key === 'sealed' ? productById.get(shop.data?.sealed[0]?.product_id ?? '')?.wrappers[0] : undefined
  const cards = Math.max(0, p.net_worth_cents - p.cash_cents)

  return (
    <Page icon="home" title={T.greeting(p.username)} subtitle={T.subtitle}>
      <div className="grid gap-4 lg:grid-cols-12">
        {notes && seen !== notes.version && p.tutorial_step < 0 && (
          <Panel title={T.notesTitle(notes.version, notes.title)} tip={T.notesTip} className="lg:col-span-12">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg-2 marker:text-accent">
              {notes.items.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <Button size="sm" className="mt-4" onClick={() => setSettings({ notesSeen: notes.version })}>
              {T.notesRead}
            </Button>
          </Panel>
        )}

        <LastHit hit={home.data?.last_hit} loading={home.isPending} className="lg:col-span-12 xl:col-span-6 xl:row-span-2" />

        <Panel title={T.netWorth} tip={T.netWorthTip} className="lg:col-span-12 xl:col-span-6">
          <NumberTicker value={p.net_worth_cents} format={formatMoney} className="nums block text-5xl font-bold tracking-tight max-md:text-4xl" />
          <div className="mt-6 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
            <i className="rounded-full bg-accent-lo" style={{ flexGrow: Math.max(1, p.cash_cents) }} />
            <i className="rounded-full bg-info" style={{ flexGrow: Math.max(1, cards) }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-2">
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-accent-lo" />
              {T.cash} <b className="nums text-fg">{formatMoney(p.cash_cents)}</b>
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-info" />
              {T.cards} <b className="nums text-fg">{formatMoney(cards)}</b>
            </span>
          </div>
        </Panel>

        <section className="panel relative flex min-h-52 flex-col overflow-hidden p-5 lg:col-span-6 xl:col-span-3">
          <div className="pointer-events-none absolute -top-12 -right-14 size-56 rounded-full bg-[radial-gradient(circle,rgb(255_140_60/0.28),transparent_65%)]" />
          {sealedArt ? (
            <PixelProduct id={sealedArt} scale={1} fallback={{ w: 84, h: 132 }} className="absolute top-5 right-5 drop-shadow-[0_16px_24px_rgb(0_0_0/0.5)]" />
          ) : (
            <PixelIcon name={next.icon} scale={3} className="absolute top-5 right-5 text-accent" />
          )}
          <p className="eyebrow relative">{T.nextTitle}</p>
          <p className={clsx('relative mt-3 leading-snug font-semibold', sealedArt ? 'mr-24' : 'mr-14')}>{next.text}</p>
          <Link to={next.to} className="btn btn-primary relative mt-auto inline-flex min-h-10 items-center gap-2 self-start px-4 font-semibold">
            {T.cta[next.key]}
          </Link>
        </section>

        <Panel title={texts.bunker.title} tip={texts.bunker.tip} className="flex flex-col lg:col-span-6 xl:col-span-3">
          {!bunker.data ? (
            <Skeleton className="h-28 w-full" />
          ) : !bunker.data.unlocked || !live ? (
            <p className="text-sm text-fg-3">{texts.bunker.locked(bunker.data.unlock_level)}</p>
          ) : (
            <BunkerTile live={live} />
          )}
        </Panel>

        <Panel title={T.questsTitle} tip={texts.quests.miniTip} className="lg:col-span-6 xl:col-span-4">
          {quests.data ? <QuestList quests={quests.data} list={quests.data.mini} compact /> : <Skeleton className="h-32 w-full" />}
        </Panel>

        <Panel title={texts.stamps.title} tip={texts.stamps.tip} className="lg:col-span-6 xl:col-span-4">
          {quests.data ? <Stamps q={quests.data} compact /> : <Skeleton className="h-32 w-full" />}
        </Panel>

        <Panel title={texts.feed.title} tip={texts.feed.subtitle} className="lg:col-span-12 xl:col-span-4">
          <FeedList priceLevel={me.server.price_level} limit={3} />
        </Panel>
      </div>

      {notes && seen === notes.version && (
        <p className="mt-8 text-center text-xs text-fg-3">
          {texts.hud.version(me.server.version)} ·{' '}
          <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setSettings({ notesSeen: '' })}>
            {T.notesAgain}
          </button>
        </p>
      )}
    </Page>
  )
}

function BunkerTile({ live }: { live: NonNullable<ReturnType<typeof useBunkerContent>> }) {
  const { busy, collect } = useCollectBunker()
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="nums text-3xl font-bold tracking-tight">{formatMoney(Math.floor(live.content))}</p>
          <p className="mt-1 text-sm text-fg-3">{live.fill >= 1 ? texts.bunker.full : texts.bunker.fullIn(formatDuration(live.fullInS))}</p>
        </div>
        <Ring value={live.fill} label={texts.bunker.content}>
          {Math.floor(live.fill * 100)} %
        </Ring>
      </div>
      <Button size="sm" className="mt-auto self-start" loading={busy} disabled={live.content < 1} onClick={collect}>
        <PixelIcon name="vault" />
        {texts.bunker.collect}
      </Button>
    </>
  )
}

/** The latest Holo-or-better pull, big, with its tier glow. */
function LastHit({ hit, loading, className }: { hit: Home['last_hit'] | undefined; loading: boolean; className?: string }) {
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  if (loading) return <Skeleton className={clsx('min-h-96', className)} />
  const data = hit ? cardById.get(hit.card_id) : undefined
  const set = hit ? SETS.find((s) => s.cards.some((c) => c.id === hit.card_id)) : undefined
  const tone = `var(--color-tier-${hit?.tier ?? 'holo'})`
  const glow = { background: `radial-gradient(circle, color-mix(in srgb, ${tone} 45%, transparent), transparent 68%)` } as CSSProperties
  return (
    <section className={clsx('panel relative flex items-center gap-8 overflow-hidden p-7 max-md:flex-col max-md:items-start', className)}>
      <div className="pointer-events-none absolute top-1/2 -left-24 size-[30rem] -translate-y-1/2 rounded-full blur-lg" style={glow} />
      {hit ? (
        <Card id={hit.card_id} scale={3} foil="sweep" className="relative shrink-0 shadow-[0_30px_60px_rgb(0_0_0/0.55)]" />
      ) : (
        <CardBack scale={3} className="relative shrink-0 opacity-60" />
      )}
      <div className="relative min-w-0">
        <p className="eyebrow flex items-center gap-1.5">
          {T.lastHit}
          <InfoTip>{T.lastHitTip}</InfoTip>
        </p>
        {hit ? (
          <>
            <h2 className="mt-3 text-4xl leading-[1.05] font-bold tracking-tight break-words">{data?.name ?? hit.card_id}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full px-3 py-1" style={{ color: tone, background: `color-mix(in srgb, ${tone} 16%, transparent)` }}>
                {TIER_LABEL[hit.tier as Tier] ?? hit.tier}
              </span>
              {set && data && (
                <span className="rounded-full bg-surface-3 px-3 py-1 text-fg-2">
                  {set.name} · {data.no}/{set.size}
                </span>
              )}
            </div>
            <p className="mt-6 eyebrow">{T.value}</p>
            <p className="nums mt-1 text-4xl font-bold tracking-tight">{formatMoney(hit.value_cents)}</p>
            {now > 0 && <p className="mt-1 text-sm text-fg-3">{T.pulled(formatAgo(hit.pulled_at, now + offset))}</p>}
            <Link to="/collection" className="mt-6 inline-block text-sm font-semibold text-fg-2 hover:text-fg">
              {T.toCollection} →
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-4xl leading-none font-bold tracking-tight">{T.noHit}</h2>
            <p className="mt-3 max-w-72 text-fg-2">{T.noHitBody}</p>
            <Link to="/open" className="btn btn-primary mt-6 inline-flex min-h-10 items-center gap-2 px-4 font-semibold">
              <PixelIcon name="pack" />
              {T.openNow}
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
