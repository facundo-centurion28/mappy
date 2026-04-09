import { useEffect, useState } from 'react'
import { usePlaces } from './hooks/usePlaces'
import { useTrips } from './hooks/useTrips'
import { useFilteredPlaces } from './hooks/useFilteredPlaces'
import PlaceCard from './components/PlaceCard'
import PlaceForm from './components/PlaceForm'
import PlaceDetail from './components/PlaceDetail'
import MapView from './components/MapView'
import TripForm from './components/TripForm'
import TripCard from './components/TripCard'
import AppHeader from './components/AppHeader'
import FilterBar from './components/FilterBar'
import styles from './App.module.css'
import { getPlaceEmoji } from './data/places'

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

function getDayNotes(trip) {
  if (!trip) return []
  return trip.dayNotes || []
}

function computeDaysFromDates(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 0
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function getDayDate(startDate, dayNumber) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + dayNumber - 1)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
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
  const [view, setView] = useState(initialUiState.activeTripId ? 'trip' : 'home')
  const [search, setSearch] = useState(initialUiState.search || '')
  const [activeFilter, setActiveFilter] = useState(initialUiState.activeFilter || 'Todos')
  const [activeTripId, setActiveTripId] = useState(initialUiState.activeTripId || '')
  const [activeTripDay, setActiveTripDay] = useState(initialUiState.activeTripDay || 'Todos')
  const [showForm, setShowForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)
  const [routeMode, setRouteMode] = useState(initialUiState.routeMode || 'none')
  const [editingPlace, setEditingPlace] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [detailPlace, setDetailPlace] = useState(null)
  const [showQuickExtraInput, setShowQuickExtraInput] = useState(false)
  const [quickExtraText, setQuickExtraText] = useState('')
  const [dayNoteText, setDayNoteText] = useState('')
  const [tripSection, setTripSection] = useState(initialUiState.tripSection || 'lugares')
  const [plannerDay, setPlannerDay] = useState(1)
  const [daysSidebarOpen, setDaysSidebarOpen] = useState(false)
  const [editingExtraId, setEditingExtraId] = useState(null)
  const [editingExtraText, setEditingExtraText] = useState('')

  const { activeTrip, bySearchAndTrip, filtered, routePlaces, itineraryEntries, dayExtras, categoryCounts, tripDays } =
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
      view,
      tripSection,
    })
  }, [search, activeFilter, activeTripId, activeTripDay, routeMode, view, tripSection])

  useEffect(() => {
    if (loadingTrips) return
    if (!activeTripId) return

    const tripStillExists = trips.some((trip) => trip.id === activeTripId)
    if (!tripStillExists) {
      setActiveTripId('')
      setActiveTripDay('Todos')
      setView('home')
    }
  }, [trips, loadingTrips, activeTripId])

  useEffect(() => {
    if (loadingTrips || !activeTrip) return
    if (activeTripDay === 'Todos') return

    const dayExists = tripDays.some((day) => Number(day) === Number(activeTripDay))
    if (!dayExists) {
      setActiveTripDay('Todos')
    }
  }, [activeTrip, activeTripDay, tripDays, loadingTrips])

  useEffect(() => {
    setShowQuickExtraInput(false)
    setQuickExtraText('')
  }, [activeTripId, activeTripDay])

  useEffect(() => {
    if (!activeTrip || activeTripDay === 'Todos') {
      setDayNoteText('')
      return
    }

    const notes = getDayNotes(activeTrip)
    const found = notes.find((note) => Number(note.day) === Number(activeTripDay))
    setDayNoteText(found?.text || '')
  }, [activeTrip, activeTripDay])

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
        setView('trip')
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
    setView('home')
  }

  const handleTripChange = (id) => {
    setActiveTripId(id)
    setActiveTripDay('Todos')
    if (id) {
      setView('trip')
    } else {
      setView('home')
    }
  }

  const handleOpenTrip = (trip) => {
    setActiveTripId(trip.id)
    setActiveTripDay('Todos')
    setView('trip')
  }

  const handleBackToHome = () => {
    setActiveTripId('')
    setActiveTripDay('Todos')
    setView('home')
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
        day: Number(activeTripDay),
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

    const fromIndex = itineraryEntries.findIndex((item) => item.key === entry.key)
    const toIndex = itineraryEntries.findIndex((item) => item.key === swapWith.key)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

    const reorderedEntries = [...itineraryEntries]
    const tempEntry = reorderedEntries[fromIndex]
    reorderedEntries[fromIndex] = reorderedEntries[toIndex]
    reorderedEntries[toIndex] = tempEntry

    const nextItems = [...(activeTrip.items || [])]
    const nextExtraItems = [...(activeTrip.extraItems || activeTrip.dayItems || [])]

    const resolvePlaceIndex = (itineraryItem) => {
      if (itineraryItem.sourceIndex != null) {
        const direct = nextItems[itineraryItem.sourceIndex]
        if (direct && direct.placeId === itineraryItem.placeId && matchesDayFilter(direct.day, activeTripDay)) {
          return itineraryItem.sourceIndex
        }
      }

      return nextItems.findIndex(
        (item) => item.placeId === itineraryItem.placeId && matchesDayFilter(item.day, activeTripDay)
      )
    }

    const resolveExtraIndex = (itineraryItem) => {
      if (itineraryItem.sourceIndex != null) {
        const direct = nextExtraItems[itineraryItem.sourceIndex]
        if (direct && matchesDayFilter(direct.day, activeTripDay)) {
          if (itineraryItem.id && direct.id === itineraryItem.id) return itineraryItem.sourceIndex
          if (!itineraryItem.id && (direct.text || '') === (itineraryItem.text || '')) return itineraryItem.sourceIndex
        }
      }

      if (itineraryItem.id) {
        const byId = nextExtraItems.findIndex(
          (item) => item.id === itineraryItem.id && matchesDayFilter(item.day, activeTripDay)
        )
        if (byId >= 0) return byId
      }

      return -1
    }

    for (let order = 0; order < reorderedEntries.length; order += 1) {
      const itineraryItem = reorderedEntries[order]
      if (itineraryItem.kind === 'place') {
        const placeIndex = resolvePlaceIndex(itineraryItem)
        if (placeIndex >= 0) {
          nextItems[placeIndex] = { ...nextItems[placeIndex], sort: order }
        }
      } else {
        const extraIndex = resolveExtraIndex(itineraryItem)
        if (extraIndex >= 0) {
          nextExtraItems[extraIndex] = { ...nextExtraItems[extraIndex], sort: order }
        }
      }
    }

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

  const handleSaveDayNote = async () => {
    if (!activeTrip || activeTripDay === 'Todos') return

    const normalizedDay = Number(activeTripDay)
    const noteText = dayNoteText.trim()
    const currentNotes = getDayNotes(activeTrip)

    const filteredNotes = currentNotes.filter((note) => {
      if (normalizedDay == null) return note.day != null
      return Number(note.day) !== normalizedDay
    })

    const nextNotes = noteText
      ? [...filteredNotes, { day: normalizedDay, text: noteText }]
      : filteredNotes

    try {
      await updateTrip(activeTrip.id, {
        dayNotes: nextNotes,
      })
    } catch {
      window.alert('No se pudo guardar la descripción del día. Revisá la conexión e intentá de nuevo.')
    }
  }

  const getMaxDaySort = (trip, dayNum) => {
    const itemSorts = (trip.items || []).filter(i => Number(i.day) === dayNum).map(i => Number(i.sort) || 0)
    const extraSorts = (trip.extraItems || trip.dayItems || []).filter(i => Number(i.day) === dayNum).map(i => Number(i.sort) || 0)
    return Math.max(0, ...itemSorts, ...extraSorts)
  }

  const handleAddPlaceToDay = async (placeId, dayNum) => {
    if (!activeTrip) return
    const alreadyAssigned = (activeTrip.items || []).some(
      (item) => item.placeId === placeId && Number(item.day) === dayNum
    )
    if (alreadyAssigned) return

    const nextItems = [
      ...(activeTrip.items || []),
      { placeId, day: dayNum, sort: getMaxDaySort(activeTrip, dayNum) + 1 },
    ]
    try {
      await updateTrip(activeTrip.id, {
        items: nextItems,
        startPlaceId: activeTrip.startPlaceId || '',
        endPlaceId: activeTrip.endPlaceId || '',
      })
    } catch {
      window.alert('No se pudo agregar el lugar al día.')
    }
  }

  const handleRemovePlaceFromDay = async (placeId, dayNum) => {
    if (!activeTrip) return
    const nextItems = (activeTrip.items || []).map(
      (item) => (item.placeId === placeId && Number(item.day) === dayNum)
        ? { ...item, day: null }
        : item
    )
    try {
      await updateTrip(activeTrip.id, {
        items: nextItems,
        startPlaceId: activeTrip.startPlaceId || '',
        endPlaceId: activeTrip.endPlaceId || '',
      })
    } catch {
      window.alert('No se pudo quitar el lugar del día.')
    }
  }

  const handleReorderDayItem = async (entryType, entryId, dayNum, direction) => {
    if (!activeTrip) return
    const items = [...(activeTrip.items || [])]
    const extras = [...(activeTrip.extraItems || activeTrip.dayItems || [])]

    // Build a merged sorted list for this day
    const merged = [
      ...items
        .map((item, idx) => ({ type: 'place', sort: Number(item.sort) || 0, _idx: idx, id: item.placeId }))
        .filter((item) => Number(items[item._idx].day) === dayNum),
      ...extras
        .map((item, idx) => ({ type: 'extra', sort: Number(item.sort) || 0, _idx: idx, id: item.id }))
        .filter((item) => Number(extras[item._idx].day) === dayNum),
    ].sort((a, b) => a.sort - b.sort)

    const pos = merged.findIndex((m) => m.type === entryType && m.id === entryId)
    if (pos < 0) return
    const swapPos = pos + direction
    if (swapPos < 0 || swapPos >= merged.length) return

    // Swap sort values between the two entries
    const a = merged[pos]
    const b = merged[swapPos]
    if (a.type === 'place') items[a._idx] = { ...items[a._idx], sort: b.sort }
    else extras[a._idx] = { ...extras[a._idx], sort: b.sort }
    if (b.type === 'place') items[b._idx] = { ...items[b._idx], sort: a.sort }
    else extras[b._idx] = { ...extras[b._idx], sort: a.sort }

    try {
      await updateTrip(activeTrip.id, { items, extraItems: extras })
    } catch {
      window.alert('No se pudo reordenar.')
    }
  }

  const handleDeleteExtra = async (extraId) => {
    if (!activeTrip) return
    const extras = (activeTrip.extraItems || activeTrip.dayItems || []).filter((item) => item.id !== extraId)
    try {
      await updateTrip(activeTrip.id, { extraItems: extras })
    } catch {
      window.alert('No se pudo eliminar el item extra.')
    }
  }

  const handleUpdateExtra = async (extraId, newText) => {
    if (!activeTrip) return
    const trimmed = newText.trim()
    if (!trimmed) return
    const extras = (activeTrip.extraItems || activeTrip.dayItems || []).map((item) =>
      item.id === extraId ? { ...item, text: trimmed } : item
    )
    try {
      await updateTrip(activeTrip.id, { extraItems: extras })
    } catch {
      window.alert('No se pudo actualizar el item extra.')
    } finally {
      setEditingExtraId(null)
      setEditingExtraText('')
    }
  }

  const handleSavePlannerNote = async (dayNum, text) => {
    if (!activeTrip) return
    const currentNotes = getDayNotes(activeTrip)
    const filteredNotes = currentNotes.filter((n) => Number(n.day) !== dayNum)
    const nextNotes = text.trim()
      ? [...filteredNotes, { day: dayNum, text: text.trim() }]
      : filteredNotes
    try {
      await updateTrip(activeTrip.id, { dayNotes: nextNotes })
    } catch {
      window.alert('No se pudo guardar la nota del día.')
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
        showAddPlace={view === 'trip'}
        showBack={view === 'trip'}
        onBack={handleBackToHome}
      />

      <main className={styles.main}>
        {view === 'home' ? (
          <>
            <div className={styles.homeHeader}>
              <h2 className={styles.homeTitle}>Mis Viajes</h2>
              <button className={styles.btnAdd} onClick={openTripNew}>
                + Nuevo viaje
              </button>
            </div>

            {loadingTrips ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>⏳</span>
                <p>Cargando viajes...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>✈️</span>
                <p>¡Todavía no tenés viajes creados!</p>
                <button className={styles.btnAddEmpty} onClick={openTripNew}>Crear el primero</button>
              </div>
            ) : (
              <div className={styles.tripsGrid}>
                {trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    places={places}
                    onClick={handleOpenTrip}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {activeTrip && (
              <div className={styles.tripDetailHeader}>
                <div className={styles.tripDetailInfo}>
                  <h2 className={styles.tripDetailName}>{activeTrip.name}</h2>
                  {activeTrip.startDate && activeTrip.endDate && (
                    <p className={styles.tripDetailDates}>
                      {formatDateShort(activeTrip.startDate)} – {formatDateShort(activeTrip.endDate)}
                      <span className={styles.tripDetailDayCount}>
                        ({computeDaysFromDates(activeTrip.startDate, activeTrip.endDate)} días)
                      </span>
                    </p>
                  )}
                </div>
                <div className={styles.tripDetailActions}>
                  <button className={styles.tripBtn} onClick={openTripEdit}>Editar</button>
                  <button
                    className={`${styles.tripBtn} ${styles.tripBtnDanger}`}
                    onClick={handleTripDelete}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            <div className={styles.tripTabs}>
              <button
                className={`${styles.tripTab} ${tripSection === 'lugares' ? styles.tripTabActive : ''}`}
                onClick={() => setTripSection('lugares')}
              >
                📍 Lugares
                <span className={styles.tripTabCount}>{filtered.length}</span>
              </button>
              <button
                className={`${styles.tripTab} ${tripSection === 'dias' ? styles.tripTabActive : ''}`}
                onClick={() => setTripSection('dias')}
              >
                📅 Días
                <span className={styles.tripTabCount}>
                  {computeDaysFromDates(activeTrip?.startDate, activeTrip?.endDate) || tripDays.length}
                </span>
              </button>
            </div>

            {tripSection === 'lugares' ? (
              <>
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
          insideTrip
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
                  {filtered.length} {filtered.length === 1 ? 'lugar' : 'lugares'}
                  {activeTrip && dayExtras.length > 0 ? ` · ${dayExtras.length} extra${dayExtras.length === 1 ? '' : 's'}` : ''}
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

              {activeTrip && activeTripDay !== 'Todos' && (
                <div className={styles.dayNoteCard}>
                  <div className={styles.dayNoteHeader}>
                    <p className={styles.dayNoteTitle}>
                      Descripción del día {activeTripDay}
                    </p>
                    <button
                      className={styles.listToolbarBtn}
                      onClick={handleSaveDayNote}
                    >
                      Guardar nota
                    </button>
                  </div>
                  <textarea
                    className={styles.dayNoteInput}
                    value={dayNoteText}
                    onChange={(e) => setDayNoteText(e.target.value)}
                    placeholder="Ej: Día relajado, desayuno temprano, museo al mediodía y cena en Palermo"
                    rows={3}
                  />
                </div>
              )}

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
              </>
            ) : (
              (() => {
                const totalDays = computeDaysFromDates(activeTrip?.startDate, activeTrip?.endDate)
                const dayNumbers = totalDays > 0
                  ? Array.from({ length: totalDays }, (_, i) => i + 1)
                  : tripDays.length > 0
                    ? tripDays
                    : []

                if (dayNumbers.length === 0) {
                  return (
                    <div className={styles.empty}>
                      <span className={styles.emptyIcon}>📅</span>
                      <p>Configurá las fechas del viaje para ver los días, o asigná días a los lugares.</p>
                      <button className={styles.btnAddEmpty} onClick={openTripEdit}>Editar viaje</button>
                    </div>
                  )
                }

                const placesById = new Map(places.map((p) => [p.id, p]))
                const tripItems = activeTrip?.items || []
                const tripExtras = activeTrip?.extraItems || activeTrip?.dayItems || []
                const notes = getDayNotes(activeTrip)

                const safePlannerDay = dayNumbers.includes(plannerDay) ? plannerDay : dayNumbers[0]
                const selectedDayItems = tripItems
                  .filter((item) => Number(item.day) === safePlannerDay)
                const selectedDayPlaces = selectedDayItems
                  .map((item) => placesById.get(item.placeId))
                  .filter(Boolean)
                const uniqueSelectedPlaces = [...new Map(selectedDayPlaces.map((p) => [p.id, p])).values()]
                const selectedDayExtras = tripExtras.filter((item) => Number(item.day) === safePlannerDay)

                // Merged & interleaved list for rendering
                const seenPlaceIds = new Set()
                const mergedDayEntries = [
                  ...selectedDayItems
                    .filter((item) => placesById.has(item.placeId))
                    .filter((item) => {
                      if (seenPlaceIds.has(item.placeId)) return false
                      seenPlaceIds.add(item.placeId)
                      return true
                    })
                    .map((item) => ({ type: 'place', sort: Number(item.sort) || 0, place: placesById.get(item.placeId), id: item.placeId })),
                  ...selectedDayExtras.map((item) => ({ type: 'extra', sort: Number(item.sort) || 0, extra: item, id: item.id })),
                ].sort((a, b) => a.sort - b.sort)

                const selectedDayNote = notes.find((n) => Number(n.day) === safePlannerDay)
                const selectedDayDate = getDayDate(activeTrip?.startDate, safePlannerDay)

                const assignedPlaceIds = new Set(
                  tripItems
                    .filter((item) => Number(item.day) === safePlannerDay)
                    .map((item) => item.placeId)
                )
                const allTripPlaceIds = new Set(tripItems.map((item) => item.placeId))
                const availablePlaces = places.filter(
                  (p) => allTripPlaceIds.has(p.id) && !assignedPlaceIds.has(p.id)
                )

                return (
                  <div className={styles.daysPlannerLayout}>
                    <div className={styles.daysSidebar}>
                      <button
                        className={styles.daysSidebarToggle}
                        onClick={() => setDaysSidebarOpen((prev) => !prev)}
                      >
                        <span className={styles.daysSidebarIcon}>📅</span>
                        <span className={styles.daysSidebarToggleText}>
                          Día {safePlannerDay}
                          {selectedDayDate ? ` · ${selectedDayDate}` : ''}
                        </span>
                        <span className={`${styles.daysSidebarChevron} ${daysSidebarOpen ? styles.daysSidebarChevronOpen : ''}`}>▾</span>
                      </button>
                      <div className={styles.daysSidebarHeader}>
                        <span className={styles.daysSidebarIcon}>📅</span>
                        <span className={styles.daysSidebarTitle}>Días del Viaje</span>
                      </div>
                      <div className={`${styles.daysSidebarList} ${daysSidebarOpen ? styles.daysSidebarListOpen : ''}`}>
                        {dayNumbers.map((dayNum) => {
                          const count = tripItems.filter((item) => Number(item.day) === dayNum).length
                          const dateLabel = getDayDate(activeTrip?.startDate, dayNum)
                          const shortDate = activeTrip?.startDate
                            ? (() => {
                                const d = new Date(activeTrip.startDate + 'T00:00:00')
                                d.setDate(d.getDate() + dayNum - 1)
                                return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                              })()
                            : ''
                          return (
                            <button
                              key={dayNum}
                              className={`${styles.daysSidebarBtn} ${safePlannerDay === dayNum ? styles.daysSidebarBtnActive : ''}`}
                              onClick={() => { setPlannerDay(dayNum); setDaysSidebarOpen(false) }}
                            >
                              <div className={styles.daysSidebarBtnText}>
                                <span className={styles.daysSidebarBtnDay}>Día {dayNum}</span>
                                {shortDate && <span className={styles.daysSidebarBtnDate}>{shortDate}</span>}
                              </div>
                              {count > 0 && <span className={styles.daysSidebarBtnCount}>{count}</span>}
                            </button>
                          )
                        })}


                      </div>
                    </div>

                    <div className={styles.daysPlannerContent}>
                        <>
                          <div className={styles.daysPlannerMap}>
                            <MapView
                              places={uniqueSelectedPlaces}
                              routePlaces={uniqueSelectedPlaces}
                              routeMode={routeMode}
                              themeMode={themeMode}
                              startPlaceId={activeTrip?.startPlaceId || ''}
                              endPlaceId={activeTrip?.endPlaceId || ''}
                              onSelectPlace={setDetailPlace}
                            />
                          </div>

                          <h3 className={styles.daysPlannerTitle}>
                            Lugares planificados para el Día {safePlannerDay}
                            {selectedDayDate && <span className={styles.daysPlannerTitleDate}> · {selectedDayDate}</span>}
                          </h3>

                          {mergedDayEntries.length === 0 ? (
                            <p className={styles.daysPlannerEmpty}>No hay lugares asignados a este día</p>
                          ) : (
                            <div className={styles.daysPlannerList}>
                              {mergedDayEntries.map((entry, index) => entry.type === 'place' ? (
                                <div key={entry.id} className={styles.daysPlannerItem}>
                                  <span className={styles.daysPlannerItemEmoji}>{getPlaceEmoji(entry.place)}</span>
                                  <div className={styles.daysPlannerItemInfo} onClick={() => setDetailPlace(entry.place)} style={{ cursor: 'pointer' }}>
                                    <span className={styles.daysPlannerItemName}>{entry.place.name}</span>
                                    {entry.place.description && <span className={styles.daysPlannerItemDesc}>{entry.place.description}</span>}
                                  </div>
                                  <div className={styles.daysPlannerReorderBtns}>
                                    <button
                                      className={styles.daysPlannerReorderBtn}
                                      onClick={() => handleReorderDayItem('place', entry.id, safePlannerDay, -1)}
                                      disabled={index === 0}
                                      title="Subir"
                                      aria-label="Subir"
                                    >▲</button>
                                    <button
                                      className={styles.daysPlannerReorderBtn}
                                      onClick={() => handleReorderDayItem('place', entry.id, safePlannerDay, 1)}
                                      disabled={index === mergedDayEntries.length - 1}
                                      title="Bajar"
                                      aria-label="Bajar"
                                    >▼</button>
                                  </div>
                                  <button
                                    className={styles.daysPlannerRemoveBtn}
                                    onClick={() => handleRemovePlaceFromDay(entry.id, safePlannerDay)}
                                    title="Quitar del día"
                                    aria-label="Quitar del día"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ) : (
                                <div key={entry.id} className={styles.dayCardExtra}>
                                  <span className={styles.daysPlannerItemEmoji}>⏱️</span>
                                  {editingExtraId === entry.id ? (
                                    <input
                                      className={styles.dayCardExtraEditInput}
                                      value={editingExtraText}
                                      onChange={(e) => setEditingExtraText(e.target.value)}
                                      onBlur={() => handleUpdateExtra(entry.id, editingExtraText)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateExtra(entry.id, editingExtraText)
                                        if (e.key === 'Escape') { setEditingExtraId(null); setEditingExtraText('') }
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className={styles.dayCardExtraText}
                                      onClick={() => { setEditingExtraId(entry.id); setEditingExtraText(entry.extra.text) }}
                                      style={{ cursor: 'pointer' }}
                                      title="Click para editar"
                                    >{entry.extra.text}</span>
                                  )}
                                  <div className={styles.daysPlannerReorderBtns}>
                                    <button
                                      className={styles.daysPlannerReorderBtn}
                                      onClick={() => handleReorderDayItem('extra', entry.id, safePlannerDay, -1)}
                                      disabled={index === 0}
                                      title="Subir"
                                      aria-label="Subir"
                                    >▲</button>
                                    <button
                                      className={styles.daysPlannerReorderBtn}
                                      onClick={() => handleReorderDayItem('extra', entry.id, safePlannerDay, 1)}
                                      disabled={index === mergedDayEntries.length - 1}
                                      title="Bajar"
                                      aria-label="Bajar"
                                    >▼</button>
                                  </div>
                                  <button
                                    className={styles.daysPlannerRemoveBtn}
                                    onClick={() => handleDeleteExtra(entry.id)}
                                    title="Eliminar"
                                    aria-label="Eliminar"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {availablePlaces.length > 0 && (
                            <>
                              <h3 className={styles.daysPlannerTitle} style={{ marginTop: '18px' }}>Lugares disponibles</h3>
                              <div className={styles.daysPlannerList}>
                                {availablePlaces.map((place) => (
                                  <div key={place.id} className={styles.daysPlannerItem}>
                                    <div className={styles.daysPlannerItemInfo} onClick={() => setDetailPlace(place)} style={{ cursor: 'pointer' }}>
                                      <span className={styles.daysPlannerItemName}>{place.name}</span>
                                      {place.category && <span className={styles.daysPlannerItemCat}>{place.category}</span>}
                                    </div>
                                    <button
                                      className={styles.daysPlannerAddBtn}
                                      onClick={() => handleAddPlaceToDay(place.id, safePlannerDay)}
                                      title="Agregar a este día"
                                      aria-label="Agregar a este día"
                                    >
                                      +
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          <h3 className={styles.daysPlannerTitle} style={{ marginTop: '18px' }}>Notas del día</h3>
                          <textarea
                            className={styles.daysPlannerNoteInput}
                            value={selectedDayNote?.text || ''}
                            onChange={(e) => {
                              // optimistic local update via modifying trip notes reference is complex,
                              // so we save on blur
                            }}
                            onBlur={(e) => handleSavePlannerNote(safePlannerDay, e.target.value)}
                            defaultValue={selectedDayNote?.text || ''}
                            placeholder="Ej: Día de llegada y exploración"
                            rows={4}
                            key={`note-${safePlannerDay}`}
                          />
                        </>
                    </div>
                  </div>
                )
              })()
            )}
          </>
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
