# Mis Lugares 📍

App para guardar y organizar tus lugares favoritos de Google Maps.

## Funcionalidades

- Guardar lugares con nombre, foto, emoji, descripción, horarios y precios
- Marcar lugares como favoritos o visitados
- Filtrar por categoría (Restaurante, Museo, Parque, Bar, etc.)
- Filtros rápidos para favoritos y visitados
- Buscar por nombre, descripción o etiquetas
- Link directo a Google Maps
- Carga de ubicación por dirección (geocodificación automática con OpenStreetMap)
- **Mapa interactivo** con pins por lugar (Leaflet + OpenStreetMap, sin API key)
- Ruta por calles entre los lugares visibles usando OSRM público (sin API key), priorizando modo caminando
- Selector de trayecto para alternar entre sin trayecto, caminando y auto
- Modo oscuro con preferencia persistida en el navegador
- Las coordenadas se extraen automáticamente del link de Google Maps, o se ingresan manualmente
- Crear **viajes** y asignar lugares por **día**
- Un mismo lugar puede aparecer en varios días dentro del mismo viaje
- Elegir un viaje y filtrar por día para ver solo esos lugares/pins
- En cada viaje podés fijar un punto de inicio y uno final para ordenar la ruta del mapa
- Si un lugar no tiene emoji propio, usa automáticamente el ícono de su categoría
- Precio con opción explícita para marcar un lugar como gratis
- En el modal de viajes, los lugares seleccionados/no seleccionados tienen estilos visuales distintos
- El campo de día en viajes permite borrar y reescribir el valor de forma natural
- El botón de guardar viaje se bloquea mientras persiste en Firestore para evitar duplicados por doble click
- Corrección de capas visuales: el mapa ya no sobrepasa el header sticky
- Refresh visual completo: interfaz más estética/fancy con nuevo look & feel (fondos, controles, tarjetas y mapa)
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
│   ├── PlaceForm.module.css
│   ├── MapView.jsx         # Mapa interactivo con markers emoji
│   ├── MapView.module.css
│   ├── TripForm.jsx        # Formulario de viajes (lugares + día)
│   └── TripForm.module.css
├── data/
│   └── places.js           # Datos demo y constantes
├── hooks/
│   ├── usePlaces.js        # Hook para lugares (Firestore)
│   └── useTrips.js         # Hook para viajes (Firestore)
├── lib/
│   └── firebase.js         # Inicialización Firebase / Firestore
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
2. Activá **Firestore Database** y luego publicá reglas de producción (no usar test mode en deploy final)
3. En *Configuración del proyecto → Tus apps*, registrá una app web y copiá el `firebaseConfig`
4. Copiá `.env.example` a `.env` y completá los valores (sin comillas):

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

## Deploy en Firebase Hosting (opcional)

1. Instalá CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Inicializá en el proyecto: `firebase init`
4. Build: `npm run build`
5. Deploy: `firebase deploy --only hosting:app`
6. El dominio anterior `mappy-a653e.web.app` queda redirigido a `mappy-travel.web.app`

> Este proyecto está configurado para publicar `dist/` en Hosting, usando el site `mappy-travel`.

## Reglas de Firestore (producción)

Este proyecto ya incluye reglas de producción en [firestore.rules](firestore.rules) para las colecciones `places` y `trips`.

Para publicarlas:

```bash
firebase deploy --only firestore:rules
```

## Uso de Viajes

1. Creá o editá un viaje desde la sección **Viaje**
2. Seleccioná qué lugares entran en ese viaje
3. Asigná uno o varios días (por ejemplo `1, 3`) para cada lugar
4. Elegí el viaje en el selector y luego filtrá por día
5. La grilla y el mapa mostrarán solo los lugares de ese filtro
6. Si querés, marcá un inicio y un final para forzar el orden de la ruta
7. Si hay al menos dos lugares con coordenadas, el mapa dibuja automáticamente la ruta por calles entre ellos

## Próximas mejoras posibles

- [ ] Exportar/importar como JSON
- [ ] Integración con la API de Google Maps para buscar lugares
- [ ] Compartir listas con otros
- [ ] Ajustar el zoom del mapa automáticamente para mostrar todos los pins
