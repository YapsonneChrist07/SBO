import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { count: cartCount } = useCart()
  const { count: wishlistCount } = useWishlist()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isPartner = user?.role === 'supplier' || user?.role === 'transporter'
  // Only the shop home page has the hero video the transparent navbar sits over.
  const overHero = isHome && !isPartner
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => (
    path === '/' ? isHome : location.pathname === path || location.pathname.startsWith(`${path}/`)
  )
  const linkClass = (path) => `navbar__link${isActive(path) ? ' active' : ''}`

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Lock page scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const term = searchTerm.trim()
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : '/products')
    setSearchOpen(false)
    setSearchTerm('')
  }

  const opaque = scrolled || !overHero || menuOpen

  const navLinks = user?.role === 'supplier' ? (
    <>
      <li><Link to="/" className={linkClass('/')}>Mon espace</Link></li>
      <li><Link to="/supplier/products" className={linkClass('/supplier/products')}>Mes produits</Link></li>
      <li><Link to="/supplier/orders" className={linkClass('/supplier/orders')}>Commandes</Link></li>
      <li><Link to="/supplier/reviews" className={linkClass('/supplier/reviews')}>Avis</Link></li>
      <li><Link to="/products" className={linkClass('/products')}>Catalogue SBO</Link></li>
    </>
  ) : (
    <>
      <li><Link to="/" className={linkClass('/')}>Home</Link></li>
      <li><Link to="/products" className={linkClass('/products')}>Products</Link></li>
      <li><Link to="/stores" className={linkClass('/stores')}>Stores</Link></li>
      <li><Link to="/deals" className={linkClass('/deals')}>Deals</Link></li>
      <li><Link to="/about" className={linkClass('/about')}>About</Link></li>
      {user?.adminEntity && <li><Link to="/admin" className={linkClass('/admin')}>Dashboard</Link></li>}
    </>
  )

  const authControls = user ? (
    <div className="navbar__user">
      <Link to="/account" className="navbar__user-name">Bonjour, {user.firstName}</Link>
      <button className="navbar__btn navbar__btn--ghost" onClick={handleLogout}>Déconnexion</button>
    </div>
  ) : (
    <>
      <Link to="/login" className="navbar__btn navbar__btn--ghost">Login</Link>
      <Link to="/register" className="navbar__btn navbar__btn--primary">Sign Up</Link>
    </>
  )

  return (
    <>
    <nav className={`navbar ${opaque ? 'navbar--scrolled' : ''} ${menuOpen ? 'navbar--menu-open' : ''}`}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-s">S</span>BO
          <span className="navbar__logo-dot">.</span>
        </Link>

        <ul className="navbar__links">
          {navLinks}
        </ul>

        <div className="navbar__actions">
          {searchOpen ? (
            <form className="navbar__search-form" onSubmit={handleSearchSubmit}>
              <input
                ref={searchInputRef}
                type="text"
                className="navbar__search-input"
                placeholder="Rechercher un produit…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={() => { if (!searchTerm) setSearchOpen(false) }}
              />
              <button type="submit" className="navbar__search-submit" aria-label="Rechercher">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </form>
          ) : (
            <button className="navbar__icon-btn" title="Rechercher" onClick={() => setSearchOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}
          {!isPartner && <>
          <Link to="/wishlist" className="navbar__icon-btn navbar__cart" title="Liste de souhaits">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlistCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {wishlistCount > 0 && <span className="navbar__cart-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/cart" className="navbar__icon-btn navbar__cart" title="Panier">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartCount > 0 && <span className="navbar__cart-badge">{cartCount}</span>}
          </Link>
          </>}

          <div className="navbar__auth-desktop">
            {authControls}
          </div>

          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            <span className={`navbar__hamburger-line ${menuOpen ? 'navbar__hamburger-line--top' : ''}`} />
            <span className={`navbar__hamburger-line ${menuOpen ? 'navbar__hamburger-line--hide' : ''}`} />
            <span className={`navbar__hamburger-line ${menuOpen ? 'navbar__hamburger-line--bottom' : ''}`} />
          </button>
        </div>
      </div>
    </nav>

    {/*
      Rendered as a sibling of <nav>, not a descendant: when the navbar is opaque/scrolled
      it uses backdrop-filter, which (like transform/filter) creates a new containing block
      for position:fixed descendants — a fixed child would then size itself against the
      70px-tall navbar box instead of the viewport, collapsing this overlay to zero height.
    */}
    <div className={`navbar__mobile-panel ${menuOpen ? 'navbar__mobile-panel--open' : ''}`}>
      <ul className="navbar__mobile-links">
        {navLinks}
      </ul>
      <div className="navbar__mobile-auth">
        {authControls}
      </div>
    </div>

    {menuOpen && <div className="navbar__backdrop" onClick={() => setMenuOpen(false)} />}
    </>
  )
}
