import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPurchase, receivePurchase, cancelPurchase } from '../../api/purchases'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../AdminOrderDetailPage/AdminOrderDetailPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPurchaseDetailPage() {
  const { user, loading: authLoading, token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const isAdmin = !!user?.adminEntity

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // 'receive' | 'cancel' while waiting for the inline confirmation
  const [confirming, setConfirming] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login', { replace: true, state: { from: `/admin/purchases/${id}` } })
    else if (!user.adminEntity) navigate('/account', { replace: true })
  }, [authLoading, user, navigate, id])

  const load = useCallback(() => getPurchase(id, token)
    .then(setOrder)
    .catch((err) => setError(err.message || 'Commande introuvable'))
    .finally(() => setLoading(false)), [id, token])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  const handleReceive = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await receivePurchase(id, token)
      setConfirming(null)
      await load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await cancelPurchase(id, token)
      navigate('/admin/purchases', { replace: true })
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  if (authLoading || !isAdmin) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const received = !!order?.receivedDate

  return (
    <main className="admin-page supplier-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>Commande d’achat #{id}</h1>
          <p className="admin-page__muted">{order ? `Passée le ${formatDateTime(order.purchaseDate)}` : ''}</p>
        </div>
        <Link to="/admin/purchases" className="admin-page__back">Achats fournisseurs</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && order && (
        <>
          <div className="admin-order-detail__status-row">
            <span className={`admin-orders__badge ${received ? 'admin-orders__badge--done' : ''}`}>
              {received ? `Réceptionnée le ${formatDateTime(order.receivedDate)}` : 'En attente de livraison'}
            </span>

            {!received && !confirming && (
              <>
                <button className="admin-orders__toggle" onClick={() => setConfirming('receive')}>Marquer comme reçue</button>
                <button className="supplier-page__danger" onClick={() => setConfirming('cancel')}>Annuler la commande</button>
              </>
            )}
            {confirming === 'receive' && (
              <>
                <span className="admin-page__muted">
                  Ajouter ces quantités au stock de {order.storeName || 'la boutique'} ?
                </span>
                <button className="admin-orders__toggle" disabled={busy} onClick={handleReceive}>Confirmer la réception</button>
                <button className="admin-page__back" disabled={busy} onClick={() => setConfirming(null)}>Retour</button>
              </>
            )}
            {confirming === 'cancel' && (
              <>
                <span className="admin-page__muted">La commande sera supprimée.</span>
                <button className="supplier-page__danger" disabled={busy} onClick={handleCancel}>Confirmer l’annulation</button>
                <button className="admin-page__back" disabled={busy} onClick={() => setConfirming(null)}>Retour</button>
              </>
            )}
          </div>
          {actionError && <p className="supplier-form__status supplier-form__status--error">{actionError}</p>}

          <div className="admin-order-detail__layout">
            <section className="admin-panel">
              <h2>Articles</h2>
              <ul className="admin-order-detail__items">
                {order.details.map((d) => (
                  <li key={d.productID}>
                    <Link to={`/product/${d.productID}`} target="_blank" rel="noopener noreferrer" className="admin-order-detail__item-name">
                      {d.quantity}× {d.productName?.trim()}
                      {d.supplierProductCode && <span className="admin-page__muted"> (réf. {d.supplierProductCode})</span>}
                    </Link>
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
                <h2>Fournisseur</h2>
                <p className="admin-order-detail__field"><strong>{order.supplierName}</strong></p>
                {order.supplierContactName && (
                  <p className="admin-order-detail__field admin-page__muted">{order.supplierContactName}</p>
                )}
                {order.supplierContactEmail && (
                  <p className="admin-order-detail__field admin-page__muted">{order.supplierContactEmail}</p>
                )}
                {order.supplierContactPhone && (
                  <p className="admin-order-detail__field admin-page__muted">{order.supplierContactPhone}</p>
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
