import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyOrders } from '../../api/orders'
import { formatPriceOrTBD } from '../../utils/format'
import BarChart from '../../components/charts/BarChart'
import './AccountPage.css'

export default function AccountPage() {
  const { user, loading: authLoading, token, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true, state: { from: '/account' } })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getMyOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message || 'Impossible de charger vos commandes'))
      .finally(() => setLoading(false))
  }, [token])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (authLoading || !user) {
    return <main className="account-page"><p className="account-page__muted">Chargement…</p></main>
  }

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const purchaseChartData = [...orders]
    .sort((a, b) => new Date(a.sellDate) - new Date(b.sellDate))
    .map((o) => ({
      label: o.sellDate
        ? new Date(o.sellDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
        : `#${o.sellID}`,
      value: Number(o.total) || 0,
    }))

  return (
    <main className="account-page">
      <div className="account-page__header">
        <div>
          <h1>Mon compte</h1>
          <p className="account-page__muted">
            {user.firstName} {user.lastName} · {user.username}
          </p>
        </div>
        <div className="account-page__header-actions">
          {user.adminEntity && <Link to="/admin" className="account-page__admin">Tableau de bord</Link>}
          <button className="account-page__logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>

      {!loading && !error && orders.length > 0 && (
        <section className="account-page__section">
          <h2>Mes achats</h2>

          <div className="account-page__kpis">
            <div className="account-page__kpi">
              <span className="account-page__kpi-label">Total dépensé</span>
              <span className="account-page__kpi-value">{formatPriceOrTBD(totalSpent)}</span>
            </div>
            <div className="account-page__kpi">
              <span className="account-page__kpi-label">Commandes passées</span>
              <span className="account-page__kpi-value">{orders.length}</span>
            </div>
          </div>

          {orders.length > 1 && (
            <BarChart
              data={purchaseChartData}
              valueFormatter={(v) => formatPriceOrTBD(v)}
            />
          )}
        </section>
      )}

      <section className="account-page__section">
        <h2>Mes commandes</h2>

        {loading && <p className="account-page__muted">Chargement…</p>}

        {!loading && error && <p className="account-page__muted">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="account-page__empty">
            <p>Vous n'avez pas encore passé de commande.</p>
            <Link to="/" className="account-page__cta">Découvrir les produits</Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <ul className="account-page__orders">
            {orders.map((order) => {
              const date = order.sellDate
                ? new Date(order.sellDate).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : null
              return (
                <li key={order.sellID}>
                  <Link to={`/order/${order.sellID}`} className="order-row">
                    <div className="order-row__main">
                      <span className="order-row__id">Commande #{order.sellID}</span>
                      {date && <span className="order-row__date">{date}</span>}
                    </div>
                    <span className={`order-row__status ${order.completed ? 'order-row__status--done' : ''}`}>
                      {order.completed ? 'Terminée' : 'En cours'}
                    </span>
                    <span className="order-row__total">{formatPriceOrTBD(order.total)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
