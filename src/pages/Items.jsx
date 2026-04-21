import { useState } from 'react'
import { Plus, X, ShoppingCart, Clock, Store, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

const CATEGORIES = ['食料品', '日用品', '医薬品', '衣類', 'その他']
const CYCLES = [{ label: '3日', val: 3 }, { label: '1週間', val: 7 }, { label: '2週間', val: 14 },
  { label: '3週間', val: 21 }, { label: '1ヶ月', val: 30 }, { label: '2ヶ月', val: 60 }]

const emptyForm = { name: '', store: '', price: '', category: '食料品', cycleDays: '7', notes: '' }

export default function Items({ store }) {
  const { items, addItem, updateItem, deleteItem, addItemToList, getDueItems } = store
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [addedId, setAddedId] = useState(null)
  const dueIds = new Set(getDueItems().map(i => i.id))

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }
  const openEdit = (item) => {
    setForm({ name: item.name, store: item.store || '', price: item.price || '', category: item.category || '食料品', cycleDays: item.cycleDays || '7', notes: item.notes || '' })
    setEditing(item.id); setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, price: form.price ? Number(form.price) : null, cycleDays: Number(form.cycleDays) }
    if (editing) updateItem(editing, data)
    else addItem(data)
    setShowForm(false); setEditing(null)
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

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">定番商品</h2>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p>定番商品を登録しましょう</p>
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(byCategory).map(([cat, catItems]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{cat}</p>
            <div className="space-y-2">
              {catItems.map(item => {
                const due = dueIds.has(item.id)
                return (
                  <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${due ? 'border-amber-300' : 'border-gray-100'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0" onClick={() => openEdit(item)}>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                          {due && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0">買い時</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {item.store && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Store size={11} />{item.store}</span>}
                          {item.price && <span className="text-xs text-gray-400">¥{Number(item.price).toLocaleString()}</span>}
                          {item.cycleDays && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={11} />{item.cycleDays}日ごと</span>}
                        </div>
                        {item.lastBoughtAt && (
                          <p className="text-xs text-gray-300 mt-0.5">
                            最終購入：{formatDistanceToNow(new Date(item.lastBoughtAt), { locale: ja, addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleAddToList(item)} title="リストに追加"
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${addedId === item.id ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200'}`}>
                          <ShoppingCart size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id)}
                          className="w-9 h-9 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-400">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-center">{editing ? '商品を編集' : '定番商品を追加'}</h3>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="商品名 *" className="input" required autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}
                placeholder="お店" className="input" />
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="価格 (¥)" className="input" />
            </div>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div>
              <p className="text-xs text-gray-500 mb-2">買う周期</p>
              <div className="flex flex-wrap gap-2">
                {CYCLES.map(c => (
                  <button type="button" key={c.val}
                    onClick={() => setForm(p => ({ ...p, cycleDays: String(c.val) }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border ${Number(form.cycleDays) === c.val ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 text-gray-600'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="メモ（任意）" className="input resize-none h-16" />
            <div className="flex gap-3 pb-safe">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500">キャンセル</button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold">{editing ? '保存' : '追加'}</button>
            </div>
          </form>
        </div>
      )}

      <button onClick={openAdd}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white z-30">
        <Plus size={28} />
      </button>
    </div>
  )
}
