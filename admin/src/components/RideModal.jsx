import { useState } from 'react'
import {
  X,
  Package,
  MapPin,
  Flag,
  Truck,
  User,
  Phone,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { updateBookingStatus, reassignBookingDriver, cancelBookingAdmin } from '../lib/adminData'
import { parseSafepayInfo } from '../lib/safepayInfo'

export function RideModal({ ride, allDrivers = [], onClose, onUpdated }) {
  const [status, setStatus] = useState(ride?.status || 'pending')
  const [selectedDriverId, setSelectedDriverId] = useState(ride?.mover_id || '')
  const [busy, setBusy] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)

  if (!ride) return null

  const approvedDrivers = allDrivers.filter((d) => d.verification_status === 'approved' && !d.is_banned)

  async function handleStatusChange(newStatus) {
    setBusy(true)
    try {
      const updated = await updateBookingStatus(ride.id, newStatus)
      setStatus(newStatus)
      if (onUpdated && updated) onUpdated(updated)
    } catch (err) {
      alert('Error updating ride status: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReassign() {
    const chosenDriver = allDrivers.find((d) => d.id === selectedDriverId)
    setBusy(true)
    try {
      const updated = await reassignBookingDriver(
        ride.id,
        selectedDriverId || null,
        chosenDriver?.full_name || null,
        chosenDriver?.phone || null
      )
      if (updated) setStatus(updated.status)
      if (onUpdated && updated) onUpdated(updated)
      alert(
        chosenDriver
          ? `Ride successfully assigned to ${chosenDriver.full_name}`
          : 'Ride returned to unassigned pool.'
      )
    } catch (err) {
      alert('Error reassigning driver: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      alert('Please enter a cancellation reason')
      return
    }
    setBusy(true)
    try {
      const updated = await cancelBookingAdmin(ride.id, cancelReason.trim())
      if (onUpdated && updated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error cancelling booking: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const statuses = [
    { id: 'pending', label: 'Pending' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'en_route', label: 'En Route to Pickup' },
    { id: 'loading', label: 'Loading Items' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'at_dropoff', label: 'At Drop-off' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                Booking Details · #{String(ride.id).slice(0, 8)}
              </h2>
              <p className="text-xs text-slate-400">Complete route, customer, inventory, and driver controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Override */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Ride Status (Admin Control)
            </p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => {
                const isCurrent = status === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStatusChange(s.id)}
                    disabled={busy}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                      isCurrent
                        ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Route */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">Pickup Address</p>
                <p className="text-sm font-bold text-white">{ride.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <Flag className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">Drop-off Address</p>
                <p className="text-sm font-bold text-white">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Customer & Driver Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand-400" /> Customer
              </p>
              <p className="font-extrabold text-sm text-white">{ride.customer_name || 'Customer'}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {ride.customer_phone || 'Not provided'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-400" /> Assigned Driver
              </p>
              <div className="space-y-2">
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Unassigned (Available in Pool) —</option>
                  {approvedDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.vehicle_type}) · Verified
                    </option>
                  ))}
                </select>
                {approvedDrivers.length === 0 && (
                  <p className="text-[10px] text-amber-400">
                    Approve a driver in Approvals Desk first to assign them.
                  </p>
                )}

                {selectedDriverId !== (ride.mover_id || '') && (
                  <button
                    onClick={handleReassign}
                    disabled={busy}
                    className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
                  >
                    Confirm Assignment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Vehicle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">Price / Fare</p>
              <p className="text-lg font-black text-emerald-400">Rs. {Number(ride.price || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 uppercase">{ride.payment_method || 'COD'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">Vehicle</p>
              <p className="text-xs font-bold text-white mt-1">{ride.vehicle || 'Standard'}</p>
              <p className="text-[10px] text-slate-400">{ride.distance_km ? `${ride.distance_km} km` : '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">Schedule</p>
              <p className="text-xs font-bold text-white mt-1">{ride.schedule_label || 'Immediate'}</p>
            </div>
          </div>

          {(() => {
            const sp = parseSafepayInfo(ride.notes, ride.price)
            if (!sp) return null
            return (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Safepay 30% Advance Verified
                  </p>
                  {sp.tracker && (
                    <span className="font-mono text-[10px] text-slate-400">{sp.tracker}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-900/80 p-2.5">
                    <p className="text-[10px] text-slate-400">30% Paid (Safepay)</p>
                    <p className="font-extrabold text-emerald-400">Rs. {sp.advancePaid.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-2.5">
                    <p className="text-[10px] text-slate-400">70% Remaining</p>
                    <p className="font-extrabold text-white">Rs. {sp.remainingDue.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-2.5">
                    <p className="text-[10px] text-slate-400">Balance Method</p>
                    <p className="font-bold text-slate-200">{sp.balanceMethod}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Inventory Items */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Inventory Items ({ride.items?.length || 0})</span>
              <span className="text-slate-500 text-[10px]">QR Verification Status</span>
            </p>
            {ride.items && ride.items.length > 0 ? (
              <div className="space-y-2">
                {ride.items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <QrCode className="h-4 w-4 text-brand-400" />
                      <div>
                        <p className="font-bold text-white">{it.name}</p>
                        <p className="text-[10px] text-slate-400">{it.qr_code || it.tag || 'Item'}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        it.scanned
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {it.scanned ? 'Scanned & Loaded' : 'Pending Scan'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No inventory items listed on this booking.</p>
            )}
          </div>

          {/* Cancel Prompt */}
          {showCancelPrompt ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2">
              <p className="text-xs font-bold text-rose-300">Cancellation Reason:</p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleCancel}
                  disabled={busy}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                >
                  Confirm Cancel Ride
                </button>
              </div>
            </div>
          ) : (
            status !== 'cancelled' && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCancelPrompt(true)}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                >
                  Cancel this Ride as Admin
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
