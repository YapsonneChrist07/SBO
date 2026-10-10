import React, { useEffect, useState } from 'react'
import { getShipmentTransporters, assignTransporter, unassignTransporter } from '../../api/orders'
import ShipmentBadge from '../../components/ShipmentBadge/ShipmentBadge'
import { formatPriceOrTBD } from '../../utils/format'
import '../SupplierProductsPage/SupplierPages.css'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Admin: who delivers this order. The transporter can be set or changed until they pick
// the parcel up; after that the panel only shows the delivery's progress. The one the
// customer chose (and paid for) at checkout is preselected.
export default function DeliveryPanel({ order, token, onChanged }) {
  const shipment = order.shipment
  const editable = !order.completed && (!shipment || shipment.status === 'assigned')
  const [transporters, setTransporters] = useState(null)
  const customerChoice = order.transporterID || ''
  const [transporterID, setTransporterID] = useState(shipment?.transporterID || customerChoice)
  const [days, setDays] = useState(shipment?.expectedDaysDuration ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!editable) return
    getShipmentTransporters(token).then(setTransporters).catch((err) => setError(err.message))
  }, [editable, token])

  useEffect(() => {
    setTransporterID(shipment?.transporterID || customerChoice)
    setDays(shipment?.expectedDaysDuration ?? '')
  }, [shipment, customerChoice])

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const dirty = transporterID !== (shipment?.transporterID || '') || String(days) !== String(shipment?.expectedDaysDuration ?? '')

  return (
    <section className="admin-panel">
      <h2>Livraison</h2>
      {order.transporterName && (
        <p className="admin-order-detail__field admin-page__muted">
          Choisi par le client : {order.transporterName.trim()}
          {Number(order.transportCost) > 0 && ` · ${formatPriceOrTBD(order.transportCost)} payés`}
        </p>
      )}
      {shipment ? (
        <>
          <p className="admin-order-detail__field">
            <ShipmentBadge status={shipment.status} /> <strong>{shipment.transporterName}</strong>
          </p>
          {shipment.expectedDaysDuration != null && (
            <p className="admin-order-detail__field admin-page__muted">Délai prévu : {shipment.expectedDaysDuration} j</p>
          )}
          {shipment.status !== 'assigned' && (
            <>
              <p className="admin-order-detail__field admin-page__muted">Prise en charge : {formatDateTime(shipment.shipmentDate)}</p>
              <p className="admin-order-detail__field admin-page__muted">Livrée : {formatDateTime(shipment.receivedDate)}</p>
            </>
          )}
        </>
      ) : (
        <p className="admin-page__muted">Aucun transporteur assigné.</p>
      )}

      {editable && (
        <div className="supplier-form" style={{ marginTop: '0.9rem' }}>
          {transporters && transporters.length === 0 ? (
            <p className="admin-page__muted">Aucun transporteur avec un compte actif.</p>
          ) : (
            <>
              <label>
                {shipment ? 'Changer de transporteur' : 'Confier à'}
                <select
                  value={transporterID}
                  onChange={(e) => setTransporterID(e.target.value)}
                  disabled={!transporters || busy}
                >
                  <option value="">Choisir…</option>
                  {transporters?.map((t) => (
                    <option key={t.transporterID} value={t.transporterID}>
                      {t.name}{t.typeName ? ` (${t.typeName})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Délai prévu (jours)
                <input type="number" min="0" max="365" value={days} onChange={(e) => setDays(e.target.value)} disabled={busy} />
              </label>
              <div className="supplier-page__actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  className="supplier-page__primary"
                  disabled={busy || !transporterID || !dirty}
                  onClick={() => run(() => assignTransporter(order.sellID, { transporterID, expectedDaysDuration: days === '' ? null : Number(days) }, token))}
                >
                  {shipment ? 'Mettre à jour' : 'Assigner'}
                </button>
                {shipment && (
                  <button className="supplier-page__danger" disabled={busy} onClick={() => run(() => unassignTransporter(order.sellID, token))}>
                    Retirer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {error && <p className="supplier-form__status supplier-form__status--error">{error}</p>}
    </section>
  )
}
