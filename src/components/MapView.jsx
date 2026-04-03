import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'

// Fix default marker icons broken by Vite's asset handling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

function makeEmojiIcon(emoji) {
  return L.divIcon({
    html: `<div class="emoji-marker">${emoji || '📍'}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
}

export default function MapView({ places, onSelectPlace }) {
  const withCoords = useMemo(
    () => places.filter(p => p.coordinates?.lat != null && p.coordinates?.lng != null),
    [places]
  )
  const withoutCount = places.length - withCoords.length

  const center = useMemo(() => {
    if (withCoords.length === 0) return [-34.9058, -56.1913] // Montevideo default
    const avgLat = withCoords.reduce((s, p) => s + p.coordinates.lat, 0) / withCoords.length
    const avgLng = withCoords.reduce((s, p) => s + p.coordinates.lng, 0) / withCoords.length
    return [avgLat, avgLng]
  }, [withCoords])

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
        {withCoords.map(place => (
          <Marker
            key={place.id}
            position={[place.coordinates.lat, place.coordinates.lng]}
            icon={makeEmojiIcon(place.emoji)}
            eventHandlers={{ click: () => onSelectPlace(place) }}
          >
            <Popup>
              <strong>{place.emoji} {place.name}</strong>
              <br />
              <span style={{ fontSize: '12px', color: '#666' }}>{place.category}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {withoutCount > 0 && (
        <div className={styles.notice}>
          {withoutCount} {withoutCount === 1 ? 'lugar sin ubicación' : 'lugares sin ubicación'}
        </div>
      )}
    </div>
  )
}
