import { useState } from 'react'
import MoSoroLogo from '../components/MoSoroLogo'

const API = import.meta.env.VITE_API_URL || ''

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !pin.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      })
      if (!r.ok) { setError('ユーザー名またはPINが違います'); setLoading(false); return }
      const data = await r.json()
      onLogin(data.token, data.username)
    } catch {
      setError('サーバーに接続できませんでした')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="ユーザー名"
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base outline-none focus:border-emerald-400 transition-colors"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="username"
      />
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={e => setPin(e.target.value)}
        placeholder="PIN番号"
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base outline-none focus:border-emerald-400 transition-colors"
        autoComplete="current-password"
      />
      {error && <p className="text-red-400 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-emerald-200 active:bg-emerald-600 disabled:opacity-60 transition-all mt-2">
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}

function RegisterForm({ onDone }) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) { setError('ユーザー名を入力してください'); return }
    if (pin.length < 4) { setError('PINは4文字以上で設定してください'); return }
    if (pin !== confirm) { setError('PINが一致しません'); return }
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      })
      if (r.status === 409) { setError('このユーザー名はすでに使われています'); setLoading(false); return }
      if (!r.ok) { setError('エラーが発生しました'); setLoading(false); return }
      onDone(username.trim())
    } catch {
      setError('サーバーに接続できませんでした')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="ユーザー名"
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base outline-none focus:border-emerald-400 transition-colors"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={e => setPin(e.target.value)}
        placeholder="PIN番号（4文字以上）"
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base outline-none focus:border-emerald-400 transition-colors"
      />
      <input
        type="password"
        inputMode="numeric"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="PIN番号（確認）"
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base outline-none focus:border-emerald-400 transition-colors"
      />
      {error && <p className="text-red-400 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-emerald-200 active:bg-emerald-600 disabled:opacity-60 transition-all mt-2">
        {loading ? '登録中...' : 'アカウントを作成'}
      </button>
    </form>
  )
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [registered, setRegistered] = useState('')

  const handleRegistered = (uname) => {
    setRegistered(uname)
    setMode('login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <MoSoroLogo size={80} uid="login" />
          </div>
          <h1 className="text-3xl font-black text-gray-800">Mo-Soro</h1>
          <p className="text-gray-400 text-sm mt-1.5">もうそろそろ買わなきゃ、を教えてくれる</p>
        </div>

        {registered && mode === 'login' && (
          <p className="text-emerald-600 text-sm text-center bg-emerald-50 rounded-xl py-2 mb-3">
            「{registered}」を登録しました。ログインしてください。
          </p>
        )}

        {mode === 'login'
          ? <LoginForm onLogin={onLogin} />
          : <RegisterForm onDone={handleRegistered} />
        }

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setRegistered('') }}
          className="w-full mt-5 text-sm text-gray-400 text-center"
        >
          {mode === 'login' ? 'アカウントをお持ちでない方 →' : 'ログインに戻る'}
        </button>
      </div>
    </div>
  )
}
