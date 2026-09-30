import React, { useState } from 'react'

export default function CategoryColumn({ title, items, selectedID, onSelect, onCreate, onUpdate, onDelete, disabled }) {
  const [newName, setNewName] = useState('')
  const [editingID, setEditingID] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteID, setConfirmDeleteID] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const idKey = (item) => item.productDivisionID || item.productLineID || item.productTypeID

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(newName.trim())
      setNewName('')
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (item) => {
    setEditingID(idKey(item))
    setEditValue(item.name || '')
  }

  const saveEdit = async (item) => {
    if (!editValue.trim() || editValue.trim() === item.name) { setEditingID(null); return }
    setBusy(true)
    setError(null)
    try {
      await onUpdate(item, editValue.trim())
      setEditingID(null)
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (item) => {
    setBusy(true)
    setError(null)
    try {
      await onDelete(item)
      setConfirmDeleteID(null)
    } catch (err) {
      setError(err.message || 'Erreur')
      setConfirmDeleteID(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cat-column">
      <h2 className="cat-column__title">{title}</h2>
      {error && <p className="cat-column__error">{error}</p>}
      <ul className="cat-column__list">
        {items.length === 0 && <li className="cat-column__empty">Aucun élément.</li>}
        {items.map((item) => {
          const key = idKey(item)
          const isSelected = key === selectedID
          return (
            <li key={key} className={`cat-column__item${isSelected ? ' cat-column__item--selected' : ''}`}>
              {editingID === key ? (
                <input
                  className="cat-column__edit-input"
                  value={editValue}
                  autoFocus
                  disabled={busy}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') setEditingID(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="cat-column__label"
                  onClick={() => onSelect?.(item)}
                  onDoubleClick={() => startEdit(item)}
                  title="Double-cliquer pour renommer"
                >
                  {item.name}
                </button>
              )}

              <div className="cat-column__actions">
                {confirmDeleteID === key ? (
                  <>
                    <button type="button" className="cat-column__confirm-yes" disabled={busy} onClick={() => handleDelete(item)}>Oui</button>
                    <button type="button" className="cat-column__confirm-no" onClick={() => setConfirmDeleteID(null)}>Non</button>
                  </>
                ) : (
                  <button type="button" className="cat-column__delete" onClick={() => setConfirmDeleteID(key)} aria-label="Supprimer">×</button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {onCreate && (
        <form className="cat-column__new" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Nouveau…"
            value={newName}
            disabled={busy || disabled}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" disabled={busy || disabled || !newName.trim()}>+</button>
        </form>
      )}
    </div>
  )
}
