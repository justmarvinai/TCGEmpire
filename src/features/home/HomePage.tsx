import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { formatFactor, formatMoney } from '@/lib/format.ts'
import type { Me, Player } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'

export function HomePage({ me }: { me: Me & { player: Player } }) {
  const p = me.player
  return (
    <Page icon="home" title={texts.home.greeting(p.username)} subtitle={texts.home.subtitle}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={texts.home.netWorth} tip={texts.home.netWorthTip}>
          <NumberTicker value={p.cash_cents} format={formatMoney} className="nums font-pixel text-4xl text-gold" />
        </Panel>

        <Panel title={texts.home.nextTitle} className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <PixelIcon name="pack" scale={2} className="mt-1 text-accent" />
            <p className="text-fg-2">{texts.home.nextBody}</p>
          </div>
        </Panel>

        <Panel title={texts.home.serverTitle} tip={texts.hud.priceTip} className="lg:col-span-3">
          <dl className="grid grid-cols-3 gap-4 text-sm max-md:grid-cols-1">
            <div>
              <dt className="text-fg-3">{texts.home.players}</dt>
              <dd className="font-semibold">
                {p.username} · {texts.hud.level} {p.level}
              </dd>
            </div>
            <div>
              <dt className="text-fg-3">{texts.hud.price}</dt>
              <dd className="nums font-semibold">{formatFactor(me.server.price_level)}</dd>
            </div>
            <div>
              <dt className="text-fg-3">{texts.home.version}</dt>
              <dd className="nums font-semibold">{me.server.version}</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </Page>
  )
}
