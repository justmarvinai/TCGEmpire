import { Navigate, useLocation } from 'react-router'
import { ALL_ITEMS } from '@/app/nav.ts'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState } from '@/components/ui/States.tsx'
import { texts } from '@/texts/de.ts'

/** Placeholder for features whose milestone has not shipped yet, with the level gate shown. */
export function ComingSoonPage({ level }: { level: number }) {
  const { pathname } = useLocation()
  const item = ALL_ITEMS.find((i) => i.path === pathname)
  if (!item) return <Navigate to="/" replace />

  const locked = level < item.level
  return (
    <Page icon={item.icon} title={texts.nav.items[item.id]}>
      <Panel>
        {locked ? (
          <EmptyState icon="lock" title={texts.locked.levelTitle(item.level)}>
            {texts.locked.levelBody(item.level - level)}
          </EmptyState>
        ) : (
          <EmptyState icon="crane" title={texts.locked.soonTitle}>
            {texts.locked.soonBody}
          </EmptyState>
        )}
      </Panel>
    </Page>
  )
}
