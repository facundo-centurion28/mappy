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

function toSortValue(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function buildInitialAssignments(places, trip) {
  const byPlace = Object.fromEntries(
    places.map((p) => [p.id, { enabled: false, days: '' }])
  )

  if (trip?.items?.length) {
    const groupedDays = {}

    trip.items.forEach((item) => {
      if (byPlace[item.placeId]) {
        if (!groupedDays[item.placeId]) {
          groupedDays[item.placeId] = { days: [], hasUnassigned: false }
        }

        const parsedDay = Number(item.day)
        if (Number.isFinite(parsedDay) && parsedDay > 0) {
          groupedDays[item.placeId].days.push(Math.floor(parsedDay))
        } else {
          groupedDays[item.placeId].hasUnassigned = true
        }
      }
    })

    Object.entries(groupedDays).forEach(([placeId, bucket]) => {
      const normalizedDays = parseDays(bucket.days.join(',')).join(', ')
      byPlace[placeId] = {
        enabled: true,
        days: normalizedDays,
      }
    })
  }

  return byPlace
}

export default function TripForm({ trip, places, onSave, onClose }) {
  const [name, setName] = useState('')
  const [assignments, setAssignments] = useState({})
  const [extraItems, setExtraItems] = useState([])
  const [extraText, setExtraText] = useState('')
  const [extraDay, setExtraDay] = useState('')
  const [startPlaceId, setStartPlaceId] = useState('')
  const [endPlaceId, setEndPlaceId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const submitLockRef = useRef(false)

  useEffect(() => {
    setName(trip?.name || '')
    setAssignments(buildInitialAssignments(places, trip))
    setExtraItems(trip?.extraItems || trip?.dayItems || [])
    setStartPlaceId(trip?.startPlaceId || '')
    setEndPlaceId(trip?.endPlaceId || '')
  }, [trip, places])

  const selectedCount = useMemo(
    () => Object.values(assignments).filter((a) => a?.enabled).length,
    [assignments]
  )

  const allSelected = places.length > 0 && selectedCount === places.length

  const toggleAll = () => {
    if (allSelected) {
      setAssignments(buildInitialAssignments(places, null))
      setStartPlaceId('')
      setEndPlaceId('')
    } else {
      setAssignments(
        Object.fromEntries(places.map((p) => [p.id, { enabled: true, days: '1' }]))
      )
    }
  }

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
          days: normalized.join(', '),
        },
      }
    })
  }

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

    const existingSortByKey = new Map(
      (trip?.items || []).map((item, index) => {
        const day = Number.isFinite(Number(item.day)) && Number(item.day) > 0
          ? Math.floor(Number(item.day))
          : null
        return [`${item.placeId}::${day ?? 'sin-dia'}`, toSortValue(item.sort, index)]
      })
    )

    const maxExistingSort = Math.max(-1, ...(trip?.items || []).map((item, index) => toSortValue(item.sort, index)))
    let nextSort = maxExistingSort + 1

    const items = Object.entries(assignments)
      .filter(([, value]) => value?.enabled)
      .flatMap(([placeId, value]) => {
        const days = parseDays(value.days)
        if (days.length === 0) return [{ placeId, day: null }]
        return days.map((day) => ({ placeId, day }))
      })
      .map((item) => {
        const key = `${item.placeId}::${item.day ?? 'sin-dia'}`
        const existingSort = existingSortByKey.get(key)
        if (existingSort != null) {
          return { ...item, sort: existingSort }
        }

        const assignedSort = nextSort
        nextSort += 1
        return { ...item, sort: assignedSort }
      })

    const includedPlaceIds = new Set(items.map((item) => item.placeId))
    const safeStartPlaceId = includedPlaceIds.has(startPlaceId) ? startPlaceId : ''
    const safeEndPlaceId = includedPlaceIds.has(endPlaceId)
      ? endPlaceId
      : ''

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
            <div className={styles.sectionTop}>
              <label className={styles.label}>Lugares y días asignados</label>
              <div className={styles.sectionTopRight}>
                <span className={styles.count}>{selectedCount} seleccionados</span>
                <button
                  type="button"
                  className={styles.selectAllBtn}
                  onClick={toggleAll}
                  disabled={isSaving || places.length === 0}
                >
                  {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
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
