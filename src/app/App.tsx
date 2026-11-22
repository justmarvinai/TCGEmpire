import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { ErrorState } from '@/components/ui/States.tsx'
import { ToastViewport } from '@/components/ui/toast.tsx'
import { AuthPage } from '@/features/auth/AuthPage.tsx'
import { ComingSoonPage } from '@/features/common/ComingSoonPage.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
import { CollectionPage } from '@/features/collection/CollectionPage.tsx'
import { JobsPage } from '@/features/jobs/JobsPage.tsx'
import { OpenPage } from '@/features/open/OpenPage.tsx'
import { PathPage } from '@/features/path/PathPage.tsx'
import { QuestsPage } from '@/features/quests/QuestsPage.tsx'
import { ShopPage } from '@/features/shop/ShopPage.tsx'
import { BunkerPage } from '@/features/bunker/BunkerPage.tsx'
import { UpgradesPage } from '@/features/upgrades/UpgradesPage.tsx'
import { ProfilePage } from '@/features/profile/ProfilePage.tsx'
import { errorText } from '@/lib/rpc.ts'
import { useSettings } from '@/lib/settings.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { Shell } from './Shell.tsx'

const DevUiPage = lazy(() => import('@/features/dev/DevUiPage.tsx'))
const LOCAL_MODE = !import.meta.env.VITE_SUPABASE_URL

export function App() {
  const reducedMotion = useSettings((s) => s.reducedMotion)
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])

  return (
    <>
      <Game />
      <ToastViewport />
    </>
  )
}

function Game() {
  const me = useMe()

  if (me.isPending) return <Boot />
  if (me.isError) {
    return (
      <div className="app-bg grid min-h-dvh place-items-center">
        <ErrorState message={errorText(me.error)} onRetry={() => void me.refetch()} />
      </div>
    )
  }
  const { player, server } = me.data
  if (!player) return <AuthPage me={me.data} localMode={LOCAL_MODE} />

  const signedIn = { ...me.data, player, server }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell me={signedIn} />}>
          <Route index element={<HomePage me={signedIn} />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="open" element={<OpenPage />} />
          <Route path="collection" element={<CollectionPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="quests" element={<QuestsPage />} />
          <Route path="path" element={<PathPage />} />
          <Route path="bunker" element={<BunkerPage />} />
          <Route path="upgrades" element={<UpgradesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="dev/ui"
            element={
              <Suspense fallback={null}>
                <DevUiPage />
              </Suspense>
            }
          />
          <Route path="*" element={<ComingSoonPage level={player.level} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Boot() {
  return (
    <div className="app-bg grid min-h-dvh place-items-center">
      <div className="text-center">
        <PixelIcon name="card" scale={4} className="mx-auto animate-pulse text-accent" />
        <p className="mt-4 font-pixel text-xl text-fg-2">{texts.auth.loading}</p>
      </div>
    </div>
  )
}
