import request from './client'

const BASE = '/supplier-portal'

export const getSupplierSummary = (token) => request(`${BASE}/summary`, { token })

export function getSupplierProducts({ search, page = 1, limit = 20 } = {}, token) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`${BASE}/products?${params.toString()}`, { token })
}

export const searchSupplierCatalog = (search, token) =>
  request(`${BASE}/catalog?search=${encodeURIComponent(search)}`, { token })

export const getSupplierProduct = (productID, token) =>
  request(`${BASE}/products/${productID}`, { token })

export const saveSupplierProduct = (productID, fields, token) =>
  request(`${BASE}/products/${productID}`, { method: 'PUT', body: fields, token })

export const removeSupplierProduct = (productID, token) =>
  request(`${BASE}/products/${productID}`, { method: 'DELETE', token })

export const setShopPrice = (productID, locationID, supplierAreaUnitPrice, token) =>
  request(`${BASE}/products/${productID}/locations/${locationID}`, { method: 'PUT', body: { supplierAreaUnitPrice }, token })

export const removeShopPrice = (productID, locationID, token) =>
  request(`${BASE}/products/${productID}/locations/${locationID}`, { method: 'DELETE', token })

export function getSupplierPurchases({ page = 1, limit = 20 } = {}, token) {
  return request(`${BASE}/purchases?page=${page}&limit=${limit}`, { token })
}

export const getSupplierPurchase = (id, token) => request(`${BASE}/purchases/${id}`, { token })

export const getSupplierReviews = (token) => request(`${BASE}/reviews`, { token })
