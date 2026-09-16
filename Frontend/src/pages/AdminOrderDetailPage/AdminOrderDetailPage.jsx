import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getOrder, setOrderStatus } from '../../api/orders'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import './AdminOrderDetailPage.css'

function formatDateTime(value) {
  if (!value) return null
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/admin/orders/${id}` } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate, id])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getOrder(id, token)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Commande introuvable'))
      .finally(() => setLoading(false))
  }, [id, token, user])

  const toggleStatus = async () => {
    if (!order) return
    setUpdating(true)
    try {
      const nextCompleted = !order.completed
      await setOrderStatus(order.sellID, nextCompleted, token)
      setOrder((prev) => ({ ...prev, completed: nextCompleted ? 1 : 0 }))
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour la commande')
    } finally {
      setUpdating(false)
    }
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>Commande {order ? `#${order.sellID}` : ''}</h1>
          <p className="admin-page__muted">
            {order?.sellDate ? formatDateTime(order.sellDate) : loading ? 'Chargement…' : ''}
          </p>
        </div>
        <Link to="/admin/orders" className="admin-page__back">Toutes les commandes</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && order && (
        <>
          <div className="admin-order-detail__status-row">
            <span className={`admin-orders__badge ${order.completed ? 'admin-orders__badge--done' : ''}`}>
              {order.completed ? 'Terminée' : 'En cours'}
            </span>
            <button className="admin-orders__toggle" disabled={updating} onClick={toggleStatus}>
              {order.completed ? 'Marquer en cours' : 'Marquer terminée'}
            </button>
          </div>

          <div className="admin-order-detail__layout">
            <section className="admin-panel">
              <h2>Articles</h2>
              <ul className="admin-order-detail__items">
                {(order.details || []).map((d) => (
                  <li key={`${d.productID}-${d.lenghtID || ''}`}>
                    <Link to={`/product/${d.productID}`} target="_blank" rel="noopener noreferrer" className="admin-order-detail__item-name">
                      {d.quantity}× {d.productName}
                    </Link>
                    <span className="admin-page__muted">{formatPriceOrTBD(d.unitPrice)} / unité</span>
                    <span className="admin-order-detail__item-total">{formatPriceOrTBD(d.total)}</span>
                  </li>
                ))}
              </ul>

              <div className="admin-order-detail__totals">
                <div><span>Sous-total</span><span>{formatPriceOrTBD(order.subTotal)}</span></div>
                {Number(order.transportCost) > 0 && (
                  <div><span>Livraison</span><span>{formatPriceOrTBD(order.transportCost)}</span></div>
                )}
                {Number(order.tax) > 0 && (
                  <div><span>Taxes</span><span>{formatPriceOrTBD(order.tax)}</span></div>
                )}
                <div className="admin-order-detail__grand"><span>Total</span><span>{formatPriceOrTBD(order.total)}</span></div>
              </div>
            </section>

            <div className="admin-order-detail__side">
              <section className="admin-panel">
                <h2>Client</h2>
                <p className="admin-order-detail__field">
                  <strong>{`${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Client inconnu'}</strong>
                </p>
                {order.username && <p className="admin-order-detail__field admin-page__muted">@{order.username}</p>}
                {order.clientEmail && <p className="admin-order-detail__field admin-page__muted">{order.clientEmail}</p>}
                {order.brokerName && (
                  <p className="admin-order-detail__field admin-page__muted">Courtier : {order.brokerName}</p>
                )}
                {order.transporterName && (
                  <p className="admin-order-detail__field admin-page__muted">Transporteur : {order.transporterName}</p>
                )}
              </section>

              <section className="admin-panel">
                <h2>Paiements</h2>
                {order.payments?.length ? (
                  <ul className="admin-list">
                    {order.payments.map((p) => (
                      <li key={p.paymentID}>
                        <div className="admin-list__main">
                          <span className="admin-list__title">{p.paymentMethodName}</span>
                          <span className="admin-list__sub">{p.paymentDate ? formatDateTime(p.paymentDate) : ''}</span>
                        </div>
                        <span className="admin-list__value">{formatPriceOrTBD(p.paymentAmount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-page__muted">Aucun paiement enregistré.</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
