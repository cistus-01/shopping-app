import { useState } from 'react'
import { Store, Plus, Trash2, MapPin } from 'lucide-react'

const CATEGORIES = ['スーパー', 'コンビニ', 'ドラッグストア', 'ホームセンター', 'その他']

export default function Stores({ store }) {
  const { stores, addStore, deleteStore, items } = store
  const [name, setName] = useState('')
  const [category, setCategory] = useState('スーパー')
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleAdd = () => {
    if (!name.trim()) return
    addStore({ name: name.trim(), category, note: note.trim() })
    setName(''); setNote(''); setShowForm(false)
  }

  const getItemsForStore = (storeName) =>
    items.filter(x => x.store === storeName).length

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
          <input
            className="input"
            placeholder="お店の名前（例: イオン、コープ）"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            className="input"
            placeholder="メモ（例: 毎週土曜、特売日は水曜）"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
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
        {stores.map(s => (
          <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <Store size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s.category}</span>
                </div>
                {s.note && <p className="text-sm text-gray-400 mt-0.5">{s.note}</p>}
                <p className="text-xs text-orange-500 mt-1">
                  定番商品 {getItemsForStore(s.name)}件
                </p>
              </div>
              <button onClick={() => deleteStore(s.id)} className="p-2 text-gray-300 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
