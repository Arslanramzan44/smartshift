// Google Maps loader for SmartShift Admin Dashboard

let promise = null

export function loadGoogleMaps() {
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))

    const cbName = '__smartshift_admin_gmaps_cb'
    window[cbName] = () => resolve(window.google.maps)

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&loading=async&callback=${cbName}`
    s.async = true
    s.defer = true
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(s)
  })
  return promise
}

export const ADMIN_DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2546e6' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1d35a6' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#38bdf8' }] },
]
