import request from './client'

export function getInventory({ storeID, lowStock, search, page = 1, limit = 20 } = {}, token) {
  const params = new URLSearchParams()
  if (storeID) params.set('storeID', storeID)
  if (lowStock) params.set('lowStock', 'true')
  if (search) params.set('search', search)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/inventory?${params.toString()}`, { token })
}

export const setInventory = (fields, token) =>
  request('/inventory', { method: 'POST', body: fields, token })
