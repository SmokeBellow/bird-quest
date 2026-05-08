import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Volume2, Trash2, MapPin } from 'lucide-react'
import { useBirdStore } from '../store'
import { getBirdWikiInfo } from '../services/wikipedia'
import { getBirdSounds } from '../services/xenocanto'
import { getBirdDetails } from '../services/inaturalist'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { BirdSound } from '../types'

export function BirdDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const observations = useBirdStore((s) => s.observations)
  const removeObservation = useBirdStore((s) => s.removeObservation)
  const updateBirdInfo = useBirdStore((s) => s.updateBirdInfo)

  const observation = observations.find((o) => o.id === id)
  const [sounds, setSounds] = useState<BirdSound[]>([])
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!observation) return
    const bird = observation.bird

    // Fetch extra info if missing
    const needsWiki = !bird.description
    const needsDetails = !bird.order && bird.inaturalistId

    if (!needsWiki && !needsDetails) return

    setLoadingExtra(true)
    const promises: Promise<void>[] = []

    if (needsWiki) {
      promises.push(
        getBirdWikiInfo(bird.scientificName).then((info) => {
          if (info) {
            updateBirdInfo(bird.id, {
              description: info.description,
              facts: info.facts,
              imageUrl: info.imageUrl || bird.imageUrl,
            })
          }
        })
      )
    }

    if (needsDetails && bird.inaturalistId) {
      promises.push(
        getBirdDetails(bird.inaturalistId).then((details) => {
          if (details) updateBirdInfo(bird.id, details)
        })
      )
    }

    Promise.all(promises).finally(() => setLoadingExtra(false))
  }, [observation?.id]) // eslint-disable-line

  useEffect(() => {
    if (!observation) return
    getBirdSounds(observation.bird.scientificName).then(setSounds)
  }, [observation?.id]) // eslint-disable-line

  const togglePlay = (sound: BirdSound) => {
    if (playingId === sound.id) {
      audio?.pause()
      setPlayingId(null)
      setAudio(null)
      return
    }
    audio?.pause()
    const a = new Audio(sound.url)
    a.play()
    setPlayingId(sound.id)
    setAudio(a)
    a.onended = () => { setPlayingId(null); setAudio(null) }
  }

  const handleDelete = () => {
    if (!id) return
    removeObservation(id)
    navigate('/collection', { replace: true })
  }

  if (!observation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400">Наблюдение не найдено</p>
        <button onClick={() => navigate(-1)} className="text-forest-400 underline">
          Назад
        </button>
      </div>
    )
  }

  const { bird } = observation
  const methodLabel = { photo: 'Фото', sound: 'Звук', manual: 'Вручную' }

  return (
    <div className="max-w-lg mx-auto animate-fade-in pb-6">
      {/* Hero image */}
      <div className="relative">
        {bird.imageUrl || observation.imageUrl ? (
          <img
            src={observation.imageUrl || bird.imageUrl}
            alt={bird.commonName}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-56 bg-gray-900 flex items-center justify-center text-6xl">
            🐦
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-gray-900/70 rounded-full p-2 text-white"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-4 -mt-10 relative">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">
            {bird.ruName || bird.commonName}
          </h1>
          {bird.ruName && bird.commonName !== bird.ruName && (
            <p className="text-forest-400">{bird.commonName}</p>
          )}
          <p className="text-gray-500 italic text-sm">{bird.scientificName}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
              {methodLabel[observation.method]}
            </span>
            {bird.order && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                {bird.order}
              </span>
            )}
            {bird.family && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                {bird.family}
              </span>
            )}
            {bird.rarity && bird.rarity !== 'common' && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                bird.rarity === 'very_rare' ? 'bg-red-900 text-red-300' :
                bird.rarity === 'rare' ? 'bg-purple-900 text-purple-300' :
                'bg-blue-900 text-blue-300'
              }`}>
                {bird.rarity === 'very_rare' ? 'Очень редкая' : bird.rarity === 'rare' ? 'Редкая' : 'Необычная'}
              </span>
            )}
          </div>
        </div>

        {/* Observation info */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-4 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Дата</p>
            <p className="text-sm text-white">
              {new Date(observation.observedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {observation.location && (
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <MapPin size={14} />
              <span>
                {observation.location.lat.toFixed(4)}, {observation.location.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {loadingExtra && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <LoadingSpinner size={16} />
            <span>Загружаю информацию...</span>
          </div>
        )}

        {/* Description */}
        {bird.description && (
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-200 mb-2">Описание</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{bird.description}</p>
          </div>
        )}

        {/* Facts */}
        {bird.facts && bird.facts.length > 0 && (
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-200 mb-2">Интересные факты</h2>
            <div className="space-y-2">
              {bird.facts.map((fact, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-forest-500 mt-0.5">•</span>
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sounds */}
        {sounds.length > 0 && (
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-200 mb-2">Пение и звуки</h2>
            <div className="space-y-2">
              {sounds.map((sound) => (
                <div
                  key={sound.id}
                  className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800"
                >
                  <button
                    onClick={() => togglePlay(sound)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      playingId === sound.id
                        ? 'bg-forest-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {playingId === sound.id ? '⏸' : <Volume2 size={18} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-300 truncate">{sound.type || 'Запись'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {sound.recordist} · {sound.country}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {bird.wikipediaUrl && (
          <a
            href={bird.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-forest-400 hover:text-forest-300 text-sm mb-4"
          >
            <ExternalLink size={14} />
            Открыть в Wikipedia
          </a>
        )}

        {/* Delete */}
        <div className="mt-6 border-t border-gray-800 pt-4">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm"
            >
              <Trash2 size={16} />
              Удалить наблюдение
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-semibold text-white transition-colors"
              >
                Удалить
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-white transition-colors"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
