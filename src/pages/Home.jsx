import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, BookOpen, AlertCircle, ChevronRight, TrendingUp, Store } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { requestPermission, scheduleCheck } from '../utils/notifications'

export default function Home({ store }) {
  const { list, finance, getDueItems, items, getFutureSpendings, getMonthlyForecast } = store
  const dueItems = getDueItems()
  const unchecked = list.filter(x => !x.checked)
  const forecast = getMonthlyForecast()

  const today = new Date()
  const ym = format(today, 'yyyy-MM')
  const monthExpense = finance
    .filter(f => f.type === 'expense' && f.date?.startsWith(ym))
    .reduce((s, f) => s + (f.amount || 0), 0)
  const monthIncome = finance
    .filter(f => f.type === 'income' && f.date?.startsWith(ym))
    .reduce((s, f) => s + (f.amount || 0), 0)

  const futureSpendings = getFutureSpendings(14)
  const futureTotal = futureSpendings.reduce((s, x) => s + (x.item.price || 0), 0)

  useEffect(() => {
    requestPermission().then(ok => { if (ok) scheduleCheck(getDueItems) })
  }, [])

  return (
    <div className="space-y-4 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-100 text-sm">{format(today, 'M月d日（E）', { locale: ja })}</p>
        <h1 className="text-2xl font-bold mt-1">かいもの帳</h1>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-emerald-200 text-xs">今月の支出</p>
            <p className="text-xl font-bold">¥{monthExpense.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs">今月の収入</p>
            <p className="text-xl font-bold">¥{monthIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs">収支</p>
            <p className={`text-xl font-bold ${monthIncome - monthExpense >= 0 ? '' : 'text-red-300'}`}>
              {monthIncome - monthExpense >= 0 ? '+' : ''}¥{(monthIncome - monthExpense).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 買い時アラート */}
      {dueItems.length > 0 && (
        <Link to="/items">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">そろそろ買い時 {dueItems.length}件</p>
              <p className="text-sm text-amber-600 mt-0.5">{dueItems.map(i => i.name).join('・')}</p>
            </div>
            <ChevronRight className="text-amber-400 mt-0.5" size={18} />
          </div>
        </Link>
      )}

      {/* 14日以内の出費予測 */}
      {futureSpendings.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-blue-500" />
            <p className="font-semibold text-blue-800 text-sm">今後2週間の予想出費</p>
            <span className="ml-auto font-bold text-blue-700">¥{futureTotal.toLocaleString()}</span>
          </div>
          <div className="space-y-1.5">
            {futureSpendings.slice(0, 4).map(({ item, daysUntil }) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  daysUntil <= 0 ? 'bg-red-100 text-red-700' :
                  daysUntil <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {daysUntil <= 0 ? '今日' : `${daysUntil}日後`}
                </span>
                <span className="flex-1 text-gray-700">{item.name}</span>
                <span className="text-gray-500">¥{(item.price||0).toLocaleString()}</span>
              </div>
            ))}
            {futureSpendings.length > 4 && (
              <p className="text-xs text-blue-400 text-center mt-1">他 {futureSpendings.length - 4} 件</p>
            )}
          </div>
        </div>
      )}

      {/* 今月の出費予測 */}
      {(forecast.confirmed > 0 || forecast.fromItems > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
            <TrendingUp size={16} className="text-purple-500" /> 今月の出費予測
          </p>
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-gray-400">確定済み</p>
              <p className="font-bold text-red-500">¥{forecast.confirmed.toLocaleString()}</p>
            </div>
            {forecast.fromItems > 0 && (
              <div>
                <p className="text-xs text-gray-400">定番追加予定</p>
                <p className="font-bold text-orange-400">+¥{forecast.fromItems.toLocaleString()}</p>
              </div>
            )}
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">合計予測</p>
              <p className="font-bold text-gray-700">¥{forecast.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクセス */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/list" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShoppingCart className="text-emerald-600" size={20} />
          </div>
          <p className="font-semibold text-gray-800">買い物リスト</p>
          <p className="text-2xl font-bold text-emerald-600">{unchecked.length}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </Link>
        <Link to="/items" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package className="text-blue-600" size={20} />
          </div>
          <p className="font-semibold text-gray-800">定番商品</p>
          <p className="text-2xl font-bold text-blue-600">{items.length}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/finance" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <BookOpen className="text-purple-600" size={20} />
          </div>
          <p className="font-semibold text-gray-800">家計簿</p>
          <p className={`text-lg font-bold ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {monthIncome - monthExpense >= 0 ? '+' : ''}¥{(monthIncome - monthExpense).toLocaleString()}
          </p>
        </Link>
        <Link to="/stores" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Store className="text-orange-600" size={20} />
          </div>
          <p className="font-semibold text-gray-800">お店</p>
          <p className="text-2xl font-bold text-orange-600">{store.stores.length}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </Link>
      </div>

      {/* 次の買い出し */}
      {unchecked.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-500" /> 次の買い出し
          </p>
          <div className="space-y-2">
            {unchecked.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="flex-1 text-gray-700">{item.name}</span>
                {item.store && <span className="text-gray-400 text-xs">{item.store}</span>}
                {item.price && <span className="text-gray-500 text-xs">¥{item.price.toLocaleString()}</span>}
              </div>
            ))}
            {unchecked.length > 5 && (
              <p className="text-xs text-gray-400 text-center">他 {unchecked.length - 5} 件</p>
            )}
          </div>
        </div>
      )}

      {/* 初回オンボーディング */}
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
