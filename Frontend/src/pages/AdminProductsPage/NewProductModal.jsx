import React, { useEffect, useMemo, useState } from 'react'
import { getProductTypes } from '../../api/lookup'
import './NewProductModal.css'

const EMPTY = {
  name: '',
  productTypeID: '',
  sellUnitPrice: '',
  description: '',
  madeIn: '',
  color: '',
  rawMaterial: '',
  weight: '',
  volume: '',
  length: '',
  height: '',
  width: '',
}

export default function NewProductModal({ token, onCreate, onClose }) {
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getProductTypes().then(setTypes).catch(() => setTypes([]))
  }, [])

  const groupedTypes = useMemo(() => {
    const groups = new Map()
    for (const t of types) {
      const key = t.lineName || 'Autres'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(t)
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  }, [types])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Le nom du produit est requis.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const numeric = (v) => (v === '' ? null : Number(v))
      await onCreate({
        name: form.name.trim(),
        productTypeID: form.productTypeID || null,
        sellUnitPrice: numeric(form.sellUnitPrice),
        description: form.description.trim() || null,
        madeIn: form.madeIn.trim() || null,
        color: form.color.trim() || null,
        rawMaterial: form.rawMaterial.trim() || null,
        weight: numeric(form.weight),
        volume: numeric(form.volume),
        length: numeric(form.length),
        height: numeric(form.height),
        width: numeric(form.width),
      })
    } catch (err) {
      setError(err.message || 'Impossible de créer le produit')
      setSaving(false)
    }
  }

  return (
    <div className="np-modal__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="np-modal">
        <div className="np-modal__head">
          <h2>Nouveau produit</h2>
          <button type="button" className="np-modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="np-modal__form">
          <label className="np-modal__field np-modal__field--full">
            <span>Nom du produit *</span>
            <input type="text" value={form.name} onChange={set('name')} required autoFocus />
          </label>

          <label className="np-modal__field">
            <span>Catégorie</span>
            <select value={form.productTypeID} onChange={set('productTypeID')}>
              <option value="">— Aucune —</option>
              {groupedTypes.map(([lineName, items]) => (
                <optgroup key={lineName} label={lineName}>
                  {items.map((t) => (
                    <option key={t.productTypeID} value={t.productTypeID}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="np-modal__field">
            <span>Prix de vente (€)</span>
            <input type="number" step="0.01" min="0" value={form.sellUnitPrice} onChange={set('sellUnitPrice')} />
          </label>

          <label className="np-modal__field np-modal__field--full">
            <span>Description</span>
            <textarea rows={3} value={form.description} onChange={set('description')} />
          </label>

          <label className="np-modal__field">
            <span>Origine</span>
            <input type="text" value={form.madeIn} onChange={set('madeIn')} placeholder="Côte d'Ivoire" />
          </label>

          <label className="np-modal__field">
            <span>Couleur</span>
            <input type="text" value={form.color} onChange={set('color')} />
          </label>

          <label className="np-modal__field">
            <span>Matière</span>
            <input type="text" value={form.rawMaterial} onChange={set('rawMaterial')} />
          </label>

          <label className="np-modal__field">
            <span>Poids (kg)</span>
            <input type="number" step="0.01" min="0" value={form.weight} onChange={set('weight')} />
          </label>

          <div className="np-modal__field np-modal__field--full np-modal__dims">
            <span>Dimensions (cm)</span>
            <div className="np-modal__dims-row">
              <input type="number" step="0.1" min="0" placeholder="Longueur" value={form.length} onChange={set('length')} />
              <input type="number" step="0.1" min="0" placeholder="Hauteur" value={form.height} onChange={set('height')} />
              <input type="number" step="0.1" min="0" placeholder="Largeur" value={form.width} onChange={set('width')} />
              <input type="number" step="0.01" min="0" placeholder="Volume" value={form.volume} onChange={set('volume')} />
            </div>
          </div>

          {error && <p className="np-modal__error">{error}</p>}

          <div className="np-modal__actions">
            <button type="button" className="np-modal__cancel" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="np-modal__submit" disabled={saving}>
              {saving ? 'Création…' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
