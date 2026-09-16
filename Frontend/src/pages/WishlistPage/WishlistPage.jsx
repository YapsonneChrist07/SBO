import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProduct } from '../../api/products'
import { useWishlist } from '../../context/WishlistContext'
import ProductCard from '../../components/ProductCard/ProductCard'
import './WishlistPage.css'

export default function WishlistPage() {
  const { ids } = useWishlist()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    Promise.all(ids.map((id) => getProduct(id).catch(() => null)))
      .then((results) => {
        if (active) setProducts(results.filter(Boolean))
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  return (
    <main className="wishlist-page">
      <div className="wishlist-page__header">
        <h1>Ma liste de souhaits</h1>
        <p className="wishlist-page__muted">
          {ids.length > 0 ? `${ids.length} produit${ids.length > 1 ? 's' : ''} sauvegardé${ids.length > 1 ? 's' : ''}` : 'Aucun produit sauvegardé'}
        </p>
      </div>

      {loading && <p className="wishlist-page__muted wishlist-page__status">Chargement…</p>}

      {!loading && ids.length === 0 && (
        <div className="wishlist-page__empty">
          <span className="wishlist-page__empty-icon">♡</span>
          <p>Votre liste de souhaits est vide.</p>
          <p className="wishlist-page__muted">Cliquez sur le cœur d'un produit pour l'ajouter ici.</p>
          <Link to="/products" className="wishlist-page__cta">Découvrir les produits</Link>
        </div>
      )}

      {!loading && ids.length > 0 && products.length === 0 && (
        <p className="wishlist-page__muted wishlist-page__status">
          Ces produits ne sont plus disponibles.
        </p>
      )}

      {!loading && products.length > 0 && (
        <div className="wishlist-page__grid">
          {products.map((p) => (
            <ProductCard key={p.productID} product={p} />
          ))}
        </div>
      )}
    </main>
  )
}
