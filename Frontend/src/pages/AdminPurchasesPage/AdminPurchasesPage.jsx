import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPurchases } from '../../api/purchases'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'received', label: 'Réceptionnées' },
]

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPurchasesPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login', { replace: true, state: { from: '/admin/purchases' } })
    else if (!user.adminEntity) navigate('/account', { replace: true })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getPurchases({ status, page }, token)
      .then((data) => {
        setRows(data.rows)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les commandes d’achat'))
      .finally(() => setLoading(false))
  }, [token, user, status, page])

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Achats fournisseurs</h1>
          <p className="admin-page__muted">{total} commande{total > 1 ? 's' : ''} d’achat</p>
        </div>
        <div className="supplier-page__actions">
          <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
          <Link to="/admin/purchases/new" className="supplier-page__primary">+ Nouvelle commande</Link>
        </div>
      </div>

      <div className="admin-orders__filters">
        <select
          className="admin-orders__select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Fournisseur</th>
              <th>Boutique</th>
              <th>Date</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="admin-page__muted admin-orders__empty">
                Aucune commande d’achat{status ? ' pour ce filtre' : ''}.
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.purchaseID}>
                <td className="admin-orders__id">
                  <Link to={`/admin/purchases/${row.purchaseID}`}>#{row.purchaseID}</Link>
                </td>
                <td>{row.supplierName}</td>
                <td className="admin-page__muted">{row.storeName || '—'}</td>
                <td className="admin-page__muted">{formatDate(row.purchaseDate)}</td>
                <td>{row.itemCount}</td>
                <td><strong>{formatPriceOrTBD(row.total)}</strong></td>
                <td>
                  <span className={`admin-orders__badge ${row.receivedDate ? 'admin-orders__badge--done' : ''}`}>
                    {row.receivedDate ? 'Réceptionnée' : 'En attente'}
                  </span>
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
