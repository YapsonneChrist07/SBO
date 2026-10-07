import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getSupplierProducts, saveSupplierProduct } from '../../api/supplierPortal'
import { formatPriceOrTBD } from '../../utils/format'
import AddSupplierProductModal from './AddSupplierProductModal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import './SupplierPages.css'

export default function SupplierProductsPage() {
  const allowed = useRequireRole('supplier')
  const { token } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    getSupplierProducts({ search, page }, token)
      .then((data) => {
        setRows(data.rows)
        setTotal(data.total)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => setError(err.message || 'Impossible de charger vos produits'))
      .finally(() => setLoading(false))
  }, [allowed, token, search, page])

  const handleAdd = async (productID, fields) => {
    await saveSupplierProduct(productID, fields, token)
    // Straight to the product so the supplier can set per-shop prices next.
    navigate(`/supplier/products/${productID}`)
  }

  if (!allowed) {
    return <main className="admin-page supplier-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Mes produits</h1>
          <p className="admin-page__muted">
            {total} produit{total > 1 ? 's' : ''} que vous fournissez à SBO
          </p>
        </div>
        <div className="supplier-page__actions">
          <Link to="/" className="admin-page__back">Mon espace</Link>
          <button className="supplier-page__primary" onClick={() => setAdding(true)}>+ Ajouter un produit</button>
        </div>
      </div>

      <div className="admin-orders__filters">
        <input
          type="text"
          className="admin-orders__search"
          placeholder="Rechercher par nom ou par votre code…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      <div className="admin-orders__table-wrap">
        <table className="admin-orders__table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Votre code</th>
              <th>Votre prix</th>
              <th>Prix de vente SBO</th>
              <th>Prix par boutique</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">
                {search
                  ? 'Aucun produit ne correspond à votre recherche.'
                  : 'Vous ne fournissez encore aucun produit. Ajoutez-en un depuis le catalogue SBO.'}
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.productID}>
                <td>
                  <Link to={`/supplier/products/${row.productID}`} className="supplier-page__link">{row.name}</Link>
                </td>
                <td className="admin-page__muted">{row.supplierProductCode || '—'}</td>
                <td><strong>{formatPriceOrTBD(row.supplierUnitPrice)}</strong></td>
                <td className="admin-page__muted">{formatPriceOrTBD(row.sellUnitPrice)}</td>
                <td>
                  <span className={`admin-orders__badge ${row.shopPriceCount > 0 ? 'admin-orders__badge--done' : ''}`}>
                    {row.shopPriceCount > 0
                      ? `${row.shopPriceCount} boutique${row.shopPriceCount > 1 ? 's' : ''}`
                      : 'Prix unique'}
                  </span>
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

      {adding && <AddSupplierProductModal token={token} onAdd={handleAdd} onClose={() => setAdding(false)} />}
    </main>
  )
}
