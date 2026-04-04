import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'trips'
const CACHE_KEY = 'mappy-trips-cache-v1'

function readTripsCache() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeTripsCache(items) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export function useTrips() {
  const [trips, setTrips] = useState(() => readTripsCache())
  const [loadingTrips, setLoadingTrips] = useState(() => readTripsCache().length === 0)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const nextTrips = snap.docs.map(d => ({ ...d.data(), id: d.id }))
      setTrips(nextTrips)
      writeTripsCache(nextTrips)
      setLoadingTrips(false)
    }, () => {
      // If Firestore fails (offline/rules), keep local cached data.
      setLoadingTrips(false)
    })
    return unsub
  }, [])

  const addTrip = (data) => addDoc(collection(db, COL), {
    ...data,
    createdAt: Date.now(),
  })

  const updateTrip = (id, data) => updateDoc(doc(db, COL, id), data)

  const deleteTrip = (id) => deleteDoc(doc(db, COL, id))

  return { trips, loadingTrips, addTrip, updateTrip, deleteTrip }
}
