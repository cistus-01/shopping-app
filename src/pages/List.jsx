import { useState, useRef } from 'react'

export default function List({ memos, items, getSuggestions, addMemo, checkMemo, uncheckMemo, deleteMemo, setMemoQuantity, setMemoItem, batchRecord }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)
  const inputRef = useRef(null)

  const pending = memos.filter(m => m.status === 'pending')
  const bought = memos.filter(m => m.status === 'bought')

  const handleInput = (v) => {
    setInput(v)
    setSuggestions(v.trim() ? getSuggestions(v) : [])
  }

  const addFreeText = () => {
    if (!input.trim()) return
    addMemo(input, null)
    setInput('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const addFromSuggestion = (item) => {
    addMemo(item.name, item.id)
    setInput('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const handleDelete = (id) => {
    if (deleteConfirm === id) { deleteMemo(id); setDeleteConfirm(null) }
    else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(c => c === id ? null : c), 3000)
    }
  }

  const handleRecord = async () => {
    if (!bought.length) return
    setSaving(true)
    const ok = await batchRecord(bought)
    setSaving(false)
    if (ok) { setFlash(true); setTimeout(() => setFlash(false), 2000) }
  }

  const QtyButton = ({ memo }) => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button onClick={() => setMemoQuantity(memo.id, Math.max(1, (memo.quantity || 1) - 1))}
        className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center active:bg-gray-300">
        −
      </button>
      <span className="w-5 text-center text-sm font-medium text-gray-700">{memo.quantity || 1}</span>
      <button onClick={() => setMemoQuantity(memo.id, (memo.quantity || 1) + 1)}
        className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center active:bg-gray-300">
        ＋
      </button>
    </div>
  )

  const getItemName = (memo) => {
    if (!memo.item_id) return null
    const item = items.find(i => i.id === memo.item_id)
    return item && item.name !== memo.text ? item.name : null
  }

  const MemoRow = ({ memo, isBought }) => {
    const isDel = deleteConfirm === memo.id
    const linkedName = getItemName(memo)
    return (
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0 ${isBought ? 'bg-emerald-50/50' : ''}`}>
        <button
          onClick={() => isBought ? uncheckMemo(memo.id) : checkMemo(memo.id)}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            isBought ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {isBought && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-tight ${isBought ? 'text-gray-400' : 'text-gray-800'}`}>{memo.text}</p>
          {linkedName && <p className="text-xs text-emerald-500 mt-0.5">{linkedName}</p>}
          {!memo.item_id && !isBought && suggestions.length === 0 && (
            <ItemLinkChips memo={memo} />
          )}
        </div>

        {isBought && <QtyButton memo={memo} />}

        {isDel ? (
          <button onClick={e => { e.stopPropagation(); handleDelete(memo.id) }}
            className="text-xs text-white bg-red-400 rounded-lg px-2.5 py-1.5 font-medium flex-shrink-0">
            削除する
          </button>
        ) : (
          <button onClick={e => { e.stopPropagation(); handleDelete(memo.id) }}
            className="w-7 h-7 text-gray-400 hover:text-red-400 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // Inline item-link chips for unlinked memos
  const ItemLinkChips = ({ memo }) => {
    const sugg = getSuggestions(memo.text).slice(0, 3)
    if (!sugg.length) return null
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {sugg.map(item => (
          <button key={item.id}
            onClick={() => setMemoItem(memo.id, item.id)}
            className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 hover:bg-emerald-100 hover:text-emerald-600">
            {item.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50" onClick={() => { setDeleteConfirm(null); setSuggestions([]) }}>
      {/* Input */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !suggestions.length && addFreeText()}
            placeholder="買うものを入力..."
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-colors"
          />
          <button onClick={addFreeText} disabled={!input.trim()}
            className="bg-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-30 active:bg-emerald-600">
            追加
          </button>
        </div>

        {/* Suggestion list */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-col rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
            {suggestions.map(item => (
              <button key={item.id}
                onMouseDown={e => e.preventDefault()}
                onClick={() => addFromSuggestion(item)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 border-b border-gray-50 last:border-0 text-left">
                <div className="w-2 h-2 rounded-full bg-emerald-300 flex-shrink-0" />
                <div>
                  <span className="text-sm text-gray-800">{item.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.category}</span>
                </div>
              </button>
            ))}
            <button onMouseDown={e => e.preventDefault()} onClick={addFreeText}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
              <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="text-sm text-gray-500">「{input}」をそのまま追加</span>
            </button>
          </div>
        )}

        {pending.length > 0 && !suggestions.length && (
          <p className="text-xs text-gray-400 mt-2 px-1">{pending.length}件</p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && bought.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">買うものを入力してね</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden shadow-sm">
                {pending.map(m => <MemoRow key={m.id} memo={m} isBought={false} />)}
              </div>
            )}

            {bought.length > 0 && (
              <div className="mx-3 mt-3">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <span className="text-sm text-gray-500 font-medium">カゴ</span>
                  <span className="text-xs bg-emerald-100 text-emerald-600 rounded-full px-2 py-0.5 font-medium">{bought.length}件</span>
                  <span className="text-xs text-gray-400 ml-1">← 個数を変えられます</span>
                </div>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {bought.map(m => <MemoRow key={m.id} memo={m} isBought={true} />)}
                </div>
              </div>
            )}
            <div className="h-24" />
          </>
        )}
      </div>

      {/* Record button */}
      {bought.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button onClick={handleRecord} disabled={saving}
              className={`w-full py-3.5 rounded-2xl font-medium text-sm shadow-lg transition-all ${
                flash ? 'bg-emerald-400 text-white' : 'bg-emerald-500 text-white active:bg-emerald-600 disabled:opacity-50'
              }`}>
              {flash ? '✓ 記録しました' : saving ? '保存中...' : `${bought.length}件を記録する`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
