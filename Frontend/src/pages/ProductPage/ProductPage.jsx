import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, getProducts, productImageUrl } from '../../api/products'
import ProductCard from '../../components/ProductCard/ProductCard'
import ProductReviews from '../../components/ProductReviews/ProductReviews'
import { useCart } from '../../context/CartContext'
import { generateProductPitch } from '../../utils/productPitch'
import './ProductPage.css'

function formatPrice(value) {
  const n = Number(value)
  if (!value || Number.isNaN(n) || n <= 0) return null
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

/** Splits a free-text description into an intro paragraph + "Label: value" spec rows. */
function parseDescription(text) {
  if (!text) return { intro: '', specs: [] }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const intro = []
  const specs = []
  for (const line of lines) {
    const m = line.match(/^([^:]{2,32}):\s*(.+)$/)
    if (m && m[2] !== '-') specs.push({ label: m[1].trim(), value: m[2].trim() })
    else if (!m) intro.push(line)
  }
  return { intro: intro.join(' '), specs }
}

const ATTRIBUTES = [
  ['Marque', (p) => p.brandName],
  ['Type', (p) => p.productTypeName],
  ['Gamme', (p) => p.productLineName],
  ['Fabriqué en', (p) => p.madeIn],
  ['Couleur', (p) => p.color],
  ['Matière', (p) => p.rawMaterial],
  ['Poids', (p) => (p.weight ? `${p.weight} kg` : null)],
  ['Volume', (p) => (p.volume ? `${p.volume} L` : null)],
  ['Dimensions', (p) =>
    p.length || p.width || p.height
      ? `${p.length || '?'} × ${p.width || '?'} × ${p.height || '?'} cm`
      : null],
]

export default function ProductPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setImgFailed(false)
    setQty(1)
    window.scrollTo(0, 0)

    getProduct(id)
      .then((data) => {
        if (!active) return
        setProduct(data)
        if (data.productLineID) {
          getProducts({ productLineIDs: [data.productLineID], limit: 6 })
            .then((res) => {
              if (active) setRelated(res.products.filter((p) => p.productID !== data.productID).slice(0, 5))
            })
            .catch(() => {})
        }
      })
      .catch((err) => active && setError(err.message || 'Produit introuvable'))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [id])

  const { intro, specs } = useMemo(
    () => parseDescription(product?.description),
    [product]
  )

  const pitch = useMemo(() => generateProductPitch(product), [product])

  const refetchProduct = () => {
    getProduct(id).then(setProduct).catch(() => {})
  }

  const handleAddToCart = async () => {
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
    try {
      await addItem(product, qty)
    } catch {
      setAdded(false)
    }
  }

  if (loading) {
    return (
      <main className="product-page">
        <div className="product-page__inner product-page__inner--loading">
          <div className="product-page__gallery-skeleton" />
          <div className="product-page__info-skeleton">
            <span /><span /><span /><span />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="product-page">
        <div className="product-page__error">
          <span className="product-page__error-icon">🔍</span>
          <h1>Produit introuvable</h1>
          <p>{error}</p>
          <Link to="/" className="product-page__back-home">Retour à l'accueil</Link>
        </div>
      </main>
    )
  }

  const hasDeal = product.dealCurrentPrice != null && Number(product.dealCurrentPrice) > 0
  const price = hasDeal ? formatPrice(product.dealCurrentPrice) : formatPrice(product.sellUnitPrice)
  const oldPrice = hasDeal ? formatPrice(product.dealPreviousPrice) : null
  const discountPct = hasDeal && product.dealRebate ? Math.round(Number(product.dealRebate) * 100) : null
  const attributeRows = ATTRIBUTES
    .map(([label, get]) => [label, get(product)])
    .filter(([, value]) => value)

  return (
    <main className="product-page">
      <nav className="product-page__breadcrumb">
        <Link to="/">Accueil</Link>
        <span>/</span>
        {product.productLineName && <span>{product.productLineName}</span>}
        <span>/</span>
        <span className="product-page__breadcrumb-current">{product.name}</span>
      </nav>

      <div className="product-page__inner">
        <div className="product-page__gallery">
          {product.hasImage && !imgFailed ? (
            <img
              src={productImageUrl(product.productID)}
              alt={product.name}
              className="product-page__image"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="product-page__image-placeholder">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}
          {product.hasVideo && (
            <span className="product-page__video-badge">▶ Vidéo disponible</span>
          )}
        </div>

        <div className="product-page__info">
          {product.productTypeName && (
            <span className="product-page__tag">{product.productTypeName}</span>
          )}
          <h1 className="product-page__title">{product.name}</h1>

          <div className="product-page__price">
            {price ? (
              <>
                <span className="product-page__price-main">{price}</span>
                {oldPrice && <span className="product-page__price-old">{oldPrice}</span>}
                {discountPct && <span className="product-page__price-badge">-{discountPct}%</span>}
              </>
            ) : (
              <span className="product-page__price-main">Prix sur demande</span>
            )}
          </div>

          {pitch && (
            <div className="product-page__pitch">
              <span className="product-page__pitch-eyebrow">Coup de cœur</span>
              <p>{pitch}</p>
            </div>
          )}

          {intro && <p className="product-page__desc">{intro}</p>}

          {attributeRows.length > 0 && (
            <dl className="product-page__attrs">
              {attributeRows.map(([label, value]) => (
                <div key={label} className="product-page__attr">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="product-page__actions">
            <div className="product-page__qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Augmenter">+</button>
            </div>
            <button
              className={`product-page__add ${added ? 'product-page__add--done' : ''}`}
              onClick={handleAddToCart}
            >
              {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
            </button>
          </div>

          {specs.length > 0 && (
            <div className="product-page__specs">
              <h2>Caractéristiques</h2>
              <table>
                <tbody>
                  {specs.map((s, i) => (
                    <tr key={i}>
                      <th>{s.label}</th>
                      <td>{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ProductReviews product={product} onReviewAdded={refetchProduct} />

      {related.length > 0 && (
        <section className="product-page__related">
          <h2>Produits similaires</h2>
          <div className="product-page__related-grid">
            {related.map((p) => (
              <ProductCard key={p.productID} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
