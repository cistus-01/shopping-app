import { useState } from 'react'
import { Plus, Trash2, Check, X, ShoppingBag } from 'lucide-react'

const CATEGORIES = ['食料品', '日用品', '医薬品', '衣類', 'その他']

export default function ShoppingList({ store }) {
  const { list, items, addToList, toggleListItem, deleteListItem, clearChecked, addItemToList } = store
  const [showForm, setShowForm] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const [form, setForm] = useState({ name: '', store: '', price: '', category: '食料品', quantity: '1' })

  const unchecked = list.filter(x => !x.checked)
  const checked = list.filter(x => x.checked)

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    addToList({ ...form, price: form.price ? Number(form.price) : null, quantity: Number(form.quantity) || 1 })
    setForm({ name: '', store: '', price: '', category: '食料品', quantity: '1' })
    setShowForm(false)
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">買い物リスト</h2>
        <div className="flex gap-2">
          {checked.length > 0 && (
            <button onClick={clearChecked} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5">
              チェック済みを削除
            </button>
          )}
          <button onClick={() => setShowItems(!showItems)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5">
            定番から追加
          </button>
        </div>
      </div>

      {showItems && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <p className="text-sm font-semibold text-gray-600 mb-3">定番商品を追加</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.length === 0 && <p className="text-sm text-gray-400">定番商品がありません</p>}
            {items.map(item => (
              <button key={item.id} onClick={() => { addItemToList(item); setShowItems(false) }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.store} {item.price ? `¥${Number(item.price).toLocaleString()}` : ''}</p>
                </div>
                <Plus size={16} className="text-emerald-500" />
              </button>
            ))}
          </div>
          <button onClick={() => setShowItems(false)} className="mt-2 w-full text-xs text-gray-400 py-1">閉じる</button>
        </div>
      )}

      <div className="space-y-2">
        {unchecked.length === 0 && checked.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>リストが空です</p>
          </div>
        )}
        {unchecked.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <button onClick={() => toggleListItem(item.id)}
              className="w-6 h-6 rounded-full border-2 border-emerald-400 shrink-0 flex items-center justify-center">
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">
                {[item.store, item.price ? `¥${Number(item.price).toLocaleString()}` : null, item.category].filter(Boolean).join(' · ')}
              </p>
            </div>
            {item.quantity > 1 && <span className="text-sm text-gray-500 shrink-0">×{item.quantity}</span>}
            <button onClick={() => deleteListItem(item.id)} className="text-gray-300 hover:text-red-400 shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}

        {checked.length > 0 && (
          <>
            <p className="text-xs text-gray-400 px-1 pt-2">購入済み</p>
            {checked.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 opacity-60">
                <button onClick={() => toggleListItem(item.id)}
                  className="w-6 h-6 rounded-full bg-emerald-400 shrink-0 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </button>
                <p className="flex-1 font-medium text-gray-500 line-through truncate">{item.name}</p>
                <button onClick={() => deleteListItem(item.id)} className="text-gray-300 shrink-0">
                  <X size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {showForm ? (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleAdd} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-center">アイテムを追加</h3>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="商品名 *" className="input" required autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}
                placeholder="お店" className="input" />
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="価格" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                placeholder="数量" className="input" min="1" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">追加</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
          <Plus size={28} />
        </button>
      )}
    </div>
  )
}
