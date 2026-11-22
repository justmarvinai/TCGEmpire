import clsx from 'clsx'
import { Popover } from 'radix-ui'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { formatAgo, formatFactor, formatMoney, formatNumber, formatStars } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { FeedEntry, Me, Player } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { serverNow, useSetMe, useSync, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { cardName } from '@/lib/catalog.ts'
import { NAV, type NavItem } from './nav.ts'
import { Overlays, TutorialBanner } from '@/features/overlays/Overlays.tsx'

const DOENER_BASE_CENTS = 150_00

export function Shell({ me }: { me: Me & { player: Player } }) {
  useSync(true)
  return (
    <div className="app-bg grid h-dvh grid-cols-[15rem_1fr] grid-rows-[3.5rem_1fr] max-lg:grid-cols-[3.5rem_1fr] min-[1440px]:grid-cols-[15rem_1fr_18rem]">
      <Sidebar player={me.player} />
      <TopBar me={me} />
      <main className="col-start-2 row-start-2 min-w-0 overflow-y-auto" id="scroll-root">
        <div className="mx-auto max-w-[75rem] p-6 max-lg:p-3">
          <TutorialBanner player={me.player} />
          <Outlet />
        </div>
      </main>
      <FeedRail priceLevel={me.server.price_level} />
      <Overlays />
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Sidebar
// ----------------------------------------------------------------------------------------------
function Sidebar({ player }: { player: Player }) {
  const level = player.level
  const badges: Partial<Record<NavItem['id'], number>> = { open: player.sealed_total, quests: player.quests_ready }
  return (
    <aside className="col-start-1 row-span-2 row-start-1 flex flex-col overflow-y-auto border-r-2 border-line bg-surface-1">
      <NavLink to="/" className="flex h-14 shrink-0 items-center gap-2 border-b-2 border-line px-4 max-lg:justify-center max-lg:px-0">
        <PixelIcon name="card" scale={2} className="text-accent" />
        <span className="font-pixel text-2xl leading-none max-lg:hidden">
          TCG<span className="text-accent">Empire</span>
        </span>
      </NavLink>
      <nav className="flex-1 p-2">
        {NAV.map((group) => (
          <div key={group.group} className="mb-3">
            <p className="px-2 pb-1 text-[0.6875rem] font-semibold tracking-widest text-fg-3 uppercase max-lg:hidden">
              {texts.nav.groups[group.group]}
            </p>
            {group.items.map((item) => (
              <SidebarItem key={item.id} item={item} level={level} badge={badges[item.id]} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function SidebarItem({ item, level, badge }: { item: NavItem; level: number; badge?: number }) {
  const label = texts.nav.items[item.id]
  const locked = level < item.level
  const base = 'flex h-9 items-center gap-2.5 px-2 text-sm font-medium max-lg:justify-center'

  if (locked) {
    return (
      <div className={clsx(base, 'cursor-not-allowed text-fg-3/60')} title={`${label}: ${texts.nav.lockedLevel(item.level)}`}>
        <PixelIcon name="lock" />
        <span className="flex-1 truncate max-lg:hidden">{label}</span>
        <span className="nums text-xs max-lg:hidden">Lv {item.level}</span>
      </div>
    )
  }
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => sfx('click')}
      title={label}
      className={({ isActive }) =>
        clsx(base, isActive ? 'bg-surface-3 text-fg shadow-[inset_3px_0_0_var(--color-accent)]' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')
      }
    >
      <PixelIcon name={item.icon} />
      <span className="flex-1 truncate max-lg:hidden">{label}</span>
      {!item.built && (
        <span className="bg-surface-3 px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-fg-3 uppercase max-lg:hidden">
          {texts.nav.soon}
        </span>
      )}
      {!!badge && <span className="nums min-w-5 bg-accent px-1 text-center text-xs font-bold text-accent-fg max-lg:hidden">{badge}</span>}
    </NavLink>
  )
}

// ----------------------------------------------------------------------------------------------
// Top bar
// ----------------------------------------------------------------------------------------------
function TopBar({ me }: { me: Me & { player: Player } }) {
  const p = me.player
  return (
    <header className="col-start-2 row-start-1 flex min-w-0 items-center gap-4 border-b-2 border-line bg-surface-1 px-4 max-lg:gap-2 max-lg:px-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center bg-accent font-pixel text-xl text-accent-fg" aria-hidden>
          {p.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 max-md:hidden">
          <div className="flex items-center gap-2 leading-tight">
            <span className="truncate font-semibold">{p.username}</span>
            {p.is_admin && <PixelIcon name="crown" className="text-accent" title={texts.hud.admin} />}
            <span className="shrink-0 bg-surface-3 px-1.5 font-pixel text-sm whitespace-nowrap text-gold">
              {texts.hud.level} {p.level}
            </span>
            <InfoTip label={`${texts.hud.ep}: ${texts.common.info}`}>
              <strong className="text-fg">
                {p.ep_to_next ? `${formatNumber(p.ep)} / ${formatNumber(p.ep_to_next)} ${texts.hud.ep}` : texts.hud.maxLevel}.
              </strong>{' '}
              {texts.hud.epTip}
            </InfoTip>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress className="max-w-56" tone="gold" value={p.ep_to_next ? p.ep / p.ep_to_next : 1} label={texts.hud.ep} />
            <span className="nums text-xs whitespace-nowrap text-fg-3 max-[1599px]:hidden">
              {p.ep_to_next ? `${formatNumber(p.ep)} / ${formatNumber(p.ep_to_next)} ${texts.hud.ep}` : texts.hud.maxLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap">
        <Stat icon="coin" tone="text-gold" label={texts.hud.cash} tip={texts.hud.cashTip}>
          <NumberTicker value={p.cash_cents} format={formatMoney} className="nums font-semibold" />
        </Stat>
        <Stat icon="bottle" tone="text-gain" label={texts.hud.pfandbons} tip={texts.hud.pfandbonsTip} className="max-[1599px]:hidden">
          <span className="nums font-semibold">{formatNumber(p.pfandbons)}</span>
        </Stat>
        <Stat icon="star" tone="text-warn" label={texts.hud.ruf} tip={texts.hud.rufTip} className="max-xl:hidden">
          <span className="nums font-semibold">{formatStars(p.ruf)}</span>
        </Stat>
        <Stat icon="bolt" tone="text-info" label={texts.hud.energy} tip={texts.hud.energyTip} className="max-xl:hidden">
          <span className="nums font-semibold">
            {p.energy}
            <span className="text-fg-3">/{p.energy_max}</span>
          </span>
        </Stat>
        <Stat icon="doener" tone="text-accent" label={texts.hud.price} tip={texts.hud.priceTip} className="max-lg:hidden">
          <span className="nums font-semibold">{formatFactor(me.server.price_level)}</span>
        </Stat>
        <NotificationBell />
        <SettingsMenu />
      </div>
    </header>
  )
}

function Stat({
  icon,
  tone,
  label,
  tip,
  className,
  children,
}: {
  icon: IconName
  tone: string
  label: string
  tip: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={clsx('flex items-center gap-1.5 px-2', className)} title={label}>
      <PixelIcon name={icon} className={tone} />
      {children}
      <InfoTip label={`${label}: ${texts.common.info}`}>
        <strong className="text-fg">{label}.</strong> {tip}
      </InfoTip>
    </div>
  )
}

const iconButton = 'grid size-9 place-items-center text-fg-2 hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-3 data-[state=open]:text-fg'

function NotificationBell() {
  const notifications = useWorld((s) => s.notifications)
  const unread = useWorld((s) => s.unread)
  const apply = useWorld((s) => s.apply)
  return (
    <Popover.Root onOpenChange={(open) => open && apply({ unread: 0 })}>
      <Popover.Trigger className={clsx(iconButton, 'relative')} aria-label={texts.hud.notifications}>
        <PixelIcon name="bell" />
        {unread > 0 && (
          <span className="nums absolute top-0.5 right-0.5 min-w-4 bg-loss px-1 text-[0.625rem] leading-4 font-bold text-accent-fg">{unread}</span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="px-panel z-50 w-80 p-2 animate-fade-up">
          <p className="mb-2 font-pixel text-lg">{texts.hud.notifications}</p>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-fg-3">{texts.hud.noNotifications}</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {[...notifications].reverse().map((n) => (
                <li key={n.id} className="bg-surface-2 p-2 text-sm">
                  {notificationText(n)}
                  <span className="mt-0.5 block text-xs text-fg-3">{formatAgo(n.at, serverNow())}</span>
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
  return texts.notifications.unknown
}

function SettingsMenu() {
  const { volume, reducedMotion, set } = useSettings()
  const setMe = useSetMe()
  const client = useQueryClient()
  const reset = useWorld((s) => s.reset)

  const logout = async () => {
    try {
      const me = await rpc('logout')
      reset()
      setMe(me)
      // Drop everything that belonged to the signed-out player; keep the session query and static art.
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'atlas' })
    } catch (e) {
      toast('error', errorText(e))
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger className={iconButton} aria-label={texts.hud.settings}>
        <PixelIcon name="gear" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="px-panel z-50 w-72 p-3 animate-fade-up">
          <p className="mb-3 font-pixel text-lg">{texts.hud.settings}</p>
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ----------------------------------------------------------------------------------------------
// Feed rail (KARTEN-BILD)
// ----------------------------------------------------------------------------------------------
function FeedRail({ priceLevel }: { priceLevel: number }) {
  const feed = useWorld((s) => s.feed)
  const doener = formatMoney(Math.round(DOENER_BASE_CENTS * priceLevel))
  return (
    <aside className="col-start-3 row-span-2 row-start-1 flex flex-col overflow-hidden border-l-2 border-line bg-surface-1 max-[1439px]:hidden">
      <div className="border-b-2 border-line px-3 py-2">
        <p className="flex items-center gap-2 font-pixel text-xl leading-none text-loss">
          <PixelIcon name="news" />
          {texts.feed.title}
        </p>
        <p className="mt-1 text-xs text-fg-3">{texts.feed.subtitle}</p>
      </div>
      {feed.length === 0 ? (
        <p className="p-4 text-center text-sm text-fg-3">{texts.feed.empty}</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {[...feed].reverse().map((f) => (
            <li key={f.id} className="bg-surface-2 p-2 text-sm leading-snug animate-fade-up">
              {feedText(f, doener)}
              <span className="mt-1 block text-xs text-fg-3">{formatAgo(f.at, serverNow())}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

function feedText(f: FeedEntry, doener: string) {
  if (f.kind === 'player_joined') return texts.feed.player_joined(f.data)
  if (f.kind === 'inflation') return texts.feed.inflation(f.data, doener)
  if (f.kind === 'pull_grail') return texts.feed.pull_grail(f.data, cardName(String(f.data.card_id)))
  if (f.kind === 'pull_ultra') return texts.feed.pull_ultra(f.data, cardName(String(f.data.card_id)))
  return texts.feed.unknown
}
