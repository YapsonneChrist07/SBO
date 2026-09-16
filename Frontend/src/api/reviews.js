import request from './client'

export const createProductReview = (fields, token) =>
  request('/reviews/products', { method: 'POST', body: fields, token })
