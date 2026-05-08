import type { Achievement } from '../types'
import { Lock } from 'lucide-react'

const rarityStyle: Record<string, { border: string; bg: string; badge: string; label: string }> = {
  bronze: {
    border: 'border-orange-800',
    bg: 'bg-orange-950/40',
    badge: 'bg-orange-700 text-orange-100',
    label: 'Бронза',
  },
  silver: {
    border: 'border-gray-600',
    bg: 'bg-gray-800/40',
    badge: 'bg-gray-500 text-white',
    label: 'Серебро',
  },
  gold: {
    border: 'border-yellow-600',
    bg: 'bg-yellow-950/40',
    badge: 'bg-yellow-600 text-yellow-100',
    label: 'Золото',
  },
  platinum: {
    border: 'border-purple-600',
    bg: 'bg-purple-950/40',
    badge: 'bg-purple-700 text-purple-100',
    label: 'Платина',
  },
}

const categoryLabel: Record<string, string> = {
  collection: 'Коллекция',
  exploration: 'Исследования',
  time: 'Время',
  skill: 'Навык',
  rarity: 'Редкость',
  taxonomy: 'Таксономия',
}

export function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: Achievement
  unlocked: boolean
}) {
  const style = rarityStyle[achievement.rarity]

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${style.border} ${style.bg} ${
        unlocked ? '' : 'opacity-50 grayscale'
      }`}
    >
      <div className="relative flex-shrink-0">
        <span className="text-3xl">{achievement.icon}</span>
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 rounded">
            <Lock size={14} className="text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-semibold ${unlocked ? 'text-white' : 'text-gray-400'}`}>
            {achievement.name}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
            {style.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{achievement.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{categoryLabel[achievement.category]}</span>
          <span className="text-xs text-yellow-500 font-semibold">+{achievement.points} очков</span>
          {unlocked && achievement.unlockedAt && (
            <span className="text-xs text-green-500 ml-auto">
              {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
