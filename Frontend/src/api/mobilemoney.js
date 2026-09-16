import request from './client'

export const getMobileOperators = () => request('/mobile-money/operators')

export const getMyMobileMoneyAccounts = (contactID, token) =>
  request(`/mobile-money/contact/${contactID}`, { token })

export const createMobileMoneyAccount = (payload, token) =>
  request('/mobile-money', { method: 'POST', body: payload, token })
