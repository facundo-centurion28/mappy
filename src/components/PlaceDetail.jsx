import { CAT_COLORS, getPlaceEmoji } from '../data/places'
import styles from './PlaceDetail.module.css'

function formatPrice(price) {
  if (!price) return 'Gratis'
  if (!price.min && !price.max) return 'Gratis'
  const sym = price.currency === 'USD' ? 'U$S ' : price.currency === 'EUR' ? '€' : '$'
  if (price.min === price.max) return `${sym}${price.min}`
  return `${sym}${price.min} – ${sym}${price.max}`
}

export default function PlaceDetail({ place, onClose, onEdit, onDelete }) {
  if (!place) return null
  const color = CAT_COLORS[place.category] || CAT_COLORS.Otro

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
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
            {place.mapsUrl && (
              <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                Ver en Maps ↗
              </a>
            )}
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
          </div>

          {place.tags?.length > 0 && (
            <div className={styles.tags}>
              {place.tags.map(t => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
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
  )
}
