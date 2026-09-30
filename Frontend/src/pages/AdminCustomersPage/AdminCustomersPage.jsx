import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCustomers } from '../../api/customers'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'

export default function AdminCustomersPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/customers' } })
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
    getCustomers({ search, page, limit: 20 }, token)
      .then((data) => {
        setRows(data.rows)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les clients'))
      .finally(() => setLoading(false))
  }, [token, user, search, page])

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Clients</h1>
          <p className="admin-page__muted">{total} client{total > 1 ? 's' : ''} inscrit{total > 1 ? 's' : ''}</p>
        </div>
        <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
      </div>

      <div className="admin-orders__filters">
        <input
          type="text"
          className="admin-orders__search"
          placeholder="Rechercher un client (nom, email, identifiant)…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Contact</th>
              <th>Ville</th>
              <th>Commandes</th>
              <th>Total dépensé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Aucun client trouvé.</td></tr>
            )}
            {!loading && rows.map((c) => (
              <tr key={c.contactID}>
                <td>
                  {c.firstName} {c.lastName}
                  {!!c.isAdmin && <span className="admin-orders__badge admin-orders__badge--done" style={{ marginLeft: 8 }}>Admin</span>}
                </td>
                <td className="admin-page__muted">{c.email || c.phone || '—'}</td>
                <td className="admin-page__muted">{c.cityName || '—'}</td>
                <td className="admin-page__muted">{c.orderCount}</td>
                <td className="admin-page__muted">{formatPriceOrTBD(c.totalSpent)}</td>
                <td>
                  <Link to={`/admin/customers/${c.contactID}`} className="admin-orders__toggle">Voir</Link>
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
