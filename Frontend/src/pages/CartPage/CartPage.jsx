import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { productImageUrl } from '../../api/products'
import { formatPriceOrTBD } from '../../utils/format'
import './CartPage.css'

export default function CartPage() {
  const { items, subtotal, loading, busy, setQty, removeItem } = useCart()
  const navigate = useNavigate()

  if (loading && items.length === 0) {
    return (
      <main className="cart-page">
        <h1 className="cart-page__title">Mon panier</h1>
        <p className="cart-page__muted">Chargement…</p>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-page__empty">
          <span className="cart-page__empty-icon">🛒</span>
          <h1>Votre panier est vide</h1>
          <p>Parcourez notre catalogue et ajoutez vos coups de cœur.</p>
          <Link to="/" className="cart-page__cta">Découvrir les produits</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="cart-page">
      <h1 className="cart-page__title">Mon panier <span>({items.length} article{items.length > 1 ? 's' : ''})</span></h1>

      <div className="cart-page__layout">
        <ul className="cart-page__items">
          {items.map((item) => (
            <li key={item.productID} className="cart-item">
              <Link to={`/product/${item.productID}`} className="cart-item__thumb">
                <img
                  src={productImageUrl(item.productID)}
                  alt={item.productName}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                />
              </Link>

              <div className="cart-item__info">
                <Link to={`/product/${item.productID}`} className="cart-item__name">
                  {item.productName}
                </Link>
                <span className="cart-item__unit">{formatPriceOrTBD(item.unitPrice)} / unité</span>
                <button
                  className="cart-item__remove"
                  onClick={() => removeItem(item.productID)}
                  disabled={busy}
                >
                  Retirer
                </button>
              </div>

              <div className="cart-item__qty">
                <button onClick={() => setQty(item.productID, item.quantity - 1)} disabled={busy} aria-label="Diminuer">−</button>
                <span>{item.quantity}</span>
                <button onClick={() => setQty(item.productID, item.quantity + 1)} disabled={busy} aria-label="Augmenter">+</button>
              </div>

              <div className="cart-item__total">{formatPriceOrTBD(item.total)}</div>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Récapitulatif</h2>
          <div className="cart-summary__row">
            <span>Sous-total</span>
            <span>{formatPriceOrTBD(subtotal)}</span>
          </div>
          <div className="cart-summary__row">
            <span>Livraison</span>
            <span className="cart-summary__free">Calculée à la commande</span>
          </div>
          <div className="cart-summary__row cart-summary__row--total">
            <span>Total</span>
            <span>{formatPriceOrTBD(subtotal)}</span>
          </div>
          <button
            className="cart-summary__checkout"
            onClick={() => navigate('/checkout')}
            disabled={busy}
          >
            Passer la commande
          </button>
          <Link to="/" className="cart-summary__continue">Continuer mes achats</Link>
        </aside>
      </div>
    </main>
  )
}
