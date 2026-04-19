import { useState, useEffect } from 'react'

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function useStore() {
  const [items, setItems]       = useState(() => load('items', []))       // 定番商品
  const [list, setList]         = useState(() => load('list', []))         // 買い物リスト
  const [finance, setFinance]   = useState(() => load('finance', []))     // 家計簿

  useEffect(() => save('items', items), [items])
  useEffect(() => save('list', list), [list])
  useEffect(() => save('finance', finance), [finance])

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

  // ── 定番商品 ──────────────────────────────────
  const addItem = (item) => setItems(p => [...p, { ...item, id: uid(), createdAt: new Date().toISOString() }])
  const updateItem = (id, patch) => setItems(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
  const deleteItem = (id) => setItems(p => p.filter(x => x.id !== id))
  const markBought = (id) => updateItem(id, { lastBoughtAt: new Date().toISOString() })

  // ── 買い物リスト ───────────────────────────────
  const addToList = (entry) => setList(p => [...p, { ...entry, id: uid(), checked: false, createdAt: new Date().toISOString() }])
  const toggleListItem = (id) => setList(p => p.map(x => x.id === id ? { ...x, checked: !x.checked } : x))
  const deleteListItem = (id) => setList(p => p.filter(x => x.id !== id))
  const clearChecked = () => setList(p => p.filter(x => !x.checked))

  // 定番商品を買い物リストに追加
  const addItemToList = (item) => addToList({
    name: item.name, store: item.store, price: item.price,
    category: item.category, itemId: item.id, quantity: 1
  })

  // ── 家計簿 ────────────────────────────────────
  const addFinance = (record) => setFinance(p => [...p, { ...record, id: uid() }])
  const deleteFinance = (id) => setFinance(p => p.filter(x => x.id !== id))

  // ── 通知チェック：周期が来た定番商品 ──────────
  const getDueItems = () => {
    const now = new Date()
    return items.filter(item => {
      if (!item.cycleDays || !item.lastBoughtAt) return false
      const last = new Date(item.lastBoughtAt)
      const daysSince = (now - last) / 86400000
      return daysSince >= item.cycleDays * 0.9
    })
  }

  return {
    items, list, finance,
    addItem, updateItem, deleteItem, markBought,
    addToList, toggleListItem, deleteListItem, clearChecked, addItemToList,
    addFinance, deleteFinance,
    getDueItems,
  }
}
