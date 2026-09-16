import React from 'react'
import { useNavigate } from 'react-router-dom'
import { categories } from '../../data/mockData'
import './Sidebar.css'

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return n
}

export default function Sidebar({ activeCategory, onSelect }) {
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </span>
        Catégories
      </div>

      <ul className="sidebar__list">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <li key={cat.id}>
              <button
                className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                onClick={() => onSelect(cat.id)}
              >
                <span className="sidebar__icon">{cat.icon}</span>
                <span className="sidebar__label">{cat.label}</span>
                <span className={`sidebar__count ${isActive ? 'sidebar__count--active' : ''}`}>
                  {formatCount(cat.count)}
                </span>
                {isActive && <span className="sidebar__active-bar" />}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar__promo">
        <div className="sidebar__promo-glow" />
        <p className="sidebar__promo-tag">Offre du moment</p>
        <p className="sidebar__promo-title">-5% de réduction</p>
        <p className="sidebar__promo-sub">sur une sélection d'articles</p>
        <button className="sidebar__promo-btn" onClick={() => navigate('/deals')}>Voir les Deals</button>
      </div>
    </aside>
  )
}
