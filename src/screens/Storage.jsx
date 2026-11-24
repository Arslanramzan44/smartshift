import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Truck,
  LocateFixed,
  Navigation,
  Route,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Card, Field, Badge, Stagger, Item, money } from '../components/ui'
import { RouteMap, PlacesField } from '../components/maps'
import { TopBar, BottomNav } from '../components/nav'
import { useAuth } from '../lib/AuthContext'
import { vehicles, distanceFee, PER_KM_RATE } from '../lib/data'
import { getCurrentUserLocation, haversineKm } from '../lib/maps'
import { listCustomerBookings, STATUS_LABEL, statusTone } from '../lib/bookings'
import {
  STORAGE_UNITS,
  STORAGE_DURATIONS,
  unitRateForWarehouse,
  storagePrice,
  listStorageBookings,
  listApprovedWarehouses,
} from '../lib/storage'
import {
  ADVANCE_PERCENT,
  computePaymentSplit,
  generateOrderRef,
  savePendingCheckout,
  createSafepayCheckoutSession,
  parseSafepayNotes,
} from '../lib/safepay'
import {
  STORAGE_FLOW,
  STORAGE_STATUS_LABEL,
  storageStatusTone,
  storageQrPayload,
  requestStorageRelease,
  cancelStorageBooking,
} from '../lib/warehouse'

export function WarehouseStorage() {
  const nav = useNavigate()
  const { user, profile } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [selectedWhId, setSelectedWhId] = useState('')
  const [cityFilter, setCityFilter] = useState('All')
  const [unit, setUnit] = useState('medium')
  const [duration, setDuration] = useState('m1')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [itemsSummary, setItemsSummary] = useState('')
  const [payMethod, setPayMethod] = useState('cod')

  // Customer Current Location → Selected Warehouse Driver Shifting state
  const [requestDriver, setRequestDriver] = useState(true)
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupCoords, setPickupCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [vehicleId, setVehicleId] = useState('mini')

  const [list, setList] = useState([])
  const [moveBookings, setMoveBookings] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [lastCreatedMoveId, setLastCreatedMoveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionBusyId, setActionBusyId] = useState(null)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const load = async () => {
    if (!user) return
    try {
      const [whs, bookings, moves] = await Promise.all([
        listApprovedWarehouses(),
        listStorageBookings(user.id),
        listCustomerBookings(user.id).catch(() => []),
      ])
      setWarehouses(whs)
      if (whs.length > 0 && !selectedWhId) {
        setSelectedWhId(whs[0].id)
      }
      setList(bookings)
      setMoveBookings(moves)
    } catch (e) {
      console.warn('Storage load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect user current location once on mount (best-effort) so distance to warehouse shows right away
  useEffect(() => {
    let alive = true
    if (pickupAddress) return
    getCurrentUserLocation()
      .then((loc) => {
        if (!alive) return
        setPickupAddress(loc.address)
        setPickupCoords({ lat: loc.lat, lng: loc.lng })
      })
      .catch(() => {
        // User can tap Detect or type address manually
      })
    return () => {
      alive = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function detectCurrentLocation() {
    setErr('')
    setLocating(true)
    try {
      const loc = await getCurrentUserLocation()
      setPickupAddress(loc.address)
      setPickupCoords({ lat: loc.lat, lng: loc.lng })
    } catch (e) {
      setErr(e.message || 'Could not detect your current GPS location. Please type your pickup address.')
    } finally {
      setLocating(false)
    }
  }

  const cities = ['All', ...Array.from(new Set(warehouses.map((w) => w.city).filter(Boolean)))]
  const visibleWarehouses = cityFilter === 'All' ? warehouses : warehouses.filter((w) => w.city === cityFilter)
  const selectedWh = warehouses.find((w) => w.id === selectedWhId) || visibleWarehouses[0] || null

  const durObj = STORAGE_DURATIONS.find((d) => d.id === duration)
  const unitObj = STORAGE_UNITS.find((u) => u.id === unit)
  const vehicleObj = vehicles.find((v) => v.id === vehicleId) || vehicles[1]
  const dailyRate = unitRateForWarehouse(unit, selectedWh)
  const storageTotal = storagePrice(unit, durObj.days, selectedWh)

  const approxKm =
    routeInfo?.km ??
    (pickupCoords && selectedWh?.lat != null
      ? haversineKm(pickupCoords.lat, pickupCoords.lng, selectedWh.lat, selectedWh.lng)
      : 0)
  const shiftingFare = requestDriver ? vehicleObj.price + distanceFee(approxKm || 0) : 0
  const grandTotal = storageTotal + shiftingFare
  const paymentSplit = computePaymentSplit(grandTotal)

  async function reserve() {
    setErr('')
    if (!selectedWh) return setErr('Please select an approved warehouse.')
    if (!startDate) return setErr('Pick a start date.')
    if (requestDriver && !pickupAddress.trim()) {
      return setErr('Enter or detect your current pickup location so a driver can shift your items to the warehouse.')
    }
    if (paymentSplit.advanceAmount < 1) {
      return setErr('Unable to calculate 30% advance payment for this reservation.')
    }
    setBusy(true)
    try {
      const orderRef = generateOrderRef('WH')
      const origin = window.location.origin
      // Keep redirectUrl clean (no '?') because Safepay /embedded appends ?order_id=...&tracker=...
      const redirectUrl = `${origin}/payment/callback`
      const cancelUrl = `${origin}/payment/callback?order_ref=${encodeURIComponent(orderRef)}&cancelled=1`

      const session = await createSafepayCheckoutSession({
        amountPkr: paymentSplit.advanceAmount,
        orderId: orderRef,
        redirectUrl,
        cancelUrl,
      })

      const storagePayload = {
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
        price: storageTotal,
        payment_method: 'card',
        items_summary: itemsSummary.trim() || 'Household / commercial storage items',
        status: 'reserved',
        tracking_stage: 'reserved',
      }

      const parsedItems = requestDriver
        ? (itemsSummary.trim() || 'Storage Boxes, Household Furniture')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name, tag: 'Warehouse Shift' }))
        : []

      const movePayload = requestDriver
        ? {
            customer_id: user.id,
            status: 'pending',
            pickup_address: pickupAddress.trim(),
            pickup_lat: routeInfo?.pickupLat ?? pickupCoords?.lat ?? null,
            pickup_lng: routeInfo?.pickupLng ?? pickupCoords?.lng ?? null,
            dropoff_address: `${selectedWh.name} — ${selectedWh.address}`,
            dropoff_lat: routeInfo?.dropoffLat ?? selectedWh.lat ?? null,
            dropoff_lng: routeInfo?.dropoffLng ?? selectedWh.lng ?? null,
            warehouse_id: selectedWh.id,
            vehicle: vehicleObj.name,
            schedule_label: `Warehouse Shift · ${startDate}`,
            distance_km: approxKm ? Math.round(approxKm * 10) / 10 : null,
            price: shiftingFare,
            payment_method: 'card',
            customer_name: profile?.full_name || user.email,
            customer_phone: profile?.phone || null,
            notes: `Warehouse Shifting Request → ${selectedWh.name} (${selectedWh.address}). Storage Unit: ${unitObj.name} · ${durObj.label} (Ref __STORAGE_REF__). Driver must pick up from customer current location and complete shifting into this warehouse.`,
          }
        : null

      savePendingCheckout({
        orderRef,
        kind: 'warehouse',
        tracker: session.tracker,
        checkoutUrl: session.checkoutUrl,
        totalAmount: paymentSplit.total,
        advanceAmount: paymentSplit.advanceAmount,
        remainingAmount: paymentSplit.remainingAmount,
        balanceMethod: payMethod,
        storagePayload,
        movePayload,
        items: parsedItems,
        returnPath: '/customer/storage',
      })

      window.location.assign(session.checkoutUrl)
    } catch (e) {
      setErr(e.message || 'Could not initialize Safepay 30% advance checkout.')
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
      <TopBar title="Warehouse & Shifting" back />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* Hero */}
        <Item>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <p className="flex items-center gap-2 text-sm font-bold"><Warehouse className="h-5 w-5" /> Warehouse + Driver Shifting</p>
            <p className="mt-1 max-w-[85%] text-xs text-brand-100">
              Select a verified warehouse and dispatch a SmartShift driver from your current location straight into your reserved storage unit.
            </p>
            <PackageOpen className="absolute bottom-2 right-3 h-16 w-16 text-white/20" />
          </div>
        </Item>

        {/* Choose Approved Warehouse */}
        <Item>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-base font-bold text-ink">1. Select Verified Warehouse</p>
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
                const distFromUser = pickupCoords ? haversineKm(pickupCoords.lat, pickupCoords.lng, w.lat, w.lng) : null
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
                        {distFromUser != null && (
                          <span className="rounded-lg bg-brand-600 text-white px-2 py-0.5 flex items-center gap-0.5">
                            <Navigation className="h-2.5 w-2.5" /> {distFromUser} km from you
                          </span>
                        )}
                        {w.climate_controlled && (
                          <span className="rounded-lg bg-brand-50 text-brand-700 px-2 py-0.5 flex items-center gap-0.5">
                            <Thermometer className="h-3 w-3" /> {w.temperature_c ?? 21}°C
                          </span>
                        )}
                        {w.cctv_enabled && <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-0.5">24/7 CCTV</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Item>

        {/* 2. Customer Current Location → Warehouse Route & Driver Shifting Dispatch */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">2. Driver Shifting to Selected Warehouse</p>
          <Card className="p-4 space-y-3.5">
            <button
              type="button"
              onClick={() => setRequestDriver((v) => !v)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${requestDriver ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-500'}`}>
                <Truck className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">Send Request to SmartShift Driver</span>
                <span className="block text-[11px] text-slate-400">
                  Driver picks up from your current location & commits to complete shifting into {selectedWh?.name || 'selected warehouse'}
                </span>
              </span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${requestDriver ? 'bg-brand-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${requestDriver ? 'left-6' : 'left-1'}`} />
              </span>
            </button>

            {requestDriver && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" /> Your Current Pickup Location
                    </span>
                    <button
                      type="button"
                      onClick={detectCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
                    >
                      {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                      {locating ? 'Locating...' : 'Use Current GPS'}
                    </button>
                  </div>
                  <PlacesField
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onPlace={({ address, lat, lng }) => {
                      setPickupAddress(address)
                      setPickupCoords({ lat, lng })
                    }}
                    placeholder="Detect GPS or enter your pickup address"
                  />
                </div>

                {/* Live Route Map: User Current Location → Selected Warehouse */}
                {selectedWh && (
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                    <RouteMap
                      pickup={pickupAddress || (pickupCoords ? `${pickupCoords.lat},${pickupCoords.lng}` : '')}
                      dropoff={selectedWh.address}
                      onInfo={setRouteInfo}
                      className="h-44 w-full"
                    />
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-[11px] text-white">
                      <span className="flex items-center gap-1.5 font-semibold truncate">
                        <Route className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                        <span className="truncate">To: {selectedWh.name}</span>
                      </span>
                      <span className="font-extrabold text-emerald-400 shrink-0 ml-2">
                        {routeInfo?.distance || (approxKm ? `${approxKm} km` : 'Set location')}
                        {routeInfo?.duration ? ` · ${routeInfo.duration}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Vehicle Selector for Shifting */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Select Shifting Vehicle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {vehicles.map((v) => {
                      const active = vehicleId === v.id
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVehicleId(v.id)}
                          className={`rounded-xl border-2 p-2.5 text-left transition ${
                            active ? 'border-brand-600 bg-brand-50/50' : 'border-slate-100 bg-white'
                          }`}
                        >
                          <p className="text-xs font-bold text-ink">{v.name}</p>
                          <p className="text-[10px] text-slate-400">{v.cap}</p>
                          <p className="mt-0.5 text-xs font-extrabold text-brand-700">{money(v.price)}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Item>

        {/* 3. Unit size & duration */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">3. Choose Storage Unit & Duration</p>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {STORAGE_DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  duration === d.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> {d.label}
              </button>
            ))}
          </div>
        </Item>

        {/* Details + Payment */}
        <Item>
          <Card className="space-y-3 p-4">
            <Field label="Start / Shifting Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Field
              label="Items to Shift & Store (comma-separated)"
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              placeholder="e.g. Sofa Set, Master Bed, Fridge, 8 Cartons"
            />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Mandatory {ADVANCE_PERCENT}% Advance via Safepay
              </p>
              <p className="text-[11px] text-emerald-700">
                Pay <strong>{money(paymentSplit.advanceAmount)}</strong> online via Safepay to confirm your reservation &amp; dispatch driver. Settle the remaining 70% ({money(paymentSplit.remainingAmount)}) at handover.
              </p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Remaining 70% Balance Method</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayMethod('cod')}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-bold ${
                    payMethod === 'cod' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <Banknote className="h-4 w-4" /> Cash on Handover
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('card')}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-bold ${
                    payMethod === 'card' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Card on Handover
                </button>
              </div>
            </div>
          </Card>
        </Item>

        {/* Combined Price Summary */}
        <Item>
          <Card className="space-y-2 bg-brand-50/60 p-4 ring-1 ring-brand-100">
            <div className="flex justify-between text-xs text-slate-600">
              <span>{unitObj.name} · {durObj.label} ({money(dailyRate)} × {durObj.days}d)</span>
              <span className="font-bold">{money(storageTotal)}</span>
            </div>
            {requestDriver && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>
                  Driver Shifting ({vehicleObj.name}
                  {approxKm ? ` + ${approxKm} km × ${money(PER_KM_RATE)}` : ''})
                </span>
                <span className="font-bold">{money(shiftingFare)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-brand-100 pt-2 text-sm font-bold text-slate-700">
              <span>Total Estimate</span>
              <span>{money(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-emerald-700">
              <span>{ADVANCE_PERCENT}% Advance Now (Safepay)</span>
              <span>{money(paymentSplit.advanceAmount)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>70% Remaining on Handover</span>
              <span>{money(paymentSplit.remainingAmount)}</span>
            </div>
            <p className="flex items-center gap-1 pt-1 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              {requestDriver
                ? 'Confirms warehouse reservation & dispatches driver immediately after Safepay 30% advance'
                : 'Confirms warehouse unit immediately after Safepay 30% advance'}
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
            <Card className="border border-emerald-200 bg-emerald-50 p-4 space-y-2.5">
              <p className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                <Check className="h-4 w-4" />
                {lastCreatedMoveId
                  ? 'Warehouse reserved & shifting request sent to drivers!'
                  : 'Warehouse storage unit reserved!'}
              </p>
              {lastCreatedMoveId && (
                <Button
                  onClick={() => nav('/customer/track', { state: { bookingId: lastCreatedMoveId } })}
                  className="py-2.5 text-xs"
                >
                  Track Driver Shifting to Warehouse <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </Card>
          </Item>
        )}

        <Item>
          <Button onClick={reserve} disabled={busy || !selectedWh}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Lock className="h-4 w-4" /> Pay {ADVANCE_PERCENT}% Advance · {money(paymentSplit.advanceAmount)} (Safepay)
              </>
            )}
          </Button>
        </Item>

        {/* Customer Reservations with Linked Driver Shifting & Live Tracking */}
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
            const safepay = parseSafepayNotes(s.notes, s.price)
            const linkedMove = moveBookings.find(
              (m) =>
                m.warehouse_id === s.warehouse_id &&
                (m.notes?.includes(String(s.id).slice(0, 8)) || !['cancelled'].includes(m.status))
            )

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
                      {safepay && (
                        <p className="mt-0.5 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> 30% Paid ({money(safepay.advancePaid)}) · Balance {money(safepay.remainingDue)}
                        </p>
                      )}
                      {linkedMove && (
                        <p className="mt-0.5 text-[10px] font-bold text-brand-600 flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Driver Shift: {STATUS_LABEL[linkedMove.status] || linkedMove.status}
                        </p>
                      )}
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
                        {/* Linked Driver Shifting Card */}
                        {linkedMove && (
                          <div className="rounded-xl bg-white p-3 ring-1 ring-brand-100 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink flex items-center gap-1.5">
                                <Truck className="h-4 w-4 text-brand-600" /> Driver Shifting Status
                              </span>
                              <Badge tone={statusTone(linkedMove.status)}>
                                {STATUS_LABEL[linkedMove.status] || linkedMove.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {linkedMove.mover_name
                                ? `${linkedMove.mover_name} committed to shift your items to ${wh?.name || s.warehouse}.`
                                : `Request sent to nearby verified drivers to shift from your location to ${wh?.name || s.warehouse}.`}
                            </p>
                            <Link
                              to="/customer/track"
                              state={{ bookingId: linkedMove.id }}
                              className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-600"
                            >
                              Open Live Driver Tracking <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        )}

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
                              Show this QR at item drop-off or pickup.
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
