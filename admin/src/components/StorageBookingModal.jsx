import { useState } from 'react'
import {
  X,
  Warehouse,
  User,
  Phone,
  Boxes,
  Thermometer,
  Droplets,
  Radio,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { updateStorageBookingAdmin, addAdminWarehouseTrackingLog } from '../lib/adminData'

const STAGES = [
  { id: 'reserved', label: 'Reserved' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'checked_in', label: 'Checked In' },
  { id: 'in_storage', label: 'In Storage' },
  { id: 'release_requested', label: 'Release Req' },
  { id: 'checked_out', label: 'Checked Out' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function StorageBookingModal({ booking, onClose, onUpdated }) {
  const [stage, setStage] = useState(booking?.tracking_stage || booking?.status || 'reserved')
  const [unitCode, setUnitCode] = useState(booking?.unit_code || '')
  const [logTitle, setLogTitle] = useState('')
  const [logDetails, setLogDetails] = useState('')
  const [busy, setBusy] = useState(false)

  if (!booking) return null

  async function handleStageChange(nextStage) {
    setBusy(true)
    try {
      const updated = await updateStorageBookingAdmin(
        booking.id,
        {
          tracking_stage: nextStage,
          status: nextStage,
          unit_code: unitCode.trim() || booking.unit_code || null,
        },
        {
          warehouse_id: booking.warehouse_id,
          event_type: nextStage,
          title: `Admin Updated Stage → ${nextStage.replace('_', ' ')}`,
          details: `Administrative stage override to ${nextStage}.`,
          location_bay: unitCode.trim() || booking.unit_code || null,
          temperature_c: booking.warehouses?.temperature_c ?? null,
          humidity_pct: booking.warehouses?.humidity_pct ?? null,
        }
      )
      setStage(nextStage)
      if (onUpdated && updated) onUpdated(updated)
    } catch (err) {
      alert('Error updating storage booking: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveBay() {
    setBusy(true)
    try {
      const updated = await updateStorageBookingAdmin(
        booking.id,
        { unit_code: unitCode.trim() || null },
        {
          warehouse_id: booking.warehouse_id,
          event_type: 'unit_assigned',
          title: `Bay Assigned: ${unitCode.trim()}`,
          details: `Admin assigned storage bay/unit ${unitCode.trim()}.`,
          location_bay: unitCode.trim(),
        }
      )
      if (onUpdated && updated) onUpdated(updated)
    } catch (err) {
      alert('Error updating unit code: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAddLog(e) {
    e.preventDefault()
    if (!logTitle.trim()) return
    setBusy(true)
    try {
      await addAdminWarehouseTrackingLog({
        storageBookingId: booking.id,
        warehouseId: booking.warehouse_id,
        title: logTitle.trim(),
        details: logDetails.trim() || 'Admin warehouse tracking audit entry.',
        locationBay: unitCode.trim() || booking.unit_code || null,
        temperatureC: booking.warehouses?.temperature_c ?? null,
        humidityPct: booking.warehouses?.humidity_pct ?? null,
      })
      const updated = await updateStorageBookingAdmin(booking.id, {}, null)
      setLogTitle('')
      setLogDetails('')
      if (onUpdated && updated) onUpdated(updated)
    } catch (err) {
      alert('Error logging tracking update: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Warehouse className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                Storage Booking · #{String(booking.id).slice(0, 8)}
              </h2>
              <p className="text-xs text-slate-400">
                {booking.warehouse_name} · {booking.unit_size} · {booking.duration_label}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Admin Stage Override */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tracking Stage (Admin Control)
            </p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.id)}
                  disabled={busy}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                    stage === s.id
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer & Warehouse Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand-400" /> Customer
              </p>
              <p className="font-extrabold text-sm text-white">{booking.customer_name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {booking.customer_phone || 'Not provided'}
              </p>
              <p className="text-[11px] text-slate-500">
                {booking.start_date || 'Immediate'} → {booking.end_date || 'Open'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-purple-400" /> Assigned Unit / Bay
              </p>
              <div className="flex gap-2">
                <input
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  placeholder="e.g. Zone-A / B-04"
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleSaveBay}
                  disabled={busy}
                  className="rounded-xl bg-brand-600 hover:bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Assign
                </button>
              </div>
              {booking.warehouses && (
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Thermometer className="h-3.5 w-3.5" /> {booking.warehouses.temperature_c ?? 21}°C
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Droplets className="h-3.5 w-3.5" /> {booking.warehouses.humidity_pct ?? 45}% RH
                  </span>
                </div>
              )}
            </div>
          </div>

          {booking.items_summary && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs">
              <p className="font-bold uppercase tracking-wider text-slate-400">Stored Inventory Summary</p>
              <p className="mt-1 text-slate-200">{booking.items_summary}</p>
            </div>
          )}

          {/* Add Tracking Audit Log */}
          <form onSubmit={handleAddLog} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-emerald-400" /> Add Admin Warehouse Tracking Note
            </p>
            <input
              value={logTitle}
              onChange={(e) => setLogTitle(e.target.value)}
              placeholder="Title (e.g. Admin CCTV & Climate Audit Passed)"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <input
                value={logDetails}
                onChange={(e) => setLogDetails(e.target.value)}
                placeholder="Details visible to warehouse & customer..."
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={busy || !logTitle.trim()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Log
              </button>
            </div>
          </form>

          {/* Tracking History */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tracking Audit Timeline ({booking.warehouse_tracking_logs?.length || 0})
            </p>
            {(booking.warehouse_tracking_logs || []).length === 0 ? (
              <p className="text-xs text-slate-500">No tracking logs recorded yet.</p>
            ) : (
              booking.warehouse_tracking_logs.map((l) => (
                <div key={l.id} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {l.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  {l.details && <p className="mt-1 text-slate-400">{l.details}</p>}
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {l.location_bay && <span>Bay: {l.location_bay}</span>}
                    {l.temperature_c != null && <span>Temp: {l.temperature_c}°C</span>}
                    {l.actor_role && <span className="uppercase text-brand-400">By {l.actor_role}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
