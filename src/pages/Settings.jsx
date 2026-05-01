import { useState, useRef } from 'react'
import { LogOut, User, Pencil, Check, X, Plus, Trash2, RotateCcw, Download, Upload, AlertTriangle } from 'lucide-react'
import { FINANCE_ICONS } from '../utils/categories'

const API = import.meta.env.VITE_API_URL || '/api'

const EXPENSE_CATS = ['食費', '日用品', '交通費', '医療費', '衣類', '外食', '娯楽', 'その他']
const INCOME_CATS = ['給与', '副業', 'ボーナス', 'その他']

const INTERVALS = [
  { value: 1,  label: '毎月' },
  { value: 2,  label: '2ヶ月ごと' },
  { value: 3,  label: '3ヶ月ごと' },
  { value: 6,  label: '半年ごと' },
  { value: 12, label: '年1回' },
]

// その間隔・基準月で実際に発生する月を返す (1-12)
function occurrenceMonths(interval, startMonth) {
  const months = []
  for (let m = 1; m <= 12; m++) {
    if (((m - startMonth) % interval + interval) % interval === 0) months.push(m)
  }
  return months
}

// 一覧表示用ラベル
function intervalLabel(interval, startMonth) {
  if (interval === 1) return '毎月'
  const months = occurrenceMonths(interval, startMonth)
  return months.map(m => `${m}月`).join('・')
}

const emptyForm = { name: '', type: 'expense', amount: '', category: '食費', day_of_month: '1', interval_months: 1, start_month: 1 }

function RecurringSection({ store }) {
  const { recurring, addRecurring, updateRecurring, deleteRecurring } = store
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const openEdit = (r) => {
    setEditingId(r.id)
    setEditForm({
      name: r.name,
      type: r.type,
      amount: String(r.amount),
      category: r.category || (r.type === 'expense' ? '食費' : '給与'),
      day_of_month: String(r.day_of_month || 1),
      interval_months: r.interval_months || 1,
      start_month: r.start_month || 1,
    })
  }

  const handleEditSave = () => {
    if (!editForm.name.trim() || !editForm.amount) return
    updateRecurring(editingId, {
      name: editForm.name.trim(),
      type: editForm.type,
      amount: Number(editForm.amount),
      category: editForm.category,
      day_of_month: Number(editForm.day_of_month) || 1,
      interval_months: Number(editForm.interval_months) || 1,
      start_month: Number(editForm.start_month) || 1,
    })
    setEditingId(null)
  }

  const editCats = editForm.type === 'expense' ? EXPENSE_CATS : INCOME_CATS

  const handleAdd = () => {
    if (!form.name.trim() || !form.amount) return
    addRecurring({
      name: form.name.trim(),
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      day_of_month: Number(form.day_of_month) || 1,
      interval_months: Number(form.interval_months) || 1,
      start_month: Number(form.start_month) || 1,
      active: true,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  const cats = form.type === 'expense' ? EXPENSE_CATS : INCOME_CATS

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-700 flex items-center gap-2">
          <RotateCcw size={16} className="text-blue-500" /> 固定費・定期収入
        </p>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-xl">
          <Plus size={13} /> 追加
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 border border-blue-100 rounded-2xl p-4 bg-blue-50">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {['expense', 'income'].map(t => (
              <button key={t} type="button"
                onClick={() => setForm(p => ({ ...p, type: t, category: t === 'expense' ? '食費' : '給与' }))}
                className={`flex-1 py-2 text-sm font-semibold ${form.type === t
                  ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
                  : 'text-gray-400'}`}>
                {t === 'expense' ? '支出' : '収入'}
              </button>
            ))}
          </div>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="名称（例: 家賃、電気代、給与）" className="input" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="金額" className="input" />
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
              <input type="number" value={form.day_of_month}
                onChange={e => setForm(p => ({ ...p, day_of_month: e.target.value }))}
                min="1" max="31" className="flex-1 outline-none text-sm py-2 text-center" />
              <span className="text-xs text-gray-500">日</span>
            </div>
          </div>
          {/* 繰り返し間隔 */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {INTERVALS.map(iv => (
              <button key={iv.value} type="button"
                onClick={() => setForm(p => ({ ...p, interval_months: iv.value, start_month: 1 }))}
                className={`flex-1 py-1.5 text-xs font-semibold ${form.interval_months === iv.value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
                {iv.label}
              </button>
            ))}
          </div>
          {/* 基準月（毎月以外） */}
          {form.interval_months > 1 && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">基準月（どの月から数える？）</label>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: form.interval_months }, (_, i) => i + 1).map(m => (
                  <button key={m} type="button"
                    onClick={() => setForm(p => ({ ...p, start_month: m }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${form.start_month === m ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                    {m}月
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-500">
                → {occurrenceMonths(form.interval_months, form.start_month).map(m => `${m}月`).join('・')} に記録
              </p>
            </div>
          )}
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">キャンセル</button>
            <button onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm">追加する</button>
          </div>
        </div>
      )}

      {(recurring || []).length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-2">
          固定費・定期収入を登録すると<br />家計簿ページに未記録として表示されます
        </p>
      ) : (
        <div className="space-y-2">
          {(recurring || []).map(r => {
            const isEditing = editingId === r.id
            return (
              <div key={r.id} className="border-b border-gray-50 last:border-0">
                {/* 通常行 */}
                {!isEditing && (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-lg">{FINANCE_ICONS[r.category] || (r.type === 'income' ? '💴' : '📦')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.category} · {intervalLabel(r.interval_months || 1, r.start_month || 1)} {r.day_of_month}日</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${r.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.type === 'income' ? '+' : '-'}¥{Number(r.amount).toLocaleString()}
                    </p>
                    <button onClick={() => openEdit(r)}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-400 shrink-0">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteRecurring(r.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-400 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                {/* 編集フォーム */}
                {isEditing && (
                  <div className="py-3 space-y-2">
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                      {['expense', 'income'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setEditForm(p => ({ ...p, type: t, category: t === 'expense' ? '食費' : '給与' }))}
                          className={`flex-1 py-1.5 text-xs font-semibold ${editForm.type === t
                            ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
                            : 'text-gray-400'}`}>
                          {t === 'expense' ? '支出' : '収入'}
                        </button>
                      ))}
                    </div>
                    <input value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="名称" className="input" autoFocus />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={editForm.amount}
                        onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="金額" className="input" />
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
                        <input type="number" value={editForm.day_of_month}
                          onChange={e => setEditForm(p => ({ ...p, day_of_month: e.target.value }))}
                          min="1" max="31" className="flex-1 outline-none text-sm py-2 text-center" />
                        <span className="text-xs text-gray-500">日</span>
                      </div>
                    </div>
                    {/* 繰り返し間隔 */}
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
                      {INTERVALS.map(iv => (
                        <button key={iv.value} type="button"
                          onClick={() => setEditForm(p => ({ ...p, interval_months: iv.value, start_month: 1 }))}
                          className={`flex-1 py-1.5 text-xs font-semibold ${editForm.interval_months === iv.value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
                          {iv.label}
                        </button>
                      ))}
                    </div>
                    {/* 基準月（毎月以外） */}
                    {editForm.interval_months > 1 && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">基準月（どの月から数える？）</label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: editForm.interval_months }, (_, i) => i + 1).map(m => (
                            <button key={m} type="button"
                              onClick={() => setEditForm(p => ({ ...p, start_month: m }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${editForm.start_month === m ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                              {m}月
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-blue-500">
                          → {occurrenceMonths(editForm.interval_months, editForm.start_month).map(m => `${m}月`).join('・')} に記録
                        </p>
                      </div>
                    )}
                    <select value={editForm.category}
                      onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} className="input">
                      {editCats.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm">キャンセル</button>
                      <button onClick={handleEditSave}
                        className="flex-1 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm">保存</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DataSection({ store }) {
  const { backup, restore, finance, items, recurring } = store
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // 'ok' | 'error' | 'loading'
  const [confirmRestore, setConfirmRestore] = useState(null)

  const handleBackup = async () => {
    setStatus('loading')
    const data = await backup()
    if (!data) { setStatus('error'); return }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Kago_バックアップ_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('ok')
    setTimeout(() => setStatus(null), 2000)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.version !== '1.0') throw new Error('invalid')
        setConfirmRestore(data)
      } catch {
        setStatus('error')
        setTimeout(() => setStatus(null), 2000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleRestore = async () => {
    if (!confirmRestore) return
    setStatus('loading')
    setConfirmRestore(null)
    const ok = await restore(confirmRestore)
    setStatus(ok ? 'ok' : 'error')
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <p className="font-semibold text-gray-700">データ管理</p>
      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex justify-between"><span>家計簿</span><span>{finance.length}件</span></div>
        <div className="flex justify-between"><span>定番商品</span><span>{items.length}件</span></div>
        <div className="flex justify-between"><span>固定費・定期収入</span><span>{recurring.length}件</span></div>
      </div>

      <button onClick={handleBackup} disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
        <Download size={15} />
        {status === 'loading' ? '処理中...' : status === 'ok' ? '完了！' : 'バックアップを作成'}
      </button>

      <button onClick={() => fileRef.current?.click()} disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm disabled:opacity-60">
        <Upload size={15} /> バックアップから復元
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      {status === 'error' && (
        <p className="text-xs text-red-500 text-center">エラーが発生しました</p>
      )}

      {/* 復元確認ダイアログ */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} />
              <p className="font-bold">復元の確認</p>
            </div>
            <p className="text-sm text-gray-600">
              バックアップ（{confirmRestore.exported_at?.slice(0, 10)}）で現在のデータをすべて上書きします。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">キャンセル</button>
              <button onClick={handleRestore}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm">復元する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Settings({ store }) {
  const { username, handleLogout, sessionToken } = store
  const [editing, setEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPin, setNewPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleEdit = () => {
    setNewUsername(username)
    setNewPin('')
    setError('')
    setSuccess(false)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!newUsername.trim()) { setError('ユーザー名を入力してください'); return }
    if (newPin && (newPin.length !== 4 || !/^\d+$/.test(newPin))) {
      setError('PINは4桁の数字にしてください'); return
    }
    setSaving(true)
    setError('')
    try {
      const body = { username: newUsername.trim() }
      if (newPin) body.pin = newPin
      const r = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || '更新に失敗しました'); return }
      localStorage.setItem('username', d.username)
      store.setUsername?.(d.username)
      setSuccess(true)
      setTimeout(() => { setEditing(false); setSuccess(false) }, 1200)
    } catch {
      setError('サーバーに接続できません')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24 space-y-5">
      <h2 className="text-lg font-bold text-gray-800">設定</h2>

      {/* アカウント */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ユーザー名</label>
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                className="input" autoFocus />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">新しいPIN（変更する場合のみ）</label>
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4桁の数字" type="tel" inputMode="numeric"
                className="input text-center tracking-widest font-mono" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-emerald-500">保存しました</p>}
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm">
                <X size={14} /> キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-60">
                <Check size={14} /> {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User className="text-emerald-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{username}</p>
                <p className="text-xs text-gray-400">ログイン中</p>
              </div>
              <button onClick={handleEdit}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                <Pencil size={14} />
              </button>
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-100 text-red-400 rounded-xl text-sm">
              <LogOut size={15} /> ログアウト
            </button>
          </>
        )}
      </div>

      {/* 固定費・定期収入 */}
      <RecurringSection store={store} />

      {/* データ管理 */}
      <DataSection store={store} />

      {/* アプリ情報 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="font-semibold text-gray-700 mb-3">アプリ情報</p>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>バージョン</span><span>1.1.0</span></div>
          <div className="flex justify-between"><span>データ保存先</span><span>ローカルサーバー</span></div>
        </div>
      </div>
    </div>
  )
}
