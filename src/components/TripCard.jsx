import styles from './TripCard.module.css'

const COUNTRY_FLAGS = {
  argentina: '🇦🇷',
  brasil: '🇧🇷',
  chile: '🇨🇱',
  uruguay: '🇺🇾',
  peru: '🇵🇪',
  colombia: '🇨🇴',
  mexico: '🇲🇽',
  españa: '🇪🇸',
  italia: '🇮🇹',
  francia: '🇫🇷',
  japon: '🇯🇵',
  'estados unidos': '🇺🇸',
  portugal: '🇵🇹',
  alemania: '🇩🇪',
  grecia: '🇬🇷',
  tailandia: '🇹🇭',
}

function getTripEmoji(name) {
  const lower = (name || '').toLowerCase()
  for (const [country, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (lower.includes(country)) return flag
  }
  return '✈️'
}

function getTripStats(trip, places) {
  const placeIds = new Set((trip.items || []).map((i) => i.placeId))
  const tripPlaces = places.filter((p) => placeIds.has(p.id))
  const days = [...new Set((trip.items || []).map((i) => Number(i.day)).filter(Boolean))]
  const categories = {}
  tripPlaces.forEach((p) => {
    categories[p.category] = (categories[p.category] || 0) + 1
  })

  let dayCount = days.length
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
    if (diff > 0) dayCount = diff
  }

  return {
    placeCount: tripPlaces.length,
    dayCount,
    categories,
    topCategories: Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
  }
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return ''
  const opts = { day: 'numeric', month: 'short' }
  const start = new Date(startDate + 'T00:00:00').toLocaleDateString('es-AR', opts)
  const end = new Date(endDate + 'T00:00:00').toLocaleDateString('es-AR', opts)
  return `${start} – ${end}`
}

export default function TripCard({ trip, places, onClick }) {
  const stats = getTripStats(trip, places)
  const emoji = getTripEmoji(trip.name)
  const dateRange = formatDateRange(trip.startDate, trip.endDate)

  return (
    <article className={styles.card} onClick={() => onClick(trip)}>
      <div className={styles.emojiSection}>
        <span className={styles.emoji}>{emoji}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{trip.name}</h3>
        {dateRange && <p className={styles.dates}>{dateRange}</p>}
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statIcon}>📍</span>
            {stats.placeCount} {stats.placeCount === 1 ? 'lugar' : 'lugares'}
          </span>
          {stats.dayCount > 0 && (
            <span className={styles.stat}>
              <span className={styles.statIcon}>📅</span>
              {stats.dayCount} {stats.dayCount === 1 ? 'día' : 'días'}
            </span>
          )}
        </div>
        {stats.topCategories.length > 0 && (
          <div className={styles.tags}>
            {stats.topCategories.map(([cat, count]) => (
              <span key={cat} className={styles.tag}>
                {cat} ({count})
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
