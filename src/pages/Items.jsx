import { useState } from 'react'
import { Plus, X, ShoppingCart, Store, Tag, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ITEM_ICONS } from '../utils/categories'

const CATEGORIES = ['食料品', '日用品', '医薬品', '衣類', 'その他']
const UNIT_TYPES = ['個', 'ml', 'g', 'L', 'kg', '枚', '袋', '本', 'm']

function formatCycleDays(days) {
  if (!days || days <= 0) return null
  if (days === 1) return '毎日'
  if (days <= 3) return `約${days}日`
  if (days <= 9) return '約1週間'
  if (days <= 13) return '約10日'
  if (days <= 18) return '約2週間'
  if (days <= 25) return '約3週間'
  if (days <= 40) return '約1ヶ月'
  if (days <= 55) return '約1ヶ月半'
  if (days <= 75) return '約2ヶ月'
  return `約${Math.round(days / 30)}ヶ月`
}

function formatNextPurchase(lastBoughtAt, cycleDays) {
  if (!lastBoughtAt || !cycleDays) return null
  const nextDate = new Date(new Date(lastBoughtAt).getTime() + cycleDays * 86400000)
  const daysUntil = Math.round((nextDate - new Date()) / 86400000)
  if (daysUntil <= 0) return null
  if (daysUntil <= 3) return `あと${daysUntil}日`
  if (daysUntil <= 7) return '今週中'
  return `${nextDate.getMonth() + 1}/${nextDate.getDate()}頃`
}

// ─ モジュールレベルのコンポーネント（Items 内で定義すると再マウント問題が起きる） ─

function PriceFormInline({ priceForm, setPriceForm, priceFormMode, stores, onSave, onCancel }) {
  return (
    <div className="bg-white rounded-xl p-3 space-y-2 border border-blue-100">
      <input
        value={priceForm.store_name}
        onChange={e => setPriceForm(f => ({ ...f, store_name: e.target.value }))}
        placeholder="店名 *"
        className="input text-sm"
        list="price-store-list"
      />
      <div className="flex gap-1.5">
        <div className="flex items-center flex-1 bg-white border border-gray-200 rounded-xl px-2.5">
          <span className="text-xs text-gray-400 shrink-0">¥</span>
          <input
            type="number"
            value={priceForm.price}
            onChange={e => setPriceForm(f => ({ ...f, price: e.target.value }))}
            placeholder="価格"
            className="flex-1 outline-none text-sm py-2 min-w-0"
          />
        </div>
        <input
          type="number"
          value={priceForm.unit_size}
          onChange={e => setPriceForm(f => ({ ...f, unit_size: e.target.value }))}
          placeholder="内容量"
          className="input text-sm w-20"
        />
        <select
          value={priceForm.unit_type}
          onChange={e => setPriceForm(f => ({ ...f, unit_type: e.target.value }))}
          className="input text-sm px-1.5 w-16"
        >
          {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-500">キャンセル</button>
        <button onClick={onSave}
          className="flex-1 py-1.5 text-xs rounded-xl bg-blue-500 text-white font-bold">
          {priceFormMode === 'add' ? '追加' : '保存'}
        </button>
      </div>
      <datalist id="price-store-list">
        {(stores || []).map(s => <option key={s.id} value={s.name} />)}
      </datalist>
    </div>
  )
}

function ItemCard({
  item, dueIds, addedId, expandedId,
  priceFormMode, priceFormItemId, editingPriceId, priceForm, setPriceForm,
  onExpand, onAddToList, onEdit, onDelete, onDeletePrice,
  onOpenAddPrice, onOpenEditPrice, onSavePrice, onClosePrice,
  itemPrices, stores,
}) {
  const due = dueIds.has(item.id)
  const isExpanded = expandedId === item.id
  const myPrices = (itemPrices || []).filter(p => p.item_id === item.id)
  const history = item.purchaseHistory || []

  const sortedByAbs = [...myPrices].sort((a, b) => a.price - b.price)
  const bestAbsolute = sortedByAbs[0] || null
  const pricesWithUnit = myPrices.filter(p => p.unit_size && p.unit_size > 0)
  const sortedByUnit = [...pricesWithUnit].sort((a, b) => (a.price / a.unit_size) - (b.price / b.unit_size))
  const bestUnit = sortedByUnit[0] || null
  const unitDiffersFromAbs = bestUnit && bestAbsolute && bestUnit.id !== bestAbsolute.id

  const avgQty = history.length > 0
    ? history.reduce((s, h) => s + (h.quantity || 1), 0) / history.length
    : 1
  const cycleLabel = formatCycleDays(item.cycleDays)
  const nextLabel = formatNextPurchase(item.lastBoughtAt, item.cycleDays)
  const unitCycleLabel = item.cycleDays && avgQty > 1.3
    ? formatCycleDays(Math.round(item.cycleDays / avgQty))
    : null
  const lastPurchase = history.length > 0 ? history[history.length - 1] : null

  const isAddingHere = priceFormItemId === item.id && priceFormMode === 'add'
  const isEditingPriceOf = (pid) =>
    priceFormItemId === item.id && priceFormMode === 'edit' && editingPriceId === pid

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${due ? 'border-amber-300' : 'border-gray-100'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(item)}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800">{item.name}</p>
              {due && (
                <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0">買い時</span>
              )}
            </div>

            {bestAbsolute ? (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {sortedByAbs.length > 1 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-semibold shrink-0">最安</span>
                  )}
                  <span className="text-sm font-bold text-gray-800">¥{Number(bestAbsolute.price).toLocaleString()}</span>
                  <span className="text-xs text-gray-500">{bestAbsolute.store_name}</span>
                  {bestAbsolute.unit_size && (
                    <span className="text-xs text-gray-400">{bestAbsolute.unit_size}{bestAbsolute.unit_type}</span>
                  )}
                </div>
                {unitDiffersFromAbs && bestUnit && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-semibold shrink-0">単価最安</span>
                    <span className="text-xs text-gray-600">{bestUnit.store_name}</span>
                    <span className="text-xs text-gray-400">
                      ¥{(bestUnit.price / bestUnit.unit_size < 1
                        ? (bestUnit.price / bestUnit.unit_size).toFixed(2)
                        : Math.round(bestUnit.price / bestUnit.unit_size * 10) / 10
                      )}/{bestUnit.unit_type}
                    </span>
                  </div>
                )}
              </div>
            ) : (item.store || item.price != null) ? (
              <div className="flex gap-3 mt-1">
                {item.store && (
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Store size={11} />{item.store}
                  </span>
                )}
                {item.price != null && (
                  <span className="text-xs text-gray-400">¥{Number(item.price).toLocaleString()}</span>
                )}
              </div>
            ) : null}

            {cycleLabel && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-blue-400">🔄 {cycleLabel}ごと</span>
                {unitCycleLabel && (
                  <span className="text-xs text-gray-400">(1個あたり{unitCycleLabel})</span>
                )}
                {nextLabel && <span className="text-xs text-gray-400">→ {nextLabel}</span>}
              </div>
            )}
            {!cycleLabel && history.length === 1 && (
              <p className="text-xs text-gray-300 mt-1">次回購入後に周期を自動計算</p>
            )}

            {item.lastBoughtAt && (
              <p className="text-xs text-gray-300 mt-0.5">
                最終購入 {formatDistanceToNow(new Date(item.lastBoughtAt), { locale: ja, addSuffix: true })}
                {lastPurchase?.quantity > 1 && ` · ${lastPurchase.quantity}個`}
              </p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onExpand(item.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isExpanded ? 'bg-blue-500 text-white'
                : myPrices.length > 0 ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-300 hover:text-gray-400'
              }`}>
              <TrendingDown size={15} />
            </button>
            <button
              onClick={() => onAddToList(item)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                addedId === item.id ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}>
              <ShoppingCart size={16} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="w-9 h-9 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-400">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-blue-50/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">店別価格</p>
            {!isAddingHere && (
              <button
                onClick={() => onOpenAddPrice(item.id)}
                className="text-xs text-blue-500 flex items-center gap-0.5 py-0.5">
                <Plus size={11} /> 店を追加
              </button>
            )}
          </div>

          {sortedByAbs.length > 0 ? (
            <div className="space-y-2">
              {sortedByAbs.map(p => {
                const unitPrice = p.unit_size && p.unit_size > 0 ? p.price / p.unit_size : null
                const isBestAbs = sortedByAbs.length > 1 && p.id === bestAbsolute?.id
                const isBestUnit = pricesWithUnit.length > 1 && p.id === bestUnit?.id

                if (isEditingPriceOf(p.id)) {
                  return (
                    <PriceFormInline key={p.id}
                      priceForm={priceForm} setPriceForm={setPriceForm}
                      priceFormMode={priceFormMode} stores={stores}
                      onSave={() => onSavePrice(item.id)}
                      onCancel={onClosePrice} />
                  )
                }

                return (
                  <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[5rem]">{p.store_name}</span>
                      {p.unit_size && (
                        <span className="text-xs text-gray-400 shrink-0">{p.unit_size}{p.unit_type}</span>
                      )}
                      <span className="text-sm font-bold text-gray-800 shrink-0">
                        ¥{Number(p.price).toLocaleString()}
                      </span>
                      {unitPrice && (
                        <span className="text-xs text-gray-400 shrink-0">
                          ¥{unitPrice < 1 ? unitPrice.toFixed(2) : Math.round(unitPrice * 10) / 10}/{p.unit_type}
                        </span>
                      )}
                      {isBestAbs && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 rounded-md shrink-0">最安</span>
                      )}
                      {isBestUnit && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded-md shrink-0">単価◎</span>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenEditPrice(item.id, p)}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-400 shrink-0">
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeletePrice(p.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-400 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : !isAddingHere && (
            <p className="text-xs text-gray-300 text-center py-1">価格を登録して店別に比較しましょう</p>
          )}

          {isAddingHere && (
            <PriceFormInline
              priceForm={priceForm} setPriceForm={setPriceForm}
              priceFormMode={priceFormMode} stores={stores}
              onSave={() => onSavePrice(item.id)}
              onCancel={onClosePrice} />
          )}

          {history.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400">
                購入履歴（直近{Math.min(history.length, 5)}回）
              </p>
              {[...history].reverse().slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-gray-300 shrink-0 w-10">
                    {new Date(h.date).toLocaleDateString('ja', { month: 'short', day: 'numeric' })}
                  </span>
                  {h.store && <span className="truncate flex-1">{h.store}</span>}
                  {h.price != null && (
                    <span className="shrink-0 font-medium">¥{Number(h.price).toLocaleString()}</span>
                  )}
                  {(h.quantity || 1) > 1 && (
                    <span className="text-blue-400 shrink-0">×{h.quantity}個</span>
                  )}
                </div>
              ))}
              {item.cycleDays ? (
                <div className="text-xs text-blue-400 pt-1 flex items-center gap-2 flex-wrap">
                  <span>🔄 {formatCycleDays(item.cycleDays)}ごと（{history.length}回の購入から計算）</span>
                  {avgQty > 1.3 && (
                    <span className="text-gray-400">
                      · 平均{avgQty.toFixed(1)}個購入{unitCycleLabel ? ` → 1個あたり${unitCycleLabel}` : ''}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-300 pt-1">次回購入後に周期を自動計算</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─ メインコンポーネント ───────────────────────────────────

const emptyForm = { name: '', store: '', price: '', category: '食料品', notes: '' }
const emptyPriceForm = { store_name: '', price: '', unit_size: '', unit_type: 'ml' }

export default function Items({ store }) {
  const { items, addItem, updateItem, deleteItem, addItemToList, getDueItems, stores,
          itemPrices, addItemPrice, updateItemPrice, deleteItemPrice } = store

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [addedId, setAddedId] = useState(null)
  const [viewMode, setViewMode] = useState('category')
  const [expandedId, setExpandedId] = useState(null)

  const [priceFormMode, setPriceFormMode] = useState(null)
  const [priceFormItemId, setPriceFormItemId] = useState(null)
  const [editingPriceId, setEditingPriceId] = useState(null)
  const [priceForm, setPriceForm] = useState(emptyPriceForm)

  const dueIds = new Set(getDueItems().map(i => i.id))

  const handleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      closePriceForm()
    } else {
      setExpandedId(id)
    }
  }

  const openAddPrice = (itemId) => {
    setPriceFormMode('add')
    setPriceFormItemId(itemId)
    setEditingPriceId(null)
    setPriceForm(emptyPriceForm)
  }

  const openEditPrice = (itemId, p) => {
    setPriceFormMode('edit')
    setPriceFormItemId(itemId)
    setEditingPriceId(p.id)
    setPriceForm({
      store_name: p.store_name,
      price: String(p.price),
      unit_size: p.unit_size != null ? String(p.unit_size) : '',
      unit_type: p.unit_type || 'ml',
    })
  }

  const closePriceForm = () => {
    setPriceFormMode(null)
    setPriceFormItemId(null)
    setEditingPriceId(null)
  }

  const savePriceForm = (itemId) => {
    if (!priceForm.store_name.trim() || !priceForm.price) return
    const data = {
      item_id: itemId,
      store_name: priceForm.store_name.trim(),
      price: Number(priceForm.price),
      unit_size: priceForm.unit_size ? Number(priceForm.unit_size) : null,
      unit_type: priceForm.unit_type,
    }
    if (priceFormMode === 'add') {
      addItemPrice(data)
    } else {
      updateItemPrice(editingPriceId, data)
    }
    closePriceForm()
  }

  const openEdit = (item) => {
    setForm({
      name: item.name,
      store: item.store || '',
      price: item.price != null ? String(item.price) : '',
      category: item.category || '食料品',
      notes: item.notes || '',
    })
    setEditing(item.id)
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name.trim(),
      store: form.store,
      price: form.price ? Number(form.price) : null,
      category: form.category,
      notes: form.notes,
    }
    if (editing) {
      updateItem(editing, data)
    } else {
      addItem({ ...data, cycleDays: null })
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleAddToList = (item) => {
    addItemToList(item)
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 1500)
  }

  const byCategory = CATEGORIES.reduce((acc, c) => {
    const filtered = items.filter(i => (i.category || 'その他') === c)
    if (filtered.length) acc[c] = filtered
    return acc
  }, {})

  const byStore = items.reduce((acc, item) => {
    const key = item.store?.trim() || '未設定'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
  const storeKeys = Object.keys(byStore).sort((a, b) => {
    if (a === '未設定') return 1
    if (b === '未設定') return -1
    return a.localeCompare(b, 'ja')
  })

  const cardProps = {
    dueIds, addedId, expandedId,
    priceFormMode, priceFormItemId, editingPriceId, priceForm, setPriceForm,
    onExpand: handleExpand,
    onAddToList: handleAddToList,
    onEdit: openEdit,
    onDelete: deleteItem,
    onDeletePrice: deleteItemPrice,
    onOpenAddPrice: openAddPrice,
    onOpenEditPrice: openEditPrice,
    onSavePrice: savePriceForm,
    onClosePrice: closePriceForm,
    itemPrices, stores,
  }

  const editingItem = editing ? items.find(i => i.id === editing) : null

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">定番商品</h2>
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          <button onClick={() => setViewMode('category')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'category' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
            カテゴリ
          </button>
          <button onClick={() => setViewMode('store')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'store' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
            お店別
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p>定番商品を登録しましょう</p>
        </div>
      )}

      {viewMode === 'category' && (
        <div className="space-y-5">
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 mb-2 px-1">{ITEM_ICONS[cat]} {cat}</p>
              <div className="space-y-2">
                {catItems.map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'store' && (
        <div className="space-y-5">
          {storeKeys.map(storeName => (
            <div key={storeName}>
              <p className="text-xs font-semibold text-gray-400 mb-2 px-1 flex items-center gap-1">
                <Store size={12} /> {storeName}
                <span className="ml-1 text-gray-300">{byStore[storeName].length}件</span>
              </p>
              <div className="space-y-2">
                {byStore[storeName].map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-center">{editing ? '商品を編集' : '定番商品を追加'}</h3>

            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="商品名 *" className="input" required autoFocus />

            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}
                  placeholder="よく買うお店" className="input" list="items-store-list" />
                <datalist id="items-store-list">
                  {(stores || []).map(s => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
              <input type="number" value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="デフォルト価格 (¥)" className="input" />
            </div>

            <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-xl leading-tight">🔄</span>
              <div className="flex-1">
                {editingItem?.cycleDays ? (
                  <>
                    <p className="text-sm font-semibold text-blue-600">
                      現在の周期：{formatCycleDays(editingItem.cycleDays)}ごと
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">購入するたびに自動で更新されます</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600">補充周期は自動計算</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      購入を2回記録すると、自動的に周期が計算されます
                    </p>
                  </>
                )}
              </div>
            </div>

            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="メモ（任意）" className="input resize-none h-16" />

            <div className="flex gap-3 pb-safe">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
              <button type="submit"
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">
                {editing ? '保存' : '追加'}
              </button>
            </div>
          </form>
        </div>
      )}

      <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
        <Plus size={28} />
      </button>
    </div>
  )
}
