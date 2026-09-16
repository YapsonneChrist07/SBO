import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import heroVideo from '../../assets/videos/video1.mp4'
import { getProducts } from '../../api/products'
import { getStores } from '../../api/stores'
import { categories } from '../../data/mockData'
import './HeroVideo.css'

export default function HeroVideo() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [stats, setStats] = useState({ products: null, stores: null })

  useEffect(() => {
    let active = true
    getProducts({ limit: 1 }).then((data) => { if (active) setStats((s) => ({ ...s, products: data.total })) }).catch(() => {})
    getStores().then((data) => { if (active) setStats((s) => ({ ...s, stores: data.length })) }).catch(() => {})
    return () => { active = false }
  }, [])

  const categoryCount = categories.filter((c) => c.id !== 'all').length

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const handleShopNow = () => {
    document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="hero">
      <div className="hero__media">
        <video
          ref={videoRef}
          className={`hero__video ${videoLoaded ? 'hero__video--loaded' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          src={heroVideo}
        />
        <div className="hero__gradient-fallback" />
      </div>

      <div className="hero__overlay" />

      <div className="hero__content">
        <p className="hero__eyebrow">New Collection 2026</p>
        <h1 className="hero__title">
          Elevate Your<br />
          <span className="hero__title--accent">Every Day.</span>
        </h1>
        <p className="hero__subtitle">
          Discover premium products crafted for those who refuse to settle.
          <br />Style, quality, and innovation — all in one place.
        </p>
        <div className="hero__cta-group">
          <button className="hero__btn hero__btn--primary" onClick={handleShopNow}>
            Shop Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button className="hero__btn hero__btn--ghost" onClick={() => navigate('/deals')}>
            View Deals
          </button>
        </div>

        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-num">{stats.products != null ? `${stats.products.toLocaleString('fr-FR')}+` : '—'}</span>
            <span className="hero__stat-label">Products</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-num">{categoryCount}</span>
            <span className="hero__stat-label">Categories</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-num">{stats.stores != null ? stats.stores : '—'}</span>
            <span className="hero__stat-label">Stores</span>
          </div>
        </div>
      </div>

      <button className="hero__mute-btn" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
          </svg>
        )}
      </button>

      <div className="hero__scroll-hint">
        <div className="hero__scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  )
}
