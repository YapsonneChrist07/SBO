import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllOrders, setOrderStatus } from '../../api/orders'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import './AdminOrdersPage.css'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminOrdersPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingID, setUpdatingID] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/orders' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getAllOrders({ search, completed: statusFilter, page, limit: 20 }, token)
      .then((data) => {
        setOrders(data.orders)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les commandes'))
      .finally(() => setLoading(false))
  }, [token, user, search, statusFilter, page])

  const toggleStatus = async (order) => {
    setUpdatingID(order.sellID)
    try {
      const nextCompleted = !order.completed
      await setOrderStatus(order.sellID, nextCompleted, token)
      setOrders((prev) => prev.map((o) => (o.sellID === order.sellID ? { ...o, completed: nextCompleted ? 1 : 0 } : o)))
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour la commande')
    } finally {
      setUpdatingID(null)
    }
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Commandes</h1>
          <p className="admin-page__muted">{total} commande{total > 1 ? 's' : ''} au total</p>
        </div>
        <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
      </div>

      <div className="admin-orders__filters">
        <input
          type="text"
          className="admin-orders__search"
          placeholder="Rechercher par ID, nom ou identifiant…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-orders__select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Terminées</option>
          <option value="false">En cours</option>
        </select>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Client</th>
              <th>Date</th>
              <th>Total</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Aucune commande trouvée.</td></tr>
            )}
            {!loading && orders.map((order) => (
              <tr key={order.sellID}>
                <td className="admin-orders__id">
                  <Link to={`/admin/orders/${order.sellID}`}>#{order.sellID}</Link>
                </td>
                <td>
                  {order.firstName || order.lastName
                    ? `${order.firstName || ''} ${order.lastName || ''}`.trim()
                    : (order.username || 'Client inconnu')}
                </td>
                <td>{formatDate(order.sellDate)}</td>
                <td>{formatPriceOrTBD(order.total)}</td>
                <td>
                  <span className={`admin-orders__badge ${order.completed ? 'admin-orders__badge--done' : ''}`}>
                    {order.completed ? 'Terminée' : 'En cours'}
                  </span>
                </td>
                <td>
                  <button
                    className="admin-orders__toggle"
                    disabled={updatingID === order.sellID}
                    onClick={() => toggleStatus(order)}
                  >
                    {order.completed ? 'Marquer en cours' : 'Marquer terminée'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-orders__pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
        </div>
      )}
    </main>
  )
}
