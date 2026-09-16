import request from './client'

export const updateAddress = (id, payload, token) =>
  request(`/addresses/${id}`, { method: 'PUT', body: payload, token })
