// Loads the Google Maps JS API once and resolves with window.google.maps.
// Uses the browser key from VITE_GOOGLE_MAPS_API_KEY. The `places` library
// powers address autocomplete; directions/geometry ship with core.

let promise = null

export function loadGoogleMaps() {
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))

    const cbName = '__smartshift_gmaps_cb'
    window[cbName] = () => resolve(window.google.maps)

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=${cbName}`
    s.async = true
    s.defer = true
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(s)
  })
  return promise
}

// Haversine straight-line distance in kilometres between two GPS points.
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(Number(v)))) return null
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

// Detect user's live GPS coordinates and reverse-geocode to a readable address.
export async function getCurrentUserLocation() {
  const coords = await new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported on this device.'))
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err?.message || 'Location permission denied.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    )
  })

  let address = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
  try {
    const maps = await loadGoogleMaps()
    const geocoded = await new Promise((resolve) => {
      new maps.Geocoder().geocode({ location: coords }, (results, status) => {
        if (status === 'OK' && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address)
        } else {
          resolve(null)
        }
      })
    })
    if (geocoded) address = geocoded
  } catch {
    // Keep coordinate string fallback
  }

  return { ...coords, address }
}

// Map style used for the dark (tracking / checkout) maps.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]
