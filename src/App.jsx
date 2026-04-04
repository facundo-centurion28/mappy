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

const UI_STATE_KEY = 'mappy-ui-state-v1'

function readUiState() {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(UI_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeUiState(state) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

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

function hasAssignedDay(value) {
  return value != null && value !== '' && !Number.isNaN(Number(value))
}

function matchesDayFilter(day, activeTripDay) {
  if (activeTripDay === 'Todos') return true
  if (activeTripDay === 'sin-dia') return !hasAssignedDay(day)
  return Number(day) === Number(activeTripDay)
}

function toSortValue(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function getNextSortForDay(activeTrip, activeTripDay) {
  if (!activeTrip) return 0
  const placeSorts = (activeTrip.items || [])
    .filter((item, index) => matchesDayFilter(item.day, activeTripDay) || (!hasAssignedDay(item.day) && activeTripDay === 'Todos'))
    .map((item, index) => toSortValue(item.sort, index))
  const extraSorts = (activeTrip.extraItems || activeTrip.dayItems || [])
    .filter((item, index) => matchesDayFilter(item.day, activeTripDay) || (!hasAssignedDay(item.day) && activeTripDay === 'Todos'))
    .map((item, index) => toSortValue(item.sort, placeSorts.length + index))

  const maxSort = Math.max(-1, ...placeSorts, ...extraSorts)
  return maxSort + 1
}

export default function App() {
  const initialUiState = readUiState()
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces()
  const { trips, loadingTrips, addTrip, updateTrip, deleteTrip } = useTrips()
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('mappy-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [search, setSearch] = useState(initialUiState.search || '')
  const [activeFilter, setActiveFilter] = useState(initialUiState.activeFilter || 'Todos')
  const [activeTripId, setActiveTripId] = useState(initialUiState.activeTripId || '')
  const [activeTripDay, setActiveTripDay] = useState(initialUiState.activeTripDay || 'Todos')
  const [showForm, setShowForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)
  const [routeMode, setRouteMode] = useState(initialUiState.routeMode || 'walking')
  const [editingPlace, setEditingPlace] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [detailPlace, setDetailPlace] = useState(null)
  const [showQuickExtraInput, setShowQuickExtraInput] = useState(false)
  const [quickExtraText, setQuickExtraText] = useState('')

  const { activeTrip, bySearchAndTrip, filtered, routePlaces, itineraryEntries, dayExtras, categoryCounts, tripDays, hasUnassignedDay } =
    useFilteredPlaces({ places, activeTripId, trips, search, activeFilter, activeTripDay })

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    localStorage.setItem('mappy-theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    writeUiState({
      search,
      activeFilter,
      activeTripId,
      activeTripDay,
      routeMode,
    })
  }, [search, activeFilter, activeTripId, activeTripDay, routeMode])

  useEffect(() => {
    if (loadingTrips) return
    if (!activeTripId) return

    const tripStillExists = trips.some((trip) => trip.id === activeTripId)
    if (!tripStillExists) {
      setActiveTripId('')
      setActiveTripDay('Todos')
    }
  }, [trips, loadingTrips, activeTripId])

  useEffect(() => {
    if (loadingTrips || !activeTrip) return
    if (activeTripDay === 'Todos' || activeTripDay === 'sin-dia') return

    const dayExists = tripDays.some((day) => Number(day) === Number(activeTripDay))
    if (!dayExists) {
      setActiveTripDay('Todos')
    }
  }, [activeTrip, activeTripDay, tripDays, loadingTrips])

  useEffect(() => {
    setShowQuickExtraInput(false)
    setQuickExtraText('')
  }, [activeTripId, activeTripDay])

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
          const newItemDay = getDefaultDayForNewTripItem(activeTrip, activeTripDay)
          const nextItems = [
            ...activeTrip.items,
            {
              placeId: ref.id,
              day: newItemDay,
              sort: getNextSortForDay(activeTrip, newItemDay),
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
    try {
      if (editingTrip) {
        await updateTrip(editingTrip.id, data)
      } else {
        const ref = await addTrip(data)
        setActiveTripId(ref.id)
        setActiveTripDay('Todos')
      }
      setEditingTrip(null)
      setShowTripForm(false)
    } catch {
      window.alert('No se pudo guardar el viaje. Si agregaste items de tiempo muerto, revisá que las reglas de Firestore estén actualizadas.')
    }
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

  const handleAddQuickExtraItem = async () => {
    if (!activeTrip || activeTripDay === 'Todos') return

    const text = quickExtraText.trim()
    if (!text) return

    const nextExtraItems = [
      ...(activeTrip.extraItems || activeTrip.dayItems || []),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        day: activeTripDay === 'sin-dia' ? null : Number(activeTripDay),
        sort: getNextSortForDay(activeTrip, activeTripDay),
      },
    ]

    try {
      await updateTrip(activeTrip.id, {
        items: activeTrip.items || [],
        extraItems: nextExtraItems,
        startPlaceId: activeTrip.startPlaceId || '',
        endPlaceId: activeTrip.endPlaceId || '',
      })
      setQuickExtraText('')
      setShowQuickExtraInput(false)
    } catch {
      window.alert('No se pudo agregar el item extra. Revisá la conexión e intentá de nuevo.')
    }
  }

  const handleMoveItineraryEntry = async (entry, swapWith) => {
    if (!activeTrip || activeTripDay === 'Todos') return

    const nextItems = [...(activeTrip.items || [])]
    const nextExtraItems = [...(activeTrip.extraItems || activeTrip.dayItems || [])]

    const findPlaceIndex = (placeId) => nextItems.findIndex(
      (item) => item.placeId === placeId && matchesDayFilter(item.day, activeTripDay)
    )

    const findExtraIndex = (extraId) => nextExtraItems.findIndex(
      (item) => item.id === extraId && matchesDayFilter(item.day, activeTripDay)
    )

    const entryPlaceIndex = entry.kind === 'place' ? findPlaceIndex(entry.placeId) : -1
    const entryExtraIndex = entry.kind === 'extra' ? findExtraIndex(entry.id) : -1
    const swapPlaceIndex = swapWith.kind === 'place' ? findPlaceIndex(swapWith.placeId) : -1
    const swapExtraIndex = swapWith.kind === 'extra' ? findExtraIndex(swapWith.id) : -1

    const entrySort = entry.kind === 'place'
      ? toSortValue(nextItems[entryPlaceIndex]?.sort, entry.sourceIndex)
      : toSortValue(nextExtraItems[entryExtraIndex]?.sort, entry.sourceIndex)

    const swapSort = swapWith.kind === 'place'
      ? toSortValue(nextItems[swapPlaceIndex]?.sort, swapWith.sourceIndex)
      : toSortValue(nextExtraItems[swapExtraIndex]?.sort, swapWith.sourceIndex)

    if (entry.kind === 'place' && entryPlaceIndex >= 0) nextItems[entryPlaceIndex] = { ...nextItems[entryPlaceIndex], sort: swapSort }
    if (entry.kind === 'extra' && entryExtraIndex >= 0) nextExtraItems[entryExtraIndex] = { ...nextExtraItems[entryExtraIndex], sort: swapSort }
    if (swapWith.kind === 'place' && swapPlaceIndex >= 0) nextItems[swapPlaceIndex] = { ...nextItems[swapPlaceIndex], sort: entrySort }
    if (swapWith.kind === 'extra' && swapExtraIndex >= 0) nextExtraItems[swapExtraIndex] = { ...nextExtraItems[swapExtraIndex], sort: entrySort }

    try {
      await updateTrip(activeTrip.id, {
        items: nextItems,
        extraItems: nextExtraItems,
        startPlaceId: activeTrip.startPlaceId || '',
        endPlaceId: activeTrip.endPlaceId || '',
      })
    } catch {
      window.alert('No se pudo reordenar la ruta del día. Revisá la conexión e intentá de nuevo.')
    }
  }

  const visibleCount = activeTrip && activeTripDay !== 'Todos'
    ? itineraryEntries.length
    : (filtered.length + (activeTrip ? dayExtras.length : 0))

  return (
    <div className={styles.app}>
      <div className={styles.bgGlow} aria-hidden="true">
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
      </div>
      <AppHeader
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
          hasUnassignedDay={hasUnassignedDay}
        />

        {loading ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⏳</span>
            <p>Cargando lugares...</p>
          </div>
        ) : visibleCount === 0 ? (
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
                  {visibleCount} items visibles · {filtered.length} de {places.length} {places.length === 1 ? 'lugar' : 'lugares'}
                </p>
                {activeTrip && activeTripDay !== 'Todos' && (
                  showQuickExtraInput ? (
                    <div className={styles.listToolbarInlineForm}>
                      <input
                        className={styles.listToolbarInput}
                        value={quickExtraText}
                        onChange={(e) => setQuickExtraText(e.target.value)}
                        placeholder="Escribí un item extra..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddQuickExtraItem()
                          }
                          if (e.key === 'Escape') {
                            setShowQuickExtraInput(false)
                            setQuickExtraText('')
                          }
                        }}
                        autoFocus
                      />
                      <button
                        className={styles.listToolbarBtn}
                        onClick={handleAddQuickExtraItem}
                        disabled={!quickExtraText.trim()}
                      >
                        Guardar
                      </button>
                      <button
                        className={styles.listToolbarBtnSecondary}
                        onClick={() => {
                          setShowQuickExtraInput(false)
                          setQuickExtraText('')
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.listToolbarBtn}
                      onClick={() => setShowQuickExtraInput(true)}
                    >
                      + Item extra
                    </button>
                  )
                )}
              </div>
              <div className={`${styles.grid} ${styles.gridList}`}>
                {activeTrip && activeTripDay !== 'Todos' ? (
                  itineraryEntries.map((entry, index) => {
                    if (entry.kind === 'place') {
                      return (
                        <PlaceCard
                          key={entry.key}
                          place={entry.place}
                          layout="list"
                          onClick={setDetailPlace}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleVisited={handleToggleVisited}
                          onMoveUp={index > 0 ? () => handleMoveItineraryEntry(entry, itineraryEntries[index - 1]) : null}
                          onMoveDown={index < itineraryEntries.length - 1 ? () => handleMoveItineraryEntry(entry, itineraryEntries[index + 1]) : null}
                        />
                      )
                    }

                    return (
                      <article key={entry.key} className={styles.extraDayCard}>
                        <div className={styles.extraDayIcon}>🕒</div>
                        <div className={styles.extraDayBody}>
                          <p className={styles.extraDayTitle}>{entry.text}</p>
                          <p className={styles.extraDayMeta}>{entry.day ? `Día ${entry.day}` : 'Sin día asignado'}</p>
                        </div>
                        <div className={styles.extraDayActions}>
                          <button
                            className={styles.extraDayMoveBtn}
                            onClick={() => handleMoveItineraryEntry(entry, itineraryEntries[index - 1])}
                            disabled={index === 0}
                            title="Subir en el itinerario"
                          >
                            ↑
                          </button>
                          <button
                            className={styles.extraDayMoveBtn}
                            onClick={() => handleMoveItineraryEntry(entry, itineraryEntries[index + 1])}
                            disabled={index === itineraryEntries.length - 1}
                            title="Bajar en el itinerario"
                          >
                            ↓
                          </button>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <>
                    {filtered.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        layout="list"
                        onClick={setDetailPlace}
                        onToggleFavorite={handleToggleFavorite}
                        onToggleVisited={handleToggleVisited}
                      />
                    ))}

                    {activeTrip && dayExtras.map((item) => (
                      <article key={`extra-${item.id}`} className={styles.extraDayCard}>
                        <div className={styles.extraDayIcon}>🕒</div>
                        <div className={styles.extraDayBody}>
                          <p className={styles.extraDayTitle}>{item.text}</p>
                          <p className={styles.extraDayMeta}>{item.day ? `Día ${item.day}` : 'Sin día asignado'}</p>
                        </div>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

        <footer className={styles.footer}>
          <p className={styles.footerText}>Hecho por Facu para viajar con Yosi ❤️ - 2026</p>
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
