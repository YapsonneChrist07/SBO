import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getSupplierPurchases } from '../../api/supplierPortal'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SupplierOrdersPage() {
  const allowed = useRequireRole('supplier')
  const { token } = useAuth()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    getSupplierPurchases({ page }, token)
      .then((data) => {
        setRows(data.rows)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les commandes'))
      .finally(() => setLoading(false))
  }, [allowed, token, page])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Commandes d’achat</h1>
          <p className="admin-page__muted">{total} commande{total > 1 ? 's' : ''} passée{total > 1 ? 's' : ''} par SBO</p>
        </div>
        <Link to="/" className="admin-page__back">Mon espace</Link>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Date</th>
              <th>Boutique livrée</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">
                SBO ne vous a encore passé aucune commande. Elles apparaîtront ici dès que SBO s’approvisionnera chez vous.
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.purchaseID}>
                <td className="admin-orders__id">
                  <Link to={`/supplier/orders/${row.purchaseID}`}>#{row.purchaseID}</Link>
                </td>
                <td className="admin-page__muted">{formatDate(row.purchaseDate)}</td>
                <td className="admin-page__muted">{row.storeName || '—'}</td>
                <td>{row.itemCount}</td>
                <td><strong>{formatPriceOrTBD(row.total)}</strong></td>
                <td>
                  <span className={`admin-orders__badge ${row.receivedDate ? 'admin-orders__badge--done' : ''}`}>
                    {row.receivedDate ? 'Livrée' : 'À livrer'}
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
