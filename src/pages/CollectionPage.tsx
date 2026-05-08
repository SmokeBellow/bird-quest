import { useState, useMemo } from 'react'
import { useBirdStore } from '../store'
import { BirdCard } from '../components/BirdCard'
import { Search, Grid, List, TrendingUp } from 'lucide-react'
import { ACHIEVEMENTS } from '../achievements/definitions'

type Sort = 'date' | 'name' | 'rarity'
type View = 'list' | 'grid'

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center bg-gray-900 rounded-xl p-3 border border-gray-800">
      <span className="text-2xl font-bold text-forest-400">{value}</span>
      <span className="text-xs text-gray-500 text-center mt-0.5">{label}</span>
    </div>
  )
}

export function CollectionPage() {
  const observations = useBirdStore((s) => s.observations)
  const getStats = useBirdStore((s) => s.getStats)
  const unlockedAchievements = useBirdStore((s) => s.unlockedAchievements)

  const stats = getStats()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('date')
  const [view, setView] = useState<View>('list')

  const uniqueObservations = useMemo(() => {
    const seen = new Map<string, typeof observations[0]>()
    for (const obs of [...observations].reverse()) {
      if (!seen.has(obs.bird.id)) seen.set(obs.bird.id, obs)
    }
    return [...seen.values()].reverse()
  }, [observations])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return uniqueObservations
      .filter(
        (o) =>
          !q ||
          o.bird.commonName.toLowerCase().includes(q) ||
          (o.bird.ruName || '').toLowerCase().includes(q) ||
          o.bird.scientificName.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sort === 'name') return (a.bird.ruName || a.bird.commonName).localeCompare(b.bird.ruName || b.bird.commonName, 'ru')
        if (sort === 'rarity') {
          const order = { very_rare: 0, rare: 1, uncommon: 2, common: 3, undefined: 4 }
          return (order[a.bird.rarity as keyof typeof order] ?? 4) - (order[b.bird.rarity as keyof typeof order] ?? 4)
        }
        return new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
      })
  }, [uniqueObservations, query, sort])

  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
  const totalPossibleAchievements = ACHIEVEMENTS.length

  if (observations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <span className="text-6xl mb-4">🌿</span>
        <h2 className="text-xl font-bold text-white mb-2">Коллекция пуста</h2>
        <p className="text-gray-400">
          Определи свою первую птицу — сфотографируй её или поищи по названию
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-4">Моя коллекция</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <StatBadge label="Видов" value={stats.uniqueSpecies} />
        <StatBadge label="Наблюдений" value={stats.totalBirds} />
        <StatBadge label="Ачивок" value={`${unlockedAchievements.length}/${totalPossibleAchievements}`} />
        <StatBadge label="Очков" value={totalPoints} />
      </div>

      {/* Method breakdown */}
      <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-forest-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Метод</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-gray-400">📸 {stats.byPhoto}</span>
          <span className="text-gray-400">🎵 {stats.bySound}</span>
          <span className="text-gray-400">✏️ {stats.byManual}</span>
          {stats.streak > 1 && (
            <span className="text-orange-400 ml-auto">🔥 {stats.streak} дн. подряд</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-forest-600"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-forest-600"
        >
          <option value="date">По дате</option>
          <option value="name">По имени</option>
          <option value="rarity">По редкости</option>
        </select>
        <button
          onClick={() => setView(view === 'list' ? 'grid' : 'list')}
          className="p-2 bg-gray-900 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          {view === 'list' ? <Grid size={18} /> : <List size={18} />}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">{filtered.length} видов</p>

      {view === 'list' ? (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <BirdCard key={obs.id} observation={obs} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((obs) => {
            const { bird } = obs
            return (
              <div
                key={obs.id}
                className="flex flex-col items-center bg-gray-900 rounded-xl p-2 border border-gray-800 gap-1"
              >
                {bird.thumbnailUrl ? (
                  <img
                    src={bird.thumbnailUrl}
                    alt={bird.commonName}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-gray-800 flex items-center justify-center text-3xl">
                    🐦
                  </div>
                )}
                <p className="text-xs text-center text-gray-300 leading-tight line-clamp-2">
                  {bird.ruName || bird.commonName}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
