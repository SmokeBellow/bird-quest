import { useState } from 'react'
import { supabase, getOAuthRedirectUrl } from '../services/supabase'

interface Props {
  onClose: () => void
}

type Mode = 'login' | 'register' | 'forgot'

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const clearMessages = () => { setError(null); setMessage(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Письмо с подтверждением отправлено на ' + email)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getOAuthRedirectUrl(),
        })
        if (error) throw error
        setMessage('Ссылка для сброса пароля отправлена на ' + email)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearMessages()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getOAuthRedirectUrl() },
      })
      if (error) throw error
      // Page will redirect — no need to close modal
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : 'Сброс пароля'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg px-3 py-2 text-red-300 text-sm">{error}</div>
        )}
        {message && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg px-3 py-2 text-green-300 text-sm">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition-colors"
          >
            {loading ? '...' : title}
          </button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex-1 h-px bg-gray-700" />
              <span>или</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-semibold rounded-lg py-2.5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.5 13.3l7.8 6.1C12.4 13.2 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.5c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17z"/>
                <path fill="#FBBC05" d="M10.3 28.6A14.7 14.7 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.5 13.3A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.8-6.1z"/>
                <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-3.7-13.7-9l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/>
              </svg>
              Войти через Google
            </button>
          </>
        )}

        <div className="text-sm text-center text-gray-400 space-x-3">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); clearMessages() }} className="hover:text-white transition-colors">
                Создать аккаунт
              </button>
              <span>·</span>
              <button onClick={() => { setMode('forgot'); clearMessages() }} className="hover:text-white transition-colors">
                Забыл пароль
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); clearMessages() }} className="hover:text-white transition-colors">
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
