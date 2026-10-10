import request from './client'

export const createOrder = (payload, token) =>
  request('/sells', { method: 'POST', body: payload, token })

// Delivery offers (transporter + price) for the cart, to the given city or the saved address.
export const getShippingOptions = (items, cityID, token) =>
  request('/sells/shipping-options', { method: 'POST', body: { items, cityID }, token })

export const getMyOrders = (token) =>
  request('/sells?mine=true', { token }).then((data) => data.orders)

export const getOrder = (id, token) =>
  request(`/sells/${id}`, { token })

export const getAllOrders = ({ search, completed, page = 1, limit = 20 } = {}, token) => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (completed !== undefined && completed !== '') params.set('completed', completed)
  params.set('page', page)
  params.set('limit', limit)
  return request(`/sells?${params.toString()}`, { token })
}

export const setOrderStatus = (id, completed, token) =>
  request(`/sells/${id}/status`, { method: 'PATCH', body: { completed }, token })

export const getShipmentTransporters = (token) => request('/sells/shipment-transporters', { token })

export const assignTransporter = (id, { transporterID, expectedDaysDuration }, token) =>
  request(`/sells/${id}/shipment`, { method: 'PUT', body: { transporterID, expectedDaysDuration }, token })

export const unassignTransporter = (id, token) =>
  request(`/sells/${id}/shipment`, { method: 'DELETE', token })
