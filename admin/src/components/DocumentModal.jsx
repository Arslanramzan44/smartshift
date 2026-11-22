import { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
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
  Calendar,
  ShieldAlert,
} from 'lucide-react'
import { updateDriverVerification } from '../lib/adminData'
import { getSignedDocUrl } from '../lib/supabase'

export function DocumentModal({ driver, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('license')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [busy, setBusy] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [resolvedUrls, setResolvedUrls] = useState({})
  const [loadingUrls, setLoadingUrls] = useState(true)

  useEffect(() => {
    if (!driver) return
    let active = true
    setLoadingUrls(true)

    async function loadSignedUrls() {
      const keys = ['driving_license_url', 'police_clearance_url', 'cnic_front_url', 'cnic_back_url']
      const map = {}
      for (const k of keys) {
        const val = driver[k]
        if (val) {
          map[k] = await getSignedDocUrl(val, 3600, 'mover-docs')
        }
      }
      if (active) {
        setResolvedUrls(map)
        setLoadingUrls(false)
      }
    }

    loadSignedUrls()
    return () => {
      active = false
    }
  }, [driver])

  if (!driver) return null

  const docs = [
    {
      id: 'license',
      title: 'Driving License',
      desc: 'Official Pakistani Transport / LTV / HTV Driving License',
      url: resolvedUrls.driving_license_url || null,
      rawPath: driver.driving_license_url,
      uploaded: Boolean(driver.driving_license_url),
    },
    {
      id: 'police',
      title: 'Police Clearance Certificate',
      desc: 'Criminal Record & Character Clearance issued by Police Khidmat Markaz',
      url: resolvedUrls.police_clearance_url || null,
      rawPath: driver.police_clearance_url,
      uploaded: Boolean(driver.police_clearance_url),
    },
    {
      id: 'cnic_front',
      title: 'CNIC — Front Side',
      desc: 'National Identity Card (NADRA) Front Side with Photo and CNIC #',
      url: resolvedUrls.cnic_front_url || null,
      rawPath: driver.cnic_front_url,
      uploaded: Boolean(driver.cnic_front_url),
    },
    {
      id: 'cnic_back',
      title: 'CNIC — Back Side',
      desc: 'NADRA CNIC Reverse with Residential Address',
      url: resolvedUrls.cnic_back_url || null,
      rawPath: driver.cnic_back_url,
      uploaded: Boolean(driver.cnic_back_url),
    },
  ]

  const currentDoc = docs.find((d) => d.id === activeTab) || docs[0]
  const isPdf = String(currentDoc.rawPath || currentDoc.url || '').toLowerCase().includes('.pdf')

  async function handleApprove() {
    if (
      !confirm(
        `Are you sure you want to APPROVE driver ${driver.full_name}? This will instantly allow them to accept customer move requests.`
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const updated = await updateDriverVerification(driver.id, 'approved', null)
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error approving driver: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      alert('Please specify a rejection reason so the driver knows what to fix.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateDriverVerification(driver.id, 'rejected', rejectReason.trim())
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error rejecting driver: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSuspend() {
    if (!confirm(`Are you sure you want to SUSPEND driver ${driver.full_name}?`)) return
    setBusy(true)
    try {
      const updated = await updateDriverVerification(driver.id, 'suspended', 'Suspended by admin review.')
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (err) {
      alert('Error suspending driver: ' + err.message)
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
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Driver Verification Dossier
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${
                    driver.verification_status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : driver.verification_status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : driver.verification_status === 'suspended'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {driver.verification_status || 'pending'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Inspect uploaded driving license, CNIC, and police clearance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left: Driver Meta & Document Switcher */}
          <div className="md:col-span-4 border-r border-slate-800 p-5 space-y-5 overflow-y-auto bg-slate-950/40">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    driver.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  }
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-brand-500/30"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-white text-sm truncate">{driver.full_name || 'Mover'}</h3>
                  <p className="text-xs text-brand-400 font-semibold">{driver.vehicle_type || 'Standard Van'}</p>
                  <p className="text-[11px] font-mono text-slate-400">{driver.vehicle_plate || 'No plate'}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span>{driver.phone || 'No phone'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{driver.email || 'No email'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>Registered: {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '—'}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Documents</p>
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
                    className={`w-full text-left rounded-xl p-3 text-xs font-semibold transition border flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/15 text-white shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`h-4 w-4 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
                      <div>
                        <p className="font-bold">{d.title}</p>
                        <p className={`text-[10px] ${d.uploaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.uploaded ? 'Uploaded' : 'Not Uploaded'}
                        </p>
                      </div>
                    </div>
                    {d.uploaded ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {driver.verification_notes && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  Review Note:
                </p>
                <p className="mt-1 text-slate-300">{driver.verification_notes}</p>
              </div>
            )}
          </div>

          {/* Right: Viewer */}
          <div className="md:col-span-8 flex flex-col bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/40 text-xs">
              <div>
                <p className="font-bold text-white">{currentDoc.title}</p>
                <p className="text-[11px] text-slate-400">{currentDoc.desc}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="font-mono text-slate-400 text-xs">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 ml-1"
                  title="Rotate 90deg"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                {currentDoc.url && (
                  <a
                    href={currentDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 ml-1"
                    title="Open Original"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#070b12] min-h-[340px]">
              {loadingUrls ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <span className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  <p className="text-xs">Loading secure document from Supabase storage...</p>
                </div>
              ) : currentDoc.url ? (
                isPdf ? (
                  <iframe
                    src={currentDoc.url}
                    title={currentDoc.title}
                    className="h-[440px] w-full rounded-xl border border-slate-700 bg-white"
                  />
                ) : (
                  <div
                    className="transition-transform duration-150 origin-center max-w-full"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  >
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
                  <h4 className="font-bold text-white text-sm">Document Not Uploaded</h4>
                  <p className="text-xs text-slate-400">
                    {currentDoc.rawPath
                      ? `Could not resolve signed URL for ${currentDoc.rawPath}`
                      : `The driver has not uploaded ${currentDoc.title} yet.`}
                  </p>
                </div>
              )}
            </div>

            {showRejectBox && (
              <div className="p-4 border-t border-rose-500/30 bg-rose-950/20">
                <p className="text-xs font-bold text-rose-300 mb-1.5">Specify reason for document rejection:</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Police certificate is expired or unreadable. CNIC back photo is blurred."
                  rows={2}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={busy}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-lg"
                  >
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
                Suspend Driver
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(!showRejectBox)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition"
                >
                  <XCircle className="h-4 w-4 text-rose-400" />
                  Reject Application
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Driver & Unlock Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
