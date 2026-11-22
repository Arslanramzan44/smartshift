import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Warehouse,
  Boxes,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Phone,
  Thermometer,
  Droplets,
  QrCode,
  ClipboardList,
  Radio,
  Plus,
  Loader2,
  RefreshCw,
  ChevronRight,
  Clock,
  User,
  UserPen,
  LogOut,
  BadgeCheck,
  Wallet,
  Building2,
  Check,
  X,
  Inbox,
  Navigation,
  Lock,
} from 'lucide-react'
import { Button, Card, Badge, Field, FileUpload, Stagger, Item, money, moneyCompact } from '../components/ui'
import { TopBar, BottomNav } from '../components/nav'
import { PlacesField } from '../components/maps'
import { useAuth } from '../lib/AuthContext'
import { uploadFile } from '../lib/db'
import {
  STORAGE_FLOW,
  STORAGE_STATUS_LABEL,
  STORAGE_NEXT_ACTION,
  CITY_COORDS,
  nextStorageStage,
  storageStatusTone,
  matchesStorageQr,
  getMyWarehouse,
  createWarehouse,
  updateWarehouse,
  listWarehouseBookings,
  getStorageBookingDetail,
  listWarehouseTrackingLogs,
  advanceStorageBooking,
  addWarehouseTrackingLog,
  cancelStorageBooking,
} from '../lib/warehouse'
import { Html5Qrcode } from 'html5-qrcode'
import { Capacitor } from '@capacitor/core'
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner'

const Avatar = ({ url }) => (
  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
    {url ? <img src={url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5" />}
  </span>
)

const WAREHOUSE_DOCS = [
  { key: 'business_license_url', label: 'Business / Trade License', prefix: 'business-license', accept: 'image/*,application/pdf' },
  { key: 'property_ownership_url', label: 'Property Ownership / Lease Deed', prefix: 'ownership-deed', accept: 'image/*,application/pdf' },
  { key: 'fire_safety_cert_url', label: 'Fire & Safety Clearance Certificate', prefix: 'fire-safety', accept: 'image/*,application/pdf' },
  { key: 'owner_cnic_front_url', label: 'Owner CNIC — Front Side', prefix: 'owner-cnic-front', accept: 'image/*' },
  { key: 'owner_cnic_back_url', label: 'Owner CNIC — Back Side', prefix: 'owner-cnic-back', accept: 'image/*' },
]

function VerificationBanner({ warehouse, profile }) {
  const status = warehouse?.verification_status || profile?.verification_status || 'pending'
  if (status === 'approved') return null

  const notes = warehouse?.verification_notes || profile?.verification_notes
  const tone =
    status === 'rejected'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : status === 'suspended'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-bold">
            {status === 'rejected'
              ? 'Warehouse Verification Rejected'
              : status === 'suspended'
              ? 'Warehouse Account Suspended'
              : 'Warehouse Verification Pending Admin Approval'}
          </p>
          <p className="mt-1 text-xs opacity-90 leading-relaxed">
            {status === 'rejected'
              ? notes || 'Your submitted trade license, property deed, or fire safety certificate did not pass review. Please re-upload documents.'
              : status === 'suspended'
              ? notes || 'Your warehouse facility is temporarily paused by SmartShift Administration.'
              : 'SmartShift Admin is verifying your business license, property ownership/lease, fire safety certificate, and CNIC. Your warehouse will go live to customers and you can confirm storage requests as soon as approved.'}
          </p>
          <Link to="/warehouse/facility" className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold underline">
            Inspect Facility & Documents <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ===================== Warehouse Dashboard ===================== */
export function WarehouseDashboard() {
  const { user, profile } = useAuth()
  const [warehouse, setWarehouse] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusBusy, setStatusBusy] = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const wh = await getMyWarehouse(user.id)
      setWarehouse(wh)
      if (wh) {
        const list = await listWarehouseBookings(wh.id, user.id)
        setBookings(list)
      } else {
        const list = await listWarehouseBookings(null, user.id)
        setBookings(list)
      }
    } catch (e) {
      console.warn('Warehouse dashboard load warning:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cycleOperationalStatus(nextOp) {
    if (!warehouse || statusBusy) return
    setStatusBusy(true)
    try {
      const updated = await updateWarehouse(warehouse.id, { operational_status: nextOp })
      setWarehouse(updated)
    } catch (e) {
      alert(e.message || 'Could not update facility status')
    } finally {
      setStatusBusy(false)
    }
  }

  const pendingReqs = bookings.filter((b) => (b.tracking_stage || b.status) === 'reserved')
  const activeStored = bookings.filter((b) => ['confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(b.tracking_stage || b.status))
  const totalRevenue = bookings
    .filter((b) => (b.tracking_stage || b.status) !== 'cancelled')
    .reduce((acc, b) => acc + Number(b.price || 0), 0)

  const availUnits = warehouse
    ? Number(warehouse.small_units_available || 0) +
      Number(warehouse.medium_units_available || 0) +
      Number(warehouse.large_units_available || 0)
    : 0
  const totalUnits = warehouse
    ? Number(warehouse.small_units_total || 0) +
      Number(warehouse.medium_units_total || 0) +
      Number(warehouse.large_units_total || 0)
    : 0
  const occPct = warehouse?.total_capacity_sqm
    ? Math.min(100, Math.round((Number(warehouse.occupied_capacity_sqm || 0) / Number(warehouse.total_capacity_sqm)) * 100))
    : 0

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        brandLeft
        right={
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
        avatar={<Avatar url={profile?.avatar_url} />}
      />

      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item>
          <VerificationBanner warehouse={warehouse} profile={profile} />
        </Item>

        {loading ? (
          <Item className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Item>
        ) : !warehouse ? (
          <Item>
            <Card className="p-6 text-center space-y-3">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Warehouse className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-extrabold text-ink">Register Your Warehouse Facility</h2>
              <p className="text-xs text-slate-500">
                Set up your warehouse address, capacity, unit rates, and upload compliance documents for SmartShift Admin approval.
              </p>
              <Link to="/warehouse/facility">
                <Button><Plus className="h-4 w-4" /> Complete Warehouse Setup</Button>
              </Link>
            </Card>
          </Item>
        ) : (
          <>
            {/* Hero facility status card */}
            <Item>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-800 p-5 text-white shadow-[var(--shadow-float)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-100">
                      <Warehouse className="h-3.5 w-3.5" /> {warehouse.city} Facility
                    </p>
                    <h1 className="mt-1 text-xl font-extrabold">{warehouse.name}</h1>
                    <p className="mt-0.5 text-xs text-brand-100 line-clamp-1">{warehouse.address}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                    warehouse.verification_status === 'approved'
                      ? 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40'
                      : 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40'
                  }`}>
                    {warehouse.verification_status}
                  </span>
                </div>

                {/* Live climate + operational pills */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1 font-semibold">
                    <Thermometer className="h-3.5 w-3.5" /> {warehouse.temperature_c ?? 21.5}°C
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1 font-semibold">
                    <Droplets className="h-3.5 w-3.5" /> {warehouse.humidity_pct ?? 45}% RH
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1 font-semibold">
                    <Boxes className="h-3.5 w-3.5" /> {availUnits}/{totalUnits} Units Free
                  </span>
                </div>

                {/* Operational status switcher */}
                <div className="mt-4 flex items-center gap-1.5">
                  {['open', 'busy', 'maintenance'].map((st) => (
                    <button
                      key={st}
                      disabled={statusBusy}
                      onClick={() => cycleOperationalStatus(st)}
                      className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold capitalize transition ${
                        warehouse.operational_status === st
                          ? 'bg-white text-brand-700 shadow'
                          : 'bg-white/15 text-white/80 hover:bg-white/25'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </Item>

            {/* KPI grid */}
            <Item className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <Clock className="h-5 w-5 text-amber-500" />
                <p className="mt-2 text-2xl font-extrabold text-ink">{String(pendingReqs.length).padStart(2, '0')}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pending Requests</p>
              </Card>
              <Card className="p-4">
                <Boxes className="h-5 w-5 text-brand-600" />
                <p className="mt-2 text-2xl font-extrabold text-ink">{String(activeStored.length).padStart(2, '0')}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Active Stored</p>
              </Card>
              <Card className="p-4">
                <Building2 className="h-5 w-5 text-emerald-500" />
                <p className="mt-2 text-2xl font-extrabold text-ink">{occPct}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Space Utilized</p>
              </Card>
              <Card className="p-4">
                <Wallet className="h-5 w-5 text-purple-600" />
                <p className="mt-2 text-xl font-extrabold text-ink">{moneyCompact(totalRevenue)}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">PKR Revenue</p>
              </Card>
            </Item>

            {/* Occupancy Progress */}
            <Item>
              <Card className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">Warehouse Space Capacity</span>
                  <span className="font-bold text-brand-600">
                    {Number(warehouse.occupied_capacity_sqm || 0)} / {Number(warehouse.total_capacity_sqm || 500)} m²
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all" style={{ width: `${occPct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="font-bold text-ink">{warehouse.small_units_available}/{warehouse.small_units_total}</p>
                    <p className="text-slate-400">Small</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="font-bold text-ink">{warehouse.medium_units_available}/{warehouse.medium_units_total}</p>
                    <p className="text-slate-400">Medium</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="font-bold text-ink">{warehouse.large_units_available}/{warehouse.large_units_total}</p>
                    <p className="text-slate-400">Large</p>
                  </div>
                </div>
              </Card>
            </Item>

            {/* Recent reservations */}
            <Item className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Recent Storage Requests</h3>
              <Link to="/warehouse/bookings" className="text-sm font-bold text-brand-600">
                View All ({bookings.length})
              </Link>
            </Item>

            {bookings.length === 0 ? (
              <Item>
                <Card className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
                  <Inbox className="h-8 w-8" />
                  <p className="text-sm font-semibold">No storage reservations yet</p>
                  <p className="text-xs">Customer storage bookings for your hub will appear here in real time.</p>
                </Card>
              </Item>
            ) : (
              bookings.slice(0, 4).map((b) => {
                const st = b.tracking_stage || b.status || 'reserved'
                return (
                  <Item key={b.id}>
                    <Link to={`/warehouse/booking/${b.id}`}>
                      <Card className="p-4 hover:ring-1 hover:ring-brand-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-ink">{b.customer_name || 'Customer'}</p>
                            <p className="text-[11px] text-slate-400">
                              {b.unit_size} · {b.duration_label} {b.unit_code ? `· Unit ${b.unit_code}` : ''}
                            </p>
                          </div>
                          <Badge tone={storageStatusTone(st)}>{STORAGE_STATUS_LABEL[st] || st}</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                          <span className="text-slate-500">From {b.start_date || 'Flexible'}</span>
                          <span className="font-extrabold text-brand-700">{money(b.price)}</span>
                        </div>
                      </Card>
                    </Link>
                  </Item>
                )
              })
            )}
          </>
        )}
      </Stagger>
      <BottomNav role="warehouse" />
    </div>
  )
}

/* ===================== Warehouse Bookings & Requests ===================== */
export function WarehouseBookings() {
  const { user, profile } = useAuth()
  const [warehouse, setWarehouse] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('All')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const wh = await getMyWarehouse(user.id)
      setWarehouse(wh)
      const list = await listWarehouseBookings(wh?.id, user.id)
      setBookings(list)
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isApproved = warehouse?.verification_status === 'approved'
  const tabs = ['All', 'Pending', 'Active', 'Release Req', 'Completed']

  const filtered = bookings.filter((b) => {
    const st = b.tracking_stage || b.status
    if (tab === 'All') return true
    if (tab === 'Pending') return st === 'reserved'
    if (tab === 'Active') return ['confirmed', 'checked_in', 'in_storage'].includes(st)
    if (tab === 'Release Req') return st === 'release_requested'
    if (tab === 'Completed') return st === 'checked_out' || st === 'cancelled'
    return true
  })

  async function quickConfirm(b) {
    if (!isApproved) {
      alert('Admin Approval Required: Your warehouse must be approved by Admin before confirming customer storage requests.')
      return
    }
    setBusyId(b.id)
    try {
      await advanceStorageBooking(b, 'confirmed', {
        warehouse,
        actorId: user.id,
        actorRole: 'warehouse',
        details: `Confirmed by ${warehouse.name}. Ready for customer item drop-off.`,
      })
      await load()
    } catch (e) {
      alert(e.message || 'Could not confirm booking')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        brandLeft
        right={
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
        avatar={<Avatar url={profile?.avatar_url} />}
      />

      <div className="px-5 pt-2">
        <VerificationBanner warehouse={warehouse} profile={profile} />
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Storage Requests</h1>
        <p className="text-sm text-slate-500">Confirm reservations, assign bays, and manage customer storage.</p>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Stagger className="flex-1 space-y-3 px-5 py-4">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm font-semibold">No storage bookings in this tab</p>
          </div>
        ) : (
          filtered.map((b) => {
            const st = b.tracking_stage || b.status || 'reserved'
            return (
              <Item key={b.id}>
                <Card className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{b.customer_name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-400">
                        #{String(b.id).slice(0, 8)} · {b.unit_size} · {b.duration_label}
                      </p>
                    </div>
                    <Badge tone={storageStatusTone(st)}>{STORAGE_STATUS_LABEL[st] || st}</Badge>
                  </div>

                  {b.items_summary && (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-bold text-ink">Items:</span> {b.items_summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Start: {b.start_date || 'Immediate'} {b.unit_code ? `· Bay ${b.unit_code}` : ''}</span>
                    <span className="text-sm font-extrabold text-brand-700">{money(b.price)}</span>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <Link to={`/warehouse/booking/${b.id}`} className="flex-1">
                      <Button variant="ghost">Manage & Track</Button>
                    </Link>
                    {st === 'reserved' && (
                      isApproved ? (
                        <Button onClick={() => quickConfirm(b)} disabled={busyId === b.id} className="flex-1">
                          {busyId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Unit'}
                        </Button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => alert('Admin approval is required before confirming reservations.')}
                          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-slate-200 px-3 py-3 text-xs font-bold text-slate-600"
                        >
                          <Lock className="h-3.5 w-3.5" /> Approval Needed
                        </button>
                      )
                    )}
                  </div>
                </Card>
              </Item>
            )
          })
        )}
      </Stagger>
      <BottomNav role="warehouse" />
    </div>
  )
}

/* ===================== Warehouse Booking Detail & QR Check-in/Out ===================== */
export function WarehouseBookingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [warehouse, setWarehouse] = useState(null)
  const [unitCode, setUnitCode] = useState('')
  const [logTitle, setLogTitle] = useState('')
  const [logDetails, setLogDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrStatus, setQrStatus] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const b = await getStorageBookingDetail(id)
      setBooking(b)
      setUnitCode(b.unit_code || `A-${String(id).slice(0, 2).toUpperCase()}`)
      if (b.warehouses) {
        setWarehouse(b.warehouses)
      } else if (user) {
        setWarehouse(await getMyWarehouse(user.id))
      }
    } catch (e) {
      setErr(e.message || 'Could not load reservation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const stage = booking?.tracking_stage || booking?.status || 'reserved'
  const nextStage = nextStorageStage(stage)
  const isApproved = warehouse?.verification_status === 'approved'

  async function handleAdvance(targetStage = nextStage) {
    if (!booking || !targetStage) return
    setErr('')
    setBusy(true)
    try {
      await advanceStorageBooking(booking, targetStage, {
        warehouse,
        unitCode: unitCode.trim() || booking.unit_code,
        locationBay: unitCode.trim() || booking.unit_code,
        actorId: user.id,
        actorRole: 'warehouse',
      })
      await load()
    } catch (e) {
      setErr(e.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogInspection(e) {
    e.preventDefault()
    if (!logTitle.trim()) return
    setBusy(true)
    try {
      await addWarehouseTrackingLog({
        storageBookingId: booking.id,
        warehouseId: warehouse?.id || booking.warehouse_id,
        actorId: user.id,
        actorRole: 'warehouse',
        eventType: 'inspection_ok',
        title: logTitle.trim(),
        details: logDetails.trim() || 'Routine warehouse climate & condition inspection passed.',
        locationBay: unitCode.trim() || booking.unit_code,
        temperatureC: warehouse?.temperature_c ?? 21.5,
        humidityPct: warehouse?.humidity_pct ?? 45,
      })
      setLogTitle('')
      setLogDetails('')
      await load()
    } catch (e2) {
      setErr(e2.message || 'Could not add tracking log')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this storage reservation?')) return
    setBusy(true)
    try {
      await cancelStorageBooking(booking, user.id, 'warehouse', 'Cancelled by warehouse operator.')
      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar title="Reservation" back />
        <p className="pt-20 text-center text-sm text-slate-400">Storage reservation not found.</p>
      </div>
    )
  }

  const flowIdx = STORAGE_FLOW.indexOf(stage)
  const done = stage === 'checked_out'
  const cancelled = stage === 'cancelled'

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`Storage #${String(booking.id).slice(0, 8)}`} back />

      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <Card className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge tone={storageStatusTone(stage)}>{STORAGE_STATUS_LABEL[stage] || stage}</Badge>
                <h2 className="mt-2 text-lg font-extrabold text-ink">{booking.unit_size}</h2>
                <p className="text-xs text-slate-500">
                  {booking.duration_label} · {booking.start_date || 'Immediate'} → {booking.end_date || 'Open'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-brand-700">{money(booking.price)}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">{booking.payment_method || 'COD'}</p>
              </div>
            </div>

            {booking.items_summary && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-bold uppercase tracking-wide text-[10px] text-slate-400">Stored Inventory Description</p>
                <p className="mt-1 text-slate-700">{booking.items_summary}</p>
              </div>
            )}
          </Card>
        </Item>

        {/* Customer contact */}
        <Item>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
                {(booking.customer_name || 'C')[0]}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{booking.customer_name || 'Customer'}</p>
                <p className="text-xs text-slate-400">{booking.customer_phone || 'No phone provided'}</p>
              </div>
              {booking.customer_phone && (
                <a href={`tel:${booking.customer_phone}`} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </Card>
        </Item>

        {/* Unit / Bay assignment & QR verification */}
        {!done && !cancelled && (
          <Item>
            <Card className="p-4 space-y-3">
              <p className="text-sm font-bold text-ink">Unit Bay & QR Verification</p>
              <Field
                label="Assigned Unit / Bay Code"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                placeholder="e.g. Zone-A / Bay-04"
              />

              {(stage === 'confirmed' || stage === 'release_requested') && (
                <Button variant="soft" type="button" onClick={() => setShowQrModal(true)}>
                  <QrCode className="h-4 w-4" /> Scan Customer Storage QR Pass
                </Button>
              )}

              {qrStatus && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {qrStatus}
                </div>
              )}

              {err && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
                </div>
              )}

              {nextStage && (
                <Button onClick={() => handleAdvance(nextStage)} disabled={busy || !isApproved}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !isApproved ? (
                    <><Lock className="h-4 w-4" /> Awaiting Admin Warehouse Approval</>
                  ) : (
                    <>{STORAGE_NEXT_ACTION[stage] || `Advance to ${nextStage}`} <Navigation className="h-4 w-4" /></>
                  )}
                </Button>
              )}

              {stage === 'reserved' && (
                <Button variant="ghost" onClick={handleCancel} disabled={busy} className="text-rose-600 ring-rose-200">
                  <XCircle className="h-4 w-4" /> Decline / Cancel Request
                </Button>
              )}
            </Card>
          </Item>
        )}

        {/* Log Live Condition / Inspection Check */}
        {!cancelled && (
          <Item>
            <Card className="p-4">
              <p className="mb-2 text-sm font-bold text-ink flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-brand-600" /> Log Warehouse Tracking Update
              </p>
              <form onSubmit={handleLogInspection} className="space-y-2.5">
                <Field
                  label="Event / Check Title"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="e.g. Daily climate & seal inspection passed"
                />
                <Field
                  label="Notes (visible to Customer & Admin)"
                  value={logDetails}
                  onChange={(e) => setLogDetails(e.target.value)}
                  placeholder="e.g. All 6 cartons sealed in Zone A Bay 04 at 21°C"
                />
                <Button type="submit" variant="soft" disabled={busy || !logTitle.trim()}>
                  <Plus className="h-4 w-4" /> Record Tracking Log
                </Button>
              </form>
            </Card>
          </Item>
        )}

        {/* Lifecycle Progress */}
        <Item>
          <Card className="p-4">
            <p className="mb-3 text-sm font-bold text-ink">Storage Lifecycle</p>
            <div>
              {STORAGE_FLOW.map((s, i) => {
                const state = i < flowIdx ? 'done' : i === flowIdx ? 'active' : 'pending'
                return (
                  <div key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                          state === 'done'
                            ? 'border-brand-600 bg-brand-600'
                            : state === 'active'
                            ? 'border-brand-600 bg-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {state === 'done' && <Check className="h-3 w-3 text-white" />}
                        {state === 'active' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                      </span>
                      {i < STORAGE_FLOW.length - 1 && <span className="my-0.5 w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className={`pb-4 ${state === 'pending' ? 'opacity-50' : ''}`}>
                      <p className={`text-sm font-bold ${state === 'active' ? 'text-brand-600' : 'text-ink'}`}>
                        {STORAGE_STATUS_LABEL[s]}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </Item>

        {/* Full Audit / Tracking Logs */}
        <Item>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-bold text-ink">Live Warehouse Tracking History ({booking.warehouse_tracking_logs?.length || 0})</p>
            {(booking.warehouse_tracking_logs || []).length === 0 ? (
              <p className="text-xs text-slate-400">No tracking entries yet.</p>
            ) : (
              <div className="space-y-2.5">
                {booking.warehouse_tracking_logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-ink">{log.title}</p>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.details && <p className="mt-1 text-slate-600">{log.details}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
                      {log.location_bay && <span>Bay: {log.location_bay}</span>}
                      {log.temperature_c != null && <span>Temp: {log.temperature_c}°C</span>}
                      {log.humidity_pct != null && <span>RH: {log.humidity_pct}%</span>}
                      {log.actor_role && <span className="uppercase">By: {log.actor_role}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Item>
      </Stagger>

      {showQrModal && (
        <StorageQrScannerModal
          bookingId={booking.id}
          onVerified={async () => {
            setShowQrModal(false)
            setQrStatus('Customer Storage QR Pass Verified!')
            if (stage === 'confirmed') await handleAdvance('checked_in')
            else if (stage === 'release_requested') await handleAdvance('checked_out')
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}

      <BottomNav role="warehouse" />
    </div>
  )
}

function StorageQrScannerModal({ bookingId, onVerified, onClose }) {
  const [manual, setManual] = useState('')
  const [msg, setMsg] = useState('')
  const doneRef = useRef(false)

  useEffect(() => {
    let alive = true
    if (Capacitor.isNativePlatform()) {
      ;(async () => {
        try {
          const res = await CapacitorBarcodeScanner.scanBarcode({
            hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
            scanInstructions: "Scan customer's SmartShift Storage QR Pass",
          })
          if (!alive) return
          if (matchesStorageQr(res?.ScanResult || '', bookingId)) {
            doneRef.current = true
            onVerified()
          } else {
            setMsg('QR does not match this storage reservation.')
          }
        } catch {
          if (alive) setMsg('Camera cancelled. Enter reservation code manually below.')
        }
      })()
      return () => { alive = false }
    }

    let stopped = false
    const qr = new Html5Qrcode('warehouse-qr-reader')
    const stop = async () => {
      if (stopped) return
      stopped = true
      try { if (qr.getState && qr.getState() === 2) await qr.stop() } catch { /* ignore */ }
      try { qr.clear() } catch { /* ignore */ }
    }

    ;(async () => {
      try {
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 200 },
          async (text) => {
            if (doneRef.current || !alive) return
            if (matchesStorageQr(text, bookingId)) {
              doneRef.current = true
              await stop()
              onVerified()
            } else {
              setMsg('Scanned QR does not match this booking.')
            }
          },
          () => {}
        )
        if (!alive) await stop()
      } catch {
        if (alive) setMsg('Camera unavailable — you can verify manually with the booking ID below.')
      }
    })()

    return () => {
      alive = false
      stop()
    }
  }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  function checkManual() {
    if (matchesStorageQr(manual, bookingId) || String(bookingId).startsWith(manual.trim())) {
      onVerified()
    } else {
      setMsg('Code does not match this reservation.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
            <QrCode className="h-5 w-5 text-brand-600" /> Verify Storage Pass
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div id="warehouse-qr-reader" className="overflow-hidden rounded-2xl bg-slate-900 min-h-[180px]" />

        {msg && <p className="rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">{msg}</p>}

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <Field
            label="Or enter Booking ID / QR Code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={String(bookingId).slice(0, 8)}
          />
          <Button onClick={checkManual} disabled={!manual.trim()}>Verify Pass</Button>
        </div>
      </div>
    </div>
  )
}

/* ===================== Warehouse Live Tracking & Telemetry ===================== */
export function WarehouseTracking() {
  const { user, profile } = useAuth()
  const [warehouse, setWarehouse] = useState(null)
  const [bookings, setBookings] = useState([])
  const [logs, setLogs] = useState([])
  const [temp, setTemp] = useState('21.5')
  const [humidity, setHumidity] = useState('45')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const wh = await getMyWarehouse(user.id)
      setWarehouse(wh)
      if (wh) {
        setTemp(String(wh.temperature_c ?? 21.5))
        setHumidity(String(wh.humidity_pct ?? 45))
        const [bList, lList] = await Promise.all([
          listWarehouseBookings(wh.id, user.id),
          listWarehouseTrackingLogs(wh.id, 30),
        ])
        setBookings(bList)
        setLogs(lList)
      }
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveTelemetry(e) {
    e.preventDefault()
    if (!warehouse) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateWarehouse(warehouse.id, {
        temperature_c: Number(temp),
        humidity_pct: Number(humidity),
      })
      setWarehouse(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const storedUnits = bookings.filter((b) => ['checked_in', 'in_storage', 'release_requested'].includes(b.tracking_stage || b.status))

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        brandLeft
        right={
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
        avatar={<Avatar url={profile?.avatar_url} />}
      />

      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <h1 className="text-2xl font-extrabold text-ink">Live Warehouse Tracking</h1>
          <p className="text-xs text-slate-500">Real-time bay inventory, climate sensors, and admin-synced activity feed.</p>
        </Item>

        {loading ? (
          <Item className="grid place-items-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Item>
        ) : !warehouse ? (
          <Item>
            <Card className="p-6 text-center text-sm text-slate-500">Register your warehouse in the Facility tab first.</Card>
          </Item>
        ) : (
          <>
            {/* Live climate sensor updater */}
            <Item>
              <Card className="p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                  <Radio className="h-4 w-4 text-emerald-500 animate-pulse" /> Facility Climate Telemetry
                </p>
                <form onSubmit={saveTelemetry} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Temperature (°C)" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
                    <Field label="Humidity (% RH)" type="number" step="1" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={saving} variant="soft">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Telemetry Broadcasted</> : 'Update Live Sensors'}
                  </Button>
                </form>
              </Card>
            </Item>

            {/* Active Stored Bays */}
            <Item>
              <h3 className="mb-2 text-base font-bold text-ink">Active Stored Units ({storedUnits.length})</h3>
              {storedUnits.length === 0 ? (
                <Card className="p-6 text-center text-xs text-slate-400">No items currently checked into storage bays.</Card>
              ) : (
                <div className="space-y-2.5">
                  {storedUnits.map((u) => (
                    <Link key={u.id} to={`/warehouse/booking/${u.id}`} className="block">
                      <Card className="flex items-center gap-3 p-3.5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-extrabold text-white">
                          {u.unit_code || 'BAY'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink">{u.customer_name || 'Customer'}</p>
                          <p className="truncate text-[11px] text-slate-400">{u.unit_size} · {u.items_summary || u.duration_label}</p>
                        </div>
                        <Badge tone={storageStatusTone(u.tracking_stage || u.status)}>
                          {(u.tracking_stage || u.status).replace('_', ' ')}
                        </Badge>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </Item>

            {/* Recent Audit Trail */}
            <Item>
              <h3 className="mb-2 text-base font-bold text-ink">Recent Tracking Activity</h3>
              <Card className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <p className="p-5 text-center text-xs text-slate-400">No tracking events logged yet.</p>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-ink">{l.title}</p>
                        <span className="text-[10px] text-slate-400">{new Date(l.created_at).toLocaleTimeString()}</span>
                      </div>
                      {l.details && <p className="mt-0.5 text-slate-500">{l.details}</p>}
                      <p className="mt-1 text-[10px] font-semibold text-brand-600">
                        {l.location_bay ? `Bay ${l.location_bay}` : ''} {l.temperature_c != null ? `· ${l.temperature_c}°C` : ''} {l.humidity_pct != null ? `· ${l.humidity_pct}%` : ''}
                      </p>
                    </div>
                  ))
                )}
              </Card>
            </Item>
          </>
        )}
      </Stagger>
      <BottomNav role="warehouse" />
    </div>
  )
}

/* ===================== Warehouse Facility & Compliance Documents ===================== */
export function WarehouseFacility() {
  const { user, profile } = useAuth()
  const [warehouse, setWarehouse] = useState(null)
  const [form, setForm] = useState({
    name: '',
    city: 'Lahore',
    address: '',
    lat: 31.5204,
    lng: 74.3587,
    description: '',
    contact_phone: '',
    total_capacity_sqm: 500,
    small_units_total: 10,
    medium_units_total: 8,
    large_units_total: 5,
    small_rate_daily: 200,
    medium_rate_daily: 450,
    large_rate_daily: 900,
    climate_controlled: true,
    cctv_enabled: true,
    insured: true,
  })
  const [photo, setPhoto] = useState(null)
  const [docs, setDocs] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user) return
    getMyWarehouse(user.id)
      .then((wh) => {
        if (wh) {
          setWarehouse(wh)
          setForm({
            name: wh.name || '',
            city: wh.city || 'Lahore',
            address: wh.address || '',
            lat: wh.lat ?? 31.5204,
            lng: wh.lng ?? 74.3587,
            description: wh.description || '',
            contact_phone: wh.contact_phone || profile?.phone || '',
            total_capacity_sqm: wh.total_capacity_sqm ?? 500,
            small_units_total: wh.small_units_total ?? 10,
            medium_units_total: wh.medium_units_total ?? 8,
            large_units_total: wh.large_units_total ?? 5,
            small_rate_daily: wh.small_rate_daily ?? 200,
            medium_rate_daily: wh.medium_rate_daily ?? 450,
            large_rate_daily: wh.large_rate_daily ?? 900,
            climate_controlled: wh.climate_controlled ?? true,
            cctv_enabled: wh.cctv_enabled ?? true,
            insured: wh.insured ?? true,
          })
        } else if (profile?.phone) {
          setForm((f) => ({ ...f, contact_phone: profile.phone }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id, profile?.phone])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setErr('')
    setSaved(false)
    if (!form.name.trim() || !form.address.trim()) {
      return setErr('Warehouse name and address are required.')
    }
    setBusy(true)
    try {
      const cityFallback = CITY_COORDS[form.city] || CITY_COORDS.Lahore
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        city: form.city,
        address: form.address.trim(),
        lat: Number(form.lat) || cityFallback.lat,
        lng: Number(form.lng) || cityFallback.lng,
        description: form.description.trim() || null,
        contact_phone: form.contact_phone.trim() || profile?.phone || null,
        contact_email: profile?.email || user.email,
        total_capacity_sqm: Number(form.total_capacity_sqm) || 500,
        small_units_total: Number(form.small_units_total) || 0,
        medium_units_total: Number(form.medium_units_total) || 0,
        large_units_total: Number(form.large_units_total) || 0,
        small_rate_daily: Number(form.small_rate_daily) || 200,
        medium_rate_daily: Number(form.medium_rate_daily) || 450,
        large_rate_daily: Number(form.large_rate_daily) || 900,
        climate_controlled: form.climate_controlled,
        cctv_enabled: form.cctv_enabled,
        insured: form.insured,
      }

      if (photo) {
        payload.image_url = await uploadFile('warehouse-photos', user.id, photo, 'facility')
      }

      let uploadedNewDocs = false
      for (const d of WAREHOUSE_DOCS) {
        if (docs[d.key]) {
          payload[d.key] = await uploadFile('warehouse-docs', user.id, docs[d.key], d.prefix)
          uploadedNewDocs = true
        }
      }

      let updated
      if (warehouse) {
        if (uploadedNewDocs && warehouse.verification_status === 'rejected') {
          payload.verification_status = 'pending'
          payload.verification_notes = null
        }
        updated = await updateWarehouse(warehouse.id, payload)
      } else {
        payload.small_units_available = payload.small_units_total
        payload.medium_units_available = payload.medium_units_total
        payload.large_units_available = payload.large_units_total
        payload.verification_status = 'pending'
        updated = await createWarehouse(payload)
      }

      setWarehouse(updated)
      setPhoto(null)
      setDocs({})
      setSaved(true)
    } catch (e2) {
      setErr(e2.message || 'Could not save facility details.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-ink">Facility & Compliance</h1>
            <Badge tone={warehouse?.verification_status === 'approved' ? 'green' : warehouse?.verification_status === 'rejected' ? 'red' : 'amber'}>
              {warehouse?.verification_status || 'Pending Setup'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">Manage warehouse space, unit rates, and government verification documents.</p>
        </Item>

        {loading ? (
          <Item className="grid place-items-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Item>
        ) : (
          <Item>
            <Card className="p-5">
              <form onSubmit={save} className="space-y-4">
                {(photo || warehouse?.image_url) && (
                  <img
                    src={photo ? URL.createObjectURL(photo) : warehouse.image_url}
                    className="h-36 w-full rounded-2xl object-cover"
                    alt=""
                  />
                )}
                <FileUpload label="Warehouse Facility Photo" value={photo} onChange={setPhoto} hint="Exterior or interior storage photo" />

                <Field label="Warehouse Name" value={form.name} onChange={set('name')} placeholder="e.g. SafeVault Lahore Hub" />
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">City</span>
                  <select
                    value={form.city}
                    onChange={(e) => {
                      const c = e.target.value
                      const coords = CITY_COORDS[c] || CITY_COORDS.Lahore
                      setForm((f) => ({ ...f, city: c, lat: coords.lat, lng: coords.lng }))
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-brand-400"
                  >
                    {Object.keys(CITY_COORDS).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Full Warehouse Address</span>
                  <PlacesField
                    value={form.address}
                    onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                    onPlace={({ address, lat, lng }) => setForm((f) => ({ ...f, address, lat, lng }))}
                    placeholder="Street, sector, city..."
                  />
                </div>

                <Field label="Contact Phone" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+92 300 0000000" />
                <Field label="Description" value={form.description} onChange={set('description')} placeholder="Climate control, forklift bays, 24/7 security..." />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Total Area (m²)" type="number" value={form.total_capacity_sqm} onChange={set('total_capacity_sqm')} />
                  <Field label="Small Units" type="number" value={form.small_units_total} onChange={set('small_units_total')} />
                  <Field label="Medium Units" type="number" value={form.medium_units_total} onChange={set('medium_units_total')} />
                  <Field label="Large Units" type="number" value={form.large_units_total} onChange={set('large_units_total')} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Field label="Small/day" type="number" value={form.small_rate_daily} onChange={set('small_rate_daily')} />
                  <Field label="Med/day" type="number" value={form.medium_rate_daily} onChange={set('medium_rate_daily')} />
                  <Field label="Large/day" type="number" value={form.large_rate_daily} onChange={set('large_rate_daily')} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ['climate_controlled', 'Climate Controlled'],
                    ['cctv_enabled', '24/7 CCTV'],
                    ['insured', 'Insured'],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, [k]: !f[k] }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        form[k] ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {form[k] ? '✓ ' : ''}{label}
                    </button>
                  ))}
                </div>

                {/* Compliance Documents */}
                <div className="space-y-3 rounded-2xl bg-slate-50 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Admin Verification Documents
                  </p>
                  {WAREHOUSE_DOCS.map((d) => (
                    <FileUpload
                      key={d.key}
                      label={d.label}
                      accept={d.accept}
                      value={docs[d.key] || null}
                      onChange={(f) => setDocs((p) => ({ ...p, [d.key]: f }))}
                      hint={warehouse?.[d.key] ? 'Uploaded on file (tap to replace)' : 'Required for admin approval'}
                    />
                  ))}
                </div>

                {err && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
                  </div>
                )}
                {saved && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Facility & compliance documents saved!
                  </div>
                )}

                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Warehouse & Documents'}
                </Button>
              </form>
            </Card>
          </Item>
        )}
      </Stagger>
      <BottomNav role="warehouse" />
    </div>
  )
}

/* ===================== Warehouse Partner Profile ===================== */
export function WarehouseProfile() {
  const nav = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [warehouse, setWarehouse] = useState(null)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (!user) return
    getMyWarehouse(user.id)
      .then((wh) => {
        setWarehouse(wh)
        return listWarehouseBookings(wh?.id, user.id)
      })
      .then(setBookings)
      .catch(() => {})
  }, [user?.id])

  const earnings = bookings
    .filter((b) => (b.tracking_stage || b.status) !== 'cancelled')
    .reduce((a, b) => a + Number(b.price || 0), 0)
  const activeCount = bookings.filter((b) => ['confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(b.tracking_stage || b.status)).length
  const vStatus = warehouse?.verification_status || profile?.verification_status || 'pending'

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="flex flex-col items-center pt-1">
          <img
            src={profile?.avatar_url || 'https://i.pravatar.cc/120?img=33'}
            className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow"
            alt=""
          />
          <h2 className="mt-3 text-xl font-extrabold text-ink">{profile?.full_name || 'Warehouse Partner'}</h2>
          <p className="text-xs text-slate-400">{warehouse?.name || profile?.email}</p>
          <Badge tone={vStatus === 'approved' ? 'green' : vStatus === 'rejected' ? 'red' : 'amber'} className="mt-1.5">
            <BadgeCheck className="h-3.5 w-3.5" />
            {vStatus === 'approved' ? 'Verified Warehouse Partner' : `Verification: ${vStatus}`}
          </Badge>
        </Item>

        <Item className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Boxes className="mx-auto h-4 w-4 text-brand-500" />
            <p className="mt-1 text-lg font-extrabold text-ink">{bookings.length}</p>
            <p className="text-[10px] text-slate-400">Bookings</p>
          </Card>
          <Card className="p-3 text-center">
            <Warehouse className="mx-auto h-4 w-4 text-emerald-500" />
            <p className="mt-1 text-lg font-extrabold text-ink">{activeCount}</p>
            <p className="text-[10px] text-slate-400">Active Units</p>
          </Card>
          <Card className="p-3 text-center">
            <Wallet className="mx-auto h-4 w-4 text-purple-500" />
            <p className="mt-1 text-lg font-extrabold text-ink">{moneyCompact(earnings)}</p>
            <p className="text-[10px] text-slate-400">Revenue</p>
          </Card>
        </Item>

        <Item>
          <Card className="divide-y divide-slate-100">
            {[
              { icon: UserPen, label: 'Edit Personal Profile', to: '/profile/edit' },
              { icon: Warehouse, label: 'Facility & Compliance Docs', to: '/warehouse/facility' },
              { icon: Radio, label: 'Live Bay & Climate Tracking', to: '/warehouse/tracking' },
              { icon: ClipboardList, label: 'Storage Reservations', to: '/warehouse/bookings' },
            ].map((r) => (
              <Link key={r.label} to={r.to} className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{r.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
            <button onClick={async () => { await signOut(); nav('/') }} className="flex w-full items-center gap-3 p-4 text-rose-500">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left text-sm font-bold">Logout</span>
            </button>
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="warehouse" />
    </div>
  )
}
