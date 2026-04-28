import { useState } from 'react'
import { Store, Plus, Trash2, Pencil, ChevronDown, ChevronUp, ShoppingCart, X, Check } from 'lucide-react'
import { ITEM_ICONS } from '../utils/categories'

const CATEGORIES = ['スーパー', 'コンビニ', 'ドラッグストア', 'ホームセンター', 'その他']

function EditStoreForm({ store, onSave, onClose }) {
  const [name, setName] = useState(store.name)
  const [category, setCategory] = useState(store.category || 'スーパー')
  const [note, setNote] = useState(store.note || '')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), category, note: note.trim() })
    onClose()
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="店名" />
      <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="メモ（特売日など）" />
      <div className="flex gap-2">
        <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-1">
          <Check size={14} /> 保存
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default function Stores({ store }) {
  const { stores, addStore, updateStore, deleteStore, items } = store
  const [name, setName] = useState('')
  const [category, setCategory] = useState('スーパー')
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const handleAdd = () => {
    if (!name.trim()) return
    addStore({ name: name.trim(), category, note: note.trim() })
    setName(''); setNote(''); setShowForm(false)
  }

  const getItemsForStore = (storeName) =>
    items.filter(x => x.store === storeName)

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Store size={22} className="text-orange-500" /> よく行くお店
        </h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-xl text-sm font-semibold">
          <Plus size={16} /> 追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <input className="input" placeholder="お店の名前（例: イオン、コープ）"
            value={name} onChange={e => setName(e.target.value)} autoFocus />
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input className="input" placeholder="メモ（例: 毎週土曜、特売日は水曜）"
            value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex-1 bg-orange-500 text-white py-2 rounded-xl font-semibold text-sm">
              追加する
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-gray-500 text-sm bg-gray-100">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {stores.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <Store size={40} className="mx-auto mb-3 opacity-30" />
          <p>よく行くお店を登録すると</p>
          <p className="text-sm">定番商品と紐付けて管理できます</p>
        </div>
      )}

      <div className="space-y-2">
        {stores.map(s => {
          const linkedItems = getItemsForStore(s.name)
          const isEditing = editingId === s.id
          const isExpanded = expandedId === s.id

          return (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                    <Store size={18} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{s.name}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s.category}</span>
                    </div>
                    {s.note && <p className="text-sm text-gray-400 mt-0.5">{s.note}</p>}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="text-xs text-orange-500 mt-1 flex items-center gap-0.5"
                    >
                      定番商品 {linkedItems.length}件
                      {linkedItems.length > 0 && (isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingId(isEditing ? null : s.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${isEditing ? 'bg-orange-100 text-orange-500' : 'text-gray-300 hover:text-orange-400 hover:bg-orange-50'}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteStore(s.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <EditStoreForm
                    store={s}
                    onSave={(patch) => updateStore(s.id, patch)}
                    onClose={() => setEditingId(null)}
                  />
                )}
              </div>

              {isExpanded && linkedItems.length > 0 && (
                <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3 space-y-2">
                  {linkedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm">{ITEM_ICONS[item.category] || '📦'}</span>
                      <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                      {item.price && <span className="text-xs text-gray-400">¥{Number(item.price).toLocaleString()}</span>}
                      <ShoppingCart size={13} className="text-gray-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
