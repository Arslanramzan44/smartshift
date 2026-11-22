import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Warehouse,
  Search,
  MapPin,
  Thermometer,
  Droplets,
  CheckCircle,
  ShieldAlert,
  Eye,
  Navigation,
  RefreshCw,
} from 'lucide-react'
import { WarehouseDocumentModal } from '../components/WarehouseDocumentModal'
import {
  fetchAllWarehouses,
  updateWarehouseVerification,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

export function WarehousesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : ''

  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inspectWh, setInspectWh] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    try {
      const res = await fetchAllWarehouses()
      setWarehouses(res)
    } catch (err) {
      setError(err.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToRealtimeUpdates({
      onWarehousesChange: () => loadData(),
      onStorageChange: () => loadData(),
    })
    return () => unsubscribe()
  }, [])

  const filtered = warehouses.filter((w) => {
    const matchesStatus = statusFilter === 'all' || w.verification_status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      w.name?.toLowerCase().includes(q) ||
      w.city?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q) ||
      w.owner_name?.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  async function handleToggleSuspend(wh) {
    const isSuspended = wh.verification_status === 'suspended'
    const nextStatus = isSuspended ? 'approved' : 'suspended'
    if (!confirm(`Are you sure you want to ${isSuspended ? 'REINSTATE' : 'SUSPEND'} warehouse "${wh.name}"?`)) return
    try {
      const updated = await updateWarehouseVerification(
        wh.id,
        wh.owner_id,
        nextStatus,
        isSuspended ? null : 'Suspended by admin'
      )
      setWarehouses((prev) => prev.map((x) => (x.id === wh.id ? updated : x)))
    } catch (err) {
      alert('Failed to update warehouse status: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Warehouse className="h-7 w-7 text-purple-400" />
            Warehouse Network & Capacity Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All partner and official SmartShift storage hubs, live climate telemetry, occupancy, and compliance approval
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hub, city, owner..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
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

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: `All (${warehouses.length})` },
          { id: 'approved', label: `Approved (${warehouses.filter((w) => w.verification_status === 'approved').length})` },
          { id: 'pending', label: `Pending (${warehouses.filter((w) => w.verification_status === 'pending').length})` },
          { id: 'rejected', label: `Rejected (${warehouses.filter((w) => w.verification_status === 'rejected').length})` },
          { id: 'suspended', label: `Suspended (${warehouses.filter((w) => w.verification_status === 'suspended').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${
              statusFilter === tab.id
                ? 'bg-purple-600 text-white border-purple-500'
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

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Warehouse Hub</th>
                <th className="p-4">Owner & Contact</th>
                <th className="p-4">Capacity & Units</th>
                <th className="p-4">Live Telemetry</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">Loading warehouses from Supabase...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">No warehouses match this filter.</td>
                </tr>
              ) : (
                filtered.map((wh) => {
                  const isApproved = wh.verification_status === 'approved'
                  const isPending = wh.verification_status === 'pending'
                  const isSuspended = wh.verification_status === 'suspended'
                  return (
                    <tr key={wh.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {wh.image_url ? (
                            <img src={wh.image_url} className="h-11 w-14 rounded-xl object-cover ring-1 ring-white/10 shrink-0" alt="" />
                          ) : (
                            <span className="grid h-11 w-14 place-items-center rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                              <Warehouse className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-white text-xs">{wh.name}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[230px]">
                              <MapPin className="h-3 w-3 text-purple-400 shrink-0" /> {wh.city} · {wh.address}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-white">{wh.owner_name}</p>
                        <p className="text-[11px] text-slate-400">{wh.owner_phone || '—'}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{wh.owner_email || '—'}</p>
                      </td>

                      <td className="p-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-white">{wh.occupancy_pct}% used</span>
                            <span className="text-slate-400">{wh.available_units}/{wh.total_units} free</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${wh.occupancy_pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {wh.active_bookings} active · Rs. {Number(wh.total_revenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Thermometer className="h-3.5 w-3.5" /> {wh.temperature_c ?? 21}°C
                          </span>
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Droplets className="h-3.5 w-3.5" /> {wh.humidity_pct ?? 45}%
                          </span>
                        </div>
                        <p className="text-[10px] uppercase text-slate-400 mt-1">
                          Hub: <span className="text-white font-semibold">{wh.operational_status}</span>
                        </p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize border ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : isSuspended
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isApproved && <CheckCircle className="h-3 w-3" />}
                          {isPending && <ShieldAlert className="h-3 w-3" />}
                          {wh.verification_status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`${basePath}/live-map`, {
                                state: { tab: 'warehouses', warehouseId: wh.id },
                              })
                            }
                            className="rounded-xl border border-purple-500/30 bg-purple-500/15 hover:bg-purple-500/25 px-2.5 py-1.5 text-xs font-bold text-purple-300 transition flex items-center gap-1"
                            title="Open Warehouse Tracking Detail"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Track
                          </button>

                          <button
                            onClick={() => setInspectWh(wh)}
                            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white transition flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Docs
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(wh)}
                            className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition border ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
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

      {inspectWh && (
        <WarehouseDocumentModal
          warehouse={inspectWh}
          onClose={() => setInspectWh(null)}
          onUpdated={(updated) => {
            if (updated) {
              setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
            } else {
              loadData()
            }
          }}
        />
      )}
    </div>
  )
}
