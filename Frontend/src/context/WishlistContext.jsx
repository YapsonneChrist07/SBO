import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'sbo_wishlist'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // localStorage unavailable (private mode, etc.) — wishlist just won't persist
    }
  }, [ids])

  const isWishlisted = useCallback((productID) => ids.includes(productID), [ids])

  const toggle = useCallback((productID) => {
    setIds((prev) => (
      prev.includes(productID) ? prev.filter((id) => id !== productID) : [...prev, productID]
    ))
  }, [])

  const remove = useCallback((productID) => {
    setIds((prev) => prev.filter((id) => id !== productID))
  }, [])

  return (
    <WishlistContext.Provider value={{ ids, count: ids.length, isWishlisted, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider')
  return ctx
}
