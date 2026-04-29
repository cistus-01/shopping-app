import { useEffect, useState, useMemo } from 'react'
import { AlertCircle, ChevronRight, Plus, X, Check, RefreshCw, Pencil, ShoppingCart, Store, LayoutList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { requestPermission, scheduleCheck } from '../utils/notifications'

const CATEGORIES = ['食料品', '日用品', '医薬品', '衣類', 'その他']
const UNIT_TYPES = ['個', 'ml', 'g', 'L', 'kg', '枚', '袋', '本', 'm']

// チェック済みアイテムの購入情報記録モーダル
function RecordModal({ item, stores, itemPrices, onConfirm, onClose }) {
  const myPrices = (itemPrices || []).filter(p => p.item_id === item.itemId)
  const hasPreFill = !!(item.price && item.store)
  const [editing, setEditing] = useState(!hasPreFill)
  const [price, setPrice] = useState(item.price ? String(item.price) : '')
  const [storeName, setStoreName] = useState(item.store || '')
  const [quantity, setQuantity] = useState(String(item.quantity || 1))
  const [unitSize, setUnitSize] = useState('')
  const [unitType, setUnitType] = useState('ml')

  const qty = Number(quantity) || 1
  const total = price && qty > 1 ? Number(price) * qty : null

  const applyRegisteredPrice = (p) => {
    setStoreName(p.store_name)
    setPrice(String(p.price))
    if (p.unit_size) { setUnitSize(String(p.unit_size)); setUnitType(p.unit_type || 'ml') }
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-center">購入情報を記録</h3>
        <p className="text-center font-medium text-gray-700">
          {item.name}
          {qty > 1 && <span className="text-gray-400 text-sm font-normal"> × {qty}</span>}
        </p>

        {!editing ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">お店</span>
              <span className="text-sm font-semibold text-gray-800">{storeName || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">価格</span>
              <span className="text-sm font-semibold text-gray-800">
                ¥{Number(price).toLocaleString()}
                {total && <span className="text-gray-400 font-normal"> × {qty} = ¥{total.toLocaleString()}</span>}
              </span>
            </div>
            <button onClick={() => setEditing(true)}
              className="w-full text-xs text-blue-500 text-right pt-0.5">変更 ›</button>
          </div>
        ) : (
          <div className="space-y-3">
            {myPrices.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2">登録済み価格からワンタップ入力</p>
                <div className="flex flex-wrap gap-2">
                  {myPrices.sort((a,b) => a.price - b.price).map(p => (
                    <button key={p.id} onClick={() => applyRegisteredPrice(p)}
                      className="text-xs bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-blue-700 font-medium active:bg-blue-100">
                      {p.store_name} ¥{Number(p.price).toLocaleString()}
                      {p.unit_size && <span className="text-blue-400"> ({p.unit_size}{p.unit_type})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">お店</label>
                <input className="input" placeholder="例: イオン" value={storeName}
                  onChange={e => setStoreName(e.target.value)} list="record-store-list" />
                <datalist id="record-store-list">
                  {(stores||[]).map(s => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">価格（円）</label>
                <input type="number" className="input" placeholder="例: 298"
                  value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">数量</label>
                <input type="number" className="input" min="1" value={quantity}
                  onChange={e => setQuantity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">内容量（任意）</label>
                <div className="flex gap-1">
                  <input type="number" className="input flex-1 min-w-0" placeholder="500"
                    value={unitSize} onChange={e => setUnitSize(e.target.value)} />
                  <select className="input w-14 px-1 text-sm" value={unitType}
                    onChange={e => setUnitType(e.target.value)}>
                    {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {total && <p className="text-xs text-gray-400 text-right">合計 ¥{total.toLocaleString()}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm">
            キャンセル
          </button>
          <button onClick={() => onConfirm({
            price: price ? Number(price) : null,
            store: storeName,
            quantity: qty,
            unitSize: unitSize ? Number(unitSize) : null,
            unitType,
          })} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm">
            記録して完了
          </button>
        </div>
      </div>
    </div>
  )
}

// 今日買ったもの：家計簿エントリの編集モーダル
function FinanceEditModal({ entry, stores, onSave, onDelete, onClose }) {
  const CATS = ['食料品', '日用品', '医薬品', '衣類', 'その他', '食費', '外食']
  const [name, setName] = useState(entry.name || '')
  const [storeName, setStoreName] = useState(entry.store || '')
  const [amount, setAmount] = useState(String(entry.amount || ''))
  const [category, setCategory] = useState(entry.category || '食費')
  const [note, setNote] = useState(entry.note || '')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-center">記録を修正</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">商品名</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">お店</label>
            <input className="input" value={storeName} onChange={e => setStoreName(e.target.value)} list="fedit-store-list" />
            <datalist id="fedit-store-list">{(stores||[]).map(s => <option key={s.id} value={s.name} />)}</datalist>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">金額（円）</label>
            <input type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <input className="input" placeholder="メモ" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={() => onDelete(entry.id)}
            className="py-3 px-4 rounded-2xl border border-red-100 text-red-400 text-sm">削除</button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm">キャンセル</button>
          <button onClick={() => onSave(entry.id, { name, store: storeName, amount: Number(amount), category, note })}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm">保存</button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ item, stores, onSave, onClose }) {
  const [name, setName] = useState(item.name)
  const [store, setStore] = useState(item.store || '')
  const [price, setPrice] = useState(item.price ? String(item.price) : '')
  const [quantity, setQuantity] = useState(String(item.quantity || 1))
  const [category, setCategory] = useState(item.category || 'その他')
  const [note, setNote] = useState(item.note || '')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-center">アイテムを編集</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="商品名" className="input" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <input value={store} onChange={e => setStore(e.target.value)} placeholder="お店" className="input" list="edit-store-list" />
          <datalist id="edit-store-list">{(stores||[]).map(s => <option key={s.id} value={s.name} />)}</datalist>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="価格" className="input" />
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="数量" className="input" min="1" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="メモ（例：特売 138円、2個入り）" className="input" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
          <button onClick={() => onSave({ name: name.trim(), store, price: price ? Number(price) : null, quantity: Number(quantity)||1, category, note })}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">保存</button>
        </div>
      </div>
    </div>
  )
}

function AddModal({ stores, onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', store: '', price: '', category: '食料品', quantity: '1', note: '' })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({ ...form, price: form.price ? Number(form.price) : null, quantity: Number(form.quantity) || 1 })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-center">アイテムを追加</h3>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="商品名 *" className="input" required autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}
            placeholder="お店" className="input" list="add-store-list" />
          <datalist id="add-store-list">{(stores||[]).map(s => <option key={s.id} value={s.name} />)}</datalist>
          <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
            placeholder="価格" className="input" />
          <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
            placeholder="数量" className="input" min="1" />
        </div>
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
          placeholder="メモ（例：特売 138円）" className="input" />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">追加</button>
        </div>
      </form>
    </div>
  )
}

export default function Home({ store }) {
  const { list, finance, getDueItems, items, getFutureSpendings, getMonthlyForecast, budgets,
    addToList, toggleListItem, deleteListItem, updateListItem, clearChecked, addItemToList,
    finalizeListItem, getSuggestions, stores, syncing, manualSync, pendingWrites,
    itemPrices, updateFinance, deleteFinance, updateItem } = store

  const [period, setPeriod] = useState('month') // 'week' | 'month'
  const [quickAdd, setQuickAdd] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showRegular, setShowRegular] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [recordTarget, setRecordTarget] = useState(null)   // 記録モーダル対象
  const [financeEditTarget, setFinanceEditTarget] = useState(null) // 家計簿編集対象
  const [listView, setListView] = useState('all') // 'all' | 'store'

  const dueItems = getDueItems()
  const unchecked = list.filter(x => !x.checked)
  const checked = list.filter(x => x.checked)

  // 買い物合計
  const checkedTotal = checked.reduce((s, x) => s + (x.price ? Number(x.price) * (x.quantity || 1) : 0), 0)
  const uncheckedTotal = unchecked.reduce((s, x) => s + (x.price ? Number(x.price) * (x.quantity || 1) : 0), 0)

  // 店別グループ
  const byStore = useMemo(() => {
    const groups = {}
    list.filter(x => !x.checked).forEach(item => {
      const key = item.store?.trim() || '未設定'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === '未設定') return 1
      if (b === '未設定') return -1
      return a.localeCompare(b, 'ja')
    })
    return keys.map(k => ({ storeName: k, items: groups[k] }))
  }, [list])

  const today = new Date()

  // 週/月の集計
  const stats = useMemo(() => {
    const ym = format(today, 'yyyy-MM')
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // 月曜始まり
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    const monthExpense = finance
      .filter(f => f.type === 'expense' && f.date?.startsWith(ym))
      .reduce((s, f) => s + (f.amount || 0), 0)
    const monthIncome = finance
      .filter(f => f.type === 'income' && f.date?.startsWith(ym))
      .reduce((s, f) => s + (f.amount || 0), 0)

    const weekExpense = finance
      .filter(f => f.type === 'expense' && f.date >= weekStartStr && f.date <= weekEndStr)
      .reduce((s, f) => s + (f.amount || 0), 0)
    const weekIncome = finance
      .filter(f => f.type === 'income' && f.date >= weekStartStr && f.date <= weekEndStr)
      .reduce((s, f) => s + (f.amount || 0), 0)

    return { monthExpense, monthIncome, weekExpense, weekIncome }
  }, [finance, today])

  // 支出予定額の計算
  const forecast = useMemo(() => {
    const listTotal = unchecked.reduce((s, x) => s + (x.price ? Number(x.price) * (x.quantity || 1) : 0), 0)

    if (period === 'month') {
      const monthForecast = getMonthlyForecast()
      // 過去3ヶ月の平均支出（統計）
      const now = new Date()
      const past3 = Array.from({ length: 3 }, (_, i) =>
        new Date(now.getFullYear(), now.getMonth() - i - 1, 1).toISOString().slice(0, 7)
      )
      const pastExpenses = finance.filter(f => f.type === 'expense' && past3.some(m => f.date?.startsWith(m)))
      const historicalAvg = pastExpenses.length > 0
        ? pastExpenses.reduce((s, f) => s + f.amount, 0) / 3
        : 0

      return {
        confirmed: monthForecast.confirmed,
        fromList: listTotal,
        fromItems: monthForecast.fromItems,
        historicalAvg: Math.round(historicalAvg),
        total: monthForecast.confirmed + listTotal + monthForecast.fromItems,
      }
    } else {
      // 週の場合: 今週確定 + リスト + 今週中に来る定番
      const weekItems = getFutureSpendings(7)
      const fromWeekItems = weekItems.reduce((s, x) => s + (x.item.price || 0), 0)
      return {
        confirmed: stats.weekExpense,
        fromList: listTotal,
        fromItems: fromWeekItems,
        historicalAvg: 0,
        total: stats.weekExpense + listTotal + fromWeekItems,
      }
    }
  }, [period, unchecked, finance, getMonthlyForecast, getFutureSpendings, stats])

  const expense = period === 'month' ? stats.monthExpense : stats.weekExpense
  const income = period === 'month' ? stats.monthIncome : stats.weekIncome
  const balance = income - expense
  const budgetPct = period === 'month' && budgets.monthly > 0
    ? Math.min(100, expense / budgets.monthly * 100) : null

  const handleQuickAddChange = (val) => {
    setQuickAdd(val)
    setSuggestions(val.trim() ? getSuggestions(val) : [])
  }

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (!quickAdd.trim()) return
    addToList({ name: quickAdd.trim(), category: 'その他', quantity: 1 })
    setQuickAdd('')
    setSuggestions([])
  }

  const handleSelectSuggestion = (s) => {
    if (s.itemRef) addItemToList(s.itemRef)
    else addToList({ name: s.name, store: s.store, price: s.price, category: s.category || 'その他', quantity: 1 })
    setQuickAdd('')
    setSuggestions([])
  }

  // チェック = カートに入れる/外す（記録はしない）
  const handleCheck = (item) => toggleListItem(item.id)

  // 今日の支出記録
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayBought = finance.filter(f => f.type === 'expense' && f.date === todayStr)

  useEffect(() => {
    requestPermission().then(ok => { if (ok) scheduleCheck(getDueItems) })
  }, [])

  return (
    <div className="space-y-3 pb-24">

      {recordTarget && (
        <RecordModal
          item={recordTarget} stores={stores||[]} itemPrices={itemPrices||[]}
          onConfirm={(data) => { finalizeListItem(recordTarget.id, data); setRecordTarget(null) }}
          onClose={() => setRecordTarget(null)} />
      )}
      {financeEditTarget && (
        <FinanceEditModal
          entry={financeEditTarget} stores={stores||[]}
          onSave={(id, patch) => { updateFinance(id, patch); setFinanceEditTarget(null) }}
          onDelete={(id) => { deleteFinance(id); setFinanceEditTarget(null) }}
          onClose={() => setFinanceEditTarget(null)} />
      )}
      {editTarget && (
        <EditModal item={editTarget} stores={stores||[]}
          onSave={(patch) => {
            updateListItem(editTarget.id, patch)
            // カテゴリ変更を定番アイテムにも反映（何度修正しても戻る問題を防ぐ）
            if (editTarget.itemId && patch.category) updateItem(editTarget.itemId, { category: patch.category })
            setEditTarget(null)
          }}
          onClose={() => setEditTarget(null)} />
      )}
      {showAddModal && (
        <AddModal stores={stores||[]} onAdd={addToList} onClose={() => setShowAddModal(false)} />
      )}

      {/* ── ヘッダー ── */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-emerald-200 text-xs">{format(today, 'M月d日（E）', { locale: ja })}</p>
            <h1 className="text-lg font-bold">かいもの帳</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 週/月 切り替え */}
            <div className="flex bg-white/20 rounded-xl p-0.5">
              <button onClick={() => setPeriod('week')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${period === 'week' ? 'bg-white text-emerald-600' : 'text-white/80'}`}>
                今週
              </button>
              <button onClick={() => setPeriod('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${period === 'month' ? 'bg-white text-emerald-600' : 'text-white/80'}`}>
                今月
              </button>
            </div>
            <button onClick={manualSync} disabled={syncing}
              className="relative w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30 disabled:opacity-50">
              <RefreshCw size={18} className={`text-white ${syncing ? 'animate-spin' : ''}`} />
              {pendingWrites > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold leading-none" style={{ fontSize: '9px' }}>
                  {pendingWrites}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 支出・収入・収支 横一列 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/15 rounded-2xl px-3 py-2.5">
            <p className="text-emerald-200 text-xs mb-0.5">支出</p>
            <p className="text-xl font-bold leading-tight">
              {expense >= 10000 ? `${Math.round(expense/1000)}k` : `¥${expense.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-2.5">
            <p className="text-emerald-200 text-xs mb-0.5">収入</p>
            <p className="text-xl font-bold leading-tight">
              {income >= 10000 ? `${Math.round(income/1000)}k` : `¥${income.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-2.5">
            <p className="text-emerald-200 text-xs mb-0.5">収支</p>
            <p className={`text-xl font-bold leading-tight ${balance < 0 ? 'text-red-300' : ''}`}>
              {balance >= 0 ? '+' : ''}{Math.abs(balance) >= 10000 ? `${Math.round(balance/1000)}k` : `¥${balance.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* 予算バー（月モードのみ） */}
        {budgetPct !== null && (
          <div>
            <div className="flex justify-between text-xs text-emerald-200 mb-1">
              <span>予算 ¥{budgets.monthly.toLocaleString()}</span>
              <span>残り ¥{Math.max(0, budgets.monthly - expense).toLocaleString()}</span>
            </div>
            <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all ${budgetPct > 90 ? 'bg-red-300' : budgetPct > 70 ? 'bg-yellow-300' : 'bg-white'}`}
                style={{ width: `${budgetPct}%` }} />
            </div>
          </div>
        )}

        {/* 支出予定 */}
        <div className="mt-3 bg-white/15 rounded-2xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-emerald-200 text-xs">{period === 'month' ? '今月' : '今週'}の支出予定</p>
            <p className="text-white font-bold text-base">約 ¥{forecast.total.toLocaleString()}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {forecast.confirmed > 0 && (
              <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 text-emerald-100">
                確定 ¥{forecast.confirmed.toLocaleString()}
              </span>
            )}
            {forecast.fromList > 0 && (
              <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 text-emerald-100">
                リスト ¥{forecast.fromList.toLocaleString()}
              </span>
            )}
            {forecast.fromItems > 0 && (
              <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 text-emerald-100">
                定番予定 ¥{forecast.fromItems.toLocaleString()}
              </span>
            )}
            {period === 'month' && forecast.historicalAvg > 0 && forecast.total === 0 && (
              <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 text-emerald-100">
                統計平均 ¥{forecast.historicalAvg.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 買い時アラート ── */}
      {dueItems.length > 0 && (
        <Link to="/items">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="text-amber-500" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm">そろそろ買い時 {dueItems.length}件</p>
              <p className="text-xs text-amber-600 truncate mt-0.5">{dueItems.map(i => i.name).join('・')}</p>
            </div>
            <ChevronRight className="text-amber-400 shrink-0" size={18} />
          </div>
        </Link>
      )}

      {/* ── 買い物リスト ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-500" />
            買い物リスト
            {unchecked.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{unchecked.length}</span>
            )}
          </p>
          <div className="flex gap-1.5 items-center">
            {unchecked.length > 0 && (
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setListView('all')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${listView === 'all' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                  <LayoutList size={11} />
                </button>
                <button onClick={() => setListView('store')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${listView === 'store' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                  <Store size={11} />
                </button>
              </div>
            )}
            <button onClick={() => setShowRegular(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showRegular ? 'bg-blue-500 text-white border-blue-500' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
              定番から追加
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Plus size={15} className="text-white" />
            </button>
          </div>
        </div>

        {showRegular && (
          <div className="mx-4 mb-3 bg-blue-50 rounded-2xl p-3">
            {items.length === 0
              ? <p className="text-sm text-gray-400 text-center py-2">定番商品がありません</p>
              : <div className="space-y-1 max-h-40 overflow-y-auto">
                  {items.map(item => (
                    <button key={item.id} onClick={() => { addItemToList(item); setShowRegular(false) }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white active:bg-emerald-50 text-left">
                      <span className="text-sm text-gray-800">{item.name}</span>
                      <Plus size={15} className="text-emerald-500 shrink-0" />
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        <form onSubmit={handleQuickAdd} className="px-4 pb-1 flex gap-2">
          <input value={quickAdd} onChange={e => handleQuickAddChange(e.target.value)}
            placeholder="商品名を入力..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-base outline-none focus:border-emerald-400" />
          <button type="submit" className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
            <Plus size={18} className="text-white" />
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mx-4 mb-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSelectSuggestion(s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-b-0 active:bg-emerald-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{[s.category, s.store, s.price ? `¥${Number(s.price).toLocaleString()}` : null].filter(Boolean).join(' · ')}</p>
                </div>
                {s.itemRef && <span className="text-xs text-blue-400 shrink-0">定番</span>}
                <Plus size={15} className="text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {unchecked.length === 0 && checked.length === 0 && (
          <p className="text-center text-gray-300 text-sm py-6">リストが空です</p>
        )}

        {/* リスト合計（価格情報がある場合） */}
        {unchecked.length > 0 && uncheckedTotal > 0 && (
          <div className="px-4 pb-1 flex items-center justify-between">
            <p className="text-xs text-gray-400">残り {unchecked.length}点</p>
            <p className="text-xs font-semibold text-gray-500">予定 ¥{uncheckedTotal.toLocaleString()}</p>
          </div>
        )}

        {/* 全体ビュー */}
        {listView === 'all' && (
          <div className="divide-y divide-gray-50">
            {unchecked.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => handleCheck(item)}
                  className="w-6 h-6 rounded-full border-2 border-emerald-400 shrink-0 active:bg-emerald-100" />
                <div className="flex-1 min-w-0" onClick={() => setEditTarget(item)}>
                  <p className="text-sm text-gray-800 truncate">{item.name}</p>
                  {(item.store || item.price || item.note) && (
                    <p className="text-xs text-gray-400 truncate">
                      {[item.store, item.price ? `¥${Number(item.price).toLocaleString()}` : null, item.note].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {item.quantity > 1 && <span className="text-xs text-gray-400 shrink-0">×{item.quantity}</span>}
                <button onClick={() => setEditTarget(item)} className="text-gray-200 active:text-blue-400 p-1 shrink-0">
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteListItem(item.id)} className="text-gray-200 active:text-red-400 p-1 shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 店別ビュー */}
        {listView === 'store' && unchecked.length > 0 && (
          <div className="divide-y divide-gray-50">
            {byStore.map(({ storeName, items: storeItems }) => (
              <div key={storeName}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50">
                  <Store size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-500">{storeName}</span>
                  <span className="text-xs text-gray-300">{storeItems.length}点</span>
                </div>
                {storeItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => handleCheck(item)}
                      className="w-6 h-6 rounded-full border-2 border-emerald-400 shrink-0 active:bg-emerald-100" />
                    <div className="flex-1 min-w-0" onClick={() => setEditTarget(item)}>
                      <p className="text-sm text-gray-800 truncate">{item.name}</p>
                      {item.price && (
                        <p className="text-xs text-gray-400">¥{Number(item.price).toLocaleString()}</p>
                      )}
                    </div>
                    {item.quantity > 1 && <span className="text-xs text-gray-400 shrink-0">×{item.quantity}</span>}
                    <button onClick={() => setEditTarget(item)} className="text-gray-200 active:text-blue-400 p-1 shrink-0">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteListItem(item.id)} className="text-gray-200 active:text-red-400 p-1 shrink-0">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {checked.length > 0 && (
          <div className="border-t border-gray-100">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400">カート・記録待ち {checked.length}件</p>
            </div>
            {checked.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/60">
                <button onClick={() => handleCheck(item)}
                  className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shrink-0 active:bg-emerald-200">
                  <Check size={12} className="text-emerald-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{item.name}</p>
                  {(item.store || item.price) && (
                    <p className="text-xs text-gray-400 truncate">
                      {[item.store, item.price ? `¥${Number(item.price).toLocaleString()}` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button onClick={() => setRecordTarget(item)}
                  className="text-xs bg-emerald-500 text-white rounded-xl px-3 py-1.5 font-semibold shrink-0 active:bg-emerald-600">
                  記録
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 今日買ったもの ── */}
      {todayBought.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <Check size={15} className="text-emerald-500" />
              今日買ったもの
              <span className="text-xs text-gray-400 font-normal">{todayBought.length}件</span>
            </p>
            <p className="text-xs font-bold text-emerald-600">
              ¥{todayBought.reduce((s, f) => s + (f.amount || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {todayBought.map(f => (
              <button key={f.id} onClick={() => setFinanceEditTarget(f)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[f.store, f.category].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-700 shrink-0">
                  ¥{Number(f.amount || 0).toLocaleString()}
                </span>
                <Pencil size={12} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
