import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getPlaceEmoji } from '../data/places'
import styles from './MapView.module.css'

// Fix default marker icons broken by Vite's asset handling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

function makeEmojiIconWithLabel(emoji, label) {
  return L.divIcon({
    html: `
      <div class="emoji-marker">
        ${label ? `<span class="emoji-marker-badge">${label}</span>` : ''}
        ${emoji || '📍'}
      </div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
}

function MapViewport({ markerPoints, routePoints }) {
  const map = useMap()

  useEffect(() => {
    if (routePoints.length > 1) {
      map.fitBounds(routePoints, { padding: [32, 32] })
      return
    }

    if (markerPoints.length > 1) {
      map.fitBounds(markerPoints, { padding: [32, 32] })
      return
    }

    if (markerPoints.length === 1) {
      map.setView(markerPoints[0], 13)
    }
  }, [map, markerPoints, routePoints])

  return null
}

export default function MapView({
  places,
  routePlaces = places,
  routeMode = 'walking',
  startPlaceId = '',
  endPlaceId = '',
  onSelectPlace,
}) {
  const withCoords = useMemo(
    () => places.filter(p => p.coordinates?.lat != null && p.coordinates?.lng != null),
    [places]
  )
  const routeStops = useMemo(
    () => routePlaces.filter((place) => place.coordinates?.lat != null && place.coordinates?.lng != null),
    [routePlaces]
  )
  const markerPoints = useMemo(
    () => withCoords.map((place) => [place.coordinates.lat, place.coordinates.lng]),
    [withCoords]
  )
  const [routeLine, setRouteLine] = useState([])
  const [routeError, setRouteError] = useState('')
  const withoutCount = places.length - withCoords.length

  const center = useMemo(() => {
    if (withCoords.length === 0) return [-34.9058, -56.1913] // Montevideo default
    const avgLat = withCoords.reduce((s, p) => s + p.coordinates.lat, 0) / withCoords.length
    const avgLng = withCoords.reduce((s, p) => s + p.coordinates.lng, 0) / withCoords.length
    return [avgLat, avgLng]
  }, [withCoords])

  useEffect(() => {
    if (routeStops.length < 2) {
      setRouteLine([])
      setRouteError('')
      return
    }

    const controller = new AbortController()

    async function loadRoute() {
      try {
        setRouteError('')
        const coordinates = routeStops
          .map((place) => `${place.coordinates.lng},${place.coordinates.lat}`)
          .join(';')

        // Caminando usa perfil `foot`; auto usa `driving`.
        // Para caminando dejamos fallback a driving por compatibilidad en algunos mirrors públicos.
        const profiles = routeMode === 'driving'
          ? ['driving']
          : ['foot', 'driving']
        let resolvedGeometry = null

        for (const profile of profiles) {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`,
            { signal: controller.signal }
          )

          if (!response.ok) continue

          const data = await response.json()
          const geometry = data.routes?.[0]?.geometry?.coordinates

          if (geometry?.length) {
            resolvedGeometry = geometry
            break
          }
        }

        if (!resolvedGeometry?.length) {
          throw new Error('No hay ruta disponible para estos puntos.')
        }

        setRouteLine(resolvedGeometry.map(([lng, lat]) => [lat, lng]))
      } catch (error) {
        if (error.name === 'AbortError') return
        setRouteLine([])
        setRouteError(error.message || 'No se pudo dibujar la ruta.')
      }
    }

    loadRoute()

    return () => controller.abort()
  }, [routeStops, routeMode])

  const getMarkerLabel = (placeId) => {
    if (placeId === startPlaceId && placeId === endPlaceId) return 'I/F'
    if (placeId === startPlaceId) return 'I'
    if (placeId === endPlaceId) return 'F'
    return ''
  }

  const getMarkerMeta = (placeId) => {
    if (placeId === startPlaceId && placeId === endPlaceId) return 'Inicio y fin de ruta'
    if (placeId === startPlaceId) return 'Inicio de ruta'
    if (placeId === endPlaceId) return 'Fin de ruta'
    return ''
  }

  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={center}
        zoom={13}
        className={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport markerPoints={markerPoints} routePoints={routeLine} />
        {routeLine.length > 1 && (
          <Polyline positions={routeLine} pathOptions={{ color: '#008D89', weight: 5, opacity: 0.8 }} />
        )}
        {withCoords.map(place => (
          <Marker
            key={place.id}
            position={[place.coordinates.lat, place.coordinates.lng]}
            icon={makeEmojiIconWithLabel(getPlaceEmoji(place), getMarkerLabel(place.id))}
            eventHandlers={{ click: () => onSelectPlace(place) }}
          >
            <Popup>
              <strong>{getPlaceEmoji(place)} {place.name}</strong>
              <br />
              <span style={{ fontSize: '12px', color: '#666' }}>{place.category}</span>
              {getMarkerMeta(place.id) && (
                <>
                  <br />
                  <span style={{ fontSize: '12px', color: '#008D89', fontWeight: 600 }}>{getMarkerMeta(place.id)}</span>
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {withoutCount > 0 && (
        <div className={styles.notice}>
          {withoutCount} {withoutCount === 1 ? 'lugar sin ubicación' : 'lugares sin ubicación'}
        </div>
      )}

      {routeLine.length > 1 && (
        <div className={styles.routeNotice}>
          Ruta por calles (modo {routeMode === 'driving' ? 'auto' : 'caminando'})
        </div>
      )}

      {routeError && (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {routeError}
        </div>
      )}
    </div>
  )
}
