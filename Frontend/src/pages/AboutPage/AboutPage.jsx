import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../api/products'
import { getStores } from '../../api/stores'
import { categories } from '../../data/mockData'
import imgStory from '../../assets/images/art-africain.webp'
import './AboutPage.css'

const VALUES = [
  {
    icon: '🌍',
    title: 'Authenticité',
    text: "Des pièces sourcées pour leur caractère réel — artisanat, tissus wax, bijoux et objets qui racontent une histoire, pas des copies génériques.",
  },
  {
    icon: '✅',
    title: 'Qualité contrôlée',
    text: "Chaque produit du catalogue est décrit avec ses vraies caractéristiques — matière, origine, dimensions — pour que vous sachiez exactement ce que vous achetez.",
  },
  {
    icon: '📍',
    title: 'Proximité',
    text: 'Des boutiques physiques réparties dans plusieurs communes, en plus de la livraison, pour rester proches de nos clients.',
  },
  {
    icon: '💬',
    title: 'Service client',
    text: 'Une équipe disponible pour suivre votre commande, du panier jusqu’à la livraison.',
  },
]

export default function AboutPage() {
  const [stats, setStats] = useState({ products: null, stores: null, deals: null })

  useEffect(() => {
    let cancelled = false

    getProducts({ limit: 1 })
      .then((data) => { if (!cancelled) setStats((s) => ({ ...s, products: data.total })) })
      .catch(() => {})

    getProducts({ onDeal: true, limit: 1 })
      .then((data) => { if (!cancelled) setStats((s) => ({ ...s, deals: data.total })) })
      .catch(() => {})

    getStores()
      .then((data) => { if (!cancelled) setStats((s) => ({ ...s, stores: data.length })) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [])

  const categoryCount = categories.filter((c) => c.id !== 'all').length

  const statCards = [
    { label: 'Produits au catalogue', value: stats.products },
    { label: 'Catégories', value: categoryCount },
    { label: 'Boutiques', value: stats.stores },
    { label: 'Offres en promotion', value: stats.deals },
  ]

  return (
    <main className="about-page">
      <div className="about-page__banner">
        <span className="about-page__eyebrow">Notre histoire</span>
        <h1>À propos de SBO</h1>
        <p>Une sélection de produits authentiques, pensée pour vous rapprocher du meilleur du commerce local.</p>
      </div>

      <section className="about-page__story">
        <div className="about-page__story-media">
          <img src={imgStory} alt="Artisanat africain SBO" />
        </div>
        <div className="about-page__story-text">
          <span className="about-page__eyebrow about-page__eyebrow--dark">Notre mission</span>
          <h2>Rapprocher les acheteurs des meilleurs produits</h2>
          <p>
            SBO (Small Business Operations) est une plateforme de vente en ligne qui réunit un large
            catalogue de produits — mode, bijoux, art, maison, artisanat — aux côtés de boutiques
            physiques dans plusieurs communes. Notre objectif est simple&nbsp;: rendre le commerce
            local accessible en ligne, avec des fiches produits précises et des prix transparents.
          </p>
          <p>
            Que vous achetiez en ligne ou en boutique, l'expérience SBO reste la même&nbsp;: un
            catalogue riche, des informations fiables sur chaque article, et un service qui suit
            votre commande jusqu'au bout.
          </p>
          <Link to="/products" className="about-page__cta">
            Découvrir le catalogue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </section>

      <section className="about-page__stats">
        {statCards.map((stat) => (
          <div key={stat.label} className="about-stat">
            <span className="about-stat__value">
              {stat.value === null ? '—' : stat.value.toLocaleString('fr-FR')}
            </span>
            <span className="about-stat__label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="about-page__values">
        <div className="about-page__values-head">
          <span className="about-page__eyebrow about-page__eyebrow--dark">Nos valeurs</span>
          <h2>Ce qui nous distingue</h2>
        </div>
        <div className="about-page__values-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="about-value-card">
              <span className="about-value-card__icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-page__stores-teaser">
        <div className="about-page__stores-teaser-inner">
          <div>
            <h2>Retrouvez-nous aussi en boutique</h2>
            <p>Nos points de vente sont ouverts dans plusieurs communes — venez toucher les produits avant d'acheter.</p>
          </div>
          <Link to="/stores" className="about-page__cta about-page__cta--light">
            Voir nos boutiques
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </section>
    </main>
  )
}
