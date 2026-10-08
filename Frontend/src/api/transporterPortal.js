import request from './client'

const BASE = '/transporter-portal'

export const getTransporterSummary = (token) => request(`${BASE}/summary`, { token })

export const getTransporterShipments = (status, token) =>
  request(`${BASE}/shipments${status ? `?status=${status}` : ''}`, { token })

export const getTransporterShipment = (sellID, token) => request(`${BASE}/shipments/${sellID}`, { token })

export const pickUpShipment = (sellID, token) =>
  request(`${BASE}/shipments/${sellID}/pickup`, { method: 'POST', token })

export const deliverShipment = (sellID, token) =>
  request(`${BASE}/shipments/${sellID}/deliver`, { method: 'POST', token })

export const getTransporterPickups = (token) => request(`${BASE}/pickups`, { token })

export const getTransporterPickup = (id, token) => request(`${BASE}/pickups/${id}`, { token })

export const getTariffZones = (token) => request(`${BASE}/tariffs`, { token })

export const getZoneTariffs = (zoneID, token) => request(`${BASE}/tariffs/${zoneID}`, { token })

// trajectID omitted = apply to every destination of the zone.
export const saveTariffs = ({ zoneID, trajectID, rates }, token) =>
  request(`${BASE}/tariffs`, { method: 'PUT', body: { zoneID, trajectID, rates }, token })

// Labels shared by the transporter, admin and customer views.
export const SHIPMENT_STATUS = {
  assigned: { label: 'À enlever', done: false },
  in_transit: { label: 'En cours de livraison', done: false },
  delivered: { label: 'Livrée', done: true },
}
