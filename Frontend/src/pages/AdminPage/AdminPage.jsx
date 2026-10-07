import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDashboardSummary, getSalesTrend } from '../../api/dashboard'
import { formatPriceOrTBD } from '../../utils/format'
import BarChart from '../../components/charts/BarChart'
import './AdminPage.css'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMonth(ym) {
  const [year, month] = ym.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

export default function AdminPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [salesTrend, setSalesTrend] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getDashboardSummary(token)
      .then(setSummary)
      .catch((err) => setError(err.message || 'Impossible de charger le tableau de bord'))
      .finally(() => setLoading(false))
    getSalesTrend(token).then(setSalesTrend).catch(() => setSalesTrend([]))
  }, [token, user])

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const stats = summary && [
    { label: 'Chiffre d\'affaires', value: formatPriceOrTBD(summary.sells?.totalRevenue) },
    { label: 'Commandes', value: summary.sells?.totalSells ?? 0 },
    { label: 'Clients', value: summary.clients?.totalClients ?? 0, to: '/admin/customers' },
    { label: 'Produits', value: summary.products?.totalProducts ?? 0, to: '/admin/products' },
    { label: 'Stock faible', value: summary.lowStock?.lowStockCount ?? 0, to: '/admin/inventory' },
    { label: 'Fournisseurs', value: summary.suppliers?.totalSuppliers ?? 0 },
    { label: 'Coût achats', value: formatPriceOrTBD(summary.purchases?.totalPurchaseCost), to: '/admin/purchases' },
  ]

  const quickLinks = [
    { to: '/admin/customers', label: 'Clients' },
    { to: '/admin/products', label: 'Produits' },
    { to: '/admin/categories', label: 'Catégories' },
    { to: '/admin/promotions', label: 'Promotions' },
    { to: '/admin/inventory', label: 'Inventaire' },
    { to: '/admin/orders', label: 'Commandes' },
    { to: '/admin/purchases', label: 'Achats fournisseurs' },
  ]

  const lowStockCount = summary?.lowStock?.lowStockCount ?? 0

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Tableau de bord</h1>
          <p className="admin-page__muted">Vue d'ensemble de l'activité SBO</p>
        </div>
        <Link to="/account" className="admin-page__back">Mon compte</Link>
      </div>

      <nav className="admin-quicklinks">
        {quickLinks.map((l) => (
          <Link key={l.to} to={l.to} className="admin-quicklinks__item">{l.label}</Link>
        ))}
      </nav>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && summary && (
        <>
          {lowStockCount > 0 && (
            <Link to="/admin/inventory" className="admin-page__alert admin-page__alert--link">
              ⚠ {lowStockCount} ligne{lowStockCount > 1 ? 's' : ''} de stock faible — voir l'inventaire
            </Link>
          )}

          <div className="admin-stats">
            {stats.map((s) => {
              const Tag = s.to ? Link : 'div'
              return (
                <Tag key={s.label} to={s.to} className={`admin-stat${s.to ? ' admin-stat--link' : ''}`}>
                  <span className="admin-stat__label">{s.label}</span>
                  <span className="admin-stat__value">{s.value}</span>
                </Tag>
              )
            })}
          </div>

          <div className="admin-page__layout">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Commandes récentes</h2>
                <Link to="/admin/orders" className="admin-panel__link">Voir tout</Link>
              </div>
              {summary.recentSells?.length ? (
                <ul className="admin-list">
                  {summary.recentSells.map((s) => (
                    <li key={s.sellID}>
                      <div className="admin-list__main">
                        <span className="admin-list__title">#{s.sellID}</span>
                        <span className="admin-list__sub">{s.clientName || 'Client anonyme'} · {formatDate(s.sellDate)}</span>
                      </div>
                      <span className="admin-list__value">{formatPriceOrTBD(s.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__muted">Aucune commande pour le moment.</p>
              )}
            </section>

            <section className="admin-panel">
              <h2>Meilleures ventes</h2>
              <BarChart
                data={(summary.topProducts || []).map((p) => ({
                  label: p.name,
                  value: Number(p.totalSold) || 0,
                  sub: `${p.totalSold} vendu${p.totalSold > 1 ? 's' : ''}`,
                }))}
                valueFormatter={(v) => `${v} vendu${v > 1 ? 's' : ''}`}
                emptyMessage="Aucune vente pour le moment."
              />
            </section>
          </div>

          <section className="admin-panel admin-panel--wide">
            <h2>Chiffre d'affaires par mois</h2>
            {salesTrend === null ? (
              <p className="admin-page__muted">Chargement…</p>
            ) : (
              <BarChart
                data={salesTrend.map((row) => ({
                  label: formatMonth(row.month),
                  value: Number(row.revenue) || 0,
                  sub: `${row.orders} commande${row.orders > 1 ? 's' : ''}`,
                }))}
                valueFormatter={(v) => formatPriceOrTBD(v)}
                emptyMessage="Aucune commande enregistrée pour le moment."
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}
