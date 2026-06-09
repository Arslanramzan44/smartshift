import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardList,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  Flag,
  Navigation,
  Star,
  Gift,
  CreditCard,
  LogOut,
  ChevronRight,
  Calendar,
  Share2,
  Route as RouteIcon,
  BadgeCheck,
  Banknote,
  UserPen,
  Loader2,
  Inbox,
  User,
  Warehouse,
  Phone,
  MessageSquare,
} from 'lucide-react'
import { Button, Card, Badge, Stagger, Item, money, memberSince } from '../components/ui'
import { RouteMap } from '../components/maps'
import { TopBar, BottomNav } from '../components/nav'
import { ratingTags, tipOptions, customerNotifications } from '../lib/data'
import { useAuth } from '../lib/AuthContext'
import { listCustomerBookings, getBooking, STATUS_LABEL, STATUS_FLOW, statusTone, deliveryPayload } from '../lib/bookings'
import { getProfile } from '../lib/db'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck } from 'lucide-react'
import hero from '../assets/hero.png'

const statIcons = { clipboard: ClipboardList, truck: Truck, check: CheckCircle2, x: XCircle }
const statColor = {
  clipboard: 'text-brand-600',
  truck: 'text-brand-600',
  check: 'text-emerald-500',
  x: 'text-rose-500',
}

const Avatar = ({ url }) => (
  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
    {url ? <img src={url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5" />}
  </span>
)

/* shared pickup→drop-off block with pin icons */
function Route({ pickup, drop }) {
  return (
    <div className="space-y-2.5">
      <div className="relative flex gap-2.5">
        <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="absolute left-[7px] top-5 h-4 w-px border-l border-dashed border-slate-300" />
        <div className="-mt-0.5">
          <p className="text-[11px] font-semibold text-slate-400">Pickup</p>
          <p className="text-sm text-ink">{pickup}</p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Flag className="h-4 w-4 shrink-0 text-rose-500" />
        <div className="-mt-0.5">
          <p className="text-[11px] font-semibold text-slate-400">Drop-off</p>
          <p className="text-sm text-ink">{drop}</p>
        </div>
      </div>
    </div>
  )
}

/* booking list/recent card */
function BookingCard({ m, isActive }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <Badge tone={statusTone(m.status)}>{STATUS_LABEL[m.status]}</Badge>
        {isActive ? (
          <Link to="/customer/track" state={{ bookingId: m.id }} className="flex items-center gap-1 text-xs font-bold text-brand-600">
            Track Move <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-xs font-bold text-slate-400">Invoice</span>
        )}
      </div>
      <p className="mb-3 text-sm font-bold text-ink">Booking #{String(m.id).slice(0, 8)}</p>
      <Route pickup={m.pickup_address} drop={m.dropoff_address} />
    </Card>
  )
}

/* ===================== Customer Dashboard ===================== */
export function CustomerDashboard() {
  const { user, profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    listCustomerBookings(user.id)
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const firstName = (profile?.full_name || 'there').split(' ')[0]
  const isActive = (s) => !['delivered', 'cancelled'].includes(s)
  const stats = [
    { label: 'Total Moves', value: bookings.length, icon: 'clipboard' },
    { label: 'Active', value: bookings.filter((b) => isActive(b.status)).length, icon: 'truck' },
    { label: 'Completed', value: bookings.filter((b) => b.status === 'delivered').length, icon: 'check' },
    { label: 'Cancelled', value: bookings.filter((b) => b.status === 'cancelled').length, icon: 'x' },
  ]
  const recent = bookings.slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-5 pb-2 pt-10">
        <h1 className="text-2xl font-extrabold text-ink">Hi, {firstName} 👋</h1>
        <p className="text-sm text-slate-500">Welcome back to your SmartShift dashboard.</p>
      </div>

      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* hero */}
        <Item>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <h2 className="text-lg font-extrabold">Ready to Move?</h2>
            <p className="mt-1 max-w-[85%] text-xs text-brand-100">
              Schedule your next seamless relocation in just a few clicks. Fast, reliable, and insured logistics.
            </p>
            <Link to="/customer/book">
              <Button variant="ghost" className="mt-4 w-auto px-5 text-brand-700">
                Book Now
              </Button>
            </Link>
            <img src={hero} className="mt-4 h-28 w-full rounded-2xl object-cover" alt="" />
          </div>
        </Item>

        {/* storage promo */}
        <Item>
          <Link to="/customer/storage">
            <Card className="flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Warehouse className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Need Storage?</p>
                <p className="text-[11px] text-slate-400">Reserve a secure warehouse unit by the day, week, or month.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </Card>
          </Link>
        </Item>

        {/* stats grid */}
        <Item className="grid grid-cols-2 gap-3">
          {stats.map((s) => {
            const Icon = statIcons[s.icon]
            return (
              <Card key={s.label} className="p-4">
                <Icon className={`h-5 w-5 ${statColor[s.icon]}`} />
                <p className="mt-2 text-2xl font-extrabold text-ink">{String(s.value).padStart(2, '0')}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </Card>
            )
          })}
        </Item>

        {/* recent moves */}
        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Recent Moves</h3>
          <Link to="/customer/moves" className="text-sm font-bold text-brand-600">
            View All
          </Link>
        </Item>

        {loading ? (
          <Item className="grid place-items-center py-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Item>
        ) : recent.length === 0 ? (
          <Item>
            <Card className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
              <Inbox className="h-8 w-8" />
              <p className="text-sm font-semibold">No bookings yet</p>
            </Card>
          </Item>
        ) : (
          recent.map((m) => (
            <Item key={m.id}>
              <BookingCard m={m} isActive={isActive(m.status)} />
            </Item>
          ))
        )}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Live Tracking ===================== */
export function CustomerTrack() {
  const { state } = useLocation()
  const { user, profile } = useAuth()
  const [booking, setBooking] = useState(null)
  const [mover, setMover] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        if (state?.bookingId) {
          setBooking(await getBooking(state.bookingId))
        } else {
          const list = await listCustomerBookings(user.id)
          setBooking(list.find((b) => !['delivered', 'cancelled'].includes(b.status)) || list[0] || null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
  }, [user?.id, state?.bookingId])

  // Load the assigned mover's profile (name / phone / verification).
  useEffect(() => {
    if (!booking?.mover_id) {
      setMover(null)
      return
    }
    getProfile(booking.mover_id).then(setMover).catch(() => setMover(null))
  }, [booking?.mover_id])

  // Live updates: while the move is active, refetch so mover status changes
  // (and the delivery confirmation) appear without a manual reload.
  useEffect(() => {
    if (!booking || ['delivered', 'cancelled'].includes(booking.status)) return
    const t = setInterval(() => {
      getBooking(booking.id).then(setBooking).catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [booking?.id, booking?.status])

  const idx = booking ? STATUS_FLOW.indexOf(booking.status) : -1
  const steps = STATUS_FLOW.map((s, i) => ({
    label: STATUS_LABEL[s],
    sub: i < idx ? 'Done' : i === idx ? 'Active' : 'Pending',
    state: i < idx ? 'done' : i === idx ? 'active' : 'pending',
  }))

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="absolute inset-x-0 top-0 z-40">
        <TopBar brandLeft dark avatar={<Avatar url={profile?.avatar_url} />} />
      </div>
      <div className="relative flex-1">
        <RouteMap pickup={booking?.pickup_address} dropoff={booking?.dropoff_address} dark className="h-[360px] w-full" />
      </div>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative -mt-6 rounded-t-3xl bg-white px-5 pb-24 pt-3"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        {loading ? (
          <div className="grid place-items-center py-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !booking ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm font-semibold">No move to track</p>
            <Link to="/customer/book" className="text-sm font-bold text-brand-600">Book a move</Link>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <Badge tone={statusTone(booking.status)}>{STATUS_LABEL[booking.status]}</Badge>
                <p className="mt-2 text-2xl font-extrabold text-ink">Moving to drop-off</p>
                <p className="text-sm text-slate-500">{booking.mover_id ? 'Mover assigned' : 'Finding a mover near you'}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            {booking.mover_id && (
              <Card className="my-4 p-4 ring-1 ring-slate-100">
                <div className="flex items-center gap-3">
                  <span className="relative">
                    {mover?.avatar_url ? (
                      <img src={mover.avatar_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-lg font-bold text-brand-600">
                        {(mover?.full_name || 'M')[0]}
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                      <BadgeCheck className="h-3 w-3" />
                    </span>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-ink">{mover?.full_name || 'Your Mover'}</p>
                      <Badge tone="green">Verified</Badge>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" /> {mover?.phone || 'Contact via app'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  {mover?.phone ? (
                    <a href={`tel:${mover.phone}`} className="flex-1">
                      <Button><Phone className="h-4 w-4" /> Call</Button>
                    </a>
                  ) : (
                    <Button className="flex-1"><Phone className="h-4 w-4" /> Call</Button>
                  )}
                  {mover?.phone ? (
                    <a href={`sms:${mover.phone}`} className="flex-1">
                      <Button variant="ghost"><MessageSquare className="h-4 w-4" /> Message</Button>
                    </a>
                  ) : (
                    <Button variant="ghost" className="flex-1"><MessageSquare className="h-4 w-4" /> Message</Button>
                  )}
                </div>
              </Card>
            )}

            {booking.status === 'at_dropoff' && (
              <Card className="my-4 flex flex-col items-center gap-2 border-2 border-brand-200 p-5 text-center">
                <span className="flex items-center gap-1 text-xs font-bold text-brand-600">
                  <ShieldCheck className="h-4 w-4" /> Confirm Your Delivery
                </span>
                <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                  <QRCodeSVG value={deliveryPayload(booking.id)} size={168} fgColor="#1d36ce" />
                </div>
                <p className="max-w-[15rem] text-xs text-slate-500">
                  Show this QR to your mover. They scan it to confirm your items were delivered.
                </p>
              </Card>
            )}

            <Card className="my-4 flex items-center gap-3 p-4 ring-1 ring-slate-100">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Truck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vehicle</p>
                <p className="text-sm font-bold text-ink">{booking.vehicle}</p>
              </div>
              <p className="text-sm font-extrabold text-brand-700">{money(Number(booking.price))}</p>
            </Card>

            <Card className="mb-4 flex items-center gap-3 p-4 ring-1 ring-slate-100">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <RouteIcon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Route</p>
                <p className="text-sm font-bold text-ink">{booking.pickup_address} → {booking.dropoff_address}</p>
              </div>
            </Card>

            <h3 className="mb-3 text-sm font-bold text-ink">Progress Timeline</h3>
            <Timeline steps={steps} />

            {booking.status === 'delivered' && (
              <Link to="/customer/rating" state={{ bookingId: booking.id }}>
                <Button className="mt-4"><Star className="h-4 w-4" /> Rate this move</Button>
              </Link>
            )}
          </>
        )}
      </motion.div>
      <BottomNav role="customer" />
    </div>
  )
}

function Timeline({ steps }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                s.state === 'done'
                  ? 'border-brand-600 bg-brand-600'
                  : s.state === 'active'
                  ? 'border-brand-600 bg-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {s.state === 'done' && <CheckCircle2 className="h-3 w-3 text-white" />}
              {s.state === 'active' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
            </span>
            {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className={`pb-5 ${s.state === 'pending' ? 'opacity-50' : ''}`}>
            <p className={`text-sm font-bold ${s.state === 'active' ? 'text-brand-600' : 'text-ink'}`}>{s.label}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ===================== Rating & Review ===================== */
export function CustomerRating() {
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState([])
  const [tip, setTip] = useState(null)
  const nav = useNavigate()
  const { state } = useLocation()
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (state?.bookingId) getBooking(state.bookingId).then(setBooking).catch(() => {})
  }, [state?.bookingId])

  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        brandLeft
        avatar={
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand-600 ring-1 ring-slate-100">
            <ClipboardList className="h-5 w-5" />
          </button>
        }
      />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="text-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100"
          >
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </motion.span>
          <h1 className="mt-3 text-2xl font-extrabold text-ink">Move Completed!</h1>
          <p className="mt-1 text-sm text-slate-500">Thank you for moving with SmartShift.</p>
        </Item>

        <Item>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="relative">
                <img src="https://i.pravatar.cc/80?img=12" className="h-11 w-11 rounded-full object-cover" alt="" />
                <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                  <BadgeCheck className="h-2.5 w-2.5" />
                </span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Your SmartShift Mover</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Truck className="h-3 w-3" /> {booking?.vehicle || 'Move vehicle'}
                  {booking && <> · #{String(booking.id).slice(0, 8)}</>}
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-sm font-bold text-ink">Rate your experience</p>
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button key={n} whileTap={{ scale: 1.3 }} onClick={() => setStars(n)}>
                  <Star
                    className={`h-9 w-9 transition ${
                      n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            <p className="mt-5 text-sm font-bold text-ink">What went well?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ratingTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    tags.includes(t)
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <p className="mb-1.5 mt-5 text-sm font-bold text-ink">Write a review (optional)</p>
            <textarea
              rows={3}
              placeholder="How was the move? Ahmad was…"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-sm"
            />

            <p className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold text-ink">
              <Gift className="h-4 w-4 text-brand-600" /> Add a Tip
            </p>
            <div className="flex gap-2">
              {tipOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setTip(t)}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                    tip === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {money(t)}
                </button>
              ))}
              <button className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600">
                Other
              </button>
            </div>
          </Card>
        </Item>

        <Item>
          <Button onClick={() => nav('/customer')}>Submit Review</Button>
        </Item>
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Moves list ===================== */
export function CustomerMoves() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    listCustomerBookings(user.id)
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const isActive = (s) => !['delivered', 'cancelled'].includes(s)

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="My Moves" />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm font-semibold">No moves yet</p>
            <Link to="/customer/book" className="text-sm font-bold text-brand-600">Book your first move</Link>
          </div>
        ) : (
          bookings.map((m) => (
            <Item key={m.id}>
              <BookingCard m={m} isActive={isActive(m.status)} />
            </Item>
          ))
        )}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Alerts (customer) ===================== */
const notifIcons = { truck: Truck, cash: Banknote, verified: BadgeCheck, star: Star }
const notifTone = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
}

export function CustomerAlerts() {
  const { profile } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-ink">Notifications</h1>
          <button className="text-xs font-bold text-brand-600">Mark all as read</button>
        </Item>
        {customerNotifications.map((grp) => (
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
                      {n.stars && (
                        <div className="mt-2 flex gap-1">
                          {[...Array(5)].map((_, k) => (
                            <Star key={k} className="h-5 w-5 text-slate-300" />
                          ))}
                        </div>
                      )}
                      {n.cta && (
                        <Link to="/customer/track">
                          <Button className="mt-3">{n.cta} <Navigation className="h-4 w-4" /></Button>
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
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Profile (customer) ===================== */
export function CustomerProfile() {
  const nav = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (!user) return
    listCustomerBookings(user.id).then(setBookings).catch(() => {})
  }, [user?.id])

  const completed = bookings.filter((b) => b.status === 'delivered').length
  const statCards = [
    { icon: Truck, value: String(bookings.length), label: 'Total Moves' },
    { icon: Star, value: completed ? '5.0' : '—', label: 'User Rating' },
    { icon: Calendar, value: memberSince(user?.created_at), label: 'Member Since' },
  ]
  const rows = [
    { icon: UserPen, label: 'Edit Profile', sub: 'Update your personal details and bio', to: '/profile/edit' },
    { icon: CreditCard, label: 'Payment Methods', sub: 'Manage cards and digital wallets' },
    { icon: MapPin, label: 'Saved Addresses', sub: 'Default pickup and drop-off points' },
  ]
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="flex flex-col items-center pt-2">
          <span className="relative">
            <img src={profile?.avatar_url || 'https://i.pravatar.cc/120?img=47'} className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow" alt="" />
            <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          </span>
          <h2 className="mt-3 text-xl font-extrabold text-ink">{profile?.full_name || 'SmartShift User'}</h2>
          <Badge tone="brand" className="mt-1">
            <Star className="h-3 w-3" /> Premium Member
          </Badge>
        </Item>

        {statCards.map((s) => (
          <Item key={s.label}>
            <Card className="flex flex-col items-center gap-1 p-4 text-center">
              <s.icon className="h-5 w-5 text-brand-500" />
              <p className="text-xl font-extrabold text-ink">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </Card>
          </Item>
        ))}

        <Item>
          <h3 className="mb-1 text-base font-bold text-ink">Account Settings</h3>
        </Item>
        <Item>
          <Card className="divide-y divide-slate-100">
            {rows.map((r) => (
              <button
                key={r.label}
                onClick={() => r.to && nav(r.to)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">{r.label}</span>
                  <span className="block text-[11px] text-slate-400">{r.sub}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
            <button onClick={async () => { await signOut(); nav('/') }} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-rose-500">Logout</span>
                <span className="block text-[11px] text-rose-400">Securely sign out of your account</span>
              </span>
            </button>
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}
