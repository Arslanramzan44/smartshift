import { useState, useEffect } from 'react'
import {
  X,
  Warehouse,
  XCircle,
  CheckCircle,
  FileText,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
} from 'lucide-react'
import { updateWarehouseVerification } from '../lib/adminData'
import { getSignedDocUrl } from '../lib/supabase'

export function WarehouseDocumentModal({ warehouse, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('business_license')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [busy, setBusy] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [resolvedUrls, setResolvedUrls] = useState({})
  const [loadingUrls, setLoadingUrls] = useState(true)

  useEffect(() => {
    if (!warehouse) return
    let active = true
    setLoadingUrls(true)

    async function loadUrls() {
      const keys = [
        'business_license_url',
        'property_ownership_url',
        'fire_safety_cert_url',
        'owner_cnic_front_url',
        'owner_cnic_back_url',
      ]
      const map = {}
      for (const k of keys) {
        if (warehouse[k]) {
          map[k] = await getSignedDocUrl(warehouse[k], 3600, 'warehouse-docs')
        }
      }
      if (active) {
        setResolvedUrls(map)
        setLoadingUrls(false)
      }
    }

    loadUrls()
    return () => {
      active = false
    }
  }, [warehouse])

  if (!warehouse) return null

  const docs = [
    {
      id: 'business_license',
      title: 'Business / Trade License',
      desc: 'Commercial registration or warehouse operating trade license',
      url: resolvedUrls.business_license_url || null,
      rawPath: warehouse.business_license_url,
      uploaded: Boolean(warehouse.business_license_url),
    },
    {
      id: 'property_ownership',
      title: 'Property Ownership / Lease Deed',
      desc: 'Verified warehouse property title or valid commercial lease agreement',
      url: resolvedUrls.property_ownership_url || null,
      rawPath: warehouse.property_ownership_url,
      uploaded: Boolean(warehouse.property_ownership_url),
    },
    {
      id: 'fire_safety',
      title: 'Fire & Safety Clearance',
      desc: 'Fire extinguisher, electrical safety, and hazard compliance certificate',
      url: resolvedUrls.fire_safety_cert_url || null,
      rawPath: warehouse.fire_safety_cert_url,
      uploaded: Boolean(warehouse.fire_safety_cert_url),
    },
    {
      id: 'cnic_front',
      title: 'Owner CNIC — Front',
      desc: 'Warehouse owner NADRA CNIC front side',
      url: resolvedUrls.owner_cnic_front_url || null,
      rawPath: warehouse.owner_cnic_front_url,
      uploaded: Boolean(warehouse.owner_cnic_front_url),
    },
    {
      id: 'cnic_back',
      title: 'Owner CNIC — Back',
      desc: 'Warehouse owner NADRA CNIC reverse side',
      url: resolvedUrls.owner_cnic_back_url || null,
      rawPath: warehouse.owner_cnic_back_url,
      uploaded: Boolean(warehouse.owner_cnic_back_url),
    },
    {
      id: 'facility_photo',
      title: 'Warehouse Facility Photo',
      desc: 'Public facility image displayed to SmartShift customers',
      url: warehouse.image_url || null,
      rawPath: warehouse.image_url,
      uploaded: Boolean(warehouse.image_url),
    },
  ]

  const currentDoc = docs.find((d) => d.id === activeTab) || docs[0]
  const isPdf = String(currentDoc.rawPath || currentDoc.url || '').toLowerCase().includes('.pdf')

  async function handleApprove() {
    if (
      !confirm(
        `APPROVE warehouse "${warehouse.name}"? It will immediately appear to SmartShift customers and allow accepting storage bookings.`
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const updated = await updateWarehouseVerification(warehouse.id, warehouse.owner_id, 'approved', null)
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error approving warehouse: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason for the warehouse owner.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateWarehouseVerification(
        warehouse.id,
        warehouse.owner_id,
        'rejected',
        rejectReason.trim()
      )
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error rejecting warehouse: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSuspend() {
    if (!confirm(`SUSPEND warehouse "${warehouse.name}"? Customers will no longer be able to reserve units here.`)) return
    setBusy(true)
    try {
      const updated = await updateWarehouseVerification(
        warehouse.id,
        warehouse.owner_id,
        'suspended',
        'Suspended by admin review.'
      )
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error suspending warehouse: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Warehouse className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Warehouse Verification Dossier
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${
                    warehouse.verification_status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : warehouse.verification_status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : warehouse.verification_status === 'suspended'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {warehouse.verification_status || 'pending'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspect business license, property deed, fire safety clearance, and owner CNIC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Split Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          <div className="md:col-span-4 border-r border-slate-800 p-5 space-y-4 overflow-y-auto bg-slate-950/40">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
              <div>
                <h3 className="font-extrabold text-white text-sm">{warehouse.name}</h3>
                <p className="text-xs text-purple-300 font-semibold">{warehouse.city} · Owner: {warehouse.owner_name}</p>
              </div>
              <div className="space-y-1.5 border-t border-slate-800 pt-2.5 text-xs text-slate-300">
                <p className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                  <span>{warehouse.address}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span>{warehouse.owner_phone || warehouse.contact_phone || 'No phone'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{warehouse.owner_email || warehouse.contact_email || 'No email'}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-[10px]">
                <div className="rounded-lg bg-slate-950 p-1.5">
                  <p className="font-extrabold text-white">{warehouse.total_capacity_sqm} m²</p>
                  <p className="text-slate-500">Area</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-1.5">
                  <p className="font-extrabold text-white">{warehouse.total_units}</p>
                  <p className="text-slate-500">Units</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-1.5">
                  <p className="font-extrabold text-emerald-400">{warehouse.temperature_c ?? 21}°C</p>
                  <p className="text-slate-500">{warehouse.humidity_pct ?? 45}% RH</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Compliance Documents</p>
              {docs.map((d) => {
                const isSelected = activeTab === d.id
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setActiveTab(d.id)
                      setZoom(1)
                      setRotation(0)
                    }}
                    className={`w-full text-left rounded-xl p-2.5 text-xs font-semibold transition border flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{d.title}</p>
                        <p className={`text-[10px] ${d.uploaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.uploaded ? 'Uploaded' : 'Not Uploaded'}
                        </p>
                      </div>
                    </div>
                    {d.uploaded ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {warehouse.verification_notes && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <p className="font-bold">Admin Note:</p>
                <p className="mt-1 text-slate-300">{warehouse.verification_notes}</p>
              </div>
            )}
          </div>

          {/* Right Preview */}
          <div className="md:col-span-8 flex flex-col bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/40 text-xs">
              <div>
                <p className="font-bold text-white">{currentDoc.title}</p>
                <p className="text-[11px] text-slate-400">{currentDoc.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="font-mono text-slate-400 text-xs">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                  <RotateCw className="h-4 w-4" />
                </button>
                {currentDoc.url && (
                  <a href={currentDoc.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#070b12] min-h-[340px]">
              {loadingUrls ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <span className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-xs">Loading secure document from warehouse-docs storage...</p>
                </div>
              ) : currentDoc.url ? (
                isPdf ? (
                  <iframe src={currentDoc.url} title={currentDoc.title} className="h-[440px] w-full rounded-xl border border-slate-700 bg-white" />
                ) : (
                  <div className="transition-transform duration-150 origin-center" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
                    <img
                      src={currentDoc.url}
                      alt={currentDoc.title}
                      className="max-h-[440px] w-auto rounded-xl object-contain shadow-2xl border border-slate-700/60"
                    />
                  </div>
                )
              ) : (
                <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center space-y-2">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 mx-auto">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">No File Uploaded</h4>
                  <p className="text-xs text-slate-400">
                    {warehouse.owner_role === 'admin'
                      ? 'Official SmartShift Hub managed by Super Admin.'
                      : `${currentDoc.title} has not been uploaded by this partner yet.`}
                  </p>
                </div>
              )}
            </div>

            {showRejectBox && (
              <div className="p-4 border-t border-rose-500/30 bg-rose-950/20">
                <p className="text-xs font-bold text-rose-300 mb-1.5">Specify rejection reason for warehouse partner:</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Fire safety certificate is expired or trade license scan is unreadable."
                  rows={2}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setShowRejectBox(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                    Cancel
                  </button>
                  <button onClick={handleReject} disabled={busy} className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white">
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 p-4 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSuspend}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
              >
                <ShieldAlert className="h-4 w-4" />
                Suspend Warehouse
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(!showRejectBox)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition"
                >
                  <XCircle className="h-4 w-4 text-rose-400" />
                  Reject Warehouse
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Warehouse & Go Live
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
