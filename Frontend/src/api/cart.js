import request from './client'

export const createCart = () => request('/cart', { method: 'POST' })

export const getCart = (cartID) => request(`/cart/${cartID}`)

export const addCartItem = (cartID, { productID, quantity }) =>
  request(`/cart/${cartID}/items`, { method: 'POST', body: { productID, quantity } })

export const removeCartItem = (cartID, productID) =>
  request(`/cart/${cartID}/items/${productID}`, { method: 'DELETE' })

export const clearCart = (cartID) =>
  request(`/cart/${cartID}`, { method: 'DELETE' })
