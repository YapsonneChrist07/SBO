import request from './client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getNearbyRealStores = ({ lat, lng, radius } = {}) => {
  const params = new URLSearchParams()
  params.set('lat', lat)
  params.set('lng', lng)
  if (radius) params.set('radius', radius)
  return request(`/places/nearby?${params.toString()}`)
}

export const placePhotoUrl = (photoName, maxWidthPx = 400) =>
  `${API_URL}/places/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`
