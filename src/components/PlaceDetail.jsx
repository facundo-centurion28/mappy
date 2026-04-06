import { CAT_COLORS, getPlaceEmoji } from '../data/places'
import styles from './PlaceDetail.module.css'

function formatPrice(price) {
  if (price?.free === true) return 'Gratis'

  const hasMin = price?.min !== '' && price?.min != null
  const hasMax = price?.max !== '' && price?.max != null

  if (!hasMin && !hasMax) return 'Sin precio'

  const sym = price.currency === 'USD' ? 'U$S ' : price.currency === 'EUR' ? '€' : price.currency === 'ARS' ? '$AR ' : '$'

  if (hasMin && hasMax && Number(price.min) === 0 && Number(price.max) === 0) return 'Precio no especificado'
  if (hasMin && hasMax && Number(price.min) === Number(price.max)) return `${sym}${price.min}`
  if (hasMin && hasMax) return `${sym}${price.min} – ${sym}${price.max}`
  if (hasMin) return `Desde ${sym}${price.min}`
  return `Hasta ${sym}${price.max}`
}

function formatInstagramHandle(value) {
  return (value || '').trim().replace(/^@+/, '')
}

function getInstagramProfileUrl(value) {
  const handle = formatInstagramHandle(value)
  if (!handle) return ''
  return `https://instagram.com/${handle}`
}

export default function PlaceDetail({ place, onClose, onEdit, onDelete, onToggleFavorite, onToggleVisited }) {
  if (!place) return null
  const color = CAT_COLORS[place.category] || CAT_COLORS.Otro
  const instagramHandle = formatInstagramHandle(place.instagram)
  const instagramUrl = getInstagramProfileUrl(place.instagram)

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalScroll}>
          <div className={styles.media}>
            {place.imageUrl ? (
              <img src={place.imageUrl} alt={place.name} className={styles.img}
                onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div className={styles.emoji}>{getPlaceEmoji(place)}</div>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
          </div>

          <div className={styles.content}>
          <div className={styles.topRow}>
            <span className={styles.badge} style={{ background: color.bg, color: color.text }}>
              {place.category}
            </span>
            <div className={styles.topLinks}>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                  @{instagramHandle}
                </a>
              )}
              {place.mapsUrl && (
                <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                  Ver en Maps ↗
                </a>
              )}
            </div>
          </div>

          <h2 className={styles.name}>{place.name}</h2>

          {place.description && (
            <p className={styles.desc}>{place.description}</p>
          )}

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Horario</span>
              <span className={styles.infoVal}>
                {place.schedule?.open
                  ? `${place.schedule.open} – ${place.schedule.close}`
                  : 'No especificado'}
              </span>
              {place.schedule?.days && (
                <span className={styles.infoSub}>{place.schedule.days}</span>
              )}
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Precio</span>
              <span className={styles.infoVal}>{formatPrice(place.price)}</span>
            </div>
            <div className={`${styles.infoCard} ${styles.infoCardWide}`}>
              <span className={styles.infoLabel}>Dirección</span>
              <span className={styles.infoVal}>{place.address || 'No especificada'}</span>
            </div>
          </div>

          {place.tags?.length > 0 && (
            <div className={styles.tags}>
              {place.tags.map(t => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          )}

          {(onToggleFavorite || onToggleVisited) && (
            <div className={styles.toggleRow}>
              {onToggleFavorite && (
                <button
                  className={`${styles.toggleBtn} ${place.favorite ? styles.toggleBtnFav : ''}`}
                  onClick={() => onToggleFavorite(place)}
                >
                  {place.favorite ? '⭐ Favorito' : '☆ Agregar a favoritos'}
                </button>
              )}
              {onToggleVisited && (
                <button
                  className={`${styles.toggleBtn} ${place.visited ? styles.toggleBtnVisited : ''}`}
                  onClick={() => onToggleVisited(place)}
                >
                  {place.visited ? '✓ Visitado' : '○ Marcar como visitado'}
                </button>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.btnEdit} onClick={() => onEdit(place)}>Editar</button>
            <button className={styles.btnDelete} onClick={() => {
              if (window.confirm(`¿Eliminar "${place.name}"?`)) onDelete(place.id)
            }}>Eliminar</button>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
