import React from 'react'
import ProductCard from '../ProductCard/ProductCard'
import { categories } from '../../data/mockData'
import './ProductGrid.css'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Nom (A-Z)' },
]

export default function ProductGrid({
  products = [],
  total = 0,
  loading = false,
  error = null,
  activeCategory = 'all',
  title,
  sort = 'newest',
  onSortChange,
  hasMore = false,
  onLoadMore,
}) {
  const activeCat = categories.find((c) => c.id === activeCategory)
  const titleLabel = title || (activeCat ? activeCat.label : 'Tous les Produits')
  const isInitialLoad = loading && products.length === 0

  return (
    <div className="product-grid">
      <div className="product-grid__header">
        <div>
          <h2 className="product-grid__title">{titleLabel}</h2>
          <p className="product-grid__count">
            {isInitialLoad
              ? 'Chargement…'
              : `${total.toLocaleString('fr-FR')} produit${total > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="product-grid__sort">
          <select
            className="product-grid__select"
            value={sort}
            onChange={(e) => onSortChange?.(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="product-grid__empty">
          <span className="product-grid__empty-icon">⚠️</span>
          <p>Impossible de charger les produits.</p>
          <p className="product-grid__error-detail">{error}</p>
        </div>
      ) : isInitialLoad ? (
        <div className="product-grid__items">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-grid__skeleton" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="product-grid__empty">
          <span className="product-grid__empty-icon">🔍</span>
          <p>Aucun produit dans cette catégorie.</p>
        </div>
      ) : (
        <>
          <div className="product-grid__items">
            {products.map((product) => (
              <ProductCard key={product.productID} product={product} />
            ))}
          </div>

          {hasMore && (
            <div className="product-grid__more">
              <button
                className="product-grid__more-btn"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? 'Chargement…' : 'Charger plus de produits'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
