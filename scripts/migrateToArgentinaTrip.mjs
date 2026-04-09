/**
 * Migration script: creates an "Argentina" trip and assigns ALL existing places to it.
 *
 * Usage:
 *   Run:  node scripts/migrateToArgentinaTrip.mjs
 *
 * This script is idempotent: it checks if a trip named "Argentina" already
 * exists and updates it rather than creating a duplicate.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, getDocs, addDoc, updateDoc,
  query, where, doc,
} from 'firebase/firestore'

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 0) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  console.warn('Could not read .env file, using existing environment variables.')
}

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrate() {
  // 1. Fetch all places
  const placesSnap = await getDocs(collection(db, 'places'))
  const places = placesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  console.log(`Found ${places.length} places`)

  if (places.length === 0) {
    console.log('No places to migrate.')
    process.exit(0)
  }

  // 2. Check if "Argentina" trip already exists
  const tripsSnap = await getDocs(collection(db, 'trips'))
  const existingTrip = tripsSnap.docs.find(
    (d) => d.data().name?.toLowerCase() === 'argentina'
  )

  // Build items array – assign all places to day 1 by default
  const items = places.map((place, index) => ({
    placeId: place.id,
    day: 1,
    sort: index,
  }))

  if (existingTrip) {
    // Merge: keep existing items, add any places not already assigned
    const existingItems = existingTrip.data().items || []
    const existingPlaceIds = new Set(existingItems.map((i) => i.placeId))
    const newItems = items.filter((i) => !existingPlaceIds.has(i.placeId))

    if (newItems.length === 0) {
      console.log('All places are already in the "Argentina" trip. Nothing to do.')
      process.exit(0)
    }

    const mergedItems = [
      ...existingItems,
      ...newItems.map((item, idx) => ({
        ...item,
        sort: existingItems.length + idx,
      })),
    ]

    await updateDoc(doc(db, 'trips', existingTrip.id), { items: mergedItems })
    console.log(`Updated "Argentina" trip (${existingTrip.id}): added ${newItems.length} new places.`)
  } else {
    // Create new trip
    const tripData = {
      name: 'Argentina',
      items,
      extraItems: [],
      dayNotes: [],
      startPlaceId: '',
      endPlaceId: '',
      createdAt: Date.now(),
    }

    const ref = await addDoc(collection(db, 'trips'), tripData)
    console.log(`Created "Argentina" trip (${ref.id}) with ${places.length} places.`)
  }

  console.log('Migration complete!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
