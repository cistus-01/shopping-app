import { useState, useEffect } from 'react'

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function useStore() {
  const [items, setItems]     = useState(() => load('items', []))
  const [list, setList]       = useState(() => load('list', []))
  const [finance, setFinance] = useState(() => load('finance', []))
  const [stores, setStores]   = useState(() => load('stores', []))

  useEffect(() => save('items', items), [items])
  useEffect(() => save('list', list), [list])
  useEffect(() => save('finance', finance), [finance])
  useEffect(() => save('stores', stores), [stores])

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

  // ── 定番商品 ──────────────────────────────────
  const addItem = (item) => setItems(p => [...p, {
    ...item, id: uid(), createdAt: new Date().toISOString(),
    purchaseHistory: []
  }])
  const updateItem = (id, patch) => setItems(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
  const deleteItem = (id) => setItems(p => p.filter(x => x.id !== id))

  // 購入記録：価格・店・日付を記録してサイクルを自動計算
  const recordPurchase = (id, { price, store, date } = {}) => {
    setItems(p => p.map(x => {
      if (x.id !== id) return x
      const now = date || new Date().toISOString()
      const history = [...(x.purchaseHistory || []), { date: now, price, store }].slice(-10)
      // 過去の購入履歴からサイクルを自動計算（平均日数）
      let autoCycle = x.cycleDays
      if (history.length >= 2) {
        const diffs = []
        for (let i = 1; i < history.length; i++) {
          const d = (new Date(history[i].date) - new Date(history[i-1].date)) / 86400000
          if (d > 0) diffs.push(d)
        }
        if (diffs.length > 0) {
          autoCycle = Math.round(diffs.reduce((a,b) => a+b) / diffs.length)
        }
      }
      // 最近の価格・店を更新
      const lastPrice = price || x.price
      const lastStore = store || x.store
      return { ...x, lastBoughtAt: now, purchaseHistory: history, cycleDays: autoCycle, price: lastPrice, store: lastStore }
    }))
  }

  // ── 買い物リスト ───────────────────────────────
  const addToList = (entry) => {
    // 同じ商品が既にリストにあればスキップ
    setList(p => {
      const exists = p.some(x => !x.checked && x.name === entry.name)
      if (exists) return p
      return [...p, { ...entry, id: uid(), checked: false, createdAt: new Date().toISOString() }]
    })
  }
  const toggleListItem = (id) => setList(p => p.map(x => x.id === id ? { ...x, checked: !x.checked } : x))
  const deleteListItem = (id) => setList(p => p.filter(x => x.id !== id))
  const clearChecked = () => setList(p => p.filter(x => !x.checked))
  const addItemToList = (item) => addToList({
    name: item.name, store: item.store, price: item.price,
    category: item.category, itemId: item.id, quantity: 1
  })

  // チェック完了 + 購入記録（価格・店）
  const checkAndRecord = (listItemId, { price, store } = {}) => {
    const li = list.find(x => x.id === listItemId)
    if (!li) return
    toggleListItem(listItemId)
    // 定番商品があれば購入記録を更新
    if (li.itemId) {
      recordPurchase(li.itemId, { price: price || li.price, store: store || li.store })
    }
    // 家計簿に自動記録（価格がある場合）
    if (price || li.price) {
      addFinance({
        id: uid(),
        type: 'expense',
        category: li.category || '食費',
        name: li.name,
        store: store || li.store,
        amount: price || li.price,
        date: new Date().toISOString().slice(0, 10)
      })
    }
  }

  // ── お店 ──────────────────────────────────────
  const addStore = (store) => setStores(p => [...p, { ...store, id: uid() }])
  const deleteStore = (id) => setStores(p => p.filter(x => x.id !== id))
  const storeNames = stores.map(s => s.name)

  // ── 家計簿 ────────────────────────────────────
  const addFinance = (record) => setFinance(p => [...p, { ...record, id: record.id || uid() }])
  const deleteFinance = (id) => setFinance(p => p.filter(x => x.id !== id))

  // ── 買い時チェック ─────────────────────────────
  const getDueItems = () => {
    const now = new Date()
    return items.filter(item => {
      if (!item.cycleDays || !item.lastBoughtAt) return false
      const daysSince = (now - new Date(item.lastBoughtAt)) / 86400000
      return daysSince >= item.cycleDays * 0.9
    })
  }

  // ── 来週の出費予測 ──────────────────────────────
  const getFutureSpendings = (days = 14) => {
    const now = new Date()
    const future = []
    items.forEach(item => {
      if (!item.cycleDays || !item.price) return
      const lastBought = item.lastBoughtAt ? new Date(item.lastBoughtAt) : null
      if (!lastBought) return
      const nextDate = new Date(lastBought.getTime() + item.cycleDays * 86400000)
      const daysUntil = (nextDate - now) / 86400000
      if (daysUntil <= days && daysUntil > -item.cycleDays * 0.5) {
        future.push({ item, nextDate, daysUntil: Math.round(daysUntil) })
      }
    })
    return future.sort((a, b) => a.daysUntil - b.daysUntil)
  }

  return {
    items, list, finance, stores,
    addItem, updateItem, deleteItem, recordPurchase,
    addToList, toggleListItem, deleteListItem, clearChecked, addItemToList, checkAndRecord,
    addStore, deleteStore, storeNames,
    addFinance, deleteFinance,
    getDueItems, getFutureSpendings,
  }
}
