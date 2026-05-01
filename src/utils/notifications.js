export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleCheck(getDueItems) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // 1日1回だけ通知
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem('notify_due_date') === today) return
  const due = getDueItems()
  if (due.length === 0) return
  localStorage.setItem('notify_due_date', today)
  const names = due.slice(0, 3).map(i => i.name).join('、')
  const extra = due.length > 3 ? `など${due.length}品` : ''
  new Notification('Kago - 買い時のお知らせ', {
    body: `そろそろ買い時：${names}${extra}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'due-items',
    renotify: false,
  })
}
