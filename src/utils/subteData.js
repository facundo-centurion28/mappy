const BBOX_CABA = '-34.705,-58.531,-34.526,-58.335'
const ALLOWED_LINE_IDS = ['A', 'B', 'C', 'D', 'E', 'H']
const FALLBACK_COLORS = {
  A: '#1CA4CB',
  B: '#C20924',
  C: '#003EA1',
  D: '#217861',
  E: '#6B297E',
  H: '#F4CC21',
}

function dist2(a, b) {
  const dLat = a.lat - b.lat
  const dLon = a.lon - b.lon
  return dLat * dLat + dLon * dLon
}

function normalizeName(value) {
  return String(value || '').replace(/\s*\([^)]*\)\s*/g, '').trim()
}

function toLatLng(node) {
  return node && typeof node.lat === 'number' && typeof node.lon === 'number'
    ? [node.lat, node.lon]
    : null
}

function coordsFromWay(way, byId) {
  const points = []
  for (const nodeId of way.nodes || []) {
    const node = byId.get(nodeId)
    const latLng = toLatLng(node)
    if (latLng) points.push(latLng)
  }
  return points
}

function endDist2(a, b) {
  const dLat = a[0] - b[0]
  const dLon = a[1] - b[1]
  return dLat * dLat + dLon * dLon
}

function stitchWays(ways, byId) {
  const stitched = []

  for (const way of ways) {
    const pts = coordsFromWay(way, byId)
    if (pts.length < 2) continue

    if (stitched.length === 0) {
      stitched.push(...pts)
      continue
    }

    const last = stitched[stitched.length - 1]
    const dStart = endDist2(last, pts[0])
    const dEnd = endDist2(last, pts[pts.length - 1])
    const ordered = dStart <= dEnd ? pts : [...pts].reverse()

    const sameStart =
      stitched[stitched.length - 1][0] === ordered[0][0]
      && stitched[stitched.length - 1][1] === ordered[0][1]

    stitched.push(...(sameStart ? ordered.slice(1) : ordered))
  }

  return stitched
}

function nearestStationName(stopNode, stationNodes) {
  let best = null
  let bestDistance = Infinity

  for (const station of stationNodes) {
    const d = dist2({ lat: stopNode.lat, lon: stopNode.lon }, { lat: station.lat, lon: station.lon })
    if (d < bestDistance) {
      bestDistance = d
      best = station
    }
  }

  if (!best) return null
  // ~500m threshold (rough), avoids wrong assignments.
  if (bestDistance > 0.00003) return null
  return best.tags?.name || null
}

function buildOverpassQuery() {
  return `
[out:json][timeout:45];
(
  relation["route"="subway"](${BBOX_CABA});
  node["railway"="station"]["station"="subway"](${BBOX_CABA});
);
out body;
>;
out skel qt;
`.trim()
}

export async function fetchBuenosAiresSubteData(signal) {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: buildOverpassQuery(),
    signal,
  })

  if (!response.ok) {
    throw new Error('No se pudo obtener la red de subte real.')
  }

  const payload = await response.json()
  const elements = payload.elements || []
  const byId = new Map(elements.map((el) => [el.id, el]))

  const relations = elements.filter(
    (el) => el.type === 'relation'
      && el.tags?.route === 'subway'
      && ALLOWED_LINE_IDS.includes(String(el.tags?.ref || '').toUpperCase())
  )

  const bestRelationByRef = new Map()
  for (const relation of relations) {
    const ref = String(relation.tags.ref).toUpperCase()
    const prev = bestRelationByRef.get(ref)
    if (!prev || relation.id < prev.id) bestRelationByRef.set(ref, relation)
  }

  const stationNodes = elements.filter(
    (el) => el.type === 'node'
      && el.tags?.railway === 'station'
      && el.tags?.station === 'subway'
      && el.tags?.name
  )

  const lines = []

  for (const lineId of ALLOWED_LINE_IDS) {
    const relation = bestRelationByRef.get(lineId)
    if (!relation) continue

    const lineWays = (relation.members || [])
      .filter((m) => m.type === 'way' && (!m.role || m.role === ''))
      .map((m) => byId.get(m.ref))
      .filter(Boolean)

    const path = stitchWays(lineWays, byId)

    const stopNodes = (relation.members || [])
      .filter((m) => m.type === 'node' && m.role && m.role.startsWith('stop'))
      .map((m) => byId.get(m.ref))
      .filter((n) => n && typeof n.lat === 'number' && typeof n.lon === 'number')

    const stations = []
    const seenStationNames = new Set()

    for (const stopNode of stopNodes) {
      const inferred = nearestStationName(stopNode, stationNodes)
      const name = normalizeName(inferred || `Estacion ${stopNode.id}`)
      if (!name || seenStationNames.has(name)) continue
      seenStationNames.add(name)
      stations.push({ name, coord: [stopNode.lat, stopNode.lon] })
    }

    lines.push({
      id: lineId,
      name: `Linea ${lineId}`,
      color: relation.tags?.colour || FALLBACK_COLORS[lineId] || '#666666',
      path,
      stations,
    })
  }

  return lines
}
