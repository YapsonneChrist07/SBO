import React, { useEffect, useState } from 'react'
import { getRecentReviews } from '../../api/reviews'
import './Testimonials.css'

const AVATAR_COLORS = ['#6B21A8', '#0D5FA6', '#065F46', '#B45309', '#9D174D', '#1D4ED8']

function avatarColor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function Stars({ count }) {
  const rounded = Math.round(count)
  return (
    <span className="testimonial__stars">
      {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
    </span>
  )
}

export default function Testimonials() {
  const [data, setData] = useState(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    getRecentReviews(6).then(setData).catch(() => setData(null))
  }, [])

  if (!data || data.count === 0) return null

  const { count, average, distribution, reviews } = data
  const showDistribution = count >= 5

  return (
    <section className="testimonials">
      <div className="testimonials__inner">
        <div className="testimonials__head">
          <span className="testimonials__eyebrow">Témoignages</span>
          <h2 className="testimonials__title">Ce que disent nos clients</h2>
          <p className="testimonials__sub">
            {count} avis vérifié{count > 1 ? 's' : ''} · note moyenne {average.toFixed(1)}/5
          </p>
        </div>

        <div className="testimonials__cards">
          {reviews.map((r, i) => (
            <div
              key={r.productReviewID}
              className={`testimonial-card ${i === active ? 'testimonial-card--featured' : ''}`}
              onClick={() => setActive(i)}
            >
              <div className="testimonial-card__top">
                <div className="testimonial-card__avatar" style={{ background: avatarColor(r.productReviewID) }}>
                  {(r.firstName?.[0] || '?')}{(r.lastName?.[0] || '')}
                </div>
                <div className="testimonial-card__meta">
                  <span className="testimonial-card__name">
                    {r.firstName || 'Client'} {r.lastName ? `${r.lastName[0]}.` : ''}
                  </span>
                </div>
                <div className="testimonial-card__quote-icon">"</div>
              </div>

              <Stars count={r.ratingValue} />

              <p className="testimonial-card__text">
                {r.reviewMessage || `A laissé ${r.ratingValue} étoile${r.ratingValue > 1 ? 's' : ''} sans commentaire.`}
              </p>

              <div className="testimonial-card__footer">
                <span className="testimonial-card__product">À propos de {r.productName}</span>
                {r.evaluatedDate && (
                  <span className="testimonial-card__date">
                    {new Date(r.evaluatedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {reviews.length > 1 && (
          <div className="testimonials__dots">
            {reviews.map((_, i) => (
              <button
                key={i}
                className={`testimonials__dot ${i === active ? 'testimonials__dot--active' : ''}`}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        )}

        <div className="testimonials__rating-bar">
          <div className="testimonials__overall">
            <span className="testimonials__overall-num">{average.toFixed(1)}</span>
            <div className="testimonials__overall-stars">
              <Stars count={average} />
              <span className="testimonials__overall-label">Basé sur {count} avis</span>
            </div>
          </div>
          {showDistribution && [5, 4, 3, 2, 1].map(star => {
            const pct = Math.round((distribution[star] / count) * 100)
            return (
              <div key={star} className="testimonials__bar-row">
                <span className="testimonials__bar-label">{star}★</span>
                <div className="testimonials__bar-track">
                  <div className="testimonials__bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="testimonials__bar-pct">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
