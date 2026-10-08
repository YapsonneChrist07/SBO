import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPartners, getPartnerSummary, setPartnerStatus } from '../../api/partners'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'
import './AdminPartnersPage.css'

const TYPES = [
  { value: 'supplier', label: 'Fournisseurs' },
  { value: 'transporter', label: 'Transporteurs' },
]
const STATUS = {
  pending: { label: 'En attente', className: 'partners__badge--pending' },
  active: { label: 'Validé', className: 'admin-orders__badge--done' },
  disabled: { label: 'Désactivé', className: 'partners__badge--disabled' },
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const activity = (type, p) => (type === 'supplier'
  ? [`${p.productCount} produit${p.productCount > 1 ? 's' : ''}`, `${p.purchaseCount} commande${p.purchaseCount > 1 ? 's' : ''}`]
  : [`${p.deliveryCount} livraison${p.deliveryCount > 1 ? 's' : ''}`, `${p.pickupCount} enlèvement${p.pickupCount > 1 ? 's' : ''}`, `${p.rateCount} tarifs`])

function PartnerActions({ partner, onChange }) {
  const [confirming, setConfirming] = useState(null) // 'reject' | 'disable'
  const [busy, setBusy] = useState(false)

  const run = async (status) => {
    setBusy(true)
    try {
      await onChange(partner, status)
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <div className="partners__actions">
        <button className="supplier-page__danger" disabled={busy} onClick={() => run('disabled')}>
          {confirming === 'reject' ? 'Confirmer le refus' : 'Confirmer'}
        </button>
        <button className="admin-page__back" disabled={busy} onClick={() => setConfirming(null)}>Annuler</button>
      </div>
    )
  }
  return (
    <div className="partners__actions">
      {partner.status === 'pending' && (
        <>
          <button className="supplier-page__primary" disabled={busy} onClick={() => run('active')}>Valider</button>
          <button className="supplier-page__danger" disabled={busy} onClick={() => setConfirming('reject')}>Refuser</button>
        </>
      )}
      {partner.status === 'active' && (
        <button className="supplier-page__danger" disabled={busy} onClick={() => setConfirming('disable')}>Désactiver</button>
      )}
      {partner.status === 'disabled' && (
        <button className="admin-page__back" disabled={busy} onClick={() => run('active')}>Réactiver</button>
      )}
    </div>
  )
}

export default function AdminPartnersPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'transporter' ? 'transporter' : 'supplier'
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login', { replace: true, state: { from: '/admin/partners' } })
    else if (!user.adminEntity) navigate('/account', { replace: true })
  }, [authLoading, user, navigate])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    Promise.all([getPartners({ type, status, search }, token), getPartnerSummary(token)])
      .then(([list, counts]) => { setRows(list); setSummary(counts) })
      .catch((err) => setError(err.message || 'Impossible de charger les partenaires'))
      .finally(() => setLoading(false))
  }, [token, user, type, status, search])

  useEffect(() => { load() }, [load])

  const handleChange = async (partner, next) => {
    setNotice(null)
    try {
      await setPartnerStatus(type, partner.id, next, token)
      const verb = next === 'active' ? (partner.status === 'pending' ? 'validé' : 'réactivé') : (partner.status === 'pending' ? 'refusé' : 'désactivé')
      setNotice(`${partner.name} : compte ${verb}.`)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const pendingTotal = summary ? summary.supplier.pending + summary.transporter.pending : 0

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Partenaires</h1>
          <p className="admin-page__muted">
            Fournisseurs et transporteurs inscrits sur SBO
            {pendingTotal > 0 && ` · ${pendingTotal} inscription${pendingTotal > 1 ? 's' : ''} en attente`}
          </p>
        </div>
        <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
      </div>

      <nav className="partners__tabs">
        {TYPES.map((t) => (
          <button
            key={t.value}
            className={`partners__tab${type === t.value ? ' partners__tab--active' : ''}`}
            onClick={() => setParams({ type: t.value })}
          >
            {t.label}
            {summary?.[t.value].pending > 0 && <span className="partners__count">{summary[t.value].pending}</span>}
          </button>
        ))}
      </nav>

      <div className="admin-orders__filters">
        <input
          type="text"
          className="admin-orders__search"
          placeholder="Rechercher une entreprise…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select className="admin-orders__select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </select>
      </div>

      {notice && <p className="supplier-form__status">{notice}</p>}
      {error && <p className="supplier-form__status supplier-form__status--error">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Contact</th>
              <th>Inscrit le</th>
              <th>Activité</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="admin-page__muted admin-orders__empty">Aucun partenaire pour ce filtre.</td></tr>
            )}
            {!loading && rows.map((p) => (
              <tr key={p.id} className={p.status === 'pending' ? 'partners__row--pending' : ''}>
                <td className="partners__company">
                  <strong>{p.name}</strong>
                  {p.businessDescription && <div className="admin-page__muted">{p.businessDescription}</div>}
                </td>
                <td>
                  {p.firstName || p.lastName ? <div>{`${p.firstName || ''} ${p.lastName || ''}`.trim()}</div> : <span className="admin-page__muted">Aucun compte</span>}
                  {p.email && <div className="admin-page__muted">{p.email}</div>}
                  {p.phone && <div className="admin-page__muted">{p.phone}</div>}
                </td>
                <td className="admin-page__muted">{formatDate(p.signedUpDate)}</td>
                <td className="admin-page__muted">{activity(type, p).map((a) => <div key={a}>{a}</div>)}</td>
                <td>
                  <span className={`admin-orders__badge ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
                </td>
                <td><PartnerActions partner={p} onChange={handleChange} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
