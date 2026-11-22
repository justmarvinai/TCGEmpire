import clsx from 'clsx'
import { Popover } from 'radix-ui'
import type { CSSProperties } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Avatar } from '@/components/ui/Avatar.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { formatAgo, formatClock, formatFactor, formatMoney, formatNumber, formatStars } from '@/lib/format.ts'
import { useCosmetics } from '@/lib/actions.ts'
import { useRealtimeSync } from '@/lib/realtime.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { FeedEntry, Me, Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { serverNow, useSetMe, useSync, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { ACHIEVEMENTS, CONSUMABLES, GOALS, itemName } from '@/lib/catalog.ts'
import { FeedList } from '@/features/feed/Feed.tsx'
import { personName } from '@/features/company/people.ts'
import { eventDef } from '@/features/events/eventText.ts'
import { AWARDS, DECISIONS, STAGES } from '../../content/company.ts'
import { ATTACKS } from '../../content/darkside.ts'
import { SNACK_ICON } from '@/features/shop/icons.ts'
import { FeatureTour, Overlays, TutorialBanner } from '@/features/overlays/Overlays.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { NAV, type NavItem, unseenFeatures } from './nav.ts'

type SignedIn = Me & { player: Player }

export function Shell({ me }: { me: SignedIn }) {
  useSync(true)
  useRealtimeSync()
  return (
    <div className="app-bg flex h-dvh">
      <Sidebar player={me.player} />
      <main className="min-w-0 flex-1 overflow-y-auto" id="scroll-root">
        <TopBar me={me} />
        <div className="mx-auto max-w-[80rem] px-8 pt-3 pb-14 max-lg:px-4">
          <TutorialBanner player={me.player} />
          <FeatureTour player={me.player} />
          <Outlet />
        </div>
      </main>
      <Overlays awayS={me.away_s} player={me.player} />
      <CommandPalette player={me.player} />
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Sidebar: every page, grouped; a floating glass panel (a drawer on small screens)
// ----------------------------------------------------------------------------------------------
function Sidebar({ player }: { player: Player }) {
  const open = useWorld((s) => s.navOpen)
  const apply = useWorld((s) => s.apply)
  const chatUnread = useWorld((w) => w.chatUnread)
  const badges: Partial<Record<NavItem['id'], number>> = { open: player.sealed_total, quests: player.quests_ready, stammtisch: chatUnread }
  const fresh = unseenFeatures(player, useSettings((s) => s.seenTours))
  const close = () => apply({ navOpen: false })
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm lg:hidden" onClick={close} aria-hidden />}
      <aside
        className={clsx(
          'panel z-50 flex w-63 shrink-0 flex-col overflow-hidden lg:my-4 lg:ml-4',
          'max-lg:fixed max-lg:inset-y-3 max-lg:left-3 max-lg:bg-surface-1 max-lg:transition-transform max-lg:duration-300',
          !open && 'max-lg:-translate-x-[110%]',
        )}
        aria-label={texts.hud.menu}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-1">
          <Link to="/" onClick={close} className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <span className="grid size-10 place-items-center rounded-xl bg-grad text-white shadow-[0_6px_18px_rgb(255_79_163/0.35)]">
              <PixelIcon name="card" />
            </span>
            TCGEmpire
          </Link>
          <button type="button" onClick={close} className={clsx(roundBtn, 'ml-auto size-9 lg:hidden')} aria-label={texts.common.close}>
            <PixelIcon name="close" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-10 [mask-image:linear-gradient(#000_88%,transparent)]">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="mx-2.5 mt-4 mb-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-fg-3 uppercase">
                {texts.nav.groups[group.group]}
              </p>
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  level={player.level}
                  badge={badges[item.id]}
                  isNew={fresh.some((f) => f.path === item.path)}
                  onPick={close}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

function SidebarItem({ item, level, badge, isNew, onPick }: { item: NavItem; level: number; badge?: number; isNew: boolean; onPick: () => void }) {
  const label = texts.nav.items[item.id]
  const base = 'flex h-9 items-center gap-3 rounded-xl px-2.5 text-[0.9rem] font-medium'
  if (level < item.level) {
    return (
      <div className={clsx(base, 'cursor-not-allowed text-fg-3/70')} title={`${label}: ${texts.nav.lockedLevel(item.level)}`}>
        <PixelIcon name="lock" />
        <span className="flex-1 truncate">{label}</span>
        <span className="nums text-xs font-semibold">Lv {item.level}</span>
      </div>
    )
  }
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => {
        sfx('click')
        onPick()
      }}
      title={label}
      className={({ isActive }) =>
        clsx(base, isActive ? 'bg-grad font-semibold text-white shadow-[0_8px_20px_rgb(255_79_163/0.28)]' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')
      }
    >
      <PixelIcon name={item.icon} />
      <span className="flex-1 truncate">{label}</span>
      {!item.built && (
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-fg-3 uppercase">{texts.nav.soon}</span>
      )}
      {isNew && <span className="rounded-md bg-gain px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-ink uppercase">{texts.nav.new}</span>}
      {!!badge && <span className="nums min-w-5 rounded-full bg-accent-hi px-1.5 text-center text-xs leading-5 font-bold text-white">{badge}</span>}
    </NavLink>
  )
}

// ----------------------------------------------------------------------------------------------
// Top bar: page search, stat pills (each opens its explanation), buffs, news, notifications, you
// ----------------------------------------------------------------------------------------------
const roundBtn =
  'relative grid size-11 shrink-0 place-items-center rounded-[0.9rem] border border-line bg-surface-2 text-fg-2 backdrop-blur-xl hover:bg-surface-3 hover:text-fg data-[state=open]:bg-surface-3 data-[state=open]:text-fg'
const pill =
  'flex h-11 items-center gap-2.5 rounded-[0.9rem] border border-line bg-surface-2 pr-3.5 pl-1.5 font-semibold whitespace-nowrap backdrop-blur-xl hover:bg-surface-3 data-[state=open]:bg-surface-3'
const chip = 'grid size-8 place-items-center rounded-[0.6rem] text-ink'

function TopBar({ me }: { me: SignedIn }) {
  const p = me.player
  const apply = useWorld((s) => s.apply)
  return (
    <header className="sticky top-0 z-30 flex h-19 items-center gap-3 bg-ink/45 px-8 backdrop-blur-xl max-lg:px-4">
      <button type="button" onClick={() => apply({ navOpen: true })} className={clsx(roundBtn, 'lg:hidden')} aria-label={texts.hud.menu}>
        <PixelIcon name="menu" />
      </button>
      <button
        type="button"
        onClick={() => apply({ paletteOpen: true })}
        aria-label={texts.palette.title}
        className="flex h-11 w-90 items-center gap-2.5 rounded-[0.9rem] border border-line bg-surface-2 pr-2 pl-3.5 text-sm text-fg-2 backdrop-blur-xl hover:bg-surface-3 max-xl:w-11 max-xl:justify-center max-xl:p-0"
      >
        <PixelIcon name="search" />
        <span className="flex-1 text-left max-xl:hidden">{texts.hud.search}</span>
        <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-fg-3 max-xl:hidden">{texts.hud.searchKey}</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <InfoTip
          label={texts.hud.cash}
          triggerClassName={clsx(pill, 'border-gold/35 shadow-[0_0_24px_rgb(255_201_77/0.1)]')}
          trigger={
            <>
              <span className={clsx(chip, 'bg-gold')}>
                <PixelIcon name="coin" />
              </span>
              <NumberTicker value={p.cash_cents} format={formatMoney} className="nums" />
            </>
          }
        >
          <strong className="text-fg">{texts.hud.cash}.</strong> {texts.hud.cashTip}
        </InfoTip>
        <InfoTip
          label={texts.hud.energy}
          triggerClassName={clsx(pill, 'max-md:hidden')}
          trigger={
            <>
              <span className={clsx(chip, 'bg-info')}>
                <PixelIcon name="bolt" />
              </span>
              <span className="nums">
                {p.energy}
                <span className="font-medium text-fg-3">/{p.energy_max}</span>
              </span>
              <span className="h-1.5 w-11 overflow-hidden rounded-full bg-surface-3">
                <i className="block h-full rounded-full bg-info" style={{ width: `${Math.round((100 * p.energy) / Math.max(1, p.energy_max))}%` }} />
              </span>
            </>
          }
        >
          <strong className="text-fg">{texts.hud.energy}.</strong> {texts.hud.energyTip}
        </InfoTip>
        <InfoTip
          label={texts.hud.statsTip}
          triggerClassName={clsx(pill, 'gap-3.5 px-3.5 font-medium text-fg-2 max-xl:hidden')}
          trigger={
            <>
              <span className="flex items-center gap-1.5">
                <PixelIcon name="star" className="text-warn" />
                <b className="nums font-semibold text-fg">{formatStars(p.ruf)}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <PixelIcon name="bottle" className="text-gain" />
                <b className="nums font-semibold text-fg">{formatNumber(p.pfandbons)}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <PixelIcon name="doener" className="text-accent" />
                <b className="nums font-semibold text-fg">{formatFactor(me.server.price_level)}</b>
              </span>
            </>
          }
        >
          <span className="flex flex-col gap-2">
            <span>
              <strong className="text-fg">{texts.hud.ruf}.</strong> {texts.hud.rufTip}
            </span>
            <span>
              <strong className="text-fg">{texts.hud.pfandbons}.</strong> {texts.hud.pfandbonsTip}
            </span>
            <span>
              <strong className="text-fg">{texts.hud.price}.</strong> {texts.hud.priceTip}
            </span>
          </span>
        </InfoTip>
        {p.buffs.map((b) => {
          const buff = CONSUMABLES.find((c) => c.key === b.key)?.buff ?? texts.hud.jobBuffs[b.key]
          const name = buff?.name ?? b.key
          return (
            <InfoTip key={b.key} label={name} trigger={<PixelIcon name={SNACK_ICON[b.key] ?? 'gift'} />}>
              <strong className="text-fg">{name}.</strong> {buff?.text} {texts.hud.buffUntil(formatClock(b.expires_at))}
            </InfoTip>
          )
        })}
        <NewsButton priceLevel={me.server.price_level} />
        <NotificationBell />
        <YouMenu me={me} />
      </div>
    </header>
  )
}

function NewsButton({ priceLevel }: { priceLevel: number }) {
  return (
    <Popover.Root>
      <Popover.Trigger className={clsx(roundBtn, 'max-sm:hidden')} aria-label={texts.feed.title}>
        <PixelIcon name="news" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="panel-float z-50 w-96 max-w-[92vw] p-4 animate-fade-up">
          <p className="flex items-center gap-2 font-bold text-loss">
            <PixelIcon name="news" />
            {texts.feed.title}
          </p>
          <p className="mb-3 text-xs text-fg-3">{texts.feed.subtitle}</p>
          <FeedList priceLevel={priceLevel} className="max-h-96 overflow-y-auto" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function NotificationBell() {
  const notifications = useWorld((s) => s.notifications)
  const unread = useWorld((s) => s.unread)
  const apply = useWorld((s) => s.apply)
  return (
    <Popover.Root onOpenChange={(open) => open && apply({ unread: 0 })}>
      <Popover.Trigger className={roundBtn} aria-label={texts.hud.notifications}>
        <PixelIcon name="bell" />
        {unread > 0 && (
          <span className="nums absolute -top-1 -right-1 min-w-5 rounded-full bg-accent-hi px-1 text-center text-[0.6875rem] leading-5 font-bold text-white">
            {unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="panel-float z-50 w-88 max-w-[92vw] p-4 animate-fade-up">
          <p className="mb-3 font-bold">{texts.hud.notifications}</p>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-fg-3">{texts.hud.noNotifications}</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {[...notifications].reverse().map((n) => (
                <li key={n.id} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-snug">
                  {notificationText(n)}
                  <span className="mt-1 block text-xs text-fg-3">{formatAgo(n.at, serverNow())}</span>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function notificationText(n: FeedEntry) {
  if (n.kind === 'level_up') return texts.notifications.level_up(n.data)
  if (n.kind === 'unlock') {
    const f = String(n.data.feature)
    return texts.notifications.unlock(n.data, (texts.tour.features as Record<string, { name: string } | undefined>)[f]?.name ?? f)
  }
  if (n.kind === 'achievement')
    return texts.notifications.achievement(n.data, ACHIEVEMENTS.find((a) => a.key === n.data.key)?.name ?? String(n.data.key))
  if (n.kind === 'parcel_arrived') return texts.notifications.parcel_arrived(n.data, itemName(String(n.data.item_id)))
  if (n.kind === 'sale_paid') return texts.notifications.sale_paid(n.data, itemName(String(n.data.item_id)), formatMoney(Number(n.data.cents)))
  if (n.kind === 'ad_offer') return texts.notifications.ad_offer(String(n.data.name), itemName(String(n.data.item_id)), formatMoney(Number(n.data.cents)))
  if (n.kind === 'ad_expired') return texts.notifications.ad_expired(itemName(String(n.data.item_id)))
  if (n.kind === 'chargeback') return texts.notifications.chargeback(formatMoney(Number(n.data.cents)))
  if (n.kind === 'daily_bonus') return texts.notifications.daily_bonus
  if (n.kind === 'weekly_chest') return texts.notifications.weekly_chest
  if (n.kind === 'goal_done') {
    const goal = GOALS.find((g) => g.key === n.data.goal)
    return texts.notifications.goal_done(goal?.name ?? String(n.data.goal), goal?.joke ?? '')
  }
  if (n.kind === 'admin_grant') return texts.notifications.admin_grant(formatMoney(Number(n.data.cents)))
  if (n.kind === 'gift_received') return texts.notifications.gift_received(String(n.data.name), formatMoney(Number(n.data.cents)))
  if (n.kind === 'trade_offer') return texts.notifications.trade_offer(String(n.data.name))
  if (n.kind === 'trade_accepted') return texts.notifications.trade_accepted(String(n.data.name))
  if (n.kind === 'trade_declined') return texts.notifications.trade_declined(String(n.data.name))
  if (n.kind === 'grading_back') return texts.notifications.grading_back(Number(n.data.n))
  if (n.kind === 'battle_done') return texts.notifications.battle_done(n.data, formatMoney(Number(n.data.pot)))
  if (n.kind === 'loan_offer') return texts.notifications.loan_offer(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'loan_accepted') return texts.notifications.loan_accepted(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'loan_declined') return texts.notifications.loan_declined(n.data)
  if (n.kind === 'loan_repaid') return texts.notifications.loan_repaid(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'loan_due') return texts.notifications.loan_due(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'loan_defaulted') return texts.notifications.loan_defaulted(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'attacked')
    return texts.notifications.attacked(String(n.data.kind), n.data, formatMoney(Number((n.data.kind === 'finanzamt' ? n.data.fee_cents : n.data.cents) ?? 0)))
  if (n.kind === 'attack_blocked')
    return texts.notifications.attack_blocked(
      String(n.data.kind),
      n.data,
      formatMoney(Number(n.data.joy_cents ?? 0)),
      ATTACKS.find((a) => a.key === n.data.kind)?.name ?? '',
    )
  if (n.kind === 'resealed_caught') return texts.notifications.resealed_caught(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'loan_defaulted_self') return texts.notifications.loan_defaulted_self(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'break_done') return texts.notifications.break_done(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'company_decision') return texts.notifications.company_decision(DECISIONS.find((x) => x.key === n.data.key)?.title ?? '')
  if (n.kind === 'company_decision_ignored') return texts.notifications.company_decision_ignored(DECISIONS.find((x) => x.key === n.data.key)?.title ?? '')
  if (n.kind === 'company_tax_advisor') return texts.notifications.company_tax_advisor(formatMoney(Number(n.data.cents)))
  if (n.kind === 'company_tax_late') return texts.notifications.company_tax_late(formatMoney(Number(n.data.cents)))
  if (n.kind === 'company_zoll') return texts.notifications.company_zoll(formatMoney(Number(n.data.cents)))
  if (n.kind === 'company_audit') return texts.notifications.company_audit(formatMoney(Number(n.data.cents)))
  if (n.kind === 'company_scandal') return texts.notifications.company_scandal
  if (n.kind === 'company_award') return texts.notifications.company_award(AWARDS.find((x) => x.key === n.data.key)?.name ?? '')
  if (n.kind === 'event') {
    const def = eventDef(String(n.data.key))
    return texts.notifications.event(def?.name ?? '', def?.text ?? '', n.data.cents ? formatMoney(Number(n.data.cents)) : null)
  }
  if (n.kind === 'company_order') return texts.notifications.company_order(n.data)
  if (n.kind === 'company_stage') return texts.notifications.company_stage(STAGES.find((x) => x.stage === Number(n.data.stage))?.name ?? '')
  if (n.kind === 'company_broke') return texts.notifications.company_broke
  if (n.kind === 'staff_quit') return texts.notifications.staff_quit(personName({ archetype: String(n.data.archetype), first: Number(n.data.first), last: Number(n.data.last) }))
  if (n.kind === 'helped') return texts.notifications.helped(n.data)
  if (n.kind === 'kaffee') return texts.notifications.kaffee(n.data)
  if (n.kind === 'group_order_done') return texts.notifications.group_order_done(n.data, itemName(String(n.data.product_id)))
  if (n.kind === 'group_order_cancelled') return texts.notifications.group_order_cancelled(itemName(String(n.data.product_id)))
  if (n.kind === 'league_done') return texts.notifications.league_done(Number(n.data.rank), texts.toplists.percent(Number(n.data.bps)), Number(n.data.boosters))
  if (n.kind === 'parcel_lost') return texts.notifications.parcel_lost(n.data, itemName(String(n.data.item_id)), formatMoney(Number(n.data.cents)))
  if (n.kind === 'water_damage') return texts.notifications.water_damage(n.data, formatMoney(Number(n.data.cents)))
  if (n.kind === 'insurance_ended') return texts.notifications.insurance_ended(texts.insurance.policies[n.data.kind as 'versand']?.name ?? String(n.data.kind))
  if (n.kind === 'nebenkosten') return texts.notifications.nebenkosten(formatMoney(Number(n.data.cents)))
  if (n.kind === 'guestbook') return texts.notifications.guestbook(String(n.data.name))
  return texts.notifications.unknown
}

/** The avatar with its EP ring: level, EP, profile link, settings, version and sign-out. */
function YouMenu({ me }: { me: SignedIn }) {
  const p = me.player
  const style = useCosmetics().data
  const look = style ? { name_color: style.style.name_color ?? null, frame: style.style.frame ?? null, avatar_card: style.avatar_card } : null
  const { volume, reducedMotion, set } = useSettings()
  const setMe = useSetMe()
  const client = useQueryClient()
  const reset = useWorld((s) => s.reset)
  const pct = p.ep_to_next ? Math.round((100 * p.ep) / p.ep_to_next) : 100
  const ring = { background: `conic-gradient(var(--color-accent-lo), var(--color-accent-hi) ${pct}%, rgb(255 255 255 / 0.12) ${pct}%)` } as CSSProperties

  const logout = async () => {
    try {
      const res = await rpc('logout')
      reset()
      setMe(res)
      // Drop everything that belonged to the signed-out player; keep the session query and static art.
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'atlas' })
    } catch (e) {
      toast('error', errorText(e))
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="relative grid size-12 shrink-0 place-items-center rounded-full" style={ring} aria-label={texts.hud.settings}>
        <Avatar name={p.username} look={look} size={40} className="bg-surface-1 font-pixel" />
        <span className="nums absolute -right-1.5 -bottom-1 rounded-lg bg-fg px-1.5 text-[0.6875rem] leading-4 font-bold text-ink">{p.level}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="panel-float z-50 w-80 p-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <Avatar name={p.username} look={look} size={44} className="font-pixel" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-bold">
                {p.username}
                {p.is_admin && <PixelIcon name="crown" className="text-gold" title={texts.hud.admin} />}
              </p>
              {p.title && <p className="truncate text-xs font-semibold text-accent">{p.title}</p>}
            </div>
            <span className="nums rounded-lg bg-surface-3 px-2 py-0.5 text-sm font-bold">
              {texts.hud.level} {p.level}
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-fg-3">
              <span>{texts.hud.ep}</span>
              <span className="nums">{p.ep_to_next ? `${formatNumber(p.ep)} / ${formatNumber(p.ep_to_next)}` : texts.hud.maxLevel}</span>
            </div>
            <Progress value={pct / 100} label={texts.hud.ep} />
            <p className="mt-2 text-xs leading-snug text-fg-3">{texts.hud.epTip}</p>
          </div>
          <span className="mt-3 flex gap-4">
            <Link to="/profile" className="inline-flex text-sm font-semibold text-accent hover:underline">
              {texts.hud.profile} →
            </Link>
            {p.is_admin && (
              <Link to="/admin" className="inline-flex text-sm font-semibold text-gold hover:underline">
                {texts.admin.link} →
              </Link>
            )}
          </span>
          <div className="my-4 h-px bg-line" />
          <p className="mb-3 eyebrow">{texts.hud.settings}</p>
          <label className="mb-3 flex items-center gap-3 text-sm">
            <PixelIcon name={volume > 0 ? 'sound_on' : 'sound_off'} className="text-fg-2" />
            <span className="w-14">{texts.hud.sound}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              onPointerUp={() => sfx('coin')}
              className="flex-1 accent-accent"
            />
          </label>
          <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} className="size-4 accent-accent" />
            {texts.hud.reducedMotion}
          </label>
          <Button className="w-full" onClick={logout}>
            <PixelIcon name="logout" />
            {texts.hud.logout}
          </Button>
          <p className="nums mt-3 text-center text-xs text-fg-3">{texts.hud.version(me.server.version)}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
