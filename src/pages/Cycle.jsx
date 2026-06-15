import { useMemo, useState } from 'react'

function daysDiff(dateStr) {
  return Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 86400000)
}

function relativeDate(dateStr) {
  const d = daysDiff(dateStr)
  if (d === 0) return '今日'
  if (d === 1) return '昨日'
  if (d < 7) return `${d}日前`
  if (d < 30) return `${Math.floor(d / 7)}週間前`
  if (d < 365) return `${Math.floor(d / 30)}ヶ月前`
  return `${Math.floor(d / 365)}年前`
}

function weekLabel(date) {
  const now = new Date()
  const diff = Math.floor((date - now) / 86400000)
  if (diff < -14) return { label: `${Math.abs(Math.floor(diff / 7))}週間超過`, color: 'text-red-500', bg: 'bg-red-50' }
  if (diff < 0)   return { label: '今週（過ぎ）', color: 'text-red-500', bg: 'bg-red-50' }
  if (diff < 7)   return { label: '今週', color: 'text-orange-500', bg: 'bg-orange-50' }
  if (diff < 14)  return { label: '来週', color: 'text-yellow-600', bg: 'bg-yellow-50' }
  const m = date.getMonth() + 1
  const w = Math.ceil(date.getDate() / 7)
  return { label: `${m}月第${w}週`, color: 'text-gray-400', bg: 'bg-gray-50' }
}

const CATEGORY_ORDER = ['食品', '日用品', '衛生用品', '調味料', 'その他']

export default function Cycle({ items, purchases, memos, getItemPurchases, calcCycle, predictNext, addMemo, setItemUntracked }) {
  const [sortBy, setSortBy] = useState('next')
  const [added, setAdded] = useState(new Set())
  const [untrackedOpen, setUntrackedOpen] = useState(false)

  const handleAdd = (item) => {
    addMemo(item.name, item.id)
    setAdded(prev => new Set([...prev, item.id]))
  }

  const allTracked = useMemo(() => {
    return items
      .map(item => {
        const ps = getItemPurchases(item.id)
        if (ps.length === 0) return null
        const last = ps[ps.length - 1]
        const cycle = calcCycle(item.id)
        const next = predictNext(item.id)
        const onList = memos.some(m => m.item_id === item.id && m.status === 'pending')
        return { item, last, cycle, next, count: ps.length, onList }
      })
      .filter(Boolean)
  }, [items, purchases, memos])

  const tracked = useMemo(() =>
    allTracked.filter(t => !t.item.untracked)
  , [allTracked])

  const untracked = useMemo(() =>
    allTracked.filter(t => t.item.untracked)
  , [allTracked])

  const sorted = useMemo(() => {
    if (sortBy === 'next') {
      return [...tracked].sort((a, b) => {
        const aT = a.next ? a.next.getTime() : Infinity
        const bT = b.next ? b.next.getTime() : Infinity
        return aT - bT
      })
    }
    return [...tracked].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.item.category) === -1 ? 99 : CATEGORY_ORDER.indexOf(a.item.category)
      const bi = CATEGORY_ORDER.indexOf(b.item.category) === -1 ? 99 : CATEGORY_ORDER.indexOf(b.item.category)
      return ai !== bi ? ai - bi : a.item.name.localeCompare(b.item.name, 'ja')
    })
  }, [tracked, sortBy])

  const groups = useMemo(() => {
    if (sortBy !== 'category') return null
    const g = {}
    for (const t of sorted) {
      const cat = t.item.category || 'その他'
      if (!g[cat]) g[cat] = []
      g[cat].push(t)
    }
    return CATEGORY_ORDER
      .filter(c => g[c])
      .map(c => [c, g[c]])
      .concat(Object.entries(g).filter(([c]) => !CATEGORY_ORDER.includes(c)))
  }, [sorted, sortBy])

  if (allTracked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 px-8">
        <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-center">買い物を記録すると<br />周期が計算されます</p>
      </div>
    )
  }

  const ItemRow = ({ t, showCategory, isUntrackedSection }) => {
    const { item, last, cycle, next, onList } = t
    const week = next ? weekLabel(next) : null
    const isAdded = onList || added.has(item.id)

    return (
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0">
        {/* Add button */}
        <button
          onClick={() => !isAdded && handleAdd(item)}
          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
            isAdded
              ? 'bg-emerald-100 text-emerald-500 cursor-default'
              : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-500 active:scale-95'
          }`}
        >
          {isAdded ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm font-medium truncate ${isUntrackedSection ? 'text-gray-400' : 'text-gray-800'}`}>
              {item.name}
            </p>
            {showCategory && (
              <span className="text-xs text-gray-300 flex-shrink-0">{item.category}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">
              最終 {relativeDate(last.date)}{last.quantity > 1 ? ` ×${last.quantity}` : ''}
            </span>
            {cycle && !isUntrackedSection && (
              <span className="text-xs text-gray-300">周期 {cycle}日</span>
            )}
          </div>
        </div>

        {isUntrackedSection ? (
          /* 再開ボタン */
          <button
            onClick={() => setItemUntracked(item.id, false)}
            className="flex-shrink-0 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5 font-medium whitespace-nowrap"
          >
            管理を再開
          </button>
        ) : (
          /* 次回予測バッジ */
          week ? (
            <div className={`flex-shrink-0 rounded-lg px-2 py-1 ${week.bg}`}>
              <p className={`text-xs font-medium ${week.color} whitespace-nowrap`}>{week.label}</p>
            </div>
          ) : (
            <div className="flex-shrink-0 rounded-lg px-2 py-1 bg-gray-50">
              <p className="text-xs text-gray-300 whitespace-nowrap">あと1回</p>
            </div>
          )
        )}

        {/* 周期管理をやめるボタン（通常セクションのみ） */}
        {!isUntrackedSection && (
          <button
            onClick={() => setItemUntracked(item.id, true)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-200 hover:text-gray-400 ml-0.5"
            title="周期管理をやめる"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sort toggle */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">並び替え</span>
        <button
          onClick={() => setSortBy('next')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            sortBy === 'next' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          次に切れそう順
        </button>
        <button
          onClick={() => setSortBy('category')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            sortBy === 'category' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          カテゴリ順
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 周期管理中リスト */}
        {sortBy === 'next' ? (
          <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden shadow-sm">
            {sorted.map(t => <ItemRow key={t.item.id} t={t} showCategory={true} isUntrackedSection={false} />)}
          </div>
        ) : (
          groups?.map(([cat, items]) => (
            <div key={cat} className="mx-3 mt-3">
              <p className="text-xs font-medium text-gray-400 px-1 pb-1.5">{cat}</p>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {items.map(t => <ItemRow key={t.item.id} t={t} showCategory={false} isUntrackedSection={false} />)}
              </div>
            </div>
          ))
        )}

        {/* 周期管理していない商品 */}
        {untracked.length > 0 && (
          <div className="mx-3 mt-4">
            <button
              onClick={() => setUntrackedOpen(o => !o)}
              className="w-full flex items-center gap-2 px-1 py-2"
            >
              <svg className={`w-4 h-4 text-gray-300 transition-transform ${untrackedOpen ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-400">周期管理していない商品</span>
              <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">{untracked.length}件</span>
            </button>
            {untrackedOpen && (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {untracked.map(t => <ItemRow key={t.item.id} t={t} showCategory={true} isUntrackedSection={true} />)}
              </div>
            )}
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
