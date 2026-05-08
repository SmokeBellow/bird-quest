import { useState, useMemo } from 'react'
import { useBirdStore } from '../store'
import { AchievementCard } from '../components/AchievementCard'
import { ACHIEVEMENTS } from '../achievements/definitions'
import { Trophy } from 'lucide-react'

type Filter = 'all' | 'unlocked' | 'locked'
type Category = 'all' | string

const categoryLabel: Record<string, string> = {
  all: 'Все',
  collection: 'Коллекция',
  exploration: 'Исследования',
  time: 'Время',
  skill: 'Навык',
  rarity: 'Редкость',
  taxonomy: 'Таксономия',
}

const rarityOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 }

export function AchievementsPage() {
  const unlockedAchievements = useBirdStore((s) => s.unlockedAchievements)
  const getStats = useBirdStore((s) => s.getStats)
  const stats = getStats()

  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<Category>('all')

  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id))
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
  const maxPoints = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0)
  const progress = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length
  const total = ACHIEVEMENTS.length

  const filtered = useMemo(() => {
    return ACHIEVEMENTS.filter((a) => {
      if (filter === 'unlocked' && !unlockedIds.has(a.id)) return false
      if (filter === 'locked' && unlockedIds.has(a.id)) return false
      if (category !== 'all' && a.category !== category) return false
      return true
    }).sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id)
      const bUnlocked = unlockedIds.has(b.id)
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1
      return rarityOrder[a.rarity] - rarityOrder[b.rarity]
    })
  }, [filter, category, unlockedIds])

  const categories = ['all', ...new Set(ACHIEVEMENTS.map((a) => a.category))]

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-1">Достижения</h1>
      <p className="text-gray-400 text-sm mb-4">Открой их все — исследуй мир птиц</p>

      {/* Progress */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" size={20} />
            <span className="font-semibold text-white">Прогресс</span>
          </div>
          <span className="text-forest-400 font-bold">{progress}/{total}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full transition-all"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{Math.round((progress / total) * 100)}% выполнено</span>
          <span className="text-yellow-500 font-semibold">{totalPoints} / {maxPoints} очков</span>
        </div>

        {/* Rarity breakdown */}
        <div className="flex gap-3 mt-3">
          {(['bronze', 'silver', 'gold', 'platinum'] as const).map((r) => {
            const total = ACHIEVEMENTS.filter((a) => a.rarity === r).length
            const done = ACHIEVEMENTS.filter((a) => a.rarity === r && unlockedIds.has(a.id)).length
            const colors = {
              bronze: 'text-orange-500',
              silver: 'text-gray-400',
              gold: 'text-yellow-500',
              platinum: 'text-purple-400',
            }
            const labels = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💜' }
            return (
              <div key={r} className="flex items-center gap-1 text-xs">
                <span>{labels[r]}</span>
                <span className={colors[r]}>{done}/{total}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
        {(['all', 'unlocked', 'locked'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f ? 'bg-forest-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'unlocked' ? 'Открытые' : 'Закрытые'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              category === cat ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-white'
            }`}
          >
            {categoryLabel[cat] || cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ach) => {
            const unlocked = unlockedIds.has(ach.id)
            const displayAch = unlocked
              ? unlockedAchievements.find((a) => a.id === ach.id)!
              : ach
            return (
              <AchievementCard key={ach.id} achievement={displayAch} unlocked={unlocked} />
            )
          })}
        </div>
      )}
    </div>
  )
}
