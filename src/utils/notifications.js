export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleCheck(getDueItems) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const due = getDueItems()
  if (due.length === 0) return
  const names = due.map(i => i.name).join('、')
  new Notification('かいもの帳', {
    body: `そろそろ買い時：${names}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
}
