import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Power,
  Star,
  Truck,
  MapPin,
  Phone,
  Calendar,
  Navigation,
  CheckCircle2,
  Circle,
  X,
  QrCode,
  FileText,
  Shield,
  BadgeCheck,
  IdCard,
  UploadCloud,
  ChevronRight,
  Wallet,
  CircleHelp,
  LogOut,
  Banknote,
} from 'lucide-react'
import { Button, Card, Badge, Stagger, Item, MapView, money } from '../components/ui'
import { TopBar, BottomNav, NotifBell } from '../components/nav'
import {
  moverStats,
  availableJobs,
  recentMoves,
  moveProgress,
  scanItems,
  reviews,
  transactions,
  documents,
  moverNotifications,
} from '../lib/data'

/* ===================== Mover Dashboard ===================== */
export function MoverDashboard() {
  const [online, setOnline] = useState(true)
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="SmartShift"
        brand
        right={
          <div className="flex items-center gap-2">
            <NotifBell count={3} to="/mover/notifications" />
            <img src="https://i.pravatar.cc/64?img=12" className="h-9 w-9 rounded-full object-cover" alt="" />
          </div>
        }
      />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item>
          <motion.button
            onClick={() => setOnline(!online)}
            className={`flex w-full items-center justify-between rounded-2xl px-5 py-4 text-white shadow-lg transition ${
              online ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30' : 'bg-slate-400'
            }`}
          >
            <span className="flex items-center gap-2 font-bold">
              <Power className="h-5 w-5" /> {online ? 'You are Online' : 'You are Offline'}
            </span>
            <span className={`relative h-7 w-12 rounded-full ${online ? 'bg-white/30' : 'bg-white/40'}`}>
              <motion.span layout className="absolute top-1 h-5 w-5 rounded-full bg-white" animate={{ left: online ? 26 : 4 }} />
            </span>
          </motion.button>
        </Item>

        <Item className="grid grid-cols-3 gap-3">
          {moverStats.map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-ink">
                {s.value}
                {s.star && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{s.label}</p>
            </Card>
          ))}
        </Item>

        <Item>
          <h3 className="text-base font-bold text-ink">Active Job</h3>
        </Item>
        <Item>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <img src="https://i.pravatar.cc/64?img=47" className="h-10 w-10 rounded-full object-cover" alt="" />
              <div className="flex-1">
                <p className="text-[11px] text-slate-400">Customer</p>
                <p className="text-sm font-bold text-ink">Amna</p>
              </div>
              <Badge tone="progress">In Transit</Badge>
            </div>
            <div className="my-3">
              <MoverRoute pickup="124 Maple Street, Springfield" drop="890 Oak Avenue, Riverdale" />
            </div>
            <Link to="/mover/job/8492-AX">
              <Button>
                View Job Details <Navigation className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

function MoverRoute({ pickup, drop }) {
  return (
    <div className="relative pl-5 text-sm">
      <span className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
      <span className="absolute left-[7px] top-3 h-5 w-px bg-slate-200" />
      <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
      <p className="text-[11px] text-slate-400">Pickup</p>
      <p className="mb-2 font-semibold text-ink">{pickup}</p>
      <p className="text-[11px] text-slate-400">Drop-off</p>
      <p className="font-semibold text-ink">{drop}</p>
    </div>
  )
}

/* ===================== Available Jobs ===================== */
export function MoverAvailable() {
  const [jobs, setJobs] = useState(availableJobs)
  const reject = (id) => setJobs((p) => p.filter((j) => j.id !== id))
  const nav = useNavigate()
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="SmartShift"
        brand
        right={<img src="https://i.pravatar.cc/64?img=12" className="h-9 w-9 rounded-full object-cover" alt="" />}
      />
      <div className="flex items-center gap-2 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Online · Looking for jobs near you
      </div>
      <Stagger className="flex-1 space-y-4 px-5 py-4">
        <AnimatePresence>
          {jobs.map((j) => (
            <motion.div key={j.id} layout exit={{ opacity: 0, x: -80 }} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Truck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{j.vehicle}</p>
                      <p className="text-[11px] text-slate-400">{j.distance}</p>
                    </div>
                  </div>
                  <Badge tone="brand">{money(j.price)}</Badge>
                </div>
                <div className="my-3">
                  <MoverRoute pickup={j.pickup} drop={j.drop} />
                </div>
                <p className="mb-3 flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" /> {j.when}
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => reject(j.id)} className="flex-1">
                    Reject
                  </Button>
                  <Button onClick={() => nav('/mover/job/' + j.id)} className="flex-1">
                    Accept
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {jobs.length === 0 && (
          <p className="pt-16 text-center text-sm text-slate-400">No more jobs nearby. Stay online!</p>
        )}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

/* ===================== My Jobs / Active Job Detail ===================== */
export function MoverJobDetail() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Job #8492-AX" back />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <Card className="flex items-center gap-3 p-4">
            <img src="https://i.pravatar.cc/64?img=47" className="h-11 w-11 rounded-full object-cover" alt="" />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Amna K.</p>
              <p className="text-xs text-slate-400">Customer</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white">
              <Phone className="h-4 w-4" />
            </button>
          </Card>
        </Item>

        <Item>
          <Card className="space-y-3 p-4">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">Pickup Address</p>
                <p className="text-sm text-ink">123 Maple Street, Apt 4B<br />Springfield, IL 62704</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-rose-400" />
              <div>
                <p className="text-[11px] text-slate-400">Drop-off Address</p>
                <p className="text-sm text-ink">456 Oak Avenue, Unit 12<br />Shelbyville, IL 62705</p>
              </div>
            </div>
          </Card>
        </Item>

        <Item>
          <MapView dark className="h-40 rounded-2xl" />
        </Item>

        <Item>
          <Card className="p-4">
            <p className="mb-3 text-sm font-bold text-ink">Move Progress</p>
            <ProgressTimeline />
          </Card>
        </Item>

        <Item>
          <Link to="/mover/scan">
            <Button>
              <Navigation className="h-4 w-4" /> Navigate to Drop-off
            </Button>
          </Link>
        </Item>
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

function ProgressTimeline() {
  return (
    <div>
      {moveProgress.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            {s.state === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-brand-600" />
            ) : s.state === 'active' ? (
              <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-brand-600">
                <span className="h-2 w-2 rounded-full bg-brand-600" />
              </span>
            ) : (
              <Circle className="h-5 w-5 text-slate-300" />
            )}
            {i < moveProgress.length - 1 && (
              <span className={`my-0.5 w-px flex-1 ${s.state === 'done' ? 'bg-brand-500' : 'bg-slate-200'}`} />
            )}
          </div>
          <div className={`pb-4 ${s.state === 'pending' ? 'opacity-50' : ''}`}>
            <p className="text-[11px] text-slate-400">{s.time}</p>
            <p className={`text-sm font-bold ${s.state === 'active' ? 'text-brand-600' : 'text-ink'}`}>{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ===================== QR Scanner ===================== */
export function MoverScan() {
  const nav = useNavigate()
  const [items, setItems] = useState(scanItems)
  const scanned = items.filter((i) => i.done).length
  const scanNext = () => {
    const idx = items.findIndex((i) => !i.done)
    if (idx === -1) return nav(-1)
    setItems((p) => p.map((it, k) => (k === idx ? { ...it, done: true, sub: it.sub.replace('Pending scan', 'Scanned') } : it)))
  }
  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="flex items-center justify-between px-5 pb-3 pt-10 text-white">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Scan Item QR Codes</h1>
        <div className="h-9 w-9" />
      </div>

      {/* camera viewport */}
      <div className="relative mx-5 h-56 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800">
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/40">
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((c) => (
            <span key={c} className={`absolute h-6 w-6 border-brand-400 ${c} ${c.includes('top') ? 'border-t-4' : 'border-b-4'} ${c.includes('left') ? 'border-l-4 rounded-tl' : 'border-r-4 rounded-tr'}`} />
          ))}
          <motion.span
            className="absolute inset-x-2 h-0.5 bg-brand-400 shadow-[0_0_12px_2px_#6087f8]"
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <QrCode className="absolute right-3 top-3 h-5 w-5 text-white/30" />
      </div>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mt-4 flex-1 rounded-t-3xl bg-white px-5 pb-8 pt-3"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Scanning Progress</p>
          <p className="text-xs font-bold text-brand-600">{scanned} / {items.length} items scanned</p>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${(scanned / items.length) * 100}%` }} />
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className={`flex items-center gap-3 rounded-xl border p-3 ${it.done ? 'border-brand-100 bg-brand-50/50' : 'border-slate-200'}`}>
              {it.done ? (
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
              <div>
                <p className="text-sm font-bold text-ink">{it.name}</p>
                <p className="text-[11px] text-slate-400">{it.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={scanNext} variant={scanned === items.length ? 'primary' : 'soft'} className="mt-5">
          {scanned === items.length ? 'Done' : 'Scan Next Item'}
        </Button>
      </motion.div>
    </div>
  )
}

/* ===================== Mover Profile ===================== */
export function MoverProfile() {
  const nav = useNavigate()
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="SmartShift"
        brand
        right={<img src="https://i.pravatar.cc/64?img=12" className="h-9 w-9 rounded-full object-cover" alt="" />}
      />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="flex flex-col items-center pt-1">
          <div className="relative">
            <img src="https://i.pravatar.cc/120?img=12" className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow" alt="" />
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-ink">Ahmed Khan</h2>
          <Badge tone="brand" className="mt-1">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified Mover
          </Badge>
        </Item>

        <Item className="grid grid-cols-3 gap-3">
          {[
            ['150', 'Trips', Navigation],
            ['4.9', 'Rating', Star],
            ['45.5k', 'Earnings', Wallet],
          ].map(([v, l, Icon]) => (
            <Card key={l} className="p-3 text-center">
              <Icon className="mx-auto h-4 w-4 text-brand-500" />
              <p className="mt-1 text-lg font-extrabold text-ink">{v}</p>
              <p className="text-[10px] text-slate-400">{l}</p>
            </Card>
          ))}
        </Item>

        <Item>
          <h3 className="mb-2 text-base font-bold text-ink">My Vehicle</h3>
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Truck className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Mini Truck</p>
              <p className="text-xs text-slate-400">LED-1234</p>
            </div>
            <Badge tone="slate">Standard</Badge>
          </Card>
        </Item>

        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Recent Reviews</h3>
          <span className="text-sm font-bold text-brand-600">View All</span>
        </Item>
        {reviews.map((r) => (
          <Item key={r.name}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{r.name}</p>
                <div className="flex">
                  {[...Array(r.stars)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">"{r.text}"</p>
            </Card>
          </Item>
        ))}

        <Item>
          <Card className="divide-y divide-slate-100">
            {[
              { icon: Banknote, label: 'Earnings Report', to: '/mover/earnings' },
              { icon: FileText, label: 'Vehicle Documents', to: '/mover/documents' },
              { icon: CircleHelp, label: 'Support', to: '#' },
            ].map((r) => (
              <Link key={r.label} to={r.to} className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{r.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
            <button onClick={() => nav('/')} className="flex w-full items-center gap-3 p-4 text-rose-500">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left text-sm font-bold">Logout</span>
            </button>
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

/* ===================== Earnings Report ===================== */
export function MoverEarnings() {
  const bars = [40, 65, 30, 90, 55, 75, 45]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="SmartShift"
        back
        brand
        right={<span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500">A</span>}
      />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <h1 className="text-2xl font-extrabold text-ink">Earnings Report</h1>
          <p className="text-sm text-slate-500">Review your performance and payouts.</p>
        </Item>
        <Item>
          <button className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink">
            <Calendar className="h-4 w-4 text-brand-600" /> Oct 1 - Oct 7, 2023
          </button>
        </Item>
        <Item>
          <Card className="bg-gradient-to-br from-brand-50 to-white p-5 ring-1 ring-brand-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Earnings</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">{money(12450)}</p>
            <Button className="mt-4">
              <Wallet className="h-4 w-4" /> Withdraw
            </Button>
          </Card>
        </Item>
        <Item>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Daily Breakdown</p>
              <span className="text-[11px] text-slate-400">Oct 1 - 7</span>
            </div>
            <div className="mt-4 flex h-32 items-end justify-between gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 120 }}
                    className={`w-full rounded-t-lg ${i === 2 ? 'bg-brand-600' : 'bg-brand-200'}`}
                  />
                  <span className={`text-[10px] ${i === 2 ? 'font-bold text-brand-600' : 'text-slate-400'}`}>{days[i]}</span>
                </div>
              ))}
            </div>
          </Card>
        </Item>
        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Recent Transactions</h3>
          <span className="text-sm font-bold text-brand-600">View All</span>
        </Item>
        {transactions.map((t) => (
          <Item key={t.id}>
            <Card className="flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Truck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Move ID: #{t.id}</p>
                <p className="text-[11px] text-slate-400">{t.when}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">+ {money(t.amount)}</p>
                <p className="text-[11px] text-slate-400">Completed</p>
              </div>
            </Card>
          </Item>
        ))}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

/* ===================== Vehicle Documents ===================== */
const docMeta = {
  license: { icon: IdCard, badge: ['Not Uploaded', 'red'] },
  reg: { icon: FileText, badge: ['Reviewing', 'amber'] },
  ins: { icon: Shield, badge: ['Verified', 'green'] },
  fit: { icon: Shield, badge: null },
}

export function MoverDocuments() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Vehicle Documents" back />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <Card className="flex gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Verification Required</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Please upload clear photos or scans of your vehicle documents to verify your eligibility as a SmartShift
                Mover.
              </p>
            </div>
          </Card>
        </Item>

        {documents.map((d) => {
          const meta = docMeta[d.id]
          const Icon = meta.icon
          return (
            <Item key={d.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{d.name}</p>
                    <p className="text-[11px] text-slate-400">{d.desc}</p>
                  </div>
                  {d.status === 'uploading' ? (
                    <span className="text-xs font-bold text-brand-600">Uploading...</span>
                  ) : (
                    meta.badge && <Badge tone={meta.badge[1]}>{meta.badge[0]}</Badge>
                  )}
                </div>

                {d.status === 'none' && (
                  <button className="mt-3 flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 py-6 text-brand-600">
                    <UploadCloud className="h-6 w-6" />
                    <span className="text-sm font-bold">Tap to upload or take a photo</span>
                    <span className="text-[11px] text-slate-400">JPG, PNG or PDF (Max 5MB)</span>
                  </button>
                )}

                {(d.status === 'review' || d.status === 'uploading') && (
                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-ink">
                        <FileText className="h-4 w-4 text-slate-400" /> {d.file}
                      </span>
                      {d.status === 'review' ? (
                        <button className="text-xs font-bold text-brand-600">Edit</button>
                      ) : (
                        <X className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    {d.status === 'uploading' && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          className="h-full rounded-full bg-brand-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${d.progress}%` }}
                          transition={{ duration: 1.2 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </Item>
          )
        })}

        <Item>
          <Button variant="soft">Submit for Verification</Button>
        </Item>
      </Stagger>
    </div>
  )
}

/* ===================== Mover Notifications ===================== */
const notifIcons = { truck: Truck, cash: Banknote, verified: BadgeCheck, star: Star }
const notifTone = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
}

export function MoverNotifications() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="SmartShift" back brand right={<span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500">A</span>} />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item>
          <h1 className="text-xl font-extrabold text-ink">Notifications</h1>
        </Item>
        {moverNotifications.map((grp) => (
          <Item key={grp.group} className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{grp.group}</p>
            {grp.items.map((n, i) => {
              const Icon = notifIcons[n.icon]
              return (
                <Card key={i} className="p-4">
                  <div className="flex gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notifTone[n.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${n.accent ? 'text-brand-600' : 'text-ink'}`}>{n.title}</p>
                        {n.accent && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{n.text}</p>
                      {n.cta && (
                        <Link to="/mover/available">
                          <Button className="mt-3">{n.cta}</Button>
                        </Link>
                      )}
                      {n.when && <p className="mt-1 text-[11px] text-slate-400">{n.when}</p>}
                    </div>
                  </div>
                </Card>
              )
            })}
          </Item>
        ))}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}
