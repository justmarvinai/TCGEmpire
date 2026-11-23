import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { ErrorState } from '@/components/ui/States.tsx'
import { ToastViewport } from '@/components/ui/toast.tsx'
import { AuthPage } from '@/features/auth/AuthPage.tsx'
import { ComingSoonPage } from '@/features/common/ComingSoonPage.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
import { QuestsPage } from '@/features/quests/QuestsPage.tsx' // the home page shows quests, so it is loaded anyway
import { errorText } from '@/lib/rpc.ts'
import { useSettings } from '@/lib/settings.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { Shell } from './Shell.tsx'

// Every page but the home page (and the quests it shows) loads on demand (the shell shows a skeleton meanwhile).
const CardmarketPage = lazy(() => import('@/features/cardmarket/CardmarketPage.tsx').then((m) => ({ default: m.CardmarketPage })))
const CardmarketItemPage = lazy(() => import('@/features/cardmarket/ItemPage.tsx').then((m) => ({ default: m.CardmarketItemPage })))
const SellerPage = lazy(() => import('@/features/cardmarket/SellerPage.tsx').then((m) => ({ default: m.SellerPage })))
const KleinanzeigenPage = lazy(() => import('@/features/kleinanzeigen/KleinanzeigenPage.tsx').then((m) => ({ default: m.KleinanzeigenPage })))
const ToplistsPage = lazy(() => import('@/features/toplists/ToplistsPage.tsx').then((m) => ({ default: m.ToplistsPage })))
const PlayersPage = lazy(() => import('@/features/players/PlayersPage.tsx').then((m) => ({ default: m.PlayersPage })))
const StammtischPage = lazy(() => import('@/features/stammtisch/StammtischPage.tsx').then((m) => ({ default: m.StammtischPage })))
const AdminPage = lazy(() => import('@/features/admin/AdminPage.tsx').then((m) => ({ default: m.AdminPage })))
const TradePage = lazy(() => import('@/features/trade/TradePage.tsx').then((m) => ({ default: m.TradePage })))
const CollectionPage = lazy(() => import('@/features/collection/CollectionPage.tsx').then((m) => ({ default: m.CollectionPage })))
const GradingPage = lazy(() => import('@/features/grading/GradingPage.tsx').then((m) => ({ default: m.GradingPage })))
const SkillsPage = lazy(() => import('@/features/skills/SkillsPage.tsx').then((m) => ({ default: m.SkillsPage })))
const HousingPage = lazy(() => import('@/features/housing/HousingPage.tsx').then((m) => ({ default: m.HousingPage })))
const StylePage = lazy(() => import('@/features/style/StylePage.tsx').then((m) => ({ default: m.StylePage })))
const InsurancePage = lazy(() => import('@/features/insurance/InsurancePage.tsx').then((m) => ({ default: m.InsurancePage })))
const DarksidePage = lazy(() => import('@/features/darkside/DarksidePage.tsx').then((m) => ({ default: m.DarksidePage })))
const BaresPage = lazy(() => import('@/features/bares/BaresPage.tsx').then((m) => ({ default: m.BaresPage })))
const PrestigePage = lazy(() => import('@/features/prestige/PrestigePage.tsx').then((m) => ({ default: m.PrestigePage })))
const LuxuryPage = lazy(() => import('@/features/mogul/LuxuryPage.tsx').then((m) => ({ default: m.LuxuryPage })))
const MegaprojectsPage = lazy(() => import('@/features/mogul/MegaprojectsPage.tsx').then((m) => ({ default: m.MegaprojectsPage })))
const StreamingPage = lazy(() => import('@/features/streaming/StreamingPage.tsx').then((m) => ({ default: m.StreamingPage })))
const HelpPage = lazy(() => import('@/features/help/HelpPage.tsx').then((m) => ({ default: m.HelpPage })))
const BattlePage = lazy(() => import('@/features/battles/BattlePage.tsx').then((m) => ({ default: m.BattlePage })))
const BattlesPage = lazy(() => import('@/features/battles/BattlesPage.tsx').then((m) => ({ default: m.BattlesPage })))
const BreakPage = lazy(() => import('@/features/battles/BreakPage.tsx').then((m) => ({ default: m.BreakPage })))
const CompanyPage = lazy(() => import('@/features/company/CompanyPage.tsx').then((m) => ({ default: m.CompanyPage })))
const PlayerProfilePage = lazy(() => import('@/features/profile/PlayerProfilePage.tsx').then((m) => ({ default: m.PlayerProfilePage })))
const JobsPage = lazy(() => import('@/features/jobs/JobsPage.tsx').then((m) => ({ default: m.JobsPage })))
const OpenPage = lazy(() => import('@/features/open/OpenPage.tsx').then((m) => ({ default: m.OpenPage })))
const PathPage = lazy(() => import('@/features/path/PathPage.tsx').then((m) => ({ default: m.PathPage })))
const ShopPage = lazy(() => import('@/features/shop/ShopPage.tsx').then((m) => ({ default: m.ShopPage })))
const BunkerPage = lazy(() => import('@/features/bunker/BunkerPage.tsx').then((m) => ({ default: m.BunkerPage })))
const UpgradesPage = lazy(() => import('@/features/upgrades/UpgradesPage.tsx').then((m) => ({ default: m.UpgradesPage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })))
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
          <Route path="prestige" element={<PrestigePage />} />
          <Route path="luxury" element={<LuxuryPage />} />
          <Route path="megaprojects" element={<MegaprojectsPage />} />
          <Route path="streaming" element={<StreamingPage />} />
          <Route path="help" element={<HelpPage />} />
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
