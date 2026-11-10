import { useEffect, useRef, useState } from 'react'
import {
  Navigation,
  MapPin,
  Flag,
  Truck,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Gauge,
  Clock,
  Layers,
  Crosshair,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { loadGoogleMaps, ADMIN_DARK_MAP_STYLE } from '../lib/maps'
import { updateBookingDriverCoordinates } from '../lib/adminData'

export function LiveTrackingMap({
  selectedRide = null,
  allRides = [],
  className = 'h-[500px] w-full',
  onSelectRide,
}) {
  const mapElementRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const directionsRendererRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const fleetMarkersRef = useRef([])
  const simIntervalRef = useRef(null)

  const [mapsApi, setMapsApi] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [telemetry, setTelemetry] = useState({
    speed: 38,
    heading: 'NE (45°)',
    eta: '14 mins',
    distanceRemaining: '4.8 km',
    phase: 'In Transit',
  })
  const [simProgress, setSimProgress] = useState(0.35)

  // 1. Initialize Google Maps once
  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then((googleMaps) => {
        if (!active) return
        setMapsApi(googleMaps)
      })
      .catch((err) => {
        if (active) setMapError(err.message || 'Could not load Google Maps')
      })
    return () => {
      active = false
    }
  }, [])

  // 2. Setup map container
  useEffect(() => {
    if (!mapsApi || !mapElementRef.current || mapInstanceRef.current) return

    const initialCenter = selectedRide?.driver_lat
      ? { lat: Number(selectedRide.driver_lat), lng: Number(selectedRide.driver_lng) }
      : { lat: 31.5204, lng: 74.3587 } // Lahore center

    mapInstanceRef.current = new mapsApi.Map(mapElementRef.current, {
      center: initialCenter,
      zoom: selectedRide ? 13 : 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: ADMIN_DARK_MAP_STYLE,
    })

    directionsRendererRef.current = new mapsApi.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true, // We draw custom SVG markers
      polylineOptions: {
        strokeColor: '#2546e6',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    })
  }, [mapsApi, selectedRide])

  // 3. Render Route and Markers for Selected Ride
  useEffect(() => {
    if (!mapsApi || !mapInstanceRef.current) return

    // Clear old driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null)
      driverMarkerRef.current = null
    }

    // Clear fleet markers
    fleetMarkersRef.current.forEach((m) => m.setMap(null))
    fleetMarkersRef.current = []

    if (selectedRide) {
      // Draw Route between pickup and dropoff
      const origin = selectedRide.pickup_address || 'Gulberg, Lahore'
      const destination = selectedRide.dropoff_address || 'DHA, Lahore'

      const ds = new mapsApi.DirectionsService()
      ds.route(
        {
          origin,
          destination,
          travelMode: mapsApi.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRendererRef.current?.setDirections(result)

            // Extract route points for simulation
            const leg = result.routes[0]?.legs[0]
            if (leg) {
              setTelemetry((prev) => ({
                ...prev,
                distanceRemaining: leg.distance?.text || '6.2 km',
                eta: leg.duration?.text || '18 mins',
                phase: selectedRide.status === 'in_transit' ? 'In Transit to Dropoff' : 'En Route to Pickup',
              }))
            }

            // Create custom driver truck marker
            const driverPos = selectedRide.driver_lat && selectedRide.driver_lng
              ? { lat: Number(selectedRide.driver_lat), lng: Number(selectedRide.driver_lng) }
              : leg?.start_location || { lat: 31.5204, lng: 74.3587 }

            // Custom SVG truck icon
            const truckIcon = {
              url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="%232546e6" stroke="%23ffffff" stroke-width="3"/><path d="M14 24h12V14H14v10zm16 0h2v-3.34c0-.75-.3-1.47-.83-2L29 16h-3v8h4zm-14 3.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm12 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" fill="%23ffffff"/></svg>`,
              scaledSize: new mapsApi.Size(44, 44),
              anchor: new mapsApi.Point(22, 22),
            }

            driverMarkerRef.current = new mapsApi.Marker({
              position: driverPos,
              map: mapInstanceRef.current,
              icon: truckIcon,
              title: selectedRide.mover_name || 'Driver Location',
            })

            mapInstanceRef.current.panTo(driverPos)
          }
        }
      )
    } else {
      // Clear route
      directionsRendererRef.current?.set('directions', null)

      // Render all active fleet vehicles on radar
      allRides.forEach((ride) => {
        if (!ride.driver_lat || !ride.driver_lng) return

        const pos = { lat: Number(ride.driver_lat), lng: Number(ride.driver_lng) }
        const icon = {
          url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%2310b981" stroke="%23ffffff" stroke-width="2.5"/><path d="M11 20h10V11H11v9zm13 0h1.5v-2.8c0-.63-.25-1.23-.7-1.68L23 13.5h-2v6.5h3zm-11 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="%23ffffff"/></svg>`,
          scaledSize: new mapsApi.Size(36, 36),
          anchor: new mapsApi.Point(18, 18),
        }

        const marker = new mapsApi.Marker({
          position: pos,
          map: mapInstanceRef.current,
          icon,
          title: `${ride.mover_name || 'Driver'} · ${ride.vehicle || 'Vehicle'}`,
        })

        marker.addListener('click', () => {
          if (onSelectRide) onSelectRide(ride)
        })

        fleetMarkersRef.current.push(marker)
      })
    }
  }, [mapsApi, selectedRide, allRides])

  // 4. Live Driver Simulation Controller
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current)
      setIsSimulating(false)
    } else {
      setIsSimulating(true)
      let currentStep = simProgress

      simIntervalRef.current = setInterval(() => {
        currentStep += 0.03
        if (currentStep >= 1) currentStep = 0.05
        setSimProgress(currentStep)

        // Calculate intermediate lat/lng between pickup and dropoff
        const startLat = selectedRide?.pickup_lat || 31.5085
        const startLng = selectedRide?.pickup_lng || 74.3541
        const endLat = selectedRide?.dropoff_lat || 31.4673
        const endLng = selectedRide?.dropoff_lng || 74.4024

        const lat = startLat + (endLat - startLat) * currentStep
        const lng = startLng + (endLng - startLng) * currentStep

        if (driverMarkerRef.current && mapsApi) {
          const newPos = new mapsApi.LatLng(lat, lng)
          driverMarkerRef.current.setPosition(newPos)
          mapInstanceRef.current?.panTo(newPos)
        }

        // Update driver telemetry
        const remainingKm = Math.max(0.5, (14.2 * (1 - currentStep))).toFixed(1)
        const remainingMins = Math.max(2, Math.round(25 * (1 - currentStep)))
        setTelemetry({
          speed: Math.round(35 + Math.random() * 12),
          heading: currentStep > 0.5 ? 'SE (135°)' : 'NE (45°)',
          eta: `${remainingMins} mins`,
          distanceRemaining: `${remainingKm} km`,
          phase: currentStep > 0.85 ? 'Approaching Dropoff' : 'In Transit along Ring Road',
        })

        // Persist update in database/local state
        if (selectedRide?.id) {
          updateBookingDriverCoordinates(selectedRide.id, lat, lng)
        }
      }, 1500)
    }
  }

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    }
  }, [])

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      {/* Google Map DOM Node */}
      <div ref={mapElementRef} className="h-full w-full" />

      {/* Loading Overlay */}
      {!mapsApi && !mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-2" />
          <p className="text-xs font-semibold">Connecting to Satellite Radar...</p>
        </div>
      )}

      {/* Error Fallback */}
      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-white">Google Maps Unavailable</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{mapError}</p>
        </div>
      )}

      {/* Map Header Floating Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          {selectedRide ? `Live Tracking: Move #${String(selectedRide.id).slice(0, 8)}` : 'Active Fleet Overview'}
        </div>

        {selectedRide && (
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-xl transition backdrop-blur-md border ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-brand-600/90 text-white border-brand-500 hover:bg-brand-500'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Pause Movement
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Live Route Movement
              </>
            )}
          </button>
        )}
      </div>

      {/* Telemetry HUD in Top Right (when ride selected) */}
      {selectedRide && (
        <div className="absolute top-4 right-4 z-20 w-64 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-3.5 shadow-2xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-brand-400" />
              {selectedRide.mover_name || 'Assigned Driver'}
            </span>
            <span className="text-[10px] rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 font-bold text-emerald-400 uppercase">
              {telemetry.phase}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-slate-500" /> Speed
              </span>
              <p className="mt-0.5 font-extrabold text-white text-sm">{telemetry.speed} km/h</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-500" /> ETA
              </span>
              <p className="mt-0.5 font-extrabold text-white text-sm">{telemetry.eta}</p>
            </div>
          </div>

          <div className="space-y-1 text-[11px] pt-1">
            <p className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Remaining:</span>
              <span className="font-bold text-white">{telemetry.distanceRemaining}</span>
            </p>
            <p className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Vehicle:</span>
              <span className="font-bold text-white">{selectedRide.vehicle || 'Standard'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Bottom Floating Route Info */}
      {selectedRide && (
        <div className="absolute bottom-4 inset-x-4 z-20 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">Pickup</p>
                <p className="font-bold text-white truncate max-w-xs">{selectedRide.pickup_address}</p>
              </div>
            </div>

            <span className="text-slate-500">→</span>

            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flag className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">Drop-off</p>
                <p className="font-bold text-white truncate max-w-xs">{selectedRide.dropoff_address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-slate-300">
              Customer: {selectedRide.customer_name || 'Customer'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
