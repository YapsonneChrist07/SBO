import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getSupplierReviews } from '../../api/supplierPortal'
import '../AdminPage/AdminPage.css'
import '../SupplierProductsPage/SupplierPages.css'

const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

export default function SupplierReviewsPage() {
  const allowed = useRequireRole('supplier')
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed) return
    getSupplierReviews(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Impossible de charger les avis'))
  }, [allowed, token])

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Avis & évaluation</h1>
          <p className="admin-page__muted">Ce que SBO pense de votre entreprise</p>
        </div>
        <Link to="/" className="admin-page__back">Mon espace</Link>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}
      {!data && !error && <p className="admin-page__muted">Chargement…</p>}

      {data && data.total === 0 && (
        <section className="admin-panel">
          <p className="admin-page__muted">
            Vous n’avez pas encore reçu d’évaluation. SBO évalue ses fournisseurs après leurs premières livraisons.
          </p>
        </section>
      )}

      {data && data.total > 0 && (
        <>
          <section className="admin-panel">
            <div className="supplier-reviews__summary">
              <div>
                <div className="supplier-reviews__average">{data.averageRating.toFixed(1)}</div>
                <div className="supplier-reviews__stars" aria-hidden="true">{stars(data.averageRating)}</div>
                <div className="admin-page__muted">{data.total} avis</div>
              </div>
              <div className="supplier-reviews__bars">
                {data.distribution.map((d) => (
                  <div key={d.stars} className="supplier-reviews__bar">
                    <span>{d.stars} ★</span>
                    <div className="supplier-reviews__track">
                      <div className="supplier-reviews__fill" style={{ width: `${(d.count / data.total) * 100}%` }} />
                    </div>
                    <span>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-panel" style={{ marginTop: '1.5rem' }}>
            <h2>Tous les avis</h2>
            <ul className="supplier-reviews__list">
              {data.reviews.map((r) => (
                <li key={r.supplierReviewID}>
                  <div className="supplier-reviews__meta">
                    <span>
                      <span className="supplier-reviews__stars" aria-label={`${r.ratingValue} sur 5`}>{stars(r.ratingValue)}</span>
                      {' '}<strong>{r.firstName ? `${r.firstName} ${r.lastInitial || ''}.` : 'SBO'}</strong>
                    </span>
                    <span className="admin-page__muted">
                      {r.evaluatedDate && new Date(r.evaluatedDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {r.reviewMessage && <p>{r.reviewMessage}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
