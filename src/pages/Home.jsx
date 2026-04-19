import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, BookOpen, Bell, AlertCircle, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { requestPermission, scheduleCheck } from '../utils/notifications'

export default function Home({ store }) {
  const { list, finance, getDueItems, items } = store
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

  useEffect(() => {
    requestPermission().then(ok => { if (ok) scheduleCheck(getDueItems) })
  }, [])

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-100 text-sm">{format(today, 'M月d日（E）', { locale: ja })}</p>
        <h1 className="text-2xl font-bold mt-1">かいもの帳</h1>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-emerald-200 text-xs">今月の支出</p>
            <p className="text-xl font-bold">¥{monthExpense.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-200 text-xs">今月の収入</p>
            <p className="text-xl font-bold">¥{monthIncome.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {dueItems.length > 0 && (
        <Link to="/items" className="block">
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

      <Link to="/finance" className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <BookOpen className="text-purple-600" size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">家計簿</p>
            <p className="text-sm text-gray-400">収入・支出を記録</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">収支</p>
            <p className={`font-bold ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {monthIncome - monthExpense >= 0 ? '+' : ''}¥{(monthIncome - monthExpense).toLocaleString()}
            </p>
          </div>
        </div>
      </Link>

      {unchecked.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ShoppingCart size={16} className="text-emerald-500" /> 次の買い出し
          </p>
          <div className="space-y-2">
            {unchecked.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="flex-1 text-gray-700">{item.name}</span>
                {item.store && <span className="text-gray-400 text-xs">{item.store}</span>}
              </div>
            ))}
            {unchecked.length > 5 && (
              <p className="text-xs text-gray-400 text-center">他 {unchecked.length - 5} 件</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
