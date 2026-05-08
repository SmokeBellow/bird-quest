import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Mic, MicOff, Upload, Search, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useBirdStore } from '../store'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { identifyFromImage, searchBirdByName } from '../services/inaturalist'
import {
  identifyFromAudio,
  checkBirdNetStatus,
  BirdNetUnavailableError,
  type BirdNetStatus,
} from '../services/birdnet'
import { blobToWav } from '../utils/audioToWav'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { IdentifyResult, Bird } from '../types'

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct > 70 ? 'bg-green-500' : pct > 40 ? 'bg-yellow-500' : 'bg-orange-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

function BirdNetSetupBanner() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-yellow-950/40 border border-yellow-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <AlertCircle size={20} className="text-yellow-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-yellow-300 font-semibold text-sm">BirdNET не запущен</p>
          <p className="text-yellow-600 text-xs">Нажми, чтобы узнать как настроить</p>
        </div>
        <Info size={16} className="text-yellow-600" />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 text-sm text-gray-300 border-t border-yellow-900/50 pt-3">
          <p className="text-yellow-200 font-medium">Установка BirdNET-Analyzer (один раз):</p>
          <ol className="space-y-1.5 text-gray-400 list-decimal list-inside">
            <li>Установи <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Python 3.9+</a></li>
            <li>Установи <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ffmpeg</a> и добавь в PATH</li>
            <li>
              В терминале:
              <pre className="mt-1 bg-gray-900 rounded p-2 text-xs font-mono overflow-x-auto">{`pip install birdnet-analyzer\npython -m birdnet_analyzer.server --port 8080`}</pre>
            </li>
            <li>Перезапусти приложение</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export function IdentifyPage() {
  const navigate = useNavigate()
  const location = useGeolocation()
  const addObservation = useBirdStore((s) => s.addObservation)

  const [mode, setMode] = useState<'photo' | 'sound' | 'search'>('photo')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [photoResults, setPhotoResults] = useState<IdentifyResult[] | null>(null)
  const [soundResults, setSoundResults] = useState<{ commonName: string; scientificName: string; confidence: number }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Bird[] | null>(null)
  const [birdNetStatus, setBirdNetStatus] = useState<BirdNetStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const recorder = useAudioRecorder()

  const checkStatus = useCallback(() => {
    checkBirdNetStatus().then((status) => {
      setBirdNetStatus(status)
      // Keep polling while loading (model initializing)
      if (status === 'loading') return
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    })
  }, [])

  useEffect(() => {
    if (mode !== 'sound') return
    if (birdNetStatus !== null && birdNetStatus !== 'loading' && birdNetStatus !== 'waking') return

    checkStatus()

    // Poll every 10s while loading or waking
    if (!pollRef.current) {
      pollRef.current = setInterval(checkStatus, 10000)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [mode, birdNetStatus, checkStatus])

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setPhotoResults(null)
    setError(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith('image/')) handleImageSelect(file)
    },
    [handleImageSelect]
  )

  const identifyImage = async () => {
    if (!imageFile) return
    setLoading(true)
    setError(null)
    try {
      const res = await identifyFromImage(imageFile, location?.lat, location?.lng)
      if (res.length === 0) {
        setError('Птица не распознана. Попробуйте другое фото с чёткой птицей.')
      } else {
        setPhotoResults(res)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при определении. Проверьте интернет-соединение.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (recorder.state !== 'stopped' || !recorder.audioBlob) return
    ;(async () => {
      setLoading(true)
      setError(null)
      setSoundResults(null)
      try {
        const wavBlob = await blobToWav(recorder.audioBlob!)
        const detections = await identifyFromAudio(wavBlob, location?.lat, location?.lng)
        if (detections.length === 0) {
          setError('Птица не распознана. Попробуй записать дольше (10–15 сек) или ближе к источнику.')
        } else {
          setSoundResults(detections)
        }
      } catch (err) {
        if (err instanceof BirdNetUnavailableError) {
          setBirdNetStatus('unavailable')
        } else {
          setError('Ошибка анализа. Проверь соединение с BirdNET сервером.')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [recorder.state, recorder.audioBlob]) // eslint-disable-line

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    try {
      const birds = await searchBirdByName(searchQuery.trim())
      if (birds.length === 0) setError('Ничего не найдено')
      else setSearchResults(birds)
    } catch {
      setError('Ошибка поиска')
    } finally {
      setLoading(false)
    }
  }

  const addBird = (bird: Bird, method: 'photo' | 'sound' | 'manual') => {
    const obs = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      bird,
      observedAt: new Date().toISOString(),
      location: location ?? undefined,
      method,
      imageUrl: method === 'photo' ? (preview ?? undefined) : undefined,
    }
    addObservation(obs)
    navigate(`/bird/${obs.id}`)
  }

  const birdNetResultToBird = (det: { commonName: string; scientificName: string }): Bird => ({
    id: `birdnet_${det.scientificName.replace(/\s+/g, '_').toLowerCase()}`,
    commonName: det.commonName,
    scientificName: det.scientificName,
  })

  const clearImage = () => {
    setPreview(null)
    setImageFile(null)
    setPhotoResults(null)
    setError(null)
  }

  const resetSound = () => {
    recorder.reset()
    setSoundResults(null)
    setError(null)
  }

  const isRecordingDisabled =
    birdNetStatus === null || birdNetStatus === 'loading' || birdNetStatus === 'waking'

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-1">Определить птицу</h1>
      <p className="text-gray-400 text-sm mb-4">По фото, пению или поиску по названию</p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl">
        {([
          { id: 'photo', icon: Camera, label: 'Фото' },
          { id: 'sound', icon: Mic, label: 'Звук' },
          { id: 'search', icon: Search, label: 'Поиск' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setPhotoResults(null); setSoundResults(null); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === id ? 'bg-forest-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── PHOTO MODE ── */}
      {mode === 'photo' && (
        <div className="space-y-4">
          {!preview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-forest-600 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors text-center"
            >
              <Upload size={40} className="text-gray-600" />
              <p className="text-gray-400">Нажми или перетащи фото птицы</p>
              <p className="text-xs text-gray-600">JPG, PNG, WEBP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageSelect(f)
                }}
              />
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full rounded-2xl object-cover max-h-72" />
              <button onClick={clearImage} className="absolute top-2 right-2 bg-gray-900/80 rounded-full p-1.5 text-white hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>
          )}

          {preview && !photoResults && (
            <button
              onClick={identifyImage}
              disabled={loading}
              className="w-full py-3 bg-forest-700 hover:bg-forest-600 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <><LoadingSpinner size={20} /> Определяю...</> : <><Search size={20} /> Определить птицу</>}
            </button>
          )}

          {photoResults && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-300">Результаты — выбери правильный вариант:</p>
              {photoResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => addBird(r.bird, 'photo')}
                  className="w-full flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl p-3 transition-colors border border-gray-800 text-left"
                >
                  {r.bird.thumbnailUrl && (
                    <img src={r.bird.thumbnailUrl} alt={r.bird.commonName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{r.bird.commonName}</p>
                    <p className="text-xs text-gray-500 italic truncate">{r.bird.scientificName}</p>
                    <ConfidenceBar value={r.confidence} />
                  </div>
                  <CheckCircle size={20} className="text-forest-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOUND MODE ── */}
      {mode === 'sound' && (
        <div className="space-y-4">
          {birdNetStatus === 'unavailable' && <BirdNetSetupBanner />}

          <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-4 border border-gray-800">
            {recorder.state === 'idle' && (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${birdNetStatus === 'available' ? 'bg-forest-900' : 'bg-gray-800'}`}>
                  <Mic size={36} className={birdNetStatus === 'available' ? 'text-forest-400' : 'text-gray-600'} />
                </div>

                {/* Status messages */}
                {birdNetStatus === null && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <LoadingSpinner size={16} /> Проверяю BirdNET…
                  </div>
                )}
                {birdNetStatus === 'waking' && (
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-medium">
                      <LoadingSpinner size={16} className="text-yellow-400" /> Сервер просыпается…
                    </div>
                    <p className="text-xs text-gray-500">Render бесплатный тариф — первый запрос до 60 сек</p>
                  </div>
                )}
                {birdNetStatus === 'loading' && (
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 text-blue-400 text-sm font-medium">
                      <LoadingSpinner size={16} className="text-blue-400" /> Загружаю модель BirdNET…
                    </div>
                    <p className="text-xs text-gray-500">Первый запуск занимает 1–2 минуты</p>
                  </div>
                )}
                {birdNetStatus === 'available' && (
                  <div className="text-center">
                    <p className="text-gray-200 font-medium">BirdNET готов ✓</p>
                    <p className="text-gray-500 text-sm mt-1">Направь микрофон на птицу и нажми запись</p>
                    <p className="text-xs text-gray-600 mt-1">Оптимально 10–20 секунд пения</p>
                  </div>
                )}
                {birdNetStatus === 'unavailable' && (
                  <p className="text-gray-500 text-sm text-center">Настрой BirdNET сервер выше</p>
                )}

                <button
                  onClick={recorder.start}
                  disabled={isRecordingDisabled}
                  className="px-8 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                  <Mic size={18} /> Начать запись
                </button>
              </>
            )}

            {recorder.state === 'recording' && (
              <>
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-red-800/30 rounded-full animate-ping" />
                  <div className="relative w-20 h-20 bg-red-900 rounded-full flex items-center justify-center">
                    <Mic size={36} className="text-red-400" />
                  </div>
                </div>
                <p className="text-red-400 font-bold text-2xl tabular-nums">
                  {String(Math.floor(recorder.duration / 60)).padStart(2, '0')}:
                  {String(recorder.duration % 60).padStart(2, '0')}
                </p>
                <p className="text-gray-400 text-sm">Запись идёт…</p>
                {recorder.duration < 5 && (
                  <p className="text-xs text-gray-600">Ещё {5 - recorder.duration} сек для минимальной точности</p>
                )}
                <button
                  onClick={() => recorder.stop()}
                  className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold flex items-center gap-2"
                >
                  <MicOff size={18} /> Остановить и определить
                </button>
              </>
            )}

            {recorder.state === 'stopped' && loading && (
              <div className="flex flex-col items-center gap-3 py-4">
                <LoadingSpinner size={36} className="text-forest-400" />
                <p className="text-gray-300 font-medium">Анализирую звук…</p>
                <p className="text-xs text-gray-500">BirdNET обрабатывает запись</p>
              </div>
            )}
          </div>

          {soundResults && soundResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-300">
                BirdNET распознал {soundResults.length} вариант{soundResults.length > 1 ? 'а' : ''}:
              </p>
              {soundResults.map((det, i) => (
                <button
                  key={i}
                  onClick={() => addBird(birdNetResultToBird(det), 'sound')}
                  className="w-full flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl p-3 transition-colors border border-gray-800 text-left"
                >
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🎵</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{det.commonName}</p>
                    <p className="text-xs text-gray-500 italic truncate">{det.scientificName}</p>
                    <ConfidenceBar value={det.confidence} />
                  </div>
                  <CheckCircle size={20} className="text-forest-400 flex-shrink-0" />
                </button>
              ))}
              <button onClick={resetSound} className="text-sm text-gray-500 underline mx-auto block">
                Записать снова
              </button>
            </div>
          )}

          {recorder.state === 'stopped' && !loading && !soundResults && !error && (
            <div className="text-center">
              <button onClick={resetSound} className="text-sm text-gray-500 underline">Записать снова</button>
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH MODE ── */}
      {mode === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Название птицы (рус. или англ.)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-forest-600"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-3 bg-forest-700 hover:bg-forest-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size={20} /> : <Search size={20} />}
            </button>
          </div>

          {searchResults && (
            <div className="space-y-2">
              {searchResults.map((bird) => (
                <button
                  key={bird.id}
                  onClick={() => addBird(bird, 'manual')}
                  className="w-full flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl p-3 transition-colors border border-gray-800 text-left"
                >
                  {bird.thumbnailUrl ? (
                    <img src={bird.thumbnailUrl} alt={bird.commonName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🐦</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{bird.commonName}</p>
                    <p className="text-xs text-gray-500 italic truncate">{bird.scientificName}</p>
                  </div>
                  <CheckCircle size={20} className="text-forest-400 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-950/50 border border-red-800 rounded-xl p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
