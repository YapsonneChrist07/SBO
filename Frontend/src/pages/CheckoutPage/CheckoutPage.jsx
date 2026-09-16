import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { createOrder } from '../../api/orders'
import { formatPriceOrTBD } from '../../utils/format'
import './CheckoutPage.css'

export default function CheckoutPage() {
  const { user, token, loading: authLoading } = useAuth()
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState({ address: '', city: '', postalCode: '', phone: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Require authentication for checkout.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (user?.phone) setForm((f) => ({ ...f, phone: f.phone || user.phone }))
  }, [user])

  if (authLoading || !user) {
    return <main className="checkout-page"><p className="checkout-page__muted">Chargement…</p></main>
  }

  if (items.length === 0 && !submitting) {
    return (
      <main className="checkout-page">
        <div className="checkout-page__empty">
          <h1>Votre panier est vide</h1>
          <Link to="/" className="checkout-page__cta">Retour à la boutique</Link>
        </div>
      </main>
    )
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        items: items.map((i) => ({
          productID: i.productID,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice) || 0,
        })),
      }
      const { sellID } = await createOrder(payload, token)
      await clear()
      navigate(`/order/${sellID}`, { replace: true })
    } catch (err) {
      setError(err.message || 'La commande a échoué. Réessayez.')
      setSubmitting(false)
    }
  }

  return (
    <main className="checkout-page">
      <h1 className="checkout-page__title">Finaliser la commande</h1>

      {error && <div className="checkout-page__error">{error}</div>}

      <div className="checkout-page__layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-form__section">
            <h2>Coordonnées</h2>
            <div className="checkout-form__grid">
              <label>
                <span>Prénom</span>
                <input value={user.firstName || ''} disabled />
              </label>
              <label>
                <span>Nom</span>
                <input value={user.lastName || ''} disabled />
              </label>
              <label className="checkout-form__full">
                <span>Email</span>
                <input value={user.email || ''} disabled />
              </label>
              <label className="checkout-form__full">
                <span>Téléphone</span>
                <input name="phone" value={form.phone} onChange={handleChange} required />
              </label>
            </div>
          </section>

          <section className="checkout-form__section">
            <h2>Adresse de livraison</h2>
            <div className="checkout-form__grid">
              <label className="checkout-form__full">
                <span>Adresse</span>
                <input name="address" value={form.address} onChange={handleChange} required />
              </label>
              <label>
                <span>Ville</span>
                <input name="city" value={form.city} onChange={handleChange} required />
              </label>
              <label>
                <span>Code postal</span>
                <input name="postalCode" value={form.postalCode} onChange={handleChange} required />
              </label>
              <label className="checkout-form__full">
                <span>Instructions de livraison (optionnel)</span>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
              </label>
            </div>
          </section>

          <button className="checkout-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Traitement…' : `Confirmer la commande · ${formatPriceOrTBD(subtotal)}`}
          </button>
        </form>

        <aside className="checkout-summary">
          <h2>Votre commande</h2>
          <ul>
            {items.map((i) => (
              <li key={i.productID}>
                <span className="checkout-summary__qty">{i.quantity}×</span>
                <span className="checkout-summary__name">{i.productName}</span>
                <span className="checkout-summary__price">{formatPriceOrTBD(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__total">
            <span>Total</span>
            <span>{formatPriceOrTBD(subtotal)}</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
