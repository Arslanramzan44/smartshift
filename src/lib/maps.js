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
