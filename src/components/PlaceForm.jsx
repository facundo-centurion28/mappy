import { useState, useEffect } from 'react'
import { CATEGORIES } from '../data/places'
import { extractCoordsFromMapsUrl } from '../utils/maps'
import styles from './PlaceForm.module.css'

const EMPTY = {
  name: '', category: 'Restaurante', description: '',
  emoji: '', imageUrl: '',
  schedule: { open: '', close: '', days: '' },
  price: { min: '', max: '', currency: 'UYU' },
  mapsUrl: '', tags: [],
  coordinates: { lat: '', lng: '' },
}

export default function PlaceForm({ place, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (place) {
      setForm({
        ...EMPTY,
        ...place,
        schedule: place.schedule || EMPTY.schedule,
        price: {
          min: place.price?.min ?? '',
          max: place.price?.max ?? '',
          currency: place.price?.currency || 'UYU',
        },
        tags: place.tags || [],
        coordinates: {
          lat: place.coordinates?.lat ?? '',
          lng: place.coordinates?.lng ?? '',
        },
      })
    } else {
      setForm(EMPTY)
    }
  }, [place])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setSched = (k, v) => setForm(f => ({ ...f, schedule: { ...f.schedule, [k]: v } }))
  const setPrice = (k, v) => setForm(f => ({ ...f, price: { ...f.price, [k]: v } }))
  const setCoords = (k, v) => setForm(f => ({ ...f, coordinates: { ...f.coordinates, [k]: v } }))

  const handleMapsUrlChange = (url) => {
    set('mapsUrl', url)
    const extracted = extractCoordsFromMapsUrl(url)
    if (extracted) {
      setForm(f => ({ ...f, mapsUrl: url, coordinates: { lat: extracted.lat, lng: extracted.lng } }))
    }
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }))
    }
    setTagInput('')
  }

  const removeTag = (t) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const lat = parseFloat(form.coordinates?.lat)
    const lng = parseFloat(form.coordinates?.lng)
    onSave({
      ...form,
      price: {
        ...form.price,
        min: Number(form.price.min) || 0,
        max: Number(form.price.max) || 0,
      },
      coordinates: (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null,
    })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{place ? 'Editar lugar' : 'Nuevo lugar'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>Nombre *</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Mercado del Puerto"
              required
            />
          </div>

          <div className={styles.row2}>
            <div className={styles.section}>
              <label className={styles.label}>Categoría</label>
              <select className={styles.input} value={form.category}
                onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.section}>
              <label className={styles.label}>Emoji</label>
              <input className={styles.input} value={form.emoji}
                onChange={e => set('emoji', e.target.value)}
                placeholder="🍽️" maxLength={2} />
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Descripción</label>
            <textarea className={styles.textarea} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="¿Qué hace especial este lugar?" rows={3} />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>URL de foto (opcional)</label>
            <input className={styles.input} value={form.imageUrl}
              onChange={e => set('imageUrl', e.target.value)}
              placeholder="https://..." type="url" />
          </div>

          <div className={styles.sectionGroup}>
            <label className={styles.label}>Horarios</label>
            <div className={styles.row3}>
              <div>
                <span className={styles.sublabel}>Apertura</span>
                <input className={styles.input} type="time" value={form.schedule.open}
                  onChange={e => setSched('open', e.target.value)} />
              </div>
              <div>
                <span className={styles.sublabel}>Cierre</span>
                <input className={styles.input} type="time" value={form.schedule.close}
                  onChange={e => setSched('close', e.target.value)} />
              </div>
              <div>
                <span className={styles.sublabel}>Días</span>
                <input className={styles.input} value={form.schedule.days}
                  onChange={e => setSched('days', e.target.value)}
                  placeholder="Lun–Vie" />
              </div>
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <label className={styles.label}>Precio (0 = gratis)</label>
            <div className={styles.row3}>
              <div>
                <span className={styles.sublabel}>Mínimo</span>
                <input className={styles.input} type="number" min="0"
                  value={form.price.min}
                  onChange={e => setPrice('min', e.target.value)}
                  placeholder="0" />
              </div>
              <div>
                <span className={styles.sublabel}>Máximo</span>
                <input className={styles.input} type="number" min="0"
                  value={form.price.max}
                  onChange={e => setPrice('max', e.target.value)}
                  placeholder="0" />
              </div>
              <div>
                <span className={styles.sublabel}>Moneda</span>
                <select className={styles.input} value={form.price.currency}
                  onChange={e => setPrice('currency', e.target.value)}>
                  <option value="UYU">UYU</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Link de Google Maps</label>
            <input className={styles.input} value={form.mapsUrl}
              onChange={e => handleMapsUrlChange(e.target.value)}
              placeholder="https://maps.google.com/..." type="url" />
          </div>

          <div className={styles.sectionGroup}>
            <label className={styles.label}>Coordenadas (para el mapa)</label>
            {form.mapsUrl && form.coordinates?.lat !== '' && (
              <p className={styles.coordsHint}>✓ Extraídas automáticamente del link</p>
            )}
            <div className={styles.row2}>
              <div>
                <span className={styles.sublabel}>Latitud</span>
                <input className={styles.input} type="number" step="any"
                  value={form.coordinates?.lat ?? ''}
                  onChange={e => setCoords('lat', e.target.value)}
                  placeholder="Ej: -34.9064" />
              </div>
              <div>
                <span className={styles.sublabel}>Longitud</span>
                <input className={styles.input} type="number" step="any"
                  value={form.coordinates?.lng ?? ''}
                  onChange={e => setCoords('lng', e.target.value)}
                  placeholder="Ej: -56.1879" />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Etiquetas</label>
            <div className={styles.tagInput}>
              <input className={styles.input} value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Ej: parrilla, romántico..." />
              <button type="button" className={styles.tagAddBtn} onClick={addTag}>+</button>
            </div>
            {form.tags.length > 0 && (
              <div className={styles.tags}>
                {form.tags.map(t => (
                  <span key={t} className={styles.tag}>
                    {t}
                    <button type="button" className={styles.tagRemove} onClick={() => removeTag(t)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnSave}>
              {place ? 'Guardar cambios' : 'Agregar lugar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
