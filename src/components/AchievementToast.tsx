import { useEffect } from 'react'
import type { Achievement } from '../types'

const rarityColors: Record<string, string> = {
  bronze: 'from-orange-900 border-orange-600',
  silver: 'from-gray-700 border-gray-400',
  gold: 'from-yellow-900 border-yellow-500',
  platinum: 'from-purple-900 border-purple-500',
}

export function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: Achievement
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`fixed top-16 right-4 left-4 z-50 animate-slide-up bg-gradient-to-r ${
        rarityColors[achievement.rarity]
      } border rounded-xl p-4 shadow-2xl flex items-center gap-3`}
      onClick={onDismiss}
    >
      <span className="text-3xl">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">
          Достижение разблокировано!
        </p>
        <p className="font-bold text-white truncate">{achievement.name}</p>
        <p className="text-xs text-gray-300 truncate">{achievement.description}</p>
      </div>
      <div className="text-yellow-400 font-bold text-sm">+{achievement.points}</div>
    </div>
  )
}
