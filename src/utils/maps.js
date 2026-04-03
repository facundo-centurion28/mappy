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
