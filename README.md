# Mis Lugares 📍

App para guardar y organizar tus lugares favoritos de Google Maps.

## Funcionalidades

- Guardar lugares con nombre, foto, emoji, descripción, horarios y precios
- Filtrar por categoría (Restaurante, Museo, Parque, Bar, etc.)
- Buscar por nombre, descripción o etiquetas
- Link directo a Google Maps
- **Mapa interactivo** con pins por lugar (Leaflet + OpenStreetMap, sin API key)
- Las coordenadas se extraen automáticamente del link de Google Maps, o se ingresan manualmente
- Los datos se guardan en **Firebase Firestore** (nube)

## Estructura del proyecto

```
src/
├── components/
│   ├── PlaceCard.jsx       # Tarjeta de lugar en la grilla
│   ├── PlaceCard.module.css
│   ├── PlaceDetail.jsx     # Modal de detalle
│   ├── PlaceDetail.module.css
│   ├── PlaceForm.jsx       # Formulario agregar/editar (incluye campos de coordenadas)
│   └── PlaceForm.module.css
│   ├── MapView.jsx         # Mapa interactivo con markers emoji
│   └── MapView.module.css
├── data/
│   └── places.js           # Datos demo y constantes
├── hooks/
│   └── usePlaces.js        # Hook para manejo de estado + localStorage
├── utils/
│   └── maps.js             # Extractor de coordenadas desde URLs de Google Maps
├── App.jsx
├── App.module.css
├── index.css               # Variables globales de diseño
└── main.jsx
```

## Cómo correr el proyecto

### Requisitos
- Node.js 18+
- Cuenta en [Firebase](https://firebase.google.com) (gratuita, sin tarjeta)

### Configurar Firebase

1. Creá un proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Activá **Firestore Database** → modo de prueba (test mode)
3. En *Configuración del proyecto → Tus apps*, registrá una app web y copiá el `firebaseConfig`
4. Copiá `.env.example` a `.env` y completá los valores:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=mi-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mi-proyecto
VITE_FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

> ⚠️ Nunca subas `.env` a Git — ya está en `.gitignore`.

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:5173
```

### Build para producción

```bash
npm run build
npm run preview
```

## Deploy en Vercel (gratis)

1. Subí el proyecto a GitHub (`.env` no se sube gracias a `.gitignore`)
2. Entrá a [vercel.com](https://vercel.com) y conectá tu repo
3. En *Settings → Environment Variables* del proyecto en Vercel, agregá las mismas variables de `.env`
4. Vercel detecta Vite automáticamente y hace el deploy

## Próximas mejoras posibles

- [ ] Favoritos / Lista de deseos
- [ ] Exportar/importar como JSON
- [ ] Integración con la API de Google Maps para buscar lugares
- [ ] Compartir listas con otros
- [ ] Modo oscuro
- [ ] Ajustar el zoom del mapa automáticamente para mostrar todos los pins
