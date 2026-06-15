import { useState } from 'react'

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function Row({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
    >
      <span className={`text-sm ${danger ? 'text-red-500' : 'text-gray-700'}`}>{label}</span>
      <ChevronRight />
    </button>
  )
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl px-6 pt-5 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PinSheet({ onClose, changePin }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (next !== confirm) { setError('新しいPINが一致しません'); return }
    if (next.length < 4) { setError('4文字以上で設定してください'); return }
    setLoading(true)
    setError('')
    const r = await changePin(current, next)
    setLoading(false)
    if (r.error === 'wrong') { setError('現在のPINが違います'); return }
    if (r.error) { setError('エラーが発生しました'); return }
    onClose()
  }

  return (
    <BottomSheet title="PINを変更" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          inputMode="numeric"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="現在のPIN"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:border-emerald-400 transition-colors"
        />
        <input
          type="password"
          inputMode="numeric"
          value={next}
          onChange={e => setNext(e.target.value)}
          placeholder="新しいPIN（4文字以上）"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:border-emerald-400 transition-colors"
        />
        <input
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="新しいPIN（確認）"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:border-emerald-400 transition-colors"
        />
        {error && <p className="text-red-400 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-sm disabled:opacity-60 shadow-md shadow-emerald-200 mt-2"
        >
          {loading ? '変更中...' : '変更する'}
        </button>
      </form>
    </BottomSheet>
  )
}

export default function Settings({ username, handleLogout, changePin, resetData }) {
  const [modal, setModal] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  const handleReset = async () => {
    await resetData()
    setResetConfirm(false)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {modal === 'pin' && <PinSheet onClose={() => setModal(null)} changePin={changePin} />}

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 pb-8">
        {/* アカウント */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-600 font-bold text-sm">{username[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{username}</p>
              <p className="text-xs text-gray-400">ログイン中</p>
            </div>
          </div>
          <Row label="PINを変更" onClick={() => setModal('pin')} />
        </section>

        {/* データ管理 */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400">データ管理</p>
          </div>
          {resetConfirm ? (
            <div className="px-4 py-3 space-y-2.5">
              <p className="text-sm text-red-500">リスト・周期データをすべて削除します。元に戻せません。</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setResetConfirm(false)}
                  className="flex-1 py-2.5 text-sm text-gray-500 bg-gray-100 rounded-xl font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 text-sm text-white bg-red-500 rounded-xl font-medium"
                >
                  リセットする
                </button>
              </div>
            </div>
          ) : (
            <Row label="データをすべてリセット" onClick={() => setResetConfirm(true)} danger />
          )}
        </section>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-3.5 text-sm text-red-500 font-semibold text-center"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
