import React from 'react'
import { SHIPMENT_STATUS } from '../../api/transporterPortal'
import '../../pages/AdminOrdersPage/AdminOrdersPage.css'

// Delivery status of an order's shipment: 'assigned' | 'in_transit' | 'delivered'.
export default function ShipmentBadge({ status }) {
  const s = SHIPMENT_STATUS[status]
  if (!s) return null
  return <span className={`admin-orders__badge ${s.done ? 'admin-orders__badge--done' : ''}`}>{s.label}</span>
}
