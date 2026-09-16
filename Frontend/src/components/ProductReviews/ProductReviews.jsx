import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createProductReview } from '../../api/reviews'
import './ProductReviews.css'

function Stars({ value, size }) {
  const rounded = Math.round(value)
  return (
    <span className="pr-stars" style={size ? { fontSize: size } : undefined} aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`pr-star ${n <= rounded ? 'pr-star--filled' : ''}`}>★</span>
      ))}
    </span>
  )
}

export default function ProductReviews({ product, onReviewAdded }) {
  const { user, token } = useAuth()
  const location = useLocation()
  const reviews = product.reviews || []
  const count = reviews.length
  const average = count ? reviews.reduce((sum, r) => sum + Number(r.ratingValue), 0) / count : 0

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setError('Choisissez une note.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createProductReview(
        { productID: product.productID, ratingValue: rating, reviewMessage: message.trim() || null },
        token
      )
      setRating(0)
      setMessage('')
      setSuccess(true)
      onReviewAdded?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || "Impossible d'envoyer votre avis")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="product-reviews">
      <h2>Avis clients</h2>

      <div className="product-reviews__summary">
        {count > 0 ? (
          <>
            <Stars value={average} size="1.3rem" />
            <span className="product-reviews__avg">{average.toFixed(1)} / 5</span>
            <span className="product-reviews__count">{count} avis</span>
          </>
        ) : (
          <p className="product-reviews__empty">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="product-reviews__list">
          {reviews.map((r) => (
            <li key={r.productReviewID}>
              <div className="product-reviews__item-head">
                <Stars value={Number(r.ratingValue)} />
                <span className="product-reviews__author">
                  {r.firstName || 'Client'} {r.lastName ? `${r.lastName[0]}.` : ''}
                </span>
                {r.evaluatedDate && (
                  <span className="product-reviews__date">
                    {new Date(r.evaluatedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
              {r.reviewMessage && <p className="product-reviews__message">{r.reviewMessage}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="product-reviews__form-wrap">
        {user ? (
          <form onSubmit={handleSubmit} className="product-reviews__form">
            <h3>Laisser un avis</h3>
            <div className="product-reviews__picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`product-reviews__picker-star ${n <= (hoverRating || rating) ? 'product-reviews__picker-star--active' : ''}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Votre avis (optionnel)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            {error && <p className="product-reviews__error">{error}</p>}
            {success && <p className="product-reviews__success">Merci pour votre avis !</p>}
            <button type="submit" className="product-reviews__submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer mon avis'}
            </button>
          </form>
        ) : (
          <p className="product-reviews__login-prompt">
            <Link to="/login" state={{ from: location.pathname }}>Connectez-vous</Link> pour laisser un avis.
          </p>
        )}
      </div>
    </section>
  )
}
