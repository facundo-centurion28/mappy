import styles from './PlaceCard.module.css'
import { CAT_COLORS, getPlaceEmoji } from '../data/places'

function formatPrice(price) {
  if (price?.free === true) return 'Gratis'

  const hasMin = price?.min !== '' && price?.min != null
  const hasMax = price?.max !== '' && price?.max != null

  if (!hasMin && !hasMax) return 'Sin precio'
  if (hasMin && hasMax && Number(price.min) === 0 && Number(price.max) === 0) return 'Precio no especificado'
  if (hasMin && hasMax && Number(price.min) === Number(price.max)) return `$${price.min}`
  if (hasMin && hasMax) return `$${price.min} – $${price.max}`
  if (hasMin) return `Desde $${price.min}`
  return `Hasta $${price.max}`
}

export default function PlaceCard({ place, onClick, onToggleFavorite, onToggleVisited }) {
  const color = CAT_COLORS[place.category] || CAT_COLORS.Otro

  return (
    <article className={styles.card} onClick={() => onClick(place)}>
      <div className={styles.media}>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} className={styles.img}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className={styles.emoji}>{getPlaceEmoji(place)}</div>
        )}
        <span
          className={styles.badge}
          style={{ background: color.bg, color: color.text }}
        >
          {place.category}
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{place.name}</h3>
        <p className={styles.desc}>{place.description || 'Sin descripción'}</p>
        <div className={styles.meta}>
          {place.schedule?.open && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>◷</span>
              {place.schedule.open}–{place.schedule.close}
            </span>
          )}
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>◈</span>
            {formatPrice(place.price || {})}
          </span>
        </div>        {(onToggleFavorite || onToggleVisited) && (
          <div className={styles.cardActions}>
            {onToggleFavorite && (
              <button
                className={`${styles.cardActionBtn} ${place.favorite ? styles.cardActionFav : ''}`}
                onClick={e => { e.stopPropagation(); onToggleFavorite(place) }}
                title={place.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {place.favorite ? '⭐' : '☆'} Favorito
              </button>
            )}
            {onToggleVisited && (
              <button
                className={`${styles.cardActionBtn} ${place.visited ? styles.cardActionVisited : ''}`}
                onClick={e => { e.stopPropagation(); onToggleVisited(place) }}
                title={place.visited ? 'Marcar como no visitado' : 'Marcar como visitado'}
              >
                {place.visited ? '✓' : '○'} Visitado
              </button>
            )}
          </div>
        )}      </div>
    </article>
  )
}
