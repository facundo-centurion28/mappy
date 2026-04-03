import styles from './PlaceCard.module.css'
import { CAT_COLORS } from '../data/places'

function formatPrice(price) {
  if (!price.min && !price.max) return 'Gratis'
  if (price.min === price.max) return `$${price.min}`
  return `$${price.min} – $${price.max}`
}

export default function PlaceCard({ place, onClick }) {
  const color = CAT_COLORS[place.category] || CAT_COLORS.Otro

  return (
    <article className={styles.card} onClick={() => onClick(place)}>
      <div className={styles.media}>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} className={styles.img}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className={styles.emoji}>{place.emoji || '📍'}</div>
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
        </div>
      </div>
    </article>
  )
}
