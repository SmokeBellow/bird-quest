import { useState, useEffect } from 'react'
import { MapPin, RefreshCw, Bird } from 'lucide-react'
import { useBirdStore } from '../store'
import { useGeolocation } from '../hooks/useGeolocation'
import { getNearbyObservations } from '../services/ebird'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { NearbyBird } from '../types'

function formatTimeSince(dateStr: string) {
  const d = new Date(dateStr.replace(' ', 'T'))
  const diffH = Math.round((Date.now() - d.getTime()) / 3600000)
  if (diffH < 1) return 'менее часа назад'
  if (diffH < 24) return `${diffH} ч. назад`
  const days = Math.floor(diffH / 24)
  return `${days} дн. назад`
}

export function NearbyPage() {
  const location = useGeolocation()
  const hasObserved = useBirdStore((s) => s.hasObserved)
  const observations = useBirdStore((s) => s.observations)

  const [nearby, setNearby] = useState<NearbyBird[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchNearby = async () => {
    if (!location) { setError('Геолокация недоступна'); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getNearbyObservations(location.lat, location.lng)
      // Deduplicate by species
      const seen = new Map<string, NearbyBird>()
      for (const bird of data) {
        if (!seen.has(bird.speciesCode)) seen.set(bird.speciesCode, bird)
      }
      setNearby([...seen.values()])
      setLastFetch(new Date())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('401') || msg.includes('403')) {
        setError('Неверный API ключ eBird. Проверь настройки.')
      } else {
        setError('Ошибка загрузки. Проверь интернет-соединение.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location && !nearby.length) {
      fetchNearby()
    }
  }, [location]) // eslint-disable-line

  // Unique species user has collected
  const uniqueCollected = new Set(observations.map((o) => o.bird.scientificName.toLowerCase()))
  const foundCount = nearby.filter((b) =>
    uniqueCollected.has(b.sciName.toLowerCase())
  ).length

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Птицы рядом</h1>
        <button
          onClick={fetchNearby}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {location
          ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
          : 'Определяю местоположение...'}
        {lastFetch && (
          <span className="ml-2 text-gray-600">
            · обновлено {lastFetch.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </p>

      {nearby.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bird size={16} className="text-forest-400" />
            <span className="text-sm text-gray-300">
              <strong className="text-white">{nearby.length}</strong> видов в радиусе 25 км
            </span>
          </div>
          <span className="text-sm text-forest-400 font-semibold">
            {foundCount} найдено ✓
          </span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <LoadingSpinner size={24} />
          <span>Загружаю наблюдения...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && nearby.length > 0 && (
        <div className="space-y-2">
          {nearby.map((bird) => {
            const found = uniqueCollected.has(bird.sciName.toLowerCase())
            return (
              <div
                key={bird.speciesCode}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  found
                    ? 'bg-forest-950/40 border-forest-800'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${
                    found ? 'bg-forest-800' : 'bg-gray-800'
                  }`}
                >
                  {found ? '✓' : '🐦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${found ? 'text-forest-300' : 'text-white'}`}>
                    {bird.comName}
                  </p>
                  <p className="text-xs text-gray-500 italic truncate">{bird.sciName}</p>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <MapPin size={10} />
                    <span>{formatTimeSince(bird.obsDt)}</span>
                  </div>
                  {bird.howMany && (
                    <div className="text-gray-600">{bird.howMany} особей</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && nearby.length === 0 && lastFetch && (
        <div className="text-center py-16 text-gray-500">
          <Bird size={40} className="mx-auto mb-3 opacity-30" />
          <p>Нет наблюдений в радиусе 25 км за последние 2 недели</p>
        </div>
      )}
    </div>
  )
}
