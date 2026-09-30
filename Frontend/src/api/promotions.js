import request from './client'

export function getPromotions({ active } = {}) {
  const params = new URLSearchParams()
  if (active) params.set('active', 'true')
  const qs = params.toString()
  return request(`/promotions${qs ? `?${qs}` : ''}`)
}

export const getPromotion = (id) => request(`/promotions/${id}`)

export const createPromotion = (fields, token) =>
  request('/promotions', { method: 'POST', body: fields, token })

export const deletePromotion = (id, token) =>
  request(`/promotions/${id}`, { method: 'DELETE', token })
