import request from './client'

export function getCustomers({ search, page = 1, limit = 20 } = {}, token) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/customers?${params.toString()}`, { token })
}

export const getCustomer = (id, token) => request(`/customers/${id}`, { token })
