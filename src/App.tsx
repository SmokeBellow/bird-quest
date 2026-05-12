import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { IdentifyPage } from './pages/IdentifyPage'
import { CollectionPage } from './pages/CollectionPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { BirdDetailPage } from './pages/BirdDetailPage'
import { NearbyPage } from './pages/NearbyPage'
import { SettingsPage } from './pages/SettingsPage'
import { supabase } from './services/supabase'
import { useBirdStore } from './store'

export default function App() {
  const setSupabaseUser = useBirdStore((s) => s.setSupabaseUser)
  const loadFromSupabase = useBirdStore((s) => s.loadFromSupabase)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser({ id: session.user.id, email: session.user.email ?? undefined })
        loadFromSupabase()
      }
    })

    // Listen for auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUser({ id: session.user.id, email: session.user.email ?? undefined })
        loadFromSupabase()
      } else {
        setSupabaseUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
