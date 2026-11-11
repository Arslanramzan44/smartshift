import { useState, useEffect } from 'react'
import {
  Navigation,
  Truck,
  MapPin,
  Flag,
  Radio,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react'
import { LiveTrackingMap } from '../components/LiveTrackingMap'
import { fetchAllBookings, fetchAllDrivers, subscribeToRealtimeUpdates } from '../lib/adminData'

export function LiveTrackingPage() {
  const [bookings, setBookings] = useState([])
  const [drivers, setDrivers] = useState([])
  const [selectedRide, setSelectedRide] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    Promise.all([fetchAllBookings(), fetchAllDrivers()]).then(([b, d]) => {
      setBookings(b)
      setDrivers(d)
      setSelectedRide((prev) => {
        if (prev) {
          const fresh = b.find((x) => x.id === prev.id)
          if (fresh) return fresh
        }
        const active = b.find((x) =>
          ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(x.status)
        )
        return active || b[0] || null
      })
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()

    const unsubscribe = subscribeToRealtimeUpdates({
      onBookingsChange: () => loadData(),
      onProfilesChange: () => loadData(),
    })

    return () => unsubscribe()
  }, [])

  const activeRides = bookings.filter((b) =>
    ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status)
  )

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Navigation className="h-7 w-7 text-brand-400" />
            Live Fleet & Ride Telemetry Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time geospatial tracking of drivers, customer drop-off routes, and GPS coordinates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-1.5 text-xs font-bold text-emerald-400 flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>{activeRides.length} Active Movers On Road</span>
          </div>
        </div>
      </div>

      {/* Main Radar Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Left Side: Active Moves Selector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Rides & Vehicles ({activeRides.length})
            </h2>
            <button
              onClick={() => setSelectedRide(null)}
              className="text-xs font-bold text-brand-400 hover:text-brand-300"
            >
              View All Fleet
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {bookings.map((ride) => {
              const isSelected = selectedRide?.id === ride.id
              const isActive = ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(ride.status)

              return (
                <div
                  key={ride.id}
                  onClick={() => setSelectedRide(ride)}
                  className={`rounded-2xl border p-4 cursor-pointer transition shadow-lg ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/15 shadow-brand-500/10'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-extrabold text-sm text-white">{ride.vehicle}</p>
                        <p className="text-[11px] text-slate-400">
                          Driver: <span className="text-slate-200 font-semibold">{ride.mover_name || 'Assigned'}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>

                  {/* Route snippet */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                    <p className="flex items-center gap-2 text-slate-300 truncate">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{ride.pickup_address}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-400 truncate">
                      <Flag className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{ride.dropoff_address}</span>
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/50">
                    <span>Customer: {ride.customer_name}</span>
                    <span className="font-bold text-white">Rs. {Number(ride.price).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side: High-Precision Live Google Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex-1 min-h-[580px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <LiveTrackingMap
              selectedRide={selectedRide}
              allRides={activeRides}
              className="h-[600px] w-full"
              onSelectRide={(r) => setSelectedRide(r)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
