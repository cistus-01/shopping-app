const API = 'https://shopping-api-t1uw.onrender.com'

function getToken() {
  return localStorage.getItem('household_token')
}

async function apiFetch(path, opts = {}) {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Household-Token': token,
        ...(opts.headers || {})
      }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function createHousehold() {
  try {
    const res = await fetch(`${API}/household`, { method: 'POST' })
    if (!res.ok) return null
    const data = await res.json()
    return data.token
  } catch {
    return null
  }
}

export async function syncListToCloud(items) {
  return apiFetch('/list/sync', {
    method: 'POST',
    body: JSON.stringify({ items })
  })
}

export async function syncItemsToCloud(items) {
  return apiFetch('/items/sync', {
    method: 'POST',
    body: JSON.stringify({ items })
  })
}

export async function addListItemToCloud(item) {
  return apiFetch('/list', {
    method: 'POST',
    body: JSON.stringify(item)
  })
}

export async function isCloudEnabled() {
  return !!getToken()
}
