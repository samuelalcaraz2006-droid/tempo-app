import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CITY_COORDS = {
  paris: [48.8566, 2.3522], lyon: [45.7640, 4.8357], marseille: [43.2965, 5.3698],
  toulouse: [43.6047, 1.4442], nice: [43.7102, 7.2620], nantes: [47.2184, -1.5536],
  strasbourg: [48.5734, 7.7521], montpellier: [43.6108, 3.8767], bordeaux: [44.8378, -0.5792],
  lille: [50.6292, 3.0573], rennes: [48.1173, -1.6778], reims: [49.2583, 4.0317],
  'le havre': [49.4944, 0.1079], 'saint-etienne': [45.4397, 4.3872], toulon: [43.1242, 5.9280],
  grenoble: [45.1885, 5.7245], dijon: [47.3220, 5.0415], angers: [47.4784, -0.5632],
  'clermont-ferrand': [45.7772, 3.0870], tours: [47.3941, 0.6848], rouen: [49.4432, 1.0993],
  metz: [49.1193, 6.1757], caen: [49.1829, -0.3707], orleans: [47.9029, 1.9093],
  mulhouse: [47.7508, 7.3359], perpignan: [42.6887, 2.8948], besancon: [47.2378, 6.0241],
  boulogne: [48.8352, 2.2443], nancy: [48.6921, 6.1844], avignon: [43.9493, 4.8055],
  valence: [44.9334, 4.8924], 'aix-en-provence': [43.5297, 5.4474],
}

const DEFAULT_CENTER = [46.6034, 2.3488] // Centre de la France

function getCoordsForMission(mission) {
  if (mission.lat && mission.lng) return [mission.lat, mission.lng]
  if (mission.companies?.lat && mission.companies?.lng) return [mission.companies.lat, mission.companies.lng]
  const city = (mission.city || '').toLowerCase().trim()
  if (CITY_COORDS[city]) return CITY_COORDS[city]
  // Recherche partielle
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (city.includes(key) || key.includes(city)) return coords
  }
  return null
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''

export default function MissionsMap({ missions, onSelectMission, onApply, hasApplied }) {
  const mappable = missions.map(m => ({ ...m, _coords: getCoordsForMission(m) })).filter(m => m._coords)

  if (mappable.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8A8A86' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Aucune mission localisable</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Les missions avec une ville reconnue apparaissent sur la carte</div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E8E8E5', height: 420 }}>
      <MapContainer center={DEFAULT_CENTER} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map(m => (
          <Marker key={m.id} position={m._coords}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{m.companies?.name} · {m.city}</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <strong>{m.hourly_rate} €/h</strong>
                  {m.total_hours ? ` · ${m.total_hours}h` : ''}
                  {m.start_date ? ` · ${formatDate(m.start_date)}` : ''}
                </div>
                {m.matchScore && (
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginBottom: 6 }}>{m.matchScore}% de compatibilité</div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onSelectMission(m)}
                    style={{ flex: 1, padding: '5px 8px', fontSize: 11, background: '#fff', border: '1px solid #E8E8E5', borderRadius: 6, cursor: 'pointer' }}>
                    Détails
                  </button>
                  <button onClick={() => onApply(m)}
                    disabled={hasApplied(m.id)}
                    style={{ flex: 1, padding: '5px 8px', fontSize: 11, background: hasApplied(m.id) ? '#E8E8E5' : '#FF5500', color: hasApplied(m.id) ? '#8A8A86' : '#fff', border: 'none', borderRadius: 6, cursor: hasApplied(m.id) ? 'default' : 'pointer' }}>
                    {hasApplied(m.id) ? '✓ Postulé' : 'Postuler'}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
