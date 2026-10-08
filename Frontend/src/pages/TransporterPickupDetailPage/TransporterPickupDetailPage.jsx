import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getTransporterPickup } from '../../api/transporterPortal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../AdminOrderDetailPage/AdminOrderDetailPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TransporterPickupDetailPage() {
  const allowed = useRequireRole('transporter')
  const { token } = useAuth()
  const { id } = useParams()
  const [pickup, setPickup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    getTransporterPickup(id, token)
      .then(setPickup)
      .catch((err) => setError(err.message || 'Enlèvement introuvable'))
      .finally(() => setLoading(false))
  }, [allowed, id, token])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const totalWeight = pickup?.items.reduce((sum, i) => sum + (Number(i.weight) || 0) * i.quantity, 0) || 0

  return (
    <main className="admin-page supplier-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>Enlèvement #{id}</h1>
          <p className="admin-page__muted">{pickup ? `Commande passée le ${formatDateTime(pickup.purchaseDate)}` : ''}</p>
        </div>
        <Link to="/transporter/pickups" className="admin-page__back">Tous les enlèvements</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && pickup && (
        <>
          <div className="admin-order-detail__status-row">
            <span className={`admin-orders__badge ${pickup.receivedDate ? 'admin-orders__badge--done' : ''}`}>
              {pickup.receivedDate ? `Réceptionnée par SBO le ${formatDateTime(pickup.receivedDate)}` : 'À enlever'}
            </span>
            {!pickup.receivedDate && (
              <span className="admin-page__muted">La boutique confirme la réception à l’arrivée des marchandises.</span>
            )}
          </div>

          <div className="admin-order-detail__layout">
            <section className="admin-panel">
              <h2>Marchandises</h2>
              <ul className="admin-order-detail__items">
                {pickup.items.map((item) => (
                  <li key={item.productID}>
                    <span className="admin-order-detail__item-name">{item.quantity}× {item.productName}</span>
                    <span className="admin-page__muted">{item.weight ? `${item.weight} kg / unité` : ''}</span>
                  </li>
                ))}
              </ul>
              {totalWeight > 0 && (
                <div className="admin-order-detail__totals">
                  <div className="admin-order-detail__grand"><span>Poids estimé</span><span>{totalWeight.toFixed(1)} kg</span></div>
                </div>
              )}
            </section>

            <div className="admin-order-detail__side">
              <section className="admin-panel">
                <h2>1. Enlèvement</h2>
                <p className="admin-order-detail__field"><strong>{pickup.supplierName}</strong></p>
                {pickup.supplierAddress && <p className="admin-order-detail__field">{pickup.supplierAddress}</p>}
                {pickup.supplierCity && <p className="admin-order-detail__field admin-page__muted">{pickup.supplierCity}</p>}
                {pickup.supplierContactName && <p className="admin-order-detail__field admin-page__muted">Contact : {pickup.supplierContactName}</p>}
                {pickup.supplierPhone && (
                  <p className="admin-order-detail__field"><a href={`tel:${pickup.supplierPhone}`} className="supplier-page__link">{pickup.supplierPhone}</a></p>
                )}
                {pickup.supplierEmail && <p className="admin-order-detail__field admin-page__muted">{pickup.supplierEmail}</p>}
              </section>
              <section className="admin-panel">
                <h2>2. Livraison</h2>
                <p className="admin-order-detail__field"><strong>{pickup.storeName || '—'}</strong></p>
                {pickup.storeAddress && <p className="admin-order-detail__field">{pickup.storeAddress}</p>}
                {pickup.storeCity && <p className="admin-order-detail__field admin-page__muted">{pickup.storeCity}</p>}
                {pickup.storePhone && (
                  <p className="admin-order-detail__field"><a href={`tel:${pickup.storePhone}`} className="supplier-page__link">{pickup.storePhone}</a></p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
