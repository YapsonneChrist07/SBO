import React, { useState } from 'react'
import ProductGrid from '../../components/ProductGrid/ProductGrid'
import useProducts from '../../hooks/useProducts'
import './DealsPage.css'

export default function DealsPage() {
  const [sort, setSort] = useState('newest')

  const { products, total, loading, error, hasMore, loadMore } = useProducts({
    onDeal: true,
    sort,
  })

  return (
    <main className="deals-page">
      <div className="deals-page__banner">
        <span className="deals-page__eyebrow">Offres limitées</span>
        <h1>Nos meilleures affaires</h1>
        <p>Des articles en promotion, tant que les stocks durent.</p>
      </div>

      <div className="deals-page__body">
        <ProductGrid
          products={products}
          total={total}
          loading={loading}
          error={error}
          title="Produits en promotion"
          sort={sort}
          onSortChange={setSort}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </main>
  )
}
