import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { useUpgrades } from '@/lib/actions.ts'
import { errorText } from '@/lib/rpc.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { UpgradeRow } from './UpgradeRow.tsx'

const T = texts.upgrades
const GROUPS = ['oeffnen', 'jobs', 'handel', 'grading', 'fortschritt', 'bunker']

export function UpgradesPage() {
  const ups = useUpgrades()
  const p = useMe().data?.player
  return (
    <Page icon="upgrade" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {ups.isPending || !p ? (
        <Skeleton className="h-96 w-full" />
      ) : ups.isError ? (
        <ErrorState message={errorText(ups.error)} onRetry={() => void ups.refetch()} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {GROUPS.map((g) => (
            <Panel key={g} title={T.groups[g]}>
              <div className="flex flex-col gap-2">
                {ups.data.upgrades
                  .filter((u) => u.group === g)
                  .map((u) => (
                    <UpgradeRow key={u.key} u={u} level={p.level} cash={p.cash_cents} />
                  ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </Page>
  )
}
