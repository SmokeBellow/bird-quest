import { Link } from 'react-router-dom'
import { CheckCircle, Calendar, Camera, Mic } from 'lucide-react'
import type { ObservedBird } from '../types'

const methodIcon = { photo: Camera, sound: Mic, manual: CheckCircle }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const rarityLabel: Record<string, string> = {
  common: '',
  uncommon: 'Необычная',
  rare: 'Редкая',
  very_rare: 'Очень редкая',
}

const rarityColor: Record<string, string> = {
  uncommon: 'text-blue-400',
  rare: 'text-purple-400',
  very_rare: 'text-red-400',
}

export function BirdCard({ observation }: { observation: ObservedBird }) {
  const { bird } = observation
  const Icon = methodIcon[observation.method]

  return (
    <Link
      to={`/bird/${observation.id}`}
      className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl p-3 transition-colors border border-gray-800"
    >
      {bird.thumbnailUrl ? (
        <img
          src={bird.thumbnailUrl}
          alt={bird.commonName}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-800"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-2xl">
          🐦
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">
              {bird.ruName || bird.commonName}
            </p>
            <p className="text-xs text-gray-500 italic truncate">{bird.scientificName}</p>
            {bird.rarity && rarityLabel[bird.rarity] && (
              <span className={`text-xs font-medium ${rarityColor[bird.rarity]}`}>
                {rarityLabel[bird.rarity]}
              </span>
            )}
          </div>
          <Icon size={16} className="text-forest-400 flex-shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
          <Calendar size={11} />
          <span>{formatDate(observation.observedAt)}</span>
        </div>
      </div>
    </Link>
  )
}

export function BirdMiniCard({ observation }: { observation: ObservedBird }) {
  const { bird } = observation
  return (
    <Link
      to={`/bird/${observation.id}`}
      className="flex flex-col items-center bg-gray-900 hover:bg-gray-800 rounded-xl p-3 transition-colors border border-gray-800 gap-2"
    >
      {bird.thumbnailUrl ? (
        <img
          src={bird.thumbnailUrl}
          alt={bird.commonName}
          className="w-16 h-16 rounded-lg object-cover bg-gray-800"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-2xl">
          🐦
        </div>
      )}
      <p className="text-xs font-medium text-center text-white leading-tight line-clamp-2">
        {bird.ruName || bird.commonName}
      </p>
    </Link>
  )
}
