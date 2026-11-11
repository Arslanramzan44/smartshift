import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Search,
  Filter,
  Truck,
  Phone,
  Mail,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react'
import { DocumentModal } from '../components/DocumentModal'
import { fetchAllDrivers, updateDriverVerification, subscribeToRealtimeUpdates } from '../lib/adminData'

export function DriverApprovals() {
  const [drivers, setDrivers] = useState([])
  const [filterStatus, setFilterStatus] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [inspectDriver, setInspectDriver] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadDrivers = async () => {
    setLoading(true)
    const list = await fetchAllDrivers()
    setDrivers(list)
    setLoading(false)
  }

  useEffect(() => {
    loadDrivers()

    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadDrivers(),
    })

    return () => unsubscribe()
  }, [])

  const filtered = drivers.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.verification_status === filterStatus
    const query = searchQuery.toLowerCase()
    const matchesQuery =
      d.full_name?.toLowerCase().includes(query) ||
      d.phone?.includes(query) ||
      d.email?.toLowerCase().includes(query) ||
      d.vehicle_plate?.toLowerCase().includes(query)
    return matchesStatus && matchesQuery
  })

  const pendingCount = drivers.filter((d) => d.verification_status === 'pending').length
  const approvedCount = drivers.filter((d) => d.verification_status === 'approved').length
  const rejectedCount = drivers.filter((d) => d.verification_status === 'rejected').length

  async function quickApprove(driver) {
    if (!confirm(`Grant immediate approval to ${driver.full_name}? They will be able to accept customer move requests.`)) return
    const updated = await updateDriverVerification(driver.id, 'approved', null)
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-brand-400" />
            Driver Approvals & Compliance Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Strict verification control: Drivers cannot pick or accept customer requests until their driving license and police certification are verified.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDrivers}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Refresh List
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'pending', label: 'Pending Review', count: pendingCount, tone: 'amber' },
            { id: 'approved', label: 'Approved & Active', count: approvedCount, tone: 'emerald' },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, tone: 'rose' },
            { id: 'all', label: 'All Drivers', count: drivers.length, tone: 'slate' },
          ].map((tab) => {
            const active = filterStatus === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition border ${
                  active
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, plate..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Drivers Compliance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((driver) => {
          const isPending = driver.verification_status === 'pending'
          const isApproved = driver.verification_status === 'approved'
          const isRejected = driver.verification_status === 'rejected'

          return (
            <div
              key={driver.id}
              className={`rounded-2xl border bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700 ${
                isPending
                  ? 'border-amber-500/30'
                  : isApproved
                  ? 'border-emerald-500/20'
                  : 'border-rose-500/20'
              }`}
            >
              <div>
                {/* Driver Top Meta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10"
                      alt=""
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{driver.full_name}</h3>
                      <p className="text-xs text-brand-400 font-semibold">{driver.vehicle_type || 'Mini Truck'}</p>
                      <p className="text-[11px] font-mono text-slate-400">{driver.vehicle_plate || 'LEA-8492'}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                      isApproved
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isRejected
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {driver.verification_status || 'Pending'}
                  </span>
                </div>

                {/* Contact & Date */}
                <div className="mt-3.5 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{driver.phone || 'No phone'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{driver.email || 'No email'}</span>
                  </p>
                </div>

                {/* Document Verification Checklist */}
                <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-2 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Compliance Documents
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-brand-400" />
                      <span>Driving License</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-brand-400" />
                      <span>Police Certificate</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-brand-400" />
                      <span>CNIC Front</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-brand-400" />
                      <span>CNIC Back</span>
                    </div>
                  </div>
                </div>

                {/* Rejection note callout if present */}
                {driver.verification_notes && (
                  <div className="mt-3 rounded-xl bg-rose-950/30 border border-rose-500/20 p-2.5 text-[11px] text-rose-300">
                    <span className="font-bold">Reason:</span> {driver.verification_notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setInspectDriver(driver)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Inspect Documents
                </button>

                {isPending && (
                  <button
                    onClick={() => quickApprove(driver)}
                    className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white shadow-md transition"
                    title="1-Click Approve"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
            <CheckCircle className="h-10 w-10 mx-auto text-emerald-400 mb-2 opacity-80" />
            <p className="text-sm font-bold text-white">No drivers match this filter</p>
            <p className="text-xs text-slate-500 mt-1">All applications in this category have been processed.</p>
          </div>
        )}
      </div>

      {/* Full Document Inspector Modal */}
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
