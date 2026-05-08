import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { IdentifyPage } from './pages/IdentifyPage'
import { CollectionPage } from './pages/CollectionPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { BirdDetailPage } from './pages/BirdDetailPage'
import { NearbyPage } from './pages/NearbyPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<IdentifyPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/bird/:id" element={<BirdDetailPage />} />
      </Routes>
    </Layout>
  )
}
