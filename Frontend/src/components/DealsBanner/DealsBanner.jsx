import React from 'react'
import { useNavigate } from 'react-router-dom'
import './DealsBanner.css'

export default function DealsBanner() {
  const navigate = useNavigate()

  return (
    <section className="deals-banner">
      <div className="deals-banner__bg-pattern" />

      <div className="deals-banner__inner">
        <div className="deals-banner__left">
          <p className="deals-banner__eyebrow">⚡ Offres Flash</p>
          <h2 className="deals-banner__title">
            <span className="deals-banner__percent">-5%</span> de réduction
          </h2>
          <p className="deals-banner__sub">
            Sur une sélection exclusive de vêtements, bijoux et art africain.
            <br />Ne manquez pas ces prix exceptionnels !
          </p>
          <button className="deals-banner__btn" onClick={() => navigate('/deals')}>
            Voir toutes les offres
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        <div className="deals-banner__right">
          <div className="deals-banner__tags">
            {['Wax & Pagnes', 'Bijoux', 'Art Africain', 'Maison'].map(tag => (
              <span key={tag} className="deals-banner__tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
