import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warehouse,
  Boxes,
  MapPin,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  PackageOpen,
  Thermometer,
  Droplets,
  QrCode,
  Phone,
  XCircle,
  ChevronDown,
  ChevronUp,
  Radio,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Card, Field, Badge, Stagger, Item, money } from '../components/ui'
import { TopBar, BottomNav } from '../components/nav'
import { useAuth } from '../lib/AuthContext'
import {
  STORAGE_UNITS,
  STORAGE_DURATIONS,
  unitRateForWarehouse,
  storagePrice,
  createStorageBooking,
  listStorageBookings,
  listApprovedWarehouses,
} from '../lib/storage'
import {
  STORAGE_FLOW,
  STORAGE_STATUS_LABEL,
  storageStatusTone,
  storageQrPayload,
  requestStorageRelease,
  cancelStorageBooking,
} from '../lib/warehouse'

export function WarehouseStorage() {
  const { user, profile } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [selectedWhId, setSelectedWhId] = useState('')
  const [cityFilter, setCityFilter] = useState('All')
  const [unit, setUnit] = useState('medium')
  const [duration, setDuration] = useState('m1')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [itemsSummary, setItemsSummary] = useState('')
  const [payMethod, setPayMethod] = useState('cod')
  const [list, setList] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionBusyId, setActionBusyId] = useState(null)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const load = async () => {
    if (!user) return
    try {
      const [whs, bookings] = await Promise.all([
        listApprovedWarehouses(),
        listStorageBookings(user.id),
      ])
      setWarehouses(whs)
      if (whs.length > 0 && !selectedWhId) {
        setSelectedWhId(whs[0].id)
      }
      setList(bookings)
    } catch (e) {
      console.warn('Storage load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cities = ['All', ...Array.from(new Set(warehouses.map((w) => w.city).filter(Boolean)))]
  const visibleWarehouses = cityFilter === 'All' ? warehouses : warehouses.filter((w) => w.city === cityFilter)
  const selectedWh = warehouses.find((w) => w.id === selectedWhId) || visibleWarehouses[0] || null

  const durObj = STORAGE_DURATIONS.find((d) => d.id === duration)
  const unitObj = STORAGE_UNITS.find((u) => u.id === unit)
  const dailyRate = unitRateForWarehouse(unit, selectedWh)
  const price = storagePrice(unit, durObj.days, selectedWh)

  async function reserve() {
    setErr('')
    if (!selectedWh) return setErr('Please select an approved warehouse.')
    if (!startDate) return setErr('Pick a start date.')
    setBusy(true)
    try {
      const created = await createStorageBooking({
        customer_id: user.id,
        customer_name: profile?.full_name || user.email,
        customer_phone: profile?.phone || null,
        warehouse_id: selectedWh.id,
        warehouse_owner_id: selectedWh.owner_id,
        warehouse: `${selectedWh.name} (${selectedWh.city})`,
        unit_size: unitObj.name,
        duration_label: durObj.label,
        days: durObj.days,
        start_date: startDate,
        price,
        payment_method: payMethod,
        items_summary: itemsSummary.trim() || 'Household / commercial storage items',
        status: 'reserved',
        tracking_stage: 'reserved',
      })
      setDone(true)
      setItemsSummary('')
      setExpandedId(created.id)
      await load()
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setErr(e.message || 'Could not reserve warehouse unit.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestRelease(booking) {
    if (!window.confirm('Notify the warehouse partner that you want to pick up / release your stored items?')) return
    setActionBusyId(booking.id)
    try {
      await requestStorageRelease(booking, user.id)
      await load()
    } catch (e) {
      alert(e.message || 'Could not request release')
    } finally {
      setActionBusyId(null)
    }
  }

  async function handleCancel(booking) {
    if (!window.confirm('Cancel this warehouse storage reservation?')) return
    setActionBusyId(booking.id)
    try {
      await cancelStorageBooking(booking, user.id, 'customer', 'Cancelled by customer before check-in.')
      await load()
    } catch (e) {
      alert(e.message || 'Could not cancel reservation')
    } finally {
      setActionBusyId(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Warehouse Storage" back />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* Hero */}
        <Item>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <p className="flex items-center gap-2 text-sm font-bold"><Warehouse className="h-5 w-5" /> Verified Warehouse Network</p>
            <p className="mt-1 max-w-[82%] text-xs text-brand-100">
              Reserve an admin-verified, climate-controlled storage unit with live tracking, QR check-in pass, and 24/7 CCTV monitoring.
            </p>
            <PackageOpen className="absolute bottom-2 right-3 h-16 w-16 text-white/20" />
          </div>
        </Item>

        {/* Choose Approved Warehouse */}
        <Item>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-base font-bold text-ink">Select Verified Warehouse</p>
            <span className="text-[11px] font-bold text-emerald-600">{warehouses.length} Admin Approved</span>
          </div>

          {cities.length > 2 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setCityFilter(c)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                    cityFilter === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid place-items-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : visibleWarehouses.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-500">
              No verified warehouses available in this city yet.
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleWarehouses.map((w) => {
                const active = selectedWh?.id === w.id
                const freeUnits = Number(w.small_units_available || 0) + Number(w.medium_units_available || 0) + Number(w.large_units_available || 0)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWhId(w.id)}
                    className={`w-full overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                      active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
                    }`}
                  >
                    {w.image_url && (
                      <img src={w.image_url} className="h-28 w-full object-cover" alt={w.name} />
                    )}
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-ink flex items-center gap-1.5">
                            {w.name}
                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-brand-500 shrink-0" /> {w.address}
                          </p>
                        </div>
                        <Badge tone={w.operational_status === 'open' ? 'green' : 'amber'}>
                          {w.operational_status || 'open'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5">{freeUnits} Units Free</span>
                        {w.climate_controlled && (
                          <span className="rounded-lg bg-brand-50 text-brand-700 px-2 py-0.5 flex items-center gap-0.5">
                            <Thermometer className="h-3 w-3" /> {w.temperature_c ?? 21}°C
                          </span>
                        )}
                        {w.cctv_enabled && <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-0.5">24/7 CCTV</span>}
                        {w.insured && <span className="rounded-lg bg-purple-50 text-purple-700 px-2 py-0.5">Insured</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Item>

        {/* Unit size */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">Choose Unit Size</p>
          <div className="space-y-2.5">
            {STORAGE_UNITS.map((u) => {
              const active = unit === u.id
              const rate = unitRateForWarehouse(u.id, selectedWh)
              const avail = selectedWh ? selectedWh[u.availField] : null
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnit(u.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-left transition ${
                    active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
                  }`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-500'}`}>
                    <Boxes className="h-6 w-6" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink">{u.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      {u.cap}{avail != null ? ` · ${avail} available` : ''}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-extrabold text-brand-700">{money(rate)}</span>
                    <span className="block text-[10px] text-slate-400">/ day</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Item>

        {/* Duration */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">Duration</p>
          <div className="flex flex-wrap gap-2">
            {STORAGE_DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  duration === d.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Clock className="h-4 w-4" /> {d.label}
              </button>
            ))}
          </div>
        </Item>

        {/* Details + Payment */}
        <Item>
          <Card className="space-y-3 p-4">
            <Field label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Field
              label="What are you storing? (Optional)"
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              placeholder="e.g. 2 Bedroom furniture, 8 boxes, fridge"
            />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Payment Method</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayMethod('cod')}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-bold ${
                    payMethod === 'cod' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <Banknote className="h-4 w-4" /> Pay at Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('card')}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-bold ${
                    payMethod === 'card' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Card Online
                </button>
              </div>
            </div>
          </Card>
        </Item>

        {/* Price Summary */}
        <Item>
          <Card className="space-y-2 bg-brand-50/60 p-4 ring-1 ring-brand-100">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{unitObj.name} · {durObj.label}</span>
              <span>{money(dailyRate)} × {durObj.days}d</span>
            </div>
            <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold">
              <span className="text-ink">Total</span>
              <span className="text-brand-700">{money(price)}</span>
            </div>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin-verified hub · Live tracking & QR Pass included
            </p>
          </Card>
        </Item>

        {err && (
          <Item>
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
            </div>
          </Item>
        )}
        {done && (
          <Item>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              <Check className="h-4 w-4" /> Storage unit reserved! Track live updates below.
            </div>
          </Item>
        )}

        <Item>
          <Button onClick={reserve} disabled={busy || !selectedWh}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Reserve Unit · ${money(price)}`}
          </Button>
        </Item>

        {/* Customer Reservations with Live Tracking */}
        <Item>
          <h3 className="text-base font-bold text-ink">Your Storage & Live Tracking ({list.length})</h3>
        </Item>
        {list.length === 0 ? (
          <Item>
            <Card className="flex flex-col items-center gap-2 p-6 text-center text-slate-400">
              <Boxes className="h-7 w-7" />
              <p className="text-sm font-semibold">No storage reserved yet</p>
            </Card>
          </Item>
        ) : (
          list.map((s) => {
            const st = s.tracking_stage || s.status || 'reserved'
            const isOpen = expandedId === s.id
            const flowIdx = STORAGE_FLOW.indexOf(st)
            const wh = s.warehouses
            return (
              <Item key={s.id}>
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Warehouse className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {s.unit_size} {s.unit_code ? `· Bay ${s.unit_code}` : ''}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{wh?.name || s.warehouse} · {s.duration_label}</p>
                      {s.start_date && <p className="text-[10px] text-slate-400">From {s.start_date}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-brand-700">{money(Number(s.price))}</p>
                      <Badge tone={storageStatusTone(st)}>{STORAGE_STATUS_LABEL[st]?.split(' ')[0] || st}</Badge>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 space-y-4"
                      >
                        {/* Live climate telemetry from warehouse */}
                        {wh && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-100 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-bold text-brand-600">
                                <Thermometer className="h-3.5 w-3.5" /> {wh.temperature_c ?? 21.5}°C
                              </span>
                              <span className="flex items-center gap-1 font-bold text-cyan-600">
                                <Droplets className="h-3.5 w-3.5" /> {wh.humidity_pct ?? 45}% RH
                              </span>
                            </div>
                            {wh.contact_phone && (
                              <a href={`tel:${wh.contact_phone}`} className="inline-flex items-center gap-1 font-bold text-brand-600">
                                <Phone className="h-3.5 w-3.5" /> Call Hub
                              </a>
                            )}
                          </div>
                        )}

                        {/* Storage QR Pass */}
                        {!['checked_out', 'cancelled'].includes(st) && (
                          <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center ring-1 ring-brand-100">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600">
                              <QrCode className="h-3.5 w-3.5" /> Storage Check-In / Release QR Pass
                            </span>
                            <div className="mt-2 rounded-xl bg-white p-2 ring-1 ring-slate-100">
                              <QRCodeSVG value={s.qr_code || storageQrPayload(s.id)} size={132} fgColor="#1d36ce" />
                            </div>
                            <p className="mt-2 text-[11px] text-slate-400">
                              Show this QR to the warehouse operator at item drop-off or pickup.
                            </p>
                          </div>
                        )}

                        {/* Progress Timeline */}
                        <div className="rounded-xl bg-white p-3.5 ring-1 ring-slate-100">
                          <p className="mb-2.5 text-xs font-bold text-ink flex items-center gap-1.5">
                            <Radio className="h-3.5 w-3.5 text-brand-600" /> Live Storage Progress
                          </p>
                          <div className="space-y-0">
                            {STORAGE_FLOW.map((step, i) => {
                              const state = i < flowIdx ? 'done' : i === flowIdx ? 'active' : 'pending'
                              return (
                                <div key={step} className="flex gap-2.5">
                                  <div className="flex flex-col items-center">
                                    <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${
                                      state === 'done'
                                        ? 'border-brand-600 bg-brand-600'
                                        : state === 'active'
                                        ? 'border-brand-600 bg-white'
                                        : 'border-slate-300 bg-white'
                                    }`}>
                                      {state === 'done' && <Check className="h-2.5 w-2.5 text-white" />}
                                      {state === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                                    </span>
                                    {i < STORAGE_FLOW.length - 1 && <span className="my-0.5 w-px flex-1 bg-slate-200" />}
                                  </div>
                                  <p className={`pb-3 text-xs ${state === 'active' ? 'font-extrabold text-brand-600' : state === 'done' ? 'font-semibold text-ink' : 'text-slate-400'}`}>
                                    {STORAGE_STATUS_LABEL[step]}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Tracking Logs */}
                        {s.warehouse_tracking_logs?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-ink">Warehouse Activity Logs</p>
                            {s.warehouse_tracking_logs.slice(0, 5).map((log) => (
                              <div key={log.id} className="rounded-xl bg-white p-2.5 text-[11px] ring-1 ring-slate-100">
                                <div className="flex justify-between gap-2">
                                  <span className="font-bold text-ink">{log.title}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                </div>
                                {log.details && <p className="mt-0.5 text-slate-500">{log.details}</p>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {st === 'in_storage' && (
                            <Button
                              onClick={() => handleRequestRelease(s)}
                              disabled={actionBusyId === s.id}
                              className="py-2.5 text-xs"
                            >
                              {actionBusyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Item Release'}
                            </Button>
                          )}
                          {st === 'reserved' && (
                            <Button
                              variant="ghost"
                              onClick={() => handleCancel(s)}
                              disabled={actionBusyId === s.id}
                              className="py-2.5 text-xs text-rose-600 ring-rose-200"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancel Reservation
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </Item>
            )
          })
        )}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}
