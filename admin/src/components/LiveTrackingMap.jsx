import { useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Flag,
  Truck,
  Play,
  Pause,
  Gauge,
  Clock,
  Loader2,
  AlertCircle,
  Warehouse,
  Thermometer,
  Droplets,
  Boxes,
  ShieldCheck,
} from 'lucide-react'
import { loadGoogleMaps, ADMIN_DARK_MAP_STYLE } from '../lib/maps'
import { updateBookingDriverCoordinates } from '../lib/adminData'

export function LiveTrackingMap({
  mode = 'drivers', // 'drivers' | 'warehouses' | 'all'
  selectedRide = null,
  allRides = [],
  allDrivers = [],
  selectedWarehouse = null,
  allWarehouses = [],
  className = 'h-[500px] w-full',
  onSelectRide,
  onSelectWarehouse,
}) {
  const mapElementRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const directionsRendererRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const endpointMarkersRef = useRef([])
  const fleetMarkersRef = useRef([])
  const warehouseMarkersRef = useRef([])
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

  // 1. Load Google Maps once
  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then((googleMaps) => {
        if (active) setMapsApi(googleMaps)
      })
      .catch((err) => {
        if (active) setMapError(err.message || 'Could not load Google Maps')
      })
    return () => {
      active = false
    }
  }, [])

  // 2. Initialize map instance once
  useEffect(() => {
    if (!mapsApi || !mapElementRef.current || mapInstanceRef.current) return

    const initialCenter = { lat: 31.5204, lng: 74.3587 }
    mapInstanceRef.current = new mapsApi.Map(mapElementRef.current, {
      center: initialCenter,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: ADMIN_DARK_MAP_STYLE,
    })

    directionsRendererRef.current = new mapsApi.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#3b63f2',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    })
  }, [mapsApi])

  // Stop simulation when ride changes
  useEffect(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
      setIsSimulating(false)
    }
  }, [selectedRide?.id, mode])

  // 3. Render Drivers, Routes, and Warehouses
  useEffect(() => {
    if (!mapsApi || !mapInstanceRef.current) return

    // Clear all previous markers
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null)
      driverMarkerRef.current = null
    }
    endpointMarkersRef.current.forEach((m) => m.setMap(null))
    endpointMarkersRef.current = []
    fleetMarkersRef.current.forEach((m) => m.setMap(null))
    fleetMarkersRef.current = []
    warehouseMarkersRef.current.forEach((m) => m.setMap(null))
    warehouseMarkersRef.current = []

    const showDrivers = mode === 'drivers' || mode === 'all'
    const showWarehouses = mode === 'warehouses' || mode === 'all'

    // --- Render Warehouse Facility Markers ---
    if (showWarehouses && allWarehouses.length > 0) {
      allWarehouses.forEach((wh) => {
        if (wh.lat == null || wh.lng == null) return
        const isSel = selectedWarehouse?.id === wh.id
        const color =
          wh.verification_status === 'approved'
            ? isSel
              ? '%238b5cf6'
              : '%23a855f7'
            : wh.verification_status === 'pending'
            ? '%23f59e0b'
            : '%23f43f5e'
        const size = isSel ? 46 : 38
        const whIcon = {
          url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="${color}" stroke="%23ffffff" stroke-width="${isSel ? 3.5 : 2.5}"/><path d="M12 20l10-7 10 7v11h-4v-7H16v7h-4V20zm7 6h6v5h-6v-5z" fill="%23ffffff"/></svg>`,
          scaledSize: new mapsApi.Size(size, size),
          anchor: new mapsApi.Point(size / 2, size / 2),
        }

        const marker = new mapsApi.Marker({
          position: { lat: Number(wh.lat), lng: Number(wh.lng) },
          map: mapInstanceRef.current,
          icon: whIcon,
          title: `${wh.name} (${wh.city}) · ${wh.available_units}/${wh.total_units} units free`,
          zIndex: isSel ? 50 : 20,
        })

        marker.addListener('click', () => {
          if (onSelectWarehouse) onSelectWarehouse(wh)
        })

        warehouseMarkersRef.current.push(marker)
      })

      if (mode === 'warehouses') {
        directionsRendererRef.current?.set('directions', null)
        if (selectedWarehouse?.lat != null && selectedWarehouse?.lng != null) {
          mapInstanceRef.current.panTo({
            lat: Number(selectedWarehouse.lat),
            lng: Number(selectedWarehouse.lng),
          })
          mapInstanceRef.current.setZoom(14)
        } else {
          const valid = allWarehouses.filter((w) => w.lat != null && w.lng != null)
          if (valid.length > 0) {
            const bounds = new mapsApi.LatLngBounds()
            valid.forEach((w) => bounds.extend({ lat: Number(w.lat), lng: Number(w.lng) }))
            mapInstanceRef.current.fitBounds(bounds)
          }
        }
      }
    }

    // --- Render Driver / Ride Tracking ---
    if (showDrivers) {
      if (selectedRide) {
        const origin =
          selectedRide.pickup_lat && selectedRide.pickup_lng
            ? { lat: Number(selectedRide.pickup_lat), lng: Number(selectedRide.pickup_lng) }
            : selectedRide.pickup_address || 'Gulberg, Lahore'
        const destination =
          selectedRide.dropoff_lat && selectedRide.dropoff_lng
            ? { lat: Number(selectedRide.dropoff_lat), lng: Number(selectedRide.dropoff_lng) }
            : selectedRide.dropoff_address || 'DHA, Lahore'

        const ds = new mapsApi.DirectionsService()
        ds.route(
          { origin, destination, travelMode: mapsApi.TravelMode.DRIVING },
          (result, status) => {
            if (status === 'OK' && result) {
              directionsRendererRef.current?.setDirections(result)
              const leg = result.routes[0]?.legs[0]
              if (leg) {
                setTelemetry((prev) => ({
                  ...prev,
                  speed: selectedRide.driver_speed_kmh ?? prev.speed,
                  distanceRemaining: leg.distance?.text || `${selectedRide.distance_km || 0} km`,
                  eta: leg.duration?.text || 'Calculating',
                  phase: (selectedRide.status || 'pending').replace('_', ' '),
                }))

                // Custom pickup & dropoff markers
                const pickupMarker = new mapsApi.Marker({
                  position: leg.start_location,
                  map: mapInstanceRef.current,
                  title: `Pickup: ${selectedRide.pickup_address}`,
                  icon: {
                    url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="%2310b981" stroke="%23ffffff" stroke-width="3"/></svg>`,
                    scaledSize: new mapsApi.Size(24, 24),
                    anchor: new mapsApi.Point(12, 12),
                  },
                })
                const dropoffMarker = new mapsApi.Marker({
                  position: leg.end_location,
                  map: mapInstanceRef.current,
                  title: `Drop-off: ${selectedRide.dropoff_address}`,
                  icon: {
                    url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="%23f43f5e" stroke="%23ffffff" stroke-width="3"/></svg>`,
                    scaledSize: new mapsApi.Size(24, 24),
                    anchor: new mapsApi.Point(12, 12),
                  },
                })
                endpointMarkersRef.current.push(pickupMarker, dropoffMarker)
              }

              const driverPos =
                selectedRide.driver_lat != null && selectedRide.driver_lng != null
                  ? { lat: Number(selectedRide.driver_lat), lng: Number(selectedRide.driver_lng) }
                  : leg?.start_location || { lat: 31.5204, lng: 74.3587 }

              const truckIcon = {
                url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="%232546e6" stroke="%23ffffff" stroke-width="3"/><path d="M14 24h12V14H14v10zm16 0h2v-3.34c0-.75-.3-1.47-.83-2L29 16h-3v8h4zm-14 3.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm12 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" fill="%23ffffff"/></svg>`,
                scaledSize: new mapsApi.Size(44, 44),
                anchor: new mapsApi.Point(22, 22),
              }

              driverMarkerRef.current = new mapsApi.Marker({
                position: driverPos,
                map: mapInstanceRef.current,
                icon: truckIcon,
                title: selectedRide.mover_name || 'Assigned Driver',
                zIndex: 60,
              })
            } else {
              // Fallback: center on available GPS coordinates if Directions API can't route the address
              directionsRendererRef.current?.set('directions', null)
              const fallbackPos =
                selectedRide.driver_lat != null && selectedRide.driver_lng != null
                  ? { lat: Number(selectedRide.driver_lat), lng: Number(selectedRide.driver_lng) }
                  : selectedRide.pickup_lat != null && selectedRide.pickup_lng != null
                  ? { lat: Number(selectedRide.pickup_lat), lng: Number(selectedRide.pickup_lng) }
                  : { lat: 31.5204, lng: 74.3587 }
              mapInstanceRef.current.panTo(fallbackPos)
            }
          }
        )
      } else {
        directionsRendererRef.current?.set('directions', null)

        // Plot all rides with GPS + online drivers with GPS
        const plottedIds = new Set()
        allRides.forEach((ride) => {
          if (ride.driver_lat == null || ride.driver_lng == null) return
          plottedIds.add(ride.mover_id)
          const icon = {
            url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%2310b981" stroke="%23ffffff" stroke-width="2.5"/><path d="M11 20h10V11H11v9zm13 0h1.5v-2.8c0-.63-.25-1.23-.7-1.68L23 13.5h-2v6.5h3zm-11 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="%23ffffff"/></svg>`,
            scaledSize: new mapsApi.Size(36, 36),
            anchor: new mapsApi.Point(18, 18),
          }
          const marker = new mapsApi.Marker({
            position: { lat: Number(ride.driver_lat), lng: Number(ride.driver_lng) },
            map: mapInstanceRef.current,
            icon,
            title: `${ride.mover_name || 'Driver'} · ${ride.vehicle} (${ride.status})`,
          })
          marker.addListener('click', () => onSelectRide && onSelectRide(ride))
          fleetMarkersRef.current.push(marker)
        })

        allDrivers.forEach((d) => {
          if (d.driver_lat == null || d.driver_lng == null || plottedIds.has(d.id)) return
          const marker = new mapsApi.Marker({
            position: { lat: Number(d.driver_lat), lng: Number(d.driver_lng) },
            map: mapInstanceRef.current,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="%232546e6" stroke="%23ffffff" stroke-width="2.5"/><path d="M11 20h10V11H11v9zm13 0h1.5v-2.8c0-.63-.25-1.23-.7-1.68L23 13.5h-2v6.5h3z" fill="%23ffffff"/></svg>`,
              scaledSize: new mapsApi.Size(32, 32),
              anchor: new mapsApi.Point(16, 16),
            },
            title: `${d.full_name} (${d.vehicle_plate || 'Driver'})`,
          })
          fleetMarkersRef.current.push(marker)
        })
      }
    }
  }, [mapsApi, mode, selectedRide, allRides, allDrivers, selectedWarehouse, allWarehouses]) // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Optional Live GPS Movement Simulator for testing driver telemetry
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
      setIsSimulating(false)
    } else {
      setIsSimulating(true)
      let currentStep = simProgress

      simIntervalRef.current = setInterval(() => {
        currentStep += 0.04
        if (currentStep >= 1) currentStep = 0.05
        setSimProgress(currentStep)

        const startLat = Number(selectedRide?.pickup_lat) || 31.5085
        const startLng = Number(selectedRide?.pickup_lng) || 74.3541
        const endLat = Number(selectedRide?.dropoff_lat) || 31.4673
        const endLng = Number(selectedRide?.dropoff_lng) || 74.4024

        const lat = startLat + (endLat - startLat) * currentStep
        const lng = startLng + (endLng - startLng) * currentStep
        const speed = Math.round(34 + Math.random() * 14)

        if (driverMarkerRef.current && mapsApi) {
          const newPos = new mapsApi.LatLng(lat, lng)
          driverMarkerRef.current.setPosition(newPos)
          mapInstanceRef.current?.panTo(newPos)
        }

        const totalKm = Number(selectedRide?.distance_km) || 12
        const remainingKm = Math.max(0.3, totalKm * (1 - currentStep)).toFixed(1)
        const remainingMins = Math.max(2, Math.round(totalKm * 2 * (1 - currentStep)))
        setTelemetry({
          speed,
          heading: currentStep > 0.5 ? 'SE (135°)' : 'NE (45°)',
          eta: `${remainingMins} mins`,
          distanceRemaining: `${remainingKm} km`,
          phase: currentStep > 0.85 ? 'Approaching Drop-off' : 'In Transit',
        })

        if (selectedRide?.id) {
          updateBookingDriverCoordinates(selectedRide.id, lat, lng, {
            moverId: selectedRide.mover_id,
            speed,
            heading: currentStep > 0.5 ? 135 : 45,
          })
        }
      }, 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    }
  }, [])

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      <div ref={mapElementRef} className="h-full w-full" />

      {!mapsApi && !mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-2" />
          <p className="text-xs font-semibold">Connecting to Live Geospatial Radar...</p>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-white">Google Maps Unavailable</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{mapError}</p>
        </div>
      )}

      {/* Top Left Floating Badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${mode === 'warehouses' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
          {mode === 'warehouses'
            ? selectedWarehouse
              ? `Warehouse Hub: ${selectedWarehouse.name}`
              : `All Warehouses (${allWarehouses.length})`
            : selectedRide
            ? `Driver Tracking: Move #${String(selectedRide.id).slice(0, 8)}`
            : mode === 'all'
            ? `Combined Operations Radar (${allRides.length} Moves · ${allWarehouses.length} Hubs)`
            : 'Active Fleet Overview'}
        </div>

        {mode !== 'warehouses' && selectedRide && (
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
                <Pause className="h-3.5 w-3.5 fill-current" /> Stop GPS Sim
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Simulate Live GPS
              </>
            )}
          </button>
        )}
      </div>

      {/* Top Right Telemetry HUD — Driver Mode */}
      {mode !== 'warehouses' && selectedRide && (
        <div className="absolute top-4 right-4 z-20 w-64 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-3.5 shadow-2xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
            <span className="font-extrabold text-white flex items-center gap-1.5 truncate">
              <Truck className="h-4 w-4 text-brand-400 shrink-0" />
              <span className="truncate">{selectedRide.mover_name || 'Unassigned'}</span>
            </span>
            <span className="text-[10px] rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 font-bold text-emerald-400 uppercase shrink-0">
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
              <span className="text-slate-400">Distance:</span>
              <span className="font-bold text-white">{telemetry.distanceRemaining}</span>
            </p>
            <p className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">GPS Coords:</span>
              <span className="font-mono text-[10px] text-brand-300">
                {selectedRide.driver_lat ? `${Number(selectedRide.driver_lat).toFixed(4)}, ${Number(selectedRide.driver_lng).toFixed(4)}` : 'Route Start'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Top Right Telemetry HUD — Warehouse Mode */}
      {mode === 'warehouses' && selectedWarehouse && (
        <div className="absolute top-4 right-4 z-20 w-72 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-purple-500/30 p-4 shadow-2xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2">
            <span className="font-extrabold text-white flex items-center gap-1.5 truncate">
              <Warehouse className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="truncate">{selectedWarehouse.name}</span>
            </span>
            <span className="text-[10px] rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 font-bold text-emerald-400 uppercase">
              {selectedWarehouse.operational_status || 'open'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800 text-center">
              <Thermometer className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
              <p className="mt-1 font-extrabold text-white">{selectedWarehouse.temperature_c ?? 21}°C</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800 text-center">
              <Droplets className="h-3.5 w-3.5 text-cyan-400 mx-auto" />
              <p className="mt-1 font-extrabold text-white">{selectedWarehouse.humidity_pct ?? 45}%</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800 text-center">
              <Boxes className="h-3.5 w-3.5 text-purple-400 mx-auto" />
              <p className="mt-1 font-extrabold text-white">{selectedWarehouse.occupancy_pct}%</p>
            </div>
          </div>

          <div className="space-y-1 text-[11px] pt-1">
            <p className="flex justify-between">
              <span className="text-slate-400">Free Units:</span>
              <span className="font-bold text-white">{selectedWarehouse.available_units} / {selectedWarehouse.total_units}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Active Stored:</span>
              <span className="font-bold text-purple-300">{selectedWarehouse.active_bookings} reservations</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">GPS:</span>
              <span className="font-mono text-[10px] text-slate-300">
                {selectedWarehouse.lat != null ? `${Number(selectedWarehouse.lat).toFixed(4)}, ${Number(selectedWarehouse.lng).toFixed(4)}` : '—'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Bottom Floating Info Bar */}
      {mode !== 'warehouses' && selectedRide && (
        <div className="absolute bottom-4 inset-x-4 z-20 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400">Pickup</p>
                <p className="font-bold text-white truncate max-w-[220px]">{selectedRide.pickup_address}</p>
              </div>
            </div>

            <span className="text-slate-500">→</span>

            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Flag className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400">Drop-off</p>
                <p className="font-bold text-white truncate max-w-[220px]">{selectedRide.dropoff_address}</p>
              </div>
            </div>
          </div>

          <span className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-slate-300 shrink-0">
            Customer: {selectedRide.customer_name}
          </span>
        </div>
      )}

      {mode === 'warehouses' && selectedWarehouse && (
        <div className="absolute bottom-4 inset-x-4 z-20 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{selectedWarehouse.address}</p>
              <p className="text-[10px] text-slate-400">
                Owner: {selectedWarehouse.owner_name} · {selectedWarehouse.owner_phone || 'No phone'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-emerald-400 font-bold shrink-0">
            <ShieldCheck className="h-3.5 w-3.5" />
            {selectedWarehouse.verification_status}
          </span>
        </div>
      )}
    </div>
  )
}
