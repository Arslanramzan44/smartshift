import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Crosshair,
  Calendar,
  Clock,
  Plus,
  X,
  QrCode,
  MapPin,
  Truck,
  Package,
  ShieldCheck,
  CreditCard,
  Lock,
  Box,
  Sofa,
} from 'lucide-react'
import { Button, Card, Field, Steps, MapView, money } from '../components/ui'
import { TopBar } from '../components/nav'
import { vehicles, services, bookingItems } from '../lib/data'

const STEP_LABELS = ['Locations', 'Vehicle & Services', 'Add Items', 'Summary', 'Payment']

export function BookWizard() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [vehicle, setVehicle] = useState('van')
  const [extras, setExtras] = useState([])
  const [items, setItems] = useState(bookingItems)

  const go = (d) => {
    if (step + d < 0) return nav('/customer')
    if (step + d > 4) return nav('/customer/track')
    setDir(d)
    setStep(step + d)
  }
  const toggleExtra = (id) => setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const vehiclePrice = vehicles.find((v) => v.id === vehicle).price
  const extrasTotal = services.filter((s) => extras.includes(s.id)).reduce((a, s) => a + s.price, 0)

  const variants = {
    enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={step === 4 ? 'Checkout' : 'SmartShift'} brand={step !== 4} kebab={step !== 4}
        left={
          <button onClick={() => go(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      {/* progress */}
      <div className="px-5 pb-2">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="uppercase tracking-wide text-slate-400">
            Step {step + 1} of 5
          </span>
          <span className="text-brand-600">{STEP_LABELS[step]}</span>
        </div>
        <Steps total={5} current={step + 1} />
      </div>

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
            className="space-y-4 px-5 pb-6 pt-2"
          >
            {step === 0 && <StepLocations />}
            {step === 1 && (
              <StepVehicle
                vehicle={vehicle}
                setVehicle={setVehicle}
                extras={extras}
                toggleExtra={toggleExtra}
                vehiclePrice={vehiclePrice}
                extrasTotal={extrasTotal}
              />
            )}
            {step === 2 && <StepItems items={items} setItems={setItems} />}
            {step === 3 && <StepSummary vehicle={vehicle} items={items} />}
            {step === 4 && <StepPayment />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur">
        <Button onClick={() => go(1)}>
          {step === 0 && <>Next <ArrowRight className="h-4 w-4" /></>}
          {step === 1 && <>Continue to Details <ArrowRight className="h-4 w-4" /></>}
          {step === 2 && 'Next Step'}
          {step === 3 && <>Confirm & Pay <ArrowRight className="h-4 w-4" /></>}
          {step === 4 && `Pay ${money(8500)}`}
        </Button>
      </div>
    </div>
  )
}

/* ---------- Step 1: Locations ---------- */
function StepLocations() {
  return (
    <>
      <h2 className="text-xl font-extrabold text-ink">Where are you moving?</h2>
      <Card className="space-y-3 p-4">
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Pickup Location
          </span>
          <Field defaultValue="Current Location" trailing={<Crosshair className="h-4 w-4 text-brand-600" />} />
        </div>
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Drop-off Location
          </span>
          <Field placeholder="Enter destination address" />
        </div>
      </Card>
      <MapView className="h-44 rounded-2xl" />
      <Card className="p-4">
        <p className="mb-2 text-sm font-bold text-ink">When do you need to move?</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-ink">
            <Calendar className="h-4 w-4 text-brand-600" /> Today, Oct 2
          </button>
          <button className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-ink">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-600" /> Anytime
            </span>
          </button>
        </div>
      </Card>
    </>
  )
}

/* ---------- Step 2: Vehicle & Services ---------- */
function StepVehicle({ vehicle, setVehicle, extras, toggleExtra, vehiclePrice, extrasTotal }) {
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
                {active && <span className="h-2 w-2 rounded-sm bg-white" />}
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
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold text-brand-700">
          <span className="text-ink">Estimated Total</span>
          <span>{money(vehiclePrice + extrasTotal)}</span>
        </div>
      </Card>
    </>
  )
}

/* ---------- Step 3: Add Items ---------- */
function StepItems({ items, setItems }) {
  const remove = (id) => setItems((p) => p.filter((i) => i.id !== id))
  const icons = { 'ss-081': Sofa, 'ss-082': Box }
  return (
    <>
      <div>
        <h2 className="text-xl font-extrabold text-ink">Add Your Items</h2>
        <p className="text-sm text-slate-500">Items will be tracked with unique QR codes to ensure secure and efficient handling.</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-8 text-slate-400"
        onClick={() =>
          setItems((p) => [...p, { id: 'x' + p.length, name: 'New Item', tag: 'General' }])
        }
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
          <Plus className="h-6 w-6" />
        </span>
        <span className="text-sm font-semibold">Add Item +</span>
      </motion.button>

      <AnimatePresence>
        {items.map((it) => {
          const Icon = icons[it.id] || Package
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
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{it.name}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      it.tag === 'Fragile' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {it.tag}
                    </span>
                  </div>
                  <button onClick={() => remove(it.id)} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-brand-600">
                    <QrCode className="h-3.5 w-3.5" /> QR Assigned
                  </span>
                  <span className="text-slate-400">ID: SS-0{81 + items.indexOf(it)}</span>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </>
  )
}

/* ---------- Step 4: Summary ---------- */
function StepSummary({ vehicle, items }) {
  const v = vehicles.find((x) => x.id === vehicle)
  const breakdown = [
    ['Base Fare', 6000],
    ['Distance (15km)', 1500],
    ['Helpers (x2)', 800],
    ['Taxes & Fees', 200],
  ]
  return (
    <>
      <h2 className="text-xl font-extrabold text-ink">Review Your Booking</h2>
      <Card className="p-4">
        <div className="relative pl-5">
          <span className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
          <span className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" />
          <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
          <p className="text-[11px] font-bold uppercase text-slate-400">Pickup</p>
          <p className="mb-3 text-sm text-ink">123 Main Street, Appt 4B<br />Gulberg, Lahore</p>
          <p className="text-[11px] font-bold uppercase text-slate-400">Drop-off</p>
          <p className="text-sm text-ink">456 Oak Avenue, Phase 5<br />DHA, Lahore</p>
        </div>
      </Card>

      <Card className="grid grid-cols-2 gap-y-3 p-4 text-sm">
        <Info icon={Calendar} label="Date" value="Oct 24, 2023" />
        <Info icon={Clock} label="Time" value="10:00 AM" />
        <Info icon={Truck} label="Vehicle" value={v.name} />
        <Info icon={Package} label="Items" value={`${items.length} Items`} />
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-sm font-bold text-ink">Price Breakdown</p>
        <div className="space-y-1.5">
          {breakdown.map(([l, n]) => (
            <div key={l} className="flex justify-between text-sm text-slate-600">
              <span>{l}</span>
              <span>{money(n)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold">
          <span className="text-ink">Total Amount</span>
          <span className="text-brand-700">{money(8500)}</span>
        </div>
      </Card>
    </>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  )
}

/* ---------- Step 5: Payment ---------- */
function StepPayment() {
  return (
    <>
      <Card className="bg-gradient-to-br from-brand-50 to-white p-5 text-center ring-1 ring-brand-100">
        <p className="text-xs font-semibold text-slate-500">Total Amount Due</p>
        <p className="mt-1 text-4xl font-extrabold text-brand-700">{money(8500)}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure SSL Encrypted Payment
        </p>
      </Card>

      <h3 className="text-base font-bold text-ink">Payment Method</h3>
      <Card className="space-y-3 p-4">
        <Field label="Cardholder Name" placeholder="Name on card" />
        <Field label="Card Number" icon={CreditCard} placeholder="0000 0000 0000 0000" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry Date" placeholder="MM/YY" />
          <Field label="CVV" icon={Lock} placeholder="•••" />
        </div>
        <p className="text-center text-[11px] text-slate-400">
          Powered by <span className="font-bold text-indigo-500">stripe</span>
        </p>
      </Card>
    </>
  )
}
