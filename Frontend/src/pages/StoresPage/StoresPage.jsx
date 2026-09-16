import React, { useEffect, useMemo, useState } from 'react'
import { getStores } from '../../api/stores'
import NearbyRealStores from '../../components/NearbyRealStores/NearbyRealStores'
import './StoresPage.css'

const STORAGE_KEY = 'sbo_user_city'

export default function StoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userCity, setUserCity] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch((err) => setError(err.message || 'Impossible de charger les boutiques'))
      .finally(() => setLoading(false))
  }, [])

  const cityOptions = useMemo(() => {
    const names = stores.map((s) => s.cityName).filter(Boolean)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [stores])

  const handleCityChange = (value) => {
    setUserCity(value)
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable — selection just won't persist across visits
    }
  }

  const sortedStores = useMemo(() => {
    if (!userCity) return stores
    return [...stores].sort((a, b) => {
      const aMatch = a.cityName === userCity ? 0 : 1
      const bMatch = b.cityName === userCity ? 0 : 1
      return aMatch - bMatch
    })
  }, [stores, userCity])

  const nearestCount = userCity ? stores.filter((s) => s.cityName === userCity).length : 0

  return (
    <main className="stores-page">
      <div className="stores-page__header">
        <h1>Nos boutiques</h1>
        <p className="stores-page__muted">Retrouvez SBO près de chez vous</p>

        {cityOptions.length > 0 && (
          <div className="stores-page__locator">
            <label htmlFor="user-city">Vous habitez où&nbsp;?</label>
            <select
              id="user-city"
              value={userCity}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">Choisissez votre commune…</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}

        {userCity && (
          <p className="stores-page__hint">
            {nearestCount > 0
              ? `📍 ${nearestCount} boutique${nearestCount > 1 ? 's' : ''} à ${userCity}, mise${nearestCount > 1 ? 's' : ''} en avant ci-dessous.`
              : `Aucune boutique à ${userCity} pour le moment — voici les plus proches.`}
          </p>
        )}
      </div>

      {loading && <p className="stores-page__muted stores-page__status">Chargement…</p>}
      {!loading && error && <p className="stores-page__muted stores-page__status">{error}</p>}
      {!loading && !error && stores.length === 0 && (
        <p className="stores-page__muted stores-page__status">Aucune boutique pour le moment.</p>
      )}

      {!loading && !error && stores.length > 0 && (
        <div className="stores-page__grid">
          {sortedStores.map((store) => {
            const isNearest = userCity && store.cityName === userCity
            return (
              <div key={store.storeID} className={`store-card ${isNearest ? 'store-card--nearest' : ''}`}>
                {isNearest && <span className="store-card__badge">Près de chez vous</span>}
                <div className="store-card__icon">🏬</div>
                <h2 className="store-card__name">{store.storeName}</h2>
                {store.storeDescription && (
                  <p className="store-card__description">{store.storeDescription}</p>
                )}
                {(store.lineOfAddress || store.cityName) && (
                  <p className="store-card__address">
                    {store.lineOfAddress}
                    {store.lineOfAddress && store.cityName && ', '}
                    {store.cityName}
                    {store.postalCode && ` (${store.postalCode})`}
                  </p>
                )}
                {store.phone && <p className="store-card__phone">{store.phone}</p>}
              </div>
            )
          })}
        </div>
      )}

      <NearbyRealStores userCity={userCity} />
    </main>
  )
}
