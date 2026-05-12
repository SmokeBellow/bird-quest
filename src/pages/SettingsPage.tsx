import { useState } from 'react'
import { useBirdStore } from '../store'
import { Save, Trash2, AlertCircle, Server, LogIn, LogOut, CloudUpload } from 'lucide-react'
import { getBirdNetUrl } from '../services/birdnet'
import { supabase } from '../services/supabase'
import AuthModal from '../components/AuthModal'

export function SettingsPage() {
  const observations = useBirdStore((s) => s.observations)
  const supabaseUser = useBirdStore((s) => s.supabaseUser)
  const isSyncing = useBirdStore((s) => s.isSyncing)
  const uploadLocalToSupabase = useBirdStore((s) => s.uploadLocalToSupabase)
  const loadFromSupabase = useBirdStore((s) => s.loadFromSupabase)

  const [birdnetUrl, setBirdnetUrl] = useState(
    localStorage.getItem('birdnet-server-url') || ''
  )
  const [birdnetSaved, setBirdnetSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const saveBirdnet = () => {
    const trimmed = birdnetUrl.trim()
    if (trimmed) {
      localStorage.setItem('birdnet-server-url', trimmed)
    } else {
      localStorage.removeItem('birdnet-server-url')
    }
    setBirdnetSaved(true)
    setTimeout(() => setBirdnetSaved(false), 2000)
  }

  const clearAll = () => {
    localStorage.removeItem('bird-quest-store')
    localStorage.removeItem('birdnet-server-url')
    window.location.reload()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange in App.tsx will call setSupabaseUser(null)
  }

  const handleUpload = async () => {
    setSyncResult(null)
    const result = await uploadLocalToSupabase()
    setSyncResult(`Загружено: ${result.birds} птиц, ${result.plants} растений, ${result.fungi} грибов`)
  }

  const handleDownload = async () => {
    setSyncResult(null)
    await loadFromSupabase()
    setSyncResult('Данные загружены из аккаунта')
  }

  const activeUrl = getBirdNetUrl()

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Настройки</h1>

      {/* ── Auth section ── */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <LogIn size={18} className="text-emerald-400" />
          <h2 className="font-semibold text-white">Аккаунт</h2>
        </div>

        {supabaseUser ? (
          <>
            <p className="text-sm text-gray-300 mb-3">
              Вы вошли как <span className="text-white font-medium">{supabaseUser.email ?? supabaseUser.id}</span>
            </p>

            {syncResult && (
              <p className="text-xs text-emerald-400 mb-3">{syncResult}</p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpload}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-colors"
              >
                <CloudUpload size={15} />
                {isSyncing ? 'Загрузка...' : 'Сохранить локальные данные в аккаунт'}
              </button>
              <button
                onClick={handleDownload}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-colors"
              >
                {isSyncing ? 'Загрузка...' : 'Загрузить данные из аккаунта'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
              >
                <LogOut size={14} />
                Выйти
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">
              Войдите, чтобы сохранять наблюдения в облаке и не потерять их при смене устройства.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              <LogIn size={15} />
              Войти / Создать аккаунт
            </button>
          </>
        )}
      </div>

      {/* BirdNET server URL */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Server size={18} className="text-forest-400" />
          <h2 className="font-semibold text-white">BirdNET сервер</h2>
        </div>
        <p className="text-sm text-gray-400 mb-1">
          URL вашего BirdNET API (задеплоенного на Render или другом хостинге).
          Оставь пустым, если запускаешь локально.
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Сейчас используется: <span className="text-gray-400 font-mono">{activeUrl}</span>
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={birdnetUrl}
            onChange={(e) => { setBirdnetUrl(e.target.value); setBirdnetSaved(false) }}
            placeholder="https://birdquest-api.onrender.com"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-forest-600 font-mono"
          />
          <button
            onClick={saveBirdnet}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              birdnetSaved ? 'bg-green-700 text-white' : 'bg-forest-700 hover:bg-forest-600 text-white'
            }`}
          >
            <Save size={14} />
            {birdnetSaved ? 'OK!' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* API status */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 mb-4">
        <h2 className="font-semibold text-white mb-3">Используемые сервисы</h2>
        <div className="space-y-2 text-sm text-gray-400">
          {[
            ['iNaturalist Vision (фото)', true],
            ['Wikipedia (описания)', true],
            ['Xeno-canto (звуки птиц)', true],
            ['BirdNET (определение по пению)', !!activeUrl],
            ['eBird (птицы рядом)', true],
          ].map(([label, ok]) => (
            <div key={label as string} className="flex justify-between">
              <span>{label as string}</span>
              <span className={ok ? 'text-green-500' : 'text-yellow-500'}>
                {ok ? '✓ Активен' : 'Нужна настройка'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 mb-4">
        <h2 className="font-semibold text-white mb-2">Данные</h2>
        <p className="text-sm text-gray-400">
          Наблюдений: <strong className="text-white">{observations.length}</strong>
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {supabaseUser ? 'Синхронизируются с аккаунтом' : 'Хранятся локально в браузере'}
        </p>
      </div>

      {/* Clear data */}
      <div className="bg-red-950/20 rounded-2xl p-4 border border-red-900">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={16} className="text-red-500" />
          <h2 className="font-semibold text-red-400">Сбросить данные</h2>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          Удалит все наблюдения и достижения локально. Необратимо.
        </p>
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400"
          >
            <Trash2 size={14} />
            Очистить всё
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="flex-1 py-2 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              Да, удалить
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-white transition-colors"
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-700 mt-6">BirdQuest v0.1</p>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
