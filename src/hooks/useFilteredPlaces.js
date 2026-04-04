import { useMemo } from 'react'
import { movePlaceToStart, movePlaceToEnd, pinPlaceAtBothEnds } from '../utils/routeHelpers'

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

    if (activeTrip) {
      const tripPlaceIds = new Set(activeTrip.items.map(item => item.placeId))
      source = places.filter(p => tripPlaceIds.has(p.id))
    }

    source.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    counts['Favoritos'] = source.filter(p => p.favorite).length
    counts['Visitados'] = source.filter(p => p.visited).length
    return counts
  }, [places, activeTrip])

  return { activeTrip, bySearchAndTrip, filtered, routePlaces, categoryCounts, tripDays }
}
