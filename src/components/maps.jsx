import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { loadGoogleMaps, DARK_MAP_STYLE } from '../lib/maps'

// Lazily load the Maps API and expose window.google.maps.
function useMaps() {
  const [maps, setMaps] = useState(typeof window !== 'undefined' ? window.google?.maps || null : null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    loadGoogleMaps()
      .then((m) => alive && setMaps(m))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])
  return { maps, error }
}

const LAHORE = { lat: 31.5204, lng: 74.3587 }

/* ----------------------------------------------------------------------------
   RouteMap — real Google map. Draws driving directions between pickup and
   drop-off once both are set; otherwise just shows the base map. Reports the
   route distance/duration through onInfo.
---------------------------------------------------------------------------- */
export function RouteMap({ pickup, dropoff, className = '', dark = false, onInfo }) {
  const { maps, error } = useMaps()
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const rendererRef = useRef(null)
  const markerRef = useRef(null)

  // init map once
  useEffect(() => {
    if (!maps || !elRef.current || mapRef.current) return
    mapRef.current = new maps.Map(elRef.current, {
      center: LAHORE,
      zoom: 11,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      styles: dark ? DARK_MAP_STYLE : undefined,
    })
    rendererRef.current = new maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#2546e6', strokeWeight: 5, strokeOpacity: 0.9 },
    })
  }, [maps, dark])

  // draw / update route
  useEffect(() => {
    if (!maps || !mapRef.current) return
    const both = pickup?.trim() && dropoff?.trim()

    if (!both) {
      rendererRef.current?.set('directions', null)
      // drop a single marker if we have just one endpoint
      const one = pickup?.trim() || dropoff?.trim()
      if (markerRef.current) markerRef.current.setMap(null)
      if (one) {
        new maps.Geocoder().geocode({ address: one }, (res, status) => {
          if (status === 'OK' && res[0]) {
            mapRef.current.setCenter(res[0].geometry.location)
            mapRef.current.setZoom(13)
            markerRef.current = new maps.Marker({ map: mapRef.current, position: res[0].geometry.location })
          }
        })
      }
      return
    }

    const ds = new maps.DirectionsService()
    ds.route(
      { origin: pickup, destination: dropoff, travelMode: maps.TravelMode.DRIVING },
      (res, status) => {
        if (status === 'OK' && res) {
          rendererRef.current.setDirections(res)
          const leg = res.routes[0]?.legs[0]
          if (leg && onInfo)
            onInfo({
              distance: leg.distance?.text,
              duration: leg.duration?.text,
              // numeric km (meters / 1000) used for distance-based pricing
              km: leg.distance?.value ? leg.distance.value / 1000 : null,
            })
        }
      },
    )
  }, [maps, pickup, dropoff]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-xs font-semibold text-slate-400 ${className}`}>
        Map unavailable
      </div>
    )
  }
  if (!maps) {
    return (
      <div className={`grid place-items-center ${dark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'} ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  return <div ref={elRef} className={className} />
}

/* ----------------------------------------------------------------------------
   PlacesField — text input with Google Places Autocomplete. Styled to match
   the app's Field. Controlled value; reports the selected/typed address.
---------------------------------------------------------------------------- */
export function PlacesField({ value, onChange, placeholder, icon: Icon, trailing }) {
  const { maps } = useMaps()
  const inputRef = useRef(null)

  useEffect(() => {
    if (!maps || !inputRef.current || !maps.places) return
    const ac = new maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'name', 'geometry'],
    })
    const listener = ac.addListener('place_changed', () => {
      const p = ac.getPlace()
      const text = p.formatted_address || p.name
      if (text) onChange(text)
    })
    return () => listener.remove()
  }, [maps]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex items-center">
      {Icon && <Icon className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-200 bg-white py-3 text-base text-ink placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-sm ${
          Icon ? 'pl-10' : 'pl-3.5'
        } ${trailing ? 'pr-10' : 'pr-3.5'}`}
      />
      {trailing && <div className="absolute right-3 text-slate-400">{trailing}</div>}
    </div>
  )
}
