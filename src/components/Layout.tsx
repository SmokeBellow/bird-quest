import { NavLink } from 'react-router-dom'
import { Bird, BookOpen, Trophy, MapPin, Settings } from 'lucide-react'
import { useBirdStore } from '../store'
import { AchievementToast } from './AchievementToast'

const tabs = [
  { to: '/', icon: Bird, label: 'Определить' },
  { to: '/collection', icon: BookOpen, label: 'Коллекция' },
  { to: '/achievements', icon: Trophy, label: 'Ачивки' },
  { to: '/nearby', icon: MapPin, label: 'Рядом' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const newAchievements = useBirdStore((s) => s.newAchievements)
  const dismiss = useBirdStore((s) => s.dismissNewAchievements)
  const unlockedCount = useBirdStore((s) => s.unlockedAchievements.length)

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-forest-900 border-b border-forest-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦅</span>
          <span className="font-bold text-lg text-forest-300">BirdQuest</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-forest-400">
          <Trophy size={16} className="text-yellow-500" />
          <span>{unlockedCount}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">{children}</main>

      {/* Achievement toasts */}
      {newAchievements.map((ach) => (
        <AchievementToast key={ach.id} achievement={ach} onDismiss={dismiss} />
      ))}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
        <div className="flex">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                  isActive
                    ? 'text-forest-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
