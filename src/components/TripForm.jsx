import { useMemo, useState, useEffect, useRef } from 'react'
import styles from './TripForm.module.css'

function toSortValue(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function computeTripDayCount(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 0
}

export default function TripForm({ trip, places, onSave, onClose }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [extraItems, setExtraItems] = useState([])
  const [extraText, setExtraText] = useState('')
  const [extraDay, setExtraDay] = useState('')
  const [startPlaceId, setStartPlaceId] = useState('')
  const [endPlaceId, setEndPlaceId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const submitLockRef = useRef(false)

  const tripDayCount = useMemo(() => computeTripDayCount(startDate, endDate), [startDate, endDate])

  useEffect(() => {
    setName(trip?.name || '')
    setStartDate(trip?.startDate || '')
    setEndDate(trip?.endDate || '')
    setExtraItems(trip?.extraItems || trip?.dayItems || [])
    setStartPlaceId(trip?.startPlaceId || '')
    setEndPlaceId(trip?.endPlaceId || '')
  }, [trip, places])

  // Places already in the trip (for route selectors)
  const tripPlaces = useMemo(() => {
    if (!trip?.items?.length) return []
    const ids = new Set(trip.items.map((item) => item.placeId))
    return places.filter((p) => ids.has(p.id))
  }, [trip, places])

  const addExtraItem = () => {
    const text = extraText.trim()
    if (!text) return

    const parsedDay = Number(extraDay)
    const day = Number.isFinite(parsedDay) && parsedDay > 0 ? Math.floor(parsedDay) : null

    setExtraItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        day,
        sort: prev.length,
      },
    ])

    setExtraText('')
    setExtraDay('')
  }

  const removeExtraItem = (id) => {
    setExtraItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || submitLockRef.current) return

    submitLockRef.current = true
    setIsSaving(true)

    // Preserve existing items as-is
    const items = (trip?.items || []).map((item, index) => ({
      ...item,
      sort: toSortValue(item.sort, index),
    }))

    const includedPlaceIds = new Set(items.map((item) => item.placeId))
    const safeStartPlaceId = includedPlaceIds.has(startPlaceId) ? startPlaceId : ''
    const safeEndPlaceId = includedPlaceIds.has(endPlaceId) ? endPlaceId : ''

    const normalizedExtraItems = extraItems
      .map((item, index) => {
        const text = (item.text || '').trim()
        if (!text) return null
        const parsedDay = Number(item.day)
        return {
          id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
          day: Number.isFinite(parsedDay) && parsedDay > 0 ? Math.floor(parsedDay) : null,
          sort: toSortValue(item.sort, index),
        }
      })
      .filter(Boolean)

    try {
      await onSave({
        name: name.trim(),
        startDate: startDate || '',
        endDate: endDate || '',
        items,
        extraItems: normalizedExtraItems,
        startPlaceId: safeStartPlaceId,
        endPlaceId: safeEndPlaceId,
      })
    } finally {
      submitLockRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalScroll}>
          <div className={styles.header}>
            <h2 className={styles.title}>{trip ? 'Editar viaje' : 'Nuevo viaje'}</h2>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>Nombre del viaje *</label>
            <input
              className={styles.input}
              value={name}
              disabled={isSaving}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Escapada a Montevideo"
              required
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Fechas del viaje</label>
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Inicio</label>
                <input
                  className={styles.input}
                  type="date"
                  value={startDate}
                  disabled={isSaving}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Fin</label>
                <input
                  className={styles.input}
                  type="date"
                  value={endDate}
                  disabled={isSaving}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {tripDayCount > 0 && (
                <div className={styles.dateSummary}>
                  <span className={styles.dateSummaryNumber}>{tripDayCount}</span>
                  <span className={styles.dateSummaryLabel}>{tripDayCount === 1 ? 'día' : 'días'}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTop}>
              <label className={styles.label}>Ruta del mapa</label>
              <span className={styles.count}>Opcional</span>
            </div>

            <div className={styles.routePoints}>
              <div className={styles.routePointField}>
                <label className={styles.routePointLabel}>Inicio</label>
                <select
                  className={styles.select}
                  value={startPlaceId}
                  disabled={isSaving || tripPlaces.length === 0}
                  onChange={(e) => setStartPlaceId(e.target.value)}
                >
                  <option value="">Sin fijar</option>
                  {tripPlaces.map((place) => (
                    <option key={`start-${place.id}`} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.routePointField}>
                <label className={styles.routePointLabel}>Final</label>
                <select
                  className={styles.select}
                  value={endPlaceId}
                  disabled={isSaving || tripPlaces.length === 0}
                  onChange={(e) => setEndPlaceId(e.target.value)}
                >
                  <option value="">Sin fijar</option>
                  {tripPlaces.map((place) => (
                    <option key={`end-${place.id}`} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTop}>
              <label className={styles.label}>Items de tiempo muerto</label>
              <span className={styles.count}>Opcional</span>
            </div>
            <p className={styles.helper}>Agregá actividades que no son lugares del mapa. Si no ponés día, aparecen solo en "Todos los días".</p>

            <div className={styles.extraRow}>
              <input
                className={styles.input}
                value={extraText}
                disabled={isSaving}
                onChange={(e) => setExtraText(e.target.value)}
                placeholder="Ej: merienda / descanso / revisar reservas"
              />
              <input
                className={styles.dayInput}
                type="number"
                min="1"
                value={extraDay}
                disabled={isSaving}
                onChange={(e) => setExtraDay(e.target.value)}
                placeholder="Día"
              />
              <button
                type="button"
                className={styles.selectAllBtn}
                disabled={isSaving || !extraText.trim()}
                onClick={addExtraItem}
              >
                + Agregar
              </button>
            </div>

            {extraItems.length > 0 && (
              <div className={styles.extraList}>
                {extraItems.map((item) => (
                  <div key={item.id} className={styles.extraItem}>
                    <span className={styles.extraItemText}>{item.text}</span>
                    <span className={styles.extraItemDay}>{item.day ? `Día ${item.day}` : 'Sin día'}</span>
                    <button
                      type="button"
                      className={styles.extraItemDelete}
                      disabled={isSaving}
                      onClick={() => removeExtraItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} disabled={isSaving} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : (trip ? 'Guardar viaje' : 'Crear viaje')}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}
