import request from './client'

export const getPaymentMethods = () => request('/payments/methods')
