import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getTransporterPickups } from '../../api/transporterPortal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TransporterPickupsPage() {
  const allowed = useRequireRole('transporter')
  const { token } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    getTransporterPickups(token)
      .then(setRows)
      .catch((err) => setError(err.message || 'Impossible de charger les enlèvements'))
      .finally(() => setLoading(false))
  }, [allowed, token])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Enlèvements fournisseurs</h1>
          <p className="admin-page__muted">Marchandises à récupérer chez les fournisseurs et à livrer aux boutiques SBO</p>
        </div>
        <Link to="/" className="admin-page__back">Mon espace</Link>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Commande d’achat</th>
              <th>Enlèvement chez</th>
              <th>Livrer à</th>
              <th>Articles</th>
              <th>Commandée le</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">
                Aucun enlèvement ne vous a encore été confié.
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.purchaseID}>
                <td className="admin-orders__id">
                  <Link to={`/transporter/pickups/${row.purchaseID}`}>#{row.purchaseID}</Link>
                </td>
                <td>{row.supplierName}</td>
                <td className="admin-page__muted">{row.storeName || '—'}</td>
                <td>{row.itemCount}</td>
                <td className="admin-page__muted">{formatDate(row.purchaseDate)}</td>
                <td>
                  <span className={`admin-orders__badge ${row.receivedDate ? 'admin-orders__badge--done' : ''}`}>
                    {row.receivedDate ? 'Livrée à SBO' : 'À enlever'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
