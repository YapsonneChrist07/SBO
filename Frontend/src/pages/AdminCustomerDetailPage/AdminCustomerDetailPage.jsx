import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCustomer } from '../../api/customers'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../AdminOrderDetailPage/AdminOrderDetailPage.css'

function formatDateTime(value) {
  if (!value) return null
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminCustomerDetailPage() {
  const { id } = useParams()
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/admin/customers/${id}` } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate, id])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getCustomer(id, token)
      .then(setCustomer)
      .catch((err) => setError(err.message || 'Client introuvable'))
      .finally(() => setLoading(false))
  }, [id, token, user])

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const totalSpent = (customer?.orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  return (
    <main className="admin-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>{customer ? `${customer.firstName} ${customer.lastName}` : 'Client'}</h1>
          <p className="admin-page__muted">{customer?.username ? `@${customer.username}` : loading ? 'Chargement…' : ''}</p>
        </div>
        <Link to="/admin/customers" className="admin-page__back">Tous les clients</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && customer && (
        <div className="admin-order-detail__layout">
          <section className="admin-panel">
            <h2>Historique des commandes</h2>
            {customer.orders?.length ? (
              <ul className="admin-list">
                {customer.orders.map((o) => (
                  <li key={o.sellID}>
                    <div className="admin-list__main">
                      <Link to={`/admin/orders/${o.sellID}`} className="admin-list__title">#{o.sellID}</Link>
                      <span className="admin-list__sub">{formatDateTime(o.sellDate)}</span>
                    </div>
                    <span className={`admin-orders__badge ${o.completed ? 'admin-orders__badge--done' : ''}`}>
                      {o.completed ? 'Terminée' : 'En cours'}
                    </span>
                    <span className="admin-list__value">{formatPriceOrTBD(o.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-page__muted">Aucune commande pour ce client.</p>
            )}
            {customer.orders?.length > 0 && (
              <div className="admin-order-detail__totals">
                <div className="admin-order-detail__grand"><span>Total dépensé</span><span>{formatPriceOrTBD(totalSpent)}</span></div>
              </div>
            )}
          </section>

          <div className="admin-order-detail__side">
            <section className="admin-panel">
              <h2>Profil</h2>
              {!!customer.isAdmin && <p className="admin-orders__badge admin-orders__badge--done">Administrateur</p>}
              {customer.email && <p className="admin-order-detail__field admin-page__muted">{customer.email}</p>}
              {customer.phone && <p className="admin-order-detail__field admin-page__muted">Tél : {customer.phone}</p>}
              {customer.alternatePhone && <p className="admin-order-detail__field admin-page__muted">Tél 2 : {customer.alternatePhone}</p>}
              {(customer.lineOfAddress || customer.cityName) && (
                <p className="admin-order-detail__field admin-page__muted">
                  {[customer.lineOfAddress, customer.cityName, customer.postalCode].filter(Boolean).join(', ')}
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  )
}
