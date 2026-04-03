import { useMemo, useState, useEffect, useRef } from 'react'
import { getPlaceEmoji } from '../data/places'
import styles from './TripForm.module.css'

function parseDays(value) {
  return [...new Set(
    value
      .split(',')
      .map((part) => Number(part.trim()))
      .filter(Boolean)
      .map((day) => Math.max(1, day))
  )].sort((a, b) => a - b)
}

function buildInitialAssignments(places, trip) {
  const byPlace = Object.fromEntries(
    places.map((p) => [p.id, { enabled: false, days: '' }])
  )

  if (trip?.items?.length) {
    const groupedDays = {}

    trip.items.forEach((item) => {
      if (byPlace[item.placeId]) {
        const normalizedDay = Math.max(1, Number(item.day) || 1)
        groupedDays[item.placeId] = [...(groupedDays[item.placeId] || []), normalizedDay]
      }
    })

    Object.entries(groupedDays).forEach(([placeId, days]) => {
      byPlace[placeId] = {
        enabled: true,
        days: parseDays(days.join(',')).join(', '),
      }
    })
  }

  return byPlace
}

export default function TripForm({ trip, places, onSave, onClose }) {
  const [name, setName] = useState('')
  const [assignments, setAssignments] = useState({})
  const [startPlaceId, setStartPlaceId] = useState('')
  const [endPlaceId, setEndPlaceId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const submitLockRef = useRef(false)

  useEffect(() => {
    setName(trip?.name || '')
    setAssignments(buildInitialAssignments(places, trip))
    setStartPlaceId(trip?.startPlaceId || '')
    setEndPlaceId(trip?.endPlaceId || '')
  }, [trip, places])

  const selectedCount = useMemo(
    () => Object.values(assignments).filter((a) => a?.enabled).length,
    [assignments]
  )

  const selectedPlaces = useMemo(
    () => places.filter((place) => assignments[place.id]?.enabled),
    [places, assignments]
  )

  const togglePlace = (placeId, enabled) => {
    setAssignments((prev) => ({
      ...prev,
      [placeId]: {
        enabled,
        days: enabled ? (prev[placeId]?.days || '1') : (prev[placeId]?.days || ''),
      },
    }))

    if (!enabled) {
      setStartPlaceId((prev) => (prev === placeId ? '' : prev))
      setEndPlaceId((prev) => (prev === placeId ? '' : prev))
    }
  }

  const setDays = (placeId, days) => {
    if (!/^[\d,\s]*$/.test(days)) return
    setAssignments((prev) => ({
      ...prev,
      [placeId]: {
        enabled: prev[placeId]?.enabled || false,
        days,
      },
    }))
  }

  const normalizeDaysOnBlur = (placeId) => {
    setAssignments((prev) => {
      const item = prev[placeId]
      if (!item?.enabled) return prev
      const normalized = parseDays(item.days)
      return {
        ...prev,
        [placeId]: {
          ...item,
          days: (normalized.length ? normalized : [1]).join(', '),
        },
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || submitLockRef.current) return

    submitLockRef.current = true
    setIsSaving(true)

    const items = Object.entries(assignments)
      .filter(([, value]) => value?.enabled)
      .flatMap(([placeId, value]) => {
        const days = parseDays(value.days)
        const normalizedDays = days.length ? days : [1]
        return normalizedDays.map((day) => ({ placeId, day }))
      })

    const includedPlaceIds = new Set(items.map((item) => item.placeId))
    const safeStartPlaceId = includedPlaceIds.has(startPlaceId) ? startPlaceId : ''
    const safeEndPlaceId = includedPlaceIds.has(endPlaceId)
      ? endPlaceId
      : ''

    try {
      await onSave({
        name: name.trim(),
        items,
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
            <div className={styles.sectionTop}>
              <label className={styles.label}>Lugares y días asignados</label>
              <span className={styles.count}>{selectedCount} seleccionados</span>
            </div>
            <p className={styles.helper}>Podés repetir un lugar en varios días separando los números con coma.</p>

            <div className={styles.list}>
              {places.map((place) => {
                const data = assignments[place.id] || { enabled: false, days: '' }
                return (
                  <div
                    key={place.id}
                    className={`${styles.row} ${data.enabled ? styles.rowSelected : styles.rowUnselected}`}
                  >
                    <label className={styles.placeLabel}>
                      <input
                        type="checkbox"
                        checked={data.enabled}
                        disabled={isSaving}
                        onChange={(e) => togglePlace(place.id, e.target.checked)}
                      />
                      <span className={styles.placeName}>{getPlaceEmoji(place)} {place.name}</span>
                    </label>
                    <div className={`${styles.dayWrap} ${!data.enabled ? styles.dayWrapDisabled : ''}`}>
                      <span>Días</span>
                      <input
                        className={styles.dayInput}
                        type="text"
                        inputMode="numeric"
                        value={data.days}
                        disabled={!data.enabled || isSaving}
                        placeholder="1, 3"
                        onChange={(e) => setDays(place.id, e.target.value)}
                        onBlur={() => normalizeDaysOnBlur(place.id)}
                      />
                    </div>
                  </div>
                )
              })}
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
                  disabled={isSaving || selectedPlaces.length === 0}
                  onChange={(e) => setStartPlaceId(e.target.value)}
                >
                  <option value="">Sin fijar</option>
                  {selectedPlaces.map((place) => (
                    <option key={`start-${place.id}`} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.routePointField}>
                <label className={styles.routePointLabel}>Final</label>
                <select
                  className={styles.select}
                  value={endPlaceId}
                  disabled={isSaving || selectedPlaces.length === 0}
                  onChange={(e) => setEndPlaceId(e.target.value)}
                >
                  <option value="">Sin fijar</option>
                  {selectedPlaces.map((place) => (
                    <option key={`end-${place.id}`} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
  )
}
