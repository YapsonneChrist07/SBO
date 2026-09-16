import React, { useEffect, useState } from 'react'
import { getNearbyRealStores, placePhotoUrl } from '../../api/places'
import { COMMUNE_COORDS } from '../../utils/communeCoords'
import './NearbyRealStores.css'

export default function NearbyRealStores({ userCity }) {
  const [places, setPlaces] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'gps' | 'commune'
  const [unconfigured, setUnconfigured] = useState(false)

  const search = (lat, lng, src) => {
    setLoading(true)
    setError(null)
    setSource(src)
    getNearbyRealStores({ lat, lng })
      .then(setPlaces)
      .catch((err) => {
        if (err.message?.includes('not configured')) {
          setUnconfigured(true)
        } else {
          setError(err.message || 'Impossible de charger les boutiques à proximité')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Default to the selected commune's approximate center, if we have one, so this section
    // is useful without requiring a browser geolocation prompt.
    const coords = userCity && COMMUNE_COORDS[userCity]
    if (coords) search(coords.lat, coords.lng, 'commune')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCity])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.")
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => search(pos.coords.latitude, pos.coords.longitude, 'gps'),
      () => {
        setLoading(false)
        setError('Position non disponible — autorisez la géolocalisation ou choisissez votre commune ci-dessus.')
      },
      { timeout: 8000 }
    )
  }

  if (unconfigured) return null

  return (
    <section className="nearby-real">
      <div className="nearby-real__header">
        <div>
          <h2>Boutiques à proximité</h2>
          <p className="stores-page__muted">
            Autres commerces réels (mode, bijoux, décoration) trouvés via Google près de vous
          </p>
        </div>
        <button className="nearby-real__locate" onClick={useMyLocation} disabled={loading}>
          📍 Utiliser ma position
        </button>
      </div>

      {loading && <p className="stores-page__muted stores-page__status">Recherche en cours…</p>}
      {!loading && error && <p className="stores-page__muted stores-page__status">{error}</p>}

      {!loading && !error && places && places.length === 0 && (
        <p className="stores-page__muted stores-page__status">Aucune boutique trouvée dans cette zone.</p>
      )}

      {!loading && !error && places && places.length > 0 && (
        <>
          <p className="nearby-real__source">
            {source === 'gps' ? '📍 Autour de votre position actuelle' : `📍 Autour de ${userCity}`}
          </p>
          <div className="nearby-real__grid">
            {places.map((place) => (
              <a
                key={place.id}
                href={place.mapsUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="real-place-card"
              >
                {place.photoName ? (
                  <img className="real-place-card__photo" src={placePhotoUrl(place.photoName)} alt={place.name} />
                ) : (
                  <div className="real-place-card__photo real-place-card__photo--empty">🏪</div>
                )}
                <div className="real-place-card__body">
                  <h3 className="real-place-card__name">{place.name}</h3>
                  {place.address && <p className="real-place-card__address">{place.address}</p>}
                  <div className="real-place-card__meta">
                    {place.rating != null && (
                      <span className="real-place-card__rating">⭐ {place.rating} ({place.ratingCount || 0})</span>
                    )}
                    {place.openNow != null && (
                      <span className={`real-place-card__open ${place.openNow ? 'real-place-card__open--yes' : 'real-place-card__open--no'}`}>
                        {place.openNow ? 'Ouvert' : 'Fermé'}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
          <p className="nearby-real__disclaimer">
            Résultats fournis par Google Places — SBO n'est pas affilié à ces commerces.
          </p>
        </>
      )}
    </section>
  )
}
