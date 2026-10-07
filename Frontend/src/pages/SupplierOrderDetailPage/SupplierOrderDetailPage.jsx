import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getSupplierPurchase } from '../../api/supplierPortal'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrderDetailPage/AdminOrderDetailPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SupplierOrderDetailPage() {
  const allowed = useRequireRole('supplier')
  const { token } = useAuth()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    getSupplierPurchase(id, token)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Commande introuvable'))
      .finally(() => setLoading(false))
  }, [allowed, id, token])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>Commande d’achat #{id}</h1>
          <p className="admin-page__muted">{order ? formatDateTime(order.purchaseDate) : ''}</p>
        </div>
        <Link to="/supplier/orders" className="admin-page__back">Toutes les commandes</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && order && (
        <>
        <div className="admin-order-detail__status-row">
          <span className={`admin-orders__badge ${order.receivedDate ? 'admin-orders__badge--done' : ''}`}>
            {order.receivedDate ? `Réceptionnée par SBO le ${formatDateTime(order.receivedDate)}` : 'À livrer'}
          </span>
        </div>
        <div className="admin-order-detail__layout">
          <section className="admin-panel">
            <h2>Articles commandés</h2>
            <ul className="admin-order-detail__items">
              {order.details.map((d) => (
                <li key={d.productID}>
                  {/* Products since removed from the supplier's catalogue have no page to link to. */}
                  {d.inCatalog ? (
                    <Link to={`/supplier/products/${d.productID}`} className="admin-order-detail__item-name">
                      {d.quantity}× {d.productName?.trim()}
                      {d.supplierProductCode && <span className="admin-page__muted"> ({d.supplierProductCode})</span>}
                    </Link>
                  ) : (
                    <span className="admin-order-detail__item-name">{d.quantity}× {d.productName?.trim()}</span>
                  )}
                  <span className="admin-page__muted">{formatPriceOrTBD(d.unitPrice)} / unité</span>
                  <span className="admin-order-detail__item-total">{formatPriceOrTBD(d.total)}</span>
                </li>
              ))}
            </ul>

            <div className="admin-order-detail__totals">
              <div><span>Sous-total</span><span>{formatPriceOrTBD(order.subTotal)}</span></div>
              {Number(order.transportCost) > 0 && (
                <div><span>Transport</span><span>{formatPriceOrTBD(order.transportCost)}</span></div>
              )}
              {Number(order.tax) > 0 && (
                <div><span>Taxes</span><span>{formatPriceOrTBD(order.tax)}</span></div>
              )}
              <div className="admin-order-detail__grand"><span>Total</span><span>{formatPriceOrTBD(order.total)}</span></div>
            </div>
          </section>

          <div className="admin-order-detail__side">
            <section className="admin-panel">
              <h2>Acheteur</h2>
              <p className="admin-order-detail__field"><strong>{order.brokerName || 'SBO'}</strong></p>
              {order.brokerContactName && (
                <p className="admin-order-detail__field admin-page__muted">Contact : {order.brokerContactName}</p>
              )}
              {order.brokerContactEmail && (
                <p className="admin-order-detail__field admin-page__muted">{order.brokerContactEmail}</p>
              )}
            </section>
            <section className="admin-panel">
              <h2>Livraison</h2>
              <p className="admin-order-detail__field">Boutique : <strong>{order.storeName || '—'}</strong></p>
              <p className="admin-order-detail__field admin-page__muted">
                Transporteur : {order.transporterName?.trim() || 'à définir'}
              </p>
            </section>
          </div>
        </div>
        </>
      )}
    </main>
  )
}
