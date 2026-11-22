import { Link } from 'react-router'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { QuestList } from '@/features/quests/QuestsPage.tsx'
import { useBunker, useJobs, useQuests, useShop } from '@/lib/actions.ts'
import { useBunkerContent } from '@/features/bunker/BunkerPage.tsx'
import { formatFactor, formatMoney } from '@/lib/format.ts'
import type { Me, Player } from '@/lib/schemas.ts'
import { Button } from '@/components/ui/Button.tsx'
import { useSettings } from '@/lib/settings.ts'
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
  const live = useBunkerContent(bunker.data)
  const notes = PATCH_NOTES.find((n) => n.version === me.server.version)
  const seen = useSettings((s) => s.notesSeen)
  const setSettings = useSettings((s) => s.set)
  const next = nextStep(p, shop.data?.kiosk[0]?.price_cents, {
    bunkerFull: !!live && live.fill >= 1,
    shiftDone: !!jobs.data?.shift?.done,
    stamp: !!quests.data?.stamps.unlocked && !quests.data.stamps.today_done,
  })
  return (
    <Page icon="home" title={T.greeting(p.username)} subtitle={T.subtitle}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={T.netWorth} tip={T.netWorthTip}>
          <NumberTicker value={p.net_worth_cents} format={formatMoney} className="nums font-pixel text-4xl text-gold" />
          <p className="mt-1 text-sm text-fg-3">
            {T.cash}: <span className="nums text-fg-2">{formatMoney(p.cash_cents)}</span>
          </p>
        </Panel>

        <Panel title={T.nextTitle} className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <PixelIcon name={next.icon} scale={2} className="text-accent" />
            <p className="min-w-48 flex-1 text-fg-2">{next.text}</p>
            <Link to={next.to} className="btn btn-primary inline-flex min-h-10 items-center px-4 font-semibold anim-nudge">
              {T.cta[next.key]}
            </Link>
          </div>
        </Panel>

        {notes && seen !== notes.version && p.tutorial_step < 0 && (
          <Panel title={T.notesTitle(notes.version, notes.title)} tip={T.notesTip} className="lg:col-span-3">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg-2 marker:text-accent">
              {notes.items.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <Button size="sm" className="mt-3" onClick={() => setSettings({ notesSeen: notes.version })}>
              {T.notesRead}
            </Button>
          </Panel>
        )}

        <Panel title={T.questsTitle} tip={texts.quests.miniTip} className="lg:col-span-2">
          {quests.data ? <QuestList quests={quests.data} list={quests.data.mini} compact /> : <Skeleton className="h-32 w-full" />}
        </Panel>

        <Panel title={T.serverTitle} tip={texts.hud.priceTip}>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-fg-3">{texts.hud.price}</dt>
              <dd className="nums font-semibold">{formatFactor(me.server.price_level)}</dd>
            </div>
            <div>
              <dt className="text-fg-3">{T.version}</dt>
              <dd className="nums font-semibold">{me.server.version}</dd>
            </div>
            {notes && seen === notes.version && (
              <button type="button" className="justify-self-start text-sm font-semibold text-accent hover:underline" onClick={() => setSettings({ notesSeen: '' })}>
                {T.notesAgain}
              </button>
            )}
          </dl>
        </Panel>
      </div>
    </Page>
  )
}
