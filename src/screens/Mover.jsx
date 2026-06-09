import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Power,
  Star,
  Truck,
  MapPin,
  Flag,
  Phone,
  Calendar,
  Navigation,
  CheckCircle2,
  Circle,
  X,
  QrCode,
  FileText,
  Shield,
  ShieldCheck,
  AlertCircle,
  BadgeCheck,
  IdCard,
  UploadCloud,
  ChevronRight,
  Wallet,
  CircleHelp,
  LogOut,
  Banknote,
  UserPen,
  Loader2,
  RefreshCw,
  PackageCheck,
  Inbox,
  MessageSquare,
  Route as RouteIcon,
  User,
} from 'lucide-react'
import { Button, Card, Badge, Stagger, Item, MapView, money, moneyCompact, Logo } from '../components/ui'
import { RouteMap } from '../components/maps'
import { TopBar, BottomNav, NotifBell } from '../components/nav'
import { reviews, documents, moverNotifications } from '../lib/data'
import { useAuth } from '../lib/AuthContext'
import {
  listAvailableJobs,
  listMoverJobs,
  getBooking,
  getBookingItems,
  acceptJob,
  setStatus,
  scanItem,
  STATUS_LABEL,
  STATUS_FLOW,
  NEXT_ACTION,
  nextStatus,
  statusTone,
  matchesDelivery,
} from '../lib/bookings'
import { Html5Qrcode } from 'html5-qrcode'
import { Capacitor } from '@capacitor/core'

const Avatar = ({ url }) => (
  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
    {url ? <img src={url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5" />}
  </span>
)

function MoverRoute({ pickup, drop }) {
  return (
    <div className="space-y-2.5 text-sm">
      <div className="relative flex gap-2.5">
        <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="absolute left-[7px] top-5 h-4 w-px border-l border-dashed border-slate-300" />
        <div className="-mt-0.5">
          <p className="text-[11px] text-slate-400">Pickup</p>
          <p className="font-semibold text-ink">{pickup}</p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Flag className="h-4 w-4 shrink-0 text-rose-500" />
        <div className="-mt-0.5">
          <p className="text-[11px] text-slate-400">Drop-off</p>
          <p className="font-semibold text-ink">{drop}</p>
        </div>
      </div>
    </div>
  )
}

/* ===================== Mover Dashboard ===================== */
export function MoverDashboard() {
  const { user, profile } = useAuth()
  const [online, setOnline] = useState(() => localStorage.getItem('smartshift.online') !== 'false')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    listMoverJobs(user.id)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const toggleOnline = () => {
    const v = !online
    setOnline(v)
    localStorage.setItem('smartshift.online', String(v))
  }

  const activeJobs = jobs.filter((j) => !['delivered', 'cancelled'].includes(j.status))
  const active = activeJobs[0]
  const completed = jobs.filter((j) => j.status === 'delivered').length
  const stats = [
    { label: 'Active', value: String(activeJobs.length).padStart(2, '0') },
    { label: 'Completed', value: String(completed) },
    { label: 'Rating', value: completed ? '5.0' : '—', star: true },
  ]
  const upcoming = [
    { when: 'Tomorrow, 09:00 AM', text: 'Local Move · 3 Movers Required' },
    { when: 'Wed, Oct 25, 02:00 PM', text: 'Office Relocation · 5 Movers Required' },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft right={<NotifBell count={0} to="/mover/notifications" />} avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* online banner */}
        <Item>
          <div
            className={`flex items-center justify-between rounded-2xl px-5 py-4 text-white shadow-lg transition ${
              online ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30' : 'bg-slate-400'
            }`}
          >
            <div>
              <p className="flex items-center gap-2 font-bold">
                <Power className="h-5 w-5" /> {online ? 'You are Online' : 'You are Offline'}
              </p>
              <p className="mt-0.5 text-xs text-white/80">
                {online ? 'Ready to receive new move requests' : 'You will not receive requests'}
              </p>
            </div>
            <button onClick={toggleOnline} className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700">
              {online ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </Item>

        <Item className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-ink">
                {s.value}
                {s.star && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </Card>
          ))}
        </Item>

        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Active Job</h3>
          {active && <Badge tone={statusTone(active.status)}>{STATUS_LABEL[active.status]}</Badge>}
        </Item>

        {loading ? (
          <Item className="grid place-items-center py-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Item>
        ) : active ? (
          <Item>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
                  {(active.customer_name || 'C')[0]}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{active.customer_name || 'Customer'}</p>
                  <p className="text-[11px] text-slate-400">{active.vehicle}</p>
                </div>
              </div>
              <div className="my-3">
                <MoverRoute pickup={active.pickup_address} drop={active.dropoff_address} />
              </div>
              {active.customer_phone ? (
                <a href={`tel:${active.customer_phone}`}>
                  <Button variant="soft"><MessageSquare className="h-4 w-4" /> Message {(active.customer_name || 'Customer').split(' ')[0]}</Button>
                </a>
              ) : (
                <Button variant="soft"><MessageSquare className="h-4 w-4" /> Message Customer</Button>
              )}
            </Card>

            <Card className="mt-3 overflow-hidden">
              <RouteMap pickup={active.pickup_address} dropoff={active.dropoff_address} dark className="h-32 w-full" />
              <div className="p-3">
                <Link to={`/mover/job/${active.id}`}>
                  <Button>View Job Details <Navigation className="h-4 w-4" /></Button>
                </Link>
              </div>
            </Card>
          </Item>
        ) : (
          <Item>
            <Card className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
              <Inbox className="h-8 w-8" />
              <p className="text-sm font-semibold">No active job</p>
              <Link to="/mover/available" className="mt-1">
                <Button variant="soft" className="w-auto px-5">Browse Available Jobs</Button>
              </Link>
            </Card>
          </Item>
        )}

        <Item>
          <h3 className="mb-2 text-base font-bold text-ink">Upcoming Moves</h3>
          <Card className="divide-y divide-slate-100">
            {upcoming.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{u.when}</p>
                  <p className="text-[11px] text-slate-400">{u.text}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

/* ===================== Available Jobs ===================== */
export function MoverAvailable() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    listAvailableJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const reject = (id) => setJobs((p) => p.filter((j) => j.id !== id))

  async function accept(id) {
    setBusyId(id)
    try {
      const row = await acceptJob(id, user.id)
      if (!row) {
        setJobs((p) => p.filter((j) => j.id !== id))
        return
      }
      nav(`/mover/job/${id}`)
    } catch {
      // ignore
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
      <div className="flex items-center gap-2 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Looking for jobs near your location...
      </div>
      <div className="px-5 pt-4">
        <h1 className="text-2xl font-extrabold text-ink">Available Moves</h1>
        <p className="text-sm text-slate-500">{jobs.length} high-priority moves matching your profile</p>
      </div>
      <Stagger className="flex-1 space-y-4 px-5 py-4">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
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
                        <p className="text-sm font-bold text-ink">{j.vehicle || 'Move'}</p>
                        <p className="text-[11px] text-slate-400">Customer: {j.customer_name || 'Customer'}</p>
                      </div>
                    </div>
                    <Badge tone="brand">{money(Number(j.price))}</Badge>
                  </div>

                  <div className="my-3 space-y-2 border-y border-slate-100 py-3 text-xs">
                    <p className="flex gap-2 text-slate-500">
                      <RouteIcon className="h-4 w-4 shrink-0 text-brand-500" />
                      <span><span className="font-semibold text-ink">{j.pickup_address}</span> → {j.dropoff_address}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-500" /> {j.schedule_label || 'Flexible'} · Pickup Window
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => reject(j.id)} className="flex-1" disabled={busyId === j.id}>
                      Reject
                    </Button>
                    <Button onClick={() => accept(j.id)} className="flex-1" disabled={busyId === j.id}>
                      {busyId === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept Job <ArrowRightInline /></>}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {!loading && jobs.length === 0 && (
          <p className="pt-16 text-center text-sm text-slate-400">No jobs available right now. Tap refresh.</p>
        )}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

function ArrowRightInline() {
  return <Navigation className="h-4 w-4" />
}

/* ===================== My Jobs (mover) ===================== */
export function MoverJobs() {
  const { user, profile } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All Jobs')

  useEffect(() => {
    if (!user) return
    listMoverJobs(user.id)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const tabs = ['All Jobs', 'Active', 'Pending', 'Completed']
  const filtered = jobs.filter((j) => {
    if (tab === 'All Jobs') return true
    if (tab === 'Completed') return j.status === 'delivered'
    if (tab === 'Pending') return j.status === 'pending' || j.status === 'accepted'
    return !['delivered', 'cancelled'].includes(j.status) // Active
  })

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <div className="px-5 pt-1">
        <h1 className="text-2xl font-extrabold text-ink">My Jobs</h1>
        <p className="text-sm text-slate-500">Manage your active assignments and history.</p>
        <p className="mt-2 text-sm font-bold text-brand-600">Earnings (Wk) {money(1240)}</p>
      </div>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-6">
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
      <Stagger className="flex-1 space-y-4 px-5 py-4">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm font-semibold">No jobs here</p>
            <Link to="/mover/available" className="text-sm font-bold text-brand-600">Find available jobs</Link>
          </div>
        ) : (
          filtered.map((j) => {
            const done = j.status === 'delivered'
            return (
              <Item key={j.id}>
                <Card className="overflow-hidden">
                  <div className="relative">
                    <MapView className="h-24 w-full" />
                    <span className="absolute right-2 top-2">
                      <Badge tone={statusTone(j.status)}>{STATUS_LABEL[j.status]}</Badge>
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-ink">{j.customer_name || 'Customer'}</p>
                      <p className="text-sm font-extrabold text-brand-700">{money(Number(j.price))}</p>
                    </div>
                    <p className="text-[11px] text-slate-400">{j.vehicle}</p>
                    <div className="my-3">
                      <MoverRoute pickup={j.pickup_address} drop={j.dropoff_address} />
                    </div>
                    <div className="flex gap-3">
                      <Link to={`/mover/job/${j.id}`} className="flex-1">
                        <Button variant="ghost">{done ? 'Receipt' : 'Details'}</Button>
                      </Link>
                      <Link to={`/mover/job/${j.id}`} className="flex-1">
                        <Button>{done ? 'Support' : 'Resume'}</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </Item>
            )
          })
        )}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

/* ===================== Job Detail / Active Job ===================== */
export function MoverJobDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [booking, setBooking] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getBooking(id), getBookingItems(id)])
      .then(([b, it]) => {
        setBooking(b)
        setItems(it)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function advance() {
    const ns = nextStatus(booking.status)
    if (!ns) return
    setBusy(true)
    try {
      const b = await setStatus(booking.id, ns)
      setBooking(b)
    } catch {
      // ignore
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
        <TopBar brandLeft back />
        <p className="pt-20 text-center text-sm text-slate-400">Job not found.</p>
        <BottomNav role="mover" />
      </div>
    )
  }

  const scanned = items.filter((i) => i.scanned).length
  const flowIdx = STATUS_FLOW.indexOf(booking.status)
  const canScan = flowIdx >= STATUS_FLOW.indexOf('loading') && booking.status !== 'delivered' && items.length > 0
  const cta = NEXT_ACTION[booking.status]
  const done = booking.status === 'delivered'

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft back avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        {/* dark map header */}
        <Item>
          <div className="relative overflow-hidden rounded-2xl">
            <RouteMap pickup={booking.pickup_address} dropoff={booking.dropoff_address} dark className="h-40 w-full" />
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white">
              <Navigation className="h-3.5 w-3.5" /> En route to destination
            </span>
          </div>
        </Item>

        {/* route estimate */}
        <Item>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Route Estimate</p>
                <p className="text-2xl font-extrabold text-brand-700">{money(Number(booking.price))}</p>
              </div>
              <div className="text-right">
                <Badge tone="slate">Standard Shift</Badge>
                <p className="mt-1 text-[11px] text-slate-400">Job ID: #{String(booking.id).slice(0, 8)}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <MoverRoute pickup={booking.pickup_address} drop={booking.dropoff_address} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="flex items-center gap-1 text-slate-500"><Truck className="h-4 w-4" /> {booking.vehicle}</span>
            </div>
          </Card>
        </Item>

        {/* inventory */}
        <Item>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Inventory ({items.length})</p>
              {canScan && (
                <Link to={`/mover/scan/${booking.id}`} className="flex items-center gap-1 text-sm font-bold text-brand-600">
                  <QrCode className="h-4 w-4" /> Scan Item
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{it.name}</p>
                    {it.tag && <p className="text-[11px] text-slate-400">{it.tag}</p>}
                  </div>
                  {it.scanned ? (
                    <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Scanned</Badge>
                  ) : (
                    <Badge tone="pending">Pending</Badge>
                  )}
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-slate-400">No items listed.</p>}
            </div>
          </Card>
        </Item>

        {/* customer */}
        <Item>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
                {(booking.customer_name || 'C')[0]}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{booking.customer_name || 'Customer'}</p>
                <p className="flex items-center gap-1 text-xs text-amber-500"><Star className="h-3 w-3 fill-amber-400" /> 4.9 · Top Client</p>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              {booking.customer_phone ? (
                <a href={`tel:${booking.customer_phone}`} className="flex-1">
                  <Button><Phone className="h-4 w-4" /> Call</Button>
                </a>
              ) : (
                <Button className="flex-1"><Phone className="h-4 w-4" /> Call</Button>
              )}
              <Button variant="ghost" className="flex-1"><MessageSquare className="h-4 w-4" /> Message</Button>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Customer Instructions</p>
              <p className="mt-1 text-xs italic text-slate-600">
                "Please handle fragile items with extra care and call when you are 5 mins away from drop-off."
              </p>
            </div>
          </Card>
        </Item>

        {/* progress */}
        <Item>
          <Card className="p-4">
            <p className="mb-3 text-sm font-bold text-ink">Move Progress</p>
            <ProgressTimeline status={booking.status} scanned={scanned} total={items.length} />
          </Card>
        </Item>

        {done ? (
          <Item>
            <Card className="flex flex-col items-center gap-2 bg-emerald-50 p-5 text-center ring-1 ring-emerald-100">
              <PackageCheck className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-bold text-emerald-700">Delivery Completed</p>
            </Card>
          </Item>
        ) : (
          <Item className="flex gap-3">
            <Button variant="ghost" className="w-auto px-5"><CircleHelp className="h-4 w-4" /> Issues?</Button>
            {booking.status === 'at_dropoff' ? (
              <Button onClick={() => nav(`/mover/confirm/${booking.id}`)}>
                <QrCode className="h-4 w-4" /> Scan to Confirm Delivery
              </Button>
            ) : (
              <Button onClick={advance} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{cta} <Navigation className="h-4 w-4" /></>}
              </Button>
            )}
          </Item>
        )}
      </Stagger>
      <BottomNav role="mover" />
    </div>
  )
}

function ProgressTimeline({ status, scanned, total }) {
  const idx = STATUS_FLOW.indexOf(status)
  return (
    <div>
      {STATUS_FLOW.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'pending'
        const sub = state === 'active' && s === 'loading' ? `In Progress · ${scanned}/${total} items scanned` : null
        return (
          <div key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              {state === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
              ) : state === 'active' ? (
                <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-brand-600">
                  <span className="h-2 w-2 rounded-full bg-brand-600" />
                </span>
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
              {i < STATUS_FLOW.length - 1 && (
                <span className={`my-0.5 w-px flex-1 ${state === 'done' ? 'bg-brand-500' : 'bg-slate-200'}`} />
              )}
            </div>
            <div className={`pb-4 ${state === 'pending' ? 'opacity-50' : ''}`}>
              <p className={`text-sm font-bold ${state === 'active' ? 'text-brand-600' : 'text-ink'}`}>{STATUS_LABEL[s]}</p>
              {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ===================== QR Scanner ===================== */
export function MoverScan() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    getBookingItems(id)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const scanned = items.filter((i) => i.scanned).length
  const allDone = items.length > 0 && scanned === items.length
  const nextIdx = items.findIndex((i) => !i.scanned)

  async function scanNext() {
    const target = items.find((i) => !i.scanned)
    if (!target) return nav(`/mover/job/${id}`)
    setBusy(true)
    try {
      const updated = await scanItem(target.id)
      setItems((p) => p.map((it) => (it.id === updated.id ? updated : it)))
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="flex items-center justify-between px-5 pb-3 pt-10 text-white">
        <button onClick={() => nav(`/mover/job/${id}`)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <Logo plain light />
        <Avatar url={profile?.avatar_url} />
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
        <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/70">Position QR inside frame</p>
      </div>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mt-4 flex-1 rounded-t-3xl bg-white px-5 pb-24 pt-3"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="mb-1 flex items-start justify-between">
          <div>
            <p className="text-base font-bold text-ink">Inventory Scan</p>
            <p className="text-[11px] text-slate-400">Shipment #MS-{String(id).slice(0, 5).toUpperCase()}</p>
          </div>
          <p className="text-sm font-bold text-brand-600">{scanned}/{items.length} Items Scanned</p>
        </div>
        <div className="mb-4 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${items.length ? (scanned / items.length) * 100 : 0}%` }} />
        </div>

        {loading ? (
          <div className="grid place-items-center py-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => {
              const isNext = i === nextIdx
              return (
                <div key={it.id} className={`flex items-center gap-3 rounded-xl border p-3 ${it.scanned ? 'border-emerald-100 bg-emerald-50/50' : isNext ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
                  {it.scanned ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : isNext ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-brand-600"><span className="h-2 w-2 rounded-full bg-brand-600" /></span>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{it.name}</p>
                    <p className="text-[11px] text-slate-400">{it.qr_code || it.tag || 'Item'}</p>
                  </div>
                  {it.scanned ? (
                    <Badge tone="green">Verified</Badge>
                  ) : isNext ? (
                    <Badge tone="brand">Active</Badge>
                  ) : (
                    <Badge tone="slate">Queued</Badge>
                  )}
                </div>
              )
            })}
            {items.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No items to scan.</p>}
          </div>
        )}

        <Button onClick={scanNext} disabled={busy} variant={allDone ? 'primary' : 'soft'} className="mt-5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : allDone ? 'Done' : 'Scan Next Item'}
        </Button>
      </motion.div>
    </div>
  )
}

/* ===================== Confirm Delivery (proof-of-delivery scan) ===================== */
export function MoverConfirmDelivery() {
  const { id } = useParams()
  const nav = useNavigate()
  const [phase, setPhase] = useState('scanning') // scanning | confirming | done | error
  const [msg, setMsg] = useState('')
  const okRef = useRef(false)

  useEffect(() => {
    let alive = true
    let stopped = false
    const qr = new Html5Qrcode('pod-reader')
    const stop = async () => {
      if (stopped) return
      stopped = true
      try {
        if (qr.getState && qr.getState() === 2) await qr.stop()
      } catch {
        // already stopped
      }
      try {
        qr.clear()
      } catch {
        // ignore
      }
    }

    const onScan = async (text) => {
      if (okRef.current || !alive) return
      if (!matchesDelivery(text, id)) {
        setMsg('This QR does not match the delivery.')
        return
      }
      okRef.current = true
      setPhase('confirming')
      await stop()
      try {
        await setStatus(id, 'delivered')
        setPhase('done')
        setTimeout(() => nav(`/mover/job/${id}`), 1400)
      } catch {
        setPhase('error')
        setMsg('Could not confirm delivery. Please try again.')
      }
    }

    ;(async () => {
      try {
        // On a native build, grant the OS camera permission before getUserMedia.
        if (Capacitor.isNativePlatform()) {
          try {
            const { Camera } = await import('@capacitor/camera')
            await Camera.requestPermissions({ permissions: ['camera'] })
          } catch {
            // fall through; web getUserMedia may still prompt
          }
        }
        await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, onScan, () => {})
        if (!alive) await stop() // unmounted (e.g. StrictMode) during async start
      } catch {
        if (alive) {
          setPhase('error')
          setMsg('Camera unavailable. Allow camera access and retry.')
        }
      }
    })()

    return () => {
      alive = false
      stop()
    }
  }, [id, nav])

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-10">
        <button onClick={() => nav(`/mover/job/${id}`)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Confirm Delivery</h1>
        <div className="h-9 w-9" />
      </div>

      <div className="flex flex-1 flex-col px-5">
        <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/70">
          <ShieldCheck className="h-4 w-4 text-brand-400" /> Scan the customer's delivery QR to complete
        </p>

        {phase === 'done' ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500"
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.span>
            <p className="mt-4 text-xl font-extrabold">Delivery Confirmed</p>
            <p className="mt-1 text-sm text-white/70">Job #{String(id).slice(0, 8)} marked delivered.</p>
          </div>
        ) : phase === 'confirming' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-semibold">Confirming delivery…</p>
          </div>
        ) : phase === 'error' ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-500/20 text-rose-400">
              <AlertCircle className="h-8 w-8" />
            </span>
            <p className="mt-4 text-sm font-semibold">{msg}</p>
            <button onClick={() => nav(`/mover/job/${id}`)} className="mt-5 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold">
              Back to Job
            </button>
          </div>
        ) : (
          <>
            <div className="relative mx-auto w-full overflow-hidden rounded-2xl">
              <div id="pod-reader" className="w-full" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-brand-400/70" />
            </div>
            {msg && (
              <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-center text-xs font-semibold text-rose-300">
                <AlertCircle className="h-4 w-4" /> {msg}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-white/50">Point the camera at the QR shown on the customer's screen.</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ===================== Mover Profile ===================== */
export function MoverProfile() {
  const nav = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [jobs, setJobs] = useState([])
  const avatar = profile?.avatar_url || 'https://i.pravatar.cc/120?img=12'

  useEffect(() => {
    if (!user) return
    listMoverJobs(user.id).then(setJobs).catch(() => {})
  }, [user?.id])

  const delivered = jobs.filter((j) => j.status === 'delivered')
  const earnings = delivered.reduce((a, j) => a + Number(j.price || 0), 0)
  const stats = [
    [String(delivered.length), 'Trips', Navigation],
    [delivered.length ? '5.0' : '—', 'Rating', Star],
    [moneyCompact(earnings), 'Earnings', Wallet],
  ]
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="flex flex-col items-center pt-1">
          <div className="relative">
            <img src={avatar} className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow" alt="" />
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-ink">{profile?.full_name || 'SmartShift Mover'}</h2>
          <Badge tone="brand" className="mt-1">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified Mover
          </Badge>
        </Item>

        <Item className="grid grid-cols-3 gap-3">
          {stats.map(([v, l, Icon]) => (
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
              { icon: UserPen, label: 'Edit Profile', to: '/profile/edit' },
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
            <button onClick={async () => { await signOut(); nav('/') }} className="flex w-full items-center gap-3 p-4 text-rose-500">
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
  const { user, profile } = useAuth()
  const [jobs, setJobs] = useState([])
  const bars = [40, 65, 30, 90, 55, 75, 45]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  useEffect(() => {
    if (!user) return
    listMoverJobs(user.id).then(setJobs).catch(() => {})
  }, [user?.id])

  const delivered = jobs.filter((j) => j.status === 'delivered')
  const totalEarnings = delivered.reduce((a, j) => a + Number(j.price || 0), 0)
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft back avatar={<Avatar url={profile?.avatar_url} />} />
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
            <p className="mt-1 text-3xl font-extrabold text-ink">{money(totalEarnings)}</p>
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
                    className={`w-full rounded-t-lg ${i === 3 ? 'bg-brand-600' : 'bg-brand-200'}`}
                  />
                  <span className={`text-[10px] ${i === 3 ? 'font-bold text-brand-600' : 'text-slate-400'}`}>{days[i]}</span>
                </div>
              ))}
            </div>
          </Card>
        </Item>
        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Recent Transactions</h3>
          <span className="text-sm font-bold text-brand-600">View All</span>
        </Item>
        {delivered.length === 0 ? (
          <Item>
            <Card className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
              <Banknote className="h-8 w-8" />
              <p className="text-sm font-semibold">No completed payouts yet</p>
            </Card>
          </Item>
        ) : (
          delivered.map((j) => (
            <Item key={j.id}>
              <Card className="flex items-center gap-3 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Truck className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Move ID: #{String(j.id).slice(0, 8)}</p>
                  <p className="text-[11px] text-slate-400">{j.customer_name || 'Customer'} · {j.vehicle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">+ {money(Number(j.price))}</p>
                  <p className="text-[11px] text-slate-400">Completed</p>
                </div>
              </Card>
            </Item>
          ))
        )}
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
  const { profile } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft back avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item>
          <h1 className="text-xl font-extrabold text-ink">Vehicle Documents</h1>
        </Item>
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
  const { profile } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-ink">Notifications</h1>
          <button className="text-xs font-bold text-brand-600">Mark all as read</button>
        </Item>
        {moverNotifications.map((grp) => (
          <Item key={grp.group} className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{grp.group}</p>
            {grp.items.map((n, i) => {
              const Icon = notifIcons[n.icon]
              return (
                <Card key={i} className="p-4">
                  <div className="flex gap-3">
                    <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notifTone[n.tone]}`}>
                      <Icon className="h-5 w-5" />
                      {n.accent && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{n.title}</p>
                        {n.when && <p className="shrink-0 text-[11px] text-slate-400">{n.when}</p>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{n.text}</p>
                      {n.cta && (
                        <Link to="/mover/available">
                          <Button className="mt-3">{n.cta}</Button>
                        </Link>
                      )}
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
