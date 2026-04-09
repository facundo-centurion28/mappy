import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex < 0) continue
  const key = trimmed.slice(0, eqIndex).trim()
  const value = trimmed.slice(eqIndex + 1).trim()
  if (!process.env[key]) process.env[key] = value
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

const [tripsSnap, placesSnap] = await Promise.all([
  getDocs(collection(db, 'trips')),
  getDocs(collection(db, 'places')),
])

const argentina = tripsSnap.docs.find(d => d.data().name?.toLowerCase() === 'argentina')
if (!argentina) { console.log('No Argentina trip'); process.exit(1) }

const allPlaceIds = placesSnap.docs.map(d => d.id)
const tripItems = argentina.data().items || []
const inTrip = new Set(tripItems.map(i => i.placeId))
const missing = allPlaceIds.filter(id => !inTrip.has(id))

console.log('Total places in DB:', allPlaceIds.length)
console.log('Already in trip:', inTrip.size)
console.log('Missing:', missing.length, missing)

if (missing.length > 0) {
  const maxSort = Math.max(0, ...tripItems.map(i => Number(i.sort) || 0))
  const newItems = [
    ...tripItems,
    ...missing.map((id, idx) => ({ placeId: id, day: null, sort: maxSort + idx + 1 })),
  ]
  await updateDoc(doc(db, 'trips', argentina.id), { items: newItems })
  console.log('Added', missing.length, 'places to Argentina trip')
} else {
  console.log('All places already in trip')
}

process.exit(0)
