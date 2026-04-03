import { useState, useMemo } from 'react'
import { usePlaces } from './hooks/usePlaces'
import { CATEGORIES, CAT_COLORS } from './data/places'
import PlaceCard from './components/PlaceCard'
import PlaceForm from './components/PlaceForm'
import PlaceDetail from './components/PlaceDetail'
import MapView from './components/MapView'
import styles from './App.module.css'

export default function App() {
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [detailPlace, setDetailPlace] = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return places.filter(p => {
      const matchCat = activeFilter === 'Todos' || p.category === activeFilter
      const matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.includes(q))
      return matchCat && matchQ
    })
  }, [places, search, activeFilter])

  const categoryCounts = useMemo(() => {
    const counts = {}
    places.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    return counts
  }, [places])

  const handleSave = (data) => {
    if (editingPlace) {
      updatePlace(editingPlace.id, data)
      setDetailPlace({ ...editingPlace, ...data })
    } else {
      addPlace(data)
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

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.logo}>Mis Lugares</h1>
            <p className={styles.tagline}>{places.length} {places.length === 1 ? 'lugar guardado' : 'lugares guardados'}</p>
          </div>
          <button className={styles.btnAdd} onClick={openNew}>
            + Agregar lugar
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar por nombre, descripción o etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.filters}>
            {['Todos', ...CATEGORIES.map(c => c.label)].map(cat => {
              const count = cat === 'Todos' ? places.length : (categoryCounts[cat] || 0)
              if (cat !== 'Todos' && count === 0) return null
              return (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat} {count > 0 && <span className={styles.filterCount}>{count}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⏳</span>
            <p>Cargando lugares...</p>
          </div>
        ) : filtered.length === 0 ? (
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
              <MapView places={filtered} onSelectPlace={setDetailPlace} />
            </div>
            <div className={styles.listPanel}>
              <div className={styles.grid}>
                {filtered.map(place => (
                  <PlaceCard key={place.id} place={place} onClick={setDetailPlace} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <PlaceForm
          place={editingPlace}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingPlace(null) }}
        />
      )}

      {detailPlace && (
        <PlaceDetail
          place={detailPlace}
          onClose={() => setDetailPlace(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
