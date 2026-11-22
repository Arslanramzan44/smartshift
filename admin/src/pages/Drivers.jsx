import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Truck,
  Star,
  Search,
  ShieldAlert,
  Eye,
  CheckCircle,
  Navigation,
  RefreshCw,
} from 'lucide-react'
import { DocumentModal } from '../components/DocumentModal'
import {
  fetchAllDrivers,
  updateDriverVerification,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

export function Drivers() {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : ''

  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inspectDriver, setInspectDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    try {
      const res = await fetchAllDrivers()
      setDrivers(res)
    } catch (err) {
      setError(err.message || 'Could not load drivers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadData(),
      onBookingsChange: () => loadData(),
    })
    return () => unsubscribe()
  }, [])

  const filtered = drivers.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.verification_status === statusFilter
    const q = search.toLowerCase()
    const matchesQuery =
      d.full_name?.toLowerCase().includes(q) ||
      d.vehicle_plate?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.phone?.includes(q)
    return matchesStatus && matchesQuery
  })

  async function handleToggleSuspend(driver) {
    const isSuspended = driver.verification_status === 'suspended'
    const newStatus = isSuspended ? 'approved' : 'suspended'
    if (!confirm(`Are you sure you want to ${isSuspended ? 'REINSTATE' : 'SUSPEND'} driver ${driver.full_name}?`)) return
    try {
      const updated = await updateDriverVerification(driver.id, newStatus, isSuspended ? null : 'Suspended by admin')
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)))
    } catch (err) {
      alert('Failed to update driver status: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-brand-400" />
            Fleet & Driver Registry ({drivers.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All registered SmartShift movers, live GPS status, completed moves, and compliance verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver, plate, phone..."
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

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: `All (${drivers.length})` },
          { id: 'pending', label: `Pending (${drivers.filter((d) => d.verification_status === 'pending').length})` },
          { id: 'approved', label: `Approved (${drivers.filter((d) => d.verification_status === 'approved').length})` },
          { id: 'rejected', label: `Rejected (${drivers.filter((d) => d.verification_status === 'rejected').length})` },
          { id: 'suspended', label: `Suspended (${drivers.filter((d) => d.verification_status === 'suspended').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${
              statusFilter === tab.id
                ? 'bg-brand-600 text-white border-brand-500'
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

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Driver Profile</th>
                <th className="p-4">Vehicle & GPS</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Trips & Rating</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">Loading drivers from Supabase...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">No drivers match this filter.</td>
                </tr>
              ) : (
                filtered.map((driver) => {
                  const isApproved = driver.verification_status === 'approved'
                  const isPending = driver.verification_status === 'pending'
                  const isSuspended = driver.verification_status === 'suspended'

                  return (
                    <tr key={driver.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                              className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                              alt=""
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-slate-950 ${
                                driver.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                              title={driver.is_online ? 'Online' : 'Offline'}
                            />
                          </div>
                          <div>
                            <p className="font-extrabold text-white text-xs">{driver.full_name || 'Mover'}</p>
                            <p className="text-[10px] text-slate-400">ID: #{String(driver.id).slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-white">{driver.vehicle_type}</p>
                        <p className="text-[11px] font-mono text-brand-400 font-bold">{driver.vehicle_plate}</p>
                        {driver.driver_lat != null && (
                          <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                            GPS: {Number(driver.driver_lat).toFixed(3)}, {Number(driver.driver_lng).toFixed(3)}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="text-white font-medium">{driver.phone || '—'}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{driver.email || '—'}</p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isSuspended
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isApproved && <CheckCircle className="h-3 w-3" />}
                          {isPending && <ShieldAlert className="h-3 w-3" />}
                          {driver.verification_status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1 font-bold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{driver.rating ? `${driver.rating} (${driver.reviews_count})` : 'New'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {driver.trips_count} completed · {driver.active_jobs_count} active
                        </p>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`${basePath}/live-map`, {
                                state: { tab: 'drivers', driverId: driver.id },
                              })
                            }
                            className="rounded-xl border border-brand-500/30 bg-brand-500/15 hover:bg-brand-500/25 px-2.5 py-1.5 text-xs font-bold text-brand-300 transition flex items-center gap-1"
                            title="View Live Driver Telemetry"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Track
                          </button>

                          <button
                            onClick={() => setInspectDriver(driver)}
                            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Docs
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(driver)}
                            className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition border ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                            }`}
                          >
                            {isSuspended ? 'Reinstate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inspectDriver && (
        <DocumentModal
          driver={inspectDriver}
          onClose={() => setInspectDriver(null)}
          onUpdated={(updated) => setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
        />
      )}
    </div>
  )
}
