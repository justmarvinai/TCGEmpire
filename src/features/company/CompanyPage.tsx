import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { errorText, rpc } from '@/lib/rpc.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { Dashboard } from './Dashboard.tsx'
import { Founding } from './Founding.tsx'

const T = texts.company

export function CompanyPage() {
  // the server settles the company on every look; every half minute keeps the numbers alive
  const q = useQuery({ queryKey: ['company'], queryFn: () => rpc('company_get'), refetchInterval: 30_000 })
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="building" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level && !d.company ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : d.company ? (
        <Dashboard d={d} player={player} />
      ) : (
        <Founding d={d} player={player} />
      )}
    </Page>
  )
}
