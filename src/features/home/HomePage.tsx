import { Link } from 'react-router'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Skeleton } from '@/components/ui/States.tsx'
import { QuestList } from '@/features/quests/QuestsPage.tsx'
import { useQuests, useShop } from '@/lib/actions.ts'
import { formatFactor, formatMoney } from '@/lib/format.ts'
import type { Me, Player } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'
import { config } from '../../../content/config.ts'

const T = texts.home

/** Exactly one recommendation: the most useful next action. */
function nextStep(p: Player, kioskPrice: number | undefined): { key: keyof typeof T.cta; text: string; to: string; icon: IconName } {
  if (p.sealed_total > 0) return { key: 'sealed', text: T.next.sealed(p.sealed_total), to: '/open', icon: 'pack' }
  if (p.quests_ready > 0) return { key: 'quests', text: T.next.quests(p.quests_ready), to: '/quests', icon: 'scroll' }
  if (kioskPrice !== undefined && p.cash_cents >= kioskPrice) return { key: 'kiosk', text: T.next.kiosk, to: '/shop', icon: 'shop' }
  if (p.energy >= config['minigame.pfand'].energy) return { key: 'pfand', text: T.next.pfand, to: '/jobs', icon: 'bottle' }
  return { key: 'broke', text: T.next.broke, to: '/collection', icon: 'binder' }
}

export function HomePage({ me }: { me: Me & { player: Player } }) {
  const p = me.player
  const quests = useQuests()
  const shop = useShop()
  const next = nextStep(p, shop.data?.kiosk[0]?.price_cents)
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

        <Panel title={T.questsTitle} tip={texts.quests.miniTip} className="lg:col-span-2">
          {quests.data ? <QuestList quests={quests.data} compact /> : <Skeleton className="h-32 w-full" />}
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
          </dl>
        </Panel>
      </div>
    </Page>
  )
}
