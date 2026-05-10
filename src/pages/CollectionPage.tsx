import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useBirdStore } from '../store'
import { BirdCard } from '../components/BirdCard'
import { Search, Grid, List, TrendingUp, Trash2 } from 'lucide-react'
import { ACHIEVEMENTS } from '../achievements/definitions'
import { PLANT_ACHIEVEMENTS } from '../achievements/plantDefinitions'
import type { PlantObservation } from '../types'

type Sort = 'date' | 'name' | 'rarity'
type View = 'list' | 'grid'
type Tab = 'bird' | 'plant'

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center bg-gray-900 rounded-xl p-3 border border-gray-800">
      <span className="text-2xl font-bold text-forest-400">{value}</span>
      <span className="text-xs text-gray-500 text-center mt-0.5">{label}</span>
    </div>
  )
}

function PlantCollectionTab() {
  const plantObservations = useBirdStore((s) => s.plantObservations)
  const removePlantObservation = useBirdStore((s) => s.removePlantObservation)
  const getPlantStats = useBirdStore((s) => s.getPlantStats)
  const unlockedPlantAchievements = useBirdStore((s) => s.unlockedPlantAchievements)
  const stats = getPlantStats()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('list')

  const uniquePlants = useMemo(() => {
    const seen = new Map<string, PlantObservation>()
    for (const obs of [...plantObservations].reverse()) {
      if (!seen.has(obs.plant.id)) seen.set(obs.plant.id, obs)
    }
    return [...seen.values()].reverse()
  }, [plantObservations])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return uniquePlants.filter(
      (o) =>
        !q ||
        o.plant.commonName.toLowerCase().includes(q) ||
        o.plant.scientificName.toLowerCase().includes(q)
    )
  }, [uniquePlants, query])

  const totalPlantAchievements = PLANT_ACHIEVEMENTS.length

  if (plantObservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-6xl mb-4">🌿</span>
        <h2 className="text-lg font-bold text-white mb-2">Коллекция растений пуста</h2>
        <p className="text-gray-400 text-sm">Определи растение по фото — нажми 🌿 на странице «Определить»</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Видов', value: stats.uniqueSpecies },
          { label: 'Наблюдений', value: stats.totalPlants },
          { label: 'Ачивок', value: `${unlockedPlantAchievements.length}/${totalPlantAchievements}` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center bg-gray-900 rounded-xl p-3 border border-gray-800">
            <span className="text-2xl font-bold text-emerald-400">{value}</span>
            <span className="text-xs text-gray-500 text-center mt-0.5">{label}</span>
          </div>
        ))}
      </div>
      {stats.families.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Семейств: {stats.families.length}</span>
            {stats.fungi > 0 && <span className="ml-auto text-xs text-gray-400">🍄 {stats.fungi} гриб{stats.fungi > 1 ? 'а' : ''}</span>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-600"
          />
        </div>
        <button
          onClick={() => setView(view === 'list' ? 'grid' : 'list')}
          className="p-2 bg-gray-900 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          {view === 'list' ? <Grid size={18} /> : <List size={18} />}
        </button>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} видов</p>

      {view === 'list' ? (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <div key={obs.id} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
              {obs.plant.thumbnailUrl ? (
                <img src={obs.plant.thumbnailUrl} alt={obs.plant.commonName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-2xl">
                  {(obs.plant.iconic || '').toLowerCase() === 'fungi' ? '🍄' : '🌿'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{obs.plant.commonName}</p>
                <p className="text-xs text-gray-500 italic truncate">{obs.plant.scientificName}</p>
                {obs.plant.family && <p className="text-xs text-emerald-600 truncate">{obs.plant.family}</p>}
                <p className="text-xs text-gray-600 mt-0.5">
                  {new Date(obs.observedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {obs.confidence !== undefined && (
                    <span className="ml-2 text-emerald-700">{Math.round(obs.confidence * 100)}%</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {obs.plant.wikipediaUrl && (
                  <a href={obs.plant.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">Wiki</a>
                )}
                <button
                  onClick={() => removePlantObservation(obs.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((obs) => (
            <div key={obs.id} className="flex flex-col items-center bg-gray-900 rounded-xl p-2 border border-gray-800 gap-1">
              {obs.plant.thumbnailUrl ? (
                <img src={obs.plant.thumbnailUrl} alt={obs.plant.commonName} className="w-full aspect-square rounded-lg object-cover" />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gray-800 flex items-center justify-center text-3xl">
                  {(obs.plant.iconic || '').toLowerCase() === 'fungi' ? '🍄' : '🌿'}
                </div>
              )}
              <p className="text-xs text-center text-gray-300 leading-tight line-clamp-2">{obs.plant.commonName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CollectionPage() {
  const routerLocation = useLocation()
  const observations = useBirdStore((s) => s.observations)
  const getStats = useBirdStore((s) => s.getStats)
  const unlockedAchievements = useBirdStore((s) => s.unlockedAchievements)

  const stats = getStats()
  const [tab, setTab] = useState<Tab>((routerLocation.state as { tab?: Tab } | null)?.tab ?? 'bird')
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

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-4">Моя коллекция</h1>

      {/* Tab toggle */}
      <div className="flex gap-2 bg-gray-900 p-1 rounded-xl mb-5">
        <button
          onClick={() => setTab('bird')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'bird' ? 'bg-forest-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          🐦 Птицы
        </button>
        <button
          onClick={() => setTab('plant')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'plant' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          🌿 Растения
        </button>
      </div>

      {tab === 'plant' && <PlantCollectionTab />}
      {tab === 'bird' && observations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🐦</span>
          <h2 className="text-lg font-bold text-white mb-2">Коллекция птиц пуста</h2>
          <p className="text-gray-400 text-sm">Определи свою первую птицу — сфотографируй её или поищи по названию</p>
        </div>
      )}
      {tab === 'bird' && observations.length > 0 && (<>

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
      </>)}
    </div>
  )
}
