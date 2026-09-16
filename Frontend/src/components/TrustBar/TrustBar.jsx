import React from 'react'
import './TrustBar.css'

const items = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    value: '5 378',
    label: 'Produits disponibles',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 5v3h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    value: 'Livraison',
    label: 'Rapide & sécurisée',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    value: 'Paiement',
    label: '100% sécurisé',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.82 19a19.5 19.5 0 01-5.86-5.86A19.79 19.79 0 013.08 4.18 2 2 0 015.06 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 9.91a16 16 0 006.29 6.29l.91-.91a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.92z"/>
      </svg>
    ),
    value: 'Support',
    label: '7j/7 — 24h/24',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    value: '4.8 / 5',
    label: 'Satisfaction client',
  },
]

export default function TrustBar() {
  return (
    <section className="trust-bar">
      <div className="trust-bar__inner">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <div className="trust-bar__item">
              <span className="trust-bar__icon">{item.icon}</span>
              <div className="trust-bar__text">
                <span className="trust-bar__value">{item.value}</span>
                <span className="trust-bar__label">{item.label}</span>
              </div>
            </div>
            {i < items.length - 1 && <div className="trust-bar__divider" />}
          </React.Fragment>
        ))}
      </div>
    </section>
  )
}
