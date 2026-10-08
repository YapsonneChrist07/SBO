import request from './client'

export const getPartnerSummary = (token) => request('/partners/summary', { token })

export function getPartners({ type, status, search } = {}, token) {
  const params = new URLSearchParams({ type })
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  return request(`/partners?${params.toString()}`, { token })
}

// status: 'active' (approve / re-enable) or 'disabled'
export const setPartnerStatus = (type, id, status, token) =>
  request(`/partners/${type}/${id}/status`, { method: 'PATCH', body: { status }, token })
