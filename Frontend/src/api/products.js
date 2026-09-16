import request from './client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function getProducts({ productLineIDs = [], search, sort, onDeal, page = 1, limit = 24 } = {}) {
  const params = new URLSearchParams()
  if (productLineIDs.length) params.set('productLineID', productLineIDs.join(','))
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (onDeal) params.set('onDeal', 'true')
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/products?${params.toString()}`)
}

export const getProduct = (id) => request(`/products/${id}`)

export const productImageUrl = (id) => `${API_URL}/products/${id}/image`

export const createProduct = (fields, token) =>
  request('/products', { method: 'POST', body: fields, token })

export const patchProduct = (id, fields, token) =>
  request(`/products/${id}`, { method: 'PATCH', body: fields, token })

export const deleteProduct = (id, token) =>
  request(`/products/${id}`, { method: 'DELETE', token })
