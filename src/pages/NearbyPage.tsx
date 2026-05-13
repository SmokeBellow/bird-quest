import { useState, useEffect, useRef } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useBirdStore } from '../store'
import { useGeolocation } from '../hooks/useGeolocation'
import { getNearbyObservations } from '../services/ebird'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { NearbyBird, NearbyTaxon } from '../types'

function formatTimeSince(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diffH = Math.round((Date.now() - d.getTime()) / 3600000)
  if (diffH < 1) return 'сегодня'
  if (diffH < 24) return `${diffH} ч. назад`
  const days = Math.floor(diffH / 24)
  if (days < 30) return `${days} дн. назад`
  return `${Math.floor(days / 30)} мес. назад`
}

// Recenter map when user location changes
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng]) // eslint-disable-line
  return null
}

const TAXON_CONFIG: Record<NearbyTaxon, { label: string; color: string; markerColor: string; emoji: string }> = {
  birds:  { label: 'Птицы',    color: 'bg-forest-700 text-white',   markerColor: '#22c55e', emoji: '🐦' },
  plants: { label: 'Растения', color: 'bg-emerald-700 text-white',  markerColor: '#10b981', emoji: '🌿' },
  fungi:  { label: 'Грибы',    color: 'bg-amber-700 text-white',    markerColor: '#f59e0b', emoji: '🍄' },
}

export function NearbyPage() {
  const location = useGeolocation()
  const hasObserved = useBirdStore((s) => s.hasObserved)
  const observations = useBirdStore((s) => s.observations)

  const [taxon, setTaxon] = useState<NearbyTaxon>('birds')
  const [nearby, setNearby] = useState<NearbyBird[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const cache = useRef<Partial<Record<NearbyTaxon, NearbyBird[]>>>({})

  const fetchNearby = async (t: NearbyTaxon = taxon, force = false) => {
    if (!location) { setError('Геолокация недоступна'); return }
    if (!force && cache.current[t]) { setNearby(cache.current[t]!); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getNearbyObservations(location.lat, location.lng, 25, t)
      const seen = new Map<string, NearbyBird>()
      for (const b of data) {
        if (!seen.has(b.speciesCode)) seen.set(b.speciesCode, b)
      }
      const result = [...seen.values()]
      cache.current[t] = result
      setNearby(result)
      setLastFetch(new Date())
    } catch (e: unknown) {
      setError('Ошибка загрузки. Проверь интернет-соединение.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (location) fetchNearby(taxon) }, [location, taxon]) // eslint-disable-line

  const uniqueCollected = new Set(observations.map((o) => o.bird.scientificName.toLowerCase()))
  const foundCount = nearby.filter((b) => uniqueCollected.has(b.sciName.toLowerCase())).length
  const withCoords = nearby.filter((b) => b.lat != null && b.lng != null)
  const cfg = TAXON_CONFIG[taxon]

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Рядом</h1>
        <button
          onClick={() => fetchNearby(taxon, true)}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex gap-2">
        {(['birds', 'plants', 'fungi'] as NearbyTaxon[]).map((t) => (
          <button
            key={t}
            onClick={() => setTaxon(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              taxon === t ? TAXON_CONFIG[t].color : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span>{TAXON_CONFIG[t].emoji}</span>
            {TAXON_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Map */}
      {location && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-gray-800" style={{ height: 240 }}>
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <MapRecenter lat={location.lat} lng={location.lng} />

            {/* User location */}
            <CircleMarker
              center={[location.lat, location.lng]}
              radius={8}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
            >
              <Popup>Вы здесь</Popup>
            </CircleMarker>

            {/* Observations */}
            {withCoords.map((b) => {
              const found = uniqueCollected.has(b.sciName.toLowerCase())
              return (
                <CircleMarker
                  key={b.speciesCode}
                  center={[b.lat!, b.lng!]}
                  radius={6}
                  pathOptions={{
                    color: found ? '#ffffff' : cfg.markerColor,
                    fillColor: found ? '#ffffff' : cfg.markerColor,
                    fillOpacity: 0.85,
                    weight: found ? 2 : 1,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 140 }}>
                      {b.thumbnailUrl && (
                        <img src={b.thumbnailUrl} alt={b.comName} style={{ width: '100%', borderRadius: 6, marginBottom: 4 }} />
                      )}
                      <strong>{b.comName || b.sciName}</strong>
                      <br />
                      <em style={{ fontSize: 11, color: '#888' }}>{b.sciName}</em>
                      {b.obsDt && <div style={{ fontSize: 11, marginTop: 2 }}>{formatTimeSince(b.obsDt)}</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      )}

      {/* Stats */}
      {nearby.length > 0 && (
        <div className="mx-4 mb-3 bg-gray-900 rounded-xl p-3 border border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-300">
            <strong className="text-white">{nearby.length}</strong> видов в радиусе 25 км
          </span>
          {foundCount > 0 && (
            <span className="text-sm text-forest-400 font-semibold">{foundCount} найдено ✓</span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
          <LoadingSpinner size={24} />
          <span>Загружаю наблюдения...</span>
        </div>
      )}

      {error && (
        <div className="mx-4 bg-red-950/50 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* List */}
      {!loading && nearby.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {nearby.map((bird) => {
            const found = uniqueCollected.has(bird.sciName.toLowerCase())
            return (
              <div
                key={bird.speciesCode}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  found ? 'bg-forest-950/40 border-forest-800' : 'bg-gray-900 border-gray-800'
                }`}
              >
                {bird.thumbnailUrl ? (
                  <img
                    src={bird.thumbnailUrl}
                    alt={bird.comName}
                    className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${found ? 'ring-2 ring-forest-500' : ''}`}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${found ? 'bg-forest-800' : 'bg-gray-800'}`}>
                    {found ? '✓' : cfg.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${found ? 'text-forest-300' : 'text-white'}`}>
                    {bird.comName || bird.sciName}
                  </p>
                  <p className="text-xs text-gray-500 italic truncate">{bird.sciName}</p>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  {bird.obsDt && (
                    <div className="flex items-center gap-1">
                      <MapPin size={10} />
                      <span>{formatTimeSince(bird.obsDt)}</span>
                    </div>
                  )}
                  {found && <div className="text-forest-400 font-medium">найдено ✓</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && nearby.length === 0 && lastFetch && (
        <div className="text-center py-16 text-gray-500 px-4">
          <span className="text-4xl block mb-3 opacity-30">{cfg.emoji}</span>
          <p>Нет наблюдений в радиусе 25 км</p>
        </div>
      )}
    </div>
  )
}
