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
  const [budgets, setBudgets] = useState(() => load('budgets', { monthly: 0, categories: {} }))

  useEffect(() => save('items', items), [items])
  useEffect(() => save('list', list), [list])
  useEffect(() => save('finance', finance), [finance])
  useEffect(() => save('stores', stores), [stores])
  useEffect(() => save('budgets', budgets), [budgets])

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

  // ── 定番商品 ──────────────────────────────────
  const addItem = (item) => setItems(p => [...p, {
    ...item, id: uid(), createdAt: new Date().toISOString(),
    purchaseHistory: []
  }])
  const updateItem = (id, patch) => setItems(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
  const deleteItem = (id) => setItems(p => p.filter(x => x.id !== id))

  const recordPurchase = (id, { price, store, date } = {}) => {
    setItems(p => p.map(x => {
      if (x.id !== id) return x
      const now = date || new Date().toISOString()
      const history = [...(x.purchaseHistory || []), { date: now, price, store }].slice(-10)
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
      return {
        ...x,
        lastBoughtAt: now,
        purchaseHistory: history,
        cycleDays: autoCycle,
        price: price || x.price,
        store: store || x.store
      }
    }))
  }

  // ── 買い物リスト ───────────────────────────────
  const addToList = (entry) => {
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

  const checkAndRecord = (listItemId, { price, store: storeName } = {}) => {
    const li = list.find(x => x.id === listItemId)
    if (!li) return
    toggleListItem(listItemId)
    if (li.itemId) {
      recordPurchase(li.itemId, { price: price || li.price, store: storeName || li.store })
    }
    if (price || li.price) {
      addFinance({
        id: uid(),
        type: 'expense',
        category: li.category || '食費',
        name: li.name,
        store: storeName || li.store,
        amount: price || li.price,
        date: new Date().toISOString().slice(0, 10)
      })
    }
    // お店自動登録
    const effectiveStore = storeName || li.store
    if (effectiveStore?.trim()) {
      setStores(p => {
        if (p.some(s => s.name === effectiveStore.trim())) return p
        return [...p, { id: uid(), name: effectiveStore.trim(), category: 'スーパー', note: '自動登録' }]
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

  // ── 予算 ─────────────────────────────────────
  const setMonthlyBudget = (amount) => setBudgets(p => ({ ...p, monthly: Number(amount) || 0 }))
  const setCategoryBudget = (cat, amount) => setBudgets(p => ({
    ...p,
    categories: { ...p.categories, [cat]: Number(amount) || 0 }
  }))

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

  // ── 予算インサイト（過去3ヶ月比） ────────────────
  const getBudgetInsights = () => {
    const now = new Date()
    const thisYM = now.toISOString().slice(0, 7)
    const past3 = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      past3.push(d.toISOString().slice(0, 7))
    }

    const thisMonthExpenses = finance.filter(f => f.type === 'expense' && f.date?.startsWith(thisYM))
    const pastExpenses = finance.filter(f => f.type === 'expense' && past3.some(m => f.date?.startsWith(m)))

    const thisByCat = {}
    thisMonthExpenses.forEach(f => { thisByCat[f.category] = (thisByCat[f.category] || 0) + f.amount })

    const pastByCat = {}
    const monthsWithData = {}
    pastExpenses.forEach(f => {
      pastByCat[f.category] = (pastByCat[f.category] || 0) + f.amount
      if (!monthsWithData[f.category]) monthsWithData[f.category] = new Set()
      monthsWithData[f.category].add(f.date?.slice(0, 7))
    })

    return Object.entries(thisByCat)
      .map(([cat, current]) => {
        const monthCount = monthsWithData[cat]?.size || 0
        if (monthCount === 0) return null
        const avg = (pastByCat[cat] || 0) / monthCount
        if (avg === 0) return null
        const change = Math.round((current - avg) / avg * 100)
        return { category: cat, current, avg: Math.round(avg), change }
      })
      .filter(Boolean)
      .filter(i => Math.abs(i.change) >= 10)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 3)
  }

  // ── 今月の出費予測 ─────────────────────────────
  const getMonthlyForecast = () => {
    const now = new Date()
    const thisYM = now.toISOString().slice(0, 7)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const confirmed = finance
      .filter(f => f.type === 'expense' && f.date?.startsWith(thisYM))
      .reduce((s, f) => s + f.amount, 0)

    let fromItems = 0
    items.forEach(item => {
      if (!item.cycleDays || !item.price || !item.lastBoughtAt) return
      const nextDate = new Date(new Date(item.lastBoughtAt).getTime() + item.cycleDays * 86400000)
      if (nextDate > now && nextDate <= endOfMonth) {
        fromItems += item.price
      }
    })

    return { confirmed, fromItems, total: confirmed + fromItems }
  }

  return {
    items, list, finance, stores, budgets,
    addItem, updateItem, deleteItem, recordPurchase,
    addToList, toggleListItem, deleteListItem, clearChecked, addItemToList, checkAndRecord,
    addStore, deleteStore, storeNames,
    addFinance, deleteFinance,
    setMonthlyBudget, setCategoryBudget,
    getDueItems, getFutureSpendings, getBudgetInsights, getMonthlyForecast,
  }
}
