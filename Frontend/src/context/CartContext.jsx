import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  createCart,
  getCart,
  addCartItem,
  removeCartItem,
  clearCart as clearCartApi,
} from '../api/cart'

const STORAGE_KEY = 'sbo_cart'
const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartID, setCartID] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (id = cartID) => {
    if (!id) return
    setLoading(true)
    try {
      const cart = await getCart(id)
      setItems(cart.items || [])
    } catch {
      // Cart vanished server-side — start fresh next action.
      localStorage.removeItem(STORAGE_KEY)
      setCartID(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [cartID])

  useEffect(() => {
    if (cartID) refresh(cartID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureCart = useCallback(async () => {
    if (cartID) return cartID
    const { cartID: newID } = await createCart()
    localStorage.setItem(STORAGE_KEY, newID)
    setCartID(newID)
    return newID
  }, [cartID])

  const addItem = useCallback(async (product, qty = 1) => {
    setBusy(true)
    try {
      const id = await ensureCart()
      const existing = items.find((i) => i.productID === product.productID)
      const quantity = (existing?.quantity || 0) + qty
      await addCartItem(id, { productID: product.productID, quantity })
      await refresh(id)
    } finally {
      setBusy(false)
    }
  }, [ensureCart, items, refresh])

  const setQty = useCallback(async (productID, quantity) => {
    if (!cartID) return
    setBusy(true)
    try {
      if (quantity <= 0) {
        await removeCartItem(cartID, productID)
      } else {
        await addCartItem(cartID, { productID, quantity })
      }
      await refresh(cartID)
    } finally {
      setBusy(false)
    }
  }, [cartID, refresh])

  const removeItem = useCallback(async (productID) => {
    if (!cartID) return
    setBusy(true)
    try {
      await removeCartItem(cartID, productID)
      await refresh(cartID)
    } finally {
      setBusy(false)
    }
  }, [cartID, refresh])

  const clear = useCallback(async () => {
    if (!cartID) return
    try {
      await clearCartApi(cartID)
    } catch {
      /* ignore */
    }
    setItems([])
  }, [cartID])

  const count = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const subtotal = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0)

  return (
    <CartContext.Provider
      value={{ cartID, items, count, subtotal, loading, busy, addItem, setQty, removeItem, clear, refresh }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
