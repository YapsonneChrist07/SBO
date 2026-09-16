import request from './client'

export const getStores = () => request('/stores')

export const getStore = (id) => request(`/stores/${id}`)
