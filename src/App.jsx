import { useState, useMemo } from 'react'
import { usePlaces } from './hooks/usePlaces'
import { useTrips } from './hooks/useTrips'
import { CATEGORIES } from './data/places'
import PlaceCard from './components/PlaceCard'
import PlaceForm from './components/PlaceForm'
import PlaceDetail from './components/PlaceDetail'
import MapView from './components/MapView'
import TripForm from './components/TripForm'
import styles from './App.module.css'

function movePlaceToStart(routePlaces, placeId) {
  const index = routePlaces.findIndex((place) => place.id === placeId)
  if (index <= 0) return routePlaces

  const next = [...routePlaces]
  const [place] = next.splice(index, 1)
  next.unshift(place)
  return next
}

function movePlaceToEnd(routePlaces, placeId) {
  let index = -1

  for (let i = routePlaces.length - 1; i >= 0; i -= 1) {
    if (routePlaces[i].id === placeId) {
      index = i
      break
    }
  }

  if (index === -1 || index === routePlaces.length - 1) return routePlaces

  const next = [...routePlaces]
  const [place] = next.splice(index, 1)
  next.push(place)
  return next
}

function pinPlaceAtBothEnds(routePlaces, placeId) {
  const place = routePlaces.find((item) => item.id === placeId)

  if (!place) return routePlaces

  const middlePlaces = routePlaces.filter((item, index) => {
    if (item.id !== placeId) return true
    return index !== 0 && index !== routePlaces.length - 1
  })

  return [place, ...middlePlaces, place]
}

export default function App() {
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces()
  const { trips, loadingTrips, addTrip, updateTrip, deleteTrip } = useTrips()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [activeTripId, setActiveTripId] = useState('')
  const [activeTripDay, setActiveTripDay] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)
  const [routeMode, setRouteMode] = useState('walking')
  const [editingPlace, setEditingPlace] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [detailPlace, setDetailPlace] = useState(null)

  const bySearchAndCategory = useMemo(() => {
    const q = search.toLowerCase()
    return places.filter(p => {
      const matchCat = activeFilter === 'Todos' || p.category === activeFilter
      const matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.includes(q))
      return matchCat && matchQ
    })
  }, [places, search, activeFilter])

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  )

  // Contar "Todos" con búsqueda + viaje, pero sin filtro de categoría
  const bySearchAndTrip = useMemo(() => {
    const q = search.toLowerCase()
    let result = places.filter(p => {
      const matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.includes(q))
      return matchQ
    })

    if (activeTrip) {
      const allowed = new Set(activeTrip.items.map(item => item.placeId))
      result = result.filter(p => allowed.has(p.id))
    }

    return result
  }, [places, search, activeTrip])

  const tripDays = useMemo(() => {
    if (!activeTrip?.items?.length) return []
    return [...new Set(activeTrip.items.map((i) => Number(i.day)).filter(Boolean))].sort((a, b) => a - b)
  }, [activeTrip])

  const filtered = useMemo(() => {
    if (!activeTrip) return bySearchAndCategory

    const allowed = new Set(
      activeTrip.items
        .filter((item) => activeTripDay === 'Todos' || Number(item.day) === Number(activeTripDay))
        .map((item) => item.placeId)
    )

    return bySearchAndCategory.filter((p) => allowed.has(p.id))
  }, [bySearchAndCategory, activeTrip, activeTripDay])

  const routePlaces = useMemo(() => {
    if (!activeTrip) return filtered

    const placesById = new Map(filtered.map((place) => [place.id, place]))
    const orderedPlaces = [...activeTrip.items]
      .filter((item) => activeTripDay === 'Todos' || Number(item.day) === Number(activeTripDay))
      .sort((a, b) => Number(a.day) - Number(b.day))
      .map((item) => placesById.get(item.placeId))
      .filter(Boolean)

    let nextRoutePlaces = orderedPlaces

    if (activeTrip.startPlaceId) {
      nextRoutePlaces = movePlaceToStart(nextRoutePlaces, activeTrip.startPlaceId)
    }

    if (activeTrip.endPlaceId && activeTrip.endPlaceId === activeTrip.startPlaceId) {
      nextRoutePlaces = pinPlaceAtBothEnds(nextRoutePlaces, activeTrip.startPlaceId)
    } else if (activeTrip.endPlaceId) {
      nextRoutePlaces = movePlaceToEnd(nextRoutePlaces, activeTrip.endPlaceId)
    }

    return nextRoutePlaces
  }, [filtered, activeTrip, activeTripDay])

  const categoryCounts = useMemo(() => {
    const counts = {}
    let source = places
    
    // Si hay un viaje activo, contar solo los lugares del viaje
    if (activeTrip) {
      const tripPlaceIds = new Set(activeTrip.items.map(item => item.placeId))
      source = places.filter(p => tripPlaceIds.has(p.id))
    }
    
    source.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    return counts
  }, [places, activeTrip])

  const handleSave = (data) => {
    if (editingPlace) {
      const { id, ...updateData } = data
      updatePlace(editingPlace.id, updateData)
      setDetailPlace({ ...editingPlace, ...updateData })
    } else {
      addPlace(data)
    }
    setShowForm(false)
    setEditingPlace(null)
  }

  const handleEdit = (place) => {
    setEditingPlace(place)
    setDetailPlace(null)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    deletePlace(id)
    setDetailPlace(null)
  }

  const openNew = () => {
    setEditingPlace(null)
    setShowForm(true)
  }

  const openTripNew = () => {
    setEditingTrip(null)
    setShowTripForm(true)
  }

  const openTripEdit = () => {
    if (!activeTrip) return
    setEditingTrip(activeTrip)
    setShowTripForm(true)
  }

  const handleTripSave = async (data) => {
    if (editingTrip) {
      await updateTrip(editingTrip.id, data)
    } else {
      const ref = await addTrip(data)
      setActiveTripId(ref.id)
      setActiveTripDay('Todos')
    }
    setEditingTrip(null)
    setShowTripForm(false)
  }

  const handleTripDelete = async () => {
    if (!activeTrip) return
    if (!window.confirm(`¿Eliminar viaje "${activeTrip.name}"?`)) return
    await deleteTrip(activeTrip.id)
    setActiveTripId('')
    setActiveTripDay('Todos')
  }

  const handleTripChange = (id) => {
    setActiveTripId(id)
    setActiveTripDay('Todos')
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoSection}>
            <img src="/img/logo.png" alt="Mappy Logo" className={styles.logoImg} />
            <div>
              <h1 className={styles.logo}>Mappy</h1>
              <p className={styles.tagline}>{places.length} {places.length === 1 ? 'lugar guardado' : 'lugares guardados'}</p>
            </div>
          </div>
          <button className={styles.btnAdd} onClick={openNew}>
            + Agregar lugar
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar por nombre, descripción o etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.filters}>
            {['Todos', ...CATEGORIES.map(c => c.label)].map(cat => {
              const count = cat === 'Todos' ? bySearchAndTrip.length : (categoryCounts[cat] || 0)
              if (cat !== 'Todos' && count === 0) return null
              return (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat} {count > 0 && <span className={styles.filterCount}>{count}</span>}
                </button>
              )
            })}
          </div>

          <div className={styles.tripControls}>
            <div className={styles.tripSelectWrap}>
              <label className={styles.tripLabel}>Viaje</label>
              <select
                className={styles.tripSelect}
                value={activeTripId}
                disabled={loadingTrips}
                onChange={(e) => handleTripChange(e.target.value)}
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
                onChange={(e) => setRouteMode(e.target.value)}
              >
                <option value="none">Sin trayecto</option>
                <option value="walking">Caminando</option>
                <option value="driving">Auto</option>
              </select>
            </div>

            <div className={styles.tripActions}>
              <button className={styles.tripBtn} onClick={openTripNew}>+ Nuevo viaje</button>
              <button className={styles.tripBtn} disabled={!activeTrip} onClick={openTripEdit}>Editar</button>
              <button className={`${styles.tripBtn} ${styles.tripBtnDanger}`} disabled={!activeTrip} onClick={handleTripDelete}>Eliminar</button>
            </div>
          </div>

          {activeTrip && (
            <div className={styles.dayFilters}>
              <button
                className={`${styles.dayBtn} ${activeTripDay === 'Todos' ? styles.dayBtnActive : ''}`}
                onClick={() => setActiveTripDay('Todos')}
              >
                Todos los días
              </button>
              {tripDays.map((day) => (
                <button
                  key={day}
                  className={`${styles.dayBtn} ${Number(activeTripDay) === day ? styles.dayBtnActive : ''}`}
                  onClick={() => setActiveTripDay(day)}
                >
                  Día {day}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⏳</span>
            <p>Cargando lugares...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🗺️</span>
            <p>{search || activeFilter !== 'Todos' ? 'No hay lugares que coincidan.' : '¡Todavía no tenés lugares guardados!'}</p>
            {!search && activeFilter === 'Todos' && (
              <button className={styles.btnAddEmpty} onClick={openNew}>Agregar el primero</button>
            )}
          </div>
        ) : (
          <div className={styles.splitLayout}>
            <div className={styles.mapPanel}>
              <MapView
                places={filtered}
                routePlaces={routePlaces}
                routeMode={routeMode}
                startPlaceId={activeTrip?.startPlaceId || ''}
                endPlaceId={activeTrip?.endPlaceId || ''}
                onSelectPlace={setDetailPlace}
              />
            </div>
            <div className={styles.listPanel}>
              <div className={styles.grid}>
                {filtered.map(place => (
                  <PlaceCard key={place.id} place={place} onClick={setDetailPlace} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <PlaceForm
          place={editingPlace}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingPlace(null) }}
        />
      )}

      {showTripForm && (
        <TripForm
          trip={editingTrip}
          places={places}
          onSave={handleTripSave}
          onClose={() => { setShowTripForm(false); setEditingTrip(null) }}
        />
      )}

      {detailPlace && (
        <PlaceDetail
          place={detailPlace}
          onClose={() => setDetailPlace(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
