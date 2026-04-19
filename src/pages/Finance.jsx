import { useState } from 'react'
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

const EXPENSE_CATS = ['食費', '日用品', '交通費', '医療費', '衣類', '外食', '娯楽', 'その他']
const INCOME_CATS = ['給与', '副業', 'ボーナス', 'その他']

export default function Finance({ store }) {
  const { finance, addFinance, deleteFinance } = store
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM'))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), amount: '', category: '食費', note: '' })

  const monthRecords = finance
    .filter(f => f.date?.startsWith(viewDate))
    .sort((a, b) => b.date.localeCompare(a.date))

  const expense = monthRecords.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  const income  = monthRecords.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0)

  const byCat = monthRecords.reduce((acc, f) => {
    if (f.type !== 'expense') return acc
    acc[f.category] = (acc[f.category] || 0) + f.amount
    return acc
  }, {})

  const prevMonth = () => {
    const d = new Date(viewDate + '-01')
    d.setMonth(d.getMonth() - 1)
    setViewDate(format(d, 'yyyy-MM'))
  }
  const nextMonth = () => {
    const d = new Date(viewDate + '-01')
    d.setMonth(d.getMonth() + 1)
    setViewDate(format(d, 'yyyy-MM'))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount) return
    addFinance({ ...form, amount: Number(form.amount) })
    setForm(p => ({ ...p, amount: '', note: '' }))
    setShowForm(false)
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">‹</button>
        <h2 className="text-lg font-bold text-gray-800">{format(new Date(viewDate + '-01'), 'yyyy年M月', { locale: ja })}</h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">›</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">収入</p>
          <p className="font-bold text-emerald-600">¥{income.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">支出</p>
          <p className="font-bold text-red-500">¥{expense.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">収支</p>
          <p className={`font-bold ${income - expense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {income - expense >= 0 ? '+' : ''}¥{(income - expense).toLocaleString()}
          </p>
        </div>
      </div>

      {Object.keys(byCat).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">カテゴリ別支出</p>
          <div className="space-y-2">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-2">
                <p className="text-sm text-gray-700 w-16 shrink-0">{cat}</p>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, amt / expense * 100)}%` }} />
                </div>
                <p className="text-sm font-medium text-gray-600 w-20 text-right">¥{amt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {monthRecords.length === 0 && (
          <div className="text-center py-10 text-gray-400">この月の記録はありません</div>
        )}
        {monthRecords.map(f => (
          <div key={f.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${f.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {f.type === 'income'
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-red-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{f.category}{f.note ? `・${f.note}` : ''}</p>
              <p className="text-xs text-gray-400">{f.date}</p>
            </div>
            <p className={`font-bold shrink-0 ${f.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
              {f.type === 'income' ? '+' : '-'}¥{f.amount.toLocaleString()}
            </p>
            <button onClick={() => deleteFinance(f.id)} className="text-gray-200 hover:text-red-400 shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-center">記録を追加</h3>
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden">
              {['expense', 'income'].map(t => (
                <button type="button" key={t} onClick={() => setForm(p => ({ ...p, type: t, category: t === 'expense' ? '食費' : '給与' }))}
                  className={`flex-1 py-2.5 text-sm font-semibold ${form.type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'text-gray-500'}`}>
                  {t === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="金額 *" className="input" required autoFocus />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
              {(form.type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="メモ（任意）" className="input" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">追加</button>
            </div>
          </form>
        </div>
      )}

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
        <Plus size={28} />
      </button>
    </div>
  )
}
