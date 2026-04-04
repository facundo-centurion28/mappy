import styles from './PlaceCard.module.css'
import { CAT_COLORS, getPlaceEmoji } from '../data/places'

function formatPrice(price) {
  if (price?.free === true) return 'Gratis'

  const hasMin = price?.min !== '' && price?.min != null
  const hasMax = price?.max !== '' && price?.max != null

  if (!hasMin && !hasMax) return 'Sin precio'
  if (hasMin && hasMax && Number(price.min) === 0 && Number(price.max) === 0) return 'Precio no especificado'
  const sym = price.currency === 'USD' ? 'U$S ' : price.currency === 'EUR' ? '€' : price.currency === 'ARS' ? '$AR ' : '$'
  if (hasMin && hasMax && Number(price.min) === Number(price.max)) return `${sym}${price.min}`
  if (hasMin && hasMax) return `${sym}${price.min} – ${sym}${price.max}`
  if (hasMin) return `Desde ${sym}${price.min}`
  return `Hasta ${sym}${price.max}`
}

export default function PlaceCard({ place, onClick, onToggleFavorite, onToggleVisited, layout = 'grid' }) {
  const color = CAT_COLORS[place.category] || CAT_COLORS.Otro
  const isList = layout === 'list'

  return (
    <article className={`${styles.card} ${isList ? styles.cardList : ''}`} onClick={() => onClick(place)}>
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
        <div className={styles.metaRow}>
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
          </div>
          {(onToggleFavorite || onToggleVisited) && (
            <div className={styles.cardActions}>
              {onToggleFavorite && (
                <button
                  className={`${styles.cardActionBtn} ${place.favorite ? styles.cardActionFav : ''}`}
                  onClick={e => { e.stopPropagation(); onToggleFavorite(place) }}
                  title={place.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  {place.favorite ? '⭐' : '☆'}
                </button>
              )}
              {onToggleVisited && (
                <button
                  className={`${styles.cardActionBtn} ${place.visited ? styles.cardActionVisited : ''}`}
                  onClick={e => { e.stopPropagation(); onToggleVisited(place) }}
                  title={place.visited ? 'Marcar como no visitado' : 'Marcar como visitado'}
                >
                  {place.visited ? '📍' : '◎'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
