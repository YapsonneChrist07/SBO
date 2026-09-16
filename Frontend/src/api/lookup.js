import request from './client'

export const getProductTypes = () => request('/lookup/product-types')

export const getCities = () => request('/lookup/cities')
