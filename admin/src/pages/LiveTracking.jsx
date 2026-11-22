import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Navigation,
  Truck,
  Warehouse,
  MapPin,
  Flag,
  Radio,
  Thermometer,
  Droplets,
  Boxes,
  CheckCircle2,
  QrCode,
  Phone,
  Clock,
  Layers,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { LiveTrackingMap } from '../components/LiveTrackingMap'
import { RideModal } from '../components/RideModal'
import { StorageBookingModal } from '../components/StorageBookingModal'
import {
  fetchAllBookings,
  fetchAllDrivers,
  fetchAllWarehouses,
  fetchAllStorageBookings,
  addAdminWarehouseTrackingLog,
  updateWarehouseAdmin,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'

const MOVE_STEPS = ['pending', 'accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff', 'delivered']

export function LiveTrackingPage() {
  const location = useLocation()
  const initialTab = location.state?.tab || 'drivers'

  const [tab, setTab] = useState(initialTab) // 'drivers' | 'warehouses' | 'all'
  const [bookings, setBookings] = useState([])
  const [drivers, setDrivers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [storageBookings, setStorageBookings] = useState([])

  const [selectedRide, setSelectedRide] = useState(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [manageRide, setManageRide] = useState(null)
  const [manageStorage, setManageStorage] = useState(null)

  const [auditNote, setAuditNote] = useState('')
  const [auditTargetId, setAuditTargetId] = useState('')
  const [busyAudit, setBusyAudit] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [b, d, w, sb] = await Promise.all([
        fetchAllBookings(),
        fetchAllDrivers(),
        fetchAllWarehouses(),
        fetchAllStorageBookings(),
      ])
      setBookings(b)
      setDrivers(d)
      setWarehouses(w)
      setStorageBookings(sb)

      setSelectedRide((prev) => {
        if (location.state?.driverId && !prev) {
          const match = b.find((x) => x.mover_id === location.state.driverId)
          if (match) return match
        }
        if (prev) {
          const fresh = b.find((x) => x.id === prev.id)
          if (fresh) return fresh
        }
        const active = b.find((x) => ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(x.status))
        return active || b[0] || null
      })

      setSelectedWarehouse((prev) => {
        if (location.state?.warehouseId && !prev) {
          const match = w.find((x) => x.id === location.state.warehouseId)
          if (match) return match
        }
        if (prev) {
          const fresh = w.find((x) => x.id === prev.id)
          if (fresh) return fresh
        }
        return w[0] || null
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToRealtimeUpdates({
      onBookingsChange: () => loadData(),
      onProfilesChange: () => loadData(),
      onWarehousesChange: () => loadData(),
      onStorageChange: () => loadData(),
      onWarehouseLogsChange: () => loadData(),
    })
    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeRides = bookings.filter((b) =>
    ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status)
  )
  const selectedWhBookings = selectedWarehouse
    ? storageBookings.filter((s) => s.warehouse_id === selectedWarehouse.id)
    : []
  const selectedDriverObj = selectedRide?.mover_id
    ? drivers.find((d) => d.id === selectedRide.mover_id)
    : null

  async function handleQuickWarehouseAudit(e) {
    e.preventDefault()
    if (!selectedWarehouse || !auditNote.trim()) return
    const targetBookingId = auditTargetId || selectedWhBookings[0]?.id
    if (!targetBookingId) {
      alert('No storage booking inside this warehouse to attach the log to.')
      return
    }
    setBusyAudit(true)
    try {
      await addAdminWarehouseTrackingLog({
        storageBookingId: targetBookingId,
        warehouseId: selectedWarehouse.id,
        title: 'Admin Live Tracking Check',
        details: auditNote.trim(),
        temperatureC: selectedWarehouse.temperature_c,
        humidityPct: selectedWarehouse.humidity_pct,
      })
      setAuditNote('')
      await loadData()
    } catch (err) {
      alert('Could not log inspection: ' + err.message)
    } finally {
      setBusyAudit(false)
    }
  }

  async function handleWarehouseStatusSwitch(opStatus) {
    if (!selectedWarehouse) return
    try {
      const updated = await updateWarehouseAdmin(selectedWarehouse.id, { operational_status: opStatus })
      setSelectedWarehouse(updated)
      setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
    } catch (err) {
      alert('Failed updating status: ' + err.message)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Navigation className="h-7 w-7 text-brand-400" />
            Live Driver & Warehouse Tracking Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS telemetry for moving drivers, route progress, QR inventory scans, and warehouse bay/climate tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            {activeRides.length} Active Moves · {warehouses.length} Warehouses
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'drivers', label: `Driver & Move Tracking (${bookings.length})`, icon: Truck },
          { id: 'warehouses', label: `Warehouse & Storage Tracking (${warehouses.length})`, icon: Warehouse },
          { id: 'all', label: 'Combined All-Assets Radar', icon: Layers },
        ].map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition border ${
                active
                  ? t.id === 'warehouses'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-brand-600 text-white border-brand-500 shadow-lg'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Main Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT LIST (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {tab === 'warehouses' ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Warehouse Hubs ({warehouses.length})
                </h2>
                <button onClick={() => setSelectedWarehouse(null)} className="text-xs font-bold text-purple-400 hover:text-purple-300">
                  Fit All Hubs
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
                {warehouses.map((wh) => {
                  const isSelected = selectedWarehouse?.id === wh.id
                  return (
                    <div
                      key={wh.id}
                      onClick={() => setSelectedWarehouse(wh)}
                      className={`rounded-2xl border p-4 cursor-pointer transition shadow-lg ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/15'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            <Warehouse className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-white truncate">{wh.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{wh.city} · {wh.owner_name}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase shrink-0 ${
                          wh.verification_status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {wh.verification_status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="rounded-lg bg-slate-950/70 p-1.5">
                          <p className="font-bold text-emerald-400">{wh.temperature_c ?? 21}°C</p>
                          <p className="text-slate-500">Temp</p>
                        </div>
                        <div className="rounded-lg bg-slate-950/70 p-1.5">
                          <p className="font-bold text-cyan-400">{wh.humidity_pct ?? 45}%</p>
                          <p className="text-slate-500">Humidity</p>
                        </div>
                        <div className="rounded-lg bg-slate-950/70 p-1.5">
                          <p className="font-bold text-white">{wh.occupancy_pct}%</p>
                          <p className="text-slate-500">Occupied</p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <span>{wh.available_units}/{wh.total_units} units free</span>
                        <span className="font-bold text-purple-300">{wh.active_bookings} active storage</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Moves & Driver Fleet ({bookings.length})
                </h2>
                <button onClick={() => setSelectedRide(null)} className="text-xs font-bold text-brand-400 hover:text-brand-300">
                  View All Fleet
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
                {bookings.map((ride) => {
                  const isSelected = selectedRide?.id === ride.id
                  const isActive = ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(ride.status)
                  return (
                    <div
                      key={ride.id}
                      onClick={() => setSelectedRide(ride)}
                      className={`rounded-2xl border p-4 cursor-pointer transition shadow-lg ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/15'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`grid h-9 w-9 place-items-center rounded-xl shrink-0 ${
                            isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            <Truck className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-white truncate">{ride.vehicle}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Driver: <span className="text-slate-200 font-semibold">{ride.mover_name || 'Unassigned'}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase shrink-0 ${
                          isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ride.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-xs">
                        <p className="flex items-center gap-2 text-slate-300 truncate">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{ride.pickup_address}</span>
                        </p>
                        <p className="flex items-center gap-2 text-slate-400 truncate">
                          <Flag className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">{ride.dropoff_address}</span>
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/50">
                        <span>{ride.customer_name}</span>
                        <span className="font-bold text-white">Rs. {Number(ride.price || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
                {bookings.length === 0 && (
                  <p className="rounded-2xl border border-slate-800 p-8 text-center text-xs text-slate-500">
                    No bookings available to track.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT MAP (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex-1 min-h-[540px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <LiveTrackingMap
              mode={tab}
              selectedRide={selectedRide}
              allRides={activeRides}
              allDrivers={drivers}
              selectedWarehouse={selectedWarehouse}
              allWarehouses={warehouses}
              className="h-[540px] w-full"
              onSelectRide={(r) => setSelectedRide(r)}
              onSelectWarehouse={(w) => setSelectedWarehouse(w)}
            />
          </div>
        </div>
      </div>

      {/* DETAILED DRIVER TRACKING INSPECTOR */}
      {tab !== 'warehouses' && selectedRide && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Driver & Move Tracking Detail · #{String(selectedRide.id).slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedRide.mover_name || 'Unassigned'} · {selectedRide.vehicle} {selectedRide.mover_plate ? `(${selectedRide.mover_plate})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setManageRide(selectedRide)}
              className="rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2 text-xs font-bold text-white"
            >
              Override Status / Reassign Driver
            </button>
          </div>

          {/* 7-stage Progress Bar */}
          <div className="grid grid-cols-7 gap-1.5">
            {MOVE_STEPS.map((st, idx) => {
              const curIdx = MOVE_STEPS.indexOf(selectedRide.status)
              const done = curIdx >= idx
              return (
                <div key={st} className="space-y-1.5 text-center">
                  <div className={`h-2 rounded-full ${done ? 'bg-brand-500' : 'bg-slate-800'}`} />
                  <p className={`text-[10px] font-bold capitalize ${done ? 'text-white' : 'text-slate-500'}`}>
                    {st.replace('_', ' ')}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Driver Telemetry */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">Driver Telemetry</p>
              <p className="font-bold text-white">{selectedRide.mover_name || 'Awaiting Driver Acceptance'}</p>
              <p className="text-slate-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {selectedRide.mover_phone || selectedDriverObj?.phone || '—'}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                GPS: {selectedRide.driver_lat != null ? `${Number(selectedRide.driver_lat).toFixed(5)}, ${Number(selectedRide.driver_lng).toFixed(5)}` : 'Awaiting GPS ping'}
              </p>
              <p className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Clock className="h-3.5 w-3.5" />
                Last Ping: {selectedRide.last_location_at ? new Date(selectedRide.last_location_at).toLocaleString() : '—'}
              </p>
            </div>

            {/* Customer & Route */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Customer & Route</p>
              <p className="font-bold text-white">{selectedRide.customer_name}</p>
              <p className="text-slate-400">{selectedRide.customer_phone || '—'}</p>
              <p className="text-slate-300 truncate"><span className="text-emerald-400">From:</span> {selectedRide.pickup_address}</p>
              <p className="text-slate-300 truncate"><span className="text-rose-400">To:</span> {selectedRide.dropoff_address}</p>
            </div>

            {/* QR Scanned Inventory */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>Inventory QR Verification</span>
                <span>{selectedRide.scanned_count}/{selectedRide.items_count}</span>
              </p>
              {(selectedRide.items || []).length === 0 ? (
                <p className="text-slate-500">No items attached.</p>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {selectedRide.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-200 truncate">
                        <QrCode className="h-3 w-3 text-brand-400 shrink-0" /> {it.name}
                      </span>
                      <span className={it.scanned ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                        {it.scanned ? 'Scanned' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAILED WAREHOUSE TRACKING INSPECTOR */}
      {tab !== 'drivers' && selectedWarehouse && (
        <div className="rounded-2xl border border-purple-500/30 bg-slate-950/75 p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Warehouse className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Warehouse Tracking Detail · {selectedWarehouse.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedWarehouse.address} · Owner: {selectedWarehouse.owner_name} ({selectedWarehouse.owner_phone || '—'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {['open', 'busy', 'maintenance', 'closed'].map((op) => (
                <button
                  key={op}
                  onClick={() => handleWarehouseStatusSwitch(op)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize border transition ${
                    selectedWarehouse.operational_status === op
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          {/* Capacity & Climate Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Occupancy</p>
              <p className="mt-1 text-lg font-black text-white">{selectedWarehouse.occupancy_pct}%</p>
              <p className="text-[10px] text-slate-400">{selectedWarehouse.occupied_capacity_sqm}/{selectedWarehouse.total_capacity_sqm} m²</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Small Units</p>
              <p className="mt-1 text-lg font-black text-brand-400">{selectedWarehouse.small_units_available}/{selectedWarehouse.small_units_total}</p>
              <p className="text-[10px] text-slate-400">Rs. {selectedWarehouse.small_rate_daily}/day</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Medium Units</p>
              <p className="mt-1 text-lg font-black text-purple-300">{selectedWarehouse.medium_units_available}/{selectedWarehouse.medium_units_total}</p>
              <p className="text-[10px] text-slate-400">Rs. {selectedWarehouse.medium_rate_daily}/day</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Large Units</p>
              <p className="mt-1 text-lg font-black text-amber-300">{selectedWarehouse.large_units_available}/{selectedWarehouse.large_units_total}</p>
              <p className="text-[10px] text-slate-400">Rs. {selectedWarehouse.large_rate_daily}/day</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Climate Sensors</p>
              <p className="mt-1 text-sm font-black text-emerald-400 flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5" /> {selectedWarehouse.temperature_c ?? 21}°C
              </p>
              <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" /> {selectedWarehouse.humidity_pct ?? 45}% RH
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Active Storage Units inside this Warehouse */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center justify-between">
                <span>Stored Customer Units ({selectedWhBookings.length})</span>
                <Boxes className="h-4 w-4" />
              </p>
              {selectedWhBookings.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No customer reservations recorded for this warehouse yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedWhBookings.map((sb) => (
                    <div
                      key={sb.id}
                      onClick={() => setManageStorage(sb)}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 hover:border-purple-500/40 p-3 text-xs cursor-pointer transition"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">
                          {sb.customer_name} · <span className="text-purple-300">{sb.unit_code || 'Bay Pending'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sb.unit_size} · {sb.duration_label} · {sb.items_summary || 'Storage items'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                        {(sb.tracking_stage || sb.status).replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Warehouse Tracking Activity Logs + Quick Admin Audit Entry */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Warehouse Audit & Tracking Timeline ({selectedWarehouse.recent_logs?.length || 0})
              </p>

              {selectedWhBookings.length > 0 && (
                <form onSubmit={handleQuickWarehouseAudit} className="flex flex-wrap gap-2">
                  <select
                    value={auditTargetId || selectedWhBookings[0]?.id || ''}
                    onChange={(e) => setAuditTargetId(e.target.value)}
                    className="rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-[11px] text-white"
                  >
                    {selectedWhBookings.map((sb) => (
                      <option key={sb.id} value={sb.id}>
                        #{String(sb.id).slice(0, 6)} ({sb.customer_name})
                      </option>
                    ))}
                  </select>
                  <input
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="Log admin CCTV/climate audit note..."
                    className="flex-1 min-w-[160px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={busyAudit || !auditNote.trim()}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Log
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {(selectedWarehouse.recent_logs || []).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No tracking events logged yet for this warehouse.</p>
                ) : (
                  selectedWarehouse.recent_logs.map((l) => (
                    <div key={l.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {l.title}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">{new Date(l.created_at).toLocaleString()}</span>
                      </div>
                      {l.details && <p className="mt-0.5 text-[11px] text-slate-400">{l.details}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {manageRide && (
        <RideModal
          ride={manageRide}
          allDrivers={drivers}
          onClose={() => setManageRide(null)}
          onUpdated={() => loadData()}
        />
      )}

      {manageStorage && (
        <StorageBookingModal
          booking={manageStorage}
          onClose={() => setManageStorage(null)}
          onUpdated={() => loadData()}
        />
      )}
    </div>
  )
}
