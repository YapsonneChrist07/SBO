import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getInventory, setInventory } from '../../api/inventory'
import { getStores } from '../../api/stores'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import './AdminInventoryPage.css'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StockCell({ row, token, onSaved, onError }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(row.quantityInStock)
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button className="admin-inventory__stock-btn" onClick={() => { setValue(row.quantityInStock); setEditing(true) }}>
        {row.quantityInStock}
      </button>
    )
  }

  const save = async () => {
    const num = Number(value)
    if (Number.isNaN(num) || num < 0) { setEditing(false); return }
    if (num === row.quantityInStock) { setEditing(false); return }
    setSaving(true)
    try {
      await setInventory({ productID: row.productID, storeID: row.storeID, quantityInStock: num }, token)
      onSaved(row.productID, row.storeID, num)
      setEditing(false)
    } catch (err) {
      onError(err.message || 'Impossible de mettre à jour le stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      className="admin-inventory__stock-input"
      type="number"
      min="0"
      autoFocus
      disabled={saving}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

export default function AdminInventoryPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stores, setStores] = useState([])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [storeID, setStoreID] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/inventory' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    getStores().then(setStores).catch(() => setStores([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!token || !user?.adminEntity) return
    setLoading(true)
    getInventory({ storeID, lowStock: lowStockOnly, search, page, limit: 20 }, token)
      .then((data) => {
        setRows(data.rows)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || "Impossible de charger l'inventaire"))
      .finally(() => setLoading(false))
  }, [token, user, storeID, lowStockOnly, search, page])

  const handleStockSaved = (productID, storeID, quantityInStock) => {
    setRows((prev) => prev.map((r) =>
      r.productID === productID && r.storeID === storeID ? { ...r, quantityInStock } : r
    ))
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Inventaire</h1>
          <p className="admin-page__muted">{total} ligne{total > 1 ? 's' : ''} de stock{lowStockOnly ? ' à surveiller' : ''}</p>
        </div>
        <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
      </div>

      <div className="admin-orders__filters">
        <input
          type="text"
          className="admin-orders__search"
          placeholder="Rechercher un produit…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-orders__select"
          value={storeID}
          onChange={(e) => { setStoreID(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les boutiques</option>
          {stores.map((s) => (
            <option key={s.storeID} value={s.storeID}>{s.storeName}</option>
          ))}
        </select>
        <label className="admin-inventory__checkbox">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1) }}
          />
          Stock faible uniquement
        </label>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Boutique</th>
              <th>En stock</th>
              <th>Seuil min.</th>
              <th>En commande</th>
              <th>Statut</th>
              <th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="admin-page__muted admin-orders__empty">
                {lowStockOnly ? 'Aucun produit en stock faible. 🎉' : 'Aucune ligne de stock trouvée.'}
              </td></tr>
            )}
            {!loading && rows.map((row) => {
              const isOut = row.quantityInStock === 0
              const isLow = row.quantityInStock <= row.minQuantity
              return (
                <tr key={`${row.productID}-${row.storeID}`}>
                  <td>
                    <Link to={`/product/${row.productID}`} target="_blank" rel="noopener noreferrer">
                      {row.productName}
                    </Link>
                  </td>
                  <td className="admin-page__muted">{row.storeName}</td>
                  <td>
                    <StockCell row={row} token={token} onSaved={handleStockSaved} onError={setError} />
                  </td>
                  <td className="admin-page__muted">{row.minQuantity}</td>
                  <td className="admin-page__muted">{row.quantityOnCommand}</td>
                  <td>
                    <span className={`admin-orders__badge ${isOut ? 'admin-inventory__badge--out' : isLow ? '' : 'admin-orders__badge--done'}`}>
                      {isOut ? 'Rupture' : isLow ? 'Stock faible' : 'En stock'}
                    </span>
                  </td>
                  <td className="admin-page__muted">{formatDate(row.lastUpdate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-orders__pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
        </div>
      )}
    </main>
  )
}
