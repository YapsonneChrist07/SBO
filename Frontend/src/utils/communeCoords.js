// Approximate commune-center coordinates for Abidjan (and Grand-Bassam), used only as a
// fallback "search around here" center for the Google Places lookup when the visitor hasn't
// shared their exact browser location. Not precise addresses — general public geography.
export const COMMUNE_COORDS = {
  'Plateau': { lat: 5.3200, lng: -4.0187 },
  'Cocody': { lat: 5.3599, lng: -3.9860 },
  'Yopougon': { lat: 5.3450, lng: -4.0850 },
  'Adjame': { lat: 5.3550, lng: -4.0270 },
  'Grand-Bassam': { lat: 5.2100, lng: -3.7380 },
}
