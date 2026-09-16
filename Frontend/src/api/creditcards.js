import request from './client'

export const getCreditCardTypes = () => request('/credit-cards/types')

export const getMyCreditCards = (contactID, token) =>
  request(`/credit-cards/contact/${contactID}`, { token })

export const createCreditCard = (payload, token) =>
  request('/credit-cards', { method: 'POST', body: payload, token })
