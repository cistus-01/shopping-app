import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')  // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/users`)
      .then(r => r.json())
      .then(d => { if (d.count === 0) setMode('register') })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || pin.length !== 4) {
      setError('ユーザー名と4桁のPINを入力してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'register') {
        const r = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), pin }),
        })
        if (!r.ok) {
          const d = await r.json()
          setError(d.error || '登録に失敗しました')
          setLoading(false)
          return
        }
      }
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || 'ログインに失敗しました')
      } else {
        onLogin(d.token, d.username)
      }
    } catch {
      setError('サーバーに接続できません')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <ShoppingCart size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Kago</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'register' ? 'アカウントを作成' : 'ログイン'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ユーザー名</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="例：葵"
              className="input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">PIN（4桁の数字）</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              type="tel"
              inputMode="numeric"
              className="input w-full text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-bold disabled:opacity-60">
            {loading ? '...' : mode === 'register' ? '登録してはじめる' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          {mode === 'login'
            ? <button onClick={() => { setMode('register'); setError('') }} className="text-emerald-500">新規登録はこちら</button>
            : <button onClick={() => { setMode('login'); setError('') }} className="text-emerald-500">ログインはこちら</button>
          }
        </p>
      </div>
    </div>
  )
}
