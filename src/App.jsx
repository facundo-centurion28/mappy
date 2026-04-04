import { useEffect, useState } from 'react'
import { usePlaces } from './hooks/usePlaces'
import { useTrips } from './hooks/useTrips'
import { useFilteredPlaces } from './hooks/useFilteredPlaces'
import PlaceCard from './components/PlaceCard'
import PlaceForm from './components/PlaceForm'
import PlaceDetail from './components/PlaceDetail'
import MapView from './components/MapView'
import TripForm from './components/TripForm'
import AppHeader from './components/AppHeader'
import FilterBar from './components/FilterBar'
import styles from './App.module.css'

function getDefaultDayForNewTripItem(activeTrip, activeTripDay) {
  if (activeTripDay !== 'Todos') {
    const selectedDay = Number(activeTripDay)
    if (Number.isFinite(selectedDay) && selectedDay > 0) return selectedDay
  }

  const maxDay = Math.max(
    1,
    ...(activeTrip?.items || [])
      .map((item) => Number(item.day))
      .filter((day) => Number.isFinite(day) && day > 0)
  )

  return maxDay
}

export default function App() {
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces()
  const { trips, loadingTrips, addTrip, updateTrip, deleteTrip } = useTrips()
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('mappy-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [activeTripId, setActiveTripId] = useState('')
  const [activeTripDay, setActiveTripDay] = useState('Todos')
  const [viewMode, setViewMode] = useState('grid')
  const [showForm, setShowForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)
  const [routeMode, setRouteMode] = useState('walking')
  const [editingPlace, setEditingPlace] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [detailPlace, setDetailPlace] = useState(null)

  const { activeTrip, bySearchAndTrip, filtered, routePlaces, categoryCounts, tripDays } =
    useFilteredPlaces({ places, activeTripId, trips, search, activeFilter, activeTripDay })

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    localStorage.setItem('mappy-theme', themeMode)
  }, [themeMode])

  const handleToggleFavorite = async (place) => {
    try {
      const nextFavorite = !place.favorite
      await updatePlace(place.id, { favorite: nextFavorite })
      if (detailPlace?.id === place.id) {
        setDetailPlace(prev => ({ ...prev, favorite: nextFavorite }))
      }
    } catch {
      window.alert('No se pudo guardar el favorito. Revisá las reglas o la conexión.')
    }
  }

  const handleToggleVisited = async (place) => {
    try {
      const nextVisited = !place.visited
      await updatePlace(place.id, { visited: nextVisited })
      if (detailPlace?.id === place.id) {
        setDetailPlace(prev => ({ ...prev, visited: nextVisited }))
      }
    } catch {
      window.alert('No se pudo guardar el estado de visitado. Revisá las reglas o la conexión.')
    }
  }

  const handleSave = async (data) => {
    if (editingPlace) {
      const { id, ...updateData } = data
      try {
        await updatePlace(editingPlace.id, updateData)
        setDetailPlace({ ...editingPlace, ...updateData })
      } catch {
        window.alert('No se pudo guardar el lugar. Revisá las reglas o la conexión.')
        return
      }
    } else {
      try {
        const ref = await addPlace(data)

        if (activeTrip && !activeTrip.items.some((item) => item.placeId === ref.id)) {
          const nextItems = [
            ...activeTrip.items,
            {
              placeId: ref.id,
              day: getDefaultDayForNewTripItem(activeTrip, activeTripDay),
            },
          ]

          await updateTrip(activeTrip.id, {
            items: nextItems,
            startPlaceId: activeTrip.startPlaceId || '',
            endPlaceId: activeTrip.endPlaceId || '',
          })
        }
      } catch {
        window.alert('No se pudo crear el lugar o agregarlo al viaje activo. Revisá las reglas o la conexión.')
        return
      }
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
      <AppHeader
        placesCount={places.length}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')}
        onAddPlace={openNew}
      />

      <main className={styles.main}>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          bySearchAndTrip={bySearchAndTrip}
          categoryCounts={categoryCounts}
          activeTripId={activeTripId}
          onTripChange={handleTripChange}
          loadingTrips={loadingTrips}
          trips={trips}
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          onNewTrip={openTripNew}
          activeTrip={activeTrip}
          onEditTrip={openTripEdit}
          onDeleteTrip={handleTripDelete}
          activeTripDay={activeTripDay}
          onTripDayChange={setActiveTripDay}
          tripDays={tripDays}
        />

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
                themeMode={themeMode}
                startPlaceId={activeTrip?.startPlaceId || ''}
                endPlaceId={activeTrip?.endPlaceId || ''}
                onSelectPlace={setDetailPlace}
              />
            </div>
            <div className={styles.listPanel}>
              <div className={styles.listToolbar}>
                <p className={styles.listToolbarInfo}>
                  {filtered.length} {filtered.length === 1 ? 'lugar visible' : 'lugares visibles'}
                </p>
                <div className={styles.viewModes}>
                  <button
                    className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    Cards
                  </button>
                  <button
                    className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    Lista
                  </button>
                </div>
              </div>
              <div className={`${styles.grid} ${viewMode === 'list' ? styles.gridList : ''}`}>
                {filtered.map(place => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    layout={viewMode}
                    onClick={setDetailPlace}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleVisited={handleToggleVisited}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

        <footer className={styles.footer}>
          <p className={styles.footerText}>Hecho por Facu para viajar con Yosi - 2026</p>
        </footer>

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
          onToggleFavorite={handleToggleFavorite}
          onToggleVisited={handleToggleVisited}
        />
      )}
    </div>
  )
}
