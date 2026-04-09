import { useMemo } from 'react'
import { movePlaceToStart, movePlaceToEnd, pinPlaceAtBothEnds } from '../utils/routeHelpers'

function matchesActiveDay(itemDay, activeTripDay) {
  if (activeTripDay === 'Todos') return true
  return Number(itemDay) === Number(activeTripDay)
}

function toSortValue(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function useFilteredPlaces({ places, activeTripId, trips, search, activeFilter, activeTripDay }) {
  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  )

  const bySearchAndCategory = useMemo(() => {
    const q = search.toLowerCase()
    return places.filter(p => {
      const matchCat = activeFilter === 'Todos'
        || p.category === activeFilter
        || (activeFilter === 'Favoritos' && p.favorite === true)
        || (activeFilter === 'Visitados' && p.visited === true)
      const matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.includes(q))
      return matchCat && matchQ
    })
  }, [places, search, activeFilter])

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

    const allowed = new Set(activeTrip.items.map((item) => item.placeId))
    return bySearchAndCategory.filter((p) => allowed.has(p.id))
  }, [bySearchAndCategory, activeTrip])

  const itineraryEntries = useMemo(() => {
    if (!activeTrip || activeTripDay === 'Todos') return []

    const placesById = new Map(bySearchAndCategory.map((place) => [place.id, place]))
    const extras = activeTrip.extraItems || activeTrip.dayItems || []

    const placeEntries = []
    const seenPlaceIds = new Set()

    ;(activeTrip.items || []).forEach((item, index) => {
      if (!matchesActiveDay(item.day, activeTripDay)) return
      if (seenPlaceIds.has(item.placeId)) return
      const place = placesById.get(item.placeId)
      if (!place) return
      seenPlaceIds.add(item.placeId)
      placeEntries.push({
        kind: 'place',
        key: `place-${item.placeId}`,
        place,
        placeId: item.placeId,
        day: item.day,
        sort: toSortValue(item.sort, index),
        sourceIndex: index,
      })
    })

    const q = search.toLowerCase().trim()
    const extraEntries = extras
      .map((item, index) => ({ ...item, sourceIndex: index }))
      .filter((item) => matchesActiveDay(item.day, activeTripDay))
      .filter((item) => {
        const text = (item.text || '').toLowerCase()
        return !q || text.includes(q)
      })
      .map((item, index) => ({
        kind: 'extra',
        key: `extra-${item.id || item.sourceIndex}`,
        id: item.id || `legacy-${item.sourceIndex}`,
        text: item.text || '',
        day: item.day,
        sort: toSortValue(item.sort, placeEntries.length + index),
        sourceIndex: item.sourceIndex,
      }))

    return [...placeEntries, ...extraEntries].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort
      if (a.kind !== b.kind) return a.kind === 'place' ? -1 : 1
      return a.sourceIndex - b.sourceIndex
    })
  }, [activeTrip, activeTripDay, bySearchAndCategory, search])

  const routePlaces = useMemo(() => {
    if (!activeTrip) return filtered

    let nextRoutePlaces = activeTripDay === 'Todos'
      ? filtered
      : itineraryEntries.filter((entry) => entry.kind === 'place').map((entry) => entry.place)

    if (activeTrip.startPlaceId) {
      nextRoutePlaces = movePlaceToStart(nextRoutePlaces, activeTrip.startPlaceId)
    }

    if (activeTrip.endPlaceId && activeTrip.endPlaceId === activeTrip.startPlaceId) {
      nextRoutePlaces = pinPlaceAtBothEnds(nextRoutePlaces, activeTrip.startPlaceId)
    } else if (activeTrip.endPlaceId) {
      nextRoutePlaces = movePlaceToEnd(nextRoutePlaces, activeTrip.endPlaceId)
    }

    return nextRoutePlaces
  }, [filtered, itineraryEntries, activeTrip, activeTripDay])

  const dayExtras = useMemo(() => {
    if (!activeTrip) return []

    const extras = activeTrip.extraItems || activeTrip.dayItems || []
    const q = search.toLowerCase().trim()

    return extras.filter((item) => {
      const text = (item.text || '').toLowerCase()
      if (q && !text.includes(q)) return false

      if (activeTripDay === 'Todos') return true

      return Number(item.day) === Number(activeTripDay)
    })
  }, [activeTrip, activeTripDay, search])

  const categoryCounts = useMemo(() => {
    const counts = {}
    let source = places

    if (activeTrip) {
      const tripPlaceIds = new Set(activeTrip.items.map(item => item.placeId))
      source = places.filter(p => tripPlaceIds.has(p.id))
    }

    source.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    counts['Favoritos'] = source.filter(p => p.favorite).length
    counts['Visitados'] = source.filter(p => p.visited).length
    return counts
  }, [places, activeTrip])

  return { activeTrip, bySearchAndTrip, filtered, routePlaces, itineraryEntries, dayExtras, categoryCounts, tripDays }
}
