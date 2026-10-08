import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getTransporterShipment, pickUpShipment, deliverShipment } from '../../api/transporterPortal'
import ShipmentBadge from '../../components/ShipmentBadge/ShipmentBadge'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../AdminOrderDetailPage/AdminOrderDetailPage.css'
import '../SupplierProductsPage/SupplierPages.css'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const NEXT_STEP = {
  assigned: { label: 'Confirmer la prise en charge', confirm: 'Vous avez récupéré le colis à la boutique SBO ?', run: pickUpShipment },
  in_transit: { label: 'Confirmer la livraison', confirm: 'Le client a bien reçu sa commande ?', run: deliverShipment },
}

export default function TransporterDeliveryDetailPage() {
  const allowed = useRequireRole('transporter')
  const { token } = useAuth()
  const { sellID } = useParams()
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(() => getTransporterShipment(sellID, token)
    .then(setShipment)
    .catch((err) => setError(err.message || 'Livraison introuvable'))
    .finally(() => setLoading(false)), [sellID, token])

  useEffect(() => {
    if (allowed) load()
  }, [allowed, load])

  const step = shipment && NEXT_STEP[shipment.status]

  const advance = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await step.run(sellID, token)
      setConfirming(false)
      await load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  const phone = shipment?.addressPhone || shipment?.contactPhone

  return (
    <main className="admin-page supplier-page admin-order-detail">
      <div className="admin-page__header">
        <div>
          <h1>Livraison #{sellID}</h1>
          <p className="admin-page__muted">{shipment ? `Commandée le ${formatDateTime(shipment.sellDate)}` : ''}</p>
        </div>
        <Link to="/transporter/deliveries" className="admin-page__back">Toutes les livraisons</Link>
      </div>

      {loading && <p className="admin-page__muted">Chargement…</p>}
      {!loading && error && <p className="admin-page__muted">{error}</p>}

      {!loading && !error && shipment && (
        <>
          <div className="admin-order-detail__status-row">
            <ShipmentBadge status={shipment.status} />
            {step && !confirming && (
              <button className="supplier-page__primary" onClick={() => setConfirming(true)}>{step.label}</button>
            )}
            {step && confirming && (
              <>
                <span className="admin-page__muted">{step.confirm}</span>
                <button className="supplier-page__primary" disabled={busy} onClick={advance}>Oui, confirmer</button>
                <button className="admin-page__back" disabled={busy} onClick={() => setConfirming(false)}>Retour</button>
              </>
            )}
          </div>
          {actionError && <p className="supplier-form__status supplier-form__status--error">{actionError}</p>}

          <div className="admin-order-detail__layout">
            <section className="admin-panel">
              <h2>Colis</h2>
              <ul className="admin-order-detail__items">
                {shipment.items.map((item) => (
                  <li key={`${item.productID}-${item.lenghtValue || ''}`}>
                    <span className="admin-order-detail__item-name">
                      {item.quantity}× {item.productName}
                      {item.lenghtValue && <span className="admin-page__muted"> ({item.lenghtValue})</span>}
                    </span>
                    <span className="admin-page__muted">{item.weight ? `${item.weight} kg / unité` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="admin-order-detail__side">
              <section className="admin-panel">
                <h2>Adresse de livraison</h2>
                <p className="admin-order-detail__field">
                  <strong>{`${shipment.firstName || ''} ${shipment.lastName || ''}`.trim()}</strong>
                </p>
                {shipment.lineOfAddress && <p className="admin-order-detail__field">{shipment.lineOfAddress}</p>}
                <p className="admin-order-detail__field">
                  {[shipment.postalCode, shipment.cityName].filter(Boolean).join(' ')}
                </p>
                {phone && (
                  <p className="admin-order-detail__field">
                    <a href={`tel:${phone}`} className="supplier-page__link">{phone}</a>
                  </p>
                )}
              </section>
              <section className="admin-panel">
                <h2>Suivi</h2>
                {shipment.expectedDaysDuration != null && (
                  <p className="admin-order-detail__field admin-page__muted">
                    Délai prévu : {shipment.expectedDaysDuration} jour{shipment.expectedDaysDuration > 1 ? 's' : ''}
                  </p>
                )}
                <p className="admin-order-detail__field admin-page__muted">
                  Prise en charge : {shipment.shipmentDate ? formatDateTime(shipment.shipmentDate) : '—'}
                </p>
                <p className="admin-order-detail__field admin-page__muted">
                  Livraison : {shipment.receivedDate ? formatDateTime(shipment.receivedDate) : '—'}
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
