import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'trips'

export function useTrips() {
  const [trips, setTrips] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setTrips(snap.docs.map(d => ({ ...d.data(), id: d.id })))
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
