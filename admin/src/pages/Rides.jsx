import { useState, useEffect } from 'react'
import {
  Package,
  Warehouse,
  Search,
  MapPin,
  Flag,
  Truck,
  Eye,
  RefreshCw,
  Boxes,
} from 'lucide-react'
import { RideModal } from '../components/RideModal'
import { StorageBookingModal } from '../components/StorageBookingModal'
import {
  fetchAllBookings,
  fetchAllDrivers,
  fetchAllStorageBookings,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

const ACTIVE_MOVE_STATUSES = ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff']

export function RidesPage() {
  const [modeTab, setModeTab] = useState('moves') // 'moves' | 'storage'
  const [bookings, setBookings] = useState([])
  const [storageBookings, setStorageBookings] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRide, setSelectedRide] = useState(null)
  const [selectedStorage, setSelectedStorage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    try {
      const [b, d, sb] = await Promise.all([
        fetchAllBookings(),
        fetchAllDrivers(),
        fetchAllStorageBookings(),
      ])
      setBookings(b)
      setDrivers(d)
      setStorageBookings(sb)
    } catch (err) {
      setError(err.message || 'Could not load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToRealtimeUpdates({
      onBookingsChange: () => loadData(),
      onProfilesChange: () => loadData(),
      onStorageChange: () => loadData(),
    })
    return () => unsubscribe()
  }, [])

  const filteredMoves = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? ACTIVE_MOVE_STATUSES.includes(b.status) : b.status === statusFilter)
    const q = search.toLowerCase()
    const matchesQuery =
      b.customer_name?.toLowerCase().includes(q) ||
      b.mover_name?.toLowerCase().includes(q) ||
      b.pickup_address?.toLowerCase().includes(q) ||
      b.dropoff_address?.toLowerCase().includes(q) ||
      String(b.id).toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const filteredStorage = storageBookings.filter((s) => {
    const st = s.tracking_stage || s.status || 'reserved'
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active'
        ? ['confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(st)
        : st === statusFilter)
    const q = search.toLowerCase()
    const matchesQuery =
      s.customer_name?.toLowerCase().includes(q) ||
      s.warehouse_name?.toLowerCase().includes(q) ||
      s.unit_size?.toLowerCase().includes(q) ||
      s.unit_code?.toLowerCase().includes(q) ||
      String(s.id).toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const statusTones = {
    delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    checked_out: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    in_storage: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    reserved: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    release_requested: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    in_transit: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    accepted: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    confirmed: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    checked_in: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    en_route: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    loading: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    at_dropoff: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-brand-400" />
            Moves & Warehouse Storage Bookings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live dispatch ledger for customer relocation moves and warehouse storage unit reservations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking, customer, warehouse..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary Mode Switcher: Move Bookings vs Storage Bookings */}
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <button
          onClick={() => {
            setModeTab('moves')
            setStatusFilter('all')
          }}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-extrabold transition ${
            modeTab === 'moves'
              ? 'border-brand-500 bg-brand-500/15 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand-400" /> Move Bookings</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{bookings.length}</span>
        </button>

        <button
          onClick={() => {
            setModeTab('storage')
            setStatusFilter('all')
          }}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-extrabold transition ${
            modeTab === 'storage'
              ? 'border-purple-500 bg-purple-500/15 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-purple-400" /> Warehouse Storage</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{storageBookings.length}</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(modeTab === 'moves'
          ? [
              { id: 'all', label: `All Moves (${bookings.length})` },
              { id: 'pending', label: `Pending (${bookings.filter((b) => b.status === 'pending').length})` },
              { id: 'active', label: `Active / In Progress (${bookings.filter((b) => ACTIVE_MOVE_STATUSES.includes(b.status)).length})` },
              { id: 'delivered', label: `Delivered (${bookings.filter((b) => b.status === 'delivered').length})` },
              { id: 'cancelled', label: `Cancelled (${bookings.filter((b) => b.status === 'cancelled').length})` },
            ]
          : [
              { id: 'all', label: `All Storage (${storageBookings.length})` },
              { id: 'reserved', label: `Reserved (${storageBookings.filter((s) => (s.tracking_stage || s.status) === 'reserved').length})` },
              { id: 'active', label: `Active Stored (${storageBookings.filter((s) => ['confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(s.tracking_stage || s.status)).length})` },
              { id: 'checked_out', label: `Checked Out (${storageBookings.filter((s) => (s.tracking_stage || s.status) === 'checked_out').length})` },
              { id: 'cancelled', label: `Cancelled (${storageBookings.filter((s) => (s.tracking_stage || s.status) === 'cancelled').length})` },
            ]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${
              statusFilter === tab.id
                ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">{error}</div>
      )}

      {/* MOVE BOOKINGS TABLE */}
      {modeTab === 'moves' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Move ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Route (Pickup → Drop-off)</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Fare & Items</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">Loading move bookings from Supabase...</td>
                  </tr>
                ) : filteredMoves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">No move bookings match this filter.</td>
                  </tr>
                ) : (
                  filteredMoves.map((ride) => (
                    <tr key={ride.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 font-mono font-bold text-brand-400">
                        #{String(ride.id).slice(0, 8)}
                        <p className="text-[10px] font-sans font-normal text-slate-500 mt-0.5">
                          {new Date(ride.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-extrabold text-white">{ride.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{ride.customer_phone || '—'}</p>
                      </td>

                      <td className="p-4 max-w-xs">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-slate-300 truncate">
                            <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{ride.pickup_address}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-400 truncate">
                            <Flag className="h-3 w-3 text-rose-400 shrink-0" />
                            <span className="truncate">{ride.dropoff_address}</span>
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        {ride.mover_id && ride.mover_name ? (
                          <div>
                            <p className="font-bold text-white flex items-center gap-1">
                              <Truck className="h-3 w-3 text-brand-400" /> {ride.mover_name}
                            </p>
                            <p className="text-[10px] text-slate-400">{ride.vehicle}</p>
                          </div>
                        ) : (
                          <span className="rounded-md bg-amber-500/10 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20">
                            Unassigned Pool
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-black text-white">Rs. {Number(ride.price || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {ride.payment_method || 'COD'} · {ride.items_count} items
                        </p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize border ${
                            statusTones[ride.status] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {ride.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedRide(ride)}
                          className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WAREHOUSE STORAGE BOOKINGS TABLE */}
      {modeTab === 'storage' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Storage ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Warehouse Hub</th>
                  <th className="p-4">Unit & Bay</th>
                  <th className="p-4">Duration & Fare</th>
                  <th className="p-4">Tracking Stage</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">Loading storage bookings...</td>
                  </tr>
                ) : filteredStorage.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">No warehouse storage bookings yet.</td>
                  </tr>
                ) : (
                  filteredStorage.map((sb) => {
                    const st = sb.tracking_stage || sb.status || 'reserved'
                    return (
                      <tr key={sb.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-4 font-mono font-bold text-purple-400">
                          #{String(sb.id).slice(0, 8)}
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-white">{sb.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{sb.customer_phone || '—'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5 text-purple-400 shrink-0" /> {sb.warehouse_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{sb.warehouse_city || 'Pakistan'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-white">{sb.unit_size}</p>
                          <p className="text-[10px] font-mono text-purple-300">
                            {sb.unit_code ? `Bay: ${sb.unit_code}` : 'Bay unassigned'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-white">Rs. {Number(sb.price || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">{sb.duration_label} · {sb.start_date || 'Flexible'}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize border ${
                              statusTones[st] || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {st.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedStorage(sb)}
                            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition inline-flex items-center gap-1.5"
                          >
                            <Boxes className="h-3.5 w-3.5" /> Track / Manage
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRide && (
        <RideModal
          ride={selectedRide}
          allDrivers={drivers}
          onClose={() => setSelectedRide(null)}
          onUpdated={(updated) => {
            if (updated) setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            else loadData()
          }}
        />
      )}

      {selectedStorage && (
        <StorageBookingModal
          booking={selectedStorage}
          onClose={() => setSelectedStorage(null)}
          onUpdated={(updated) => {
            if (updated) setStorageBookings((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            else loadData()
          }}
        />
      )}
    </div>
  )
}
