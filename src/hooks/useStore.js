import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://192.168.68.59:4000'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const QUEUE_KEY = 'shopping_offline_queue'
function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}
function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }

function normalizeItem(r) {
  return {
    id: r.id,
    name: r.name,
    store: r.store || '',
    price: r.price || null,
    category: r.category || 'その他',
    subcategory: r.subcategory || '',
    cycleDays: r.cycle_days || r.cycleDays || null,
    lastBoughtAt: r.last_bought_at || r.lastBoughtAt || null,
    purchaseHistory: r.purchase_history || r.purchaseHistory || [],
    notes: r.notes || '',
    createdAt: r.created_at || r.createdAt || null,
  }
}

function normalizeListItem(r) {
  return {
    id: r.id,
    name: r.name,
    store: r.store || '',
    price: r.price || null,
    category: r.category || 'その他',
    quantity: r.quantity || 1,
    checked: r.checked === 1 || r.checked === true,
    itemId: r.item_id || r.itemId || null,
    note: r.note || '',
    createdAt: r.created_at || r.createdAt || null,
  }
}

export function useStore() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('session_token') || '')
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [items, setItems]         = useState([])
  const [list, setList]           = useState([])
  const [finance, setFinance]     = useState([])
  const [stores, setStores]       = useState([])
  const [budgets, setBudgets]     = useState({ monthly: 0, categories: {} })
  const [listHistory, setListHistory] = useState({})
  const [recurring, setRecurring] = useState([])
  const [itemPrices, setItemPrices] = useState([])
  const [pendingWrites, setPendingWrites] = useState(() => loadQueue().length)

  const tokenRef = useRef(sessionToken)
  useEffect(() => { tokenRef.current = sessionToken }, [sessionToken])

  // 家族共有通知用：前回ポーリング時のリストIDセット
  const prevListIdsRef = useRef(null) // null = 初回ロード
  const locallyAddedIdsRef = useRef(new Set())

  const h = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenRef.current}`,
  })

  const api = async (path, opts = {}) => {
    try {
      return await fetch(`${API}${path}`, { ...opts, headers: h() })
    } catch (e) {
      if (opts.method && opts.method !== 'GET') {
        const q = [...loadQueue().filter(x => Date.now() - x.ts < 3600000),
          { id: uid(), path, method: opts.method, body: opts.body || null, ts: Date.now() }
        ].slice(-100)
        saveQueue(q)
        setPendingWrites(q.length)
      }
    }
  }

  // ── データ同期 ──────────────────────────────────────
  const syncData = async (t, showSpinner = false) => {
    const token = t || tokenRef.current
    if (!token) return
    if (showSpinner) setSyncing(true)
    try {
      const hdr = { 'Authorization': `Bearer ${token}` }
      const [listRes, itemsRes, finRes, storesRes, budgetsRes, histRes, recurringRes, itemPricesRes] = await Promise.all([
        fetch(`${API}/list`, { headers: hdr }),
        fetch(`${API}/items`, { headers: hdr }),
        fetch(`${API}/finance`, { headers: hdr }),
        fetch(`${API}/stores`, { headers: hdr }),
        fetch(`${API}/budgets`, { headers: hdr }),
        fetch(`${API}/list-history`, { headers: hdr }),
        fetch(`${API}/recurring`, { headers: hdr }),
        fetch(`${API}/item-prices`, { headers: hdr }),
      ])
      const newList = (await listRes.json()).map(normalizeListItem)
      // 家族が追加した新規アイテムを通知
      if (prevListIdsRef.current !== null && 'Notification' in window && Notification.permission === 'granted') {
        const externNew = newList.filter(x =>
          !prevListIdsRef.current.has(x.id) && !locallyAddedIdsRef.current.has(x.id) && !x.checked
        )
        if (externNew.length > 0) {
          const names = externNew.map(x => x.name).slice(0, 3).join('、')
          new Notification('かいもの帳 - リスト更新', {
            body: `${names}が追加されました`,
            icon: '/icon-192.png',
            tag: 'list-update',
            renotify: true,
          })
        }
      }
      prevListIdsRef.current = new Set(newList.map(x => x.id))
      setList(newList)
      setItems((await itemsRes.json()).map(normalizeItem))
      setFinance(await finRes.json())
      setStores(await storesRes.json())
      setBudgets(await budgetsRes.json())
      setListHistory(await histRes.json())
      setRecurring(await recurringRes.json())
      setItemPrices(await itemPricesRes.json())
    } catch (e) {
      console.error('sync failed', e)
    } finally {
      if (showSpinner) setSyncing(false)
    }
  }

  const manualSync = () => syncData(null, true)

  // ── 初期ロード ──────────────────────────────────────
  useEffect(() => {
    async function init() {
      const t = localStorage.getItem('session_token')
      if (!t) { setLoading(false); return }
      tokenRef.current = t
      try {
        const hdr = { 'Authorization': `Bearer ${t}` }
        const meRes = await fetch(`${API}/auth/me`, { headers: hdr })
        if (!meRes.ok) { setLoading(false); return }
        const meData = await meRes.json()
        setUsername(meData.username)
        setLoggedIn(true)
        await syncData(t)
      } catch (e) {
        console.error('API load failed', e)
      }
      setLoading(false)
    }
    init()
  }, [])

  // ── フォアグラウンド復帰・定期ポーリング ──────────────
  useEffect(() => {
    if (!loggedIn) return
    const onVisible = () => { if (document.visibilityState === 'visible') syncData() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(syncData, 30000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [loggedIn])

  // ── オフラインキューのフラッシュ ──────────────────────
  useEffect(() => {
    if (!loggedIn) return
    const flush = async () => {
      const q = loadQueue()
      if (q.length === 0) return
      const remaining = []
      for (const item of q) {
        try {
          await fetch(`${API}${item.path}`, {
            method: item.method,
            headers: h(),
            body: item.body || undefined,
          })
        } catch {
          remaining.push(item)
        }
      }
      saveQueue(remaining)
      setPendingWrites(remaining.length)
      if (remaining.length < q.length) syncData()
    }
    window.addEventListener('online', flush)
    // 起動時にも既存キューを処理
    if (navigator.onLine) flush()
    return () => window.removeEventListener('online', flush)
  }, [loggedIn])

  // ── 定番商品 ──────────────────────────────────────
  const addItem = (item) => {
    const newItem = { ...item, id: uid(), createdAt: new Date().toISOString(), purchaseHistory: [] }
    setItems(p => [...p, newItem])
    api('/items', { method: 'POST', body: JSON.stringify(newItem) })
  }

  const updateItem = (id, patch) => {
    setItems(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    const updated = items.find(x => x.id === id)
    if (updated) api(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const deleteItem = (id) => {
    setItems(p => p.filter(x => x.id !== id))
    api(`/items/${id}`, { method: 'DELETE' })
  }

  const recordPurchase = (id, { price, store, date, quantity = 1, unitSize = null, unitType = null } = {}) => {
    setItems(p => p.map(x => {
      if (x.id !== id) return x
      const now = date || new Date().toISOString()
      const history = [...(x.purchaseHistory || []), { date: now, price, store, quantity, unitSize, unitType }].slice(-10)
      let autoCycle = x.cycleDays
      if (history.length >= 2) {
        const diffs = []
        for (let i = 1; i < history.length; i++) {
          const d = (new Date(history[i].date) - new Date(history[i-1].date)) / 86400000
          if (d > 0) diffs.push(d)
        }
        if (diffs.length > 0) autoCycle = Math.round(diffs.reduce((a,b) => a+b) / diffs.length)
      }
      const updated = { ...x, lastBoughtAt: now, purchaseHistory: history, cycleDays: autoCycle, price: price || x.price, store: store || x.store }
      api(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({
        last_bought_at: now,
        purchase_history: history,
        cycle_days: autoCycle,
        price: price || x.price,
        store: store || x.store,
      })})
      return updated
    }))
  }

  // ── 買い物リスト ───────────────────────────────────
  const addToList = (entry) => {
    // 定番商品と名前が完全一致（大文字小文字・空白無視）なら自動リンク
    let autoItemId = entry.itemId || null
    if (!autoItemId && entry.name) {
      const norm = (s) => s.trim().toLowerCase()
      const matched = items.find(i => norm(i.name) === norm(entry.name))
      if (matched) {
        autoItemId = matched.id
        entry = {
          ...entry,
          store: entry.store || matched.store,
          price: entry.price || matched.price,
          category: entry.category || matched.category,
          itemId: matched.id,
        }
      }
    }
    setList(p => {
      if (p.some(x => !x.checked && x.name === entry.name)) return p
      const item = { ...entry, id: uid(), checked: false, createdAt: new Date().toISOString(), itemId: autoItemId }
      locallyAddedIdsRef.current.add(item.id)
      api('/list', { method: 'POST', body: JSON.stringify(item) })
      return [...p, item]
    })
    if (entry.name) {
      const hist = { store: entry.store, price: entry.price, category: entry.category }
      setListHistory(p => ({ ...p, [entry.name]: hist }))
      api('/list-history', { method: 'POST', body: JSON.stringify({ name: entry.name, ...hist }) })
    }
  }

  const updateListItem = (id, patch) => {
    setList(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    api(`/list/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const toggleListItem = (id) => {
    setList(p => p.map(x => {
      if (x.id !== id) return x
      const updated = { ...x, checked: !x.checked }
      api(`/list/${id}`, { method: 'PATCH', body: JSON.stringify({ checked: updated.checked }) })
      return updated
    }))
  }

  const deleteListItem = (id) => {
    setList(p => p.filter(x => x.id !== id))
    api(`/list/${id}`, { method: 'DELETE' })
  }

  const clearChecked = () => {
    const toDelete = list.filter(x => x.checked).map(x => x.id)
    setList(p => p.filter(x => !x.checked))
    toDelete.forEach(id => api(`/list/${id}`, { method: 'DELETE' }))
  }

  const addItemToList = (item) => addToList({
    name: item.name, store: item.store, price: item.price,
    category: item.category, itemId: item.id, quantity: 1,
  })

  const checkAndRecord = (listItemId, { price, store: storeName, quantity: qty, unitSize = null, unitType = null } = {}) => {
    const li = list.find(x => x.id === listItemId)
    if (!li) return
    const effectiveQty = qty || li.quantity || 1
    const effectivePrice = price || li.price
    toggleListItem(listItemId)
    if (li.itemId) recordPurchase(li.itemId, {
      price: effectivePrice, store: storeName || li.store,
      quantity: effectiveQty, unitSize, unitType,
    })
    if (effectivePrice) {
      addFinance({
        type: 'expense', category: li.category || '食費',
        name: li.name, store: storeName || li.store,
        amount: effectivePrice * effectiveQty,
        date: new Date().toISOString().slice(0, 10),
      })
    }
    const effectiveStore = storeName || li.store
    if (effectiveStore?.trim() && !stores.some(s => s.name === effectiveStore.trim())) {
      addStore({ name: effectiveStore.trim(), category: 'スーパー', note: '自動登録' })
    }
  }

  // ── お店 ──────────────────────────────────────────
  const addStore = (store) => {
    const s = { ...store, id: uid() }
    setStores(p => [...p, s])
    api('/stores', { method: 'POST', body: JSON.stringify(s) })
  }

  const updateStore = (id, patch) => {
    setStores(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    api(`/stores/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const deleteStore = (id) => {
    setStores(p => p.filter(x => x.id !== id))
    api(`/stores/${id}`, { method: 'DELETE' })
  }

  const storeNames = stores.map(s => s.name)

  // ── 家計簿 ────────────────────────────────────────
  const addFinance = (record) => {
    const r = { ...record, id: record.id || uid() }
    setFinance(p => [...p, r])
    api('/finance', { method: 'POST', body: JSON.stringify(r) })
  }

  const updateFinance = (id, patch) => {
    setFinance(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    api(`/finance/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const deleteFinance = (id) => {
    setFinance(p => p.filter(x => x.id !== id))
    api(`/finance/${id}`, { method: 'DELETE' })
  }

  // チェック済みアイテムを記録して一覧から削除
  const finalizeListItem = (listItemId, { price, store: storeName, quantity = 1, unitSize = null, unitType = null } = {}) => {
    const li = list.find(x => x.id === listItemId)
    if (!li) return
    const effectiveStore = storeName || li.store
    const effectivePrice = price ?? li.price
    const effectiveQty = quantity || li.quantity || 1

    if (li.itemId && effectivePrice) {
      recordPurchase(li.itemId, { price: effectivePrice, store: effectiveStore, quantity: effectiveQty, unitSize, unitType })
    }
    if (effectivePrice) {
      addFinance({
        type: 'expense', category: li.category || '食費',
        name: li.name, store: effectiveStore,
        amount: effectivePrice * effectiveQty,
        date: new Date().toISOString().slice(0, 10),
      })
    }
    // 新しい店なら自動登録
    if (effectiveStore?.trim() && !stores.some(s => s.name === effectiveStore.trim())) {
      addStore({ name: effectiveStore.trim(), category: 'スーパー', note: '自動登録' })
    }
    // item_store_prices を自動更新（家計簿の過去データは触らない）
    if (li.itemId && effectiveStore && effectivePrice != null) {
      const existing = itemPrices.find(p => p.item_id === li.itemId && p.store_name === effectiveStore)
      if (existing) {
        // 同じ店で価格が違えば更新
        if (Number(existing.price) !== Number(effectivePrice)) {
          updateItemPrice(existing.id, {
            price: effectivePrice,
            ...(unitSize != null ? { unit_size: unitSize, unit_type: unitType || '個' } : {}),
          })
        }
      } else {
        // 新しい店+商品の組み合わせなら追加
        addItemPrice({
          item_id: li.itemId,
          store_name: effectiveStore,
          price: effectivePrice,
          unit_size: unitSize,
          unit_type: unitType || '個',
        })
      }
    }
    deleteListItem(listItemId)
  }

  // ── 予算 ─────────────────────────────────────────
  const setMonthlyBudget = (amount) => {
    const updated = { ...budgets, monthly: Number(amount) || 0 }
    setBudgets(updated)
    api('/budgets', { method: 'PUT', body: JSON.stringify(updated) })
  }

  const setCategoryBudget = (cat, amount) => {
    const updated = { ...budgets, categories: { ...budgets.categories, [cat]: Number(amount) || 0 } }
    setBudgets(updated)
    api('/budgets', { method: 'PUT', body: JSON.stringify(updated) })
  }

  // ── 買い時チェック ─────────────────────────────────
  const getDueItems = () => {
    const now = new Date()
    return items.filter(item => {
      if (!item.cycleDays || !item.lastBoughtAt) return false
      return (now - new Date(item.lastBoughtAt)) / 86400000 >= item.cycleDays * 0.9
    })
  }

  // ── 来週の出費予測 ──────────────────────────────────
  const getFutureSpendings = (days = 14) => {
    const now = new Date()
    const future = []
    items.forEach(item => {
      if (!item.cycleDays || !item.price || !item.lastBoughtAt) return
      const nextDate = new Date(new Date(item.lastBoughtAt).getTime() + item.cycleDays * 86400000)
      const daysUntil = (nextDate - now) / 86400000
      if (daysUntil <= days && daysUntil > -item.cycleDays * 0.5) {
        future.push({ item, nextDate, daysUntil: Math.round(daysUntil) })
      }
    })
    return future.sort((a, b) => a.daysUntil - b.daysUntil)
  }

  // ── 予算インサイト ────────────────────────────────
  const getBudgetInsights = () => {
    const now = new Date()
    const thisYM = now.toISOString().slice(0, 7)
    const past3 = Array.from({ length: 3 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - i - 1, 1).toISOString().slice(0, 7)
    )
    const thisExp = finance.filter(f => f.type === 'expense' && f.date?.startsWith(thisYM))
    const pastExp = finance.filter(f => f.type === 'expense' && past3.some(m => f.date?.startsWith(m)))
    const thisByCat = {}
    thisExp.forEach(f => { thisByCat[f.category] = (thisByCat[f.category] || 0) + f.amount })
    const pastByCat = {}, monthsWithData = {}
    pastExp.forEach(f => {
      pastByCat[f.category] = (pastByCat[f.category] || 0) + f.amount
      if (!monthsWithData[f.category]) monthsWithData[f.category] = new Set()
      monthsWithData[f.category].add(f.date?.slice(0, 7))
    })
    return Object.entries(thisByCat)
      .map(([cat, current]) => {
        const mc = monthsWithData[cat]?.size || 0
        if (!mc) return null
        const avg = (pastByCat[cat] || 0) / mc
        if (!avg) return null
        const change = Math.round((current - avg) / avg * 100)
        return { category: cat, current, avg: Math.round(avg), change }
      })
      .filter(Boolean).filter(i => Math.abs(i.change) >= 10)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3)
  }

  // ── 今月の出費予測 ─────────────────────────────────
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
      if (nextDate > now && nextDate <= endOfMonth) fromItems += item.price
    })
    return { confirmed, fromItems, total: confirmed + fromItems }
  }

  // ── 店別価格 ─────────────────────────────────────
  const addItemPrice = (data) => {
    const p = { ...data, id: uid() }
    setItemPrices(prev => [...prev, p])
    api('/item-prices', { method: 'POST', body: JSON.stringify(p) })
  }

  const updateItemPrice = (id, patch) => {
    setItemPrices(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
    api(`/item-prices/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const deleteItemPrice = (id) => {
    setItemPrices(prev => prev.filter(x => x.id !== id))
    api(`/item-prices/${id}`, { method: 'DELETE' })
  }

  // ── 固定費・定期収入 ───────────────────────────────
  const addRecurring = (r) => {
    const newR = { ...r, id: uid() }
    setRecurring(p => [...p, newR])
    api('/recurring', { method: 'POST', body: JSON.stringify(newR) })
  }

  const updateRecurring = (id, patch) => {
    setRecurring(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    api(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  const deleteRecurring = (id) => {
    setRecurring(p => p.filter(x => x.id !== id))
    api(`/recurring/${id}`, { method: 'DELETE' })
  }

  // ── バックアップ・リストア ─────────────────────────
  const backup = async () => {
    const r = await api('/backup')
    if (!r?.ok) return null
    return await r.json()
  }

  const restore = async (data) => {
    const r = await api('/restore', { method: 'POST', body: JSON.stringify(data) })
    if (!r?.ok) return false
    await syncData(null, true)
    return true
  }

  // ── 入力候補 ──────────────────────────────────────
  const getSuggestions = (query) => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const results = [], seen = new Set()
    items.forEach(item => {
      if (item.name.toLowerCase().includes(q)) {
        results.push({ name: item.name, store: item.store, price: item.price, category: item.category, itemRef: item })
        seen.add(item.name)
      }
    })
    Object.entries(listHistory).forEach(([name, data]) => {
      if (!seen.has(name) && name.toLowerCase().includes(q)) {
        results.push({ name, ...data })
      }
    })
    return results.slice(0, 6)
  }

  // ── ログイン・ログアウト ──────────────────────────────
  const handleLogin = async (token, uname) => {
    localStorage.setItem('session_token', token)
    localStorage.setItem('username', uname)
    tokenRef.current = token
    setSessionToken(token)
    setUsername(uname)
    setLoading(true)
    await syncData(token)
    setLoggedIn(true)
    setLoading(false)
  }

  const handleLogout = () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('session_token')
    localStorage.removeItem('username')
    setSessionToken('')
    setUsername('')
    setLoggedIn(false)
  }

  return {
    loading, loggedIn, username, setUsername, sessionToken, syncing, manualSync, pendingWrites,
    handleLogin, handleLogout,
    items, list, finance, stores, budgets, listHistory, recurring, itemPrices,
    addItem, updateItem, deleteItem, recordPurchase,
    addItemPrice, updateItemPrice, deleteItemPrice,
    addToList, updateListItem, toggleListItem, deleteListItem, clearChecked, addItemToList, checkAndRecord, finalizeListItem,
    addStore, updateStore, deleteStore, storeNames,
    addFinance, updateFinance, deleteFinance,
    setMonthlyBudget, setCategoryBudget,
    addRecurring, updateRecurring, deleteRecurring,
    getDueItems, getFutureSpendings, getBudgetInsights, getMonthlyForecast,
    getSuggestions, backup, restore,
  }
}
