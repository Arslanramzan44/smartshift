import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Home,
  Truck,
  Package,
  Check,
  AlertCircle,
  Loader2,
  User,
  Camera,
  Pencil,
  ShieldCheck,
  Headset,
  Warehouse,
} from 'lucide-react'
import { Button, Field, FileUpload, Logo, Card, Stagger, Item } from '../components/ui'
import { TopBar } from '../components/nav'
import { PlacesField } from '../components/maps'
import { setRole, getRole, homeFor } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { uploadFile, upsertProfile, getProfile } from '../lib/db'
import { createWarehouse, CITY_COORDS } from '../lib/warehouse'

/* ===================== Onboarding ===================== */
const slides = [
  {
    title: 'Book Your Move',
    text: 'Schedule your logistics in seconds. Choose your vehicle, date, and labor needs with our intuitive booking engine.',
    art: 'move',
  },
  {
    title: 'Track in Real Time',
    text: 'Follow your mover live and scan every item with QR codes for total peace of mind.',
    art: 'track',
  },
  {
    title: 'Pay Securely',
    text: 'Transparent pricing with SSL-encrypted checkout. No hidden fees, ever.',
    art: 'pay',
  },
]

function OnboardArt({ kind }) {
  return (
    <motion.div
      key={kind}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative mx-auto grid h-64 w-64 place-items-center"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-100/70 to-brand-50/40" />
      <div className="absolute inset-6 rounded-full border-2 border-dashed border-brand-200/70" />
      <motion.div className="animate-float relative grid h-28 w-28 place-items-center rounded-3xl bg-white shadow-xl shadow-brand-600/10">
        {kind === 'move' && <Package className="h-14 w-14 text-brand-600" strokeWidth={1.6} />}
        {kind === 'track' && <Truck className="h-14 w-14 text-brand-600" strokeWidth={1.6} />}
        {kind === 'pay' && <Check className="h-14 w-14 text-emerald-500" strokeWidth={2} />}
      </motion.div>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-3 rounded-full bg-brand-300"
          style={{ top: `${20 + i * 30}%`, left: i % 2 ? '12%' : '82%' }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2 + i, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  )
}

export function Onboarding() {
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const last = i === slides.length - 1
  const next = () => (last ? nav('/role') : setI(i + 1))
  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <Logo plain />
        <button onClick={() => nav('/role')} className="text-sm font-semibold text-slate-500">
          Skip
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <OnboardArt kind={slides[i].art} />
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-10"
          >
            <h1 className="text-3xl font-extrabold text-ink">{slides[i].title}</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500">{slides[i].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mb-5 flex justify-center gap-2">
        {slides.map((_, k) => (
          <motion.span
            key={k}
            animate={{ width: k === i ? 28 : 8, backgroundColor: k === i ? '#2546e6' : '#cbd5e1' }}
            className="h-2 rounded-full"
          />
        ))}
      </div>
      <Button onClick={next}>{last ? 'Get Started' : 'Next'}</Button>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-brand-600">
          Log In
        </Link>
      </p>
    </div>
  )
}

/* ===================== Register ===================== */
// Documents a mover must upload — all required.
const moverDocs = [
  { key: 'driving_license', label: 'Driving License' },
  { key: 'cnic_front', label: 'CNIC — Front Side' },
  { key: 'cnic_back', label: 'CNIC — Back Side' },
  { key: 'police_clearance', label: 'Police Clearance Certificate', accept: 'image/*,application/pdf' },
]

// Documents a warehouse partner must upload — all required for admin approval.
const warehouseDocs = [
  { key: 'business_license', label: 'Business / Trade License', accept: 'image/*,application/pdf' },
  { key: 'property_ownership', label: 'Property Ownership / Lease Deed', accept: 'image/*,application/pdf' },
  { key: 'fire_safety_cert', label: 'Fire & Safety Certificate', accept: 'image/*,application/pdf' },
  { key: 'owner_cnic_front', label: 'Owner CNIC — Front Side' },
  { key: 'owner_cnic_back', label: 'Owner CNIC — Back Side' },
]

export function ErrorMsg({ children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function Register() {
  const nav = useNavigate()
  const initialRole = getRole()
  const [role, setRoleState] = useState(
    ['customer', 'mover', 'warehouse'].includes(initialRole) ? initialRole : 'customer'
  )
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'Mini Truck',
    vehiclePlate: '',
    warehouseName: '',
    warehouseCity: 'Lahore',
    warehouseAddress: '',
    warehouseLat: 31.5204,
    warehouseLng: 74.3587,
    capacitySqm: '500',
    smallUnits: '10',
    mediumUnits: '8',
    largeUnits: '5',
    smallRate: '200',
    mediumRate: '450',
    largeRate: '900',
    climateControlled: true,
    cctvEnabled: true,
    insured: true,
  })
  const [avatar, setAvatar] = useState(null)
  const [warehousePhoto, setWarehousePhoto] = useState(null)
  const [docs, setDocs] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const isMover = role === 'mover'
  const isWarehouse = role === 'warehouse'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pickRole = (r) => {
    setRoleState(r)
    setRole(r)
    setErr('')
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')

    // ---- validation ----
    if (!form.fullName.trim()) return setErr('Full name is required.')
    if (!form.email.trim()) return setErr('Email is required.')
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.')
    if (isMover) {
      if (!avatar) return setErr('Profile photo is required.')
      for (const d of moverDocs) {
        if (!docs[d.key]) return setErr(`${d.label} is required.`)
      }
    }
    if (isWarehouse) {
      if (!avatar) return setErr('Owner profile photo is required.')
      if (!form.warehouseName.trim()) return setErr('Warehouse name is required.')
      if (!form.warehouseAddress.trim()) return setErr('Warehouse address is required.')
      for (const d of warehouseDocs) {
        if (!docs[d.key]) return setErr(`${d.label} is required for admin approval.`)
      }
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      })
      if (error) throw error
      const user = data.user
      if (!user) throw new Error('Sign up failed. Please try again.')

      const profile = {
        id: user.id,
        role,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        verification_status: isMover || isWarehouse ? 'pending' : 'approved',
      }
      if (isMover) {
        profile.vehicle_type = form.vehicleType || 'Mini Truck'
        profile.vehicle_plate = form.vehiclePlate.trim() || null
      }
      if (avatar) profile.avatar_url = await uploadFile('avatars', user.id, avatar, 'avatar')
      if (isMover) {
        profile.driving_license_url = await uploadFile('mover-docs', user.id, docs.driving_license, 'license')
        profile.cnic_front_url = await uploadFile('mover-docs', user.id, docs.cnic_front, 'cnic-front')
        profile.cnic_back_url = await uploadFile('mover-docs', user.id, docs.cnic_back, 'cnic-back')
        profile.police_clearance_url = await uploadFile('mover-docs', user.id, docs.police_clearance, 'police')
      }

      await upsertProfile(profile)

      if (isWarehouse) {
        const cityFallback = CITY_COORDS[form.warehouseCity] || CITY_COORDS.Lahore
        const whPayload = {
          owner_id: user.id,
          name: form.warehouseName.trim(),
          city: form.warehouseCity,
          address: form.warehouseAddress.trim(),
          lat: Number(form.warehouseLat) || cityFallback.lat,
          lng: Number(form.warehouseLng) || cityFallback.lng,
          contact_phone: form.phone.trim() || null,
          contact_email: form.email.trim(),
          total_capacity_sqm: Number(form.capacitySqm) || 500,
          occupied_capacity_sqm: 0,
          small_units_total: Number(form.smallUnits) || 10,
          small_units_available: Number(form.smallUnits) || 10,
          medium_units_total: Number(form.mediumUnits) || 8,
          medium_units_available: Number(form.mediumUnits) || 8,
          large_units_total: Number(form.largeUnits) || 5,
          large_units_available: Number(form.largeUnits) || 5,
          small_rate_daily: Number(form.smallRate) || 200,
          medium_rate_daily: Number(form.mediumRate) || 450,
          large_rate_daily: Number(form.largeRate) || 900,
          climate_controlled: form.climateControlled,
          cctv_enabled: form.cctvEnabled,
          insured: form.insured,
          security_24_7: true,
          verification_status: 'pending',
          business_license_url: await uploadFile('warehouse-docs', user.id, docs.business_license, 'business-license'),
          property_ownership_url: await uploadFile('warehouse-docs', user.id, docs.property_ownership, 'ownership-deed'),
          fire_safety_cert_url: await uploadFile('warehouse-docs', user.id, docs.fire_safety_cert, 'fire-safety'),
          owner_cnic_front_url: await uploadFile('warehouse-docs', user.id, docs.owner_cnic_front, 'owner-cnic-front'),
          owner_cnic_back_url: await uploadFile('warehouse-docs', user.id, docs.owner_cnic_back, 'owner-cnic-back'),
        }
        if (warehousePhoto) {
          whPayload.image_url = await uploadFile('warehouse-photos', user.id, warehousePhoto, 'facility')
        }
        await createWarehouse(whPayload)
      }

      setRole(role)
      nav(homeFor(role))
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const roleOptions = [
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'mover', label: 'Mover', icon: Truck },
    { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
  ]

  return (
    <div className="min-h-screen">
      <TopBar back brand />
      <Stagger className="space-y-5 px-5 pb-8">
        <Item className="text-center">
          <h1 className="text-2xl font-extrabold text-ink">
            {isWarehouse ? 'Partner Your Warehouse' : isMover ? 'Join the Fleet' : 'Create Your Account'}
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">
            {isWarehouse
              ? 'List your secure storage hub on SmartShift and manage unit bookings after admin approval.'
              : 'Create your SmartShift account to start moving smarter today. Reliable logistics at your fingertips.'}
          </p>
        </Item>

        <Item>
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-4">
              {/* role toggle */}
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((r) => {
                  const active = role === r.id
                  const Icon = r.icon
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickRole(r.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 transition ${
                        active ? 'border-brand-600 bg-brand-50/50 text-brand-700' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-bold">{r.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* avatar uploader */}
              <div className="flex flex-col items-center pt-1">
                <label className="relative cursor-pointer">
                  <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-300 ring-1 ring-brand-100">
                    {avatar ? (
                      <img src={URL.createObjectURL(avatar)} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <Camera className="h-8 w-8" />
                    )}
                  </span>
                  <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="mt-2 text-xs font-semibold text-slate-500">
                  {isWarehouse ? 'Owner Profile Picture' : 'Upload Profile Picture'}{' '}
                  {(isMover || isWarehouse) && <span className="text-rose-500">*</span>}
                </span>
              </div>

              <Field label="Full Name" value={form.fullName} onChange={set('fullName')} placeholder="John Doe" />
              <Field label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
              <Field label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
              <Field
                label="Password"
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                trailing={
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {isMover && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">Vehicle Type</span>
                      <select
                        value={form.vehicleType}
                        onChange={set('vehicleType')}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink outline-none focus:border-brand-400"
                      >
                        {['Van', 'Pickup', 'Mini Truck', 'Large Truck', 'Mazda Titan (3 Ton)'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <Field label="License Plate" value={form.vehiclePlate} onChange={set('vehiclePlate')} placeholder="LEA-8492" />
                  </div>
                  <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Driver Verification Documents</p>
                    {moverDocs.map((d) => (
                      <FileUpload
                        key={d.key}
                        label={d.label}
                        required
                        accept={d.accept || 'image/*'}
                        value={docs[d.key] || null}
                        onChange={(f) => setDocs((p) => ({ ...p, [d.key]: f }))}
                      />
                    ))}
                  </div>
                </>
              )}

              {isWarehouse && (
                <>
                  <div className="space-y-3 rounded-xl bg-brand-50/50 p-3.5 ring-1 ring-brand-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Warehouse Facility Details</p>
                    <Field
                      label="Warehouse Name *"
                      value={form.warehouseName}
                      onChange={set('warehouseName')}
                      placeholder="e.g. SafeVault Gulberg Storage"
                    />
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">City</span>
                      <select
                        value={form.warehouseCity}
                        onChange={(e) => {
                          const city = e.target.value
                          const coords = CITY_COORDS[city] || CITY_COORDS.Lahore
                          setForm((f) => ({ ...f, warehouseCity: city, warehouseLat: coords.lat, warehouseLng: coords.lng }))
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-brand-400"
                      >
                        {Object.keys(CITY_COORDS).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">Full Facility Address *</span>
                      <PlacesField
                        value={form.warehouseAddress}
                        onChange={(v) => setForm((f) => ({ ...f, warehouseAddress: v }))}
                        onPlace={({ address, lat, lng }) =>
                          setForm((f) => ({ ...f, warehouseAddress: address, warehouseLat: lat, warehouseLng: lng }))
                        }
                        placeholder="Enter street & sector address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Total Area (m²)" type="number" value={form.capacitySqm} onChange={set('capacitySqm')} />
                      <Field label="Small Units" type="number" value={form.smallUnits} onChange={set('smallUnits')} />
                      <Field label="Medium Units" type="number" value={form.mediumUnits} onChange={set('mediumUnits')} />
                      <Field label="Large Units" type="number" value={form.largeUnits} onChange={set('largeUnits')} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Small/d (PKR)" type="number" value={form.smallRate} onChange={set('smallRate')} />
                      <Field label="Med/d (PKR)" type="number" value={form.mediumRate} onChange={set('mediumRate')} />
                      <Field label="Large/d (PKR)" type="number" value={form.largeRate} onChange={set('largeRate')} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        ['climateControlled', 'Climate Controlled'],
                        ['cctvEnabled', '24/7 CCTV'],
                        ['insured', 'Insured'],
                      ].map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, [k]: !f[k] }))}
                          className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                            form[k] ? 'border-brand-600 bg-white text-brand-700' : 'border-slate-200 bg-white/60 text-slate-400'
                          }`}
                        >
                          {form[k] ? '✓ ' : ''}{label}
                        </button>
                      ))}
                    </div>
                    <FileUpload
                      label="Warehouse Facility Photo (Optional)"
                      value={warehousePhoto}
                      onChange={setWarehousePhoto}
                      hint="Shown to customers browsing storage"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Warehouse Verification Documents (Admin Approval Required)
                    </p>
                    {warehouseDocs.map((d) => (
                      <FileUpload
                        key={d.key}
                        label={d.label}
                        required
                        accept={d.accept || 'image/*'}
                        value={docs[d.key] || null}
                        onChange={(f) => setDocs((p) => ({ ...p, [d.key]: f }))}
                      />
                    ))}
                  </div>
                </>
              )}

              <ErrorMsg>{err}</ErrorMsg>

              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <User className="h-4 w-4" /></>}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600">
                Login here
              </Link>
            </p>
          </Card>
        </Item>

        <Item className="space-y-2 pt-1 text-center">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Secure Registration</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Privacy Guaranteed</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
            <Headset className="h-3.5 w-3.5" /> 24/7 Support
          </div>
          <p className="text-[11px] text-slate-400">© 2024 SmartShift Logistics. All Rights Reserved.</p>
        </Item>
      </Stagger>
    </div>
  )
}

/* ===================== Role selection ===================== */
const roles = [
  { id: 'customer', icon: Home, title: 'Customer', sub: 'I want to move or store items', to: '/customer' },
  { id: 'mover', icon: Truck, title: 'Mover', sub: 'I provide moving & transport', to: '/mover' },
  { id: 'warehouse', icon: Warehouse, title: 'Warehouse Partner', sub: 'I offer secure storage space', to: '/warehouse' },
]

export function RoleSelect() {
  const [sel, setSel] = useState('customer')
  const nav = useNavigate()
  const go = () => {
    setRole(sel)
    nav('/login')
  }
  return (
    <div className="flex min-h-screen flex-col pb-8">
      <TopBar brandLeft avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-500"><User className="h-5 w-5" /></span>} />
      <div className="px-5 pt-2 text-center">
        <h1 className="text-3xl font-extrabold text-ink">Join as</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          Choose your journey with SmartShift. Whether you're moving your home or moving the world, we've got you covered.
        </p>
      </div>
      <div className="mt-8 flex-1 space-y-4 px-5">
        {roles.map((r) => {
          const active = sel === r.id
          const Icon = r.icon
          return (
            <motion.button
              key={r.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSel(r.id)}
              className={`relative flex w-full flex-col items-start gap-3 rounded-2xl border-2 bg-white p-6 text-left transition ${
                active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
              }`}
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl transition ${
                  active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-500'
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <span className="block text-lg font-bold text-ink">{r.title}</span>
                <span className="text-xs text-slate-500">{r.sub}</span>
              </div>
              {active && (
                <motion.span
                  layoutId="rolecheck"
                  className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white"
                >
                  <Check className="h-4 w-4" />
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
      <div className="px-5">
        <Button onClick={go}>Continue</Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ===================== Login ===================== */
export function Login() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keep, setKeep] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [role, setRoleState] = useState(getRole() || 'customer')

  const pickRole = (r) => {
    setRoleState(r)
    setRole(r)
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !password) return setErr('Enter your email and password.')
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      const p = await getProfile(data.user.id)
      if (p?.is_banned) {
        await supabase.auth.signOut()
        throw new Error('Your account has been suspended by SmartShift Administration.')
      }
      const r = p?.role || role // account role wins over the picked one
      setRole(r)
      nav(homeFor(r))
    } catch (e2) {
      setErr(e2.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-slate-50 px-5 pb-8 pt-14">
      <Stagger className="flex flex-1 flex-col">
        <Item className="flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-2 text-sm text-slate-500">Logistics for the modern world</p>
        </Item>

        <Item className="mt-6">
          <Card className="p-5">
            <h1 className="text-2xl font-extrabold text-ink">Welcome Back</h1>
            <p className="mt-1 text-sm text-slate-500">Please enter your credentials to manage your moves.</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Field label="Email Address" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Password</span>
                  <button type="button" onClick={() => nav('/forgot')} className="text-xs font-bold text-brand-600">Forgot Password?</button>
                </div>
                <Field
                  icon={Lock}
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  trailing={
                    <button type="button" onClick={() => setShow(!show)}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => setKeep(!keep)}
                  className={`grid h-5 w-5 place-items-center rounded-md border-2 transition ${keep ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`}
                >
                  {keep && <Check className="h-3 w-3 text-white" />}
                </button>
                Keep me logged in
              </label>
              <ErrorMsg>{err}</ErrorMsg>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Login <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> Or continue with <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" type="button">Google</Button>
              <Button variant="ghost" type="button">Apple</Button>
            </div>
          </Card>
        </Item>

        <Item className="mt-6 text-center text-sm text-slate-500">
          New to SmartShift?{' '}
          <Link to="/register" className="font-bold text-brand-600">
            Create an account
          </Link>
        </Item>

        <Item className="mt-4 flex flex-wrap justify-center gap-2">
          {[
            ['customer', 'Customer', User],
            ['mover', 'Mover', Truck],
            ['warehouse', 'Warehouse', Warehouse],
          ].map(([id, label, Icon]) => {
            const active = role === id
            return (
              <button
                key={id}
                onClick={() => pickRole(id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active ? 'bg-brand-100 text-brand-700' : 'text-slate-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            )
          })}
        </Item>
      </Stagger>
    </div>
  )
}

/* ===================== Forgot password ===================== */
export function ForgotPassword() {
  const nav = useNavigate()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!email.trim()) return setErr('Enter your email.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset`,
      })
      if (error) throw error
      setSent(true)
    } catch (e2) {
      setErr(e2.message || 'Could not send reset link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Reset Password" back />
      <Stagger className="flex flex-1 flex-col px-5 pb-8">
        {!sent ? (
          <>
            <Item className="flex flex-col items-center pt-2 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Lock className="h-8 w-8" />
              </span>
              <h1 className="mt-4 text-2xl font-extrabold text-ink">Forgot Password?</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                Enter the email tied to your account and we'll send a reset link.
              </p>
            </Item>
            <Item className="mt-8">
              <form onSubmit={submit} className="space-y-4">
                <Field label="Email Address" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                <ErrorMsg>{err}</ErrorMsg>
                <Button type="submit" disabled={busy} className="mt-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </Item>
            <Item className="mt-auto pt-8 text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link to="/login" className="font-bold text-brand-600">
                Back to Login
              </Link>
            </Item>
          </>
        ) : (
          <>
            <Item className="flex flex-1 flex-col items-center justify-center text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100"
              >
                <Check className="h-9 w-9 text-emerald-500" />
              </motion.span>
              <h1 className="mt-4 text-2xl font-extrabold text-ink">Check Your Email</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                We sent a password reset link to your inbox. Follow it to set a new password.
              </p>
            </Item>
            <Item>
              <Button onClick={() => nav('/login')}>Back to Login</Button>
            </Item>
          </>
        )}
      </Stagger>
    </div>
  )
}

/* ===================== Reset password (from email link) ===================== */
export function ResetPassword() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // Recovery session is established by detectSessionInUrl when arriving from the email link.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setReady(!!sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (password.length < 6) return setErr('Password must be at least 6 characters.')
    if (password !== confirm) return setErr('Passwords do not match.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      await supabase.auth.signOut()
    } catch (e2) {
      setErr(e2.message || 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="New Password" />
      <Stagger className="flex flex-1 flex-col px-5 pb-8">
        {done ? (
          <>
            <Item className="flex flex-1 flex-col items-center justify-center text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100"
              >
                <Check className="h-9 w-9 text-emerald-500" />
              </motion.span>
              <h1 className="mt-4 text-2xl font-extrabold text-ink">Password Updated</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">Sign in with your new password.</p>
            </Item>
            <Item>
              <Button onClick={() => nav('/login')}>Back to Login</Button>
            </Item>
          </>
        ) : (
          <>
            <Item className="flex flex-col items-center pt-2 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Lock className="h-8 w-8" />
              </span>
              <h1 className="mt-4 text-2xl font-extrabold text-ink">Set New Password</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">Choose a strong password for your account.</p>
            </Item>
            <Item className="mt-8">
              {!ready ? (
                <ErrorMsg>Open this page from the reset link in your email. The recovery session is missing.</ErrorMsg>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <Field
                    label="New Password"
                    icon={Lock}
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    trailing={
                      <button type="button" onClick={() => setShow(!show)}>
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <Field
                    label="Confirm Password"
                    icon={Lock}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                  <ErrorMsg>{err}</ErrorMsg>
                  <Button type="submit" disabled={busy} className="mt-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
                  </Button>
                </form>
              )}
            </Item>
          </>
        )}
      </Stagger>
    </div>
  )
}
