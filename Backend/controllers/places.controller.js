const { success, error } = require('../utils/response');

const PLACES_BASE = 'https://places.googleapis.com/v1';
const NEARBY_TYPES = ['clothing_store', 'shopping_mall', 'jewelry_store', 'department_store'];

const nearby = async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return error(res, 'Google Places API is not configured', 503);

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return error(res, 'lat and lng query params are required', 400);
  }
  const radius = Math.min(20000, Math.max(500, Number(req.query.radius) || 5000));

  try {
    const googleRes = await fetch(`${PLACES_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.photos',
          'places.googleMapsUri',
          'places.currentOpeningHours.openNow',
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: NEARBY_TYPES,
        maxResultCount: 12,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius },
        },
      }),
    });

    if (!googleRes.ok) {
      const detail = await googleRes.text();
      console.error('Places API error:', googleRes.status, detail);
      return error(res, 'Failed to fetch nearby stores', 502);
    }

    const data = await googleRes.json();
    const places = (data.places || []).map((p) => ({
      id: p.id,
      name: p.displayName?.text || 'Boutique',
      address: p.formattedAddress || null,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? null,
      openNow: p.currentOpeningHours?.openNow ?? null,
      mapsUrl: p.googleMapsUri || null,
      photoName: p.photos?.[0]?.name || null,
    }));

    return success(res, places);
  } catch (err) {
    console.error('Places API request failed:', err.message);
    return error(res, 'Failed to fetch nearby stores');
  }
};

const photo = async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return error(res, 'Google Places API is not configured', 503);

  const { name } = req.query;
  if (!name || !name.startsWith('places/')) {
    return error(res, 'Invalid photo name', 400);
  }
  const maxWidthPx = Math.min(1600, Math.max(100, Number(req.query.maxWidthPx) || 400));

  try {
    const googleRes = await fetch(
      `${PLACES_BASE}/${name}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}&skipHttpRedirect=false`
    );
    if (!googleRes.ok) return error(res, 'Photo not found', 404);

    res.set('Content-Type', googleRes.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    const buf = Buffer.from(await googleRes.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    console.error('Places photo request failed:', err.message);
    return error(res, 'Failed to fetch photo');
  }
};

module.exports = { nearby, photo };
