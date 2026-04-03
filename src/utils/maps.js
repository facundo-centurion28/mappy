/**
 * Extracts {lat, lng} from a Google Maps URL.
 * Supports the most common URL formats:
 *   /@lat,lng,zoom  — place/embed URLs
 *   ?q=lat,lng or ?q=Name@lat,lng
 *   ?ll=lat,lng
 *   !3dlat!4dlng   — data parameter in long URLs
 * Returns null if no coordinates can be extracted.
 */
export function extractCoordsFromMapsUrl(url) {
  if (!url) return null

  // /@lat,lng
  let m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // ?q=lat,lng or ?q=Name@lat,lng
  m = url.match(/[?&]q=(?:[^@]+@)?(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // ?ll=lat,lng
  m = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // !3dlat!4dlng
  m = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return null
}

/**
 * Geocodes a free-text address using OpenStreetMap Nominatim.
 * Returns { lat, lng, label } or null when no result is found.
 */
export async function geocodeAddress(address) {
  const rawQuery = address?.trim()
  if (!rawQuery) return null

  const normalizedQuery = rawQuery
    .replace(/\bCdad\.?\b/gi, 'Ciudad')
    .replace(/\s+/g, ' ')
    .trim()

  // En varios casos el código postal entorpece resultados en geocoders públicos.
  const withoutPostal = normalizedQuery.replace(/\b\d{4,5}\b/g, '').replace(/\s+,/g, ',').trim()

  const queries = [...new Set([rawQuery, normalizedQuery, withoutPostal].filter(Boolean))]

  async function geocodeWithNominatim(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null

    const results = await response.json()
    const first = results?.[0]
    if (!first) return null

    const lat = Number(first.lat)
    const lng = Number(first.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null

    return { lat, lng, label: first.display_name || query }
  }

  async function geocodeWithPhoton(query) {
    const url = `https://photon.komoot.io/api/?limit=1&lang=es&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null

    const data = await response.json()
    const first = data?.features?.[0]
    const coords = first?.geometry?.coordinates
    if (!coords || coords.length < 2) return null

    const lng = Number(coords[0])
    const lat = Number(coords[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null

    const props = first.properties || {}
    const label = [props.name, props.city, props.country].filter(Boolean).join(', ')
    return { lat, lng, label: label || query }
  }

  for (const query of queries) {
    try {
      const nominatim = await geocodeWithNominatim(query)
      if (nominatim) return nominatim
    } catch {
      // Intentamos proveedor alternativo
    }

    try {
      const photon = await geocodeWithPhoton(query)
      if (photon) return photon
    } catch {
      // Continuar con siguiente variante de query
    }
  }

  return null
}
