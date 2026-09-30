import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPromotions, createPromotion, deletePromotion } from '../../api/promotions'
import NewPromotionModal from './NewPromotionModal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../AdminProductsPage/AdminProductsPage.css'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isActive(promo) {
  const now = new Date()
  return new Date(promo.startDate) <= now && now <= new Date(promo.endDate)
}

export default function AdminPromotionsPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteID, setConfirmDeleteID] = useState(null)
  const [deletingID, setDeletingID] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/promotions' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user?.adminEntity) return
    setLoading(true)
    getPromotions()
      .then(setPromotions)
      .catch((err) => setError(err.message || 'Impossible de charger les promotions'))
      .finally(() => setLoading(false))
  }, [user, refreshKey])

  const handleCreate = async (fields) => {
    await createPromotion(fields, token)
    setShowCreate(false)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = async (promotionID) => {
    setDeletingID(promotionID)
    try {
      await deletePromotion(promotionID, token)
      setPromotions((prev) => prev.filter((p) => p.promotionID !== promotionID))
    } catch (err) {
      setError(err.message || 'Impossible de supprimer la promotion')
    } finally {
      setDeletingID(null)
      setConfirmDeleteID(null)
    }
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Promotions</h1>
          <p className="admin-page__muted">{promotions.length} promotion{promotions.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="admin-products__header-actions">
          <button className="admin-products__new-btn" onClick={() => setShowCreate(true)}>+ Nouvelle promotion</button>
          <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
        </div>
      </div>

      {showCreate && (
        <NewPromotionModal token={token} onCreate={handleCreate} onClose={() => setShowCreate(false)} />
      )}

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Période</th>
              <th>Statut</th>
              <th>Produits</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && promotions.length === 0 && (
              <tr><td colSpan={4} className="admin-page__muted admin-orders__empty">Aucune promotion pour le moment.</td></tr>
            )}
            {!loading && promotions.map((promo) => (
              <tr key={promo.promotionID}>
                <td>{formatDate(promo.startDate)} → {formatDate(promo.endDate)}</td>
                <td>
                  <span className={`admin-orders__badge ${isActive(promo) ? 'admin-orders__badge--done' : ''}`}>
                    {isActive(promo) ? 'Active' : new Date(promo.startDate) > new Date() ? 'À venir' : 'Terminée'}
                  </span>
                </td>
                <td className="admin-page__muted">{promo.productCount} produit{promo.productCount > 1 ? 's' : ''}</td>
                <td className="admin-products__actions">
                  {confirmDeleteID === promo.promotionID ? (
                    <div className="admin-products__confirm">
                      <span>Supprimer ?</span>
                      <button
                        className="admin-products__confirm-yes"
                        disabled={deletingID === promo.promotionID}
                        onClick={() => handleDelete(promo.promotionID)}
                      >
                        Oui
                      </button>
                      <button className="admin-products__confirm-no" onClick={() => setConfirmDeleteID(null)}>Non</button>
                    </div>
                  ) : (
                    <button className="admin-orders__toggle" onClick={() => setConfirmDeleteID(promo.promotionID)}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
