import request from './client'

export const getProductTypes = () => request('/lookup/product-types')
