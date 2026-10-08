import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getTransporterShipments } from '../../api/transporterPortal'
import ShipmentBadge from '../../components/ShipmentBadge/ShipmentBadge'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'assigned', label: 'À enlever' },
  { value: 'in_transit', label: 'En cours' },
  { value: 'delivered', label: 'Livrées' },
]

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TransporterDeliveriesPage() {
  const allowed = useRequireRole('transporter')
  const { token } = useAuth()
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    getTransporterShipments(status, token)
      .then(setRows)
      .catch((err) => setError(err.message || 'Impossible de charger les livraisons'))
      .finally(() => setLoading(false))
  }, [allowed, token, status])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Livraisons clients</h1>
          <p className="admin-page__muted">Commandes SBO à livrer chez les clients</p>
        </div>
        <Link to="/" className="admin-page__back">Mon espace</Link>
      </div>

      <div className="admin-orders__filters">
        <select className="admin-orders__select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Client</th>
              <th>Ville</th>
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
                {status ? 'Aucune livraison pour ce filtre.' : 'SBO ne vous a encore confié aucune livraison.'}
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.shipmentID}>
                <td className="admin-orders__id">
                  <Link to={`/transporter/deliveries/${row.sellID}`}>#{row.sellID}</Link>
                </td>
                <td>{`${row.firstName || ''} ${row.lastName || ''}`.trim() || '—'}</td>
                <td className="admin-page__muted">{row.cityName || '—'}</td>
                <td>{row.itemCount}</td>
                <td className="admin-page__muted">{formatDate(row.sellDate)}</td>
                <td><ShipmentBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
