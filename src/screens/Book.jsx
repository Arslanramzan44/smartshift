import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Diamond,
  Clock,
  Plus,
  Minus,
  X,
  QrCode,
  Truck,
  Package,
  ShieldCheck,
  CreditCard,
  Lock,
  Box,
  Sofa,
  Loader2,
  AlertCircle,
  Check,
  Info,
  Warehouse,
  Boxes,
} from 'lucide-react'
import { Button, Card, Field, money } from '../components/ui'
import { RouteMap, PlacesField } from '../components/maps'
import { TopBar } from '../components/nav'
import { vehicles, services, bookingItems } from '../lib/data'
import { STORAGE_UNITS, STORAGE_DURATIONS, WAREHOUSES, storagePrice, createStorageBooking } from '../lib/storage'
import { useAuth } from '../lib/AuthContext'
import { createBooking } from '../lib/bookings'

const STEP_LABELS = ['Locations', 'Vehicle', 'Inventory', 'Summary', 'Payment']

/* numbered step indicator with connectors */
function StepHeader({ step }) {
  return (
    <div className="px-5 pb-3 pt-1">
      <div className="flex items-center">
        {STEP_LABELS.map((l, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} className={`flex items-center ${i < STEP_LABELS.length - 1 ? 'flex-1' : ''}`}>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <span className={`mx-1 h-0.5 flex-1 rounded-full ${done ? 'bg-brand-600' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs font-bold text-brand-600">
        Step {step + 1} of 5 · {STEP_LABELS[step]}
      </p>
    </div>
  )
}

export function BookWizard() {
  const nav = useNavigate()
  const { user, profile } = useAuth()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [vehicle, setVehicle] = useState('van')
  const [extras, setExtras] = useState([])
  const [storage, setStorage] = useState({ on: false, unit: 'medium', duration: 'm1' })
  const [items, setItems] = useState(bookingItems.map((it) => ({ ...it, qty: 1 })))
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [scheduleLabel, setScheduleLabel] = useState('Now')
  const [routeInfo, setRouteInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const toggleExtra = (id) => setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const vehicleObj = vehicles.find((v) => v.id === vehicle)
  const vehiclePrice = vehicleObj.price
  const extrasTotal = services.filter((s) => extras.includes(s.id)).reduce((a, s) => a + s.price, 0)
  const storageDur = STORAGE_DURATIONS.find((d) => d.id === storage.duration)
  const storageTotal = storage.on ? storagePrice(storage.unit, storageDur.days) : 0
  const addOnsTotal = extrasTotal + storageTotal
  const total = vehiclePrice + addOnsTotal

  async function submitBooking() {
    setErr('')
    if (!pickup.trim() || !dropoff.trim()) {
      setStep(0)
      setDir(-1)
      return setErr('Enter both pickup and drop-off addresses.')
    }
    setBusy(true)
    try {
      const booking = await createBooking(
        {
          customer_id: user.id,
          status: 'pending',
          pickup_address: pickup.trim(),
          dropoff_address: dropoff.trim(),
          vehicle: vehicleObj.name,
          schedule_label: scheduleLabel,
          price: total,
          customer_name: profile?.full_name || null,
          customer_phone: profile?.phone || null,
        },
        items,
      )
      // Optional add-on: also reserve a warehouse unit. Best-effort — never
      // block the move booking if the storage table isn't set up.
      if (storage.on) {
        try {
          const u = STORAGE_UNITS.find((x) => x.id === storage.unit)
          await createStorageBooking({
            customer_id: user.id,
            unit_size: u.name,
            warehouse: WAREHOUSES[0],
            duration_label: storageDur.label,
            days: storageDur.days,
            start_date: null,
            price: storageTotal,
            status: 'reserved',
          })
        } catch {
          // ignore — move booking already placed
        }
      }
      nav('/customer/track', { state: { bookingId: booking.id } })
    } catch (e2) {
      setErr(e2.message || 'Could not place booking.')
    } finally {
      setBusy(false)
    }
  }

  const go = (d) => {
    setErr('')
    if (step + d < 0) return nav('/customer')
    if (step + d > 4) return submitBooking()
    setDir(d)
    setStep(step + d)
  }

  const variants = {
    enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  const nextLabel = ['Next Step', 'Continue', 'Review Summary', 'Confirm & Pay', `Pay ${money(total)}`][step]

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        brandLeft
        avatar={<span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-500"><Truck className="h-5 w-5" /></span>}
      />

      <StepHeader step={step} />

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="space-y-4 px-5 pb-6 pt-1"
          >
            {step === 0 && (
              <StepLocations
                pickup={pickup}
                setPickup={setPickup}
                dropoff={dropoff}
                setDropoff={setDropoff}
                scheduleLabel={scheduleLabel}
                setScheduleLabel={setScheduleLabel}
                routeInfo={routeInfo}
                setRouteInfo={setRouteInfo}
              />
            )}
            {step === 1 && (
              <StepVehicle
                vehicle={vehicle}
                setVehicle={setVehicle}
                extras={extras}
                toggleExtra={toggleExtra}
                vehiclePrice={vehiclePrice}
                extrasTotal={extrasTotal}
                storage={storage}
                setStorage={setStorage}
                storageTotal={storageTotal}
              />
            )}
            {step === 2 && <StepItems items={items} setItems={setItems} />}
            {step === 3 && <StepSummary vehicle={vehicle} items={items} pickup={pickup} dropoff={dropoff} scheduleLabel={scheduleLabel} total={total} storage={storage} storageDur={storageDur} storageTotal={storageTotal} />}
            {step === 4 && <StepPayment vehiclePrice={vehiclePrice} addOnsTotal={addOnsTotal} total={total} pickup={pickup} dropoff={dropoff} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur">
        {err && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => go(-1)} disabled={busy} className="w-auto px-5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={() => go(1)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{step === 4 && <Lock className="h-4 w-4" />}{nextLabel} {step < 4 && <ArrowRight className="h-4 w-4" />}</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Step 1: Locations ---------- */
function StepLocations({ pickup, setPickup, dropoff, setDropoff, scheduleLabel, setScheduleLabel, routeInfo, setRouteInfo }) {
  const options = ['Now', 'In 2 Hours', 'Evening', 'Tomorrow']
  return (
    <>
      <h2 className="text-xl font-extrabold text-ink">Where are we moving?</h2>
      <Card className="space-y-3 p-4">
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-brand-500" /> Pickup Address
          </span>
          <PlacesField value={pickup} onChange={setPickup} placeholder="Enter pickup address" />
        </div>
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Diamond className="h-3.5 w-3.5 text-rose-500" /> Drop-off Address
          </span>
          <PlacesField value={dropoff} onChange={setDropoff} placeholder="Enter destination address" />
        </div>
      </Card>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Preferred Time</p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => setScheduleLabel(o)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                scheduleLabel === o ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <RouteMap pickup={pickup} dropoff={dropoff} onInfo={setRouteInfo} className="h-52 w-full" />
        {routeInfo?.distance && (
          <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-right shadow">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Estimated Distance</span>
            <span className="block text-base font-extrabold text-brand-700">{routeInfo.distance}</span>
            {routeInfo.duration && <span className="block text-[10px] text-slate-400">{routeInfo.duration}</span>}
          </span>
        )}
      </div>
    </>
  )
}

/* ---------- Step 2: Vehicle & Services ---------- */
function StepVehicle({ vehicle, setVehicle, extras, toggleExtra, vehiclePrice, extrasTotal, storage, setStorage, storageTotal }) {
  return (
    <>
      <div>
        <h2 className="text-xl font-extrabold text-ink">Choose Vehicle</h2>
        <p className="text-sm text-slate-500">Select the transport that fits your load.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {vehicles.map((v) => {
          const active = vehicle === v.id
          return (
            <motion.button
              key={v.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setVehicle(v.id)}
              className={`rounded-2xl border-2 bg-white p-4 text-left transition ${
                active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
              }`}
            >
              <Truck className={`h-6 w-6 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
              <p className="mt-2 text-sm font-bold text-ink">{v.name}</p>
              <p className="text-[11px] text-slate-400">{v.cap}</p>
              <p className="mt-1 text-sm font-extrabold text-brand-700">{money(v.price)}</p>
            </motion.button>
          )
        })}
      </div>

      <h3 className="pt-1 text-base font-bold text-ink">Optional Services</h3>
      <Card className="divide-y divide-slate-100">
        {services.map((s) => {
          const active = extras.includes(s.id)
          return (
            <button key={s.id} onClick={() => toggleExtra(s.id)} className="flex w-full items-center gap-3 p-4 text-left">
              <span
                className={`grid h-5 w-5 place-items-center rounded-md border-2 transition ${
                  active ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
                }`}
              >
                {active && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{s.name}</span>
                <span className="block text-[11px] text-slate-400">{s.desc}</span>
              </span>
              <span className="text-sm font-bold text-brand-700">+ {money(s.price)}</span>
            </button>
          )
        })}
      </Card>

      {/* warehouse storage add-on */}
      <h3 className="pt-1 text-base font-bold text-ink">Warehouse Storage</h3>
      <Card className="p-4">
        <button onClick={() => setStorage((s) => ({ ...s, on: !s.on }))} className="flex w-full items-center gap-3 text-left">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${storage.on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-500'}`}>
            <Warehouse className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">Add secure storage</span>
            <span className="block text-[11px] text-slate-400">Store items in a warehouse before/after the move</span>
          </span>
          <span className={`relative h-6 w-11 rounded-full transition ${storage.on ? 'bg-brand-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${storage.on ? 'left-6' : 'left-1'}`} />
          </span>
        </button>

        {storage.on && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Unit Size</p>
              <div className="grid grid-cols-3 gap-2">
                {STORAGE_UNITS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setStorage((s) => ({ ...s, unit: u.id }))}
                    className={`rounded-xl border p-2 text-center transition ${
                      storage.unit === u.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200'
                    }`}
                  >
                    <Boxes className={`mx-auto h-4 w-4 ${storage.unit === u.id ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span className="mt-1 block text-[11px] font-bold text-ink">{u.name.replace(' Unit', '')}</span>
                    <span className="block text-[9px] text-slate-400">{money(u.rate)}/d</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Duration</p>
              <div className="flex flex-wrap gap-2">
                {STORAGE_DURATIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setStorage((s) => ({ ...s, duration: d.id }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      storage.duration === d.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
              <span>Storage subtotal</span>
              <span>{money(storageTotal)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-2 bg-brand-50/60 p-4 ring-1 ring-brand-100">
        <p className="text-sm font-bold text-ink">Summary</p>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Vehicle Base Fare</span>
          <span>{money(vehiclePrice)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Additional Services</span>
          <span>{money(extrasTotal)}</span>
        </div>
        {storage.on && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Warehouse Storage</span>
            <span>{money(storageTotal)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold text-brand-700">
          <span className="text-ink">Estimated Total</span>
          <span>{money(vehiclePrice + extrasTotal + storageTotal)}</span>
        </div>
      </Card>
    </>
  )
}

/* ---------- Step 3: Inventory ---------- */
const ITEM_CATEGORIES = ['Living Room', 'Kitchen', 'Bedroom', 'Furniture', 'Fragile', 'General']

function StepItems({ items, setItems }) {
  const [filter, setFilter] = useState('All Items')
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ name: '', tag: 'Living Room', sub: '', qty: 1 })
  const filters = ['All Items', 'Living Room', 'Kitchen', 'Bedroom']
  const icons = { Furniture: Sofa, Fragile: Box }
  const remove = (id) => setItems((p) => p.filter((i) => i.id !== id))
  const setQty = (id, d) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, (i.qty || 1) + d) } : i)))

  const openAdd = () => {
    setDraft({ name: '', tag: 'Living Room', sub: '', qty: 1 })
    setShowAdd(true)
  }
  const confirmAdd = () => {
    if (!draft.name.trim()) return
    setItems((p) => [
      ...p,
      { id: 'x' + p.length + '-' + p.reduce((a, i) => a + i.name.length, draft.name.length), name: draft.name.trim(), tag: draft.tag, sub: draft.sub.trim() || draft.tag, qty: draft.qty },
    ])
    setShowAdd(false)
  }

  const totalQty = items.reduce((a, i) => a + (i.qty || 1), 0)
  const visible = filter === 'All Items' ? items : items.filter((i) => i.tag === filter)

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-ink">Inventory List</h2>
        <Button variant="soft" onClick={openAdd} className="w-auto px-4 py-2 text-xs">
          <Plus className="h-4 w-4" /> Quick Add
        </Button>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {visible.map((it, idx) => {
          const Icon = icons[it.tag] || Package
          const code = `${(it.tag || 'G')[0].toUpperCase()}-${String(40 + idx).padStart(3, '0')}`
          return (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: 60 }}
            >
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink">{it.name}</p>
                      {it.tag === 'Fragile' && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-rose-100 text-rose-600">Fragile</span>
                      )}
                    </div>
                    {it.sub && <p className="text-[11px] text-slate-400">{it.sub}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <QrCode className="h-3 w-3" /> {code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => (it.qty > 1 ? setQty(it.id, -1) : remove(it.id))} className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold text-ink">{it.qty || 1}</span>
                    <button onClick={() => setQty(it.id, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {visible.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">No items in “{filter}”.</p>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={openAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-400"
      >
        <Plus className="h-5 w-5" /> Add another item
      </motion.button>

      {/* Add item sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-ink">Add Item</h3>
                <button onClick={() => setShowAdd(false)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <Field
                  label="Item Name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Living Room Sofa"
                  autoFocus
                />
                <Field
                  label="Description (optional)"
                  value={draft.sub}
                  onChange={(e) => setDraft((d) => ({ ...d, sub: e.target.value }))}
                  placeholder="e.g. 3-Seater, Velvet"
                />
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {ITEM_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft((d) => ({ ...d, tag: c }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          draft.tag === c ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Quantity</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDraft((d) => ({ ...d, qty: Math.max(1, d.qty - 1) }))} className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-ink">{draft.qty}</span>
                    <button onClick={() => setDraft((d) => ({ ...d, qty: d.qty + 1 }))} className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <Button onClick={confirmAdd} disabled={!draft.name.trim()} className="mt-2">
                  <Plus className="h-4 w-4" /> Add to Inventory
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* load summary */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
        <p className="flex items-center gap-2 text-sm font-bold"><Box className="h-4 w-4" /> Load Summary</p>
        <div className="mt-4 flex items-center justify-between border-b border-white/15 pb-3">
          <span className="text-xs text-brand-100">Total Items</span>
          <span className="text-lg font-extrabold">{String(totalQty).padStart(2, '0')}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-brand-100">Vol. Est.</span>
          <span className="text-lg font-extrabold">12m³</span>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-700">
            <QrCode className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-brand-100">Manifest QR</span>
            <span className="block text-sm font-bold">MS-8821-INV</span>
          </span>
        </div>
      </div>

      <Card className="space-y-2 bg-brand-50/60 p-4 ring-1 ring-brand-100">
        <p className="text-sm font-bold text-ink">Tips for packing</p>
        <p className="flex items-center gap-2 text-xs text-slate-600"><Check className="h-3.5 w-3.5 text-brand-600" /> Use bubble wrap for fragile items.</p>
        <p className="flex items-center gap-2 text-xs text-slate-600"><Check className="h-3.5 w-3.5 text-brand-600" /> Group by room for faster unloading.</p>
      </Card>
    </>
  )
}

/* ---------- Step 4: Summary ---------- */
function StepSummary({ vehicle, items, pickup, dropoff, scheduleLabel, total, storage, storageDur, storageTotal }) {
  const v = vehicles.find((x) => x.id === vehicle)
  const servicesOnly = total - v.price - (storage.on ? storageTotal : 0)
  return (
    <>
      <h2 className="text-xl font-extrabold text-ink">Review Your Booking</h2>
      <Card className="p-4">
        <div className="relative pl-5">
          <span className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
          <span className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" />
          <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
          <p className="text-[11px] font-bold uppercase text-slate-400">Pickup</p>
          <p className="mb-3 text-sm text-ink">{pickup || '—'}</p>
          <p className="text-[11px] font-bold uppercase text-slate-400">Drop-off</p>
          <p className="text-sm text-ink">{dropoff || '—'}</p>
        </div>
      </Card>

      <Card className="grid grid-cols-2 gap-y-3 p-4 text-sm">
        <Info2 icon={Clock} label="Schedule" value={scheduleLabel} />
        <Info2 icon={Truck} label="Vehicle" value={v.name} />
        <Info2 icon={Package} label="Items" value={`${items.length} Items`} />
        <Info2 icon={Clock} label="Status" value="Pending mover" />
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-sm font-bold text-ink">Price Breakdown</p>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Vehicle ({v.name})</span>
          <span>{money(v.price)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-slate-600">
          <span>Additional Services</span>
          <span>{money(servicesOnly)}</span>
        </div>
        {storage.on && (
          <div className="mt-1 flex justify-between text-sm text-slate-600">
            <span>Warehouse Storage ({storageDur.label})</span>
            <span>{money(storageTotal)}</span>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold">
          <span className="text-ink">Total Amount</span>
          <span className="text-brand-700">{money(total)}</span>
        </div>
      </Card>
    </>
  )
}

function Info2({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  )
}

/* ---------- Step 5: Payment / Checkout ---------- */
function StepPayment({ vehiclePrice, addOnsTotal, total, pickup, dropoff }) {
  const [save, setSave] = useState(false)
  return (
    <>
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Complete Booking</h2>
        <p className="text-sm text-slate-500">Your move is scheduled. Enter your payment to confirm the shift.</p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            <CreditCard className="h-4 w-4" /> Credit or Debit Card
          </span>
          <span className="flex gap-1">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">VISA</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">MC</span>
          </span>
        </div>
        <Field label="Cardholder Name" placeholder="John Doe" />
        <Field label="Card Number" trailing={<Lock className="h-4 w-4" />} placeholder="0000 0000 0000 0000" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry Date" placeholder="MM/YY" />
          <Field label="CVV" placeholder="•••" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setSave(!save)}
            className={`grid h-5 w-5 place-items-center rounded-md border-2 transition ${save ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`}
          >
            {save && <Check className="h-3 w-3 text-white" />}
          </button>
          Save card details for future moves
        </label>
      </Card>

      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure SSL Encryption
        </span>
        <span className="text-[11px] text-slate-400">Powered by <span className="font-bold text-indigo-500">stripe</span></span>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-base font-bold text-ink">Move Summary</p>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Base Logistics Fee</span>
          <span className="font-semibold text-ink">{money(vehiclePrice)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-600">
          <span>Add-ons & Services</span>
          <span className="font-semibold text-ink">{money(addOnsTotal)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold">
          <span className="text-ink">Total Amount</span>
          <span className="text-brand-700">{money(total)}</span>
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl">
        <RouteMap pickup={pickup} dropoff={dropoff} dark className="h-36 w-full" />
      </div>
      <p className="flex items-center gap-1 px-1 text-[11px] font-semibold text-slate-500">
        <MapPin className="h-3.5 w-3.5 text-brand-500" /> {pickup || 'Pickup'} → {dropoff || 'Drop-off'}
      </p>

      <div className="flex gap-2 rounded-xl bg-brand-50 p-3 text-[11px] text-brand-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>A temporary authorization hold of {money(500)} will be applied to verify your card validity.</span>
      </div>
    </>
  )
}
