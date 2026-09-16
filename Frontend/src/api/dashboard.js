import request from './client'

export const getDashboardSummary = (token) =>
  request('/dashboard/summary', { token })

export const getSalesTrend = (token) =>
  request('/dashboard/sales-trend', { token })
