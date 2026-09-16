import React, { useState } from 'react'
import './Testimonials.css'

const reviews = [
  {
    id: 1,
    name: 'Aminata Diallo',
    location: 'Douala, Cameroun',
    initials: 'AD',
    color: '#6B21A8',
    rating: 5,
    date: 'Il y a 2 jours',
    text: 'Qualité exceptionnelle ! J\'ai commandé une robe en Wax et elle est magnifique. La livraison était rapide et l\'emballage soigné. Je recommande vivement !',
    product: 'Robe imprimée Wax',
  },
  {
    id: 2,
    name: 'Jean-Baptiste Mbeki',
    location: 'Yaoundé, Cameroun',
    initials: 'JM',
    color: '#0D5FA6',
    rating: 5,
    date: 'Il y a 5 jours',
    text: 'Le masque africain que j\'ai reçu est une véritable œuvre d\'art. Sculpté à la main, les détails sont incroyables. Mon salon a une âme africaine maintenant.',
    product: 'Masque africain sculpté',
  },
  {
    id: 3,
    name: 'Fatou Ndoye',
    location: 'Abidjan, Côte d\'Ivoire',
    initials: 'FN',
    color: '#065F46',
    rating: 5,
    date: 'Il y a 1 semaine',
    text: 'Les bijoux sont splendides et exactement comme sur les photos. Le service client est très réactif — ils ont répondu à mes questions en moins d\'une heure !',
    product: 'Collier de perles doré',
  },
]

function Stars({ count }) {
  return (
    <span className="testimonial__stars">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  )
}

export default function Testimonials() {
  const [active, setActive] = useState(0)

  return (
    <section className="testimonials">
      <div className="testimonials__inner">
        <div className="testimonials__head">
          <span className="testimonials__eyebrow">Témoignages</span>
          <h2 className="testimonials__title">Ce que disent nos clients</h2>
          <p className="testimonials__sub">
            Plus de 12 000 clients satisfaits à travers l'Afrique et au-delà.
          </p>
        </div>

        <div className="testimonials__cards">
          {reviews.map((r, i) => (
            <div
              key={r.id}
              className={`testimonial-card ${i === active ? 'testimonial-card--featured' : ''}`}
              onClick={() => setActive(i)}
            >
              <div className="testimonial-card__top">
                <div className="testimonial-card__avatar" style={{ background: r.color }}>
                  {r.initials}
                </div>
                <div className="testimonial-card__meta">
                  <span className="testimonial-card__name">{r.name}</span>
                  <span className="testimonial-card__location">{r.location}</span>
                </div>
                <div className="testimonial-card__quote-icon">"</div>
              </div>

              <Stars count={r.rating} />

              <p className="testimonial-card__text">{r.text}</p>

              <div className="testimonial-card__footer">
                <span className="testimonial-card__product">✓ Achat vérifié · {r.product}</span>
                <span className="testimonial-card__date">{r.date}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="testimonials__dots">
          {reviews.map((_, i) => (
            <button
              key={i}
              className={`testimonials__dot ${i === active ? 'testimonials__dot--active' : ''}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>

        <div className="testimonials__rating-bar">
          <div className="testimonials__overall">
            <span className="testimonials__overall-num">4.8</span>
            <div className="testimonials__overall-stars">
              <Stars count={5} />
              <span className="testimonials__overall-label">Basé sur 2 400+ avis</span>
            </div>
          </div>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="testimonials__bar-row">
              <span className="testimonials__bar-label">{star}★</span>
              <div className="testimonials__bar-track">
                <div
                  className="testimonials__bar-fill"
                  style={{ width: `${[82, 12, 4, 1, 1][5 - star]}%` }}
                />
              </div>
              <span className="testimonials__bar-pct">{[82, 12, 4, 1, 1][5 - star]}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
