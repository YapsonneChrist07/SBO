import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { createOrder, getShippingOptions } from '../../api/orders'
import { getCities } from '../../api/lookup'
import { getPaymentMethods } from '../../api/payments'
import { getCreditCardTypes, getMyCreditCards, createCreditCard } from '../../api/creditcards'
import { getMobileOperators, getMyMobileMoneyAccounts, createMobileMoneyAccount } from '../../api/mobilemoney'
import { formatPriceOrTBD } from '../../utils/format'
import './CheckoutPage.css'

const NEW_CARD = '__new_card__'
const NEW_MOBILE = '__new_mobile__'

export default function CheckoutPage() {
  const { user, token, loading: authLoading } = useAuth()
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState({ address: '', cityID: '', postalCode: '', phone: '' })
  const [cities, setCities] = useState([])

  const [paymentMethods, setPaymentMethods] = useState([])
  const [methodID, setMethodID] = useState(null)

  const [cardTypes, setCardTypes] = useState([])
  const [savedCards, setSavedCards] = useState([])
  const [cardID, setCardID] = useState('')
  const [newCard, setNewCard] = useState({ creditCardNbr: '', creditCardTypeID: '', fullName: '', expirationDate: '', verificationCode: '' })

  const [operators, setOperators] = useState([])
  const [savedMobileMoney, setSavedMobileMoney] = useState([])
  const [mobileMoneyID, setMobileMoneyID] = useState('')
  const [newMobile, setNewMobile] = useState({ mobilePhoneNbr: '', mobileOperatorID: '' })

  // Delivery offers for the cart and city: { loading, options, country, error }.
  const [shipping, setShipping] = useState({ loading: false, options: [], country: null, error: '' })
  const [transporterID, setTransporterID] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Require authentication for checkout.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        address: f.address || user.lineOfAddress || '',
        cityID: f.cityID || user.cityID || '',
        postalCode: f.postalCode || user.postalCode || '',
        phone: f.phone || user.phone || '',
      }))
    }
  }, [user])

  useEffect(() => {
    getCities().then(setCities).catch(() => {})
    getPaymentMethods().then(setPaymentMethods).catch(() => {})
    getCreditCardTypes().then(setCardTypes).catch(() => {})
    getMobileOperators().then(setOperators).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user?.contactID || !token) return
    getMyCreditCards(user.contactID, token).then(setSavedCards).catch(() => {})
    getMyMobileMoneyAccounts(user.contactID, token).then(setSavedMobileMoney).catch(() => {})
  }, [user, token])

  // Re-quote delivery whenever the city or the cart's contents change.
  const cartKey = items.map((i) => `${i.productID}:${i.quantity}`).join(',')
  useEffect(() => {
    if (!token || !form.cityID || !cartKey || submitting) return
    let cancelled = false
    setShipping((s) => ({ ...s, loading: true, error: '' }))
    const cartItems = cartKey.split(',').map((entry) => {
      const [productID, quantity] = entry.split(':')
      return { productID, quantity: Number(quantity) }
    })
    getShippingOptions(cartItems, form.cityID, token)
      .then(({ options, country }) => {
        if (cancelled) return
        setShipping({ loading: false, options, country, error: '' })
        // Keep the shopper's pick if it is still offered, else preselect the cheapest.
        setTransporterID((current) => (options.some((o) => o.transporterID === current) ? current : options[0]?.transporterID || ''))
      })
      .catch((err) => {
        if (!cancelled) setShipping({ loading: false, options: [], country: null, error: err.message })
      })
    return () => { cancelled = true }
  }, [cartKey, form.cityID, token, submitting])

  const cardMethod = useMemo(
    () => paymentMethods.find((m) => /carte|card/i.test(m.paymentMethodName)) || paymentMethods[0],
    [paymentMethods]
  )
  const mobileMethod = useMemo(
    () => paymentMethods.find((m) => /mobile/i.test(m.paymentMethodName)) || paymentMethods[1],
    [paymentMethods]
  )

  useEffect(() => {
    if (!methodID && cardMethod) setMethodID(cardMethod.paymentMethodID)
  }, [cardMethod, methodID])

  useEffect(() => {
    if (!cardID && savedCards.length) setCardID(savedCards[0].creditCardID)
    else if (!cardID && !savedCards.length) setCardID(NEW_CARD)
  }, [savedCards, cardID])

  useEffect(() => {
    if (!mobileMoneyID && savedMobileMoney.length) setMobileMoneyID(savedMobileMoney[0].mobileMoneyID)
    else if (!mobileMoneyID && !savedMobileMoney.length) setMobileMoneyID(NEW_MOBILE)
  }, [savedMobileMoney, mobileMoneyID])

  if (authLoading || !user) {
    return <main className="checkout-page"><p className="checkout-page__muted">Chargement…</p></main>
  }

  if (items.length === 0 && !submitting) {
    return (
      <main className="checkout-page">
        <div className="checkout-page__empty">
          <h1>Votre panier est vide</h1>
          <Link to="/" className="checkout-page__cta">Retour à la boutique</Link>
        </div>
      </main>
    )
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const selectedShipping = shipping.options.find((o) => o.transporterID === transporterID)
  const shippingCost = selectedShipping?.cost || 0
  const total = Math.round((subtotal + shippingCost) * 100) / 100
  const isCardMethod = cardMethod && methodID === cardMethod.paymentMethodID

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let payment = { paymentMethodID: methodID }

      if (isCardMethod) {
        if (cardID === NEW_CARD) {
          const [mm, yy] = newCard.expirationDate.split('/')
          const expirationDate = `20${yy}-${mm}-01`
          const { creditCardID } = await createCreditCard({ ...newCard, expirationDate }, token)
          payment.creditCardID = creditCardID
        } else {
          payment.creditCardID = cardID
        }
      } else {
        if (mobileMoneyID === NEW_MOBILE) {
          const { mobileMoneyID: newID } = await createMobileMoneyAccount(newMobile, token)
          payment.mobileMoneyID = newID
        } else {
          payment.mobileMoneyID = mobileMoneyID
        }
      }

      const payload = {
        items: items.map((i) => ({
          productID: i.productID,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice) || 0,
        })),
        address: {
          lineOfAddress: form.address,
          cityID: form.cityID,
          postalCode: form.postalCode,
          phone: form.phone,
        },
        payment,
        transporterID,
      }
      const { sellID } = await createOrder(payload, token)
      await clear()
      navigate(`/order/${sellID}`, { replace: true })
    } catch (err) {
      setError(err.message || 'La commande a échoué. Réessayez.')
      setSubmitting(false)
    }
  }

  return (
    <main className="checkout-page">
      <h1 className="checkout-page__title">Finaliser la commande</h1>

      {error && <div className="checkout-page__error">{error}</div>}

      <div className="checkout-page__layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-form__section">
            <h2>Coordonnées</h2>
            <div className="checkout-form__grid">
              <label>
                <span>Prénom</span>
                <input value={user.firstName || ''} disabled />
              </label>
              <label>
                <span>Nom</span>
                <input value={user.lastName || ''} disabled />
              </label>
              <label className="checkout-form__full">
                <span>Email</span>
                <input value={user.email || ''} disabled />
              </label>
              <label className="checkout-form__full">
                <span>Téléphone</span>
                <input name="phone" value={form.phone} onChange={handleChange} required />
              </label>
            </div>
          </section>

          <section className="checkout-form__section">
            <h2>Adresse de livraison</h2>
            <div className="checkout-form__grid">
              <label className="checkout-form__full">
                <span>Adresse</span>
                <input name="address" value={form.address} onChange={handleChange} required />
              </label>
              <label>
                <span>Ville</span>
                <select name="cityID" value={form.cityID} onChange={handleChange} required>
                  <option value="" disabled>Sélectionner une ville</option>
                  {cities.map((c) => (
                    <option key={c.cityID} value={c.cityID}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Code postal</span>
                <input name="postalCode" value={form.postalCode} onChange={handleChange} required />
              </label>
            </div>
          </section>

          <section className="checkout-form__section">
            <h2>Livraison</h2>
            {!form.cityID ? (
              <p className="checkout-page__muted">Choisissez une ville pour voir les transporteurs disponibles.</p>
            ) : shipping.loading && !shipping.options.length ? (
              <p className="checkout-page__muted">Calcul des frais de livraison…</p>
            ) : shipping.error ? (
              <p className="checkout-form__notice">{shipping.error}</p>
            ) : shipping.options.length === 0 ? (
              <p className="checkout-form__notice">
                Aucun transporteur ne livre encore {shipping.country ? `en ${shipping.country}` : 'à cette adresse'}.
                Choisissez une autre ville ou contactez SBO.
              </p>
            ) : (
              <div className="checkout-form__saved-list">
                {shipping.options.map((o) => (
                  <label key={o.transporterID} className="checkout-form__radio checkout-form__shipping-option">
                    <input
                      type="radio"
                      name="transporterID"
                      checked={transporterID === o.transporterID}
                      onChange={() => setTransporterID(o.transporterID)}
                    />
                    <span className="checkout-form__shipping-name">{o.name}</span>
                    <span className="checkout-form__shipping-price">{formatPriceOrTBD(o.cost)}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="checkout-form__section">
            <h2>Paiement</h2>
            {paymentMethods.length > 0 && (
              <div className="checkout-form__method-tabs">
                {cardMethod && (
                  <button
                    type="button"
                    className={`checkout-form__method-tab ${isCardMethod ? 'checkout-form__method-tab--active' : ''}`}
                    onClick={() => setMethodID(cardMethod.paymentMethodID)}
                  >
                    {cardMethod.paymentMethodName}
                  </button>
                )}
                {mobileMethod && (
                  <button
                    type="button"
                    className={`checkout-form__method-tab ${!isCardMethod ? 'checkout-form__method-tab--active' : ''}`}
                    onClick={() => setMethodID(mobileMethod.paymentMethodID)}
                  >
                    {mobileMethod.paymentMethodName}
                  </button>
                )}
              </div>
            )}

            {isCardMethod ? (
              <div className="checkout-form__payment-body">
                {savedCards.length > 0 && (
                  <div className="checkout-form__saved-list">
                    {savedCards.map((c) => (
                      <label key={c.creditCardID} className="checkout-form__radio">
                        <input
                          type="radio"
                          name="cardID"
                          checked={cardID === c.creditCardID}
                          onChange={() => setCardID(c.creditCardID)}
                        />
                        <span>{c.typeName} •••• {String(c.creditCardNbr).slice(-4)} — {c.fullName}</span>
                      </label>
                    ))}
                    <label className="checkout-form__radio">
                      <input type="radio" name="cardID" checked={cardID === NEW_CARD} onChange={() => setCardID(NEW_CARD)} />
                      <span>Utiliser une nouvelle carte</span>
                    </label>
                  </div>
                )}
                {cardID === NEW_CARD && (
                  <div className="checkout-form__grid">
                    <label>
                      <span>Type de carte</span>
                      <select
                        value={newCard.creditCardTypeID}
                        onChange={(e) => setNewCard((c) => ({ ...c, creditCardTypeID: e.target.value }))}
                        required
                      >
                        <option value="" disabled>Sélectionner</option>
                        {cardTypes.map((t) => (
                          <option key={t.creditCardTypeID} value={t.creditCardTypeID}>{t.typeName}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Nom sur la carte</span>
                      <input
                        value={newCard.fullName}
                        onChange={(e) => setNewCard((c) => ({ ...c, fullName: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="checkout-form__full">
                      <span>Numéro de carte</span>
                      <input
                        inputMode="numeric"
                        value={newCard.creditCardNbr}
                        onChange={(e) => setNewCard((c) => ({ ...c, creditCardNbr: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      <span>Expiration (MM/AA)</span>
                      <input
                        placeholder="MM/AA"
                        value={newCard.expirationDate}
                        onChange={(e) => setNewCard((c) => ({ ...c, expirationDate: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      <span>CVV</span>
                      <input
                        inputMode="numeric"
                        value={newCard.verificationCode}
                        onChange={(e) => setNewCard((c) => ({ ...c, verificationCode: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="checkout-form__payment-body">
                {savedMobileMoney.length > 0 && (
                  <div className="checkout-form__saved-list">
                    {savedMobileMoney.map((m) => (
                      <label key={m.mobileMoneyID} className="checkout-form__radio">
                        <input
                          type="radio"
                          name="mobileMoneyID"
                          checked={mobileMoneyID === m.mobileMoneyID}
                          onChange={() => setMobileMoneyID(m.mobileMoneyID)}
                        />
                        <span>{m.operatorName} — {m.mobilePhoneNbr}</span>
                      </label>
                    ))}
                    <label className="checkout-form__radio">
                      <input type="radio" name="mobileMoneyID" checked={mobileMoneyID === NEW_MOBILE} onChange={() => setMobileMoneyID(NEW_MOBILE)} />
                      <span>Utiliser un nouveau compte</span>
                    </label>
                  </div>
                )}
                {mobileMoneyID === NEW_MOBILE && (
                  <div className="checkout-form__grid">
                    <label>
                      <span>Opérateur</span>
                      <select
                        value={newMobile.mobileOperatorID}
                        onChange={(e) => setNewMobile((m) => ({ ...m, mobileOperatorID: e.target.value }))}
                        required
                      >
                        <option value="" disabled>Sélectionner</option>
                        {operators.map((o) => (
                          <option key={o.mobileOperatorID} value={o.mobileOperatorID}>{o.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Numéro de téléphone</span>
                      <input
                        value={newMobile.mobilePhoneNbr}
                        onChange={(e) => setNewMobile((m) => ({ ...m, mobilePhoneNbr: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </section>

          <button className="checkout-form__submit" type="submit" disabled={submitting || !methodID || !selectedShipping}>
            {submitting ? 'Traitement…' : `Confirmer la commande · ${formatPriceOrTBD(total)}`}
          </button>
        </form>

        <aside className="checkout-summary">
          <h2>Votre commande</h2>
          <ul>
            {items.map((i) => (
              <li key={i.productID}>
                <span className="checkout-summary__qty">{i.quantity}×</span>
                <span className="checkout-summary__name">{i.productName}</span>
                <span className="checkout-summary__price">{formatPriceOrTBD(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__line">
            <span>Sous-total</span>
            <span>{formatPriceOrTBD(subtotal)}</span>
          </div>
          <div className="checkout-summary__line">
            <span>Livraison{selectedShipping ? ` · ${selectedShipping.name}` : ''}</span>
            <span>{selectedShipping ? formatPriceOrTBD(shippingCost) : '—'}</span>
          </div>
          <div className="checkout-summary__total">
            <span>Total</span>
            <span>{formatPriceOrTBD(total)}</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
