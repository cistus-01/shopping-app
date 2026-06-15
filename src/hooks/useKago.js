import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export function useKago() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [memos, setMemos] = useState([])
  const [items, setItems] = useState([])
  const [purchases, setPurchases] = useState([])
  const tokenRef = useRef('')

  const h = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenRef.current}`,
  })

  const api = async (path, opts = {}) => {
    try {
      return await fetch(`${API}/api${path}`, { ...opts, headers: h() })
    } catch { return null }
  }

  const syncData = async () => {
    const r = await api('/sync')
    if (!r?.ok) return
    const data = await r.json()
    setMemos(data.memos || [])
    setItems(data.items || [])
    setPurchases(data.purchases || [])
  }

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('kago_token')
      if (!token) { setLoading(false); return }
      tokenRef.current = token
      const r = await fetch(`${API}/api/auth/me`, { headers: h() })
      if (!r.ok) { localStorage.removeItem('kago_token'); setLoading(false); return }
      const me = await r.json()
      setUsername(me.username)
      setLoggedIn(true)
      await syncData()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    const onVisible = () => { if (document.visibilityState === 'visible') syncData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loggedIn])

  const handleLogin = async (token, uname) => {
    localStorage.setItem('kago_token', token)
    tokenRef.current = token
    setUsername(uname)
    setLoading(true)
    await syncData()
    setLoggedIn(true)
    setLoading(false)
  }

  const handleLogout = () => {
    api('/auth/logout', { method: 'POST' })
    localStorage.removeItem('kago_token')
    tokenRef.current = ''
    setLoggedIn(false)
    setMemos([]); setItems([]); setPurchases([])
  }

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

  // ── Memos ────────────────────────────────────────────────
  const addMemo = (text, itemId = null) => {
    const id = genId()
    const now = new Date().toISOString()
    const m = { id, item_id: itemId, text: text.trim(), status: 'pending', quantity: 1, created_at: now }
    setMemos(p => [m, ...p])
    api('/memos', { method: 'POST', body: JSON.stringify({ id, text: text.trim(), item_id: itemId, created_at: now }) })
  }

  const checkMemo = (id) => {
    setMemos(p => p.map(m => m.id === id ? { ...m, status: 'bought' } : m))
    api(`/memos/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'bought' }) })
  }

  const uncheckMemo = (id) => {
    setMemos(p => p.map(m => m.id === id ? { ...m, status: 'pending' } : m))
    api(`/memos/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pending' }) })
  }

  const deleteMemo = (id) => {
    setMemos(p => p.filter(m => m.id !== id))
    api(`/memos/${id}`, { method: 'DELETE' })
  }

  const setMemoQuantity = (id, qty) => {
    setMemos(p => p.map(m => m.id === id ? { ...m, quantity: qty } : m))
    api(`/memos/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity: qty }) })
  }

  const setMemoItem = (id, itemId) => {
    setMemos(p => p.map(m => m.id === id ? { ...m, item_id: itemId } : m))
    api(`/memos/${id}`, { method: 'PATCH', body: JSON.stringify({ item_id: itemId }) })
  }

  // ── Record ───────────────────────────────────────────────
  const batchRecord = async (boughtMemos) => {
    const today = new Date().toISOString().slice(0, 10)
    const records = boughtMemos.map(m => ({
      memo_id: m.id,
      item_id: m.item_id,
      quantity: m.quantity || 1,
      date: today,
    }))
    const r = await api('/record', { method: 'POST', body: JSON.stringify({ records }) })
    if (r?.ok) { await syncData(); return true }
    return false
  }

  // ── Items ────────────────────────────────────────────────
  const setItemUntracked = (id, untracked) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, untracked: untracked ? 1 : 0 } : i))
    api(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({ untracked: untracked ? 1 : 0 }) })
  }

  // ── Suggestions ──────────────────────────────────────────
  const getSuggestions = (text) => {
    if (!text.trim()) return []
    const q = text.trim().toLowerCase()
    return items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.keywords || '').toLowerCase().includes(q)
    ).slice(0, 5)
  }

  // ── Cycle calculation ────────────────────────────────────
  const getItemPurchases = (itemId) =>
    purchases.filter(p => p.item_id === itemId)
             .sort((a, b) => a.date.localeCompare(b.date))

  const calcCycle = (itemId) => {
    const ps = getItemPurchases(itemId)
    if (ps.length < 2) return null
    let totalDays = 0
    for (let i = 1; i < ps.length; i++) {
      totalDays += (new Date(ps[i].date) - new Date(ps[i - 1].date)) / 86400000
    }
    return Math.round(totalDays / (ps.length - 1))
  }

  const predictNext = (itemId) => {
    const ps = getItemPurchases(itemId)
    if (ps.length === 0) return null
    const cycle = calcCycle(itemId)
    if (!cycle) return null
    const last = ps[ps.length - 1]
    const avgQty = ps.reduce((s, p) => s + (p.quantity || 1), 0) / ps.length
    const adjustedCycle = Math.round(cycle * ((last.quantity || 1) / avgQty))
    const next = new Date(last.date + 'T00:00:00')
    next.setDate(next.getDate() + adjustedCycle)
    return next
  }

  // ── Account management ───────────────────────────────────
  const createUser = async (uname, pin) => {
    const r = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: uname.trim(), pin: String(pin) }),
    })
    if (!r) return { error: 'network' }
    if (r.status === 409) return { error: 'taken' }
    if (!r.ok) return { error: 'failed' }
    return { ok: true }
  }

  const changePin = async (current, newPin) => {
    const r = await api('/auth/pin', {
      method: 'PATCH',
      body: JSON.stringify({ current: String(current), new: String(newPin) }),
    })
    if (!r) return { error: 'network' }
    if (r.status === 401) return { error: 'wrong' }
    if (!r.ok) return { error: 'failed' }
    return { ok: true }
  }

  const resetData = async () => {
    const r = await api('/data', { method: 'DELETE' })
    if (!r?.ok) return false
    await syncData()
    return true
  }

  return {
    loading, loggedIn, username,
    memos, items, purchases,
    handleLogin, handleLogout, syncData,
    addMemo, checkMemo, uncheckMemo, deleteMemo, setMemoQuantity, setMemoItem,
    batchRecord,
    setItemUntracked,
    getSuggestions,
    getItemPurchases, calcCycle, predictNext,
    createUser, changePin, resetData,
  }
}
