import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPurchaseOptions, getSupplierOffer, createPurchase } from '../../api/purchases'
import { formatPriceOrTBD } from '../../utils/format'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'
import './AdminNewPurchasePage.css'

const toNumber = (v) => (v === '' || v == null ? 0 : Number(v))

export default function AdminNewPurchasePage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()
  const isAdmin = !!user?.adminEntity

  const [options, setOptions] = useState(null)
  const [supplierID, setSupplierID] = useState('')
  const [storeID, setStoreID] = useState('')
  const [offer, setOffer] = useState([])
  const [offerLoading, setOfferLoading] = useState(false)
  // productID → { quantity, unitPrice } as typed (strings)
  const [lines, setLines] = useState({})
  const [transporterID, setTransporterID] = useState('')
  const [transportCost, setTransportCost] = useState('')
  const [tax, setTax] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login', { replace: true, state: { from: '/admin/purchases/new' } })
    else if (!user.adminEntity) navigate('/account', { replace: true })
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!isAdmin) return
    getPurchaseOptions(token).then(setOptions).catch((err) => setError(err.message))
  }, [isAdmin, token])

  // The offer (and its prices) depends on both the supplier and the destination shop.
  useEffect(() => {
    if (!supplierID || !storeID) { setOffer([]); return }
    setOfferLoading(true)
    getSupplierOffer(supplierID, storeID, token)
      .then((rows) => {
        setOffer(rows)
        setLines(Object.fromEntries(rows.map((r) => [r.productID, { quantity: '', unitPrice: String(r.unitPrice ?? '') }])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setOfferLoading(false))
  }, [supplierID, storeID, token])

  const updateLine = (productID, field, value) => {
    setLines((prev) => ({ ...prev, [productID]: { ...prev[productID], [field]: value } }))
  }

  const chosen = useMemo(
    () => offer.filter((o) => toNumber(lines[o.productID]?.quantity) > 0),
    [offer, lines]
  )
  const subTotal = chosen.reduce(
    (sum, o) => sum + toNumber(lines[o.productID].quantity) * toNumber(lines[o.productID].unitPrice), 0
  )
  const total = subTotal + toNumber(transportCost) + toNumber(tax)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!supplierID || !storeID) { setError('Choisissez un fournisseur et une boutique.'); return }
    if (chosen.length === 0) { setError('Indiquez une quantité pour au moins un produit.'); return }
    for (const o of chosen) {
      const { quantity, unitPrice } = lines[o.productID]
      if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
        setError(`Quantité invalide pour « ${o.name.trim()} ».`); return
      }
      if (unitPrice === '' || Number(unitPrice) < 0 || Number.isNaN(Number(unitPrice))) {
        setError(`Prix invalide pour « ${o.name.trim()} ».`); return
      }
    }

    setSubmitting(true)
    try {
      const { purchaseID } = await createPurchase({
        supplierID,
        storeID,
        transporterID: transporterID || undefined,
        transportCost: toNumber(transportCost),
        tax: toNumber(tax),
        items: chosen.map((o) => {
          const line = lines[o.productID]
          const item = { productID: o.productID, quantity: Number(line.quantity) }
          // Only send a price when it was negotiated away from the supplier's own price.
          if (Number(line.unitPrice) !== Number(o.unitPrice)) item.unitPrice = Number(line.unitPrice)
          return item
        }),
      }, token)
      navigate(`/admin/purchases/${purchaseID}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Impossible de créer la commande')
      setSubmitting(false)
    }
  }

  if (authLoading || !isAdmin) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Nouvelle commande d’achat</h1>
          <p className="admin-page__muted">Réapprovisionner une boutique auprès d’un fournisseur</p>
        </div>
        <Link to="/admin/purchases" className="admin-page__back">Achats fournisseurs</Link>
      </div>

      <form onSubmit={handleSubmit} className="new-purchase">
        <section className="admin-panel">
          <h2>1. Fournisseur & destination</h2>
          {options && options.suppliers.length === 0 ? (
            <p className="supplier-page__notice">
              Aucun fournisseur ne propose encore de produits. Les fournisseurs inscrits doivent d’abord
              référencer des produits depuis leur espace.
            </p>
          ) : (
            <div className="new-purchase__row">
              <label className="new-purchase__field">
                <span>Fournisseur *</span>
                <select value={supplierID} onChange={(e) => setSupplierID(e.target.value)} disabled={!options}>
                  <option value="">Choisir…</option>
                  {options?.suppliers.map((s) => (
                    <option key={s.supplierID} value={s.supplierID}>
                      {s.name} ({s.productCount} produit{s.productCount > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </label>
              <label className="new-purchase__field">
                <span>Boutique à réapprovisionner *</span>
                <select value={storeID} onChange={(e) => setStoreID(e.target.value)} disabled={!options}>
                  <option value="">Choisir…</option>
                  {options?.stores.map((s) => <option key={s.storeID} value={s.storeID}>{s.storeName}</option>)}
                </select>
              </label>
            </div>
          )}
        </section>

        {supplierID && storeID && (
          <section className="admin-panel">
            <h2>2. Produits</h2>
            <p className="supplier-page__notice">
              Prix proposés par le fournisseur pour cette boutique (modifiables si vous avez négocié un autre prix).
              Les produits en stock faible dans la boutique apparaissent en premier.
            </p>
            <div className="admin-orders__table-wrap">
              <table className="admin-orders__table new-purchase__table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Stock boutique</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Total ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {offerLoading && (
                    <tr><td colSpan={5} className="admin-page__muted admin-orders__empty">Chargement…</td></tr>
                  )}
                  {!offerLoading && offer.map((o) => {
                    const line = lines[o.productID] || { quantity: '', unitPrice: '' }
                    const isLow = o.quantityInStock != null && o.quantityInStock <= o.minQuantity
                    return (
                      <tr key={o.productID} className={toNumber(line.quantity) > 0 ? 'new-purchase__line--active' : ''}>
                        <td>
                          <strong>{o.name.trim()}</strong>
                          {o.supplierProductCode && <div className="admin-page__muted">Réf. {o.supplierProductCode}</div>}
                        </td>
                        <td>
                          {o.quantityInStock == null ? (
                            <span className="admin-page__muted">Non stocké</span>
                          ) : (
                            <>
                              <span className={`admin-orders__badge ${isLow ? '' : 'admin-orders__badge--done'}`}>
                                {o.quantityInStock} en stock
                              </span>
                              {o.quantityOnCommand > 0 && (
                                <div className="admin-page__muted">{o.quantityOnCommand} déjà en commande</div>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={line.quantity}
                            onChange={(e) => updateLine(o.productID, 'quantity', e.target.value)}
                            aria-label={`Quantité pour ${o.name.trim()}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(o.productID, 'unitPrice', e.target.value)}
                            aria-label={`Prix unitaire pour ${o.name.trim()}`}
                          />
                          {o.shopPrice != null && <div className="admin-page__muted">Prix boutique</div>}
                        </td>
                        <td>
                          {toNumber(line.quantity) > 0
                            ? formatPriceOrTBD(toNumber(line.quantity) * toNumber(line.unitPrice))
                            : <span className="admin-page__muted">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {supplierID && storeID && (
          <section className="admin-panel">
            <h2>3. Transport & total</h2>
            <div className="new-purchase__row">
              <label className="new-purchase__field">
                <span>Transporteur</span>
                <select value={transporterID} onChange={(e) => setTransporterID(e.target.value)}>
                  <option value="">À définir plus tard</option>
                  {options?.transporters.map((t) => <option key={t.transporterID} value={t.transporterID}>{t.name.trim()}</option>)}
                </select>
              </label>
              <label className="new-purchase__field">
                <span>Frais de transport</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} />
              </label>
              <label className="new-purchase__field">
                <span>Taxes</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={tax} onChange={(e) => setTax(e.target.value)} />
              </label>
            </div>

            <div className="new-purchase__summary">
              <div><span>{chosen.length} produit{chosen.length > 1 ? 's' : ''} — sous-total</span><span>{formatPriceOrTBD(subTotal)}</span></div>
              {toNumber(transportCost) > 0 && <div><span>Transport</span><span>{formatPriceOrTBD(toNumber(transportCost))}</span></div>}
              {toNumber(tax) > 0 && <div><span>Taxes</span><span>{formatPriceOrTBD(toNumber(tax))}</span></div>}
              <div className="new-purchase__grand"><span>Total</span><span>{formatPriceOrTBD(total)}</span></div>
            </div>

            {error && <p className="supplier-form__status supplier-form__status--error">{error}</p>}

            <div className="supplier-page__actions">
              <button type="submit" className="supplier-page__primary" disabled={submitting || chosen.length === 0}>
                {submitting ? 'Création…' : 'Passer la commande'}
              </button>
            </div>
          </section>
        )}

        {!(supplierID && storeID) && error && (
          <p className="supplier-form__status supplier-form__status--error">{error}</p>
        )}
      </form>
    </main>
  )
}
