import request from './client'

export function getPurchases({ status, supplierID, page = 1, limit = 20 } = {}, token) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (supplierID) params.set('supplierID', supplierID)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/purchases?${params.toString()}`, { token })
}

export const getPurchase = (id, token) => request(`/purchases/${id}`, { token })

export const getPurchaseOptions = (token) => request('/purchases/options', { token })

export const getSupplierOffer = (supplierID, storeID, token) =>
  request(`/purchases/supplier-offer/${supplierID}?storeID=${encodeURIComponent(storeID || '')}`, { token })

export const createPurchase = (payload, token) =>
  request('/purchases', { method: 'POST', body: payload, token })

export const receivePurchase = (id, token) =>
  request(`/purchases/${id}/receive`, { method: 'POST', token })

export const cancelPurchase = (id, token) =>
  request(`/purchases/${id}`, { method: 'DELETE', token })
