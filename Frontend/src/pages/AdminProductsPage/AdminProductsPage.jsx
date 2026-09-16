import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getProducts, createProduct, patchProduct, deleteProduct, productImageUrl } from '../../api/products'
import { formatPriceOrTBD } from '../../utils/format'
import NewProductModal from './NewProductModal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import './AdminProductsPage.css'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Nom (A-Z)' },
]

function PriceCell({ product, token, onSaved, onError }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(product.sellUnitPrice ?? '')
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button className="admin-products__price-btn" onClick={() => { setValue(product.sellUnitPrice ?? ''); setEditing(true) }}>
        {formatPriceOrTBD(product.sellUnitPrice)}
      </button>
    )
  }

  const save = async () => {
    const num = value === '' ? null : Number(value)
    if (value !== '' && Number.isNaN(num)) { setEditing(false); return }
    if (num === product.sellUnitPrice) { setEditing(false); return }
    setSaving(true)
    try {
      await patchProduct(product.productID, { sellUnitPrice: num }, token)
      onSaved(product.productID, num)
      setEditing(false)
    } catch (err) {
      onError(err.message || 'Impossible de mettre à jour le prix')
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      className="admin-products__price-input"
      type="number"
      step="0.01"
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

export default function AdminProductsPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDeleteID, setConfirmDeleteID] = useState(null)
  const [deletingID, setDeletingID] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/products' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!user?.adminEntity) return
    setLoading(true)
    getProducts({ search, sort, page, limit: 20 })
      .then((data) => {
        setProducts(data.products)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les produits'))
      .finally(() => setLoading(false))
  }, [user, search, sort, page, refreshKey])

  const handleCreate = async (fields) => {
    await createProduct(fields, token)
    setShowCreate(false)
    setPage(1)
    setSort('newest')
    setSearch('')
    setSearchInput('')
    setRefreshKey((k) => k + 1)
  }

  const handlePriceSaved = (productID, sellUnitPrice) => {
    setProducts((prev) => prev.map((p) => (p.productID === productID ? { ...p, sellUnitPrice } : p)))
  }

  const handleDelete = async (productID) => {
    setDeletingID(productID)
    try {
      await deleteProduct(productID, token)
      setProducts((prev) => prev.filter((p) => p.productID !== productID))
      setTotal((t) => t - 1)
    } catch (err) {
      setError(err.message || 'Impossible de supprimer le produit')
    } finally {
      setDeletingID(null)
      setConfirmDeleteID(null)
    }
  }

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Produits</h1>
          <p className="admin-page__muted">{total} produit{total > 1 ? 's' : ''} au total</p>
        </div>
        <div className="admin-products__header-actions">
          <button className="admin-products__new-btn" onClick={() => setShowCreate(true)}>+ Nouveau produit</button>
          <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
        </div>
      </div>

      {showCreate && (
        <NewProductModal
          token={token}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

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
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1) }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table admin-products__table">
          <thead>
            <tr>
              <th></th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">Aucun produit trouvé.</td></tr>
            )}
            {!loading && products.map((product) => (
              <tr key={product.productID}>
                <td className="admin-products__thumb-cell">
                  {product.hasImage ? (
                    <img className="admin-products__thumb" src={productImageUrl(product.productID)} alt="" />
                  ) : (
                    <div className="admin-products__thumb admin-products__thumb--empty" />
                  )}
                </td>
                <td className="admin-products__name">
                  <Link to={`/product/${product.productID}`} target="_blank" rel="noopener noreferrer">
                    {product.name}
                  </Link>
                </td>
                <td className="admin-page__muted">{product.productTypeName || '—'}</td>
                <td>
                  <PriceCell product={product} token={token} onSaved={handlePriceSaved} onError={setError} />
                </td>
                <td className="admin-products__actions">
                  {confirmDeleteID === product.productID ? (
                    <div className="admin-products__confirm">
                      <span>Supprimer ?</span>
                      <button
                        className="admin-products__confirm-yes"
                        disabled={deletingID === product.productID}
                        onClick={() => handleDelete(product.productID)}
                      >
                        Oui
                      </button>
                      <button className="admin-products__confirm-no" onClick={() => setConfirmDeleteID(null)}>Non</button>
                    </div>
                  ) : (
                    <button className="admin-orders__toggle" onClick={() => setConfirmDeleteID(product.productID)}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
