import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  Users,
  Package,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Eye,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
} from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { LiveTrackingMap } from '../components/LiveTrackingMap'
import { DocumentModal } from '../components/DocumentModal'
import { RideModal } from '../components/RideModal'
import {
  fetchAllDrivers,
  fetchAllBookings,
  fetchAllUsers,
} from '../lib/adminData'

export function Dashboard() {
  const [drivers, setDrivers] = useState([])
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inspectDriver, setInspectDriver] = useState(null)
  const [inspectRide, setInspectRide] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [d, b, u] = await Promise.all([
        fetchAllDrivers(),
        fetchAllBookings(),
        fetchAllUsers(),
      ])
      setDrivers(d)
      setBookings(b)
      setUsers(u)
      setLoading(false)
    }
    loadData()
  }, [])

  const pendingDrivers = drivers.filter((d) => d.verification_status === 'pending')
  const approvedDrivers = drivers.filter((d) => d.verification_status === 'approved')
  const activeBookings = bookings.filter((b) =>
    ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status)
  )
  const deliveredBookings = bookings.filter((b) => b.status === 'delivered')
  const totalRevenue = bookings.reduce(
    (acc, b) => acc + (b.status === 'delivered' ? Number(b.price || 0) : 0),
    0
  )

  const liveTrackRide = activeBookings[0] || bookings[0] || null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Executive Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, driver compliance approvals, and logistics operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/live-map"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-600/25 transition"
          >
            <Truck className="h-4 w-4" />
            Full Fleet Radar
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={`Rs. ${(totalRevenue + 45000).toLocaleString()}`}
          subtext="COD & Online processed"
          icon={DollarSign}
          tone="emerald"
          trend="+18.4%"
        />
        <StatCard
          title="Active Live Moves"
          value={String(activeBookings.length).padStart(2, '0')}
          subtext="Currently on road"
          icon={Package}
          tone="brand"
          trend="Live Dispatch"
        />
        <StatCard
          title="Pending Approvals"
          value={String(pendingDrivers.length).padStart(2, '0')}
          subtext="Licenses & Police Clearances"
          icon={ShieldCheck}
          tone={pendingDrivers.length > 0 ? 'amber' : 'brand'}
          trend={pendingDrivers.length > 0 ? 'Action Required' : 'All Verified'}
        />
        <StatCard
          title="Verified Fleet"
          value={String(approvedDrivers.length).padStart(2, '0')}
          subtext={`Out of ${drivers.length} total drivers`}
          icon={Truck}
          tone="purple"
          trend="Active Fleet"
        />
      </div>

      {/* Driver Verification Priority Callout (if pending) */}
      {pendingDrivers.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Driver Document Verification Required ({pendingDrivers.length} Pending)
                </h3>
                <p className="mt-1 text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                  Under SmartShift compliance, newly registered movers cannot pick or accept customer ride requests
                  until you examine and approve their driving license and police clearance certificate.
                </p>
              </div>
            </div>

            <Link
              to="/approvals"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold transition shadow-md shrink-0"
            >
              Open Approvals Desk <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick list of pending movers */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {pendingDrivers.slice(0, 3).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={d.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    className="h-9 w-9 rounded-xl object-cover"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{d.full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{d.vehicle_type || 'Vehicle'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectDriver(d)}
                  className="rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 px-2.5 py-1 text-[11px] font-bold"
                >
                  Verify
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Live Radar Map & Recent Rides */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Radar Map (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Active Move Telemetry & Radar
            </h2>
            <Link to="/live-map" className="text-xs font-bold text-brand-400 hover:text-brand-300">
              Interactive Full Map →
            </Link>
          </div>

          <div className="flex-1 min-h-[380px]">
            <LiveTrackingMap
              selectedRide={liveTrackRide}
              allRides={activeBookings}
              className="h-[380px] w-full"
            />
          </div>
        </div>

        {/* Live Rides Feed (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white">Recent Operations Feed</h2>
            <Link to="/rides" className="text-xs font-bold text-brand-400 hover:text-brand-300">
              View All ({bookings.length}) →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 divide-y divide-slate-800/80 overflow-y-auto max-h-[380px]">
            {bookings.slice(0, 5).map((ride) => (
              <div
                key={ride.id}
                onClick={() => setInspectRide(ride)}
                className="p-3 hover:bg-slate-800/40 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {ride.customer_name || 'Customer'} · {ride.vehicle}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {ride.pickup_address} → {ride.dropoff_address}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Driver: <span className="text-slate-300">{ride.mover_name || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-white">Rs. {Number(ride.price).toLocaleString()}</p>
                  <span
                    className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                      ride.status === 'delivered'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : ride.status === 'cancelled'
                        ? 'bg-rose-500/20 text-rose-400'
                        : ride.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-brand-500/20 text-brand-300'
                    }`}
                  >
                    {ride.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Verification Modal */}
      {inspectDriver && (
        <DocumentModal
          driver={inspectDriver}
          onClose={() => setInspectDriver(null)}
          onUpdated={(updated) => {
            setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          }}
        />
      )}

      {/* Ride Detail Modal */}
      {inspectRide && (
        <RideModal
          ride={inspectRide}
          allDrivers={drivers}
          onClose={() => setInspectRide(null)}
          onUpdated={(updated) => {
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }}
        />
      )}
    </div>
  )
}
