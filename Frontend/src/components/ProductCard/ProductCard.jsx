import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { productImageUrl } from '../../api/products'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import './ProductCard.css'

function formatPrice(value) {
  const n = Number(value)
  if (!value || Number.isNaN(n) || n <= 0) return null
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { isWishlisted, toggle: toggleWishlist } = useWishlist()
  const wishlisted = isWishlisted(product.productID)
  const [addedToCart, setAddedToCart] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 1800)
    try {
      await addItem(product, 1)
    } catch {
      setAddedToCart(false)
    }
  }

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.productID)
  }

  const hasDeal = product.dealCurrentPrice != null && Number(product.dealCurrentPrice) > 0
  const price = hasDeal ? formatPrice(product.dealCurrentPrice) : formatPrice(product.sellUnitPrice)
  const oldPrice = hasDeal ? formatPrice(product.dealPreviousPrice) : null
  const discountPct = hasDeal && product.dealRebate ? Math.round(Number(product.dealRebate) * 100) : null
  const showImage = product.hasImage && !imgFailed
  const tagColor = '#FF6B00'

  return (
    <Link className="product-card" to={`/product/${product.productID}`}>
      {discountPct && <span className="product-card__badge">-{discountPct}%</span>}
      <button
        className={`product-card__wishlist ${wishlisted ? 'product-card__wishlist--active' : ''}`}
        onClick={handleWishlist}
        title="Ajouter à la liste de souhaits"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>

      <div className="product-card__image-wrap">
        {showImage ? (
          <img
            src={productImageUrl(product.productID)}
            alt={product.name}
            className="product-card__image"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="product-card__image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>

      <div className="product-card__body">
        {product.productTypeName && (
          <span
            className="product-card__tag"
            style={{ color: tagColor, borderColor: tagColor + '33', background: tagColor + '12' }}
          >
            {product.productTypeName}
          </span>
        )}

        <h3 className="product-card__name">{product.name}</h3>

        {product.madeIn && (
          <div className="product-card__rating">
            <span className="product-card__reviews">Fabriqué en {product.madeIn}</span>
          </div>
        )}

        <div className="product-card__footer">
          <div className="product-card__price">
            {price ? (
              <>
                <span className="product-card__price-main">{price}</span>
                {oldPrice && <span className="product-card__price-old">{oldPrice}</span>}
              </>
            ) : (
              <span className="product-card__price-main">Prix sur demande</span>
            )}
          </div>

          <button
            className={`product-card__add-btn ${addedToCart ? 'product-card__add-btn--done' : ''}`}
            onClick={handleAddToCart}
          >
            {addedToCart ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}
