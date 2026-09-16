import React from 'react'
import imgFemmes  from '../../assets/images/vetement-femmes.avif'
import imgArt     from '../../assets/images/art-africain.webp'
import imgBijoux  from '../../assets/images/bijoux.avif'
import imgMaison  from '../../assets/images/maison-decor.avif'
import imgSacs    from '../../assets/images/sacs.avif'
import imgTissus  from '../../assets/images/pagnes.avif'
import './FeaturedCategories.css'

const featured = [
  { id: 'femmes', label: 'Vêtements Femmes',   sub: '1 026 articles', image: imgFemmes },
  { id: 'art',    label: 'Art Africain',        sub: '523 articles',   image: imgArt    },
  { id: 'bijoux', label: 'Bijoux',              sub: '1 022 articles', image: imgBijoux },
  { id: 'maison', label: 'Maison & Décor',      sub: '560 articles',   image: imgMaison },
  { id: 'sacs',   label: 'Sacs & Maroquinerie', sub: '422 articles',   image: imgSacs   },
  { id: 'tissus', label: 'Tissus & Pagnes',     sub: '305 articles',   image: imgTissus },
]

export default function FeaturedCategories({ onSelectCategory }) {
  return (
    <section className="feat-cats">
      <div className="feat-cats__inner">
        <div className="feat-cats__head">
          <div className="feat-cats__head-left">
            <span className="feat-cats__eyebrow">Explorer</span>
            <h2 className="feat-cats__title">Nos Catégories Phares</h2>
          </div>
          <button className="feat-cats__see-all" onClick={() => onSelectCategory('all')}>
            Tout voir
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        <div className="feat-cats__grid">
          {featured.map((cat) => (
            <button
              key={cat.id}
              className="feat-cat-card"
              onClick={() => onSelectCategory(cat.id)}
            >
              <img src={cat.image} alt={cat.label} className="feat-cat-card__img" />
              <div className="feat-cat-card__overlay" />
              <div className="feat-cat-card__text">
                <span className="feat-cat-card__name">{cat.label}</span>
                <span className="feat-cat-card__sub">{cat.sub}</span>
              </div>
              <span className="feat-cat-card__arrow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
