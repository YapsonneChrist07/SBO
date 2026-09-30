import React, { useState } from 'react'
import { getProducts } from '../../api/products'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminProductsPage/NewProductModal.css'
import './NewPromotionModal.css'

function todayPlus(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function NewPromotionModal({ token, onCreate, onClose }) {
  const [startDate, setStartDate] = useState(todayPlus(0))
  const [endDate, setEndDate] = useState(todayPlus(14))
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const runSearch = async (e) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    setSearching(true)
    try {
      const data = await getProducts({ search: searchInput.trim(), limit: 8 })
      setSearchResults(data.products.filter((p) => !items.some((it) => it.productID === p.productID)))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const addItem = (product) => {
    const previousPrice = product.sellUnitPrice ?? 0
    setItems((prev) => [...prev, {
      productID: product.productID,
      name: product.name,
      previousPrice,
      currentPrice: previousPrice,
    }])
    setSearchResults((prev) => prev.filter((p) => p.productID !== product.productID))
  }

  const removeItem = (productID) => setItems((prev) => prev.filter((it) => it.productID !== productID))

  const updateItemPrice = (productID, currentPrice) => {
    setItems((prev) => prev.map((it) => (it.productID === productID ? { ...it, currentPrice } : it)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!startDate || !endDate) { setError('Les dates de début et de fin sont requises.'); return }
    if (new Date(endDate) <= new Date(startDate)) { setError('La date de fin doit être après la date de début.'); return }
    if (items.length === 0) { setError('Ajoutez au moins un produit à la promotion.'); return }

    const payloadItems = []
    for (const it of items) {
      const currentPrice = Number(it.currentPrice)
      const previousPrice = Number(it.previousPrice)
      if (Number.isNaN(currentPrice) || currentPrice < 0) {
        setError(`Prix promo invalide pour "${it.name}".`)
        return
      }
      // rebate is stored as a fraction (0.05 = 5% off), matching how the storefront
      // renders the deal badge (Math.round(rebate * 100)) — not a currency amount.
      const rebate = previousPrice > 0 ? Math.max(0, (previousPrice - currentPrice) / previousPrice) : 0
      payloadItems.push({
        productID: it.productID,
        previousPrice,
        currentPrice,
        rebate,
      })
    }

    setSaving(true)
    setError(null)
    try {
      await onCreate({ startDate, endDate, items: payloadItems })
    } catch (err) {
      setError(err.message || 'Impossible de créer la promotion')
      setSaving(false)
    }
  }

  return (
    <div className="np-modal__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="np-modal np-modal--wide">
        <div className="np-modal__head">
          <h2>Nouvelle promotion</h2>
          <button type="button" className="np-modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="np-modal__form">
          <label className="np-modal__field">
            <span>Début *</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          <label className="np-modal__field">
            <span>Fin *</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>

          <div className="np-modal__field np-modal__field--full">
            <span>Ajouter un produit</span>
            <div className="promo-search">
              <input
                type="text"
                placeholder="Rechercher un produit…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(e) }}
              />
              <button type="button" onClick={runSearch} disabled={searching}>Rechercher</button>
            </div>
            {searchResults.length > 0 && (
              <ul className="promo-search__results">
                {searchResults.map((p) => (
                  <li key={p.productID}>
                    <span>{p.name}</span>
                    <span className="admin-page__muted">{formatPriceOrTBD(p.sellUnitPrice)}</span>
                    <button type="button" onClick={() => addItem(p)}>+ Ajouter</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="np-modal__field np-modal__field--full">
            <span>Produits en promotion ({items.length})</span>
            {items.length === 0 ? (
              <p className="admin-page__muted">Aucun produit ajouté.</p>
            ) : (
              <table className="promo-items">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix initial</th>
                    <th>Prix promo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.productID}>
                      <td>{it.name}</td>
                      <td className="admin-page__muted">{formatPriceOrTBD(it.previousPrice)}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.currentPrice}
                          onChange={(e) => updateItemPrice(it.productID, e.target.value)}
                        />
                      </td>
                      <td>
                        <button type="button" className="promo-items__remove" onClick={() => removeItem(it.productID)}>Retirer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {error && <p className="np-modal__error">{error}</p>}

          <div className="np-modal__actions">
            <button type="button" className="np-modal__cancel" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="np-modal__submit" disabled={saving}>
              {saving ? 'Création…' : 'Créer la promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
