import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/Sidebar/Sidebar'
import ProductGrid from '../../components/ProductGrid/ProductGrid'
import useProducts from '../../hooks/useProducts'
import { categories } from '../../data/mockData'
import './ProductsPage.css'

export default function ProductsPage() {
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''

  const [activeCategory, setActiveCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [searchInput, setSearchInput] = useState(urlSearch)
  const [search, setSearch] = useState(urlSearch)

  // A search coming from the navbar (or any external link) updates the URL —
  // sync it into the local input/search state whenever it changes.
  useEffect(() => {
    setSearchInput(urlSearch)
    setSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const productLineIDs = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategory)
    return cat ? cat.productLineIDs : []
  }, [activeCategory])

  const { products, total, loading, error, hasMore, loadMore } = useProducts({
    productLineIDs,
    sort,
    search,
  })

  return (
    <main className="products-page">
      <div className="products-page__header">
        <div>
          <h1>Tous les produits</h1>
          <p className="products-page__muted">Découvrez notre catalogue complet</p>
        </div>
        <input
          type="text"
          className="products-page__search"
          placeholder="Rechercher un produit…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="products-page__shop">
        <Sidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
        <ProductGrid
          products={products}
          total={total}
          loading={loading}
          error={error}
          activeCategory={activeCategory}
          sort={sort}
          onSortChange={setSort}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </main>
  )
}
