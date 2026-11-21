import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { ErrorState } from '@/components/ui/States.tsx'
import { ToastViewport } from '@/components/ui/toast.tsx'
import { AuthPage } from '@/features/auth/AuthPage.tsx'
import { ComingSoonPage } from '@/features/common/ComingSoonPage.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
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

  const signedIn = { player, server }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell me={signedIn} />}>
          <Route index element={<HomePage me={signedIn} />} />
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
