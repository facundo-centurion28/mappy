import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'places'
const CACHE_KEY = 'mappy-places-cache-v1'

function readPlacesCache() {
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

function writePlacesCache(items) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export function usePlaces() {
  const [places, setPlaces] = useState(() => readPlacesCache())
  const [loading, setLoading] = useState(() => readPlacesCache().length === 0)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const nextPlaces = snap.docs.map(d => ({ ...d.data(), id: d.id }))
      setPlaces(nextPlaces)
      writePlacesCache(nextPlaces)
      setLoading(false)
    }, () => {
      // If Firestore fails (offline/rules), keep local cached data.
      setLoading(false)
    })
    return unsub
  }, [])

  const addPlace = (data) =>
    addDoc(collection(db, COL), { ...data, createdAt: Date.now() })

  const updatePlace = (id, data) =>
    updateDoc(doc(db, COL, id), data)

  const deletePlace = (id) =>
    deleteDoc(doc(db, COL, id))

  return { places, loading, addPlace, updatePlace, deletePlace }
}

