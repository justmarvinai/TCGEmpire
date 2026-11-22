import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { ErrorState } from '@/components/ui/States.tsx'
import { ToastViewport } from '@/components/ui/toast.tsx'
import { AuthPage } from '@/features/auth/AuthPage.tsx'
import { ComingSoonPage } from '@/features/common/ComingSoonPage.tsx'
import { CardmarketPage } from '@/features/cardmarket/CardmarketPage.tsx'
import { CardmarketItemPage } from '@/features/cardmarket/ItemPage.tsx'
import { SellerPage } from '@/features/cardmarket/SellerPage.tsx'
import { KleinanzeigenPage } from '@/features/kleinanzeigen/KleinanzeigenPage.tsx'
import { ToplistsPage } from '@/features/toplists/ToplistsPage.tsx'
import { PlayersPage } from '@/features/players/PlayersPage.tsx'
import { StammtischPage } from '@/features/stammtisch/StammtischPage.tsx'
import { AdminPage } from '@/features/admin/AdminPage.tsx'
import { TradePage } from '@/features/trade/TradePage.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
import { CollectionPage } from '@/features/collection/CollectionPage.tsx'
import { GradingPage } from '@/features/grading/GradingPage.tsx'
import { SkillsPage } from '@/features/skills/SkillsPage.tsx'
import { HousingPage } from '@/features/housing/HousingPage.tsx'
import { StylePage } from '@/features/style/StylePage.tsx'
import { InsurancePage } from '@/features/insurance/InsurancePage.tsx'
import { DarksidePage } from '@/features/darkside/DarksidePage.tsx'
import { BaresPage } from '@/features/bares/BaresPage.tsx'
import { BattlePage } from '@/features/battles/BattlePage.tsx'
import { BattlesPage } from '@/features/battles/BattlesPage.tsx'
import { BreakPage } from '@/features/battles/BreakPage.tsx'
import { CompanyPage } from '@/features/company/CompanyPage.tsx'
import { PlayerProfilePage } from '@/features/profile/PlayerProfilePage.tsx'
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
          <Route path="grading" element={<GradingPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="quests" element={<QuestsPage />} />
          <Route path="path" element={<PathPage />} />
          <Route path="bunker" element={<BunkerPage />} />
          <Route path="upgrades" element={<UpgradesPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="housing" element={<HousingPage />} />
          <Route path="style" element={<StylePage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="darkside" element={<DarksidePage />} />
          <Route path="bares" element={<BaresPage />} />
          <Route path="battles" element={<BattlesPage />} />
          <Route path="battles/:id" element={<BattlePage />} />
          <Route path="battles/break/:id" element={<BreakPage />} />
          <Route path="company" element={<CompanyPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="cardmarket" element={<CardmarketPage />} />
          <Route path="kleinanzeigen" element={<KleinanzeigenPage />} />
          <Route path="toplists" element={<ToplistsPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="players/:id" element={<PlayerProfilePage />} />
          <Route path="stammtisch" element={<StammtischPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="trade" element={<TradePage />} />
          <Route path="cardmarket/seller/:id" element={<SellerPage />} />
          <Route path="cardmarket/:item" element={<CardmarketItemPage />} />
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
        <p className="mt-4 text-xl font-semibold text-fg-2">{texts.auth.loading}</p>
      </div>
    </div>
  )
}
