import { useState, useMemo } from 'react'
import { Plus, X, TrendingUp, TrendingDown, Target, Lightbulb, ChevronDown } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FINANCE_ICONS } from '../utils/categories'

const EXPENSE_CATS = ['食費', '日用品', '交通費', '医療費', '衣類', '外食', '娯楽', 'その他']
const INCOME_CATS = ['給与', '副業', 'ボーナス', 'その他']
const PERIODS = ['日', '週', '月', '年']

function BudgetModal({ budgets, onSave, onClose }) {
  const [monthly, setMonthly] = useState(String(budgets.monthly || ''))
  const [categories, setCategories] = useState({ ...budgets.categories })

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-center">予算設定</h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">月間総予算（円）</label>
          <input type="number" className="input" placeholder="例: 200000"
            value={monthly} onChange={e => setMonthly(e.target.value)} />
        </div>
        <p className="text-xs font-semibold text-gray-400 border-t pt-3">カテゴリ別予算（任意）</p>
        {EXPENSE_CATS.map(cat => (
          <div key={cat} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-20 shrink-0">{FINANCE_ICONS[cat]} {cat}</span>
            <input type="number" className="input flex-1" placeholder="未設定"
              value={categories[cat] || ''}
              onChange={e => setCategories(p => ({ ...p, [cat]: e.target.value }))} />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
          <button onClick={() => { onSave(monthly, categories); onClose() }}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">保存</button>
        </div>
      </div>
    </div>
  )
}

export default function Finance({ store }) {
  const { finance, addFinance, deleteFinance, budgets, setMonthlyBudget, setCategoryBudget, getBudgetInsights } = store
  const [period, setPeriod] = useState('月')
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM'))
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [form, setForm] = useState({
    type: 'expense', date: format(new Date(), 'yyyy-MM-dd'),
    amount: '', category: '食費', note: ''
  })

  const records = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    let filtered
    if (period === '日') {
      filtered = finance.filter(f => f.date === today)
    } else if (period === '週') {
      const now = new Date()
      const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10)
      const end = endOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10)
      filtered = finance.filter(f => f.date >= start && f.date <= end)
    } else if (period === '月') {
      filtered = finance.filter(f => f.date?.startsWith(viewDate))
    } else {
      filtered = finance.filter(f => f.date?.startsWith(String(viewYear)))
    }
    return filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [finance, period, viewDate, viewYear])

  const expense = records.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  const income  = records.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0)

  const byCat = useMemo(() =>
    records.reduce((acc, f) => {
      if (f.type !== 'expense') return acc
      acc[f.category] = (acc[f.category] || 0) + f.amount
      return acc
    }, {}),
    [records]
  )

  // 年間：月別データ
  const monthlyData = useMemo(() => {
    if (period !== '年') return []
    return Array.from({ length: 12 }, (_, m) => {
      const ym = `${viewYear}-${String(m + 1).padStart(2, '0')}`
      const monthRecs = finance.filter(f => f.date?.startsWith(ym))
      return {
        month: m + 1,
        ym,
        expense: monthRecs.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0),
        income:  monthRecs.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0),
      }
    })
  }, [finance, viewYear, period])

  const maxMonthlyExp = Math.max(...monthlyData.map(m => m.expense), 1)

  const insights = useMemo(() => getBudgetInsights(), [finance])

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

  const periodLabel = () => {
    const now = new Date()
    if (period === '日') return format(now, 'M月d日（E）', { locale: ja })
    if (period === '週') {
      const s = startOfWeek(now, { weekStartsOn: 1 })
      const e = endOfWeek(now, { weekStartsOn: 1 })
      return `${format(s, 'M/d')}〜${format(e, 'M/d')}`
    }
    if (period === '月') return format(new Date(viewDate + '-01'), 'yyyy年M月', { locale: ja })
    return `${viewYear}年`
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount) return
    addFinance({ ...form, amount: Number(form.amount) })
    setForm(p => ({ ...p, amount: '', note: '' }))
    setShowForm(false)
  }

  const handleSaveBudget = (monthly, categories) => {
    setMonthlyBudget(monthly)
    Object.entries(categories).forEach(([cat, amt]) => { if (amt) setCategoryBudget(cat, amt) })
  }

  return (
    <div className="pb-24">
      {/* 期間タブ */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-colors ${period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* 期間ヘッダー（月・年はナビゲーション付き） */}
      <div className="flex items-center justify-between mb-4">
        {(period === '月' || period === '年') ? (
          <>
            <button
              onClick={period === '月' ? prevMonth : () => setViewYear(y => y - 1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">‹</button>
            <h2 className="text-lg font-bold text-gray-800">{periodLabel()}</h2>
            <button
              onClick={period === '月' ? nextMonth : () => setViewYear(y => y + 1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">›</button>
          </>
        ) : (
          <h2 className="text-lg font-bold text-gray-800">{periodLabel()}</h2>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['収入', income, 'text-emerald-600'], ['支出', expense, 'text-red-500'],
          ['収支', income - expense, income - expense >= 0 ? 'text-emerald-600' : 'text-red-500']
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`font-bold text-sm ${cls}`}>
              {label === '収支' && val >= 0 ? '+' : ''}¥{val.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* 月間予算進捗バー */}
      {period === '月' && budgets.monthly > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400">月間予算</p>
            <p className="text-xs text-gray-500">
              ¥{expense.toLocaleString()} / ¥{budgets.monthly.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all ${
              expense / budgets.monthly > 0.9 ? 'bg-red-400' :
              expense / budgets.monthly > 0.7 ? 'bg-amber-400' : 'bg-emerald-400'
            }`} style={{ width: `${Math.min(100, expense / budgets.monthly * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            残り ¥{Math.max(0, budgets.monthly - expense).toLocaleString()}
          </p>
        </div>
      )}

      {/* カテゴリ別支出 */}
      {Object.keys(byCat).length > 0 && period !== '年' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400">カテゴリ別支出</p>
            {period === '月' && (
              <button onClick={() => setShowBudget(true)}
                className="text-xs text-emerald-600 flex items-center gap-1">
                <Target size={12} /> 予算設定
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const catBudget = budgets.categories?.[cat]
              const pct = catBudget
                ? Math.min(100, amt / catBudget * 100)
                : Math.min(100, amt / expense * 100)
              const over = catBudget && amt > catBudget
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm text-gray-700 w-20 shrink-0">{FINANCE_ICONS[cat]} {cat}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full ${over ? 'bg-red-400' : catBudget ? 'bg-amber-400' : 'bg-red-300'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right w-20 shrink-0">
                      <p className={`text-xs font-medium ${over ? 'text-red-500' : 'text-gray-600'}`}>
                        ¥{amt.toLocaleString()}
                      </p>
                      {catBudget > 0 && (
                        <p className="text-xs text-gray-300">/ ¥{catBudget.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  {over && <p className="text-xs text-red-400 text-right">予算超過</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 年間の月別バーグラフ */}
      {period === '年' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">月別支出</p>
          <div className="flex items-end gap-1 mb-2" style={{ height: '72px' }}>
            {monthlyData.map(({ month, expense: exp }) => (
              <div key={month} className="flex-1 flex flex-col items-center justify-end" style={{ height: '72px' }}>
                <div className={`w-full rounded-t ${exp > 0 ? 'bg-red-300' : 'bg-gray-100'}`}
                  style={{ height: `${exp > 0 ? Math.max(4, (exp / maxMonthlyExp) * 64) : 4}px` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mb-3">
            {monthlyData.map(({ month }) => (
              <p key={month} className="flex-1 text-center text-xs text-gray-400">{month}</p>
            ))}
          </div>
          <div className="space-y-1">
            {monthlyData.filter(m => m.expense > 0 || m.income > 0).map(({ ym, month, expense: exp, income: inc }) => (
              <div key={ym} className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500 w-8">{month}月</span>
                <span className="text-emerald-500">+¥{inc.toLocaleString()}</span>
                <span className="text-red-400">-¥{exp.toLocaleString()}</span>
                <span className={inc - exp >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {inc - exp >= 0 ? '+' : ''}¥{(inc - exp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 改善インサイト（月表示・データあり時） */}
      {period === '月' && insights.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
          <button onClick={() => setShowInsights(!showInsights)}
            className="w-full flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500 shrink-0" />
            <p className="font-semibold text-amber-800 text-sm flex-1 text-left">支出インサイト</p>
            <ChevronDown size={16} className={`text-amber-400 transition-transform ${showInsights ? 'rotate-180' : ''}`} />
          </button>
          {showInsights && (
            <div className="mt-3 space-y-2">
              {insights.map(i => (
                <div key={i.category} className="flex items-center gap-2 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${i.change > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {i.change > 0 ? `+${i.change}%` : `${i.change}%`}
                  </span>
                  <span className="text-gray-700 flex-1">{FINANCE_ICONS[i.category]} {i.category}</span>
                  <span className="text-gray-400 text-xs">
                    平均¥{i.avg.toLocaleString()}→¥{i.current.toLocaleString()}
                  </span>
                </div>
              ))}
              <p className="text-xs text-amber-500 mt-1">※ 過去3ヶ月の平均との比較</p>
            </div>
          )}
        </div>
      )}

      {/* 取引一覧 */}
      <div className="space-y-2">
        {records.length === 0 && (
          <div className="text-center py-10 text-gray-400">この期間の記録はありません</div>
        )}
        {records.map(f => (
          <div key={f.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base ${f.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {FINANCE_ICONS[f.category] || (f.type === 'income' ? '💴' : '📦')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {f.category}{f.name ? `（${f.name}）` : ''}{f.note ? `・${f.note}` : ''}
              </p>
              <p className="text-xs text-gray-400">{f.date}{f.store ? ` · ${f.store}` : ''}</p>
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

      {/* 記録追加フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-center">記録を追加</h3>
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden">
              {['expense', 'income'].map(t => (
                <button type="button" key={t}
                  onClick={() => setForm(p => ({ ...p, type: t, category: t === 'expense' ? '食費' : '給与' }))}
                  className={`flex-1 py-2.5 text-sm font-semibold ${form.type === t
                    ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
                    : 'text-gray-500'}`}>
                  {t === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
            <input type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
            <input type="number" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="金額 *" className="input" required autoFocus />
            <select value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
              {(form.type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="メモ（任意）" className="input" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
              <button type="submit"
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">追加</button>
            </div>
          </form>
        </div>
      )}

      {showBudget && (
        <BudgetModal budgets={budgets} onSave={handleSaveBudget} onClose={() => setShowBudget(false)} />
      )}

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
        <Plus size={28} />
      </button>
    </div>
  )
}
