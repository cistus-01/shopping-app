import { useState, useMemo } from 'react'
import { Plus, X, Target, Lightbulb, ChevronDown, Calendar, List, RotateCcw, Download } from 'lucide-react'
import { format, startOfWeek, endOfWeek, getDaysInMonth, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FINANCE_ICONS } from '../utils/categories'

const EXPENSE_CATS = ['食費', '日用品', '交通費', '医療費', '衣類', '外食', '娯楽', 'その他']
const INCOME_CATS = ['給与', '副業', 'ボーナス', 'その他']
const PERIODS = ['日', '週', '月', '年']
const DOW = ['月', '火', '水', '木', '金', '土', '日']

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
  const { finance, addFinance, deleteFinance, budgets, setMonthlyBudget, setCategoryBudget,
          getBudgetInsights, recurring, stores, items } = store
  const [period, setPeriod] = useState('月')
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM'))
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [calMode, setCalMode] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [form, setForm] = useState({
    type: 'expense', date: format(new Date(), 'yyyy-MM-dd'),
    amount: '', category: '食費', note: '', store: '', name: ''
  })

  // ── フィルタ済みレコード ────────────────────────────
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
    }, {}), [records])

  // ── カレンダー用データ ─────────────────────────────
  const calDays = useMemo(() => {
    if (period !== '月') return []
    const [y, m] = viewDate.split('-').map(Number)
    const firstDow = (getDay(new Date(y, m - 1, 1)) + 6) % 7 // 月=0
    const daysInM = getDaysInMonth(new Date(y, m - 1))
    const cells = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInM; d++) cells.push(d)
    return cells
  }, [viewDate, period])

  const dailyTotals = useMemo(() => {
    const totals = {}
    finance.filter(f => f.date?.startsWith(viewDate)).forEach(f => {
      const day = parseInt(f.date.slice(8, 10))
      if (!totals[day]) totals[day] = { expense: 0, income: 0 }
      if (f.type === 'expense') totals[day].expense += f.amount
      else totals[day].income += f.amount
    })
    return totals
  }, [finance, viewDate])

  // 選択日のレコード
  const selectedDayRecords = useMemo(() => {
    if (!selectedDay) return []
    const dateStr = `${viewDate}-${String(selectedDay).padStart(2, '0')}`
    return finance.filter(f => f.date === dateStr).sort((a, b) => a.type.localeCompare(b.type))
  }, [finance, viewDate, selectedDay])

  // ── 固定費の今月未記録 ──────────────────────────────
  const pendingRecurring = useMemo(() => {
    if (period !== '月') return []
    const [, m] = viewDate.split('-').map(Number)
    return (recurring || []).filter(r => {
      if (!r.active) return false
      const interval = r.interval_months || 1
      const startMonth = r.start_month || 1
      if (((m - startMonth) % interval + interval) % interval !== 0) return false
      return !finance.some(f => f.date?.startsWith(viewDate) && f.name === r.name && f.type === r.type)
    })
  }, [recurring, finance, viewDate, period])

  const pendingExpense = pendingRecurring.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  const pendingIncome  = pendingRecurring.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)

  // ── 年間月別 ──────────────────────────────────────
  const monthlyData = useMemo(() => {
    if (period !== '年') return []
    return Array.from({ length: 12 }, (_, m) => {
      const ym = `${viewYear}-${String(m + 1).padStart(2, '0')}`
      const monthRecs = finance.filter(f => f.date?.startsWith(ym))
      return {
        month: m + 1, ym,
        expense: monthRecs.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0),
        income: monthRecs.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0),
      }
    })
  }, [finance, viewYear, period])

  const maxMonthlyExp = Math.max(...monthlyData.map(m => m.expense), 1)
  const insights = useMemo(() => getBudgetInsights(), [finance])

  // ── 月末ペース予測（当月のみ）───────────────────────
  const monthPace = useMemo(() => {
    if (period !== '月') return null
    const [y, m] = viewDate.split('-').map(Number)
    const now = new Date()
    if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return null
    const daysInM = getDaysInMonth(new Date(y, m - 1))
    const day = now.getDate()
    const daysLeft = daysInM - day
    // 日次平均から月末予測
    const projected = day > 0 ? Math.round(expense / day * daysInM) : 0
    // 前月との比較
    const prevD = new Date(y, m - 2, 1)
    const prevYM = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
    const lastMonthExp = finance
      .filter(f => f.type === 'expense' && f.date?.startsWith(prevYM))
      .reduce((s, f) => s + f.amount, 0)
    const change = lastMonthExp > 0 && projected > 0
      ? Math.round((projected - lastMonthExp) / lastMonthExp * 100) : null
    return { day, daysInM, daysLeft, progress: day / daysInM, projected, change }
  }, [finance, period, viewDate, expense])

  // ── カテゴリ別6ヶ月トレンド ──────────────────────────
  const trendData = useMemo(() => {
    if (period !== '月' && period !== '年') return null
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const catTotals = {}
    months.forEach(ym => {
      finance.filter(f => f.type === 'expense' && f.date?.startsWith(ym)).forEach(f => {
        if (!catTotals[f.category]) catTotals[f.category] = {}
        catTotals[f.category][ym] = (catTotals[f.category][ym] || 0) + f.amount
      })
    })
    const topCats = Object.entries(catTotals)
      .map(([cat, byMonth]) => ({ cat, total: Object.values(byMonth).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total).slice(0, 4).map(x => x.cat)
    const maxVal = Math.max(1, ...topCats.flatMap(cat => months.map(ym => catTotals[cat]?.[ym] || 0)))
    return { months, topCats, catTotals, maxVal }
  }, [finance, period])

  // ── 家計簿入力の品目名サジェスト ──────────────────────
  const financeNameOptions = useMemo(() => {
    const seen = new Set()
    const names = []
    ;[...(items || []).map(i => i.name),
      ...(recurring || []).map(r => r.name),
      ...finance.filter(f => f.name).map(f => f.name),
    ].forEach(n => { if (n && !seen.has(n)) { seen.add(n); names.push(n) } })
    return names
  }, [items, recurring, finance])

  const prevMonth = () => {
    const d = new Date(viewDate + '-01')
    d.setMonth(d.getMonth() - 1)
    setViewDate(format(d, 'yyyy-MM'))
    setSelectedDay(null)
  }
  const nextMonth = () => {
    const d = new Date(viewDate + '-01')
    d.setMonth(d.getMonth() + 1)
    setViewDate(format(d, 'yyyy-MM'))
    setSelectedDay(null)
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

  // ── CSVエクスポート ────────────────────────────────
  const exportCSV = () => {
    const data = records.length > 0 ? records : finance
    const rows = [['日付', '種別', 'カテゴリ', '品目', 'お店', '金額', 'メモ']]
    data.forEach(f => rows.push([
      f.date || '',
      f.type === 'expense' ? '支出' : '収入',
      f.category || '',
      f.name || '',
      f.store || '',
      f.amount,
      f.note || '',
    ]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `家計簿_${period === '年' ? viewYear : viewDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount) return
    addFinance({ ...form, amount: Number(form.amount) })
    setForm(p => ({ ...p, amount: '', note: '', name: '', store: '' }))
    setShowForm(false)
  }

  const handleSaveBudget = (monthly, categories) => {
    setMonthlyBudget(monthly)
    Object.entries(categories).forEach(([cat, amt]) => { if (amt) setCategoryBudget(cat, amt) })
  }

  const openFormWithRecurring = (r) => {
    const [y, m] = viewDate.split('-')
    const day = String(Math.min(r.day_of_month, getDaysInMonth(new Date(Number(y), Number(m) - 1)))).padStart(2, '0')
    setForm({
      type: r.type, date: `${viewDate}-${day}`,
      amount: String(r.amount), category: r.category || (r.type === 'expense' ? '食費' : '給与'),
      note: '', store: '', name: r.name
    })
    setShowForm(true)
  }

  const today = new Date()
  const todayDay = today.toISOString().slice(0, 7) === viewDate ? today.getDate() : null

  return (
    <div className="pb-24">
      {/* 期間タブ */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
        {PERIODS.map(p => (
          <button key={p} onClick={() => { setPeriod(p); setSelectedDay(null) }}
            className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-colors ${period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* 期間ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        {(period === '月' || period === '年') ? (
          <>
            <button onClick={period === '月' ? prevMonth : () => setViewYear(y => y - 1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">‹</button>
            <h2 className="text-lg font-bold text-gray-800">{periodLabel()}</h2>
            <button onClick={period === '月' ? nextMonth : () => setViewYear(y => y + 1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">›</button>
          </>
        ) : (
          <h2 className="text-lg font-bold text-gray-800 flex-1">{periodLabel()}</h2>
        )}
        {/* CSVエクスポート */}
        <button onClick={exportCSV}
          className="ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100">
          <Download size={12} /> CSV
        </button>
        {period === '月' && (
          <button onClick={() => setCalMode(v => !v)}
            className={`ml-1.5 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${calMode ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 text-gray-500'}`}>
            {calMode ? <Calendar size={13} /> : <List size={13} />}
            {calMode ? 'カレンダー' : 'リスト'}
          </button>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">収入</p>
          <p className="font-bold text-sm text-emerald-600">¥{income.toLocaleString()}</p>
          {pendingIncome > 0 && (
            <p className="text-xs text-emerald-400 mt-0.5">予定 ¥{(income + pendingIncome).toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">支出</p>
          <p className="font-bold text-sm text-red-500">¥{expense.toLocaleString()}</p>
          {pendingExpense > 0 && (
            <p className="text-xs text-red-300 mt-0.5">予定 ¥{(expense + pendingExpense).toLocaleString()}</p>
          )}
        </div>
        {(() => {
          const balance = income - expense
          const projBalance = (income + pendingIncome) - (expense + pendingExpense)
          return (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-1">収支</p>
              <p className={`font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {balance >= 0 ? '+' : ''}¥{balance.toLocaleString()}
              </p>
              {(pendingIncome > 0 || pendingExpense > 0) && (
                <p className={`text-xs mt-0.5 ${projBalance >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>
                  予定 {projBalance >= 0 ? '+' : ''}¥{projBalance.toLocaleString()}
                </p>
              )}
            </div>
          )
        })()}
      </div>

      {/* 月間予算進捗バー */}
      {period === '月' && budgets.monthly > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400">月間予算</p>
            <p className="text-xs text-gray-500">¥{expense.toLocaleString()} / ¥{budgets.monthly.toLocaleString()}</p>
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

      {/* 月末ペース予測（当月のみ） */}
      {monthPace && monthPace.projected > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400">月末予測</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">残り{monthPace.daysLeft}日</span>
              {monthPace.change !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  monthPace.change > 10 ? 'bg-red-100 text-red-600'
                  : monthPace.change < -10 ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  前月比 {monthPace.change > 0 ? `+${monthPace.change}%` : `${monthPace.change}%`}
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden mb-2">
            <div className="h-1.5 bg-blue-400 rounded-full transition-all"
              style={{ width: `${Math.round(monthPace.progress * 100)}%` }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">{monthPace.day}/{monthPace.daysInM}日経過</span>
            <span className="text-sm font-bold text-gray-700">
              このペースで ¥{monthPace.projected.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── カレンダービュー（月のみ） ── */}
      {period === '月' && calMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-gray-400">カレンダー</p>
            <button onClick={() => setShowBudget(true)}
              className="text-xs text-emerald-600 flex items-center gap-1">
              <Target size={12} /> 予算設定
            </button>
          </div>
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 px-2 pb-1">
            {DOW.map((d, i) => (
              <p key={d} className={`text-center text-xs font-semibold py-1 ${i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400'}`}>{d}</p>
            ))}
          </div>
          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 border-t border-gray-100">
            {calDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="bg-white h-14" />
              const dt = dailyTotals[day]
              const isToday = day === todayDay
              const isSelected = day === selectedDay
              const dow = (i % 7)
              return (
                <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`bg-white h-14 flex flex-col items-center pt-1 relative transition-colors active:bg-emerald-50
                    ${isSelected ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' : ''}`}>
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-emerald-500 text-white' : dow === 5 ? 'text-blue-400' : dow === 6 ? 'text-red-400' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {dt && (
                    <div className="flex flex-col items-center gap-px mt-0.5">
                      {dt.expense > 0 && (
                        <span className="text-red-400 font-medium leading-none" style={{ fontSize: '9px' }}>
                          -{dt.expense >= 10000 ? `${Math.round(dt.expense / 1000)}k` : dt.expense.toLocaleString()}
                        </span>
                      )}
                      {dt.income > 0 && (
                        <span className="text-emerald-500 font-medium leading-none" style={{ fontSize: '9px' }}>
                          +{dt.income >= 10000 ? `${Math.round(dt.income / 1000)}k` : dt.income.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {/* 選択日の詳細 */}
          {selectedDay && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">
                {viewDate.replace('-', '年')}月{selectedDay}日
              </p>
              {selectedDayRecords.length === 0 ? (
                <p className="text-sm text-gray-300 py-2">記録なし</p>
              ) : selectedDayRecords.map(f => (
                <div key={f.id} className="flex items-center gap-2 py-1">
                  <span className="text-base">{FINANCE_ICONS[f.category] || (f.type === 'income' ? '💴' : '📦')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{f.category}{f.name ? `（${f.name}）` : ''}</p>
                    {f.store && <p className="text-xs text-gray-400">{f.store}</p>}
                  </div>
                  <p className={`font-bold text-sm shrink-0 ${f.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {f.type === 'income' ? '+' : '-'}¥{f.amount.toLocaleString()}
                  </p>
                  <button onClick={() => deleteFinance(f.id)} className="text-gray-200 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => {
                setForm(p => ({ ...p, date: `${viewDate}-${String(selectedDay).padStart(2, '0')}` }))
                setShowForm(true)
              }} className="w-full py-2 border border-dashed border-emerald-300 text-emerald-500 text-sm rounded-xl">
                + この日に記録を追加
              </button>
            </div>
          )}
        </div>
      )}

      {/* カテゴリ別支出（年以外、常に表示） */}
      {Object.keys(byCat).length > 0 && period !== '年' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400">カテゴリ別支出</p>
            {period === '月' && !calMode && (
              <button onClick={() => setShowBudget(true)}
                className="text-xs text-emerald-600 flex items-center gap-1">
                <Target size={12} /> 予算設定
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const catBudget = budgets.categories?.[cat]
              const pct = catBudget ? Math.min(100, amt / catBudget * 100) : Math.min(100, amt / expense * 100)
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
                      <p className={`text-xs font-medium ${over ? 'text-red-500' : 'text-gray-600'}`}>¥{amt.toLocaleString()}</p>
                      {catBudget > 0 && <p className="text-xs text-gray-300">/ ¥{catBudget.toLocaleString()}</p>}
                    </div>
                  </div>
                  {over && <p className="text-xs text-red-400 text-right">予算超過</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 年間バーグラフ */}
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

      {/* 固定費の今月予定 */}
      {pendingRecurring.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-500 mb-2 flex items-center gap-1">
            <RotateCcw size={12} /> 今月の固定費（未記録）
          </p>
          <div className="space-y-2">
            {pendingRecurring.map(r => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-base">{FINANCE_ICONS[r.category] || (r.type === 'income' ? '💴' : '📦')}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">
                    {(r.interval_months || 1) === 1 ? `毎月${r.day_of_month}日` : `${r.day_of_month}日（${
                      (() => {
                        const iv = r.interval_months || 1, sm = r.start_month || 1
                        const months = []
                        for (let mo = 1; mo <= 12; mo++) if (((mo - sm) % iv + iv) % iv === 0) months.push(mo)
                        return months.map(mo => `${mo}月`).join('・')
                      })()
                    }）`}
                  </p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${r.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.type === 'income' ? '+' : '-'}¥{Number(r.amount).toLocaleString()}
                </p>
                <button onClick={() => openFormWithRecurring(r)}
                  className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded-lg shrink-0">
                  記録
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* インサイト */}
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
                  <span className="text-gray-400 text-xs">平均¥{i.avg.toLocaleString()}→¥{i.current.toLocaleString()}</span>
                </div>
              ))}
              <p className="text-xs text-amber-500 mt-1">※ 過去3ヶ月の平均との比較</p>
            </div>
          )}
        </div>
      )}

      {/* カテゴリ別6ヶ月トレンド */}
      {trendData && trendData.topCats.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">過去6ヶ月 カテゴリ別支出</p>
          {/* 月ヘッダー */}
          <div className="grid mb-2" style={{ gridTemplateColumns: '3.5rem repeat(6, 1fr)' }}>
            <div />
            {trendData.months.map(ym => (
              <p key={ym} className="text-center text-xs text-gray-400">
                {parseInt(ym.split('-')[1])}月
              </p>
            ))}
          </div>
          {/* カテゴリ行 */}
          <div className="space-y-2">
            {trendData.topCats.map(cat => (
              <div key={cat} className="grid items-center gap-1" style={{ gridTemplateColumns: '3.5rem repeat(6, 1fr)' }}>
                <p className="text-xs text-gray-500 truncate">{FINANCE_ICONS[cat]} {cat}</p>
                {trendData.months.map(ym => {
                  const val = trendData.catTotals[cat]?.[ym] || 0
                  const pct = Math.round(val / trendData.maxVal * 100)
                  return (
                    <div key={ym} className="flex flex-col items-center gap-0.5">
                      <div className="w-full bg-gray-100 rounded-sm overflow-hidden" style={{ height: '28px' }}>
                        <div className="bg-red-300 rounded-sm w-full transition-all"
                          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                      </div>
                      {val > 0 && (
                        <span className="text-gray-400 leading-none" style={{ fontSize: '8px' }}>
                          {val >= 10000 ? `${Math.round(val / 1000)}k` : `${Math.round(val / 100) * 100 === val ? val / 1000 + 'k' : val.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 取引一覧（リストモードのみ、カレンダーモードは選択日表示） */}
      {(!calMode || period !== '月') && (
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
      )}

      {/* 記録追加フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
            {/* 品目名 - 定番商品・固定費・過去入力からサジェスト */}
            <div>
              <input value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="品目名（例: 洗剤、光熱費）" className="input" list="finance-name-list" />
              <datalist id="finance-name-list">
                {financeNameOptions.map(name => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input value={form.store}
                  onChange={e => setForm(p => ({ ...p, store: e.target.value }))}
                  placeholder="お店" className="input" list="finance-store-list" />
                <datalist id="finance-store-list">
                  {(stores || []).map(s => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
              <input value={form.note}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="メモ" className="input" />
            </div>
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

      <button onClick={() => { setForm(p => ({ ...p, date: format(new Date(), 'yyyy-MM-dd') })); setShowForm(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
        <Plus size={28} />
      </button>
    </div>
  )
}
