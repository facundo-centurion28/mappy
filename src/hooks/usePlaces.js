import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'places'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setPlaces(snap.docs.map(d => ({ ...d.data(), id: d.id })))
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

