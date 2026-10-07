import React, { useState } from 'react'
import { searchSupplierCatalog } from '../../api/supplierPortal'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminProductsPage/NewProductModal.css'
import '../AdminPromotionsPage/NewPromotionModal.css'

export default function AddSupplierProductModal({ token, onAdd, onClose }) {
  const [searchInput, setSearchInput] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [code, setCode] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const runSearch = async (e) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    setSearching(true)
    try {
      setResults(await searchSupplierCatalog(searchInput.trim(), token))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) { setError('Choisissez un produit du catalogue SBO.'); return }
    const num = Number(price)
    if (price === '' || Number.isNaN(num) || num < 0) { setError('Indiquez un prix unitaire valide.'); return }

    setSaving(true)
    setError(null)
    try {
      await onAdd(selected.productID, { supplierProductCode: code.trim(), supplierUnitPrice: num })
    } catch (err) {
      setError(err.message || "Impossible d'ajouter le produit")
      setSaving(false)
    }
  }

  return (
    <div className="np-modal__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="np-modal np-modal--wide">
        <div className="np-modal__head">
          <h2>Ajouter un produit</h2>
          <button type="button" className="np-modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="np-modal__form">
          {selected ? (
            <div className="np-modal__field np-modal__field--full">
              <span>Produit</span>
              <div className="supplier-picked">
                <strong>{selected.name}</strong>
                <span className="admin-page__muted">Prix de vente SBO : {formatPriceOrTBD(selected.sellUnitPrice)}</span>
                <button type="button" onClick={() => setSelected(null)}>Changer</button>
              </div>
            </div>
          ) : (
            <div className="np-modal__field np-modal__field--full">
              <span>Rechercher dans le catalogue SBO</span>
              <div className="promo-search">
                <input
                  type="text"
                  placeholder="Ex. pagne, bracelet, karité…"
                  value={searchInput}
                  autoFocus
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(e) }}
                />
                <button type="button" onClick={runSearch} disabled={searching}>
                  {searching ? '…' : 'Rechercher'}
                </button>
              </div>
              {results && results.length === 0 && (
                <p className="admin-page__muted">Aucun produit trouvé.</p>
              )}
              {results && results.length > 0 && (
                <ul className="promo-search__results">
                  {results.map((p) => (
                    <li key={p.productID}>
                      <span>{p.name}</span>
                      <span className="admin-page__muted">{formatPriceOrTBD(p.sellUnitPrice)}</span>
                      {p.alreadySupplied ? (
                        <span className="admin-page__muted">Déjà dans votre catalogue</span>
                      ) : (
                        <button type="button" onClick={() => { setSelected(p); setError(null) }}>Choisir</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="np-modal__field">
            <span>Votre code produit</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={15} placeholder="Facultatif" />
          </label>
          <label className="np-modal__field">
            <span>Votre prix unitaire *</span>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>

          {error && <p className="np-modal__error">{error}</p>}

          <div className="np-modal__actions">
            <button type="button" className="np-modal__cancel" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="np-modal__submit" disabled={saving}>
              {saving ? 'Ajout…' : 'Ajouter à mon catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
