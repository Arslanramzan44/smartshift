import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Truck,
  Package,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Warehouse,
  Boxes,
  RefreshCw,
} from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { LiveTrackingMap } from '../components/LiveTrackingMap'
import { DocumentModal } from '../components/DocumentModal'
import { WarehouseDocumentModal } from '../components/WarehouseDocumentModal'
import { RideModal } from '../components/RideModal'
import { StorageBookingModal } from '../components/StorageBookingModal'
import {
  fetchAllDrivers,
  fetchAllBookings,
  fetchAllUsers,
  fetchAllWarehouses,
  fetchAllStorageBookings,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

export function Dashboard() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : ''

  const [drivers, setDrivers] = useState([])
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [storageBookings, setStorageBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inspectDriver, setInspectDriver] = useState(null)
  const [inspectWarehouse, setInspectWarehouse] = useState(null)
  const [inspectRide, setInspectRide] = useState(null)
  const [inspectStorage, setInspectStorage] = useState(null)

  const loadData = async () => {
    setError('')
    try {
      const [d, b, u, w, sb] = await Promise.all([
        fetchAllDrivers(),
        fetchAllBookings(),
        fetchAllUsers(),
        fetchAllWarehouses(),
        fetchAllStorageBookings(),
      ])
      setDrivers(d)
      setBookings(b)
      setUsers(u)
      setWarehouses(w)
      setStorageBookings(sb)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data from Supabase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()

    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadData(),
      onBookingsChange: () => loadData(),
      onWarehousesChange: () => loadData(),
      onStorageChange: () => loadData(),
    })

    return () => unsubscribe()
  }, [])

  const pendingDrivers = drivers.filter((d) => d.verification_status === 'pending')
  const approvedDrivers = drivers.filter((d) => d.verification_status === 'approved')
  const pendingWarehouses = warehouses.filter((w) => w.verification_status === 'pending')
  const approvedWarehouses = warehouses.filter((w) => w.verification_status === 'approved')
  const customersCount = users.filter((u) => u.role === 'customer').length

  const activeBookings = bookings.filter((b) =>
    ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status)
  )
  const activeStorage = storageBookings.filter((s) =>
    ['reserved', 'confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(s.tracking_stage || s.status)
  )

  const moveRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + Number(b.price || 0), 0)
  const storageRevenue = storageBookings
    .filter((s) => (s.tracking_stage || s.status) !== 'cancelled')
    .reduce((acc, s) => acc + Number(s.price || 0), 0)
  const totalRevenue = moveRevenue + storageRevenue

  const liveTrackRide = activeBookings[0] || bookings[0] || null
  const totalPending = pendingDrivers.length + pendingWarehouses.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Executive Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Live Supabase operations: {customersCount} customers · {drivers.length} drivers · {warehouses.length} warehouses · {bookings.length} moves · {storageBookings.length} storage bookings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
          </button>
          <Link
            to={`${basePath}/live-map`}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-600/25 transition"
          >
            <Truck className="h-4 w-4" />
            Live Tracking Radar
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Booking Value"
          value={`Rs. ${totalRevenue.toLocaleString()}`}
          subtext={`Moves Rs. ${moveRevenue.toLocaleString()} · Storage Rs. ${storageRevenue.toLocaleString()}`}
          icon={DollarSign}
          tone="emerald"
          trend="Live DB"
        />
        <StatCard
          title="Active Operations"
          value={`${String(activeBookings.length).padStart(2, '0')} / ${String(activeStorage.length).padStart(2, '0')}`}
          subtext={`${activeBookings.length} live moves · ${activeStorage.length} active storage`}
          icon={Package}
          tone="brand"
          trend={`${bookings.filter((b) => b.status === 'pending').length} pending moves`}
        />
        <StatCard
          title="Pending Approvals"
          value={String(totalPending).padStart(2, '0')}
          subtext={`${pendingDrivers.length} drivers · ${pendingWarehouses.length} warehouses`}
          icon={ShieldCheck}
          tone={totalPending > 0 ? 'amber' : 'brand'}
          trend={totalPending > 0 ? 'Action Required' : 'All Verified'}
        />
        <StatCard
          title="Verified Network"
          value={`${approvedDrivers.length}D · ${approvedWarehouses.length}W`}
          subtext={`${approvedDrivers.length}/${drivers.length} drivers · ${approvedWarehouses.length}/${warehouses.length} hubs`}
          icon={Warehouse}
          tone="purple"
          trend="Active Supply"
        />
      </div>

      {/* Unified Driver & Warehouse Pending Approvals Callout */}
      {totalPending > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Compliance Verification Required ({pendingDrivers.length} Drivers · {pendingWarehouses.length} Warehouses)
                </h3>
                <p className="mt-1 text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                  Review uploaded licenses, police clearances, property deeds, and fire safety certificates before unlocking customer booking access.
                </p>
              </div>
            </div>

            <Link
              to={`${basePath}/approvals`}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold transition shadow-md shrink-0"
            >
              Open Approvals Desk <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pendingDrivers.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={d.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    className="h-9 w-9 rounded-xl object-cover shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{d.full_name || d.email}</p>
                    <p className="text-[10px] text-brand-400 truncate">Driver · {d.vehicle_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectDriver(d)}
                  className="rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 px-2.5 py-1 text-[11px] font-bold shrink-0"
                >
                  Verify
                </button>
              </div>
            ))}

            {pendingWarehouses.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-slate-900/90 p-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                    <Warehouse className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{w.name}</p>
                    <p className="text-[10px] text-purple-300 truncate">Warehouse · {w.city}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectWarehouse(w)}
                  className="rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-2.5 py-1 text-[11px] font-bold shrink-0"
                >
                  Verify
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Combined Live Map & Recent Operations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Driver & Warehouse Geospatial Radar
            </h2>
            <Link to={`${basePath}/live-map`} className="text-xs font-bold text-brand-400 hover:text-brand-300">
              Full Tracking Center →
            </Link>
          </div>

          <div className="flex-1 min-h-[390px]">
            <LiveTrackingMap
              mode="all"
              selectedRide={liveTrackRide}
              allRides={activeBookings}
              allDrivers={drivers}
              allWarehouses={warehouses}
              className="h-[390px] w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white">Recent Moves & Storage</h2>
            <Link to={`${basePath}/rides`} className="text-xs font-bold text-brand-400 hover:text-brand-300">
              View All ({bookings.length + storageBookings.length}) →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 divide-y divide-slate-800/80 overflow-y-auto max-h-[390px]">
            {bookings.slice(0, 4).map((ride) => (
              <div
                key={`move-${ride.id}`}
                onClick={() => setInspectRide(ride)}
                className="p-3 hover:bg-slate-800/40 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {ride.customer_name} · {ride.vehicle}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {ride.pickup_address} → {ride.dropoff_address}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Driver: <span className="text-slate-300">{ride.mover_name || 'Unassigned Pool'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-white">Rs. {Number(ride.price || 0).toLocaleString()}</p>
                  <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-brand-500/20 text-brand-300">
                    {ride.status}
                  </span>
                </div>
              </div>
            ))}

            {storageBookings.slice(0, 3).map((sb) => (
              <div
                key={`wh-${sb.id}`}
                onClick={() => setInspectStorage(sb)}
                className="p-3 hover:bg-slate-800/40 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                    <Boxes className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {sb.customer_name} · {sb.unit_size}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{sb.warehouse_name}</p>
                    <p className="text-[10px] text-purple-300 mt-0.5">
                      {sb.duration_label} {sb.unit_code ? `· Bay ${sb.unit_code}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-white">Rs. {Number(sb.price || 0).toLocaleString()}</p>
                  <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300">
                    {(sb.tracking_stage || sb.status).replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}

            {bookings.length === 0 && storageBookings.length === 0 && !loading && (
              <p className="p-8 text-center text-xs text-slate-500">No bookings recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {inspectDriver && (
        <DocumentModal
          driver={inspectDriver}
          onClose={() => setInspectDriver(null)}
          onUpdated={(updated) => setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
        />
      )}

      {inspectWarehouse && (
        <WarehouseDocumentModal
          warehouse={inspectWarehouse}
          onClose={() => setInspectWarehouse(null)}
          onUpdated={(updated) => {
            if (updated) setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
            else loadData()
          }}
        />
      )}

      {inspectRide && (
        <RideModal
          ride={inspectRide}
          allDrivers={drivers}
          onClose={() => setInspectRide(null)}
          onUpdated={(updated) => {
            if (updated) setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            else loadData()
          }}
        />
      )}

      {inspectStorage && (
        <StorageBookingModal
          booking={inspectStorage}
          onClose={() => setInspectStorage(null)}
          onUpdated={(updated) => {
            if (updated) setStorageBookings((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            else loadData()
          }}
        />
      )}
    </div>
  )
}
