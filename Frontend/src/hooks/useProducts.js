import { useEffect, useRef, useState } from 'react'
import { getProducts } from '../api/products'

/**
 * Fetches products from the API with filtering, sorting and "load more" pagination.
 * Changing filters (productLineIDs / sort / search) resets back to page 1.
 */
export default function useProducts({ productLineIDs = [], sort = 'newest', search, onDeal } = {}) {
  const key = JSON.stringify({ productLineIDs, sort, search, onDeal })

  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Reset to the first page whenever the filters change (React-recommended
  // "adjust state during render" pattern rather than an extra effect).
  const prevKey = useRef(key)
  if (prevKey.current !== key) {
    prevKey.current = key
    setPage(1)
  }

  const reqId = useRef(0)

  useEffect(() => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)

    getProducts({ productLineIDs, sort, search, onDeal, page })
      .then((data) => {
        if (id !== reqId.current) return
        setProducts((prev) => (page === 1 ? data.products : [...prev, ...data.products]))
        setTotal(data.total)
        setTotalPages(data.totalPages)
      })
      .catch((err) => {
        if (id === reqId.current) setError(err.message || 'Erreur de chargement')
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page])

  return {
    products,
    total,
    totalPages,
    page,
    loading,
    error,
    hasMore: page < totalPages,
    loadMore: () => setPage((p) => p + 1),
  }
}
