import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, BookOpen, AlertCircle, ChevronRight, TrendingUp, Store, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { requestPermission, scheduleCheck } from '../utils/notifications'

export default function Home({ store }) {
  const { list, finance, getDueItems, items, getFutureSpendings, getMonthlyForecast, budgets } = store
  const dueItems = getDueItems()
  const unchecked = list.filter(x => !x.checked)

  const today = new Date()
  const ym = format(today, 'yyyy-MM')
  const monthExpense = finance
    .filter(f => f.type === 'expense' && f.date?.startsWith(ym))
    .reduce((s, f) => s + (f.amount || 0), 0)
  const monthIncome = finance
    .filter(f => f.type === 'income' && f.date?.startsWith(ym))
    .reduce((s, f) => s + (f.amount || 0), 0)

  const futureSpendings = getFutureSpendings(14)
  const forecast = getMonthlyForecast()
  const budgetPct = budgets.monthly > 0 ? Math.min(100, monthExpense / budgets.monthly * 100) : null

  useEffect(() => {
    requestPermission().then(ok => { if (ok) scheduleCheck(getDueItems) })
  }, [])

  return (
    <div className="space-y-3 pb-24">

      {/* ── ヘッダー ── */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-200 text-xs">{format(today, 'M月d日（E）', { locale: ja })}</p>
            <h1 className="text-xl font-bold mt-0.5">かいもの帳</h1>
          </div>
          <Link to="/list"
            className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center active:bg-white/30">
            <Plus size={22} className="text-white" />
          </Link>
        </div>

        {/* 今月支出 大きく表示 */}
        <div className="mt-4">
          <p className="text-emerald-200 text-xs mb-0.5">今月の支出</p>
          <p className="text-4xl font-bold tracking-tight">¥{monthExpense.toLocaleString()}</p>
        </div>

        {/* 予算バー（設定済みの場合） */}
        {budgets.monthly > 0 ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
              <span>予算 ¥{budgets.monthly.toLocaleString()}</span>
              <span>残り ¥{Math.max(0, budgets.monthly - monthExpense).toLocaleString()}</span>
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all ${
                budgetPct > 90 ? 'bg-red-300' : budgetPct > 70 ? 'bg-yellow-300' : 'bg-white'
              }`} style={{ width: `${budgetPct}%` }} />
            </div>
            <p className="text-xs text-emerald-200 mt-1 text-right">{Math.round(budgetPct)}% 使用</p>
          </div>
        ) : (
          <div className="flex gap-5 mt-3">
            <div>
              <p className="text-emerald-200 text-xs">今月の収入</p>
              <p className="text-lg font-bold">¥{monthIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs">収支</p>
              <p className={`text-lg font-bold ${monthIncome - monthExpense >= 0 ? '' : 'text-red-300'}`}>
                {monthIncome - monthExpense >= 0 ? '+' : ''}¥{(monthIncome - monthExpense).toLocaleString()}
              </p>
            </div>
          </div>
        )}
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

      {/* ── クイックアクセス ── */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/list" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 active:bg-gray-50">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShoppingCart className="text-emerald-600" size={20} />
          </div>
          <p className="text-xs font-semibold text-gray-600">買い物リスト</p>
          <p className="text-xl font-bold text-emerald-600">
            {unchecked.length}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
          </p>
        </Link>

        <Link to="/items" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 active:bg-gray-50">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package className="text-blue-600" size={20} />
          </div>
          <p className="text-xs font-semibold text-gray-600">定番商品</p>
          <p className="text-xl font-bold text-blue-600">
            {items.length}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
          </p>
        </Link>

        <Link to="/finance" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 active:bg-gray-50">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <BookOpen className="text-purple-600" size={20} />
          </div>
          <p className="text-xs font-semibold text-gray-600">家計簿</p>
          <p className={`text-xl font-bold ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {monthIncome - monthExpense >= 0 ? '+' : ''}{Math.abs(monthIncome - monthExpense) >= 10000
              ? `${Math.round((monthIncome - monthExpense) / 1000)}k`
              : `¥${(monthIncome - monthExpense).toLocaleString()}`}
          </p>
        </Link>
      </div>

      {/* ── 14日以内の出費予測 ── */}
      {futureSpendings.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp size={15} className="text-blue-500" />
            <p className="font-semibold text-blue-800 text-sm flex-1">今後2週間の予想出費</p>
            <span className="font-bold text-blue-700 text-sm">
              ¥{futureSpendings.reduce((s, x) => s + (x.item.price || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="space-y-1.5">
            {futureSpendings.slice(0, 3).map(({ item, daysUntil }) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  daysUntil <= 0 ? 'bg-red-100 text-red-700' :
                  daysUntil <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {daysUntil <= 0 ? '今日' : `${daysUntil}日後`}
                </span>
                <span className="flex-1 text-gray-700 truncate">{item.name}</span>
                <span className="text-gray-500 shrink-0">¥{(item.price || 0).toLocaleString()}</span>
              </div>
            ))}
            {futureSpendings.length > 3 && (
              <p className="text-xs text-blue-400 text-right">他 {futureSpendings.length - 3} 件</p>
            )}
          </div>
        </div>
      )}

      {/* ── 今月の出費予測 ── */}
      {(forecast.confirmed > 0 || forecast.fromItems > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-purple-400" /> 今月の出費予測
          </p>
          <div className="flex items-end gap-3">
            <div>
              <p className="text-xs text-gray-400">確定済み</p>
              <p className="text-lg font-bold text-red-500">¥{forecast.confirmed.toLocaleString()}</p>
            </div>
            {forecast.fromItems > 0 && (
              <>
                <p className="text-gray-300 mb-1">+</p>
                <div>
                  <p className="text-xs text-gray-400">定番予定</p>
                  <p className="text-lg font-bold text-orange-400">¥{forecast.fromItems.toLocaleString()}</p>
                </div>
              </>
            )}
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">合計予測</p>
              <p className="text-xl font-bold text-gray-700">¥{forecast.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 次の買い出し ── */}
      {unchecked.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <ShoppingCart size={15} className="text-emerald-500" /> 次の買い出し
            </p>
            <Link to="/list" className="text-xs text-emerald-500">すべて見る →</Link>
          </div>
          <div className="space-y-2">
            {unchecked.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="flex-1 text-gray-700 truncate">{item.name}</span>
                {item.store && <span className="text-gray-400 text-xs shrink-0">{item.store}</span>}
                {item.price && <span className="text-gray-500 text-xs shrink-0">¥{item.price.toLocaleString()}</span>}
              </div>
            ))}
            {unchecked.length > 4 && (
              <p className="text-xs text-gray-400 text-center">他 {unchecked.length - 4} 件</p>
            )}
          </div>
        </div>
      )}

      {/* ── オンボーディング ── */}
      {items.length === 0 && list.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">🛒</p>
          <p className="font-bold text-emerald-800 mb-1">はじめましょう！</p>
          <p className="text-sm text-emerald-600 mb-4">定番商品を登録すると、買い時を自動でお知らせします</p>
          <Link to="/items" className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">
            定番商品を登録する →
          </Link>
        </div>
      )}
    </div>
  )
}
