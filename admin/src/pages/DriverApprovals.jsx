import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle,
  Eye,
  Search,
  Truck,
  Warehouse,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { DocumentModal } from '../components/DocumentModal'
import { WarehouseDocumentModal } from '../components/WarehouseDocumentModal'
import {
  fetchAllDrivers,
  fetchAllWarehouses,
  updateDriverVerification,
  updateWarehouseVerification,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

export function DriverApprovals() {
  const [entityTab, setEntityTab] = useState('drivers') // 'drivers' | 'warehouses'
  const [drivers, setDrivers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [filterStatus, setFilterStatus] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [inspectDriver, setInspectDriver] = useState(null)
  const [inspectWarehouse, setInspectWarehouse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = async () => {
    setError('')
    try {
      const [dList, wList] = await Promise.all([fetchAllDrivers(), fetchAllWarehouses()])
      setDrivers(dList)
      setWarehouses(wList)
    } catch (err) {
      setError(err.message || 'Could not fetch approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadAll(),
      onWarehousesChange: () => loadAll(),
    })
    return () => unsubscribe()
  }, [])

  const pendingDriversCount = drivers.filter((d) => d.verification_status === 'pending').length
  const pendingWarehousesCount = warehouses.filter((w) => w.verification_status === 'pending').length

  const activeList = entityTab === 'drivers' ? drivers : warehouses
  const pendingCount = activeList.filter((x) => x.verification_status === 'pending').length
  const approvedCount = activeList.filter((x) => x.verification_status === 'approved').length
  const rejectedCount = activeList.filter((x) => x.verification_status === 'rejected').length

  const filteredDrivers = drivers.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.verification_status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      d.full_name?.toLowerCase().includes(q) ||
      d.phone?.includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.vehicle_plate?.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const filteredWarehouses = warehouses.filter((w) => {
    const matchesStatus = filterStatus === 'all' || w.verification_status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      w.name?.toLowerCase().includes(q) ||
      w.city?.toLowerCase().includes(q) ||
      w.owner_name?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  async function quickApproveDriver(driver) {
    if (!confirm(`Approve driver ${driver.full_name}? They will immediately unlock customer move requests.`)) return
    try {
      const updated = await updateDriverVerification(driver.id, 'approved', null)
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)))
    } catch (err) {
      alert('Approval failed: ' + err.message)
    }
  }

  async function quickApproveWarehouse(wh) {
    if (!confirm(`Approve warehouse "${wh.name}"? It will immediately go live for customer storage reservations.`)) return
    try {
      const updated = await updateWarehouseVerification(wh.id, wh.owner_id, 'approved', null)
      setWarehouses((prev) => prev.map((w) => (w.id === wh.id ? updated : w)))
    } catch (err) {
      alert('Warehouse approval failed: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-brand-400" />
            Driver & Warehouse Approvals Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compliance verification gate: Drivers and Warehouse Partners must be approved here before accepting customer bookings.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 self-start"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Primary Entity Switcher: Drivers vs Warehouses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setEntityTab('drivers')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            entityTab === 'drivers'
              ? 'border-brand-500 bg-brand-500/15 shadow-lg shadow-brand-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/20 text-brand-400">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-sm text-white">Driver Approvals</p>
              <p className="text-[11px] text-slate-400">License, CNIC & Police Clearance</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${pendingDriversCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {pendingDriversCount} Pending
          </span>
        </button>

        <button
          onClick={() => setEntityTab('warehouses')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            entityTab === 'warehouses'
              ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple-500/20 text-purple-300">
              <Warehouse className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-sm text-white">Warehouse Approvals</p>
              <p className="text-[11px] text-slate-400">Trade License, Ownership Deed & Fire Safety</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${pendingWarehousesCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {pendingWarehousesCount} Pending
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'pending', label: 'Pending Review', count: pendingCount },
            { id: 'approved', label: 'Approved & Active', count: approvedCount },
            { id: 'rejected', label: 'Rejected', count: rejectedCount },
            { id: 'all', label: entityTab === 'drivers' ? 'All Drivers' : 'All Warehouses', count: activeList.length },
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
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
            placeholder={entityTab === 'drivers' ? 'Search driver, phone, plate...' : 'Search warehouse, city, owner...'}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">{error}</div>
      )}

      {/* DRIVERS GRID */}
      {entityTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrivers.map((driver) => {
            const isPending = driver.verification_status === 'pending'
            const isApproved = driver.verification_status === 'approved'
            const isRejected = driver.verification_status === 'rejected'
            const docChecks = [
              ['Driving License', Boolean(driver.driving_license_url)],
              ['Police Certificate', Boolean(driver.police_clearance_url)],
              ['CNIC Front', Boolean(driver.cnic_front_url)],
              ['CNIC Back', Boolean(driver.cnic_back_url)],
            ]

            return (
              <div
                key={driver.id}
                className={`rounded-2xl border bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700 ${
                  isPending ? 'border-amber-500/30' : isApproved ? 'border-emerald-500/20' : 'border-rose-500/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10"
                        alt=""
                      />
                      <div>
                        <h3 className="font-extrabold text-sm text-white">{driver.full_name || 'Mover'}</h3>
                        <p className="text-xs text-brand-400 font-semibold">{driver.vehicle_type}</p>
                        <p className="text-[11px] font-mono text-slate-400">{driver.vehicle_plate}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {driver.verification_status}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-500" /> {driver.phone || 'No phone'}</p>
                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-500" /> <span className="truncate">{driver.email || 'No email'}</span></p>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance Documents</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {docChecks.map(([label, ok]) => (
                        <div key={label} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {driver.verification_notes && (
                    <div className="mt-3 rounded-xl bg-rose-950/30 border border-rose-500/20 p-2.5 text-[11px] text-rose-300">
                      <span className="font-bold">Note:</span> {driver.verification_notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setInspectDriver(driver)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition"
                  >
                    <Eye className="h-3.5 w-3.5" /> Inspect Docs
                  </button>
                  {isPending && (
                    <button
                      onClick={() => quickApproveDriver(driver)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white shadow-md transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredDrivers.length === 0 && !loading && (
            <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
              <CheckCircle className="h-10 w-10 mx-auto text-emerald-400 mb-2 opacity-80" />
              <p className="text-sm font-bold text-white">No driver applications match this filter</p>
            </div>
          )}
        </div>
      )}

      {/* WAREHOUSES GRID */}
      {entityTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarehouses.map((wh) => {
            const isPending = wh.verification_status === 'pending'
            const isApproved = wh.verification_status === 'approved'
            const isRejected = wh.verification_status === 'rejected'
            const docChecks = [
              ['Trade License', Boolean(wh.business_license_url)],
              ['Property Deed', Boolean(wh.property_ownership_url)],
              ['Fire Safety', Boolean(wh.fire_safety_cert_url)],
              ['Owner CNIC', Boolean(wh.owner_cnic_front_url && wh.owner_cnic_back_url)],
            ]

            return (
              <div
                key={wh.id}
                className={`rounded-2xl border bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700 ${
                  isPending ? 'border-amber-500/30' : isApproved ? 'border-emerald-500/20' : 'border-rose-500/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {wh.image_url ? (
                        <img src={wh.image_url} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10 shrink-0" alt="" />
                      ) : (
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/20 text-purple-300 shrink-0">
                          <Warehouse className="h-6 w-6" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-white truncate">{wh.name}</h3>
                        <p className="text-xs text-purple-300 font-semibold">{wh.city} · {wh.total_capacity_sqm} m²</p>
                        <p className="text-[11px] text-slate-400 truncate">Owner: {wh.owner_name}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize shrink-0 ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {wh.verification_status}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
                    <p className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{wh.address}</span>
                    </p>
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-500" /> {wh.owner_phone || 'No phone'}</p>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse Compliance Docs</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {docChecks.map(([label, ok]) => (
                        <div key={label} className={`flex items-center gap-1.5 ${ok || wh.owner_role === 'admin' ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {ok || wh.owner_role === 'admin' ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {wh.verification_notes && (
                    <div className="mt-3 rounded-xl bg-rose-950/30 border border-rose-500/20 p-2.5 text-[11px] text-rose-300">
                      <span className="font-bold">Note:</span> {wh.verification_notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setInspectWarehouse(wh)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition"
                  >
                    <Eye className="h-3.5 w-3.5" /> Inspect Docs
                  </button>
                  {isPending && (
                    <button
                      onClick={() => quickApproveWarehouse(wh)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white shadow-md transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredWarehouses.length === 0 && !loading && (
            <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
              <CheckCircle className="h-10 w-10 mx-auto text-emerald-400 mb-2 opacity-80" />
              <p className="text-sm font-bold text-white">No warehouses match this filter</p>
            </div>
          )}
        </div>
      )}

      {inspectDriver && (
        <DocumentModal
          driver={inspectDriver}
          onClose={() => setInspectDriver(null)}
          onUpdated={(updated) => {
            setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          }}
        />
      )}

      {inspectWarehouse && (
        <WarehouseDocumentModal
          warehouse={inspectWarehouse}
          onClose={() => setInspectWarehouse(null)}
          onUpdated={(updated) => {
            if (updated) {
              setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
            } else {
              loadAll()
            }
          }}
        />
      )}
    </div>
  )
}
