import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import {
  getSupplierProduct,
  saveSupplierProduct,
  removeSupplierProduct,
  setShopPrice,
  removeShopPrice,
} from '../../api/supplierPortal'
import { productImageUrl } from '../../api/products'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function ShopPriceCell({ productID, location, token, onChange, onError }) {
  const saved = location.supplierAreaUnitPrice
  const [value, setValue] = useState(saved ?? '')
  const [busy, setBusy] = useState(false)
  const dirty = String(value) !== String(saved ?? '')

  const save = async () => {
    const num = Number(value)
    if (value === '' || Number.isNaN(num) || num < 0) { onError('Prix invalide.'); return }
    setBusy(true)
    try {
      await setShopPrice(productID, location.locationID, num, token)
      onChange(location.locationID, num)
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await removeShopPrice(productID, location.locationID, token)
      setValue('')
      onChange(location.locationID, null)
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="supplier-shop-price">
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Prix unique"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save() }}
        aria-label={`Prix pour ${location.locationName}`}
      />
      <button type="button" onClick={save} disabled={busy || !dirty || value === ''}>Enregistrer</button>
      {saved != null && (
        <button type="button" onClick={clear} disabled={busy}>Retirer</button>
      )}
    </div>
  )
}

export default function SupplierProductDetailPage() {
  const allowed = useRequireRole('supplier')
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [code, setCode] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [shopError, setShopError] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    getSupplierProduct(id, token)
      .then((data) => {
        setProduct(data)
        setCode(data.supplierProductCode || '')
        setPrice(data.supplierUnitPrice ?? '')
      })
      .catch((err) => setError(err.message || 'Produit introuvable'))
      .finally(() => setLoading(false))
  }, [allowed, id, token])

  const handleSave = async (e) => {
    e.preventDefault()
    const num = Number(price)
    if (price === '' || Number.isNaN(num) || num < 0) {
      setStatus({ error: true, text: 'Indiquez un prix unitaire valide.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      await saveSupplierProduct(id, { supplierProductCode: code.trim(), supplierUnitPrice: num }, token)
      setProduct((p) => ({ ...p, supplierProductCode: code.trim() || null, supplierUnitPrice: num }))
      setStatus({ error: false, text: 'Modifications enregistrées.' })
    } catch (err) {
      setStatus({ error: true, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    try {
      await removeSupplierProduct(id, token)
      navigate('/supplier/products', { replace: true })
    } catch (err) {
      setStatus({ error: true, text: err.message })
      setConfirmingRemove(false)
    }
  }

  const handleShopPriceChange = (locationID, value) => {
    setShopError(null)
    setProduct((p) => ({
      ...p,
      locations: p.locations.map((l) => (l.locationID === locationID ? { ...l, supplierAreaUnitPrice: value } : l)),
    }))
  }

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>{product?.name?.trim() || 'Produit'}</h1>
          {product && <p className="admin-page__muted">Prix de vente SBO : {formatPriceOrTBD(product.sellUnitPrice)}</p>}
        </div>
        <Link to="/supplier/products" className="admin-page__back">Mes produits</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && product && (
        <div className="supplier-product__layout">
          <section className="admin-panel">
            {product.hasImage && !imgFailed && (
              <img
                className="supplier-product__image"
                src={productImageUrl(product.productID)}
                alt={product.name}
                onError={() => setImgFailed(true)}
              />
            )}
            <h2>Votre offre</h2>
            <form className="supplier-form" onSubmit={handleSave}>
              <label>
                Votre code produit
                <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={15} placeholder="Facultatif" />
              </label>
              <label>
                Votre prix unitaire *
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              {status && (
                <p className={`supplier-form__status ${status.error ? 'supplier-form__status--error' : ''}`}>{status.text}</p>
              )}
              <div className="supplier-page__actions" style={{ justifyContent: 'flex-start' }}>
                <button type="submit" className="supplier-page__primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {confirmingRemove ? (
                  <>
                    <button type="button" className="supplier-page__danger" onClick={handleRemove}>Confirmer le retrait</button>
                    <button type="button" className="admin-page__back" onClick={() => setConfirmingRemove(false)}>Annuler</button>
                  </>
                ) : (
                  <button type="button" className="supplier-page__danger" onClick={() => setConfirmingRemove(true)}>
                    Retirer de mon catalogue
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <h2>Prix par boutique SBO</h2>
            <p className="supplier-page__notice">
              Si votre prix varie selon la boutique livrée (transport, quantités…), indiquez-le ici.
              Sans prix spécifique, votre prix unitaire ({formatPriceOrTBD(product.supplierUnitPrice)}) s’applique.
            </p>
            {shopError && <p className="supplier-form__status supplier-form__status--error">{shopError}</p>}
            <div className="admin-orders__table-wrap">
              <table className="admin-orders__table">
                <thead>
                  <tr>
                    <th>Boutique</th>
                    <th>Votre prix pour cette boutique</th>
                  </tr>
                </thead>
                <tbody>
                  {product.locations.map((location) => (
                    <tr key={location.locationID}>
                      <td>
                        <strong>{location.locationName}</strong>
                        {location.cityName && <div className="admin-page__muted">{location.cityName}</div>}
                      </td>
                      <td>
                        <ShopPriceCell
                          productID={product.productID}
                          location={location}
                          token={token}
                          onChange={handleShopPriceChange}
                          onError={setShopError}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
