import { useState } from 'react'
import { CATEGORIES } from '../data/places'
import styles from '../App.module.css'

export default function FilterBar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  bySearchAndTrip,
  categoryCounts,
  activeTripId,
  onTripChange,
  loadingTrips,
  trips,
  routeMode,
  onRouteModeChange,
  onNewTrip,
  activeTrip,
  onEditTrip,
  onDeleteTrip,
  activeTripDay,
  onTripDayChange,
  tripDays,
  insideTrip = false,
}) {
  const [showQuickFilters, setShowQuickFilters] = useState(false)
  const [showTripFilters, setShowTripFilters] = useState(false)

  return (
    <div className={styles.controls}>
      <div className={styles.controlBlock}>
        <label className={styles.controlLabel}>Buscar</label>
        <input
          className={styles.search}
          type="text"
          placeholder="Buscar por nombre, descripción o etiqueta..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.controlBlock}>
        <button
          type="button"
          className={styles.accordionHeader}
          onClick={() => setShowQuickFilters((prev) => !prev)}
          aria-expanded={showQuickFilters}
        >
          <span className={styles.accordionTitle}>Filtros rápidos</span>
          <span
            className={`${styles.accordionChevron} ${showQuickFilters ? styles.accordionChevronOpen : ''}`}
            aria-hidden="true"
          />
        </button>

        {showQuickFilters && (
          <div className={styles.accordionContent}>
            <div className={styles.filters}>
              {['Todos', 'Favoritos', 'Visitados', ...CATEGORIES.map(c => c.label)].map(cat => {
                const count = cat === 'Todos' ? bySearchAndTrip.length : (categoryCounts[cat] || 0)
                const isSpecial = cat === 'Todos' || cat === 'Favoritos' || cat === 'Visitados'
                if (!isSpecial && count === 0) return null
                return (
                  <button
                    key={cat}
                    className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ''}`}
                    onClick={() => onFilterChange(cat)}
                  >
                    {cat === 'Favoritos' ? '⭐ ' : cat === 'Visitados' ? '✓ ' : ''}
                    {cat}
                    {count > 0 && <span className={styles.filterCount}>{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {!insideTrip && (
      <div className={styles.controlBlock}>
        <button
          type="button"
          className={styles.accordionHeader}
          onClick={() => setShowTripFilters((prev) => !prev)}
          aria-expanded={showTripFilters}
        >
          <span className={styles.accordionTitle}>Filtros de viaje</span>
          <span
            className={`${styles.accordionChevron} ${showTripFilters ? styles.accordionChevronOpen : ''}`}
            aria-hidden="true"
          />
        </button>

        {showTripFilters && (
          <div className={styles.accordionContent}>
            <div className={styles.tripControls}>
              <div className={styles.tripSelectWrap}>
                <label className={styles.tripLabel}>Viaje</label>
                <select
                  className={styles.tripSelect}
                  value={activeTripId}
                  disabled={loadingTrips}
                  onChange={(e) => onTripChange(e.target.value)}
                >
                  <option value="">Todos los lugares</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>{trip.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.routeModeWrap}>
                <label className={styles.tripLabel}>Trayecto</label>
                <select
                  className={styles.routeModeSelect}
                  value={routeMode}
                  onChange={(e) => onRouteModeChange(e.target.value)}
                >
                  <option value="none">Sin trayecto</option>
                  <option value="walking">Caminando</option>
                  <option value="driving">Auto</option>
                </select>
              </div>

              <div className={styles.tripActions}>
                <button className={styles.tripBtn} onClick={onNewTrip}>+ Nuevo viaje</button>
                <button className={styles.tripBtn} disabled={!activeTrip} onClick={onEditTrip}>Editar</button>
                <button
                  className={`${styles.tripBtn} ${styles.tripBtnDanger}`}
                  disabled={!activeTrip}
                  onClick={onDeleteTrip}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {activeTrip && (
              <div className={styles.dayFiltersWrap}>
                <label className={styles.tripLabel}>Días del viaje</label>
                <div className={styles.dayFilters}>
                  <button
                    className={`${styles.dayBtn} ${activeTripDay === 'Todos' ? styles.dayBtnActive : ''}`}
                    onClick={() => onTripDayChange('Todos')}
                  >
                    Todos los días
                  </button>
                  {tripDays.map((day) => (
                    <button
                      key={day}
                      className={`${styles.dayBtn} ${Number(activeTripDay) === day ? styles.dayBtnActive : ''}`}
                      onClick={() => onTripDayChange(day)}
                    >
                      Día {day}
                    </button>
                  ))}

                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
