import { useState, useEffect } from 'react'
import {
  Truck,
  Star,
  Search,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Navigation,
  Ban,
  Radio,
} from 'lucide-react'
import { DocumentModal } from '../components/DocumentModal'
import { fetchAllDrivers, updateDriverVerification, toggleUserBan, subscribeToRealtimeUpdates } from '../lib/adminData'

export function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [inspectDriver, setInspectDriver] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    fetchAllDrivers().then((res) => {
      setDrivers(res)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()

    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadData(),
    })

    return () => unsubscribe()
  }, [])

  const filtered = drivers.filter(
    (d) =>
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle_plate?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.includes(search)
  )

  async function handleToggleSuspend(driver) {
    const isSuspended = driver.verification_status === 'suspended'
    const newStatus = isSuspended ? 'approved' : 'suspended'
    const action = isSuspended ? 'REINSTATE' : 'SUSPEND'

    if (!confirm(`Are you sure you want to ${action} driver ${driver.full_name}?`)) return
    const updated = await updateDriverVerification(driver.id, newStatus, isSuspended ? null : 'Suspended by admin')
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-brand-400" />
            Fleet & Driver Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Directory of all registered SmartShift movers, vehicle telemetry, and licensing status
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver, plate, phone..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Drivers Table / Cards */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Driver Profile</th>
                <th className="p-4">Vehicle & Plate</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Verification Status</th>
                <th className="p-4">Trips & Rating</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((driver) => {
                const isApproved = driver.verification_status === 'approved'
                const isPending = driver.verification_status === 'pending'
                const isSuspended = driver.verification_status === 'suspended'
                const isRejected = driver.verification_status === 'rejected'

                return (
                  <tr key={driver.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                          className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                          alt=""
                        />
                        <div>
                          <p className="font-extrabold text-white text-xs">{driver.full_name}</p>
                          <p className="text-[10px] text-slate-400">ID: #{String(driver.id).slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-white">{driver.vehicle_type || 'Cargo Van'}</p>
                      <p className="text-[11px] font-mono text-brand-400 font-bold">{driver.vehicle_plate || 'LEA-0000'}</p>
                    </td>

                    <td className="p-4">
                      <p className="text-white font-medium">{driver.phone || '—'}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{driver.email || '—'}</p>
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
                        {driver.verification_status || 'Pending'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{driver.rating || '4.8'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{driver.trips_count || 18} moves completed</p>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInspectDriver(driver)}
                          className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Documents
                        </button>

                        <button
                          onClick={() => handleToggleSuspend(driver)}
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition border ${
                            isSuspended
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                          }`}
                          title={isSuspended ? 'Reinstate Driver' : 'Suspend Driver'}
                        >
                          {isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {inspectDriver && (
        <DocumentModal
          driver={inspectDriver}
          onClose={() => setInspectDriver(null)}
          onUpdated={(updated) => {
            setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          }}
        />
      )}
    </div>
  )
}
