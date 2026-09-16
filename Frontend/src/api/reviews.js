import request from './client'

export const createProductReview = (fields, token) =>
  request('/reviews/products', { method: 'POST', body: fields, token })

export const getRecentReviews = (limit) =>
  request(`/reviews/recent${limit ? `?limit=${limit}` : ''}`)
