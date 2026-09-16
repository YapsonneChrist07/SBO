import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getOrder } from '../../api/orders'
import { formatPriceOrTBD } from '../../utils/format'
import './OrderConfirmationPage.css'

export default function OrderConfirmationPage() {
  const { id } = useParams()
  const { token, loading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true, state: { from: `/order/${id}` } })
    }
  }, [authLoading, user, navigate, id])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getOrder(id, token)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Commande introuvable'))
      .finally(() => setLoading(false))
  }, [id, token])

  if (authLoading || loading) {
    return <main className="order-page"><p className="order-page__muted">Chargement…</p></main>
  }

  if (error) {
    return (
      <main className="order-page">
        <div className="order-page__box">
          <h1>Commande introuvable</h1>
          <p className="order-page__muted">{error}</p>
          <Link to="/" className="order-page__cta">Retour à la boutique</Link>
        </div>
      </main>
    )
  }

  const details = order.details || []
  const date = order.sellDate ? new Date(order.sellDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : null

  return (
    <main className="order-page">
      <div className="order-page__box">
        <span className="order-page__check">✓</span>
        <h1>Merci pour votre commande&nbsp;!</h1>
        <p className="order-page__muted">
          Votre commande a bien été enregistrée. Un email de confirmation vous sera envoyé.
        </p>

        <div className="order-page__meta">
          <div>
            <span>Numéro de commande</span>
            <strong>{order.sellID}</strong>
          </div>
          {date && (
            <div>
              <span>Date</span>
              <strong>{date}</strong>
            </div>
          )}
        </div>

        <ul className="order-page__items">
          {details.map((d) => (
            <li key={d.productID}>
              <Link to={`/product/${d.productID}`} className="order-page__item-name">
                {d.quantity}× {d.productName}
              </Link>
              <span>{formatPriceOrTBD(d.total)}</span>
            </li>
          ))}
        </ul>

        <div className="order-page__totals">
          <div><span>Sous-total</span><span>{formatPriceOrTBD(order.subTotal)}</span></div>
          {Number(order.transportCost) > 0 && (
            <div><span>Livraison</span><span>{formatPriceOrTBD(order.transportCost)}</span></div>
          )}
          {Number(order.tax) > 0 && (
            <div><span>Taxes</span><span>{formatPriceOrTBD(order.tax)}</span></div>
          )}
          <div className="order-page__grand"><span>Total</span><span>{formatPriceOrTBD(order.total)}</span></div>
        </div>

        <Link to="/" className="order-page__cta">Continuer mes achats</Link>
      </div>
    </main>
  )
}
